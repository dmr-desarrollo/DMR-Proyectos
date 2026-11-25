
'use client';
import { useState, useMemo } from 'react';
import type { Proyecto, UnidadDeNegocio, Subcategoria, Vendedor, Estado } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from './ui/table';
import { Button } from './ui/button';
import { ArrowDown, ArrowUp, FileDown, ListFilter } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from './ui/command';
import { cn } from '@/lib/utils';

function formatDate(dateString: string | undefined) {
  if (!dateString) return 'N/A';
  return format(new Date(dateString + 'T00:00:00'), 'dd/MM/yyyy');
}

type SortKey = 'fechaEstimadaCierre' | 'pipelineUSD';
type SortDirection = 'asc' | 'desc';

interface ProjectExportReportProps {
    projects: Proyecto[];
    vendedores: Vendedor[];
    unidadesDeNegocio: UnidadDeNegocio[];
    subcategorias: Subcategoria[];
    estados: Estado[];
}

export default function ProjectExportReport({ 
    projects, 
    vendedores, 
    unidadesDeNegocio, 
    subcategorias, 
    estados 
}: ProjectExportReportProps) {
    const [filters, setFilters] = useState({
        unidadDeNegocio: 'all',
        subcategoria: 'all',
        vendedor: 'all',
        estado: [] as string[]
    });
    const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'fechaEstimadaCierre', direction: 'asc' });

    const handleFilterChange = (key: keyof Omit<typeof filters, 'estado'>, value: string) => {
        setFilters(prev => {
            const newFilters = { ...prev, [key]: value };
            if (key === 'unidadDeNegocio') {
                newFilters.subcategoria = 'all';
            }
            return newFilters;
        });
    };

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
            setSort({ key, direction: 'desc' });
        }
    };

    const availableSubcategories = useMemo(() => {
        if (filters.unidadDeNegocio === 'all') return subcategorias;
        return subcategorias.filter(s => s.unidadDeNegocioId === filters.unidadDeNegocio);
    }, [filters.unidadDeNegocio, subcategorias]);

    const filteredAndSortedProjects = useMemo(() => {
        let tempProjects = [...projects];

        if (filters.unidadDeNegocio !== 'all') {
            const unidad = unidadesDeNegocio.find(u => u.id === filters.unidadDeNegocio);
            if (unidad) {
                tempProjects = tempProjects.filter(p => p.unidadDeNegocio === unidad.nombre);
            }
        }
        if (filters.subcategoria !== 'all') {
            tempProjects = tempProjects.filter(p => p.subcategoria === filters.subcategoria);
        }
        if (filters.vendedor !== 'all') {
            const vendedor = vendedores.find(v => v.id === filters.vendedor);
            if(vendedor) {
                tempProjects = tempProjects.filter(p => p.vendedor === vendedor.nombre);
            }
        }
        if (filters.estado.length > 0) {
            tempProjects = tempProjects.filter(p => filters.estado.includes(p.estado));
        }

        tempProjects.sort((a, b) => {
            if (sort.key === 'pipelineUSD') {
                return sort.direction === 'asc' ? a.pipelineUSD - b.pipelineUSD : b.pipelineUSD - a.pipelineUSD;
            }
            const dateA = new Date(a.fechaEstimadaCierre).getTime();
            const dateB = new Date(b.fechaEstimadaCierre).getTime();
            return sort.direction === 'asc' ? dateA - dateB : dateB - a.fechaEstimadaCierre;
        });

        return tempProjects;
    }, [projects, filters, sort, unidadesDeNegocio, vendedores]);
    
    const getSubcategoriaNombre = (id: string | null) => id ? subcategorias.find(s => s.id === id)?.nombre || '' : '';

    const exportToPDF = () => {
        const doc = new jsPDF();
        
        doc.text('Reporte Detallado de Proyectos', 14, 16);
        doc.setFontSize(10);
        doc.text(`Generado el: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 22);

        const tableColumn = ["Cliente", "Tema", "Vendedor", "Estado", "Cierre Est.", "Pipeline", "Último Avance"];
        const tableRows: (string | number)[][] = [];

        filteredAndSortedProjects.forEach(project => {
            const lastManualUpdate = (project.actividades || [])
                .filter(a => a.esAvanceManual)
                .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

            let lastUpdateText = "Sin avances manuales";
            if (lastManualUpdate) {
                const summary = lastManualUpdate.descripcion;
                const updateDate = format(new Date(lastManualUpdate.timestamp), 'dd/MM/yyyy');
                lastUpdateText = `${updateDate}: ${summary}`;
            }

            const projectData = [
                project.cliente,
                project.tema,
                project.vendedor,
                project.estado,
                formatDate(project.fechaEstimadaCierre),
                new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(project.pipelineUSD),
                lastUpdateText
            ];
            tableRows.push(projectData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 28,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] },
            columnStyles: {
                6: { cellWidth: 'auto' }
            }
        });

        doc.save('Reporte_Proyectos.pdf');
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><ListFilter /> Reporte Detallado de Proyectos</CardTitle>
                <CardDescription>Filtra y ordena los proyectos para generar un reporte personalizado y exportarlo a PDF.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="p-4 border rounded-lg bg-muted/50 mb-6 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Select value={filters.unidadDeNegocio} onValueChange={(value) => handleFilterChange('unidadDeNegocio', value)}>
                            <SelectTrigger><SelectValue placeholder="Unidad de Negocio" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las Unidades</SelectItem>
                                {unidadesDeNegocio.map(u => <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={filters.subcategoria} onValueChange={(value) => handleFilterChange('subcategoria', value)} disabled={filters.unidadDeNegocio === 'all'}>
                            <SelectTrigger><SelectValue placeholder="Subcategoría" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las Subcategorías</SelectItem>
                                {availableSubcategories.map(s => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={filters.vendedor} onValueChange={(value) => handleFilterChange('vendedor', value)}>
                            <SelectTrigger><SelectValue placeholder="Vendedor" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los Vendedores</SelectItem>
                                {vendedores.map(v => <SelectItem key={v.id} value={v.id}>{v.nombre}</SelectItem>)}
                            </SelectContent>
                        </Select>
                         <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start">
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
                    </div>
                    <div className='flex flex-wrap items-center justify-between gap-4'>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Ordenar por:</span>
                            <Button variant={sort.key === 'fechaEstimadaCierre' ? 'secondary' : 'ghost'} onClick={() => handleSort('fechaEstimadaCierre')}>
                                Fecha {sort.key === 'fechaEstimadaCierre' && (sort.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4"/> : <ArrowDown className="ml-2 h-4 w-4"/>)}
                            </Button>
                            <Button variant={sort.key === 'pipelineUSD' ? 'secondary' : 'ghost'} onClick={() => handleSort('pipelineUSD')}>
                                Monto {sort.key === 'pipelineUSD' && (sort.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4"/> : <ArrowDown className="ml-2 h-4 w-4"/>)}
                            </Button>
                        </div>
                        <Button onClick={exportToPDF} disabled={filteredAndSortedProjects.length === 0}>
                            <FileDown className="mr-2 h-4 w-4"/> Exportar a PDF
                        </Button>
                    </div>
                </div>

                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Proyecto</TableHead>
                                <TableHead>Vendedor</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Último Avance</TableHead>
                                <TableHead className="text-right">Cierre Estimado</TableHead>
                                <TableHead className="text-right">Pipeline</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredAndSortedProjects.length > 0 ? (
                                filteredAndSortedProjects.map(project => {
                                    const lastManualUpdate = (project.actividades || [])
                                        .filter(a => a.esAvanceManual)
                                        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
                                    
                                    const summary = lastManualUpdate ? lastManualUpdate.descripcion : 'N/A';
                                    const updateDate = lastManualUpdate ? format(new Date(lastManualUpdate.timestamp), 'dd/MM/yyyy') : '';

                                    return (
                                        <TableRow key={project.id}>
                                            <TableCell>
                                                <div className="font-bold">{project.cliente}</div>
                                                <div className="text-sm text-muted-foreground">{project.tema}</div>
                                            </TableCell>
                                            <TableCell>{project.vendedor}</TableCell>
                                            <TableCell>{project.estado}</TableCell>
                                            <TableCell className="max-w-[300px] text-sm text-muted-foreground whitespace-pre-wrap">
                                                <p title={summary}>{summary}</p>
                                                {updateDate && <p className="text-xs text-primary font-medium">{updateDate}</p>}
                                            </TableCell>
                                            <TableCell className="text-right">{formatDate(project.fechaEstimadaCierre)}</TableCell>
                                            <TableCell className="text-right font-medium">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(project.pipelineUSD)}</TableCell>
                                        </TableRow>
                                    )
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">No se encontraron proyectos con los filtros seleccionados.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
