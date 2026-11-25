
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Proyecto, Estado, Vendedor, UnidadDeNegocio, Subcategoria, PersonaInvolucrada } from '@/lib/types';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import DashboardMetrics from './DashboardMetrics';
import DashboardAlerts from './DashboardAlerts';
import ProjectsLoading from '@/app/projects/loading';
import DashboardFilters from './DashboardFilters';
import type { User as AuthUser } from 'firebase/auth';
import { getPersonasInvolucradas } from '@/lib/data';
import DraggableCardContainer from './DraggableCardContainer';
import MyTasksCard from './MyTasksCard';
import TeamTasksCard from './TeamTasksCard';


interface DashboardProps {
  projects: Proyecto[];
  estados: Estado[];
  vendedores: Vendedor[];
  unidadesDeNegocio: UnidadDeNegocio[];
  subcategorias: Subcategoria[];
  user: AuthUser | null;
}

export default function Dashboard({ 
  projects: initialProjects, 
  estados, 
  vendedores,
  unidadesDeNegocio,
  subcategorias,
  user
}: DashboardProps) {
    
  const [date, setDate] = useState<DateRange | undefined>();
  const [personasInvolucradas, setPersonasInvolucradas] = useState<PersonaInvolucrada[]>([]);
  const [filters, setFilters] = useState({
    unidadDeNegocio: 'all',
    subcategoria: 'all',
    vendedor: 'all',
    estado: 'all'
  });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const from = new Date();
    from.setDate(from.getDate() - 365);
    const to = new Date();
    setDate({ from, to });
    
    getPersonasInvolucradas().then(setPersonasInvolucradas);

  }, []);

  const filteredProjects = useMemo(() => {
    if (!isMounted) return [];

    let tempProjects = [...initialProjects];

    // Filter by date
    if (date?.from) {
      tempProjects = tempProjects.filter((project) => {
        const projectDate = new Date(project.fechaIngreso + 'T00:00:00');
        const fromDate = new Date(date.from!);
        fromDate.setHours(0, 0, 0, 0);

        if (date.to) {
          const toDate = new Date(date.to);
          toDate.setHours(23, 59, 59, 999);
          return projectDate >= fromDate && projectDate <= toDate;
        }
        return projectDate >= fromDate;
      });
    }
    
    // Filter by unidad de negocio
    if (filters.unidadDeNegocio !== 'all') {
      const unidad = unidadesDeNegocio.find(u => u.id === filters.unidadDeNegocio);
      if (unidad) {
        tempProjects = tempProjects.filter(p => p.unidadDeNegocio === unidad.nombre);
      }
    }
    
    // Filter by subcategoria
    if (filters.subcategoria !== 'all') {
      tempProjects = tempProjects.filter(p => p.subcategoria === filters.subcategoria);
    }
    
    // Filter by vendedor
    if (filters.vendedor !== 'all') {
      const vendedor = vendedores.find(v => v.id === filters.vendedor);
      if (vendedor) {
        tempProjects = tempProjects.filter(p => p.vendedor === vendedor.nombre);
      }
    }

    // Filter by estado
    if (filters.estado !== 'all') {
      tempProjects = tempProjects.filter(p => p.estado === filters.estado);
    }

    return tempProjects;
  }, [date, filters, initialProjects, isMounted, vendedores, unidadesDeNegocio]);

  const cardComponents = [
      { id: 'my-tasks', component: <MyTasksCard projects={filteredProjects} user={user} vendedores={vendedores} personasInvolucradas={personasInvolucradas}/> },
      { id: 'team-tasks', component: <TeamTasksCard projects={filteredProjects} user={user} vendedores={vendedores} personasInvolucradas={personasInvolucradas}/> },
      { id: 'metrics', component: <DashboardMetrics projects={filteredProjects} estados={estados} /> },
      { id: 'alerts', component: <DashboardAlerts projects={filteredProjects} /> },
  ];
  
  if (!isMounted) {
    return <ProjectsLoading />;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="font-headline text-3xl font-bold tracking-tight">DMR Proyectos</h1>
            <div className="grid gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={'outline'}
                    className={cn(
                      'w-full sm:w-[300px] justify-start text-left font-normal',
                      !date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date?.from ? (
                      date.to ? (
                        <>
                          {format(date.from, 'dd/MM/yyyy')} -{' '}
                          {format(date.to, 'dd/MM/yyyy')}
                        </>
                      ) : (
                        format(date.from, 'dd/MM/yyyy')
                      )
                    ) : (
                      <span>Selecciona un rango de fechas</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={2}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>
        </div>
        <DashboardFilters 
          filters={filters}
          setFilters={setFilters}
          estados={estados}
          vendedores={vendedores}
          unidadesDeNegocio={unidadesDeNegocio}
          subcategorias={subcategorias}
        />
      </div>
      
      <DraggableCardContainer
        storageKey="dashboard-card-order-v2"
        items={cardComponents}
      />
    </div>
  );
}
