import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Proyecto, Vendedor, PersonaInvolucrada, Tarea, Etapa } from './types';
import type { User as AuthUser } from 'firebase/auth';
import { isPast, differenceInDays, parseISO } from "date-fns";


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateProjectAge(fechaIngreso: string): number {
    if (!fechaIngreso) return 0;
    const projectDate = parseISO(fechaIngreso);
    const today = new Date();
    return differenceInDays(today, projectDate);
}

export function findPersonByEmail(user: AuthUser | null, allPeople: (Vendedor | PersonaInvolucrada)[]): (Vendedor | PersonaInvolucrada) | null {
    if (!user || !user.email) {
        return null;
    }
    return allPeople.find(p => p.email === user.email) || null;
}

export function isAdmin(person: Vendedor | PersonaInvolucrada | null): boolean {
    if (!person) return false;
    // Check if isAdmin property exists and is true.
    return 'isAdmin' in person && person.isAdmin === true;
}


export function filterProjectsByUser(
    projects: Proyecto[], 
    user: AuthUser | null, 
    allPeople: (Vendedor | PersonaInvolucrada)[]
): Proyecto[] {
    if (!user || !user.email) {
        return [];
    }

    const loggedInPerson = findPersonByEmail(user, allPeople);
    
    if (!loggedInPerson) {
        console.warn(`User with email ${user.email} not found in vendors or involved people.`);
        return [];
    }
    
    if (isAdmin(loggedInPerson)) {
        return projects;
    }

    return projects.filter(p => {
        // Find the main salesperson for the project by name
        const vendedorPrincipal = allPeople.find(person => person.nombre === p.vendedor);

        const isVendedorPrincipal = vendedorPrincipal?.email === user.email;
        const isInvolucrado = p.involucradosIds?.includes(loggedInPerson.id);
        const isResponsableSeguimiento = p.responsableSeguimientoId === loggedInPerson.id;
        
        return isVendedorPrincipal || isInvolucrado || isResponsableSeguimiento;
    });
}


export const getProjectTaskUrgency = (project: Proyecto): 'overdue' | 'upcoming' | null => {
    const pendingTasks = project.tareas?.filter(t => t.estado === 'Pendiente') || [];
    if (pendingTasks.length === 0) return null;

    const today = new Date();
    today.setHours(0,0,0,0);

    let hasUpcoming = false;
    for (const task of pendingTasks) {
        const dueDate = new Date(task.fechaVencimiento + 'T00:00:00');
        if (isPast(dueDate) && differenceInDays(dueDate, today) < 0) {
            return 'overdue';
        }
        if (differenceInDays(dueDate, today) <= 3) {
            hasUpcoming = true;
        }
    }

    return hasUpcoming ? 'upcoming' : null;
}

export const updateTaskStatusInStages = (etapas: Etapa[], tareas: Tarea[]): Etapa[] => {
    return etapas.map(etapa => {
        const tasksInStage = tareas.filter(t => t.etapaId === etapa.id);
        if (tasksInStage.length === 0) {
            return { ...etapa, estado: 'Pendiente' };
        }

        const allTasksCompleted = tasksInStage.every(t => t.estado === 'Cumplida');
        if (allTasksCompleted) {
            return { ...etapa, estado: 'Completada' };
        }

        const anyTaskInProgress = tasksInStage.some(t => new Date(t.fechaVencimiento) > new Date(etapa.fechaInicio) || t.estado !== 'Pendiente');
        if (anyTaskInProgress) {
            return { ...etapa, estado: 'En Progreso' };
        }
        
        return { ...etapa, estado: 'Pendiente' };
    });
};
