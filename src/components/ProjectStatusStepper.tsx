
'use client';

import { cn } from "@/lib/utils";
import type { Estado } from "@/lib/types";
import { Check, ChevronDown, Trophy, FileText, Handshake, Search, Store, X, Microscope, Wrench, FileSignature, Users, FlaskConical, CircleCheck, Truck, Ban } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "./ui/button";

const STEPS_CONFIG: {name: string, icon: React.ElementType }[] = [
  { name: "Diagnóstico", icon: Microscope },
  { name: "Diseño", icon: Wrench },
  { name: "Cotización", icon: FileText },
  { name: "Negociación", icon: Users },
  { name: "Preacuerdo", icon: FileSignature },
  { name: "Piloto", icon: FlaskConical },
  { name: "Validación", icon: CircleCheck },
  { name: "Cierre", icon: Store },
];


const getStepStatus = (stepName: string, currentState: Estado) => {
    const stepNames = STEPS_CONFIG.map(s => s.name);
    let normalizedCurrentState = currentState;

    if (currentState === "Ganado" || currentState === "Implementación" || currentState === "Cerrado Ganado") {
      const ganadosIndex = stepNames.indexOf("Cierre");
      const currentGanadoIndex = ["Ganado", "Implementación", "Cerrado Ganado"].indexOf(currentState);
      if (currentGanadoIndex >= 0) {
          normalizedCurrentState = "Cierre";
      }
    }
    if (currentState === "Cerrado Perdido" || currentState === "Cancelado") {
      normalizedCurrentState = "Cierre";
    }

    const currentIndex = stepNames.indexOf(normalizedCurrentState);
    const stepIndex = stepNames.indexOf(stepName);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
}

interface ProjectStatusStepperProps {
  allStates: Estado[]; 
  currentState: Estado;
  onStateChange: (newState: Estado) => void;
}

export default function ProjectStatusStepper({ currentState, onStateChange }: ProjectStatusStepperProps) {
  const currentBgColor = 'bg-primary';

  const finalStepsConfig = [
    ...STEPS_CONFIG.slice(0, -1), // All but Cierre
    ...(currentState === 'Ganado' || currentState === 'Implementación' || currentState === 'Cerrado Ganado'
        ? [
            { name: 'Ganado', icon: Trophy },
            { name: 'Implementación', icon: Truck },
            { name: 'Cerrado Ganado', icon: Check },
          ]
        : [{ name: 'Cierre', icon: Store }]),
  ];

  const getFinalStepStatus = (stepName: string, currentState: Estado) => {
      const stepNames = finalStepsConfig.map(s => s.name);
      const currentIndex = stepNames.indexOf(currentState);
      const stepIndex = stepNames.indexOf(stepName);

      if (stepIndex < currentIndex) return 'completed';
      if (stepIndex === currentIndex) return 'current';
      return 'upcoming';
  }
  
  const progressPercentage = () => {
    const currentIndex = finalStepsConfig.findIndex(s => s.name === currentState);
    if (currentIndex === -1) {
        // Handle non-linear states like "Perdido" or "Cancelado" by showing progress up to "Cierre"
        const cierreIndex = STEPS_CONFIG.findIndex(s => s.name === "Cierre");
        return (cierreIndex / (STEPS_CONFIG.length - 1)) * 100;
    }
    return (currentIndex / (finalStepsConfig.length - 1)) * 100;
  }

  return (
    <div className="w-full overflow-x-auto px-8 pt-12 pb-4">
        <div className="relative flex justify-between items-start min-w-[800px]">
            {/* Background Line */}
            <div className="absolute top-5 left-0 w-full h-1 bg-border -translate-y-1/2" />
            {/* Progress Line */}
            <div 
                className={cn(
                    "absolute top-5 left-0 h-1 -translate-y-1/2 transition-all duration-500 ease-in-out",
                    currentBgColor
                )}
                style={{ width: `${progressPercentage()}%` }}
            />

            {finalStepsConfig.map((step) => {
                const status = getFinalStepStatus(step.name, currentState);
                const isDecisionPoint = step.name === 'Cierre';
                
                let Icon = step.icon;
                let textColorClass = "text-foreground";
                let stepColorClass = 'bg-primary';
                let iconColorClass = 'text-primary-foreground';

                if (isDecisionPoint && (currentState === 'Cerrado Perdido' || currentState === 'Cancelado')) {
                  if (currentState === 'Cerrado Perdido') {
                    Icon = X;
                    stepColorClass = "bg-red-500";
                    textColorClass = "text-red-500";
                  } else if (currentState === 'Cancelado') {
                    Icon = Ban;
                    stepColorClass = "bg-yellow-500";
                    textColorClass = "text-yellow-500";
                  }
                  iconColorClass = "text-white";
                } else if (status === 'completed') {
                    Icon = Check;
                } else if (status === 'current') {
                   // No changes needed, uses default
                } else { // upcoming
                    iconColorClass = "text-muted-foreground";
                }
                

                const StepButton = (
                    <button
                        onClick={() => {
                          if (!isDecisionPoint) {
                            onStateChange(step.name as Estado)
                          }
                        }}
                        disabled={isDecisionPoint}
                        className={cn(
                            "relative w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-300 z-10",
                             status === 'completed' && `${stepColorClass} border-transparent text-white`,
                             status === 'current' && `${stepColorClass} border-transparent scale-110 shadow-lg ring-4 ring-background`,
                             status === 'upcoming' && `bg-background border-border`,
                             !isDecisionPoint && 'cursor-pointer hover:border-primary',
                             isDecisionPoint && `cursor-default`
                        )}
                        aria-current={status === 'current' ? 'step' : undefined}
                    >
                        <Icon className={cn("w-5 h-5", iconColorClass)} />
                    </button>
                )

                return (
                    <div key={step.name} className="relative flex flex-col items-center group flex-1">
                       
                        {isDecisionPoint ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <div
                                    className={cn(
                                        "relative w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-300 z-10 cursor-pointer",
                                        status === 'current' && `${stepColorClass} border-transparent scale-110 shadow-lg ring-4 ring-background`,
                                        status === 'upcoming' && `bg-background border-border hover:border-primary`,
                                        currentState === 'Cerrado Perdido' && 'bg-red-500 border-transparent text-white',
                                        currentState === 'Cancelado' && 'bg-yellow-500 border-transparent text-white'
                                    )}
                                >
                                    <Icon className={cn("w-5 h-5", iconColorClass)} />
                                </div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => onStateChange("Ganado")}>
                                    <Trophy className="mr-2 h-4 w-4 text-green-500" />
                                    <span>Ganado</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onStateChange("Cerrado Perdido")}>
                                    <X className="mr-2 h-4 w-4 text-red-500" />
                                    <span>Perdido</span>
                                </DropdownMenuItem>
                                 <DropdownMenuItem onClick={() => onStateChange("Cancelado")}>
                                    <Ban className="mr-2 h-4 w-4 text-yellow-500" />
                                    <span>Cancelado</span>
                                </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : StepButton}
                         <p className={cn(
                                "font-bold text-center mt-3 text-xs w-20 break-words",
                                textColorClass,
                                status !== 'upcoming' && 'text-primary',
                                isDecisionPoint && (currentState === 'Cerrado Perdido' || currentState === 'Cancelado') && textColorClass
                            )}>{step.name}</p>
                    </div>
                );
            })}
        </div>
    </div>
  );
}
