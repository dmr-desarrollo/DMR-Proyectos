
'use client';

import { useState, useEffect, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, DollarSign, BarChart, PieChart, TrendingDown, TrendingUp, Target, Building, BookUser } from 'lucide-react';
import { Bar, BarChart as RechartsBarChart, Pie, PieChart as RechartsPieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, Cell } from 'recharts';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Proyecto, Vendedor, UnidadDeNegocio, Estado, Subcategoria } from '@/lib/types';
import ProjectExportReport from './ProjectExportReport';
import { getEstados, getSubcategorias } from '@/lib/data';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F'];


export default function ReportingDashboard({
  initialProjects,
  vendedores,
  unidadesDeNegocio,
}: {
  initialProjects: Proyecto[];
  vendedores: Vendedor[];
  unidadesDeNegocio: UnidadDeNegocio[];
}) {
  const [projects, setProjects] = useState<Proyecto[]>(initialProjects);
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [isMounted, setIsMounted] = useState(false);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);

  useEffect(() => {
    setIsMounted(true);
    setDate({
        from: addDays(new Date(), -365),
        to: new Date(),
    });
    getEstados().then(setEstados);
    getSubcategorias().then(setSubcategorias);
  }, []);

  useEffect(() => {
    if (!isMounted || !date?.from) return;

    const filtered = initialProjects.filter((project) => {
      const projectDate = new Date(project.fechaIngreso + 'T00:00:00Z');
      const fromDate = new Date(date.from!);
      fromDate.setHours(0,0,0,0);
      
      if(date.to) {
        const toDate = new Date(date.to);
        toDate.setHours(23,59,59,999);
        return projectDate >= fromDate && projectDate <= toDate;
      }
      return projectDate >= fromDate;
    });
    setProjects(filtered);
  }, [date, initialProjects, isMounted]);
  
  const totalPipeline = projects.reduce((sum, p) => sum + p.pipelineUSD, 0);
  const projectsWon = projects.filter(p => p.estado === 'Cerrado Ganado');
  const valueWon = projectsWon.reduce((sum, p) => sum + p.pipelineUSD, 0);
  const projectsLost = projects.filter(p => p.estado === 'Cerrado Perdido');
  const valueLost = projectsLost.reduce((sum, p) => sum + p.pipelineUSD, 0);
  const winRate = projects.length > 0 && (projectsWon.length + projectsLost.length) > 0 ? (projectsWon.length / (projectsWon.length + projectsLost.length) * 100) : 0;


  const pipelineByVendedor = useMemo(() => {
      return vendedores.map(vendedor => {
          const vendedorProjects = projects.filter(p => p.vendedor === vendedor.nombre);
          return {
              name: vendedor.nombre,
              Pipeline: vendedorProjects.reduce((acc, p) => acc + p.pipelineUSD, 0)
          }
      }).filter(v => v.Pipeline > 0);
  }, [projects, vendedores]);

  const projectsByUnidad = useMemo(() => {
      return unidadesDeNegocio.map(unidad => {
          return {
              name: unidad.nombre,
              Proyectos: projects.filter(p => p.unidadDeNegocio === unidad.nombre).length
          }
      }).filter(u => u.Proyectos > 0);
  }, [projects, unidadesDeNegocio]);
  
  const lossReasonData = useMemo(() => {
    const reasonsCount = projectsLost.reduce((acc, p) => {
        if(p.motivoPerdida) {
            acc[p.motivoPerdida] = (acc[p.motivoPerdida] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    return Object.entries(reasonsCount).map(([name, value]) => ({name, value}));

  }, [projectsLost]);
  
  if (!isMounted) {
    return null; // or a loading skeleton
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Reportería
        </h1>
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('es-ES', {
                style: 'currency',
                currency: 'USD',
                maximumFractionDigits: 0
              }).format(totalPipeline)}
            </div>
            <p className="text-xs text-muted-foreground">
              en {projects.filter(p => p.estado !== 'Cerrado Ganado' && p.estado !== 'Cerrado Perdido').length} proyectos abiertos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Ganado</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(valueWon)}
            </div>
             <p className="text-xs text-muted-foreground">
              en {projectsWon.length} proyectos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Perdido</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold text-red-600">
              {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(valueLost)}
            </div>
             <p className="text-xs text-muted-foreground">
              en {projectsLost.length} proyectos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Cierre</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{winRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
               Ganados vs. Totales Cerrados
            </p>
          </CardContent>
        </Card>
      </div>

      <ProjectExportReport 
        projects={projects}
        vendedores={vendedores}
        unidadesDeNegocio={unidadesDeNegocio}
        subcategorias={subcategorias}
        estados={estados}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
            <CardHeader>
                <CardTitle className='flex items-center gap-2'><BookUser /> Pipeline por Vendedor</CardTitle>
                <CardDescription>Valor total del pipeline abierto y en negociación por vendedor.</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <RechartsBarChart data={pipelineByVendedor}>
                        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${new Intl.NumberFormat('en-US').format(value as number)}`} />
                        <Tooltip formatter={(value) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value as number)} />
                        <Bar dataKey="Pipeline" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle className='flex items-center gap-2'><Building/> Proyectos por Unidad de Negocio</CardTitle>
                <CardDescription>Cantidad de proyectos activos por cada unidad de negocio.</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <RechartsBarChart data={projectsByUnidad} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip formatter={(value) => `${value} proyectos`} />
                        <Bar dataKey="Proyectos" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </RechartsBarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'><PieChart /> Análisis de Motivos de Pérdida</CardTitle>
          <CardDescription>Distribución de las razones por las cuales los proyectos son marcados como perdidos.</CardDescription>
        </CardHeader>
        <CardContent>
          {lossReasonData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                    <Pie data={lossReasonData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                        {lossReasonData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${value} proyectos`, name]} />
                    <Legend />
                </RechartsPieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-12">No hay datos de proyectos perdidos en el período seleccionado.</p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
