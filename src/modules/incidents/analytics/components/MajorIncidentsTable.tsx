/**
 * Major Incidents Table
 * Enterprise-density table for incidents requiring attention
 */

import { useState } from 'react';
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
  on_track: { label: 'On Track', className: 'bg-[hsl(142_76%_94%)] text-[hsl(142_76%_28%)] border-[hsl(142_50%_80%)]' },
  at_risk: { label: 'At Risk', className: 'bg-[hsl(35_100%_94%)] text-[hsl(35_92%_35%)] border-[hsl(35_80%_70%)]' },
  breached: { label: 'Breached', className: 'bg-[hsl(0_86%_95%)] text-destructive border-[hsl(0_60%_80%)]' },
  n_a: { label: 'N/A', className: 'bg-muted text-muted-foreground border-border' },
  met: { label: 'Met', className: 'bg-[hsl(142_76%_94%)] text-[hsl(142_76%_28%)] border-[hsl(142_50%_80%)]' },
};

const SEVERITY_CONFIG: Record<string, string> = {
  SEV1: 'bg-[hsl(0_86%_95%)] text-destructive border-[hsl(0_60%_80%)]',
  SEV2: 'bg-[hsl(35_100%_94%)] text-[hsl(35_92%_35%)] border-[hsl(35_80%_70%)]',
  SEV3: 'bg-[hsl(50_100%_94%)] text-[hsl(50_80%_30%)] border-[hsl(50_70%_70%)]',
  SEV4: 'bg-muted text-muted-foreground border-border',
};

const LEVEL_CONFIG: Record<string, string> = {
  L1: 'bg-[hsl(142_76%_94%)] text-[hsl(142_76%_28%)]',
  L2: 'bg-[hsl(200_90%_94%)] text-[hsl(200_80%_30%)]',
  L3: 'bg-[hsl(270_60%_94%)] text-[hsl(270_50%_35%)]',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  triage: 'Triage',
  in_progress: 'In Progress',
  to_committee: 'Committee',
  resolved: 'Resolved',
  closed: 'Closed',
};

export function MajorIncidentsTable({ incidents, onRowClick, maxHeight = '400px' }: MajorIncidentsTableProps) {
  return (
    <section className="mb-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Major Incidents Requiring Attention
      </h2>
      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <ScrollArea className={`max-h-[${maxHeight}]`} style={{ maxHeight }}>
          <table className="w-full min-w-[900px]">
            <thead className="bg-muted/50 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border">
                  Incident ID
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border min-w-[250px]">
                  Summary
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border w-[80px]">
                  Severity
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border w-[60px]">
                  Level
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border w-[100px]">
                  Status
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border w-[70px]">
                  Age
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border min-w-[150px]">
                  Owner / Assignee
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border w-[90px]">
                  SLA State
                </th>
              </tr>
            </thead>
            <tbody>
              {incidents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                    No incidents requiring immediate attention
                  </td>
                </tr>
              ) : (
                incidents.map((incident) => {
                  const slaConfig = SLA_STATE_CONFIG[incident.sla_state.state] || SLA_STATE_CONFIG.n_a;
                  const sevConfig = SEVERITY_CONFIG[incident.severity] || SEVERITY_CONFIG.SEV4;
                  const levelConfig = LEVEL_CONFIG[incident.support_level || 'L1'] || LEVEL_CONFIG.L1;

                  return (
                    <tr
                      key={incident.id}
                      onClick={() => onRowClick(incident.id)}
                      className="hover:bg-muted/30 cursor-pointer border-b border-border last:border-b-0"
                    >
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium text-[var(--brand-primary)]">
                            {incident.incident_key}
                          </span>
                          {incident.is_major_incident && (
                            <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                              Major
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-sm text-foreground line-clamp-1">
                          {incident.title}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant="outline" className={cn("text-[10px] font-medium border", sevConfig)}>
                          {incident.severity}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        {incident.support_level ? (
                          <Badge variant="outline" className={cn("text-[10px] font-medium", levelConfig)}>
                            {incident.support_level}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-sm text-foreground">
                          {STATUS_LABELS[incident.status] || incident.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn(
                          "text-sm font-mono tabular-nums",
                          incident.age_hours > 48 && "text-destructive font-medium"
                        )}>
                          {formatAge(incident.age_hours)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-sm text-foreground">
                          {incident.assignee_name || (
                            <span className="text-destructive font-medium">Unassigned</span>
                          )}
                        </span>
                        {incident.assignee_workgroup?.name && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({incident.assignee_workgroup.name})
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant="outline" className={cn("text-[10px] font-medium border", slaConfig.className)}>
                          {slaConfig.label}
                        </Badge>
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
