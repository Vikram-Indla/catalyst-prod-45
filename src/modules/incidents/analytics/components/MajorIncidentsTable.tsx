/**
 * Major Incidents Table
 * Enterprise-density table for incidents requiring attention
 * Reduced pill noise, SLA State is primary urgency signal
 */

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { IncidentWithSLA } from '../types';

interface MajorIncidentsTableProps {
  incidents: IncidentWithSLA[];
  onRowClick: (id: string) => void;
  maxHeight?: string;
}

function formatAge(hours: number): string {
  if (hours < 1) return '<1h';
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  if (remainingHours === 0) return `${days}d`;
  return `${days}d ${remainingHours}h`;
}

const SLA_STATE_CONFIG: Record<string, { label: string; className: string }> = {
  on_track: { label: 'On Track', className: 'text-foreground' },
  at_risk: { label: 'At Risk', className: 'text-[hsl(var(--warning))] font-semibold' },
  breached: { label: 'Breached', className: 'text-destructive font-semibold' },
  n_a: { label: 'N/A', className: 'text-muted-foreground' },
  met: { label: 'Met', className: 'text-foreground' },
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  triage: 'Triage',
  in_progress: 'In Progress',
  to_committee: 'Committee',
  resolved: 'Resolved',
  closed: 'Closed',
};

export function MajorIncidentsTable({ incidents, onRowClick, maxHeight = '360px' }: MajorIncidentsTableProps) {
  return (
    <section className="mb-6">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Major Incidents Requiring Attention
      </h2>
      <div className="border border-border rounded-md bg-card overflow-hidden">
        <ScrollArea className="max-h-[360px]" style={{ maxHeight }}>
          <table className="w-full min-w-[800px]">
            <thead className="bg-muted/50 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border">
                  ID
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border min-w-[200px]">
                  Summary
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border w-[60px]">
                  Severity
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border w-[48px]">
                  Level
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border w-[80px]">
                  Status
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border w-[56px]">
                  Age
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border min-w-[120px]">
                  Assignee
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border w-[80px]">
                  SLA State
                </th>
              </tr>
            </thead>
            <tbody>
              {incidents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground text-sm">
                    No major incidents requiring attention
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
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-sm font-medium text-[var(--brand-primary)]">
                            {incident.incident_key}
                          </span>
                          {incident.is_major_incident && (
                            <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">
                              Major
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-sm text-foreground line-clamp-1">
                          {incident.title}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-sm text-foreground font-medium">
                          {incident.severity}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-sm text-muted-foreground">
                          {incident.support_level || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-sm text-foreground">
                          {STATUS_LABELS[incident.status] || incident.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={cn(
                          "text-sm font-mono tabular-nums",
                          incident.age_hours > 48 && "text-destructive font-medium"
                        )}>
                          {formatAge(incident.age_hours)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {incident.assignee_name ? (
                          <span className="text-sm text-foreground">
                            {incident.assignee_name}
                          </span>
                        ) : (
                          <span className="text-sm text-destructive font-medium">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span className={cn("text-sm", slaConfig.className)}>
                          {slaConfig.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </ScrollArea>
      </div>
    </section>
  );
}
