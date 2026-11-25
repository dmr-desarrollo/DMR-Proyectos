

'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from './ui/form';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Proyecto, Actividad, CambiosAvance } from '@/lib/types';
import { ArrowDown, ArrowUp, CalendarIcon, DollarSign, Percent, NotebookPen, Edit, Trash2, PlusCircle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';


const formSchema = z.object({
    descripcion: z.string().min(10, 'La descripción del avance es requerida.'),
    pipelineUSD: z.coerce.number().optional(),
    fechaEstimadaCierre: z.date().optional(),
    probabilidadCierre: z.coerce.number().min(0).max(1).optional(),
});
type FormData = z.infer<typeof formSchema>;

interface ProjectProgressProps {
    project: Proyecto;
    onProgressUpdate: (data: Partial<Proyecto>, activity: Omit<Actividad, 'id' | 'timestamp' | 'usuario'>) => Promise<boolean>;
    onProgressEdit: (data: Partial<Proyecto>, activity: Actividad) => Promise<boolean>;
    onProgressDelete: (activityId: string) => Promise<boolean>;
}

function formatUser(email: string | undefined | null) {
  if (!email) return '';
  return email.split('@')[0];
}

const ChangeIndicator = ({ change, type }: { change: { anterior: any, nuevo: any }, type: 'currency' | 'date' | 'percent' }) => {
    const isIncrease = change.nuevo > change.anterior;
    const Icon = isIncrease ? ArrowUp : ArrowDown;
    const color = isIncrease ? 'text-green-500' : 'text-red-500';

    const formatValue = (value: any) => {
        if (type === 'currency') return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
        if (type === 'date') return format(new Date(value + 'T00:00:00'), 'dd/MM/yyyy');
        if (type === 'percent') return `${Math.round(value * 100)}%`;
        return value;
    }

    return (
        <span className={cn('flex items-center gap-1 font-semibold', color)}>
            <Icon className="h-4 w-4" />
            {formatValue(change.anterior)} &rarr; {formatValue(change.nuevo)}
        </span>
    )
}

export default function ProjectProgress({ project, onProgressUpdate, onProgressEdit, onProgressDelete }: ProjectProgressProps) {
    const [editingActivity, setEditingActivity] = useState<Actividad | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    
    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
    });

    const manualProgressUpdates = useMemo(() => {
        if (!project.actividades) return [];
        return project.actividades
            .filter(a => a.esAvanceManual)
            .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    }, [project.actividades]);
    
    const lastManualProgress = manualProgressUpdates.length > 0 ? manualProgressUpdates[0] : null;
    
    const getDateFromString = (dateString: string) => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return new Date(dateString + 'T00:00:00');
        }
        return new Date(dateString);
    }

    const openForm = (activityToEdit: Actividad | null = null) => {
        setEditingActivity(activityToEdit);
        setIsFormOpen(true);
        if (activityToEdit) {
            const fechaCierre = activityToEdit.cambios?.fechaEstimadaCierre?.nuevo 
                               ? getDateFromString(activityToEdit.cambios.fechaEstimadaCierre.nuevo) 
                               : getDateFromString(project.fechaEstimadaCierre);

            form.reset({
                descripcion: activityToEdit.descripcion,
                pipelineUSD: activityToEdit.cambios?.pipelineUSD?.nuevo ?? project.pipelineUSD,
                fechaEstimadaCierre: fechaCierre,
                probabilidadCierre: activityToEdit.cambios?.probabilidadCierre?.nuevo ?? project.probabilidadCierre,
            });
        } else {
             form.reset({
                descripcion: '',
                pipelineUSD: project.pipelineUSD,
                fechaEstimadaCierre: getDateFromString(project.fechaEstimadaCierre),
                probabilidadCierre: project.probabilidadCierre,
            });
        }
    }
    
    const closeForm = () => {
        setIsFormOpen(false);
        setEditingActivity(null);
        form.reset();
    }

    const onSubmit = async (data: FormData) => {
        const changes: CambiosAvance = {};
        const updatedProjectData: Partial<Proyecto> = {};

        if (data.pipelineUSD !== undefined && data.pipelineUSD !== project.pipelineUSD) {
            changes.pipelineUSD = { anterior: project.pipelineUSD, nuevo: data.pipelineUSD };
            updatedProjectData.pipelineUSD = data.pipelineUSD;
        }
        if (data.fechaEstimadaCierre && format(data.fechaEstimadaCierre, 'yyyy-MM-dd') !== project.fechaEstimadaCierre) {
            changes.fechaEstimadaCierre = { anterior: project.fechaEstimadaCierre, nuevo: format(data.fechaEstimadaCierre, 'yyyy-MM-dd') };
            updatedProjectData.fechaEstimadaCierre = format(data.fechaEstimadaCierre, 'yyyy-MM-dd');
        }
        if (data.probabilidadCierre !== undefined && data.probabilidadCierre !== project.probabilidadCierre) {
            changes.probabilidadCierre = { anterior: project.probabilidadCierre, nuevo: data.probabilidadCierre };
            updatedProjectData.probabilidadCierre = data.probabilidadCierre;
        }
        
        let success = false;

        if(editingActivity) { // Editing existing activity
            const updatedActivity: Actividad = {
                ...editingActivity,
                descripcion: data.descripcion,
                cambios: Object.keys(changes).length > 0 ? changes : undefined,
            }
            success = await onProgressEdit(updatedProjectData, updatedActivity);

        } else { // Creating new activity
            const activity: Omit<Actividad, 'id' | 'timestamp' | 'usuario'> = {
                descripcion: data.descripcion,
                cambios: Object.keys(changes).length > 0 ? changes : undefined,
                esAvanceManual: true,
            };
            success = await onProgressUpdate(updatedProjectData, activity);
        }

        if (success) {
            closeForm();
        }
    }

    return (
        <>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="space-y-1.5">
                        {/* Estos títulos ahora son para lectores de pantalla porque el componente ya está dentro de una tarjeta con título */}
                        <h3 className="sr-only font-semibold leading-none tracking-tight flex items-center"><NotebookPen className="mr-2 h-5 w-5"/>Avances del Proyecto</h3>
                        <p className="sr-only text-sm text-muted-foreground">Registra avances clave y consulta el historial de hitos importantes del proyecto.</p>
                    </div>
                     {!isFormOpen && (
                        <Button onClick={() => openForm()}>
                            <PlusCircle className="mr-2 h-4 w-4"/> Registrar Avance
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {isFormOpen && (
                    <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 border rounded-lg space-y-4">
                        <h3 className="font-semibold text-lg">{editingActivity ? 'Editar Avance' : 'Nuevo Avance'}</h3>
                        <FormField
                            control={form.control}
                            name="descripcion"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descripción del Avance</FormLabel>
                                    <FormControl><Textarea {...field} placeholder="Describe el último avance, reunión o hito importante..." /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField
                                control={form.control}
                                name="pipelineUSD"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Pipeline (USD)</FormLabel>
                                    <FormControl><Input type="number" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="fechaEstimadaCierre"
                                render={({ field }) => (
                                <FormItem className="flex flex-col pt-2">
                                    <FormLabel className="mb-2">Fecha Estimada de Cierre</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild><FormControl>
                                            <Button variant="outline" className={cn("justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                                <CalendarIcon className="mr-2 h-4 w-4"/>
                                                {field.value ? format(field.value, 'dd/MM/yyyy') : <span>Selecciona fecha</span>}
                                            </Button>
                                        </FormControl></PopoverTrigger>
                                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="probabilidadCierre"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Probabilidad de Cierre ({Math.round((field.value || 0) * 100)}%)</FormLabel>
                                    <FormControl><Input type="range" min="0" max="1" step="0.05" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={closeForm}>Cancelar</Button>
                            <Button type="submit">Guardar Avance</Button>
                        </div>
                    </form>
                    </Form>
                )}

                <div className="space-y-6">
                    {manualProgressUpdates.length > 0 ? manualProgressUpdates.map(actividad => (
                        <div key={actividad.id} className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-4 h-4 mt-1.5 rounded-full bg-primary" />
                            <div className="flex-grow border-b pb-4">
                               <div className="flex justify-between items-start">
                                    <p className="text-sm flex-1 pr-4">{actividad.descripcion}</p>
                                    {lastManualProgress && actividad.id === lastManualProgress.id && (
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openForm(actividad)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>¿Confirmas la eliminación?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Esta acción no se puede deshacer. Se eliminará permanentemente el registro de este avance.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => onProgressDelete(actividad.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    )}
                               </div>
                                <p className="text-xs text-muted-foreground">
                                    {format(new Date(actividad.timestamp), 'dd/MM/yyyy p', { locale: es })}
                                    {actividad.usuario && ` - por ${formatUser(actividad.usuario)}`}
                                </p>
                                {actividad.cambios && (
                                <div className="mt-3 space-y-2 rounded-md bg-muted/50 p-3">
                                    {actividad.cambios.pipelineUSD && (
                                        <div className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4 text-muted-foreground" /> <strong>Pipeline:</strong> <ChangeIndicator change={actividad.cambios.pipelineUSD} type="currency"/></div>
                                    )}
                                    {actividad.cambios.fechaEstimadaCierre && (
                                        <div className="text-sm flex items-center gap-2"><CalendarIcon className="h-4 w-4 text-muted-foreground" /> <strong>Fecha Cierre:</strong> <ChangeIndicator change={actividad.cambios.fechaEstimadaCierre} type="date"/></div>
                                    )}
                                    {actividad.cambios.probabilidadCierre && (
                                        <div className="text-sm flex items-center gap-2"><Percent className="h-4 w-4 text-muted-foreground" /> <strong>Probabilidad:</strong> <ChangeIndicator change={actividad.cambios.probabilidadCierre} type="percent"/></div>
                                    )}
                                </div>
                                )}
                            </div>
                        </div>
                    )) : (
                        <p className="text-center text-sm text-muted-foreground py-4">No se han registrado avances manuales aún.</p>
                    )}
                </div>
            </CardContent>
        </>
    )
}

    