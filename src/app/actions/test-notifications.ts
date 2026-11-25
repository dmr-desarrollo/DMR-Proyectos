
'use server';

import { sendEmail } from '@/lib/notifications';
import { isPast, parseISO, format } from 'date-fns';
import type { Proyecto, Vendedor, PersonaInvolucrada, ConfiguracionNotificacion } from '@/lib/types';
import { getProjectsAdmin, getVendedoresAdmin, getPersonasInvolucradasAdmin, getNotificationSettingsAdmin } from '@/lib/data-admin';


async function getEmailsForNotification(
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

async function sendProjectNotification(
    project: Proyecto,
    config: ConfiguracionNotificacion,
    allVendedores: Vendedor[],
    allPersonas: PersonaInvolucrada[]
) {
    const recipients = await getEmailsForNotification(config, project, allVendedores, allPersonas);
    if (recipients.length === 0) {
        console.log(`No recipients found for project ${project.id}. Skipping notification.`);
        throw new Error('No se encontraron destinatarios para este proyecto de prueba.');
    }

    const emailHtml = config.texto
        .replace(/\[Nombre del Proyecto\]/g, `<strong>${project.tema}</strong>`)
        .replace(/\[Cliente\]/g, `<strong style="color: red;">${project.cliente}</strong>`)
        .replace(/\[Fecha de Vencimiento\]/g, format(parseISO(project.fechaEstimadaCierre), 'dd/MM/yyyy'));

    const subject = `Prueba de Alerta: ${project.tema}`;

    await sendEmail({
        to: recipients.join(','),
        subject,
        html: emailHtml,
    });
}

export async function handleTestOverdueNotification() {
  try {
    const settings = await getNotificationSettingsAdmin();
    const notificationConfig = settings.proyectos.vencido;

    if (!notificationConfig.activado) {
        return { success: false, message: 'La notificación de proyectos vencidos está desactivada. Actívala para probar.' };
    }
    
    const [allProjects, allVendedores, allPersonas] = await Promise.all([
        getProjectsAdmin(),
        getVendedoresAdmin(),
        getPersonasInvolucradasAdmin(),
    ]);
    
    const overdueProject = allProjects.find(p => 
        p.fechaEstimadaCierre &&
        (p.estado !== 'Cerrado Ganado' && p.estado !== 'Cerrado Perdido' && p.estado !== 'Cancelado') &&
        isPast(parseISO(p.fechaEstimadaCierre))
    );

    if (!overdueProject) {
        return { success: false, message: 'No se encontró ningún proyecto vencido para usar en la prueba. Crea un proyecto con fecha pasada para probar.' };
    }
    
    await sendProjectNotification(overdueProject, notificationConfig, allVendedores, allPersonas);

    return { 
        success: true, 
        message: `Notificación de prueba enviada para el proyecto "${overdueProject.tema}". Revisa las bandejas de entrada.` 
    };

  } catch (error) {
    console.error('Error durante la prueba de notificación:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return { success: false, message: `Error interno del servidor: ${errorMessage}` };
  }
}
