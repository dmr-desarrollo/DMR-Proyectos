
'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Proyecto, Estado, Subcategoria } from '@/lib/types';
import { cn, getProjectTaskUrgency, calculateProjectAge } from '@/lib/utils';
import { CalendarDays, Percent, Tag, AlertTriangle, Clock, CalendarPlus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';


function formatDate(dateString: string | undefined) {
  if (!dateString) return 'N/A';
  // Use local timezone by adding a time part to ensure the date is parsed correctly
  // This avoids the UTC conversion issue where the date might shift by one day
  return format(new Date(dateString + 'T00:00:00'), 'dd/MM/yyyy');
}

const ProjectCard = ({ project, subcategoriaNombre }: { project: Proyecto, subcategoriaNombre: string | null }) => {
    const taskUrgency = getProjectTaskUrgency(project);
    const projectAge = calculateProjectAge(project.fechaIngreso);
    const urgencyClass = 
        taskUrgency === 'overdue' ? 'bg-red-100/50 border-red-400 hover:border-red-600' :
        taskUrgency === 'upcoming' ? 'bg-yellow-100/50 border-yellow-400 hover:border-yellow-600' :
        'hover:border-primary';

    return (
    <TooltipProvider>
        <Link href={`/projects/${project.id}`} className="block">
            <Card className={cn("mb-4 hover:shadow-lg transition-all duration-200", urgencyClass)}>
            <CardHeader>
                <CardTitle className="text-xl font-bold text-destructive flex items-center gap-2">
                    {taskUrgency === 'overdue' && (
                        <Tooltip>
                            <TooltipTrigger>
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Este proyecto tiene tareas vencidas.</p>
                            </TooltipContent>
                        </Tooltip>
                    )}
                     {taskUrgency === 'upcoming' && (
                        <Tooltip>
                            <TooltipTrigger>
                                <Clock className="h-5 w-5 text-yellow-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Este proyecto tiene tareas próximas a vencer.</p>
                            </TooltipContent>
                        </Tooltip>
                    )}
                    {project.cliente}
                </CardTitle>
                <CardDescription className="font-headline text-base font-semibold text-foreground">{project.tema}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className='flex flex-wrap gap-2'>
                <Badge 
                    variant="outline"
                    className={cn('bg-background',{
                    'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700': project.estado === 'Cerrado Ganado',
                    'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700': project.estado === 'Cerrado Perdido',
                    'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700': project.estado === 'Cancelado',
                    })}
                >
                    {project.estado}
                </Badge>
                <Badge variant="secondary">{project.unidadDeNegocio}</Badge>
                {subcategoriaNombre && <Badge variant="outline">{subcategoriaNombre}</Badge>}
                </div>
                 <div className="flex items-center text-sm text-muted-foreground">
                    <CalendarPlus className="mr-2 h-4 w-4" />
                    <span>Ingreso: {formatDate(project.fechaIngreso)} ({projectAge} días)</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    <span>Cierre: {formatDate(project.fechaEstimadaCierre)}</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                    <Percent className="mr-2 h-4 w-4" />
                    <span>{(project.probabilidadCierre * 100).toFixed(0)}% de cierre</span>
                </div>
                <div className="text-sm font-semibold text-right text-primary">
                    {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(project.pipelineUSD)}
                </div>
            </CardContent>
            </Card>
        </Link>
    </TooltipProvider>
    );
};

export default function ProjectKanban({ projects, estados, subcategorias }: {projects: Proyecto[], estados: Estado[], subcategorias: Subcategoria[]}) {
  
  const getSubcategoriaNombre = (subcategoriaId: string | null) => {
    if (!subcategoriaId) return null;
    return subcategorias.find(s => s.id === subcategoriaId)?.nombre || null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
      {estados.map((estado: Estado) => (
        <div key={estado} className="flex flex-col">
          <h2 className="text-lg font-semibold font-headline mb-4 px-1">{estado} ({projects.filter(p => p.estado === estado).length})</h2>
          <div className="bg-muted/50 rounded-lg p-2 min-h-[300px] flex-grow">
            {projects
              .filter((project) => project.estado === estado)
              .map((project) => (
                <ProjectCard 
                  key={project.id} 
                  project={project} 
                  subcategoriaNombre={getSubcategoriaNombre(project.subcategoria)}
                />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
