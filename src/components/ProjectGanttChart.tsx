
'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Proyecto, PersonaInvolucrada, Vendedor, Etapa, Tarea } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { addDays, differenceInDays, format, getDay, getMonth, getYear, isToday, parseISO, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

const GanttRow = ({
  item,
  allPeople,
  projectStartDate,
  dayWidth,
  rowIndex
}: {
  item: any;
  allPeople: any[];
  projectStartDate: Date;
  dayWidth: number;
  rowIndex: number;
}) => {
  const itemStartDate = startOfDay(parseISO(item.startDate));
  const itemEndDate = startOfDay(parseISO(item.endDate));

  const startDay = differenceInDays(itemStartDate, projectStartDate);
  const duration = differenceInDays(itemEndDate, itemStartDate) + 1;

  if (startDay < 0 && startDay + duration <= 0) return null;
  if (duration <= 0) return null;

  const responsable = 'responsableId' in item ? allPeople.find(p => p.id === item.responsableId)?.nombre : null;

  const style = {
    left: `${startDay * dayWidth}px`,
    width: `${duration * dayWidth}px`,
    top: `${rowIndex * 40 + 5}px`, // 40px por fila, 5px de margen superior
    backgroundColor: item.color,
  };

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="absolute flex h-8 items-center justify-start overflow-hidden rounded-md px-2 shadow-sm"
            style={style}
          >
            <span className="truncate text-sm font-bold text-white">{item.name}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1 p-1">
            <p className="font-bold">{item.name}</p>
            <p className="text-sm">
              {format(itemStartDate, 'dd/MM/yyyy')} - {format(itemEndDate, 'dd/MM/yyyy')}
            </p>
            {responsable && <p className="text-sm">Responsable: {responsable}</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};


export default function ProjectGanttChart({ project }: { project: Proyecto }) {
  type ViewMode = 'day' | 'week' | 'month';
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [vendedores, setVendedores] = React.useState<Vendedor[]>([]);
  const [personasInvolucradas, setPersonasInvolucradas] = React.useState<PersonaInvolucrada[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const fetchPeople = async () => {
      const { getVendedores, getPersonasInvolucradas } = await import('@/lib/data');
      const [vendedoresData, personasData] = await Promise.all([getVendedores(), getPersonasInvolucradas()]);
      setVendedores(vendedoresData);
      setPersonasInvolucradas(personasData);
    };
    fetchPeople();
  }, []);

  const allPeople = useMemo(() => [...vendedores, ...personasInvolucradas], [vendedores, personasInvolucradas]);

  const { chartData, totalDays, ganttStartDate, ganttEndDate, totalRows } = useMemo(() => {
    const stages = (project.etapas || []).map(s => ({
      ...s,
      type: 'stage',
      startDate: s.fechaInicio,
      endDate: s.fechaFin,
      name: s.nombre,
    }));

    const tasks = (project.tareas || []).map(t => ({
      ...t,
      type: 'task',
      startDate: t.fechaVencimiento,
      endDate: t.fechaVencimiento,
      name: t.descripcion,
    }));

    const allItems: (typeof stages[0] | typeof tasks[0])[] = [
        ...stages,
        ...tasks,
    ];

    if (allItems.length === 0) {
      const today = startOfDay(new Date());
      return {
        chartData: [],
        totalDays: 60,
        ganttStartDate: addDays(today, -15),
        ganttEndDate: addDays(today, 45),
        totalRows: 1,
      };
    }

    const minDate = new Date(Math.min(...allItems.map(item => parseISO(item.startDate).getTime())));
    const maxDate = new Date(Math.max(...allItems.map(item => parseISO(item.endDate).getTime())));

    const ganttStartDateValue = addDays(minDate, -7);
    const ganttEndDateValue = addDays(maxDate, 7);
    const totalDaysValue = differenceInDays(ganttEndDateValue, ganttStartDateValue) + 1;

    const data: any[] = [];
    const sortedStages = stages.sort((a,b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime());
    
    sortedStages.forEach(stage => {
        data.push(stage);
        const stageTasks = tasks
            .filter(task => task.etapaId === stage.id)
            .map(task => ({...task, color: stage.color }))
            .sort((a,b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime());
        data.push(...stageTasks);
    });

    const tasksWithoutStage = tasks
        .filter(task => !task.etapaId)
        .map(task => ({...task, color: '#64748b' })) // default color
        .sort((a,b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime());

    data.push(...tasksWithoutStage);

    return {
      chartData: data,
      totalDays: totalDaysValue,
      ganttStartDate: ganttStartDateValue,
      ganttEndDate: ganttEndDateValue,
      totalRows: data.length,
    };
  }, [project]);

  const dayWidth = useMemo(() => {
    switch (viewMode) {
      case 'day': return 40;
      case 'week': return 15;
      case 'month': return 5;
      default: return 40;
    }
  }, [viewMode]);

  // Scroll to today's date on initial render
  useEffect(() => {
    if (scrollContainerRef.current) {
        const today = startOfDay(new Date());
        if (today >= ganttStartDate && today <= ganttEndDate) {
            const startDay = differenceInDays(today, ganttStartDate);
            const scrollPosition = startDay * dayWidth - scrollContainerRef.current.offsetWidth / 2 + dayWidth / 2;
            scrollContainerRef.current.scrollLeft = scrollPosition;
        }
    }
  }, [dayWidth, ganttStartDate, ganttEndDate]);

  const renderHeader = () => {
    const months: { name: string, year: number, days: number }[] = [];
    if (totalDays > 0) {
      let currentDate = new Date(ganttStartDate);
      while(currentDate <= ganttEndDate) {
        const month = getMonth(currentDate);
        const year = getYear(currentDate);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        let daysToEndOfMonth = daysInMonth - currentDate.getDate() + 1;
        let daysInView = Math.min(daysToEndOfMonth, differenceInDays(ganttEndDate, currentDate) + 1);

        months.push({ name: format(currentDate, 'MMMM', { locale: es }), year, days: daysInView });
        currentDate = addDays(currentDate, daysInView);
      }
    }

    return (
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm select-none">
        {/* Month Headers */}
        <div className="flex" style={{ width: `${totalDays * dayWidth}px` }}>
          {months.map((month, index) => (
            <div key={`${month.name}-${month.year}`} className="flex h-6 items-center justify-center border-b border-r text-xs font-semibold capitalize" style={{ width: `${month.days * dayWidth}px` }}>
              {month.name} '{String(month.year).slice(-2)}
            </div>
          ))}
        </div>
        {/* Day/Week/Month Headers */}
        <div className="flex" style={{ width: `${totalDays * dayWidth}px` }}>
          {Array.from({ length: totalDays }).map((_, i) => {
            const date = addDays(ganttStartDate, i);
            const dayOfMonth = date.getDate();
            const weekDay = getDay(date);
            const isWeekend = weekDay === 0 || weekDay === 6;

            let label = '';
             if (viewMode === 'day' || (viewMode === 'week' && (dayOfMonth === 1 || weekDay === 1 || i === 0))) {
                label = format(date, 'd');
            } else if (viewMode === 'month' && (dayOfMonth === 1 || i === 0)) {
                label = format(date, 'MMM', { locale: es });
            }

            return (
              <div
                key={i}
                className={cn(
                  'flex h-6 shrink-0 items-center justify-center border-b border-r text-xs',
                  isWeekend && 'bg-muted/70',
                  isToday(date) && 'bg-primary/20'
                )}
                style={{ width: `${dayWidth}px` }}
              >
                {label}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Diagrama de Gantt</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground p-8">
          Añade etapas y tareas al proyecto para visualizarlas aquí.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Diagrama de Gantt</CardTitle>
            <CardDescription>Línea de tiempo de etapas y tareas del proyecto.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Zoom:</span>
            <Button variant={viewMode === 'day' ? 'secondary' : 'outline'} size="sm" onClick={() => setViewMode('day')}>Día</Button>
            <Button variant={viewMode === 'week' ? 'secondary' : 'outline'} size="sm" onClick={() => setViewMode('week')}>Semana</Button>
            <Button variant={viewMode === 'month' ? 'secondary' : 'outline'} size="sm" onClick={() => setViewMode('month')}>Mes</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent ref={scrollContainerRef} className="overflow-x-auto">
        <div className="relative" style={{ width: `${totalDays * dayWidth}px`, height: `${totalRows * 40}px` }}>
          {/* Grid Lines */}
          {Array.from({ length: totalDays }).map((_, i) => {
             const date = addDays(ganttStartDate, i);
             const weekDay = getDay(date);
             const isWeekend = weekDay === 0 || weekDay === 6;
             return (
              <div
                key={`grid-${i}`}
                className={cn('absolute top-0 h-full border-r', isWeekend && 'bg-muted/70')}
                style={{ left: `${i * dayWidth}px`, width: dayWidth }}
              />
            )
          })}
          {/* Header */}
          {renderHeader()}
          {/* Rows */}
          <div className="relative">
            {chartData.map((item, index) => (
                <GanttRow
                    key={`${item.id}-${index}`}
                    item={item}
                    allPeople={allPeople}
                    projectStartDate={ganttStartDate}
                    dayWidth={dayWidth}
                    rowIndex={index}
                />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

    