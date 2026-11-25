
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Item {
    id: string;
    component: React.ReactNode;
}

const SortableItem = ({ id, children }: { id: string, children: React.ReactNode }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 'auto',
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} className={cn("relative", isDragging && "shadow-2xl")}>
             <button {...listeners} className="absolute top-4 right-4 z-10 p-2 text-muted-foreground cursor-grab active:cursor-grabbing">
                <GripVertical />
            </button>
            {children}
        </div>
    );
};


interface DraggableCardContainerProps {
  storageKey: string;
  items: Item[];
}

export default function DraggableCardContainer({ storageKey, items }: DraggableCardContainerProps) {
    const [orderedItems, setOrderedItems] = useState<Item[]>([]);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        try {
            const savedOrder = localStorage.getItem(storageKey);
            if (savedOrder) {
                const savedIds = JSON.parse(savedOrder);
                const newOrderedItems = savedIds
                    .map((id: string) => items.find(item => item.id === id))
                    .filter((item: Item | undefined): item is Item => !!item);
                
                // Add any new items that weren't in the saved order
                const currentIds = new Set(newOrderedItems.map(i => i.id));
                const missingItems = items.filter(i => !currentIds.has(i.id));

                setOrderedItems([...newOrderedItems, ...missingItems]);
            } else {
                setOrderedItems(items);
            }
        } catch (error) {
            console.error("Failed to parse saved card order:", error);
            setOrderedItems(items);
        }

    }, [items, storageKey]);


    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setOrderedItems((currentItems) => {
                const oldIndex = currentItems.findIndex(item => item.id === active.id);
                const newIndex = currentItems.findIndex(item => item.id === over.id);
                const newOrder = arrayMove(currentItems, oldIndex, newIndex);
                
                try {
                    localStorage.setItem(storageKey, JSON.stringify(newOrder.map(item => item.id)));
                } catch (error) {
                    console.error("Failed to save card order:", error);
                }
                
                return newOrder;
            });
        }
    }, [storageKey]);

    if (!isMounted) {
        return null; // Or a loading skeleton
    }
    
    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext
                items={orderedItems.map(item => item.id)}
                strategy={verticalListSortingStrategy}
            >
                <div className="space-y-8">
                    {orderedItems.map(({ id, component }) => (
                         <SortableItem key={id} id={id}>
                            {component}
                        </SortableItem>
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}

