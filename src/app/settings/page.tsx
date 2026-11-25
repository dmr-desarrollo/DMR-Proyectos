

'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Cog,
  PlusCircle,
  Trash2,
  FilePenLine,
  ShieldCheck,
  Bell,
  Lock,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
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

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { 
    getUnidadesDeNegocio, 
    getSubcategorias,
    getVendedores,
    getMotivosPerdida,
    getPersonasInvolucradas,
    addUnidadDeNegocio,
    updateUnidadDeNegocio,
    deleteUnidadDeNegocio,
    addSubcategoria,
    updateSubcategoria,
    deleteSubcategoria,
    addVendedor,
    updateVendedor,
    deleteVendedor,
    addPersonaInvolucrada,
    updatePersonaInvolucrada,
    deletePersonaInvolucrada,
    addMotivoPerdida,
    updateMotivoPerdida,
    deleteMotivoPerdida,
    getNotificationSettings,
    updateNotificationSettings,
} from '@/lib/data';
import type { UnidadDeNegocio, Subcategoria, Vendedor, MotivoPerdida, PersonaInvolucrada, AjustesNotificacion } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import Loading from '../loading';
import SubcategoriaForm from '@/components/SubcategoriaForm';
import { Checkbox } from '@/components/ui/checkbox';
import NotificationSettings from '@/components/NotificationSettings';


type DeletionTarget = 
  | { type: 'unidad'; item: UnidadDeNegocio }
  | { type: 'subcategoria'; item: Subcategoria }
  | { type: 'vendedor'; item: Vendedor }
  | { type: 'persona'; item: PersonaInvolucrada }
  | { type: 'motivo'; item: MotivoPerdida }
  | null;

// Tipos para los formularios de edición/creación
type EditableUnidad = Omit<UnidadDeNegocio, 'id'> & { id?: string };
type EditableVendedor = Omit<Vendedor, 'id'> & { id?: string };
type EditablePersona = Omit<PersonaInvolucrada, 'id'> & { id?: string };
type EditableMotivo = Omit<MotivoPerdida, 'id'> & { id?: string };

export default function SettingsPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [unidades, setUnidades] = useState<UnidadDeNegocio[]>([]);
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [personas, setPersonas] = useState<PersonaInvolucrada[]>([]);
  const [motivosPerdida, setMotivosPerdida] = useState<MotivoPerdida[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<AjustesNotificacion | null>(null);
  const [loading, setLoading] = useState(true);

  const [deletionTarget, setDeletionTarget] = useState<DeletionTarget>(null);

  // Estados para los modales
  const [isUnidadModalOpen, setIsUnidadModalOpen] = useState(false);
  const [isSubcategoriaModalOpen, setIsSubcategoriaModalOpen] = useState(false);
  const [isVendedorModalOpen, setIsVendedorModalOpen] = useState(false);
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const [isMotivoModalOpen, setIsMotivoModalOpen] = useState(false);

  // Estados para los formularios
  const [currentUnidad, setCurrentUnidad] = useState<EditableUnidad | null>(null);
  const [currentSubcategoria, setCurrentSubcategoria] = useState<Omit<Subcategoria, 'id' | 'unidadDeNegocioId'> & { id?: string; unidadDeNegocioId?: string; } | null>(null);
  const [currentVendedor, setCurrentVendedor] = useState<EditableVendedor | null>(null);
  const [currentPersona, setCurrentPersona] = useState<EditablePersona | null>(null);
  const [currentMotivo, setCurrentMotivo] = useState<EditableMotivo | null>(null);

   const fetchAllData = async () => {
    if (!authLoading && user && isAdmin) {
     try {
        setLoading(true);
        const [unidadesData, subcategoriasData, vendedoresData, motivosData, personasData, notifSettingsData] = await Promise.all([
            getUnidadesDeNegocio(),
            getSubcategorias(),
            getVendedores(),
            getMotivosPerdida(),
            getPersonasInvolucradas(),
            getNotificationSettings(),
        ]);
        setUnidades(unidadesData);
        setSubcategorias(subcategoriasData);
        setVendedores(vendedoresData.filter(v => v.id !== 'ajustes_notificaciones')); // Exclude settings from vendors list
        setPersonas(personasData);
        setMotivosPerdida(motivosData);
        setNotificationSettings(notifSettingsData);
    } catch (error) {
        console.error("Failed to fetch settings data", error);
        toast({ title: 'Error', description: 'No se pudieron cargar los datos de configuración.', variant: 'destructive' });
    } finally {
        setLoading(false);
    }
    } else if (!authLoading) {
        setLoading(false);
    }
  }

  useEffect(() => {
    fetchAllData();
  }, [user, authLoading, isAdmin]);
  
  // --- Handlers para abrir modales en modo EDICIÓN ---
  const handleOpenUnidadModal = (unidad?: UnidadDeNegocio) => {
    setCurrentUnidad(unidad ? { ...unidad } : { nombre: 'Tecnologia' as any });
    setIsUnidadModalOpen(true);
  };
  
  const handleOpenSubcategoriaModal = (subcategoria?: Subcategoria) => {
    setCurrentSubcategoria(subcategoria ? { ...subcategoria } : { nombre: '', unidadDeNegocioId: '' });
    setIsSubcategoriaModalOpen(true);
  };
  
  const handleOpenVendedorModal = (vendedor?: Vendedor) => {
    setCurrentVendedor(vendedor ? { ...vendedor } : { nombre: '', email: '' });
    setIsVendedorModalOpen(true);
  };
  
  const handleOpenPersonaModal = (persona?: PersonaInvolucrada) => {
    setCurrentPersona(persona ? { ...persona } : { nombre: '', email: '', isAdmin: false });
    setIsPersonaModalOpen(true);
  };

  const handleOpenMotivoModal = (motivo?: MotivoPerdida) => {
    setCurrentMotivo(motivo ? { ...motivo } : { descripcion: '' });
    setIsMotivoModalOpen(true);
  }

  // --- Handlers para cambios en los formularios ---
  const handleUnidadChange = (field: keyof EditableUnidad, value: string) => {
    if (currentUnidad) {
      setCurrentUnidad({ ...currentUnidad, [field]: value as UnidadDeNegocio['nombre'] });
    }
  };
  
  const handleVendedorChange = (field: keyof EditableVendedor, value: string) => {
    if (currentVendedor) {
      setCurrentVendedor({ ...currentVendedor, [field]: value });
    }
  };

  const handlePersonaChange = (field: keyof EditablePersona, value: string | boolean) => {
    if (currentPersona) {
      setCurrentPersona({ ...currentPersona, [field]: value });
    }
  };
  const handleMotivoChange = (field: keyof EditableMotivo, value: string) => {
    if (currentMotivo) {
      setCurrentMotivo({ ...currentMotivo, [field]: value });
    }
  };

  const handleSaveNotificationSettings = async () => {
      if (!notificationSettings) return;
      try {
          await updateNotificationSettings(notificationSettings);
          toast({ title: 'Éxito', description: 'Ajustes de notificación actualizados.' });
      } catch (error) {
          console.error(error);
          toast({ title: 'Error', description: 'No se pudieron guardar los ajustes de notificación.', variant: 'destructive' });
      }
  }
  
  
  // --- Handlers para GUARDAR ---
  const handleSaveUnidad = async () => {
    if (!currentUnidad || !currentUnidad.nombre) {
      toast({ title: 'Error', description: 'El nombre de la unidad es requerido.', variant: 'destructive' });
      return;
    }
    try {
        const { id, ...data } = currentUnidad;
        if (id) {
            await updateUnidadDeNegocio(id, data);
            toast({ title: 'Éxito', description: 'Unidad de negocio actualizada.' });
        } else {
            await addUnidadDeNegocio(data);
            toast({ title: 'Éxito', description: 'Unidad de negocio añadida.' });
        }
        await fetchAllData();
        setIsUnidadModalOpen(false);
    } catch(error) {
        toast({ title: 'Error', description: 'No se pudo guardar la unidad de negocio.', variant: 'destructive' });
    }
  };
  
  const handleSaveSubcategoria = async (data: {nombre: string; unidadDeNegocioId: string; id?: string}) => {
    try {
        const { id, ...subcategoriaData } = data;
        if (id) {
            await updateSubcategoria(id, subcategoriaData);
            toast({ title: 'Éxito', description: 'Subcategoría actualizada.' });
        } else {
            await addSubcategoria(subcategoriaData);
            toast({ title: 'Éxito', description: 'Subcategoría añadida.' });
        }
        await fetchAllData();
        setIsSubcategoriaModalOpen(false);
    } catch(error) {
        toast({ title: 'Error', description: 'No se pudo guardar la subcategoría.', variant: 'destructive' });
        console.error(error);
    }
  };

  const handleSaveVendedor = async () => {
    if (!currentVendedor || !currentVendedor.nombre || !currentVendedor.email) {
        toast({ title: 'Error', description: 'El nombre y el email del vendedor son requeridos.', variant: 'destructive' });
      return;
    }
    try {
        const { id, ...data } = currentVendedor;
        if (id) {
            await updateVendedor(id, data);
            toast({ title: 'Éxito', description: 'Vendedor actualizado.' });
        } else {
            await addVendedor(data);
            toast({ title: 'Éxito', description: 'Vendedor añadido.' });
        }
        await fetchAllData();
        setIsVendedorModalOpen(false);
    } catch(e) {
         toast({ title: 'Error', description: 'No se pudo guardar el vendedor.', variant: 'destructive' });
    }
  };
  
  const handleSavePersona = async () => {
    if (!currentPersona || !currentPersona.nombre || !currentPersona.email) {
        toast({ title: 'Error', description: 'El nombre y el email de la persona son requeridos.', variant: 'destructive' });
      return;
    }
    try {
        const { id, ...data } = currentPersona;
        if (id) {
            await updatePersonaInvolucrada(id, data);
            toast({ title: 'Éxito', description: 'Persona actualizada.' });
        } else {
            await addPersonaInvolucrada(data);
            toast({ title: 'Éxito', description: 'Persona añadida.' });
        }
        await fetchAllData();
        setIsPersonaModalOpen(false);
    } catch(e) {
         toast({ title: 'Error', description: 'No se pudo guardar la persona.', variant: 'destructive' });
    }
  };

  const handleSaveMotivo = async () => {
    if (!currentMotivo || !currentMotivo.descripcion) {
        toast({ title: 'Error', description: 'La descripción del motivo es requerida.', variant: 'destructive' });
      return;
    }
     try {
        const { id, ...data } = currentMotivo;
        if (id) {
            await updateMotivoPerdida(id, data);
            toast({ title: 'Éxito', description: 'Motivo de pérdida actualizado.' });
        } else {
            await addMotivoPerdida(data);
            toast({ title: 'Éxito', description: 'Motivo de pérdida añadido.' });
        }
        await fetchAllData();
        setIsMotivoModalOpen(false);
    } catch(e) {
         toast({ title: 'Error', description: 'No se pudo guardar el motivo.', variant: 'destructive' });
    }
  };

    const handleDelete = async () => {
        if (!deletionTarget) return;
        try {
            switch (deletionTarget.type) {
                case 'unidad':
                    await deleteUnidadDeNegocio(deletionTarget.item.id);
                    toast({ title: 'Éxito', description: 'Unidad de negocio eliminada.' });
                    break;
                case 'subcategoria':
                    await deleteSubcategoria(deletionTarget.item.id);
                    toast({ title: 'Éxito', description: 'Subcategoría eliminada.' });
                    break;
                case 'vendedor':
                    await deleteVendedor(deletionTarget.item.id);
                    toast({ title: 'Éxito', description: 'Vendedor eliminado.' });
                    break;
                case 'persona':
                    await deletePersonaInvolucrada(deletionTarget.item.id);
                    toast({ title: 'Éxito', description: 'Persona eliminada.' });
                    break;
                case 'motivo':
                    await deleteMotivoPerdida(deletionTarget.item.id);
                    toast({ title: 'Éxito', description: 'Motivo de pérdida eliminado.' });
                    break;
            }
            await fetchAllData();
        } catch (error) {
            toast({ title: 'Error', description: `No se pudo eliminar el elemento. Puede que esté en uso en algún proyecto.`, variant: 'destructive' });
        } finally {
            setDeletionTarget(null);
        }
    };

    if (authLoading || (loading && user)) {
        return <Loading />;
    }

    if (!isAdmin) {
        return (
            <div className="container py-8 flex items-center justify-center">
                <Card className="max-w-md">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-center gap-2 text-destructive">
                            <Lock />
                            Acceso Denegado
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-center">No tienes los permisos necesarios para acceder a la página de configuración.</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

  return (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
          <Cog className="h-8 w-8" />
          Ajustes
        </h1>
        <p className="text-lg text-muted-foreground">
          Gestiona los datos maestros y las notificaciones de la aplicación.
        </p>
      </div>

      {notificationSettings && (
        <NotificationSettings 
            settings={notificationSettings}
            onSettingsChange={setNotificationSettings}
            onSave={handleSaveNotificationSettings}
        />
      )}
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
        <div className="space-y-8">
            {/* Unidades de Negocio */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Unidades de Negocio</CardTitle>
                    <CardDescription>
                      Añade, edita o elimina las unidades de negocio.
                    </CardDescription>
                </div>
                <Button onClick={() => handleOpenUnidadModal()}>
                    <PlusCircle /> Añadir Unidad
                </Button>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {unidades.map((item) => (
                        <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.nombre}</TableCell>
                        <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenUnidadModal(item)}>
                            <FilePenLine className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeletionTarget({ type: 'unidad', item })}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>

            {/* Subcategorias */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Subcategorías</CardTitle>
                    <CardDescription>
                      Gestiona las subcategorías y su unidad de negocio.
                    </CardDescription>
                </div>
                <Button onClick={() => handleOpenSubcategoriaModal()} disabled={unidades.length === 0} title={unidades.length === 0 ? "Debes crear al menos una unidad de negocio primero" : "Añadir Subcategoría"}>
                    <PlusCircle /> Añadir Subcategoría
                </Button>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Unidad de Negocio</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {subcategorias.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.nombre}</TableCell>
                          <TableCell>{unidades.find(u => u.id === item.unidadDeNegocioId)?.nombre}</TableCell>
                          <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => handleOpenSubcategoriaModal(item)}>
                              <FilePenLine className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeletionTarget({ type: 'subcategoria', item })}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                          </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>
        </div>
        <div className="space-y-8">
           {/* Vendedores */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Vendedores</CardTitle>
                    <CardDescription>
                    Gestiona el listado de vendedores asignables a proyectos.
                    </CardDescription>
                </div>
                <Button onClick={() => handleOpenVendedorModal()}>
                    <PlusCircle /> Añadir Vendedor
                </Button>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Nombre Completo</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {vendedores.map((vendedor) => (
                        <TableRow key={vendedor.id}>
                        <TableCell className="font-medium">{vendedor.nombre}</TableCell>
                        <TableCell>{vendedor.email}</TableCell>
                        <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenVendedorModal(vendedor)}>
                            <FilePenLine className="h-4 w-4" />
                            </Button>
                             <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeletionTarget({ type: 'vendedor', item: vendedor })}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>

            {/* Personas Involucradas */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Personas Involucradas</CardTitle>
                    <CardDescription>
                    Gestiona personas adicionales y sus permisos.
                    </CardDescription>
                </div>
                <Button onClick={() => handleOpenPersonaModal()}>
                    <PlusCircle /> Añadir Persona
                </Button>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Administrador</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {personas.map((persona) => (
                        <TableRow key={persona.id}>
                        <TableCell className="font-medium">{persona.nombre}</TableCell>
                        <TableCell>{persona.email}</TableCell>
                        <TableCell>
                            {persona.isAdmin && <ShieldCheck className="h-5 w-5 text-primary" />}
                        </TableCell>
                        <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenPersonaModal(persona)}>
                            <FilePenLine className="h-4 w-4" />
                            </Button>
                             <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeletionTarget({ type: 'persona', item: persona })}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>

           {/* Motivos de Pérdida */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Motivos de Pérdida</CardTitle>
                    <CardDescription>
                    Gestiona las razones por las que un proyecto no se gana.
                    </CardDescription>
                </div>
                <Button onClick={() => handleOpenMotivoModal()}>
                    <PlusCircle /> Añadir Motivo
                </Button>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {motivosPerdida.map((motivo) => (
                        <TableRow key={motivo.id}>
                        <TableCell className="font-medium">{motivo.descripcion}</TableCell>
                        <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenMotivoModal(motivo)}>
                            <FilePenLine className="h-4 w-4" />
                            </Button>
                             <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeletionTarget({ type: 'motivo', item: motivo })}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>
        </div>
      </div>


      {/* Modal para Unidad de Negocio */}
      <Dialog open={isUnidadModalOpen} onOpenChange={setIsUnidadModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentUnidad?.id ? 'Editar' : 'Añadir'} Unidad de Negocio</DialogTitle>
          </DialogHeader>
          {currentUnidad && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="unidad-nombre">Nombre de la Unidad</Label>
                <Input id="unidad-nombre" value={currentUnidad.nombre || ''} onChange={(e) => handleUnidadChange('nombre', e.target.value)} placeholder="Ej: Tecnología" />
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={handleSaveUnidad}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
       {/* Modal para Subcategoría */}
      <Dialog open={isSubcategoriaModalOpen} onOpenChange={setIsSubcategoriaModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentSubcategoria?.id ? 'Editar' : 'Añadir'} Subcategoría</DialogTitle>
          </DialogHeader>
          <SubcategoriaForm 
            unidadesDeNegocio={unidades}
            onSubmit={handleSaveSubcategoria}
            initialData={currentSubcategoria}
            onCancel={() => setIsSubcategoriaModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
      
      {/* Modal para Vendedor */}
       <Dialog open={isVendedorModalOpen} onOpenChange={setIsVendedorModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentVendedor?.id ? 'Editar' : 'Añadir'} Vendedor</DialogTitle>
          </DialogHeader>
          {currentVendedor && (
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="vendedor-nombre">Nombre Completo</Label>
                    <Input id="vendedor-nombre" value={currentVendedor.nombre || ''} onChange={(e) => handleVendedorChange('nombre', e.target.value)} placeholder="Ej: Juan Pérez" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="vendedor-email">Email</Label>
                    <Input id="vendedor-email" type="email" value={currentVendedor.email || ''} onChange={(e) => handleVendedorChange('email', e.target.value)} placeholder="Ej: juan.perez@example.com" />
                </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={handleSaveVendedor}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
       {/* Modal para Persona Involucrada */}
       <Dialog open={isPersonaModalOpen} onOpenChange={setIsPersonaModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentPersona?.id ? 'Editar' : 'Añadir'} Persona</DialogTitle>
          </DialogHeader>
          {currentPersona && (
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="persona-nombre">Nombre Completo</Label>
                    <Input id="persona-nombre" value={currentPersona.nombre || ''} onChange={(e) => handlePersonaChange('nombre', e.target.value)} placeholder="Ej: Ana García" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="persona-email">Email</Label>
                    <Input id="persona-email" type="email" value={currentPersona.email || ''} onChange={(e) => handlePersonaChange('email', e.target.value)} placeholder="Ej: ana.garcia@example.com" />
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox id="isAdmin" checked={currentPersona.isAdmin} onCheckedChange={(checked) => handlePersonaChange('isAdmin', !!checked)} />
                    <Label htmlFor="isAdmin">Es Administrador</Label>
                </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={handleSavePersona}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Modal para Motivo de Pérdida */}
       <Dialog open={isMotivoModalOpen} onOpenChange={setIsMotivoModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentMotivo?.id ? 'Editar' : 'Añadir'} Motivo de Pérdida</DialogTitle>
          </DialogHeader>
          {currentMotivo && (
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                <Label htmlFor="motivo-descripcion">Descripción</Label>
                <Input id="motivo-descripcion" value={currentMotivo.descripcion || ''} onChange={(e) => handleMotivoChange('descripcion', e.target.value)} placeholder="Ej: Precio demasiado alto" />
                </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={handleSaveMotivo}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    {/* Modal de Confirmación de Borrado */}
      <AlertDialog open={!!deletionTarget} onOpenChange={() => setDeletionTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente
              "{deletionTarget?.item.nombre || (deletionTarget?.item as MotivoPerdida)?.descripcion}" 
              de la base de datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
