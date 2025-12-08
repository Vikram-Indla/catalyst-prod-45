/**
 * Capacity Summary Cards
 * 4 metric cards matching Skills Inventory layout pattern
 */

import { Users, AlertTriangle, CheckCircle, Clock, TrendingUp, TrendingDown } from 'lucide-react';
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
      label: 'Total Resources', 
      value: totalMembers, 
      icon: Users, 
      iconBg: 'bg-brand-gold/10', 
      iconColor: 'text-brand-gold',
      trend: '+2',
      trendUp: true
    },
    { 
      label: 'Fully Allocated', 
      value: fullyAllocated, 
      icon: CheckCircle, 
      iconBg: 'bg-brand-gold/10', 
      iconColor: 'text-brand-gold',
      trend: '+5%',
      trendUp: true
    },
    { 
      label: 'Avg. Utilization', 
      value: `${Math.round((fullyAllocated / Math.max(totalMembers, 1)) * 100)}%`, 
      icon: Clock, 
      iconBg: 'bg-brand-gold/10', 
      iconColor: 'text-brand-gold',
      trend: '+3%',
      trendUp: true
    },
    { 
      label: 'Open Vacancies', 
      value: openVacancies, 
      icon: AlertTriangle, 
      iconBg: 'bg-warning/10', 
      iconColor: 'text-warning',
      trend: '-2',
      trendUp: false
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div 
          key={card.label}
          className="bg-card border border-border rounded-lg p-4 flex items-start gap-4"
        >
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
            card.iconBg
          )}>
            <card.icon className={cn("h-5 w-5", card.iconColor)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-2xl font-semibold text-foreground">{card.value}</span>
              <div className={cn(
                "flex items-center gap-0.5 text-xs font-medium",
                card.trendUp ? "text-success" : "text-destructive"
              )}>
                {card.trendUp ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {card.trend}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{card.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
