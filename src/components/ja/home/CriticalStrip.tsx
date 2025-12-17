import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, Bell, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CriticalPill {
  id: string;
  label: string;
  icon: React.ElementType;
  count: number;
  variant: 'danger' | 'warning' | 'info' | 'blocked';
  breached?: number;
  atRisk?: number;
  route: string;
}

const variantStyles = {
  danger: {
    bg: 'bg-[hsl(var(--destructive)/0.1)]',
    border: 'border-[hsl(var(--destructive)/0.3)]',
    hoverBg: 'hover:bg-[hsl(var(--destructive)/0.15)]',
    iconColor: 'text-[hsl(var(--destructive))]',
    countColor: 'text-[hsl(var(--destructive))]',
  },
  warning: {
    bg: 'bg-[hsl(var(--warning)/0.1)]',
    border: 'border-[hsl(var(--warning)/0.3)]',
    hoverBg: 'hover:bg-[hsl(var(--warning)/0.15)]',
    iconColor: 'text-[hsl(var(--warning))]',
    countColor: 'text-[hsl(var(--warning))]',
  },
  info: {
    bg: 'bg-[var(--accent-muted)]',
    border: 'border-[var(--border-accent)]',
    hoverBg: 'hover:bg-[var(--surface-3)]',
    iconColor: 'text-[var(--accent-color)]',
    countColor: 'text-[var(--accent-color)]',
  },
  blocked: {
    bg: 'bg-[var(--surface-2)]',
    border: 'border-[var(--border-color)]',
    hoverBg: 'hover:bg-[var(--surface-3)]',
    iconColor: 'text-[var(--text-2)]',
    countColor: 'text-[var(--text-1)]',
  },
};

interface CriticalStripProps {
  majorIncidents: { open: number; breached: number; atRisk: number };
  slaAtRisk: number;
  awaitingMe: number;
  blocked: number;
}

export function CriticalStrip({ majorIncidents, slaAtRisk, awaitingMe, blocked }: CriticalStripProps) {
  const navigate = useNavigate();

  const pills: CriticalPill[] = [
    {
      id: 'major-incidents',
      label: 'Major Incidents',
      icon: AlertTriangle,
      count: majorIncidents.open,
      variant: majorIncidents.breached > 0 ? 'danger' : majorIncidents.atRisk > 0 ? 'warning' : 'info',
      breached: majorIncidents.breached,
      atRisk: majorIncidents.atRisk,
      route: '/release/incident-room?filter=major',
    },
    {
      id: 'sla-at-risk',
      label: 'SLA at Risk',
      icon: Clock,
      count: slaAtRisk,
      variant: slaAtRisk > 0 ? 'warning' : 'info',
      route: '/release/incident-room?filter=sla-risk',
    },
    {
      id: 'awaiting-me',
      label: 'Awaiting me',
      icon: Bell,
      count: awaitingMe,
      variant: awaitingMe > 0 ? 'info' : 'blocked',
      route: '/home?tab=awaiting',
    },
    {
      id: 'blocked',
      label: 'Blocked',
      icon: Ban,
      count: blocked,
      variant: blocked > 0 ? 'danger' : 'blocked',
      route: '/home?tab=blocked',
    },
  ];

  return (
    <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
      {pills.map((pill) => {
        const styles = variantStyles[pill.variant];
        const Icon = pill.icon;
        
        return (
          <button
            key={pill.id}
            onClick={() => navigate(pill.route)}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all cursor-pointer min-w-fit",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-1",
              styles.bg,
              styles.border,
              styles.hoverBg
            )}
          >
            <Icon className={cn("w-4 h-4 shrink-0", styles.iconColor)} />
            <span className="text-sm font-medium text-[var(--text-1)] whitespace-nowrap">
              {pill.label}
            </span>
            <span className={cn("text-sm font-bold tabular-nums", styles.countColor)}>
              {pill.count}
            </span>
            {/* Sub-counts for Major Incidents */}
            {pill.id === 'major-incidents' && (pill.breached || pill.atRisk) ? (
              <span className="text-[10px] text-[var(--text-3)] whitespace-nowrap">
                {pill.breached ? `${pill.breached} breached` : ''}
                {pill.breached && pill.atRisk ? ' · ' : ''}
                {pill.atRisk ? `${pill.atRisk} at risk` : ''}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
