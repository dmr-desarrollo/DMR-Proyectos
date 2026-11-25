
'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Vendedor, UnidadDeNegocio, Estado, Subcategoria } from "@/lib/types";
import { useMemo } from "react";

type Filters = {
    unidadDeNegocio: string;
    subcategoria: string;
    vendedor: string;
    estado: string;
}

interface DashboardFiltersProps {
    vendedores: Vendedor[];
    unidadesDeNegocio: UnidadDeNegocio[];
    subcategorias: Subcategoria[];
    estados: Estado[];
    filters: Filters;
    setFilters: (filters: Filters) => void;
}

export default function DashboardFilters({ 
    vendedores, 
    unidadesDeNegocio, 
    subcategorias, 
    estados, 
    filters, 
    setFilters 
}: DashboardFiltersProps) {

    const handleFilterChange = (key: keyof Filters, value: string) => {
        const newFilters = { ...filters, [key]: value };
        if (key === 'unidadDeNegocio') {
            newFilters.subcategoria = 'all'; // Reset subcategory when business unit changes
        }
        setFilters(newFilters);
    }
    
    const availableSubcategories = useMemo(() => {
        if (filters.unidadDeNegocio === 'all') {
            return subcategorias;
        }
        return subcategorias.filter(s => s.unidadDeNegocioId === filters.unidadDeNegocio);
    }, [filters.unidadDeNegocio, subcategorias]);

    return (
        <div className="p-4 border rounded-lg bg-card/40">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                <Select value={filters.unidadDeNegocio} onValueChange={(value) => handleFilterChange('unidadDeNegocio', value)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Unidad de Negocio" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas las Unidades</SelectItem>
                        {unidadesDeNegocio.map(u => <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>)}
                    </SelectContent>
                </Select>
                 <Select 
                    value={filters.subcategoria} 
                    onValueChange={(value) => handleFilterChange('subcategoria', value)}
                    disabled={availableSubcategories.length === 0}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Subcategoría" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas las Subcategorías</SelectItem>
                        {availableSubcategories.map(s => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={filters.vendedor} onValueChange={(value) => handleFilterChange('vendedor', value)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Vendedor" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los Vendedores</SelectItem>
                        {vendedores.map(v => <SelectItem key={v.id} value={v.id}>{v.nombre}</SelectItem>)}
                    </SelectContent>
                </Select>
                 <Select value={filters.estado} onValueChange={(value) => handleFilterChange('estado', value)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los Estados</SelectItem>
                        {estados.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </div>
    )
}
