
'use server';

import { sendEmail } from '@/lib/notifications';
import { getProjectByIdAdmin, getVendedoresAdmin, getPersonasInvolucradasAdmin, getNotificationSettingsAdmin } from '@/lib/data-admin';
import { getAdminDb } from '@/lib/firebase-admin';
import type { Proyecto, Tarea } from '@/lib/types';
import { format, parseISO, isPast } from 'date-fns';

interface ClaimTaskNotificationParams {
    projectId: string;
    taskId: string;
}

export async function claimTaskNotification({ projectId, taskId }: ClaimTaskNotificationParams) {
    try {
        const project = await getProjectByIdAdmin(projectId);
        if (!project) {
            throw new Error('Proyecto no encontrado.');
        }

        const task = project.tareas.find(t => t.id === taskId);
        if (!task) {
            throw new Error('Tarea no encontrada.');
        }

        const [allVendedores, allPersonas, settings] = await Promise.all([
            getVendedoresAdmin(),
            getPersonasInvolucradasAdmin(),
            getNotificationSettingsAdmin()
        ]);
        
        const allPeople = [...allVendedores, ...allPersonas];
        const responsable = allPeople.find(p => p.id === task.responsableId);

        if (!responsable || !responsable.email) {
            throw new Error('El responsable de la tarea no tiene un email configurado.');
        }

        const isTaskOverdue = isPast(parseISO(task.fechaVencimiento + 'T00:00:00'));
        
        const notificationConfig = isTaskOverdue 
            ? settings.tareas.vencida 
            : settings.tareas.proximaVencer;

        if (!notificationConfig.activado) {
             throw new Error(`La notificación para tareas ${isTaskOverdue ? 'vencidas' : 'próximas a vencer'} está desactivada.`);
        }
        
        const fechaVencimiento = format(parseISO(task.fechaVencimiento + 'T00:00:00'), 'dd/MM/yyyy');

        const emailHtml = notificationConfig.texto
            .replace(/\[Nombre del Proyecto\]/g, `<strong>${project.tema}</strong>`)
            .replace(/\[Cliente\]/g, `<strong style="color: red;">${project.cliente}</strong>`)
            .replace(/\[Fecha de Vencimiento\]/g, fechaVencimiento)
            .replace(/\[Nombre de la Tarea\]/g, `<em>${task.descripcion}</em>`);
        
        const subject = `Recordatorio de Tarea: ${task.descripcion}`;

        await sendEmail({
            to: responsable.email,
            subject,
            html: emailHtml,
        });

        return { success: true, message: `Recordatorio enviado a ${responsable.nombre}.` };

    } catch (error) {
        console.error(`Error al reclamar la tarea:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        return { success: false, message: errorMessage };
    }
}
