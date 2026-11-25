
'use client';

import { 
    AjustesNotificacion, 
    ConfiguracionNotificacion, 
    NotificacionesProyecto, 
    NotificacionesTarea, 
    UnidadTiempo 
} from "@/lib/types";
import { 
    Card, 
    CardContent, 
    CardHeader, 
    CardTitle, 
    CardDescription 
} from "./ui/card";
import { Button } from "./ui/button";
import { 
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "./ui/accordion";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { Textarea } from "./ui/textarea";
import { Bell, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { handleTestOverdueNotification } from "@/app/actions/test-notifications";

interface NotificationSettingsProps {
    settings: AjustesNotificacion;
    onSettingsChange: (newSettings: AjustesNotificacion) => void;
    onSave: () => void;
}

const NotificationTypeControl = ({
    title,
    config,
    onConfigChange,
    isTask,
    hasRepetition,
    hasTimeframe,
    onTest,
    isTestable,
}: {
    title: string;
    config: ConfiguracionNotificacion;
    onConfigChange: (newConfig: ConfiguracionNotificacion) => void;
    isTask: boolean;
    hasRepetition: boolean;
    hasTimeframe: boolean;
    onTest?: () => void;
    isTestable?: boolean;
}) => {

    const handleFieldChange = (field: keyof ConfiguracionNotificacion, value: any) => {
        onConfigChange({ ...config, [field]: value });
    }

    const handleNestedChange = (
        section: 'aviso' | 'repetir' | 'destinatarios', 
        field: string, 
        value: any
    ) => {
        onConfigChange({
            ...config,
            [section]: {
                // @ts-ignore
                ...config[section],
                [field]: value
            }
        });
    }

    const timeUnits: {value: UnidadTiempo, label: string}[] = [
        { value: 'dias', label: 'Días' },
        { value: 'horas', label: 'Horas' },
        { value: 'minutos', label: 'Minutos' }
    ]

    return (
        <Card className="bg-muted/30">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{title}</CardTitle>
                    <div className="flex items-center gap-4">
                        {isTestable && onTest && config.activado && (
                            <Button variant="outline" size="sm" onClick={onTest}>
                                <Send className="mr-2 h-4 w-4"/>
                                Probar
                            </Button>
                        )}
                        <Switch
                            checked={config.activado}
                            onCheckedChange={(checked) => handleFieldChange('activado', checked)}
                        />
                    </div>
                </div>
            </CardHeader>
            {config.activado && (
                <CardContent className="space-y-4">
                    {hasTimeframe && config.aviso && (
                        <div className="space-y-2">
                            <Label>Enviar el aviso:</Label>
                            <div className="flex items-center gap-2">
                                <Input 
                                    type="number" 
                                    className="w-20"
                                    value={config.aviso.valor}
                                    onChange={(e) => handleNestedChange('aviso', 'valor', Number(e.target.value))}
                                />
                                <Select 
                                    value={config.aviso.unidad} 
                                    onValueChange={(val) => handleNestedChange('aviso', 'unidad', val)}
                                >
                                    <SelectTrigger className="w-[120px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {timeUnits.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <span>{title.toLowerCase().includes('antes') ? 'antes' : 'después'} del vencimiento.</span>
                            </div>
                        </div>
                    )}
                     {hasRepetition && config.repetir && (
                        <div className="space-y-3 p-3 border rounded-md">
                             <div className="flex items-center space-x-2">
                                <Switch 
                                    id={`repeat-${title}`} 
                                    checked={config.repetir.activado}
                                    onCheckedChange={(checked) => handleNestedChange('repetir', 'activado', checked)}
                                />
                                <Label htmlFor={`repeat-${title}`}>Repetir este aviso</Label>
                            </div>
                            {config.repetir.activado && (
                                <div className="flex items-center gap-2">
                                    <span>Repetir cada:</span>
                                    <Input 
                                        type="number" 
                                        className="w-20"
                                        value={config.repetir.valor}
                                        onChange={(e) => handleNestedChange('repetir', 'valor', Number(e.target.value))}
                                    />
                                    <Select 
                                        value={config.repetir.unidad}
                                        onValueChange={(val) => handleNestedChange('repetir', 'unidad', val)}
                                    >
                                        <SelectTrigger className="w-[120px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {timeUnits.filter(u => u.value !== 'minutos').map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    )}
                     <div className="space-y-2">
                        <Label>¿Quién debe recibir el aviso?</Label>
                        <div className="space-y-2">
                            {isTask && (
                                <div className="flex items-center space-x-2">
                                    <Checkbox 
                                        id={`dest-asignado-${title}`} 
                                        checked={config.destinatarios.asignado}
                                        onCheckedChange={(checked) => handleNestedChange('destinatarios', 'asignado', !!checked)}
                                    />
                                    <Label htmlFor={`dest-asignado-${title}`}>Persona asignada a la tarea</Label>
                                </div>
                            )}
                            <div className="flex items-center space-x-2">
                                <Checkbox 
                                    id={`dest-vendedor-${title}`}
                                    checked={config.destinatarios.vendedor}
                                    onCheckedChange={(checked) => handleNestedChange('destinatarios', 'vendedor', !!checked)}
                                />
                                <Label htmlFor={`dest-vendedor-${title}`}>Vendedor del proyecto</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                 <Checkbox 
                                    id={`dest-responsable-${title}`}
                                    checked={config.destinatarios.responsable}
                                    onCheckedChange={(checked) => handleNestedChange('destinatarios', 'responsable', !!checked)}
                                />
                                <Label htmlFor={`dest-responsable-${title}`}>Responsable del seguimiento del proyecto</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox 
                                    id={`dest-involucrados-${title}`}
                                    checked={config.destinatarios.involucrados}
                                    onCheckedChange={(checked) => handleNestedChange('destinatarios', 'involucrados', !!checked)}
                                />
                                <Label htmlFor={`dest-involucrados-${title}`}>Todos los involucrados</Label>
                            </div>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label>Texto de la notificación (editable)</Label>
                        <Textarea 
                            value={config.texto}
                            onChange={(e) => handleFieldChange('texto', e.target.value)}
                            rows={3}
                        />
                         <p className="text-xs text-muted-foreground">
                            Variables disponibles: [Nombre del Proyecto], [Cliente], [Fecha de Vencimiento], [Nombre de la Tarea], [Nombre de la Persona que Cierra el Proyecto].
                        </p>
                    </div>
                </CardContent>
            )}
        </Card>
    )
}


export default function NotificationSettings({ settings, onSettingsChange, onSave }: NotificationSettingsProps) {
    
    const handleProjectConfigChange = (key: keyof NotificacionesProyecto, newConfig: ConfiguracionNotificacion) => {
        onSettingsChange({
            ...settings,
            proyectos: {
                ...settings.proyectos,
                [key]: newConfig
            }
        });
    };

    const handleTaskConfigChange = (key: keyof NotificacionesTarea, newConfig: ConfiguracionNotificacion) => {
        onSettingsChange({
            ...settings,
            tareas: {
                ...settings.tareas,
                [key]: newConfig
            }
        });
    };
    
    const onTest = async () => {
        toast({ title: 'Enviando prueba...', description: 'Se está intentando enviar la notificación de proyecto vencido.' });
        try {
            const result = await handleTestOverdueNotification();

            if (result.success) {
                toast({ title: 'Prueba enviada', description: result.message });
            } else {
                toast({ title: 'Error en la prueba', description: result.message, variant: 'destructive' });
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'No se pudo conectar con el servidor para la prueba.';
            toast({ title: 'Error de Red', description: errorMessage, variant: 'destructive' });
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bell />
                    Avisos a tu medida
                </CardTitle>
                <CardDescription>
                    Decide exactamente qué tipo de notificaciones quieres recibir, a quiénes se les deben enviar y con qué frecuencia.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="multiple" className="w-full" defaultValue={["project-notifications"]}>
                    <AccordionItem value="project-notifications">
                        <AccordionTrigger className="text-xl font-semibold">1. Notificaciones de Proyectos</AccordionTrigger>
                        <AccordionContent className="pt-4 space-y-6">
                            <NotificationTypeControl 
                                title="Proyecto próximo a vencer"
                                config={settings.proyectos.proximoVencer}
                                onConfigChange={(newConfig) => handleProjectConfigChange('proximoVencer', newConfig)}
                                isTask={false}
                                hasRepetition={true}
                                hasTimeframe={true}
                            />
                            <NotificationTypeControl 
                                title="Proyecto vencido"
                                config={settings.proyectos.vencido}
                                onConfigChange={(newConfig) => handleProjectConfigChange('vencido', newConfig)}
                                isTask={false}
                                hasRepetition={true}
                                hasTimeframe={true}
                                isTestable={true}
                                onTest={onTest}
                            />
                             <NotificationTypeControl 
                                title="Nuevo avance del proyecto"
                                config={settings.proyectos.nuevoAvance}
                                onConfigChange={(newConfig) => handleProjectConfigChange('nuevoAvance', newConfig)}
                                isTask={false}
                                hasRepetition={false}
                                hasTimeframe={false}
                            />
                             <NotificationTypeControl 
                                title="Proyecto cerrado"
                                config={settings.proyectos.cerrado}
                                onConfigChange={(newConfig) => handleProjectConfigChange('cerrado', newConfig)}
                                isTask={false}
                                hasRepetition={false}
                                hasTimeframe={false}
                            />
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="task-notifications">
                        <AccordionTrigger className="text-xl font-semibold">2. Notificaciones de Tareas</AccordionTrigger>
                        <AccordionContent className="pt-4 space-y-6">
                            <NotificationTypeControl 
                                title="Tarea próxima a vencer"
                                config={settings.tareas.proximaVencer}
                                onConfigChange={(newConfig) => handleTaskConfigChange('proximaVencer', newConfig)}
                                isTask={true}
                                hasRepetition={true}
                                hasTimeframe={true}
                            />
                             <NotificationTypeControl 
                                title="Tarea vencida"
                                config={settings.tareas.vencida}
                                onConfigChange={(newConfig) => handleTaskConfigChange('vencida', newConfig)}
                                isTask={true}
                                hasRepetition={true}
                                hasTimeframe={true}
                            />
                            <NotificationTypeControl 
                                title="Nueva tarea asignada"
                                config={settings.tareas.nuevaAsignada}
                                onConfigChange={(newConfig) => handleTaskConfigChange('nuevaAsignada', newConfig)}
                                isTask={true}
                                hasRepetition={false}
                                hasTimeframe={false}
                            />
                            <NotificationTypeControl 
                                title="Tarea completada"
                                config={settings.tareas.completada}
                                onConfigChange={(newConfig) => handleTaskConfigChange('completada', newConfig)}
                                isTask={true}
                                hasRepetition={false}
                                hasTimeframe={false}
                            />
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
                <div className="flex justify-end mt-8">
                    <Button onClick={onSave}>Guardar Cambios en Notificaciones</Button>
                </div>
            </CardContent>
        </Card>
    );
}
