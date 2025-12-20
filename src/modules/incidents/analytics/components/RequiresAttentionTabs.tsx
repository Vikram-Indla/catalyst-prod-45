/**
 * Requires Attention Tabs
 * Tabbed tables for: Major | SLA Breached | Committee Blockers | Unassigned
 */

import { useState } from 'react';
import { AlertTriangle, Clock, Users, UserX } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { IncidentWithSLA } from '../types';

interface RequiresAttentionTabsProps {
  incidents: IncidentWithSLA[];
  onRowClick: (id: string) => void;
}

type AttentionTab = 'major' | 'breached' | 'committee' | 'unassigned';

const TABS_CONFIG: { value: AttentionTab; label: string; icon: React.ElementType }[] = [
  { value: 'major', label: 'Major', icon: AlertTriangle },
  { value: 'breached', label: 'SLA Breached', icon: Clock },
  { value: 'committee', label: 'Committee', icon: Users },
  { value: 'unassigned', label: 'Unassigned', icon: UserX },
];

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

function formatAge(hours: number): string {
  if (hours < 1) return '<1h';
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function IncidentTable({ 
  incidents, 
  onRowClick,
  emptyMessage 
}: { 
  incidents: IncidentWithSLA[]; 
  onRowClick: (id: string) => void;
  emptyMessage: string;
}) {
  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      {/* Mobile / Tablet: Card list (no horizontal scroll) */}
      <div className="md:hidden">
        <ScrollArea className="max-h-[420px]">
          <div className="divide-y divide-border">
            {incidents.length === 0 ? (
              <div className="px-4 py-12 text-center text-muted-foreground text-sm">
                {emptyMessage}
              </div>
            ) : (
              incidents.map((incident) => {
                const slaConfig = SLA_STATE_CONFIG[incident.sla_state.state] || SLA_STATE_CONFIG.n_a;
                const isUrgent = incident.sla_state.state === 'breached' || incident.sla_state.state === 'at_risk';

                return (
                  <button
                    key={incident.id}
                    type="button"
                    onClick={() => onRowClick(incident.id)}
                    className={cn(
                      "w-full text-left px-4 py-3 transition-colors",
                      "hover:bg-muted/30",
                      isUrgent && "bg-destructive/[0.02]"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-medium text-[var(--brand-primary)]">
                            {incident.incident_key}
                          </span>
                          {incident.is_major_incident && (
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase bg-destructive/10 text-destructive rounded">
                              M
                            </span>
                          )}
                          <span className={cn(
                            "text-xs font-semibold",
                            incident.severity === 'SEV1' && "text-destructive",
                            incident.severity === 'SEV2' && "text-[hsl(var(--warning))]"
                          )}>
                            {incident.severity}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-foreground leading-snug line-clamp-2">
                          {incident.title}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span className="whitespace-nowrap">{STATUS_LABELS[incident.status] || incident.status}</span>
                          <span className="whitespace-nowrap font-mono tabular-nums">{formatAge(incident.age_hours)}</span>
                          <span className={cn("whitespace-nowrap", slaConfig.className)}>{slaConfig.label}</span>
                          {incident.assignee_name ? (
                            <span className="truncate max-w-[160px]">{incident.assignee_name}</span>
                          ) : (
                            <span className="text-destructive/80 italic">Unassigned</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Desktop: Dense table, no wasted whitespace */}
      <div className="hidden md:block">
        <ScrollArea className="max-h-[360px]">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed min-w-[760px]">
              <colgroup>
                <col style={{ width: '92px' }} />
                <col />
                <col style={{ width: '84px' }} />
                <col style={{ width: '110px' }} />
                <col style={{ width: '72px' }} />
                <col style={{ width: '160px' }} />
                <col style={{ width: '96px' }} />
              </colgroup>
              <thead className="bg-muted/50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                    Summary
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                    Severity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                    Age
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                    Assignee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                    SLA
                  </th>
                </tr>
              </thead>
              <tbody>
                {incidents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-sm">
                      {emptyMessage}
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
                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-medium text-[var(--brand-primary)] whitespace-nowrap">
                              {incident.incident_key}
                            </span>
                            {incident.is_major_incident && (
                              <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase bg-destructive/10 text-destructive rounded">
                                M
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-middle min-w-0">
                          <span className="text-sm text-foreground leading-snug line-clamp-1 lg:line-clamp-2">
                            {incident.title}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-middle whitespace-nowrap">
                          <span className={cn(
                            "text-sm font-semibold",
                            incident.severity === 'SEV1' && "text-destructive",
                            incident.severity === 'SEV2' && "text-[hsl(var(--warning))]"
                          )}>
                            {incident.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-middle whitespace-nowrap">
                          <span className="text-sm text-foreground">
                            {STATUS_LABELS[incident.status] || incident.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-middle whitespace-nowrap">
                          <span className={cn(
                            "text-sm font-mono tabular-nums",
                            incident.age_hours > 168 && "text-destructive font-medium",
                            incident.age_hours > 72 && incident.age_hours <= 168 && "text-[hsl(var(--warning))]",
                            incident.age_hours <= 72 && "text-muted-foreground"
                          )}>
                            {formatAge(incident.age_hours)}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-middle min-w-0">
                          {incident.assignee_name ? (
                            <span className="text-sm text-foreground truncate block">
                              {incident.assignee_name}
                            </span>
                          ) : (
                            <span className="text-sm text-destructive/80 italic whitespace-nowrap">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-middle whitespace-nowrap">
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
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

export function RequiresAttentionTabs({ incidents, onRowClick }: RequiresAttentionTabsProps) {
  const [activeTab, setActiveTab] = useState<AttentionTab>('major');

  // Filter incidents by tab
  const majorIncidents = incidents.filter(i => 
    i.is_major_incident && !['resolved', 'closed'].includes(i.status)
  );
  const breachedIncidents = incidents.filter(i => 
    i.sla_state.state === 'breached' && !['resolved', 'closed'].includes(i.status)
  );
  const committeeIncidents = incidents.filter(i => 
    i.status === 'to_committee'
  );
  const unassignedIncidents = incidents.filter(i => 
    !i.assignee_name && !['resolved', 'closed'].includes(i.status)
  );

  const tabCounts: Record<AttentionTab, number> = {
    major: majorIncidents.length,
    breached: breachedIncidents.length,
    committee: committeeIncidents.length,
    unassigned: unassignedIncidents.length,
  };

  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
        Requires Attention
      </h2>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AttentionTab)}>
        <TabsList className="mb-4 p-1 bg-muted/40 border border-border h-10">
          {TABS_CONFIG.map(tab => {
            const Icon = tab.icon;
            const count = tabCounts[tab.value];
            const hasItems = count > 0;
            
            return (
              <TabsTrigger 
                key={tab.value} 
                value={tab.value} 
                className={cn(
                  "px-4 py-2 text-sm font-medium gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm",
                  hasItems && tab.value === 'breached' && "data-[state=active]:text-destructive",
                  hasItems && tab.value === 'major' && "data-[state=active]:text-destructive"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                <span className={cn(
                  "ml-1 px-1.5 py-0.5 text-xs rounded-full tabular-nums",
                  hasItems 
                    ? (tab.value === 'breached' || tab.value === 'major') 
                      ? "bg-destructive/10 text-destructive" 
                      : "bg-muted text-muted-foreground"
                    : "bg-muted/50 text-muted-foreground"
                )}>
                  {count}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="major" className="mt-0">
          <IncidentTable 
            incidents={majorIncidents} 
            onRowClick={onRowClick}
            emptyMessage="No major incidents at this time"
          />
        </TabsContent>

        <TabsContent value="breached" className="mt-0">
          <IncidentTable 
            incidents={breachedIncidents} 
            onRowClick={onRowClick}
            emptyMessage="No SLA breaches — all incidents on track"
          />
        </TabsContent>

        <TabsContent value="committee" className="mt-0">
          <IncidentTable 
            incidents={committeeIncidents} 
            onRowClick={onRowClick}
            emptyMessage="No incidents pending committee review"
          />
        </TabsContent>

        <TabsContent value="unassigned" className="mt-0">
          <IncidentTable 
            incidents={unassignedIncidents} 
            onRowClick={onRowClick}
            emptyMessage="All incidents are assigned"
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}
