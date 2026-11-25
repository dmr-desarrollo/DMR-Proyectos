
'use client';
import Link from 'next/link';
import type { Proyecto } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';


function formatDate(dateString: string | undefined) {
  if (!dateString) return 'N/A';
  // Use local timezone by adding a time part to ensure the date is parsed correctly
  // This avoids the UTC conversion issue where the date might shift by one day
  return format(new Date(dateString + 'T00:00:00'), 'dd/MM/yyyy');
}

interface DashboardAlertsProps {
    projects: Proyecto[];
}

export default function DashboardAlerts({ projects }: DashboardAlertsProps) {
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueProjects = projects.filter(p => {
        if (p.estado === 'Cerrado Ganado' || p.estado === 'Cerrado Perdido' || p.estado === 'Cancelado' || !p.fechaEstimadaCierre) return false;
        const estimatedCloseDate = new Date(p.fechaEstimadaCierre + 'T00:00:00');
        return estimatedCloseDate < today;
    }).sort((a,b) => new Date(a.fechaEstimadaCierre).getTime() - new Date(b.fechaEstimadaCierre).getTime());


    return (
        <div>
            <Card>
            <CardHeader>
                <CardTitle className='flex items-center gap-2'><AlertTriangle className='text-orange-400'/> Alertas de Proyectos Vencidos</CardTitle>
                <CardDescription>Proyectos que han superado su fecha de cierre estimada y siguen abiertos.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Proyecto</TableHead>
                            <TableHead className='text-right'>Fecha de Cierre</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {overdueProjects.length > 0 ? overdueProjects.map(p => (
                            <TableRow key={p.id}>
                                <TableCell>
                                    <Link href={`/projects/${p.id}`} className="hover:underline">
                                      <div className="font-bold text-destructive">{p.cliente}</div>
                                      <div className="font-semibold text-primary">{p.tema}</div>
                                    </Link>
                                </TableCell>
                                <TableCell className='text-right'>
                                    <Badge variant='destructive'>{formatDate(p.fechaEstimadaCierre)}</Badge>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={2} className="text-center text-muted-foreground h-24">No hay proyectos vencidos.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
            </Card>
      </div>
    )
}
