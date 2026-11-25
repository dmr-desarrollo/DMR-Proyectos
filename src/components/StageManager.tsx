
'use client';

import { useState } from 'react';
import type { Etapa, Estado, Proyecto } from '@/lib/types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { PlusCircle, Edit, Trash2, Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Calendar as DayPickerCalendar } from './ui/calendar';
import { updateProject, getEstados } from '@/lib/data';
import { toast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const predefinedStages: Estado[] = [
    "Diagnóstico",
    "Diseño",
    "Cotización",
    "Negociación",
    "Preacuerdo",
    "Piloto",
    "Validación",
    "Ganado",
    "Implementación"
];

const stageColors: Record<string, string> = {
    "Diagnóstico": "#3b82f6", // blue-500
    "Diseño": "#8b5cf6", // violet-500
    "Cotización": "#10b981", // emerald-500
    "Negociación": "#f97316", // orange-500
    "Preacuerdo": "#ec4899", // pink-500
    "Piloto": "#06b6d4", // cyan-500
    "Validación": "#14b8a6", // teal-500
    "Ganado": "#22c55e", // green-500
    "Implementación": "#6366f1", // indigo-500
};


const StageForm = ({ 
    initialData, 
    onSave, 
    onCancel,
    projectStartDate,
    existingStageNames
}: { 
    initialData?: Partial<Etapa>, 
    onSave: (etapa: Omit<Etapa, 'id' | 'estado'>) => void, 
    onCancel: () => void,
    projectStartDate: string;
    existingStageNames: string[];
}) => {
    const [nombre, setNombre] = useState(initialData?.nombre || '');
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: initialData?.fechaInicio ? parseISO(initialData.fechaInicio) : undefined,
        to: initialData?.fechaFin ? parseISO(initialData.fechaFin) : undefined,
    });
    
    const handleSave = () => {
        if (!nombre || !dateRange?.from || !dateRange?.to) {
            toast({ title: 'Error', description: 'Nombre y fechas son requeridos.', variant: 'destructive' });
            return;
        }
        onSave({
            nombre,
            fechaInicio: format(dateRange.from, 'yyyy-MM-dd'),
            fechaFin: format(dateRange.to, 'yyyy-MM-dd'),
            color: stageColors[nombre] || '#cccccc', // Asigna color automáticamente
        });
    }
    
    const availableStages = predefinedStages.filter(
        stage => !existingStageNames.includes(stage) || stage === initialData?.nombre
    );

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="stage-name">Nombre de la Etapa</Label>
                <Select 
                    onValueChange={setNombre} 
                    defaultValue={nombre}
                    disabled={!!initialData?.nombre}
                >
                    <SelectTrigger id="stage-name">
                        <SelectValue placeholder="Selecciona una etapa" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableStages.map(stage => (
                            <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label>Fechas de la Etapa</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                                "w-full justify-start text-left font-normal",
                                !dateRange && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (
                                dateRange.to ? (
                                    `${format(dateRange.from, "dd/MM/yy")} - ${format(dateRange.to, "dd/MM/yy")}`
                                ) : format(dateRange.from, "dd/MM/yy")
                            ) : <span>Selecciona un rango</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <DayPickerCalendar
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={2}
                            disabled={{ before: parseISO(projectStartDate) }}
                        />
                    </PopoverContent>
                </Popover>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
                <Button onClick={handleSave}>Guardar Etapa</Button>
            </DialogFooter>
        </div>
    );
};

export default function StageManager({ project, onProjectUpdate }: { project: Proyecto, onProjectUpdate: (project: Proyecto) => void }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStage, setEditingStage] = useState<Etapa | null>(null);

    const handleSaveStage = async (stageData: Omit<Etapa, 'id'|'estado'>) => {
        let updatedEtapas: Etapa[];
        if (editingStage) {
            // Edit
            updatedEtapas = (project.etapas || []).map(e => e.id === editingStage.id ? { ...editingStage, ...stageData } : e);
        } else {
            // Create
            const newStage: Etapa = {
                ...stageData,
                id: `etapa-${Date.now()}`,
                estado: 'Pendiente'
            };
            updatedEtapas = [...(project.etapas || []), newStage];
        }

        try {
            const updatedProject = await updateProject(project.id, { etapas: updatedEtapas });
            if (updatedProject) {
                onProjectUpdate(updatedProject);
                toast({ title: 'Éxito', description: `Etapa ${editingStage ? 'actualizada' : 'creada'} correctamente.` });
            }
            setIsModalOpen(false);
            setEditingStage(null);
        } catch (error) {
            toast({ title: 'Error', description: 'No se pudo guardar la etapa.', variant: 'destructive' });
        }
    };

    const handleDeleteStage = async (stageId: string) => {
        const updatedEtapas = (project.etapas || []).filter(e => e.id !== stageId);
        // Also un-assign tasks from this stage
        const updatedTareas = (project.tareas || []).map(t => t.etapaId === stageId ? { ...t, etapaId: undefined } : t);

        try {
            const updatedProject = await updateProject(project.id, { etapas: updatedEtapas, tareas: updatedTareas });
            if (updatedProject) {
                onProjectUpdate(updatedProject);
                toast({ title: 'Éxito', description: 'Etapa eliminada correctamente.' });
            }
        } catch (error) {
            toast({ title: 'Error', description: 'No se pudo eliminar la etapa.', variant: 'destructive' });
        }
    };

    const sortedEtapas = (project.etapas || []).slice().sort((a,b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime());

    return (
        <Card>
            <CardHeader>
                <CardTitle>Plan de Etapas del Proyecto</CardTitle>
                <CardDescription>Define y organiza las fases clave para la ejecución exitosa del proyecto.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button onClick={() => { setEditingStage(null); setIsModalOpen(true); }}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Añadir Etapa
                </Button>

                <div className="space-y-4">
                    {sortedEtapas.length > 0 ? sortedEtapas.map(etapa => (
                        <div key={etapa.id} className="border p-4 rounded-lg flex items-start justify-between">
                            <div className="flex items-start gap-4">
                                <span className="h-6 w-1.5 rounded-full" style={{ backgroundColor: etapa.color }} />
                                <div>
                                    <p className="font-bold">{etapa.nombre}</p>
                                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        {format(parseISO(etapa.fechaInicio), 'dd/MM/yy')} - {format(parseISO(etapa.fechaFin), 'dd/MM/yy')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" onClick={() => { setEditingStage(etapa); setIsModalOpen(true); }}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteStage(etapa.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )) : (
                        <p className="text-center text-muted-foreground py-4">No se han definido etapas para este proyecto.</p>
                    )}
                </div>

                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingStage ? 'Editar' : 'Crear'} Etapa</DialogTitle>
                        </DialogHeader>
                        <StageForm
                            initialData={editingStage || undefined}
                            onSave={handleSaveStage}
                            onCancel={() => setIsModalOpen(false)}
                            projectStartDate={project.fechaIngreso}
                            existingStageNames={(project.etapas || []).map(e => e.nombre)}
                        />
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}
