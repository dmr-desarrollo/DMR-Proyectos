
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Users } from "lucide-react";
import { Calendar } from "./ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Card, CardContent } from "./ui/card";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { createProject } from "@/lib/data";
import React, { useMemo } from "react";
import type { UnidadDeNegocio, Vendedor, Subcategoria, PersonaInvolucrada } from "@/lib/types";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";


const formSchema = z.object({
  cliente: z.string().min(2, { message: "El nombre del cliente es requerido." }),
  tema: z.string().min(5, { message: "El tema del proyecto es requerido." }),
  descripcion: z.string().min(10, { message: "La descripción es requerida." }),
  unidadDeNegocio: z.string({ required_error: "La unidad de negocio es requerida."}),
  subcategoria: z.string().nullable().optional(),
  vendedorId: z.string({ required_error: "El vendedor es requerido." }),
  pipelineUSD: z.coerce.number().min(0, { message: "El pipeline debe ser un número positivo." }),
  probabilidadCierre: z.coerce.number().min(0).max(1),
  fechaEstimadaCierre: z.date({ required_error: "La fecha de cierre es requerida." }),
  involucradosIds: z.array(z.string()).optional(),
  responsableSeguimientoId: z.string().optional(),
  primeraTarea: z.object({
    descripcion: z.string().min(1, { message: "La descripción de la tarea es requerida." }),
    responsableId: z.string({ required_error: "El responsable es requerido." }),
    fechaVencimiento: z.date({ required_error: "La fecha de vencimiento es requerida." }),
  })
});

interface ProjectFormProps {
  unidadesDeNegocio: UnidadDeNegocio[];
  subcategorias: Subcategoria[];
  vendedores: Vendedor[];
  personasInvolucradas: PersonaInvolucrada[];
}

export function ProjectForm({ unidadesDeNegocio, subcategorias, vendedores, personasInvolucradas }: ProjectFormProps) {
  const router = useRouter();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cliente: "",
      tema: "",
      descripcion: "",
      vendedorId: "",
      pipelineUSD: 0,
      probabilidadCierre: 0.2,
      subcategoria: null,
      involucradosIds: [],
      responsableSeguimientoId: "",
      primeraTarea: {
        descripcion: "",
        responsableId: "",
      }
    },
  });

  const unidadDeNegocioId = form.watch("unidadDeNegocio");
  const vendedorSeleccionadoId = form.watch("vendedorId");
  const involucradosSeleccionados = form.watch("involucradosIds") || [];

  const allPeople = useMemo(() => [...vendedores, ...personasInvolucradas], [vendedores, personasInvolucradas]);
  
  const subcategoryOptions = useMemo(() => {
    if (!unidadDeNegocioId) return [];
    return subcategorias.filter(s => s.unidadDeNegocioId === unidadDeNegocioId);
  }, [unidadDeNegocioId, subcategorias]);

  const seguimientoAssigneeOptions = useMemo(() => {
      const assigneeSet = new Set<Vendedor | PersonaInvolucrada>();

      const mainVendedor = vendedores.find(v => v.id === vendedorSeleccionadoId);
      if (mainVendedor) {
        assigneeSet.add(mainVendedor);
      }

      involucradosSeleccionados.forEach(id => {
        const person = allPeople.find(p => p.id === id);
        if (person) {
          assigneeSet.add(person);
        }
      });
      return Array.from(assigneeSet);
  }, [vendedorSeleccionadoId, involucradosSeleccionados, vendedores, allPeople]);

  const taskAssigneeOptions = useMemo(() => {
    const assignedIds = new Set(involucradosSeleccionados);
    if (vendedorSeleccionadoId) {
        assignedIds.add(vendedorSeleccionadoId);
    }
    
    return allPeople.filter(p => assignedIds.has(p.id));
  }, [vendedorSeleccionadoId, involucradosSeleccionados, allPeople]);
  
 async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
        const unidadSeleccionada = unidadesDeNegocio.find(u => u.id === values.unidadDeNegocio);
        if (!unidadSeleccionada) {
            toast({ title: "Error", description: "Unidad de negocio no válida.", variant: "destructive" });
            return;
        }

        const vendedorSeleccionado = vendedores.find(v => v.id === values.vendedorId);
        if (!vendedorSeleccionado) {
          toast({ title: "Error", description: "Vendedor no válido.", variant: "destructive" });
          return;
        }
        
        const responsableTarea = allPeople.find(p => p.id === values.primeraTarea.responsableId);
        if (!responsableTarea) {
            toast({ title: "Error", description: "Responsable de la tarea no válido.", variant: "destructive" });
            return;
        }
        
        const projectData = {
            ...values,
            unidadDeNegocio: unidadSeleccionada.nombre,
            vendedorNombre: vendedorSeleccionado.nombre,
            subcategoria: values.subcategoria || null,
            involucradosIds: values.involucradosIds || [],
            fechaEstimadaCierre: format(values.fechaEstimadaCierre, 'yyyy-MM-dd'),
            responsableSeguimientoId: values.responsableSeguimientoId || undefined,
            primeraTarea: {
                ...values.primeraTarea,
                responsableNombre: responsableTarea.nombre,
                fechaVencimiento: format(values.primeraTarea.fechaVencimiento, 'yyyy-MM-dd')
            }
        };

        await createProject(projectData as any);
        
        toast({
        title: "Proyecto Creado",
        description: `El proyecto "${values.tema}" ha sido creado exitosamente.`,
        });
        router.push('/');
    } catch(error) {
         toast({
            title: "Error",
            description: "No se pudo crear el proyecto. Por favor, intenta de nuevo.",
            variant: "destructive"
        });
        console.error(error);
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormField
                control={form.control}
                name="cliente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre del cliente" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tema"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tema del Proyecto</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Rediseño de Sitio Web" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe los detalles del proyecto..." {...field} rows={4}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField
                control={form.control}
                name="unidadDeNegocio"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Unidad de Negocio</FormLabel>
                    <Select onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue('subcategoria', null);
                    }} value={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecciona una unidad de negocio" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {unidadesDeNegocio.map(unidad => (
                                <SelectItem key={unidad.id} value={unidad.id}>{unidad.nombre}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="subcategoria"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Subcategoría</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''} disabled={!unidadDeNegocioId || subcategoryOptions.length === 0}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecciona una subcategoría" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {subcategoryOptions.map(sub => (
                                <SelectItem key={sub.id} value={sub.id}>{sub.nombre}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField
                    control={form.control}
                    name="vendedorId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Vendedor Asignado</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona un vendedor" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {vendedores.map(vendedor => (
                                        <SelectItem key={vendedor.id} value={vendedor.id}>{vendedor.nombre}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="fechaEstimadaCierre"
                    render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel className="mb-2.5">Fecha Estimada de Cierre</FormLabel>
                        <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                            <Button
                                variant={"outline"}
                                className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                                )}
                            >
                                {field.value ? (
                                format(field.value, "dd/MM/yyyy")
                                ) : (
                                <span>Selecciona una fecha</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                                date < new Date()
                            }
                            initialFocus
                            />
                        </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                    )}
              />
            </div>
             <FormField
                control={form.control}
                name="involucradosIds"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Personas Involucradas Adicionales</FormLabel>
                    <Popover>
                    <PopoverTrigger asChild>
                        <FormControl>
                        <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value?.length && "text-muted-foreground")}>
                            <div className="flex gap-1">
                            <Users className="h-4 w-4 mr-2" />
                            {field.value?.length ? `${field.value.length} persona(s) seleccionada(s)`: "Seleccionar personas"}
                            </div>
                        </Button>
                        </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                        <CommandInput placeholder="Buscar persona..." />
                        <CommandList>
                            <CommandEmpty>No se encontraron personas.</CommandEmpty>
                            <CommandGroup>
                            {allPeople.map((person) => (
                                <CommandItem
                                key={person.id}
                                onSelect={() => {
                                    const selected = field.value || [];
                                    const newSelection = selected.includes(person.id)
                                    ? selected.filter((id) => id !== person.id)
                                    : [...selected, person.id];
                                    field.onChange(newSelection);
                                }}
                                >
                                <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", (field.value || []).includes(person.id) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")}>
                                    <Users className="h-4 w-4" />
                                </div>
                                <span>{person.nombre}</span>
                                </CommandItem>
                            ))}
                            </CommandGroup>
                        </CommandList>
                        </Command>
                    </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
                )}
            />
            
            <FormField
              control={form.control}
              name="responsableSeguimientoId"
              render={({ field }) => (
                  <FormItem>
                      <FormLabel>Responsable de Seguimiento</FormLabel>
                      <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                          disabled={seguimientoAssigneeOptions.length === 0}
                      >
                          <FormControl>
                              <SelectTrigger>
                                  <SelectValue placeholder="Selecciona un responsable" />
                              </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                              {seguimientoAssigneeOptions.map(person => (
                                  <SelectItem key={person.id} value={person.id}>{person.nombre}</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                      <FormMessage />
                  </FormItem>
              )}
            />


            <div className="border-t pt-8 space-y-8">
                <h3 className="text-lg font-semibold">Primera Tarea del Proyecto</h3>
                <FormField
                    control={form.control}
                    name="primeraTarea.descripcion"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Descripción de la Tarea Inicial</FormLabel>
                        <FormControl>
                        <Textarea placeholder="Ej: Contactar al cliente para agendar reunión inicial" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <FormField
                        control={form.control}
                        name="primeraTarea.responsableId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Responsable de la Tarea</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={taskAssigneeOptions.length === 0}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Asignar a..." />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {taskAssigneeOptions.map(person => (
                                            <SelectItem key={person.id} value={person.id}>{person.nombre}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="primeraTarea.fechaVencimiento"
                        render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel className="mb-2.5">Fecha de Vencimiento</FormLabel>
                            <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                    )}
                                >
                                    {field.value ? (
                                    format(field.value, "dd/MM/yyyy")
                                    ) : (
                                    <span>Selecciona una fecha</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date < new Date()}
                                initialFocus
                                />
                            </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField
                    control={form.control}
                    name="pipelineUSD"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Pipeline (USD)</FormLabel>
                        <FormControl>
                        <Input type="number" placeholder="50000" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="probabilidadCierre"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Probabilidad de Cierre ({field.value ? Math.round(field.value * 100) : 0}%)</FormLabel>
                        <FormControl>
                          <Input type="range" min="0" max="1" step="0.05" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>


            <div className="flex justify-end">
                <Button type="submit">Guardar Proyecto</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
