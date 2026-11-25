
'use server';

import type { Proyecto, Vendedor, PersonaInvolucrada, AjustesNotificacion } from './types';
import { getAdminDb } from './firebase-admin';


// Admin version of getProjects
export const getProjectsAdmin = async (): Promise<Proyecto[]> => {
  const adminDb = await getAdminDb();
  const querySnapshot = await adminDb.collection("proyectos").get();
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Proyecto));
};

// Admin version of getProjectById
export const getProjectByIdAdmin = async (id: string): Promise<Proyecto | undefined> => {
  const adminDb = await getAdminDb();
  const docRef = adminDb.collection("proyectos").doc(id);
  const docSnap = await docRef.get();
  if (docSnap.exists) {
    return { id: docSnap.id, ...docSnap.data() } as Proyecto;
  }
  return undefined;
};


// Admin version of getVendedores
export const getVendedoresAdmin = async (): Promise<Vendedor[]> => {
    const adminDb = await getAdminDb();
    const querySnapshot = await adminDb.collection("vendedores").get();
    return querySnapshot.docs
        .filter(doc => doc.id !== 'ajustes_notificaciones')
        .map(doc => ({ id: doc.id, ...doc.data() } as Vendedor));
};

// Admin version of getPersonasInvolucradas
export const getPersonasInvolucradasAdmin = async (): Promise<PersonaInvolucrada[]> => {
    const adminDb = await getAdminDb();
    const querySnapshot = await adminDb.collection("personasInvolucradas").get();
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PersonaInvolucrada));
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

export const getNotificationSettingsAdmin = async (): Promise<AjustesNotificacion> => {
    const adminDb = await getAdminDb();
    const docRef = adminDb.collection("vendedores").doc("ajustes_notificaciones");
    const docSnap = await docRef.get();

    if (docSnap.exists) {
        const data = docSnap.data() as Partial<AjustesNotificacion>;
        const defaultSettings = getDefaultNotificationSettings();
        const proyectos = { ...defaultSettings.proyectos, ...data.proyectos };
        const tareas = { ...defaultSettings.tareas, ...data.tareas };
        return { id: 'ajustes_notificaciones', proyectos, tareas };
    } else {
        const defaultSettings = getDefaultNotificationSettings();
        await docRef.set(defaultSettings);
        return defaultSettings;
    }
}
