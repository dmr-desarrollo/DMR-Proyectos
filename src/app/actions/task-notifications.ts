
'use server';

import { sendEmail } from '@/lib/notifications';
import type { Proyecto, Tarea, Vendedor, PersonaInvolucrada, ConfiguracionNotificacion } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { getVendedoresAdmin, getPersonasInvolucradasAdmin, getNotificationSettingsAdmin } from '@/lib/data-admin';


type NotificationEventType = 'nuevaAsignada' | 'completada';

interface SendTaskNotificationParams {
    project: Proyecto;
    task: Tarea;
    eventType: NotificationEventType;
}

async function getEmailsForTaskNotification(
    config: ConfiguracionNotificacion,
    project: Proyecto,
    task: Tarea,
    allVendedores: Vendedor[],
    allPersonas: PersonaInvolucrada[]
): Promise<string[]> {
    const emails = new Set<string>();
    const { destinatarios } = config;

    const allPeople = [...allVendedores, ...allPersonas];

    if (destinatarios.asignado) {
        const responsable = allPeople.find(p => p.id === task.responsableId);
        if (responsable?.email) {
            emails.add(responsable.email);
        }
    }

    if (destinatarios.vendedor) {
        const vendedor = allPeople.find(v => v.id === project.vendedorId);
        if (vendedor?.email) {
            emails.add(vendedor.email);
        }
    }

    if (destinatarios.responsable && project.responsableSeguimientoId) {
        const responsable = allPeople.find(p => p.id === project.responsableSeguimientoId);
        if (responsable?.email) {
            emails.add(responsable.email);
        }
    }

    if (destinatarios.involucrados && project.involucradosIds) {
        project.involucradosIds.forEach(id => {
            const persona = allPeople.find(p => p.id === id);
            if (persona?.email) {
                emails.add(persona.email);
            }
        });
    }

    return Array.from(emails);
}

export async function sendTaskNotification({ project, task, eventType }: SendTaskNotificationParams) {
    try {
        const settings = await getNotificationSettingsAdmin();
        const notificationConfig = settings.tareas[eventType];

        if (!notificationConfig.activado) {
            console.log(`La notificación para el evento de tarea '${eventType}' está desactivada.`);
            return;
        }

        const [allVendedores, allPersonas] = await Promise.all([
            getVendedoresAdmin(),
            getPersonasInvolucradasAdmin()
        ]);

        const recipients = await getEmailsForTaskNotification(notificationConfig, project, task, allVendedores, allPersonas);
        
        if (recipients.length === 0) {
            console.log(`No se encontraron destinatarios para la notificación de tarea '${eventType}' en el proyecto ${project.id}.`);
            return;
        }
        
        const fechaVencimiento = task.fechaVencimiento ? format(parseISO(task.fechaVencimiento + 'T00:00:00'), 'dd/MM/yyyy') : 'N/A';

        const emailHtml = notificationConfig.texto
            .replace(/\[Nombre del Proyecto\]/g, `<strong>${project.tema}</strong>`)
            .replace(/\[Cliente\]/g, `<strong style="color: red;">${project.cliente}</strong>`)
            .replace(/\[Fecha de Vencimiento\]/g, fechaVencimiento)
            .replace(/\[Nombre de la Tarea\]/g, `<em>${task.descripcion}</em>`)
            .replace(/\[Nombre de la Persona que Cierra el Proyecto\]/g, task.usuarioCierre || 'N/A');

        const subject = `Notificación de Tarea: ${task.descripcion}`;

        await sendEmail({
            to: recipients.join(','),
            subject,
            html: emailHtml,
        });

        console.log(`Notificación de tarea '${eventType}' enviada para el proyecto ${project.id} a: ${recipients.join(', ')}`);

    } catch (error) {
        console.error(`Error al enviar la notificación de tarea '${eventType}':`, error);
        // No relanzamos el error para no romper el flujo del cliente
    }
}
