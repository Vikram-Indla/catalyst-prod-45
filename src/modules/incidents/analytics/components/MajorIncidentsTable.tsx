/**
 * Major Incidents Table
 * Enterprise-grade table for major/at-risk incidents
 * Proper column widths, no clipped text, readable row heights
 */

import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';
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

export function MajorIncidentsTable({ 
  incidents, 
  onRowClick, 
  maxHeight = '400px' 
}: MajorIncidentsTableProps) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Major Incidents Requiring Attention
        </h2>
        <span className="ml-auto text-sm text-muted-foreground tabular-nums">
          {incidents.length} incident{incidents.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div 
        className="border border-border rounded-lg bg-card overflow-hidden"
      >
        <ScrollArea style={{ maxHeight }}>
          <table className="w-full min-w-[900px]">
            <thead className="bg-muted/50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border w-[100px]">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                  Summary
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border w-[72px]">
                  Severity
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border w-[56px]">
                  Level
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border w-[100px]">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border w-[72px]">
                  Age
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border w-[140px]">
                  Assignee
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border w-[90px]">
                  SLA State
                </th>
              </tr>
            </thead>
            <tbody>
              {incidents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="text-muted-foreground">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No major incidents at this time</p>
                      <p className="text-xs mt-1 opacity-70">All systems operating normally</p>
                    </div>
                  </td>
                </tr>
              ) : (
                incidents.map((incident) => {
                  const slaConfig = SLA_STATE_CONFIG[incident.sla_state.state] || SLA_STATE_CONFIG.n_a;
                  const isUrgent = incident.sla_state.state === 'breached' || incident.sla_state.state === 'at_risk';

                  return (
                    <tr
                      key={incident.id}
                      onClick={() => onRowClick(incident.id)}
                      className={cn(
                        "hover:bg-muted/30 cursor-pointer transition-colors",
                        "border-b border-border last:border-b-0",
                        isUrgent && "bg-destructive/[0.02]"
                      )}
                    >
                      {/* ID */}
                      <td className="px-4 py-3.5 align-middle">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium text-[var(--brand-primary)]">
                            {incident.incident_key}
                          </span>
                          {incident.is_major_incident && (
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase bg-destructive/10 text-destructive rounded">
                              Major
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Summary */}
                      <td className="px-4 py-3.5 align-middle">
                        <span className="text-sm text-foreground leading-snug line-clamp-2">
                          {incident.title}
                        </span>
                      </td>

                      {/* Severity */}
                      <td className="px-4 py-3.5 align-middle">
                        <span className={cn(
                          "text-sm font-semibold",
                          incident.severity === 'SEV1' && "text-destructive",
                          incident.severity === 'SEV2' && "text-[hsl(var(--warning))]",
                          incident.severity !== 'SEV1' && incident.severity !== 'SEV2' && "text-foreground"
                        )}>
                          {incident.severity}
                        </span>
                      </td>

                      {/* Level */}
                      <td className="px-4 py-3.5 align-middle">
                        <span className="text-sm text-muted-foreground">
                          {incident.support_level || '—'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 align-middle">
                        <span className="text-sm text-foreground">
                          {STATUS_LABELS[incident.status] || incident.status}
                        </span>
                      </td>

                      {/* Age */}
                      <td className="px-4 py-3.5 align-middle">
                        <span className={cn(
                          "text-sm font-mono tabular-nums",
                          incident.age_hours > 168 && "text-destructive font-medium",
                          incident.age_hours > 72 && incident.age_hours <= 168 && "text-[hsl(var(--warning))]",
                          incident.age_hours <= 72 && "text-muted-foreground"
                        )}>
                          {formatAge(incident.age_hours)}
                        </span>
                      </td>

                      {/* Assignee */}
                      <td className="px-4 py-3.5 align-middle">
                        {incident.assignee_name ? (
                          <span className="text-sm text-foreground truncate block max-w-[140px]">
                            {incident.assignee_name}
                          </span>
                        ) : (
                          <span className="text-sm text-destructive/80 italic">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* SLA State */}
                      <td className="px-4 py-3.5 align-middle">
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
