import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, Bell, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';

type ActiveFilter = 'all' | 'major-incidents' | 'sla-at-risk' | 'awaiting-me' | 'blocked';

interface CriticalPill {
  id: ActiveFilter;
  label: string;
  icon: React.ElementType;
  count: number;
  hasBreach?: boolean;
  hasRisk?: boolean;
  breached?: number;
  atRisk?: number;
  route: string;
  severity: number; // 0-3 for prioritization (3 = highest)
}

interface CriticalStripProps {
  majorIncidents: { open: number; breached: number; atRisk: number };
  slaAtRisk: number;
  awaitingMe: number;
  blocked: number;
  activeFilter?: ActiveFilter;
  onFilterChange?: (filter: ActiveFilter) => void;
}

export function CriticalStrip({ 
  majorIncidents, 
  slaAtRisk, 
  awaitingMe, 
  blocked,
  activeFilter = 'all',
  onFilterChange,
}: CriticalStripProps) {
  const navigate = useNavigate();

  // Calculate severity scores for soft prioritization
  const getMajorIncidentSeverity = () => {
    if (majorIncidents.breached > 0) return 3;
    if (majorIncidents.atRisk > 0) return 2;
    if (majorIncidents.open > 0) return 1;
    return 0;
  };

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
      route: '/release/incidents?filter=major',
      severity: getMajorIncidentSeverity(),
    },
    {
      id: 'sla-at-risk',
      label: 'SLA at Risk',
      icon: Clock,
      count: slaAtRisk,
      hasRisk: slaAtRisk > 0,
      route: '/release/incidents?filter=sla-risk',
      severity: slaAtRisk > 3 ? 2 : slaAtRisk > 0 ? 1 : 0,
    },
    {
      id: 'awaiting-me',
      label: 'Awaiting me',
      icon: Bell,
      count: awaitingMe,
      route: '/home?tab=awaiting',
      severity: awaitingMe > 5 ? 1 : 0,
    },
    {
      id: 'blocked',
      label: 'Blocked',
      icon: Ban,
      count: blocked,
      hasBreach: blocked > 0,
      route: '/home?tab=blocked',
      severity: blocked > 0 ? 2 : 0,
    },
  ];

  // Find highest severity for soft prioritization
  const maxSeverity = Math.max(...pills.map(p => p.severity));

  const handlePillClick = (pill: CriticalPill) => {
    if (onFilterChange) {
      // Toggle filter - if already active, clear it
      if (activeFilter === pill.id) {
        onFilterChange('all');
      } else {
        onFilterChange(pill.id);
      }
    } else {
      // Fallback to navigation if no filter handler
      navigate(pill.route);
    }
  };

  return (
    <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
      {pills.map((pill) => {
        const Icon = pill.icon;
        const isActive = activeFilter === pill.id;
        const isHighestSeverity = pill.severity === maxSeverity && maxSeverity > 0;
        
        return (
          <button
            key={pill.id}
            onClick={() => handlePillClick(pill)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all cursor-pointer min-w-fit",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-1",
              // Active state uses olive green highlight
              isActive
                ? "bg-[var(--brand-primary)]/10 border-[var(--brand-primary)] ring-1 ring-[var(--brand-primary)]/20"
                : isHighestSeverity && pill.hasBreach
                  // Highest severity with breach - subtle red emphasis
                  ? "bg-[hsl(var(--destructive))]/5 border-[hsl(var(--destructive))]/30 hover:bg-[hsl(var(--destructive))]/10 hover:border-[hsl(var(--destructive))]/50"
                  : isHighestSeverity
                    // Highest severity - subtle gold emphasis
                    ? "bg-[var(--brand-gold)]/5 border-[var(--brand-gold)]/30 hover:bg-[var(--brand-gold)]/10 hover:border-[var(--brand-gold)]"
                    // Normal state
                    : "bg-[var(--surface-1)] border-[var(--border-color)] hover:bg-[var(--surface-2)] hover:border-[var(--brand-gold)]/50"
            )}
          >
            {/* Icon - red only for confirmed breach, gold for risk, muted otherwise */}
            <Icon 
              className={cn(
                "w-3.5 h-3.5 shrink-0",
                isActive 
                  ? "text-[var(--brand-primary)]"
                  : pill.hasBreach 
                    ? "text-[hsl(var(--destructive))]" 
                    : pill.hasRisk || isHighestSeverity
                      ? "text-[var(--brand-gold)]"
                      : "text-[var(--icon-muted)]"
              )} 
            />
            <span className={cn(
              "text-sm whitespace-nowrap",
              isActive || isHighestSeverity ? "font-medium" : "font-normal",
              "text-[var(--text-1)]"
            )}>
              {pill.label}
            </span>
            {/* Count - olive green for normal, red only for breached, gold for risk */}
            <span 
              className={cn(
                "text-sm tabular-nums min-w-[1.25rem] text-center",
                isActive
                  ? "font-bold text-[var(--brand-primary)]"
                  : pill.hasBreach 
                    ? "font-bold text-[hsl(var(--destructive))]" 
                    : isHighestSeverity
                      ? "font-semibold text-[var(--brand-gold)]"
                      : "font-medium text-[var(--text-2)]"
              )}
            >
              {pill.count}
            </span>
            {/* Sub-counts for Major Incidents - breached in red, at-risk in gold */}
            {pill.id === 'major-incidents' && (pill.breached || pill.atRisk) ? (
              <span className="text-[10px] whitespace-nowrap text-[var(--text-3)]">
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
