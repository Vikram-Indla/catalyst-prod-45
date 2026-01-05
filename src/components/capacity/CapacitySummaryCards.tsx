/**
 * Capacity Summary Cards - 5 metric cards
 * Following specification exactly with Golden Hour colors
 */

import { Users, AlertTriangle, CheckCircle, CircleDot, Square } from 'lucide-react';
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
  const cards = [
    { 
      label: 'Team Members', 
      value: totalMembers, 
      icon: Users, 
      iconBg: 'bg-[#c8ccd0]/10', 
      iconColor: 'text-[#c8ccd0]', // Grey
    },
    { 
      label: 'Underallocated', 
      value: underallocated, 
      icon: AlertTriangle, 
      iconBg: 'bg-[#f59e0b]/10', 
      iconColor: 'text-[#f59e0b]', // Amber
    },
    { 
      label: 'Fully Allocated', 
      value: fullyAllocated, 
      icon: CheckCircle, 
      iconBg: 'bg-[var(--status-success)]/10', 
      iconColor: 'text-[var(--status-success)]', // Olive
    },
    { 
      label: 'Overallocated', 
      value: overallocated, 
      icon: CircleDot, 
      iconBg: 'bg-[var(--status-info)]/10', 
      iconColor: 'text-[var(--status-info)]', // Gold
    },
    { 
      label: 'Human Resources', 
      value: humanResources, 
      icon: Users, 
      iconBg: 'bg-[#3b82f6]/10', 
      iconColor: 'text-[#3b82f6]', // Blue
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((card) => (
        <div 
          key={card.label}
          className="bg-card dark:bg-[var(--surface-0)] border border-border dark:border-[var(--border-subtle)] rounded-md p-3 flex items-center gap-2"
        >
          <div className={cn(
            "w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0",
            card.iconBg
          )}>
            <card.icon className={cn("h-4 w-4", card.iconColor)} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-lg font-semibold text-foreground dark:text-[var(--text-primary)]">{card.value}</span>
            <p className="text-xs text-muted-foreground dark:text-[var(--text-secondary)]">{card.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
