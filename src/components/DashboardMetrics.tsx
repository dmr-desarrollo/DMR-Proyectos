
'use client';
import Link from 'next/link';
import type { Proyecto, Estado } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Microscope, Wrench, FileText, Users, FileSignature, FlaskConical, CircleCheck, Truck, CheckCircle, XCircle, DollarSign, Waypoints, Ban, BarChart, Trophy } from 'lucide-react';
import { useMemo } from 'react';

const estadoIcono: { [key in Estado]?: React.ReactNode } = {
    'Diagnóstico': <Microscope className="h-8 w-8 text-muted-foreground" />,
    'Diseño': <Wrench className="h-8 w-8 text-muted-foreground" />,
    'Cotización': <FileText className="h-8 w-8 text-muted-foreground" />,
    'Negociación': <Users className="h-8 w-8 text-muted-foreground" />,
    'Preacuerdo': <FileSignature className="h-8 w-8 text-muted-foreground" />,
    'Piloto': <FlaskConical className="h-8 w-8 text-muted-foreground" />,
    'Validación': <CircleCheck className="h-8 w-8 text-muted-foreground" />,
    'Ganado': <Trophy className="h-8 w-8 text-yellow-500" />,
    'Implementación': <Truck className="h-8 w-8 text-muted-foreground" />,
    'Cerrado Ganado': <CheckCircle className="h-8 w-8 text-green-500" />,
    'Cerrado Perdido': <XCircle className="h-8 w-8 text-red-500" />,
    'Cancelado': <Ban className="h-8 w-8 text-yellow-500" />,
};


interface DashboardMetricsProps {
    projects: Proyecto[];
    estados: Estado[];
}

export default function DashboardMetrics({ projects, estados }: DashboardMetricsProps) {
    const getProjectsByEstado = (estado: Estado) => projects.filter(p => p.estado === estado);
    const totalPipeline = projects.filter(p => p.estado !== 'Cerrado Ganado' && p.estado !== 'Cerrado Perdido' && p.estado !== 'Cancelado').reduce((sum, p) => sum + p.pipelineUSD, 0);

    const estadosVisibles = useMemo(() => {
        return estados.filter(estado => estado !== 'Cancelado');
    }, [estados]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className='flex items-center gap-2'><BarChart /> Métricas de Proyectos</CardTitle>
                <CardDescription>Un resumen del pipeline total y la cantidad de proyectos en cada estado.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 items-start">
                    <Card className="col-span-2 h-full bg-muted/30">
                        <CardHeader className='pb-2 flex-row items-start justify-between'>
                            <div>
                                <CardTitle className='text-base font-semibold'>Pipeline Total</CardTitle>
                                <p className="text-xs text-muted-foreground mt-1">
                                    en {projects.filter(p => p.estado !== 'Cerrado Ganado' && p.estado !== 'Cerrado Perdido' && p.estado !== 'Cancelado').length} proyectos abiertos
                                </p>
                            </div>
                            <Waypoints className="h-8 w-8 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-4xl font-bold">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalPipeline)}</p>
                        </CardContent>
                    </Card>
                    {estadosVisibles.map(estado => {
                        const projectsInState = getProjectsByEstado(estado);
                        const count = projectsInState.length;
                        const totalPipeline = projectsInState.reduce((sum, p) => sum + p.pipelineUSD, 0);
                        return (
                            <Link href="/projects" key={estado} className="h-full">
                                <Card className="transition-all duration-200 hover:border-primary h-full bg-muted/30">
                                    <CardHeader className='pb-2'>
                                        <div className="flex justify-between items-start">
                                            <CardTitle className='text-base font-semibold flex'>{estado}</CardTitle>
                                            {estadoIcono[estado]}
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-4xl font-bold">{count}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalPipeline)}
                                        </p>
                                    </CardContent>
                                </Card>
                            </Link>
                        )
                    })}
              </div>
            </CardContent>
        </Card>
    )
}
