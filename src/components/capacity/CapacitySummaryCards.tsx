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
  openVacancies: number;
}

export function CapacitySummaryCards({
  totalMembers,
  underallocated,
  fullyAllocated,
  overallocated,
  openVacancies
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
      iconBg: 'bg-[#8b7355]/10', 
      iconColor: 'text-[#8b7355]', // Bronze
    },
    { 
      label: 'Fully Allocated', 
      value: fullyAllocated, 
      icon: CheckCircle, 
      iconBg: 'bg-[#5c7c5c]/10', 
      iconColor: 'text-[#5c7c5c]', // Olive
    },
    { 
      label: 'Overallocated', 
      value: overallocated, 
      icon: CircleDot, 
      iconBg: 'bg-[#c69c6d]/10', 
      iconColor: 'text-[#c69c6d]', // Gold
    },
    { 
      label: 'Open Vacancies', 
      value: openVacancies, 
      icon: Square, 
      iconBg: 'bg-[#c8ccd0]/10', 
      iconColor: 'text-[#c8ccd0]', // Grey
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((card) => (
        <div 
          key={card.label}
          className="bg-card border border-border rounded-md p-3 flex items-center gap-2"
        >
          <div className={cn(
            "w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0",
            card.iconBg
          )}>
            <card.icon className={cn("h-4 w-4", card.iconColor)} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-lg font-semibold text-foreground">{card.value}</span>
            <p className="text-xs text-muted-foreground">{card.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
