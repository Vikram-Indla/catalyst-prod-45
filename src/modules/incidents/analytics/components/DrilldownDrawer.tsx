/**
 * Drilldown Drawer
 * Right-side drawer for filtered incident lists
 * Complete enterprise look with proper header, controls, and table
 */

import { X, ArrowLeft, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  on_track: { label: 'On Track', className: 'text-foreground' },
  at_risk: { label: 'At Risk', className: 'text-[hsl(var(--warning))] font-medium' },
  breached: { label: 'Breached', className: 'text-destructive font-medium' },
  n_a: { label: 'N/A', className: 'text-muted-foreground' },
  met: { label: 'Met', className: 'text-foreground' },
};

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  today: 'Today',
  '24h': '24h',
  '7d': '7D',
  '30d': '30D',
  custom: 'Custom',
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
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-background/60 z-40"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-[480px] max-w-[90vw]",
          "bg-background border-l border-border shadow-xl z-50",
          "flex flex-col"
        )}
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-border bg-card">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-foreground">Filtered Incidents</h2>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 -mr-1">
                <X className="h-4 w-4" />
              </Button>
            </div>
            {/* Context Chips */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs font-medium">
                {filter.label}
              </Badge>
              <span className="text-muted-foreground">•</span>
              <Badge variant="outline" className="text-xs">
                {TIME_RANGE_LABELS[timeRange]}
              </Badge>
              <span className="text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground font-medium">
                {incidents.length} incident{incidents.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          {/* Actions */}
          <div className="px-4 py-2 border-t border-border flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClear} className="h-7 text-xs">
              <RotateCcw className="h-3 w-3 mr-1.5" />
              Clear
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-7 text-xs">
              <ArrowLeft className="h-3 w-3 mr-1.5" />
              Back to Analytics
            </Button>
          </div>
        </div>

        {/* Table - fills remaining space */}
        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-muted/50 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border">
                  ID
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border">
                  Summary
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border w-[56px]">
                  Sev
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border w-[70px]">
                  Status
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border w-[44px]">
                  Age
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border w-[70px]">
                  SLA
                </th>
              </tr>
            </thead>
            <tbody>
              {incidents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-12 text-center text-muted-foreground text-sm">
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
                      <td className="px-3 py-2">
                        <span className="font-mono text-xs font-medium text-[var(--brand-primary)]">
                          {incident.incident_key}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs text-foreground line-clamp-1">
                          {incident.title}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs text-foreground font-medium">
                          {incident.severity}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs text-foreground">
                          {STATUS_LABELS[incident.status] || incident.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs font-mono tabular-nums text-muted-foreground">
                          {formatAge(incident.age_hours)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={cn("text-xs", slaConfig.className)}>
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
      </div>
    </>
  );
}
