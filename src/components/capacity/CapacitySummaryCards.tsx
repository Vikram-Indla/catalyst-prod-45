/**
 * Capacity Summary Cards - V8 Design System
 * 5 metric cards with CATALYST V8 tokens
 */

import { Users, AlertTriangle, CheckCircle, CircleDot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CapacitySummaryCardsProps {
  totalMembers: number;
  underallocated: number;
  fullyAllocated: number;
  overallocated: number;
  humanResources: number;
}

export function CapacitySummaryCards({
  totalMembers,
  underallocated,
  fullyAllocated,
  overallocated,
  humanResources
}: CapacitySummaryCardsProps) {
  // V8 Color System - Uses CSS variables defined in capacity-module.css
  const cards = [
    { 
      label: 'Team Members', 
      value: totalMembers, 
      icon: Users, 
      colorClass: 'text-[var(--ct-text-secondary)]',
      bgClass: 'bg-[var(--ct-text-muted)]/10',
    },
    { 
      label: 'Underallocated', 
      value: underallocated, 
      icon: AlertTriangle, 
      colorClass: 'text-[var(--ct-warning)]',
      bgClass: 'bg-[var(--ct-warning-light)]',
    },
    { 
      label: 'Fully Allocated', 
      value: fullyAllocated, 
      icon: CheckCircle, 
      colorClass: 'text-[var(--ct-teal)]',
      bgClass: 'bg-[var(--ct-teal-light)]',
    },
    { 
      label: 'Overallocated', 
      value: overallocated, 
      icon: CircleDot, 
      colorClass: 'text-[var(--ct-danger)]',
      bgClass: 'bg-[var(--ct-danger-light)]',
    },
    { 
      label: 'Human Resources', 
      value: humanResources, 
      icon: Users, 
      colorClass: 'text-[var(--ct-primary)]',
      bgClass: 'bg-[var(--ct-primary-light)]',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((card) => (
        <div 
          key={card.label}
          className={cn(
            "ct-stat-card flex items-center gap-3",
            "bg-[var(--ct-surface)] border border-[var(--ct-border)] rounded-[var(--ct-radius-lg)] p-4",
            "hover:shadow-[var(--ct-shadow-md)] transition-all duration-200"
          )}
        >
          <div className={cn(
            "w-10 h-10 rounded-[var(--ct-radius-md)] flex items-center justify-center flex-shrink-0",
            card.bgClass
          )}>
            <card.icon className={cn("h-5 w-5", card.colorClass)} />
          </div>
          <div className="flex-1 min-w-0">
            <span className={cn("text-xl font-bold", card.colorClass)}>{card.value}</span>
            <p className="text-xs text-[var(--ct-text-muted)] font-medium uppercase tracking-wide">{card.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}