

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Calendar, User, Percent, FileText, Briefcase, FilePenLine, AlertTriangle, Target, Users, Ban, UserCheck, CalendarPlus, Clock, GanttChartSquare, NotebookPen, ListTodo } from 'lucide-react';
import TaskList from '@/components/TaskList';
import type { Estado, Proyecto, Vendedor, UnidadDeNegocio, Actividad, MotivoPerdida, Subcategoria, Tarea, TareaEstado, PersonaInvolucrada, CambiosAvance, Etapa } from '@/lib/types';
import { cn, calculateProjectAge, filterProjectsByUser, updateTaskStatusInStages } from '@/lib/utils';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { EditProjectSheet } from '@/components/EditProjectSheet';
import ProjectStatusStepper from '@/components/ProjectStatusStepper';
import { toast } from '@/hooks/use-toast';
import { updateProject, getProjectById, getVendedores, getPersonasInvolucradas, getEstados, getUnidadesDeNegocio, getSubcategorias, getMotivosPerdida } from '@/lib/data';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import ProjectProgress from '@/components/ProjectProgress';
import { format } from 'date-fns';
import { sendTaskNotification } from '@/app/actions/task-notifications';
import { sendProjectStateNotification } from '@/app/actions/project-notifications';
import { useAuth } from '@/hooks/use-auth';
import ProjectDetailLoading from './loading';
import { notFound } from 'next/navigation';
import StageManager from '@/components/StageManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProjectGanttChart from '@/components/ProjectGanttChart';
import DraggableCardContainer from '@/components/DraggableCardContainer';


function formatDate(dateString: string | undefined) {
  if (!dateString) return 'N/A';
  return format(new Date(dateString + 'T00:00:00'), 'dd/MM/yyyy');
}

interface ProjectDetailClientProps {
  projectId: string;
}

export default function ProjectDetailClient({ projectId }: ProjectDetailClientProps) {
  const { user, loading: authLoading, isAdmin } = useAuth();
  
  const [project, setProject] = useState<Proyecto | null>(null);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [personasInvolucradas, setPersonasInvolucradas] = useState<PersonaInvolucrada[]>([]);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [unidadesDeNegocio, setUnidadesDeNegocio] = useState<UnidadDeNegocio[]>([]);
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);
  const [motivosPerdida, setMotivosPerdida] = useState<MotivoPerdida[]>([]);
  const [loading, setLoading] = useState(true);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isLossReasonDialogOpen, setIsLossReasonDialogOpen] = useState(false);
  const [isCancellationDialogOpen, setIsCancellationDialogOpen] = useState(false);
  const [selectedLossReason, setSelectedLossReason] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState<string>("");
  const [pendingState, setPendingState] = useState<Estado | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!authLoading && user) {
        setLoading(true);
        try {
          const [
            projectData,
            vendedoresData,
            personasData,
            estadosData,
            unidadesData,
            subcategoriasData,
            motivosData
          ] = await Promise.all([
            getProjectById(projectId),
            getVendedores(),
            getPersonasInvolucradas(),
            getEstados(),
            getUnidadesDeNegocio(),
            getSubcategorias(),
            getMotivosPerdida(),
          ]);

          if (!projectData) {
            notFound();
            return;
          }
          
          // Security check: ensure user has access to this project
          const allPeople = [...vendedoresData, ...personasData];
          const visibleProjects = filterProjectsByUser([projectData], user, allPeople);
          if (visibleProjects.length === 0) {
            notFound(); // Or show an access denied page
            return;
          }

          setProject(projectData);
          setVendedores(vendedoresData);
          setPersonasInvolucradas(personasData);
          setEstados(estadosData);
          setUnidadesDeNegocio(unidadesData);
          setSubcategorias(subcategoriasData);
          setMotivosPerdida(motivosData);

        } catch (error) {
          console.error("Failed to fetch project details", error);
          toast({ title: 'Error', description: 'No se pudo cargar el proyecto.', variant: 'destructive' });
        } finally {
          setLoading(false);
        }
      } else if (!authLoading && !user) {
         setLoading(false);
         // The main AppContent will handle redirect
      }
    };
    fetchData();
  }, [projectId, user, authLoading]);
  
  const handleProjectUpdate = async (updatedProjectData: Partial<Proyecto>, activityDescription: string) => {
    if (!user || !project) {
      toast({ title: 'Error', description: 'Debes estar autenticado para actualizar.', variant: 'destructive' });
      return false;
    }
    
    try {
      
      const updatedProject = await updateProject(project.id, updatedProjectData, { 
        actividad: { 
          descripcion: activityDescription,
          usuario: user.email || 'sistema' 
        } 
      });
      
      if (updatedProject) {
        setProject(updatedProject);
      }
      
      toast({ title: 'Éxito', description: 'Proyecto actualizado correctamente.' });
      return true;
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'No se pudo actualizar el proyecto.', variant: 'destructive' });
      return false;
    }
  };

  const handleProgressUpdate = async (updatedProjectData: Partial<Proyecto>, activityData: Omit<Actividad, 'id' | 'timestamp' | 'usuario'>) => {
    if (!user || !project) {
      toast({ title: 'Error', description: 'Debes estar autenticado para actualizar.', variant: 'destructive' });
      return false;
    }
    
    try {
      
      const updatedProject = await updateProject(project.id, updatedProjectData, { 
        actividad: {
          ...activityData,
          usuario: user.email || 'sistema',
        }
      });
      
      if (updatedProject) {
        setProject(updatedProject);
      }
      
      toast({ title: 'Éxito', description: 'Avance registrado y proyecto actualizado.' });
      
      sendProjectStateNotification({
        project: { ...project, ...updatedProjectData },
        eventType: 'nuevoAvance',
        userName: user.email || 'un usuario'
      });
      
      return true;
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'No se pudo registrar el avance.', variant: 'destructive' });
      return false;
    }
  };

  const handleProgressEdit = async (data: Partial<Omit<Proyecto, 'actividades'>>, updatedActivity: Actividad) => {
    if (!user || !project) {
        toast({ title: 'Error', description: 'Debes estar autenticado para actualizar.', variant: 'destructive' });
        return false;
    }
    try {
        const activityIndex = project.actividades.findIndex(a => a.id === updatedActivity.id);
        if (activityIndex === -1) {
            toast({ title: 'Error', description: 'No se encontró el avance para editar.', variant: 'destructive' });
            return false;
        }
        
        const updatedActivities = [...project.actividades];
        updatedActivities[activityIndex] = updatedActivity;

        const finalUpdatePayload: Partial<Proyecto> = {
            ...data,
            actividades: updatedActivities
        };
        
        const updatedProject = await updateProject(project.id, finalUpdatePayload);
        
        if (updatedProject) {
          setProject(updatedProject);
        }
        
        toast({ title: 'Éxito', description: 'Avance actualizado correctamente.' });
        return true;

    } catch(e) {
        console.error(e);
        toast({ title: 'Error', description: 'No se pudo editar el avance.', variant: 'destructive' });
        return false;
    }
  }

  const handleProgressDelete = async (activityIdToDelete: string) => {
    if (!user || !project) {
      toast({ title: 'Error', description: 'Debes estar autenticado para actualizar.', variant: 'destructive' });
      return false;
    }

    try {
      const updatedActivities = project.actividades.filter(a => a.id !== activityIdToDelete);
      const finalUpdatePayload = { actividades: updatedActivities };

      const updatedProject = await updateProject(project.id, finalUpdatePayload);
      
      if (updatedProject) {
        setProject(updatedProject);
      }

      toast({ title: 'Éxito', description: 'Avance eliminado correctamente.' });
      return true;

    } catch(e) {
      console.error(e);
      toast({ title: 'Error', description: 'No se pudo eliminar el avance.', variant: 'destructive' });
      return false;
    }
  }

  const handleTaskCreate = async (newTaskData: Omit<Tarea, 'id' | 'estado'>) => {
    if (!user || !project) return;
    
    const newId = `task-${Date.now()}`;
    const newTask: Tarea = {
        ...newTaskData,
        id: newId,
        estado: 'Pendiente'
    };
    
    let updatedEtapas = project.etapas ? [...project.etapas] : [];
    if (newTask.etapaId) {
        updatedEtapas = updateTaskStatusInStages(updatedEtapas, [...(project.tareas || []), newTask]);
    }
    
    const updatedProjectData = {
      tareas: [...(project.tareas || []), newTask],
      etapas: updatedEtapas,
    }
    
    const activityDescription = `Nueva tarea creada: "${newTask.descripcion}", responsable: ${newTask.responsableNombre}.`;
    
    const updatedProject = await updateProject(project.id, updatedProjectData, { 
      actividad: {
        descripcion: activityDescription,
        usuario: user.email || 'sistema',
      }
    });
    
    if (updatedProject) {
        setProject(updatedProject);
        sendTaskNotification({
            project: updatedProject,
            task: newTask,
            eventType: 'nuevaAsignada'
        });
    }
  };

  const handleTaskUpdate = async (originalTask: Tarea, updatedTask: Tarea, updatedFields: string[]) => {
    if (!user || !project) return;
    
    const allPeople = [...vendedores, ...personasInvolucradas];
    const responsable = allPeople.find(p => p.id === updatedTask.responsableId);
    if (!responsable) {
        toast({ title: 'Error', description: 'Responsable de la tarea no encontrado.', variant: 'destructive'});
        return;
    }
    
    const finalTask = { ...updatedTask, responsableNombre: responsable.nombre };

    const activityDescription = `Tarea "${originalTask.descripcion}" actualizada. Cambios: ${updatedFields.join(', ')}.`;

    const result = await updateProject(project.id, {}, { 
      actividad: {
        descripcion: activityDescription,
        usuario: user.email || 'sistema',
      },
      taskToUpdate: finalTask 
    });

    if (result) {
        setProject(result);
        toast({ title: 'Éxito', description: 'Tarea actualizada correctamente.'});

        if (finalTask.responsableId !== originalTask.responsableId) {
            sendTaskNotification({
                project: result,
                task: finalTask,
                eventType: 'nuevaAsignada'
            });
        }
    } else {
        toast({ title: 'Error', description: 'No se pudo actualizar la tarea.', variant: 'destructive' });
    }
  };


  const handleTaskStateChange = async (taskId: string, newStatus: TareaEstado, closeComment: string) => {
    if (!project || !project.tareas || !user) return;

    const taskIndex = project.tareas.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const updatedTasks = [...project.tareas];
    const task = { ...updatedTasks[taskIndex] };

    task.estado = newStatus;
    task.comentarioCierre = closeComment;
    task.fechaCierre = new Date().toISOString();
    task.usuarioCierre = user.email || 'Sistema';

    updatedTasks[taskIndex] = task;

    const activityDescription = `Tarea "${task.descripcion}" marcada como ${newStatus}. Comentario: ${closeComment}`;
    
    const updatedEtapas = project.etapas ? updateTaskStatusInStages([...project.etapas], updatedTasks) : [];
    
    const updatedProjectData = {
        tareas: updatedTasks,
        etapas: updatedEtapas,
    };
    
    const updatedProject = await updateProject(project.id, updatedProjectData, {
      actividad: {
        descripcion: activityDescription,
        usuario: user.email || 'sistema'
      }
    });

    if (updatedProject) {
        setProject(updatedProject);
        if (newStatus === 'Cumplida') {
            sendTaskNotification({
                project: updatedProject,
                task,
                eventType: 'completada'
            });
        }
    }
  };

  const handleStatusChange = (newStatus: Estado) => {
    if (!project) return;
    
    // Si se hace clic en un estado anterior, simplemente revierte el estado
    const allKnownStates = [...estados];
    const currentIndex = allKnownStates.findIndex(s => s === project.estado);
    const newIndex = allKnownStates.findIndex(s => s === newStatus);

    if (newIndex < currentIndex) {
      updateProjectStatus(newStatus);
      return;
    }

    if (newStatus === 'Cerrado Perdido') {
        setPendingState(newStatus);
        setIsLossReasonDialogOpen(true);
    } else if (newStatus === 'Cancelado') {
        setPendingState(newStatus);
        setIsCancellationDialogOpen(true);
    } else {
        updateProjectStatus(newStatus);
    }
  };

  const updateProjectStatus = async (newStatus: Estado, reason?: string) => {
     if (!user || !project) return;
     const oldStatus = project.estado;
     let activityDescription = `El estado del proyecto cambió de "${oldStatus}" a "${newStatus}".`;
     const updatedProjectData: Partial<Proyecto> = {
        estado: newStatus,
     }

     if (newStatus === 'Cerrado Perdido' && reason) {
        activityDescription += ` Motivo: ${reason}`;
        updatedProjectData.motivoPerdida = reason;
     }

     if (newStatus === 'Cancelado' && reason) {
        activityDescription += ` Motivo: ${reason}`;
        updatedProjectData.motivoCancelacion = reason;
     }
     
      if (newStatus === 'Ganado') {
        updatedProjectData.probabilidadCierre = 1;
     }

    if (await handleProjectUpdate(updatedProjectData, activityDescription)) {
        toast({
            title: "Estado Actualizado",
            description: `El proyecto ahora está en estado de "${newStatus}".`
        });

        if (['Cerrado Ganado', 'Cerrado Perdido', 'Cancelado'].includes(newStatus)) {
            sendProjectStateNotification({
                project: { ...project, ...updatedProjectData },
                eventType: 'cerrado',
                userName: user.email || 'un usuario'
            });
        }

    } else {
        toast({
            title: "Error al actualizar",
            description: `No se pudo cambiar el estado del proyecto.`,
            variant: "destructive"
       });
    }
  }

  const handleConfirmLossReason = () => {
    if(pendingState === 'Cerrado Perdido' && selectedLossReason) {
        updateProjectStatus(pendingState, selectedLossReason);
    }
    setIsLossReasonDialogOpen(false);
    setPendingState(null);
    setSelectedLossReason(null);
  }

  const handleCancelLossReason = () => {
    setIsLossReasonDialogOpen(false);
    setPendingState(null);
    setSelectedLossReason(null);
  }
  
  const handleConfirmCancellation = () => {
    if(pendingState === 'Cancelado' && cancellationReason) {
        updateProjectStatus(pendingState, cancellationReason);
    }
    setIsCancellationDialogOpen(false);
    setPendingState(null);
    setCancellationReason("");
  }

  const handleCancelCancellation = () => {
    setIsCancellationDialogOpen(false);
    setPendingState(null);
    setCancellationReason("");
  }

  const allPeople = useMemo(() => [...vendedores, ...personasInvolucradas], [vendedores, personasInvolucradas]);
  const subcategoriaNombre = useMemo(() => project?.subcategoria ? subcategorias.find(s => s.id === project.subcategoria)?.nombre : null, [project, subcategorias]);
  const projectAge = useMemo(() => project ? calculateProjectAge(project.fechaIngreso) : 0, [project]);

  const vendedorNombre = useMemo(() => {
    if (!project || !vendedores) return 'Desconocido';
    return vendedores.find(v => v.id === project.vendedorId)?.nombre || 'Desconocido';
  }, [project, vendedores]);

  const involvedPeopleNames = useMemo(() => {
    if (!project?.involucradosIds || project.involucradosIds.length === 0) {
      return [];
    }
    return project.involucradosIds
      .map(id => allPeople.find(p => p.id === id)?.nombre)
      .filter((name): name is string => !!name);
  }, [project, allPeople]);
  
  const responsableSeguimientoNombre = useMemo(() => {
    if (!project?.responsableSeguimientoId) return 'No asignado';
    return allPeople.find(p => p.id === project.responsableSeguimientoId)?.nombre || 'Desconocido';
  }, [project, allPeople]);

  const cardComponents = useMemo(() => {
    if (!project) return [];
    
    return [
      { id: 'status', component: (
        <Card>
          <CardHeader>
            <CardTitle>Progreso del Proyecto</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectStatusStepper 
              allStates={estados}
              currentState={project.estado}
              onStateChange={handleStatusChange}
            />
          </CardContent>
        </Card>
      )},
      { id: 'metrics', component: (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pipeline</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(project.pipelineUSD)}</div>
            </CardContent>
            </Card>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fecha Ingreso</CardTitle>
                <CalendarPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatDate(project.fechaIngreso)}</div>
                <p className="text-xs text-muted-foreground">{projectAge} días en curso</p>
            </CardContent>
            </Card>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fecha Cierre Est.</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatDate(project.fechaEstimadaCierre)}</div>
            </CardContent>
            </Card>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vendedor</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{vendedorNombre}</div>
            </CardContent>
            </Card>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Responsable Seguimiento</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-xl font-bold">{responsableSeguimientoNombre}</div>
            </CardContent>
            </Card>
            <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Otros Involucrados</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {involvedPeopleNames.length > 0 ? (
                <ul className="text-sm space-y-1">
                    {involvedPeopleNames.map(name => <li key={name}>{name}</li>)}
                </ul>
                ) : (
                <p className="text-sm text-muted-foreground">Nadie más involucrado.</p>
                )}
            </CardContent>
            </Card>
        </div>
      )},
      { id: 'description', component: (
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center"><FileText className="mr-2 h-5 w-5"/> Descripción del Proyecto</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">{project.descripcion}</p>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div className="flex items-center gap-2">
                        <Percent className="h-4 w-4 text-primary" />
                        <strong>Prob. Cierre:</strong>
                        <span>{(project.probabilidadCierre * 100).toFixed(0)}%</span>
                    </div>
                </div>
                {project.estado === 'Cerrado Perdido' && project.motivoPerdida && (
                    <div className="mt-4 flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        <div>
                            <strong className="font-semibold">Motivo de Pérdida:</strong>
                            <span className="ml-2">{project.motivoPerdida}</span>
                        </div>
                    </div>
                )}
                {project.estado === 'Cancelado' && project.motivoCancelacion && (
                    <div className="mt-4 flex items-center gap-2 rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3 text-yellow-600">
                        <Ban className="h-5 w-5" />
                        <div>
                            <strong className="font-semibold">Motivo de Cancelación:</strong>
                            <span className="ml-2">{project.motivoCancelacion}</span>
                        </div>
                    </div>
                )}
            </CardContent>
            </Card>
      )},
      { id: 'stages', component: (
            <Tabs defaultValue="stages">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="stages">
                        <GanttChartSquare className="mr-2 h-4 w-4" /> Etapas
                    </TabsTrigger>
                    <TabsTrigger value="gantt">
                        <GanttChartSquare className="mr-2 h-4 w-4" /> Diagrama de Gantt
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="stages" className="space-y-6 mt-6">
                    <StageManager project={project} onProjectUpdate={setProject} />
                </TabsContent>
                <TabsContent value="gantt" className="mt-6">
                    <ProjectGanttChart project={project} />
                </TabsContent>
            </Tabs>
      )},
      { id: 'tasks', component: (
          <Card>
            <CardHeader>
                <CardTitle className="flex items-center"><ListTodo className="mr-2 h-5 w-5"/> Gestión de Tareas</CardTitle>
            </CardHeader>
            <CardContent>
                <TaskList 
                    project={project}
                    vendedores={vendedores}
                    personasInvolucradas={personasInvolucradas}
                    user={user}
                    onTaskCreate={handleTaskCreate}
                    onTaskUpdate={handleTaskUpdate}
                    onTaskStateChange={handleTaskStateChange}
                />
            </CardContent>
          </Card>
      )},
      { id: 'progress', component: (
          <Card>
            <CardHeader>
                <CardTitle className="flex items-center"><NotebookPen className="mr-2 h-5 w-5"/> Avances del Proyecto</CardTitle>
            </CardHeader>
            <CardContent>
                <ProjectProgress 
                    project={project} 
                    onProgressUpdate={handleProgressUpdate} 
                    onProgressEdit={handleProgressEdit}
                    onProgressDelete={handleProgressDelete}
                />
            </CardContent>
          </Card>
      )},
    ];
  }, [project, estados, subcategorias, vendedores, personasInvolucradas, user, projectAge, vendedorNombre, responsableSeguimientoNombre, involvedPeopleNames]);


  if (authLoading || loading) {
    return <ProjectDetailLoading />;
  }

  if (!project) {
     // This can happen if the user doesn't have permission or the project doesn't exist.
     // The notFound() call inside useEffect would have already triggered for the server.
     // For the client, we can show a loader, which will soon be replaced by the not-found page.
    return <ProjectDetailLoading />;
  }

  return (
    <>
      <EditProjectSheet 
        isOpen={isSheetOpen}
        setIsOpen={setIsSheetOpen}
        project={project}
        vendedores={vendedores}
        personasInvolucradas={personasInvolucradas}
        unidadesDeNegocio={unidadesDeNegocio}
        subcategorias={subcategorias}
        onProjectUpdate={handleProjectUpdate}
      />
      <AlertDialog open={isLossReasonDialogOpen} onOpenChange={setIsLossReasonDialogOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
              <AlertDialogTitle>Seleccionar Motivo de Pérdida</AlertDialogTitle>
              <AlertDialogDescription>
                  Por favor, selecciona el motivo por el cual se considera perdido este proyecto.
              </AlertDialogDescription>
              </AlertDialogHeader>
              <RadioGroup onValueChange={setSelectedLossReason} className="my-4 space-y-2">
                  {motivosPerdida.map(motivo => (
                      <div key={motivo.id} className="flex items-center space-x-2">
                          <RadioGroupItem value={motivo.descripcion} id={motivo.id} />
                          <Label htmlFor={motivo.id}>{motivo.descripcion}</Label>
                      </div>
                  ))}
              </RadioGroup>
              <AlertDialogFooter>
              <Button variant="ghost" onClick={handleCancelLossReason}>Cancelar</Button>
              <AlertDialogAction onClick={handleConfirmLossReason} disabled={!selectedLossReason}>Confirmar</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

       <AlertDialog open={isCancellationDialogOpen} onOpenChange={setIsCancellationDialogOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
              <AlertDialogTitle>Cancelar Proyecto</AlertDialogTitle>
              <AlertDialogDescription>
                  Por favor, introduce el motivo de la cancelación de este proyecto.
              </AlertDialogDescription>
              </AlertDialogHeader>
              <Textarea 
                placeholder="Describe por qué se cancela el proyecto..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="my-4"
              />
              <AlertDialogFooter>
              <Button variant="ghost" onClick={handleCancelCancellation}>Cerrar</Button>
              <AlertDialogAction onClick={handleConfirmCancellation} disabled={!cancellationReason}>Confirmar Cancelación</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
              <h1 className="text-3xl font-bold font-headline">{project.tema}</h1>
              <p className="text-lg text-muted-foreground">{project.cliente}</p>
              <div className="mt-2 flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="secondary">{project.unidadDeNegocio}</Badge>
                  {subcategoriaNombre && <Badge variant="outline">{subcategoriaNombre}</Badge>}
              </div>
          </div>
          <div className="flex items-center gap-2">
              <Button onClick={() => setIsSheetOpen(true)} variant="ghost" size="icon">
                  <FilePenLine />
                  <span className="sr-only">Editar Proyecto</span>
              </Button>
          </div>
        </div>
        
        <DraggableCardContainer
            storageKey="project-detail-order"
            items={cardComponents}
        />
        
      </div>
    </>
  );
}

    