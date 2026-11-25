
'use client';

import Link from 'next/link';
import type { Proyecto, Vendedor, PersonaInvolucrada } from '@/lib/types';
import type { User as AuthUser } from 'firebase/auth';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck } from 'lucide-react';
import { isPast, isToday, differenceInDays, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { filterProjectsByUser } from '@/lib/utils';

function formatDate(dateString: string | undefined) {
  if (!dateString) return 'N/A';
  return format(new Date(dateString + 'T00:00:00'), 'dd/MM/yyyy');
}

const getTaskUrgencyColor = (dueDateStr: string): string => {
    const dueDate = new Date(dueDateStr + 'T00:00:00');
    if (isPast(dueDate) && !isToday(dueDate)) {
        return 'border-red-500 bg-red-50 text-red-700'; // Vencida
    }
    if (differenceInDays(dueDate, new Date()) <= 3) {
        return 'border-yellow-500 bg-yellow-50 text-yellow-700'; // Próxima a vencer
    }
    return 'border-gray-300 bg-gray-50'; // Normal
}


interface UserTasksProps {
  projects: Proyecto[];
  user: AuthUser | null;
  vendedores: Vendedor[];
  personasInvolucradas: PersonaInvolucrada[];
}

export default function MyTasksCard({ projects, user, vendedores, personasInvolucradas }: UserTasksProps) {
  
  const allPeople = useMemo(() => [...vendedores, ...personasInvolucradas], [vendedores, personasInvolucradas]);
  
  const myTasks = useMemo(() => {
    if (!user || !user.email) return [];
    
    const loggedInPerson = allPeople.find(p => p.email === user.email);
    if (!loggedInPerson) return [];
    
    const userProjects = filterProjectsByUser(projects, user, allPeople);

    return userProjects
        .flatMap(p => (p.tareas || []).map(t => ({ ...t, proyecto: p })))
        .filter(t => t.estado === 'Pendiente' && t.responsableId === loggedInPerson.id)
        .sort((a,b) => new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime());

  }, [projects, user, allPeople]);
  
  if (!user) return null;

  return (
    <Card>
        <CardHeader>
            <CardTitle className='flex items-center gap-2'><ClipboardCheck className='text-primary'/> Mis Tareas Pendientes</CardTitle>
            <CardDescription>Tus tareas directas con vencimiento próximo.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Proyecto y Tarea</TableHead>
                        <TableHead className='text-right'>Vencimiento</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {myTasks.length > 0 ? myTasks.map(t => (
                         <TableRow key={`${t.proyecto.id}-${t.id}`} className={cn(getTaskUrgencyColor(t.fechaVencimiento), 'border-l-4')}>
                            <TableCell>
                                <Link href={`/projects/${t.proyecto.id}`} className="hover:underline">
                                  <div className="font-bold text-destructive">{t.proyecto.cliente}</div>
                                  <div className="font-semibold text-primary">{t.proyecto.tema}</div>
                                  <p className="text-sm text-muted-foreground mt-1">{t.descripcion}</p>
                                </Link>
                            </TableCell>
                            <TableCell className='text-right'>
                                <Badge variant='outline' className="bg-white">{formatDate(t.fechaVencimiento)}</Badge>
                            </TableCell>
                        </TableRow>
                    )) : (
                         <TableRow>
                            <TableCell colSpan={2} className="text-center text-muted-foreground h-24">No tienes tareas pendientes asignadas.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
  )
}
