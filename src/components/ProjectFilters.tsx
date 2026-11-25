

'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "./ui/button";
import { ArrowDown, ArrowUp, ListFilter, Search } from "lucide-react";
import type { Vendedor, UnidadDeNegocio, Estado, Subcategoria } from "@/lib/types";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "./ui/command";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { Input } from "./ui/input";

type Filters = {
    unidadDeNegocio: string;
    subcategoria: string;
    vendedorId: string;
    estado: string[];
}

type SortKey = 'pipelineUSD' | 'fechaEstimadaCierre' | 'fechaIngreso';
type SortDirection = 'asc' | 'desc';
type TaskStatusFilter = 'all' | 'overdue' | 'upcoming';


interface ProjectFiltersProps {
    vendedores: Vendedor[];
    unidadesDeNegocio: UnidadDeNegocio[];
    subcategorias: Subcategoria[];
    estados: Estado[];
    filters: Filters;
    setFilters: (filters: Partial<Filters>) => void;
    sort: { key: SortKey; direction: SortDirection };
    setSort: (sort: { key: SortKey; direction: SortDirection }) => void;
    showClosed: boolean;
    setShowClosed: (show: boolean) => void;
    taskStatusFilter: TaskStatusFilter;
    setTaskStatusFilter: (status: TaskStatusFilter) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
}

export default function ProjectFilters({ 
    vendedores, 
    unidadesDeNegocio,
    subcategorias, 
    estados, 
    filters, 
    setFilters, 
    sort, 
    setSort,
    showClosed,
    setShowClosed,
    taskStatusFilter,
    setTaskStatusFilter,
    searchQuery,
    setSearchQuery
}: ProjectFiltersProps) {

    const handleFilterChange = (key: keyof Omit<Filters, 'estado' | 'vendedorId'>, value: string) => {
        const newFilters: Partial<Filters> = { ...filters, [key]: value };
        if (key === 'unidadDeNegocio') {
            newFilters.subcategoria = 'all';
        }
        setFilters(newFilters);
    }
    
    const handleVendedorChange = (value: string) => {
      setFilters({ ...filters, vendedorId: value });
    }

    const handleEstadoChange = (estado: Estado) => {
        const newEstados = filters.estado.includes(estado)
            ? filters.estado.filter(s => s !== estado)
            : [...filters.estado, estado];
        setFilters({ ...filters, estado: newEstados });
    }

    const handleSort = (key: SortKey) => {
        if (sort.key === key) {
            setSort({ key, direction: sort.direction === 'asc' ? 'desc' : 'asc' });
        } else {
            setSort({ key, direction: 'asc' });
        }
    }
    
    const availableSubcategories = useMemo(() => {
        const unidad = unidadesDeNegocio.find(u => u.id === filters.unidadDeNegocio);
        if (!unidad) return subcategorias;
        return subcategorias.filter(s => s.unidadDeNegocioId === unidad.id);
    }, [filters.unidadDeNegocio, subcategorias, unidadesDeNegocio]);

    return (
        <div className="flex flex-col gap-4 w-full">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    type="search"
                    placeholder="Buscar por cliente o tema de proyecto..."
                    className="w-full pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <Select value={filters.unidadDeNegocio} onValueChange={(value) => handleFilterChange('unidadDeNegocio', value)}>
                    <SelectTrigger className="w-full sm:w-[180px]">
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
                    disabled={filters.unidadDeNegocio === 'all' || availableSubcategories.length === 0}
                >
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Subcategoría" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas las Subcategorías</SelectItem>
                        {availableSubcategories.map(s => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={filters.vendedorId} onValueChange={handleVendedorChange}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Vendedor" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los Vendedores</SelectItem>
                        {vendedores.map(v => <SelectItem key={v.id} value={v.id}>{v.nombre}</SelectItem>)}
                    </SelectContent>
                </Select>
                 <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full sm:w-[180px] justify-start">
                            <ListFilter className="mr-2 h-4 w-4" />
                            Estado {filters.estado.length > 0 && `(${filters.estado.length})`}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0" align="start">
                        <Command>
                             <CommandList>
                                <CommandEmpty>No se encontraron estados.</CommandEmpty>
                                <CommandGroup>
                                    {estados.map((estado) => (
                                        <CommandItem
                                            key={estado}
                                            onSelect={() => handleEstadoChange(estado)}
                                        >
                                             <div className={cn(
                                                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                filters.estado.includes(estado)
                                                ? "bg-primary text-primary-foreground"
                                                : "opacity-50 [&_svg]:invisible"
                                            )}>
                                               <ListFilter className="h-4 w-4" />
                                            </div>
                                            <span>{estado}</span>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                 </Popover>
                 <Select value={taskStatusFilter} onValueChange={(value) => setTaskStatusFilter(value as TaskStatusFilter)}>
                    <SelectTrigger className="w-full sm:w-[220px]">
                        <SelectValue placeholder="Estado de Tareas" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas las tareas</SelectItem>
                        <SelectItem value="overdue">Con tareas vencidas</SelectItem>
                        <SelectItem value="upcoming">Con tareas próximas a vencer</SelectItem>
                    </SelectContent>
                </Select>
                 <div className="flex items-center space-x-2">
                    <Switch id="show-closed" checked={showClosed} onCheckedChange={setShowClosed} />
                    <Label htmlFor="show-closed">Mostrar Cerrados</Label>
                </div>
                <div className="flex items-center gap-2 border-l pl-2 ml-auto">
                    <Button variant={sort.key === 'pipelineUSD' ? 'secondary' : 'ghost'} size="sm" onClick={() => handleSort('pipelineUSD')}>
                        Monto {sort.key === 'pipelineUSD' && (sort.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4"/> : <ArrowDown className="ml-2 h-4 w-4"/>)}
                    </Button>
                    <Button variant={sort.key === 'fechaEstimadaCierre' ? 'secondary' : 'ghost'} size="sm" onClick={() => handleSort('fechaEstimadaCierre')}>
                        Fecha Cierre {sort.key === 'fechaEstimadaCierre' && (sort.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4"/> : <ArrowDown className="ml-2 h-4 w-4"/>)}
                    </Button>
                    <Button variant={sort.key === 'fechaIngreso' ? 'secondary' : 'ghost'} size="sm" onClick={() => handleSort('fechaIngreso')}>
                        Fecha Ingreso {sort.key === 'fechaIngreso' && (sort.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4"/> : <ArrowDown className="ml-2 h-4 w-4"/>)}
                    </Button>
                </div>
            </div>
        </div>
    )
}
