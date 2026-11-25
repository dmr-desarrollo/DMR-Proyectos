
'use server';

import { NextResponse } from 'next/server';
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

    // Combine all people into one list for easier searching
    const allPeople = [...allVendedores, ...allPersonas];

    // Find the primary vendor for the project
    if (destinatarios.vendedor) {
        const vendedor = allPeople.find(v => v.id === project.vendedorId);
        if (vendedor?.email) {
            emails.add(vendedor.email);
        } else {
            console.log(`Proyecto ${project.id}: Vendedor principal con ID "${project.vendedorId}" no encontrado o sin email.`);
        }
    }

    // Find the person responsible for follow-up
    if (destinatarios.responsable && project.responsableSeguimientoId) {
        const responsable = allPeople.find(p => p.id === project.responsableSeguimientoId);
        if (responsable?.email) {
            emails.add(responsable.email);
        } else {
            console.log(`Proyecto ${project.id}: Responsable de seguimiento con ID "${project.responsableSeguimientoId}" no encontrado o sin email.`);
        }
    }

    // Find all other involved people
    if (destinatarios.involucrados && project.involucradosIds) {
        project.involucradosIds.forEach(id => {
            const persona = allPeople.find(p => p.id === id);
            if (persona?.email) {
                emails.add(persona.email);
            } else {
                 console.log(`Proyecto ${project.id}: Persona involucrada con ID "${id}" no encontrada o sin email.`);
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
        console.log(`No se encontraron destinatarios válidos para el proyecto ${project.id} ("${project.tema}"). No se enviará ninguna notificación.`);
        return;
    }

    const emailHtml = config.texto
        .replace(/\[Nombre del Proyecto\]/g, `<strong>${project.tema}</strong>`)
        .replace(/\[Cliente\]/g, `<strong style="color: red;">${project.cliente}</strong>`)
        .replace(/\[Fecha de Vencimiento\]/g, format(parseISO(project.fechaEstimadaCierre), 'dd/MM/yyyy'));

    const subject = `Alerta de Proyecto: ${project.tema}`;

    console.log(`Enviando notificación para el proyecto ${project.id} a: ${recipients.join(', ')}`);
    await sendEmail({
        to: recipients.join(','),
        subject,
        html: emailHtml,
    });
}


async function handleRequest() {
  try {
    const settings = await getNotificationSettingsAdmin();
    const notificationConfig = settings.proyectos.vencido;

    if (!notificationConfig.activado) {
        console.log('CRON JOB: La notificación de proyectos vencidos está desactivada. No se realizó ninguna acción.');
        return NextResponse.json({ success: true, message: 'La notificación de proyectos vencidos está desactivada.' });
    }
    
    console.log('CRON JOB: Obteniendo todos los datos de administrador...');
    const [allProjects, allVendedores, allPersonas] = await Promise.all([
        getProjectsAdmin(),
        getVendedoresAdmin(),
        getPersonasInvolucradasAdmin()
    ]);
    console.log(`CRON JOB: Se encontraron ${allProjects.length} proyectos, ${allVendedores.length} vendedores, y ${allPersonas.length} personas.`);
    
    const overdueProjects = allProjects.filter(p => 
        p.fechaEstimadaCierre &&
        (p.estado !== 'Cerrado Ganado' && p.estado !== 'Cerrado Perdido' && p.estado !== 'Cancelado') &&
        isPast(parseISO(p.fechaEstimadaCierre))
    );

    if (overdueProjects.length === 0) {
        console.log('CRON JOB: No se encontraron proyectos vencidos. No se enviará ninguna notificación.');
        return NextResponse.json({ success: true, message: 'No se encontraron proyectos vencidos.' });
    }
    
    console.log(`CRON JOB: Se encontraron ${overdueProjects.length} proyectos vencidos. Procesando notificaciones...`);
    let sentCount = 0;
    for (const project of overdueProjects) {
        try {
            await sendProjectNotification(project, notificationConfig, allVendedores, allPersonas);
            sentCount++;
        } catch (error) {
            console.error(`CRON JOB: Error al enviar la notificación para el proyecto ${project.id}:`, error);
        }
    }

    const message = `Lógica de cron ejecutada. Se encontraron ${overdueProjects.length} proyectos vencidos. Se procesaron ${sentCount} notificaciones.`;
    console.log(`CRON JOB SUCCESS: ${message}`);
    return NextResponse.json({ 
        success: true, 
        message
    });

  } catch (error) {
    console.error('CRON JOB FAILED: Error durante la ejecución del cron job de resumen diario:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ success: false, message: `Error interno del servidor: ${errorMessage}` }, { status: 500 });
  }
}

// Handler para peticiones GET (invocadas por servicios de cron)
export async function GET(request: Request) {
  // Aquí podrías añadir una capa de seguridad, por ejemplo, verificando un 'secret' en la URL
  // const { searchParams } = new URL(request.url)
  // if (searchParams.get('cron_secret') !== process.env.CRON_SECRET) {
  //   return NextResponse.json({ success: false, message: 'Acceso no autorizado' }, { status: 401 });
  // }
  return handleRequest();
}

// Handler para peticiones POST (si se necesitara invocar manually)
export async function POST(request: Request) {
  return handleRequest();
}
