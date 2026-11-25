
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UnidadDeNegocio, Subcategoria } from "@/lib/types";
import { useEffect } from "react";
import { DialogFooter } from "./ui/dialog";

const formSchema = z.object({
  id: z.string().optional(),
  nombre: z.string().min(2, "El nombre es requerido."),
  unidadDeNegocioId: z.string({ required_error: "La unidad de negocio es requerida." }),
});

type SubcategoriaFormData = z.infer<typeof formSchema>;

interface SubcategoriaFormProps {
  unidadesDeNegocio: UnidadDeNegocio[];
  onSubmit: (data: SubcategoriaFormData) => void;
  initialData?: Omit<Subcategoria, 'id' | 'unidadDeNegocioId'> & { id?: string; unidadDeNegocioId?: string; } | null;
  onCancel: () => void;
}

export default function SubcategoriaForm({ unidadesDeNegocio, onSubmit, initialData, onCancel }: SubcategoriaFormProps) {
  const form = useForm<SubcategoriaFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: initialData?.id || undefined,
      nombre: initialData?.nombre || "",
      unidadDeNegocioId: initialData?.unidadDeNegocioId || "",
    },
  });

  useEffect(() => {
    form.reset({
      id: initialData?.id || undefined,
      nombre: initialData?.nombre || "",
      unidadDeNegocioId: initialData?.unidadDeNegocioId || "",
    })
  }, [initialData, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        <FormField
          control={form.control}
          name="nombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de la Subcategoría</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Impresoras" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="unidadDeNegocioId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unidad de Negocio</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una unidad" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {unidadesDeNegocio.map((unidad) => (
                    <SelectItem key={unidad.id} value={unidad.id}>
                      {unidad.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">Guardar</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
