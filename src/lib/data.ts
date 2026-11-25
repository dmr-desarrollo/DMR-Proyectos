


import type { Proyecto, Estado, UnidadDeNegocio, Vendedor, MotivoPerdida, Subcategoria, Tarea, PersonaInvolucrada, Actividad, AjustesNotificacion, Etapa } from './types';
import { collection, getDocs, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from './firebase';
import { sendTaskNotification } from '@/app/actions/task-notifications';

const STEPS_CONFIG: {name: string, icon: any }[] = [
  { name: "Diagnóstico", icon: "Microscope" },
  { name: "Diseño", icon: "Wrench" },
  { name: "Cotización", icon: "FileText" },
  { name: "Negociación", icon: "Users" },
  { name: "Preacuerdo", icon: "FileSignature" },
  { name: "Piloto", icon: "FlaskConical" },
  { name: "Validación", icon: "CircleCheck" },
  { name: "Ganado", icon: "Trophy" },
  { name: "Implementación", icon: "Truck" },
];

export const getEstados = async (): Promise<Estado[]> => {
  const openStates = STEPS_CONFIG.map(s => s.name);
  const closedStates = ["Cerrado Ganado", "Cerrado Perdido", "Cancelado"];
  
  const allStates = [...openStates, ...closedStates];

  return allStates as Estado[];
};

export const getUnidadesDeNegocio = async (): Promise<UnidadDeNegocio[]> => {
  const querySnapshot = await getDocs(collection(db, "unidadesDeNegocio"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UnidadDeNegocio));
};

export const getSubcategorias = async (): Promise<Subcategoria[]> => {
  const querySnapshot = await getDocs(collection(db, "subcategorias"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subcategoria));
};


export const getVendedores = async (): Promise<Vendedor[]> => {
    const querySnapshot = await getDocs(collection(db, "vendedores"));
    return querySnapshot.docs
        .filter(doc => doc.id !== 'ajustes_notificaciones')
        .map(doc => ({ id: doc.id, ...doc.data() } as Vendedor));
};

export const getPersonasInvolucradas = async (): Promise<PersonaInvolucrada[]> => {
    const querySnapshot = await getDocs(collection(db, "personasInvolucradas"));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PersonaInvolucrada));
}

export const getMotivosPerdida = async (): Promise<MotivoPerdida[]> => {
    const querySnapshot = await getDocs(collection(db, "motivosPerdida"));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MotivoPerdida));
};


// Simulate API calls
export const getProjects = async (): Promise<Proyecto[]> => {
  const querySnapshot = await getDocs(collection(db, "proyectos"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Proyecto));
};

export const getProjectById = async (id: string): Promise<Proyecto | undefined> => {
  const docRef = doc(db, "proyectos", id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Proyecto;
  } else {
    return undefined;
  }
};

export const createProject = async (project: Omit<Proyecto, 'id' | 'fechaIngreso' | 'actividades' | 'estado' | 'tareas' > & { primeraTarea: Omit<Tarea, 'id' | 'estado' > }): Promise<Proyecto> => {
    const { primeraTarea, ...projectData } = project;

    const cleanProjectData = {
        ...projectData,
        subcategoria: projectData.subcategoria || null
    }

    const firstStage: Etapa = {
        id: `etapa-${Date.now()}`,
        nombre: 'Fase Inicial',
        fechaInicio: new Date().toISOString().split('T')[0],
        fechaFin: primeraTarea.fechaVencimiento,
        estado: 'Pendiente',
        color: '#3b82f6'
    }

    const firstTask: Tarea = {
        ...primeraTarea,
        id: `task-${Date.now()}`,
        estado: 'Pendiente',
        etapaId: firstStage.id,
    }

    const creationActivity: Actividad = {
        id: `act-${Date.now()}`,
        timestamp: new Date().toISOString(),
        descripcion: 'Proyecto creado.',
        usuario: 'sistema',
    };

    const taskActivity: Actividad = {
        id: `act-${Date.now() + 1}`,
        timestamp: new Date().toISOString(),
        descripcion: `Nueva tarea creada: "${firstTask.descripcion}", responsable: ${firstTask.responsableNombre}.`,
        usuario: 'sistema',
    }

    const newProjectData: Omit<Proyecto, 'id'> = {
        ...cleanProjectData,
        fechaIngreso: new Date().toISOString().split('T')[0],
        estado: 'Diagnóstico' as Estado,
        actividades: [taskActivity, creationActivity],
        tareas: [firstTask],
        etapas: [firstStage]
    }
    const docRef = await addDoc(collection(db, "proyectos"), newProjectData);
    
    const createdProject = { ...newProjectData, id: docRef.id };

    if (firstTask.responsableId) {
        sendTaskNotification({
            project: createdProject,
            task: firstTask,
            eventType: 'nuevaAsignada'
        });
    }
    
    return createdProject;
}


// Helper function to recursively remove undefined fields
function removeUndefinedFields(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedFields(item));
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const newObj: { [key: string]: any } = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        if (value !== undefined) {
          newObj[key] = removeUndefinedFields(value);
        }
      }
    }
    return newObj;
  }

  return obj;
}


export const updateProject = async (projectId: string, projectData: Partial<Proyecto>, options?: { actividad?: Omit<Actividad, 'id' | 'timestamp' | 'usuario'>, taskToUpdate?: Tarea }): Promise<Proyecto | undefined> => {
    const projectRef = doc(db, "proyectos", projectId);
    
    const currentDoc = await getDoc(projectRef);
    if (!currentDoc.exists()) {
        throw new Error("El proyecto no existe.");
    }
    const currentProject = currentDoc.data() as Proyecto;

    let finalPayload: Partial<Proyecto> = { ...projectData };

    if (options?.actividad) {
        const newActivity: Actividad = {
            id: `act-${Date.now()}`,
            timestamp: new Date().toISOString(),
            ...options.actividad,
        };
        finalPayload.actividades = [newActivity, ...(currentProject.actividades || [])];
    }

    if (options?.taskToUpdate) {
        const taskIndex = currentProject.tareas.findIndex(t => t.id === options.taskToUpdate!.id);
        if (taskIndex !== -1) {
            const newTasks = [...currentProject.tareas];
            newTasks[taskIndex] = options.taskToUpdate;
            finalPayload.tareas = newTasks;
        }
    }
    
    const cleanData = removeUndefinedFields(finalPayload);
    
    if (Object.keys(cleanData).length > 0) {
        await updateDoc(projectRef, cleanData);
    }
    
    const updatedProjectDoc = await getDoc(projectRef);
    return { id: updatedProjectDoc.id, ...updatedProjectDoc.data() } as Proyecto;
}


// --- Functions to manage settings data ---

export const addUnidadDeNegocio = async (unidad: Omit<UnidadDeNegocio, 'id'>): Promise<string> => {
    const docRef = await addDoc(collection(db, "unidadesDeNegocio"), unidad);
    return docRef.id;
}

export const updateUnidadDeNegocio = async (unidadId: string, data: Partial<UnidadDeNegocio>): Promise<void> => {
    const docRef = doc(db, "unidadesDeNegocio", unidadId);
    await updateDoc(docRef, data);
}

export const deleteUnidadDeNegocio = async (unidadId: string): Promise<void> => {
    const docRef = doc(db, "unidadesDeNegocio", unidadId);
    await deleteDoc(docRef);
}

export const addSubcategoria = async (subcategoria: Omit<Subcategoria, 'id'>): Promise<string> => {
    const docRef = await addDoc(collection(db, "subcategorias"), subcategoria);
    return docRef.id;
}

export const updateSubcategoria = async (subcategoriaId: string, data: Partial<Subcategoria>): Promise<void> => {
    const docRef = doc(db, "subcategorias", subcategoriaId);
    await updateDoc(docRef, data);
}

export const deleteSubcategoria = async (subcategoriaId: string): Promise<void> => {
    const docRef = doc(db, "subcategorias", subcategoriaId);
    await deleteDoc(docRef);
}


export const addVendedor = async (vendedor: Omit<Vendedor, 'id'>): Promise<string> => {
    const docRef = await addDoc(collection(db, "vendedores"), vendedor);
    return docRef.id;
}

export const updateVendedor = async (vendedorId: string, data: Partial<Vendedor>): Promise<void> => {
    const docRef = doc(db, "vendedores", vendedorId);
    await updateDoc(docRef, data);
}

export const deleteVendedor = async (vendedorId: string): Promise<void> => {
    const docRef = doc(db, "vendedores", vendedorId);
    await deleteDoc(docRef);
}

export const addPersonaInvolucrada = async (persona: Omit<PersonaInvolucrada, 'id'>): Promise<string> => {
    const docRef = await addDoc(collection(db, "personasInvolucradas"), persona);
    return docRef.id;
}

export const updatePersonaInvolucrada = async (personaId: string, data: Partial<PersonaInvolucrada>): Promise<void> => {
    const docRef = doc(db, "personasInvolucradas", personaId);
    await updateDoc(docRef, data);
}

export const deletePersonaInvolucrada = async (personaId: string): Promise<void> => {
    const docRef = doc(db, "personasInvolucradas", personaId);
    await deleteDoc(docRef);
}


export const addMotivoPerdida = async (motivo: Omit<MotivoPerdida, 'id'>): Promise<string> => {
    const docRef = await addDoc(collection(db, "motivosPerdida"), motivo);
    return docRef.id;
}

export const updateMotivoPerdida = async (motivoId: string, data: Partial<MotivoPerdida>): Promise<void> => {
    const docRef = doc(db, "motivosPerdida", motivoId);
    await updateDoc(docRef, data);
}

export const deleteMotivoPerdida = async (motivoId: string): Promise<void> => {
    const docRef = doc(db, "motivosPerdida", motivoId);
    await deleteDoc(docRef);
}

// --- Functions to manage notification settings ---

const getDefaultNotificationSettings = (): AjustesNotificacion => ({
    id: 'ajustes_notificaciones',
    proyectos: {
        proximoVencer: {
            activado: false,
            aviso: { valor: 7, unidad: 'dias' },
            repetir: { activado: false, valor: 1, unidad: 'dias' },
            destinatarios: { vendedor: true, responsable: true, involucrados: false },
            texto: '¡Atención! El proyecto [Nombre del Proyecto] para el cliente [Cliente] está próximo a vencer el [Fecha de Vencimiento]. ¡Es un buen momento para actualizar su estado, cerrarlo o aplazar la fecha de cierre!',
        },
        vencido: {
            activado: false,
            aviso: { valor: 1, unidad: 'dias' },
            repetir: { activado: false, valor: 1, unidad: 'dias' },
            destinatarios: { vendedor: true, responsable: true, involucrados: false },
            texto: 'El proyecto [Nombre del Proyecto] para el cliente [Cliente] ha vencido el [Fecha de Vencimiento] y aún no se ha cerrado. Por favor, revisa su estado o modifica la fecha si es necesario.',
        },
        nuevoAvance: {
            activado: false,
            destinatarios: { vendedor: true, responsable: true, involucrados: true },
            texto: 'Se ha registrado un nuevo avance en el proyecto [Nombre del Proyecto] para el cliente [Cliente].',
        },
        cerrado: {
            activado: false,
            destinatarios: { vendedor: true, responsable: true, involucrados: true },
            texto: 'El proyecto [Nombre del Proyecto] para el cliente [Cliente] ha sido cerrado por [Nombre de la Persona que Cierra el Proyecto].',
        },
    },
    tareas: {
        proximaVencer: {
            activado: false,
            aviso: { valor: 24, unidad: 'horas' },
            repetir: { activado: false, valor: 4, unidad: 'horas' },
            destinatarios: { asignado: true, vendedor: false, responsable: false, involucrados: false },
            texto: 'Tu tarea [Nombre de la Tarea] en el proyecto [Nombre del Proyecto] para el cliente [Cliente] está a punto de vencer. ¡No la olvides!',
        },
        vencida: {
            activado: false,
            aviso: { valor: 1, unidad: 'horas' },
            repetir: { activado: false, valor: 12, unidad: 'horas' },
            destinatarios: { asignado: true, vendedor: true, responsable: true, involucrados: false },
            texto: '¡Atención! La tarea [Nombre de la Tarea] del proyecto [Nombre del Proyecto] para el cliente [Cliente] ha vencido.',
        },
        nuevaAsignada: {
            activado: false,
            destinatarios: { asignado: true, vendedor: false, responsable: false, involucrados: false },
            texto: 'Tienes una nueva tarea asignada en el proyecto [Nombre del Proyecto] para el cliente [Cliente]: [Nombre de la Tarea].',
        },
        completada: {
            activado: false,
            destinatarios: { asignado: false, vendedor: true, responsable: true, involucrados: false },
            texto: 'La tarea [Nombre de la Tarea] del proyecto [Nombre del Proyecto] para el cliente [Cliente] ha sido marcada como completada.',
        },
    },
});

export const getNotificationSettings = async (): Promise<AjustesNotificacion> => {
    const docRef = doc(db, "vendedores", "ajustes_notificaciones");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        const defaultSettings = getDefaultNotificationSettings();
        // Deep merge to ensure all new properties are present
        const proyectos = { ...defaultSettings.proyectos, ...data.proyectos };
        const tareas = { ...defaultSettings.tareas, ...data.tareas };
        return { id: 'ajustes_notificaciones', proyectos, tareas };
    } else {
        const defaultSettings = getDefaultNotificationSettings();
        await setDoc(docRef, defaultSettings);
        return defaultSettings;
    }
}

export const updateNotificationSettings = async (settings: Partial<AjustesNotificacion>): Promise<void> => {
    const docRef = doc(db, "vendedores", "ajustes_notificaciones");
    // Usamos set con merge:true para crear el documento si no existe o actualizarlo si existe.
    await setDoc(docRef, settings, { merge: true });
}
