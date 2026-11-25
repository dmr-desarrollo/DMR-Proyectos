
'use server';

import { sendEmail } from '@/lib/notifications';
import type { Proyecto, Vendedor, PersonaInvolucrada, ConfiguracionNotificacion } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { getVendedoresAdmin, getPersonasInvolucradasAdmin, getNotificationSettingsAdmin } from '@/lib/data-admin';


type NotificationEventType = 'nuevoAvance' | 'cerrado';

interface SendProjectStateNotificationParams {
    project: Proyecto;
    eventType: NotificationEventType;
    userName: string;
}

function formatUser(email: string) {
  if (!email) return 'Sistema';
  return email.split('@')[0];
}

async function getEmailsForProjectNotification(
    config: ConfiguracionNotificacion,
    project: Proyecto,
    allVendedores: Vendedor[],
    allPersonas: PersonaInvolucrada[]
): Promise<string[]> {
    const emails = new Set<string>();
    const { destinatarios } = config;

    const allPeople = [...allVendedores, ...allPersonas];

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

export async function sendProjectStateNotification({ project, eventType, userName }: SendProjectStateNotificationParams) {
    try {
        const settings = await getNotificationSettingsAdmin();
        const notificationConfig = settings.proyectos[eventType];

        if (!notificationConfig.activado) {
            console.log(`La notificación para el evento de proyecto '${eventType}' está desactivada.`);
            return;
        }

        const [allVendedores, allPersonas] = await Promise.all([
            getVendedoresAdmin(),
            getPersonasInvolucradasAdmin()
        ]);

        const recipients = await getEmailsForProjectNotification(notificationConfig, project, allVendedores, allPersonas);
        
        if (recipients.length === 0) {
            console.log(`No se encontraron destinatarios para la notificación de proyecto '${eventType}' en el proyecto ${project.id}.`);
            return;
        }
        
        const fechaVencimiento = project.fechaEstimadaCierre ? format(parseISO(project.fechaEstimadaCierre + 'T00:00:00'), 'dd/MM/yyyy') : 'N/A';
        const formattedUserName = formatUser(userName);

        const emailHtml = notificationConfig.texto
            .replace(/\[Nombre del Proyecto\]/g, `<strong>${project.tema}</strong>`)
            .replace(/\[Cliente\]/g, `<strong style="color: red;">${project.cliente}</strong>`)
            .replace(/\[Fecha de Vencimiento\]/g, fechaVencimiento)
            .replace(/\[Nombre de la Persona que Cierra el Proyecto\]/g, formattedUserName);

        const subject = `Actualización de Proyecto: ${project.tema}`;

        await sendEmail({
            to: recipients.join(','),
            subject,
            html: emailHtml,
        });

        console.log(`Notificación de proyecto '${eventType}' enviada para el proyecto ${project.id} a: ${recipients.join(', ')}`);

    } catch (error) {
        console.error(`Error al enviar la notificación de proyecto '${eventType}':`, error);
    }
}
