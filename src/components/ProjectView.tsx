

'use client';

import { useState, useMemo, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProjectList from './ProjectList';
import ProjectKanban from './ProjectKanban';
import type { Proyecto, Estado, Subcategoria, Vendedor, UnidadDeNegocio } from '@/lib/types';
import { List, Trello } from 'lucide-react';
import ProjectFilters from './ProjectFilters';
import { getProjectTaskUrgency } from '@/lib/utils';
import { z } from 'zod';

interface ProjectViewProps {
  projects: Proyecto[];
  estados: Estado[];
  subcategorias: Subcategoria[];
  vendedores: Vendedor[];
  unidadesDeNegocio: UnidadDeNegocio[];
}

type ViewMode = 'list' | 'kanban';
type SortKey = 'pipelineUSD' | 'fechaEstimadaCierre' | 'fechaIngreso';
type SortDirection = 'asc' | 'desc';
type TaskStatusFilter = 'all' | 'overdue' | 'upcoming';

const filterSchema = z.object({
  view: z.enum(['kanban', 'list']).default('kanban'),
  showClosed: z.boolean().default(false),
  unidad: z.string().default('all'),
  subcategoria: z.string().default('all'),
  vendedor: z.string().default('all'),
  estado: z.array(z.string()).default([]),
  sortBy: z.string().default('fechaIngreso'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  tasks: z.enum(['all', 'overdue', 'upcoming']).default('all'),
  search: z.string().default(''),
});

export default function ProjectView({ projects, estados, subcategorias, vendedores, unidadesDeNegocio }: ProjectViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { viewMode, showClosedProjects, filters, sort, taskStatusFilter, searchQuery } = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    return {
      viewMode: filterSchema.shape.view.parse(params.get('view') ?? 'kanban') as ViewMode,
      showClosedProjects: filterSchema.shape.showClosed.parse(params.get('showClosed') === 'true'),
      filters: {
        unidadDeNegocio: filterSchema.shape.unidad.parse(params.get('unidad') ?? 'all'),
        subcategoria: filterSchema.shape.subcategoria.parse(params.get('subcategoria') ?? 'all'),
        vendedorId: filterSchema.shape.vendedor.parse(params.get('vendedor') ?? 'all'),
        estado: params.getAll('estado') ?? [],
      },
      sort: {
        key: filterSchema.shape.sortBy.parse(params.get('sortBy') ?? 'fechaIngreso') as SortKey,
        direction: filterSchema.shape.sortDir.parse(params.get('sortDir') ?? 'desc') as SortDirection,
      },
      taskStatusFilter: filterSchema.shape.tasks.parse(params.get('tasks') ?? 'all') as TaskStatusFilter,
      searchQuery: filterSchema.shape.search.parse(params.get('search') ?? ''),
    };
  }, [searchParams]);

  const updateUrlParams = (newValues: Record<string, any>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newValues).forEach(([key, value]) => {
       const mappedKey = key === 'vendedorId' ? 'vendedor' : key;
      if (key === 'estado' && Array.isArray(value)) {
        params.delete(mappedKey);
        value.forEach(v => params.append(mappedKey, v));
      } else if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
        params.delete(mappedKey);
      } else {
        params.set(mappedKey, String(value));
      }
    });
    router.replace(`${pathname}?${params.toString()}`);
  };

  const setViewMode = (mode: ViewMode) => updateUrlParams({ view: mode });
  const setShowClosedProjects = (show: boolean) => updateUrlParams({ showClosed: show });
  const setFilters = (newFilters: any) => updateUrlParams({ ...newFilters, unidad: newFilters.unidadDeNegocio, subcategoria: newFilters.subcategoria, vendedorId: newFilters.vendedorId });
  const setSort = (newSort: { key: SortKey; direction: SortDirection }) => updateUrlParams({ sortBy: newSort.key, sortDir: newSort.direction });
  const setTaskStatusFilter = (status: TaskStatusFilter) => updateUrlParams({ tasks: status });
  const setSearchQuery = (query: string) => updateUrlParams({ search: query });

  const filteredAndSortedProjects = useMemo(() => {
    let filtered = [...projects];

    if (searchQuery) {
        filtered = filtered.filter(p => 
            p.cliente.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.tema.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }

    if (!showClosedProjects) {
        filtered = filtered.filter(p => p.estado !== 'Cerrado Ganado' && p.estado !== 'Cerrado Perdido' && p.estado !== 'Cancelado');
    }

    if (filters.unidadDeNegocio !== 'all') {
      const unidad = unidadesDeNegocio.find(u => u.id === filters.unidadDeNegocio);
      if (unidad) {
        filtered = filtered.filter(p => p.unidadDeNegocio === unidad.nombre);
      }
    }
     if (filters.subcategoria !== 'all') {
      filtered = filtered.filter(p => p.subcategoria === filters.subcategoria);
    }
    if (filters.vendedorId !== 'all') {
        filtered = filtered.filter(p => p.vendedorId === filters.vendedorId);
    }
    if (filters.estado.length > 0) {
      filtered = filtered.filter(p => filters.estado.includes(p.estado));
    }

    if (taskStatusFilter !== 'all') {
        filtered = filtered.filter(p => {
            const urgency = getProjectTaskUrgency(p);
            if (taskStatusFilter === 'overdue') return urgency === 'overdue';
            if (taskStatusFilter === 'upcoming') return urgency === 'upcoming';
            return false;
        });
    }

    filtered.sort((a, b) => {
      if (sort.key === 'pipelineUSD') {
        return sort.direction === 'asc' ? a.pipelineUSD - b.pipelineUSD : b.pipelineUSD - a.pipelineUSD;
      }
      if (sort.key === 'fechaEstimadaCierre' || sort.key === 'fechaIngreso') {
        const dateA = new Date(a[sort.key]).getTime();
        const dateB = new Date(b[sort.key]).getTime();
        return sort.direction === 'asc' ? dateA - dateB : dateB - dateA;
      }
      return 0;
    });

    return filtered;
  }, [projects, filters, sort, showClosedProjects, taskStatusFilter, searchQuery, unidadesDeNegocio]);
  
  const kanbanEstados = useMemo(() => {
      let activeEstados = estados;
      if (!showClosedProjects) {
          activeEstados = activeEstados.filter(e => e !== 'Cerrado Ganado' && e !== 'Cerrado Perdido' && e !== 'Cancelado');
      }
      if(filters.estado.length > 0) {
        activeEstados = activeEstados.filter(e => filters.estado.includes(e));
      }
      return activeEstados;
  }, [showClosedProjects, estados, filters.estado])


  return (
    <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)} className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center p-4 border rounded-lg bg-card">
        <ProjectFilters 
            vendedores={vendedores}
            unidadesDeNegocio={unidadesDeNegocio}
            subcategorias={subcategorias}
            estados={estados}
            filters={filters}
            setFilters={setFilters}
            sort={sort}
            setSort={setSort}
            showClosed={showClosedProjects}
            setShowClosed={setShowClosedProjects}
            taskStatusFilter={taskStatusFilter}
            setTaskStatusFilter={setTaskStatusFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
        />
        <TabsList className="grid w-full grid-cols-2 sm:w-auto shrink-0">
          <TabsTrigger value="kanban">
            <Trello className="mr-2 h-4 w-4" />
            Kanban
          </TabsTrigger>
          <TabsTrigger value="list">
            <List className="mr-2 h-4 w-4" />
            Lista
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="kanban" className="mt-0">
        <ProjectKanban projects={filteredAndSortedProjects} estados={kanbanEstados} subcategorias={subcategorias} />
      </TabsContent>
      <TabsContent value="list" className="mt-0">
        <ProjectList projects={filteredAndSortedProjects} subcategorias={subcategorias} vendedores={vendedores} />
      </TabsContent>
    </Tabs>
  );
}
