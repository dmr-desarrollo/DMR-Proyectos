





export type Estado = 
  | "Diagnóstico" 
  | "Diseño"
  | "Cotización" 
  | "Negociación" 
  | "Preacuerdo"
  | "Piloto"
  | "Validación"
  | "Ganado"
  | "Implementación"
  | "Cerrado Ganado" 
  | "Cerrado Perdido"
  | "Cancelado";

export type CambiosAvance = {
  pipelineUSD?: { anterior: number; nuevo: number };
  fechaEstimadaCierre?: { anterior: string; nuevo: string };
  probabilidadCierre?: { anterior: number; nuevo: number };
}

export type Actividad = {
  id: string;
  descripcion: string;
  timestamp: string;
  usuario?: string;
  cambios?: CambiosAvance;
  esAvanceManual?: boolean;
};

export type TareaEstado = "Pendiente" | "Cumplida" | "Cancelada";

export type Etapa = {
  id: string;
  nombre: string;
  fechaInicio: string; // YYYY-MM-DD
  fechaFin: string; // YYYY-MM-DD
  estado: 'Pendiente' | 'En Progreso' | 'Completada';
  color: string;
}

export type Tarea = {
    id: string;
    descripcion: string;
    responsableId: string;
    responsableNombre: string;
    fechaVencimiento: string; // YYYY-MM-DD
    estado: TareaEstado;
    etapaId?: string;
    comentarioCierre?: string;
    fechaCierre?: string; // ISO String
    usuarioCierre?: string;
};


export type UnidadDeNegocio = {
  id: string;
  nombre: "Rollos" | "Etiquetas" | "Tecnologia";
};

export type Subcategoria = {
    id: string;
    nombre: string;
    unidadDeNegocioId: string;
}

export type Vendedor = {
  id: string;
  nombre: string;
  email: string;
};

export type PersonaInvolucrada = {
    id: string;
    nombre: string;
    email: string;
    isAdmin?: boolean;
}

export type MotivoPerdida = {
    id: string;
    descripcion: string;
}

export type Proyecto = {
  id: string;
  cliente: string;
  tema: string;
  unidadDeNegocio: "Rollos" | "Etiquetas" | "Tecnologia";
  subcategoria: string | null;
  fechaIngreso: string;
  fechaEstimadaCierre: string;
  pipelineUSD: number;
  estado: Estado;
  vendedorId: string;
  vendedorNombre: string;
  probabilidadCierre: number;
  descripcion: string;
  actividades: Actividad[];
  tareas: Tarea[];
  etapas?: Etapa[];
  motivoPerdida?: string;
  motivoCancelacion?: string;
  involucradosIds?: string[];
  responsableSeguimientoId?: string;
};

export type UnidadTiempo = 'dias' | 'horas' | 'minutos';

export type DestinatariosNotificacion = {
    vendedor: boolean;
    responsable: boolean;
    involucrados: boolean;
    asignado?: boolean; // Para tareas
};

export type ConfiguracionNotificacion = {
    activado: boolean;
    aviso?: {
        valor: number;
        unidad: UnidadTiempo;
    };
    repetir?: {
        activado: boolean;
        valor: number;
        unidad: UnidadTiempo;
    };
    destinatarios: DestinatariosNotificacion;
    texto: string;
};

export type NotificacionesProyecto = {
    proximoVencer: ConfiguracionNotificacion;
    vencido: ConfiguracionNotificacion;
    nuevoAvance: ConfiguracionNotificacion;
    cerrado: ConfiguracionNotificacion;
};

export type NotificacionesTarea = {
    proximaVencer: ConfiguracionNotificacion;
    vencida: ConfiguracionNotificacion;
    nuevaAsignada: ConfiguracionNotificacion;
    completada: ConfiguracionNotificacion;
};

export type AjustesNotificacion = {
    id: 'ajustes_notificaciones';
    proyectos: NotificacionesProyecto;
    tareas: NotificacionesTarea;
};

    