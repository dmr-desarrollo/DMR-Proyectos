
'use client';

import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Proyecto, Subcategoria, Vendedor } from '@/lib/types';
import { cn, getProjectTaskUrgency } from '@/lib/utils';
import { AlertTriangle, Clock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { useMemo } from 'react';

interface ProjectListProps {
  projects: Proyecto[];
  subcategorias: Subcategoria[];
  vendedores: Vendedor[];
}

function formatDate(dateString: string | undefined) {
  if (!dateString) return 'N/A';
  // Use local timezone by adding a time part to ensure the date is parsed correctly
  // This avoids the UTC conversion issue where the date might shift by one day
  return format(new Date(dateString + 'T00:00:00'), 'dd/MM/yyyy');
}

function formatLastActivityDate(activities: Proyecto['actividades']) {
    if (!activities || activities.length === 0) return 'N/A';
    const lastActivity = activities.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    return format(new Date(lastActivity.timestamp), 'dd/MM/yyyy');
}


export default function ProjectList({ projects, subcategorias, vendedores }: ProjectListProps) {
  
  const getSubcategoriaNombre = (subcategoriaId: string | null) => {
    if (!subcategoriaId) return null;
    return subcategorias.find(s => s.id === subcategoriaId)?.nombre || null;
  }
  
  const vendedoresMap = useMemo(() => {
    return new Map(vendedores.map(v => [v.id, v.nombre]));
  }, [vendedores]);

  return (
    <TooltipProvider>
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <Table>
            <TableHeader>
            <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Tema</TableHead>
                <TableHead>Unidad de Negocio</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha Ingreso</TableHead>
                <TableHead>Fecha Cierre Est.</TableHead>
                <TableHead className="text-right">Pipeline (USD)</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {projects.map((project) => {
                const taskUrgency = getProjectTaskUrgency(project);
                const vendedorNombre = vendedoresMap.get(project.vendedorId) || 'Desconocido';
                const urgencyClass = 
                    taskUrgency === 'overdue' ? 'bg-red-100/50' :
                    taskUrgency === 'upcoming' ? 'bg-yellow-100/50' :
                    '';
                return (
                <TableRow key={project.id} className={cn(urgencyClass)}>
                    <TableCell className="font-bold text-destructive">
                        <div className="flex items-center gap-2">
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
                        </div>
                    </TableCell>
                    <TableCell>
                        <Link href={`/projects/${project.id}`} className="hover:underline font-semibold text-primary">
                        {project.tema}
                        </Link>
                        {project.subcategoria && <p className="text-xs text-muted-foreground">{getSubcategoriaNombre(project.subcategoria)}</p>}
                    </TableCell>
                    <TableCell>
                        <Badge variant="secondary">{project.unidadDeNegocio}</Badge>
                    </TableCell>
                    <TableCell>{vendedorNombre}</TableCell>
                    <TableCell>
                        <Badge 
                            variant={'outline'} 
                            className={cn("font-semibold bg-background", {
                                'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700': project.estado === 'Cerrado Ganado',
                                'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700': project.estado === 'Cerrado Perdido',
                                'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700': project.estado === 'Cancelado',
                            })}
                        >
                        {project.estado}
                        </Badge>
                    </TableCell>
                    <TableCell>{formatDate(project.fechaIngreso)}</TableCell>
                    <TableCell>{formatDate(project.fechaEstimadaCierre)}</TableCell>
                    <TableCell className="text-right font-medium">
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(project.pipelineUSD)}
                    </TableCell>
                </TableRow>
                )
            })}
            </TableBody>
        </Table>
        </div>
    </TooltipProvider>
  );
}
