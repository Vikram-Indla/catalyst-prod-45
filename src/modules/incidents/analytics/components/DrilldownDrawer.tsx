/**
 * Drilldown Drawer
 * Right-side drawer for filtered incident lists
 */

import { X, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { IncidentWithSLA, DrilldownFilter, TimeRange } from '../types';

interface DrilldownDrawerProps {
  isOpen: boolean;
  filter: DrilldownFilter | null;
  incidents: IncidentWithSLA[];
  timeRange: TimeRange;
  onClose: () => void;
  onClear: () => void;
  onRowClick: (id: string) => void;
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  triage: 'Triage',
  in_progress: 'In Progress',
  to_committee: 'Committee',
  resolved: 'Resolved',
  closed: 'Closed',
};

const SLA_STATE_CONFIG: Record<string, { label: string; className: string }> = {
  on_track: { label: 'On Track', className: 'bg-[hsl(142_76%_94%)] text-[hsl(142_76%_28%)]' },
  at_risk: { label: 'At Risk', className: 'bg-[hsl(35_100%_94%)] text-[hsl(35_92%_35%)]' },
  breached: { label: 'Breached', className: 'bg-[hsl(0_86%_95%)] text-destructive' },
  n_a: { label: 'N/A', className: 'bg-muted text-muted-foreground' },
  met: { label: 'Met', className: 'bg-[hsl(142_76%_94%)] text-[hsl(142_76%_28%)]' },
};

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  today: 'Today',
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  custom: 'Custom range',
};

function formatAge(hours: number): string {
  if (hours < 1) return '<1h';
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function DrilldownDrawer({
  isOpen,
  filter,
  incidents,
  timeRange,
  onClose,
  onClear,
  onRowClick,
}: DrilldownDrawerProps) {
  if (!isOpen || !filter) return null;

  return (
    <div
      className={cn(
        "fixed top-0 right-0 h-full w-[45%] max-w-[600px] min-w-[400px]",
        "bg-background border-l border-border shadow-xl z-50",
        "flex flex-col transition-transform duration-300",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-sm font-semibold">Filtered Incidents</h2>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="secondary" className="text-xs">
              {filter.label}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {TIME_RANGE_LABELS[timeRange]}
            </Badge>
            <span className="text-xs text-muted-foreground">
              ({incidents.length})
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onClear} className="text-xs h-7">
            Clear
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs h-7">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Back to Analytics
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <table className="w-full">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  ID
                </th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Summary
                </th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground w-[60px]">
                  Severity
                </th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground w-[70px]">
                  Status
                </th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground w-[50px]">
                  Age
                </th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground w-[70px]">
                  SLA
                </th>
              </tr>
            </thead>
            <tbody>
              {incidents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2 py-8 text-center text-muted-foreground text-sm">
                    No incidents match this filter
                  </td>
                </tr>
              ) : (
                incidents.map((incident) => {
                  const slaConfig = SLA_STATE_CONFIG[incident.sla_state.state] || SLA_STATE_CONFIG.n_a;

                  return (
                    <tr
                      key={incident.id}
                      onClick={() => onRowClick(incident.id)}
                      className="hover:bg-muted/30 cursor-pointer border-b border-border last:border-b-0"
                    >
                      <td className="px-2 py-2">
                        <span className="font-mono text-xs font-medium text-[var(--brand-primary)]">
                          {incident.incident_key}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <span className="text-xs text-foreground line-clamp-1">
                          {incident.title}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <Badge variant="outline" className="text-[9px]">
                          {incident.severity}
                        </Badge>
                      </td>
                      <td className="px-2 py-2">
                        <span className="text-xs text-foreground">
                          {STATUS_LABELS[incident.status] || incident.status}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <span className="text-xs font-mono tabular-nums">
                          {formatAge(incident.age_hours)}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <Badge variant="outline" className={cn("text-[9px]", slaConfig.className)}>
                          {slaConfig.label}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </ScrollArea>
    </div>
  );
}
