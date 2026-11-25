

'use client';

import { useState, useMemo } from 'react';
import { format, differenceInDays, isPast, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from './ui/dialog';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Proyecto, Tarea, TareaEstado, Vendedor, Actividad, PersonaInvolucrada, Etapa } from '@/lib/types';
import type { User as AuthUser } from 'firebase/auth';
import { CheckCircle, XCircle, PlusCircle, CalendarIcon, User, Clock, MessageSquare, ListTodo, History, FilePenLine, Bell } from 'lucide-react';
import { Calendar } from './ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { claimTaskNotification } from '@/app/actions/task-actions';


function formatUser(email: string | undefined | null) {
  if (!email) return 'sistema';
  return email.split('@')[0];
}

const TaskItem = ({ task, allPeople, onStateChange, onEdit, canEdit, onClaim }: { task: Tarea, allPeople: (Vendedor | PersonaInvolucrada)[], onStateChange: (id: string, state: TareaEstado) => void, onEdit: (task: Tarea) => void, canEdit: boolean, onClaim: (taskId: string) => void }) => {
  const dueDate = new Date(task.fechaVencimiento + 'T00:00:00');
  const isOverdue = isPast(dueDate) && !isToday(dueDate);
  const diffDays = differenceInDays(dueDate, new Date());
  
  const responsableNombre = allPeople.find(p => p.id === task.responsableId)?.nombre || 'Desconocido';

  const getStatusBadgeColor = () => {
    if (task.estado === 'Pendiente') {
      if (isOverdue) return 'bg-red-100 text-red-800 border-red-300';
      if (diffDays <= 3) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      return 'bg-blue-100 text-blue-800 border-blue-300';
    }
    if (task.estado === 'Cumplida') return 'bg-green-100 text-green-800 border-green-300';
    if (task.estado === 'Cancelada') return 'bg-gray-200 text-gray-800 border-gray-300';
  };

  return (
    <div className={cn("p-4 rounded-lg border", getStatusBadgeColor())}>
      <div className="flex justify-between items-start">
        <p className="font-semibold flex-1 pr-4">{task.descripcion}</p>
        <div className="flex items-center gap-2">
            <span className="text-sm font-bold">{task.estado}</span>
        </div>
      </div>
      <div className="mt-2 text-sm space-y-1 text-gray-700">
        <div className="flex items-center gap-2"><User className="h-4 w-4"/><span>{responsableNombre}</span></div>
        <div className="flex items-center gap-2"><CalendarIcon className="h-4 w-4"/><span>Vence: {format(dueDate, 'dd/MM/yyyy')}</span></div>
      </div>
      {task.estado !== 'Pendiente' && task.comentarioCierre && (
        <div className="mt-3 pt-3 border-t border-gray-400/50 text-sm">
            <p className="flex items-center gap-2"><MessageSquare className="h-4 w-4"/> <strong>Comentario:</strong> {task.comentarioCierre}</p>
            <p className="flex items-center gap-2 text-xs mt-1"><Clock className="h-3 w-3" />Cerrada por {formatUser(task.usuarioCierre)} el {format(new Date(task.fechaCierre!), 'dd/MM/yyyy p')}</p>
        </div>
      )}
      {task.estado === 'Pendiente' && (
        <div className="mt-3 flex gap-2 justify-end">
            {canEdit && (
              <>
                <Button size="sm" variant="outline" className="bg-white" onClick={() => onClaim(task.id)}>
                  <Bell className="mr-2 h-4 w-4"/>
                  Reclamar
                </Button>
                <Button size="sm" variant="outline" className="bg-white" onClick={() => onEdit(task)}>
                  <FilePenLine className="mr-2 h-4 w-4"/>
                  Editar
                </Button>
                <Button size="sm" variant="outline" className="bg-white" onClick={() => onStateChange(task.id, 'Cumplida')}><CheckCircle className="mr-2 h-4 w-4 text-green-600"/>Cumplida</Button>
                <Button size="sm" variant="outline" className="bg-white" onClick={() => onStateChange(task.id, 'Cancelada')}><XCircle className="mr-2 h-4 w-4 text-red-600"/>Cancelar</Button>
              </>
            )}
        </div>
      )}
    </div>
  )
}

const NewTaskForm = ({ assignees, etapas, onCreate, onCancel }: { assignees: (Vendedor | PersonaInvolucrada)[], etapas: Etapa[], onCreate: (taskData: Omit<Tarea, 'id'|'estado'|'responsableNombre'>) => void, onCancel: () => void }) => {
    const [description, setDescription] = useState('');
    const [assigneeId, setAssigneeId] = useState('');
    const [dueDate, setDueDate] = useState<Date | undefined>();
    const [etapaId, setEtapaId] = useState<string | undefined>();

    const handleSubmit = () => {
        if (!description || !assigneeId || !dueDate) {
            toast({ title: 'Error', description: 'Completa todos los campos para crear la tarea.', variant: 'destructive' });
            return;
        }
        onCreate({
            descripcion: description,
            responsableId: assigneeId,
            fechaVencimiento: format(dueDate, 'yyyy-MM-dd'),
            etapaId: etapaId || undefined
        });
        setDescription('');
        setAssigneeId('');
        setDueDate(undefined);
    }

    return (
        <div className="p-4 border rounded-lg space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><PlusCircle className="h-5 w-5"/>Crear Nueva Tarea</h3>
            <Textarea placeholder="Descripción de la tarea..." value={description} onChange={e => setDescription(e.target.value)} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Select value={assigneeId} onValueChange={setAssigneeId}>
                    <SelectTrigger><SelectValue placeholder="Asignar a..."/></SelectTrigger>
                    <SelectContent>
                       {assignees.map(person => (
                          <SelectItem key={person.id} value={person.id}>{person.nombre}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                 <Select value={etapaId} onValueChange={setEtapaId}>
                    <SelectTrigger><SelectValue placeholder="Asignar a etapa (opcional)"/></SelectTrigger>
                    <SelectContent>
                       <SelectItem value="none">Sin etapa específica</SelectItem>
                       {etapas.map(etapa => (
                          <SelectItem key={etapa.id} value={etapa.id}>{etapa.nombre}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("justify-start text-left font-normal", !dueDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4"/>
                            {dueDate ? format(dueDate, 'dd/MM/yyyy') : <span>Fecha de Vencimiento</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus disabled={(date) => date < new Date()} /></PopoverContent>
                </Popover>
            </div>
            <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
                <Button onClick={handleSubmit}>Añadir Tarea</Button>
            </div>
        </div>
    )
}

const EditTaskForm = ({ 
    task, 
    assignees,
    etapas,
    onSave, 
    onCancel 
}: { 
    task: Tarea, 
    assignees: (Vendedor | PersonaInvolucrada)[], 
    etapas: Etapa[],
    onSave: (updatedTask: Tarea, updatedFields: string[]) => void, 
    onCancel: () => void 
}) => {
    const [description, setDescription] = useState(task.descripcion);
    const [assigneeId, setAssigneeId] = useState(task.responsableId);
    const [dueDate, setDueDate] = useState<Date | undefined>(new Date(task.fechaVencimiento + 'T00:00:00'));
    const [etapaId, setEtapaId] = useState<string | undefined>(task.etapaId);

    const handleSubmit = () => {
        if (!description || !assigneeId || !dueDate) {
            toast({ title: 'Error', description: 'Todos los campos son requeridos.', variant: 'destructive' });
            return;
        }

        const updatedFields: string[] = [];
        if (description !== task.descripcion) updatedFields.push('descripción');
        if (assigneeId !== task.responsableId) updatedFields.push('responsable');
        if (format(dueDate, 'yyyy-MM-dd') !== task.fechaVencimiento) updatedFields.push('fecha de vencimiento');
        if (etapaId !== task.etapaId) updatedFields.push('etapa');

        const updatedTask: Tarea = {
            ...task,
            descripcion: description,
            responsableId: assigneeId,
            fechaVencimiento: format(dueDate, 'yyyy-MM-dd'),
            etapaId: etapaId || undefined
        };

        onSave(updatedTask, updatedFields);
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="edit-desc">Descripción</Label>
                <Textarea id="edit-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Responsable</Label>
                    <Select value={assigneeId} onValueChange={setAssigneeId}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            {assignees.map(person => (
                                <SelectItem key={person.id} value={person.id}>{person.nombre}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label>Fecha de Vencimiento</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4"/>
                                {dueDate ? format(dueDate, 'dd/MM/yyyy') : <span>Selecciona fecha</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus /></PopoverContent>
                    </Popover>
                 </div>
            </div>
            <div className="space-y-2">
                <Label>Etapa del Proyecto</Label>
                <Select value={etapaId} onValueChange={(val) => setEtapaId(val === 'none' ? undefined : val)}>
                    <SelectTrigger><SelectValue placeholder="Asignar a etapa (opcional)"/></SelectTrigger>
                    <SelectContent>
                       <SelectItem value="none">Sin etapa específica</SelectItem>
                       {etapas.map(etapa => (
                          <SelectItem key={etapa.id} value={etapa.id}>{etapa.nombre}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
             <DialogFooter>
                <Button variant="outline" onClick={onCancel}>Cancelar</Button>
                <Button onClick={handleSubmit}>Guardar Cambios</Button>
            </DialogFooter>
        </div>
    );
};


const ActivityLog = ({ activities }: { activities: Actividad[] }) => {
  return (
    <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
      {activities.map(actividad => (
          <div key={actividad.id} className="flex items-start gap-4">
              <div className="flex-shrink-0 w-3 h-3 mt-1.5 rounded-full bg-muted-foreground" />
              <div className="flex-grow border-b pb-4">
                  <p className="text-sm">{actividad.descripcion}</p>
                  <p className="text-xs text-muted-foreground">
                      {new Date(actividad.timestamp).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      {actividad.usuario && ` - por ${formatUser(actividad.usuario)}`}
                  </p>
              </div>
          </div>
      ))}
    </div>
  )
}

interface TaskListProps {
  project: Proyecto;
  vendedores: Vendedor[];
  personasInvolucradas: PersonaInvolucrada[];
  user: AuthUser | null;
  onTaskCreate: (taskData: Omit<Tarea, 'id' | 'estado'>) => void;
  onTaskUpdate: (originalTask: Tarea, updatedTask: Tarea, updatedFields: string[]) => void;
  onTaskStateChange: (taskId: string, newState: TareaEstado, comment: string) => void;
}

export default function TaskList({ project, vendedores, personasInvolucradas, user, onTaskCreate, onTaskUpdate, onTaskStateChange }: TaskListProps) {
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [taskToClose, setTaskToClose] = useState<{ id: string; state: TareaEstado } | null>(null);
  const [closeComment, setCloseComment] = useState('');
  const [editingTask, setEditingTask] = useState<Tarea | null>(null);

  const allPeople = useMemo(() => [...vendedores, ...personasInvolucradas], [vendedores, personasInvolucradas]);
  const loggedInPerson = useMemo(() => user ? allPeople.find(p => p.email === user.email) : null, [user, allPeople]);
  const isAdmin = useMemo(() => loggedInPerson && 'isAdmin' in loggedInPerson && loggedInPerson.isAdmin === true, [loggedInPerson]);
  
  const pendingTasks = (project.tareas || []).filter(t => t.estado === 'Pendiente').sort((a,b) => new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime());
  const completedTasks = (project.tareas || []).filter(t => t.estado !== 'Pendiente').sort((a,b) => new Date(b.fechaCierre!).getTime() - new Date(a.fechaCierre!).getTime());
  
  const taskAssigneeOptions = useMemo(() => {
    const projectInvolvedIds = new Set(project.involucradosIds || []);
    if (project.vendedorId) {
        projectInvolvedIds.add(project.vendedorId);
    }
    return allPeople.filter(p => projectInvolvedIds.has(p.id));
  }, [project, allPeople]);

  const handleOpenCloseDialog = (id: string, state: TareaEstado) => {
    setTaskToClose({ id, state });
  }

  const handleConfirmCloseTask = () => {
    if (taskToClose && closeComment) {
        onTaskStateChange(taskToClose.id, taskToClose.state, closeComment);
        setTaskToClose(null);
        setCloseComment('');
    } else {
        toast({ title: 'Error', description: 'El comentario de cierre es obligatorio.', variant: 'destructive'})
    }
  }

  const handleCreateTask = (taskData: Omit<Tarea, 'id'|'estado'|'responsableNombre'>) => {
    const responsable = allPeople.find(p => p.id === taskData.responsableId);
    if (!responsable) return;

    const finalTaskData = {
      ...taskData,
      responsableNombre: responsable.nombre,
    };
    onTaskCreate(finalTaskData);
    setIsFormVisible(false);
  }

  const handleSaveEditedTask = (updatedTask: Tarea, updatedFields: string[]) => {
      const originalTask = project.tareas.find(t => t.id === updatedTask.id);
      if (originalTask) {
        onTaskUpdate(originalTask, updatedTask, updatedFields);
      }
      setEditingTask(null);
  };
  
  const handleClaimTask = async (taskId: string) => {
    toast({ title: 'Enviando recordatorio...', description: 'Por favor, espera un momento.' });
    const result = await claimTaskNotification({ projectId: project.id, taskId });
    if (result.success) {
      toast({ title: 'Éxito', description: result.message });
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' });
    }
  }

  const sortedEtapas = useMemo(() => (project.etapas || []).slice().sort((a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime()), [project.etapas]);


  return (
    <>
    <Dialog open={!!taskToClose} onOpenChange={() => setTaskToClose(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Cerrar Tarea como "{taskToClose?.state}"</DialogTitle>
            </DialogHeader>
            <div className="py-4">
                <Label htmlFor="close-comment">Comentario de Cierre (Requerido)</Label>
                <Textarea id="close-comment" value={closeComment} onChange={e => setCloseComment(e.target.value)} placeholder="Añade un comentario sobre el cierre de la tarea..."/>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                <Button onClick={handleConfirmCloseTask} disabled={!closeComment}>Confirmar Cierre</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <Dialog open={!!editingTask} onOpenChange={() => setEditingTask(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Editar Tarea</DialogTitle>
            </DialogHeader>
            {editingTask && (
                <EditTaskForm 
                    task={editingTask}
                    assignees={taskAssigneeOptions}
                    etapas={sortedEtapas}
                    onSave={handleSaveEditedTask}
                    onCancel={() => setEditingTask(null)}
                />
            )}
        </DialogContent>
    </Dialog>

      <Tabs defaultValue="tasks">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div>
                <CardTitle className="sr-only">Gestión de Tareas</CardTitle>
                <CardDescription className="sr-only">Planifica, asigna y sigue el progreso de cada tarea del proyecto.</CardDescription>
                </div>
                <TabsList>
                <TabsTrigger value="tasks"><ListTodo className="mr-2 h-4 w-4"/>Tareas</TabsTrigger>
                <TabsTrigger value="history"><History className="mr-2 h-4 w-4"/>Historial de Actividad</TabsTrigger>
                </TabsList>
            </div>
          </CardHeader>
        <CardContent>
            <TabsContent value="tasks" className="space-y-4">
                {!isFormVisible && <Button onClick={() => setIsFormVisible(true)}><PlusCircle className="mr-2 h-4 w-4"/>Añadir Nueva Tarea</Button>}
                {isFormVisible && <NewTaskForm assignees={taskAssigneeOptions} etapas={sortedEtapas} onCreate={handleCreateTask} onCancel={() => setIsFormVisible(false)}/>}
                
                <div className="space-y-3 pt-4">
                    <h4 className="font-semibold text-md">Tareas Pendientes ({pendingTasks.length})</h4>
                    {pendingTasks.length > 0 ? pendingTasks.map(task => {
                    const canPerformActions = !!isAdmin || (loggedInPerson?.id === project.responsableSeguimientoId) || (loggedInPerson?.id === project.vendedorId);
                    return <TaskItem key={task.id} task={task} allPeople={allPeople} onStateChange={handleOpenCloseDialog} onEdit={setEditingTask} canEdit={canPerformActions} onClaim={handleClaimTask}/>
                    }) : <p className="text-muted-foreground text-sm text-center py-4">No hay tareas pendientes.</p>}
                </div>

                <div className="space-y-3 pt-4">
                    <h4 className="font-semibold text-md">Tareas Completadas ({completedTasks.length})</h4>
                    {completedTasks.length > 0 ? completedTasks.map(task => <TaskItem key={task.id} task={task} allPeople={allPeople} onStateChange={handleOpenCloseDialog} onEdit={() => {}} canEdit={false} onClaim={() => {}}/>) : <p className="text-muted-foreground text-sm text-center py-4">No hay tareas completadas.</p>}
                </div>
            </TabsContent>
            <TabsContent value="history">
                 <ActivityLog activities={(project.actividades || []).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())} />
            </TabsContent>
        </CardContent>
      </Tabs>
    </>
  );
}

    