import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, Bell, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CriticalPill {
  id: string;
  label: string;
  icon: React.ElementType;
  count: number;
  hasBreach?: boolean;
  hasRisk?: boolean;
  breached?: number;
  atRisk?: number;
  route: string;
}

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
      hasBreach: majorIncidents.breached > 0,
      hasRisk: majorIncidents.atRisk > 0,
      breached: majorIncidents.breached,
      atRisk: majorIncidents.atRisk,
      route: '/release/incident-room?filter=major',
    },
    {
      id: 'sla-at-risk',
      label: 'SLA at Risk',
      icon: Clock,
      count: slaAtRisk,
      hasRisk: slaAtRisk > 0,
      route: '/release/incident-room?filter=sla-risk',
    },
    {
      id: 'awaiting-me',
      label: 'Awaiting me',
      icon: Bell,
      count: awaitingMe,
      route: '/home?tab=awaiting',
    },
    {
      id: 'blocked',
      label: 'Blocked',
      icon: Ban,
      count: blocked,
      hasBreach: blocked > 0,
      route: '/home?tab=blocked',
    },
  ];

  return (
    <div className="flex items-stretch gap-2.5 overflow-x-auto pb-1">
      {pills.map((pill) => {
        const Icon = pill.icon;
        
        return (
          <button
            key={pill.id}
            onClick={() => navigate(pill.route)}
            className={cn(
              "flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border transition-all cursor-pointer min-w-fit",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-1",
              // Consistent champagne surface with gold border
              "bg-[var(--surface-champagne)] border-[var(--border-gold)]",
              "hover:bg-[var(--surface-2)] hover:border-[var(--brand-gold)]"
            )}
          >
            {/* Icon - red only for confirmed breach, gold otherwise */}
            <Icon 
              className={cn(
                "w-4 h-4 shrink-0",
                pill.hasBreach ? "text-[hsl(var(--destructive))]" : "text-[var(--brand-gold)]"
              )} 
            />
            <span className="text-sm font-medium text-[var(--text-1)] whitespace-nowrap">
              {pill.label}
            </span>
            {/* Count - olive green for normal, red only for breached */}
            <span 
              className={cn(
                "text-sm font-bold tabular-nums min-w-[1.25rem] text-center",
                pill.hasBreach ? "text-[hsl(var(--destructive))]" : "text-[var(--brand-primary)]"
              )}
            >
              {pill.count}
            </span>
            {/* Sub-counts for Major Incidents - breached in red, at-risk in gold */}
            {pill.id === 'major-incidents' && (pill.breached || pill.atRisk) ? (
              <span className="text-[11px] whitespace-nowrap text-[var(--text-2)]">
                {pill.breached ? (
                  <span className="text-[hsl(var(--destructive))] font-medium">{pill.breached} breached</span>
                ) : null}
                {pill.breached && pill.atRisk ? <span className="text-[var(--text-3)]"> · </span> : null}
                {pill.atRisk ? (
                  <span className="text-[var(--brand-gold)] font-medium">{pill.atRisk} at risk</span>
                ) : null}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
