/**
 * Capacity Summary Cards
 * 5 metric cards: Team Members, Underallocated, Fully Allocated, Overallocated, Open Vacancies
 */

import { Users, AlertTriangle, CheckCircle, Clock, LayoutGrid } from 'lucide-react';

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
      iconBg: 'bg-muted', 
      iconColor: 'text-muted-foreground' 
    },
    { 
      label: 'Underallocated', 
      value: underallocated, 
      icon: AlertTriangle, 
      iconBg: 'bg-warning/10', 
      iconColor: 'text-warning' 
    },
    { 
      label: 'Fully Allocated', 
      value: fullyAllocated, 
      icon: CheckCircle, 
      iconBg: 'bg-health-green/10', 
      iconColor: 'text-health-green' 
    },
    { 
      label: 'Overallocated', 
      value: overallocated, 
      icon: Clock, 
      iconBg: 'bg-brand-gold/10', 
      iconColor: 'text-brand-gold' 
    },
    { 
      label: 'Open Vacancies', 
      value: openVacancies, 
      icon: LayoutGrid, 
      iconBg: 'bg-muted', 
      iconColor: 'text-muted-foreground' 
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
      {cards.map((card) => (
        <div 
          key={card.label}
          className="bg-card border border-border rounded-lg p-3 flex items-center gap-3"
        >
          <div className={`w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 ${card.iconBg}`}>
            <card.icon className={`h-[18px] w-[18px] ${card.iconColor}`} />
          </div>
          <div>
            <div className="text-lg font-semibold text-foreground">{card.value}</div>
            <div className="text-[11px] text-muted-foreground">{card.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
