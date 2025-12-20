/**
 * Drilldown Drawer
 * Full-height premium drawer for filtered incident lists
 * Enterprise-grade table with proper header and controls
 */

import { X, ArrowLeft, RotateCcw, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  at_risk: { label: 'At Risk', className: 'text-[hsl(var(--warning))] font-semibold' },
  breached: { label: 'Breached', className: 'text-destructive font-semibold' },
  n_a: { label: 'N/A', className: 'text-muted-foreground' },
  met: { label: 'Met', className: 'text-foreground' },
};

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  today: 'Today',
  '24h': '24 Hours',
  '7d': '7 Days',
  '30d': '30 Days',
  custom: 'Custom Range',
};

function formatAge(hours: number): string {
  if (hours < 1) return '<1h';
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  if (remainingHours === 0) return `${days}d`;
  return `${days}d ${remainingHours}h`;
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
  const navigate = useNavigate();
  
  if (!isOpen || !filter) return null;

  const handleOpenInList = () => {
    // Navigate to incident list with filter preserved
    navigate('/release/incidents');
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-background/70 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-[560px] max-w-[95vw]",
          "bg-background border-l border-border shadow-2xl z-50",
          "flex flex-col animate-in slide-in-from-right duration-300"
        )}
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-border bg-card">
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-foreground">Filtered Incidents</h2>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 -mr-2">
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Context Chips */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-sm font-medium px-3 py-1">
                {filter.label}
              </Badge>
              <span className="text-muted-foreground text-sm">•</span>
              <Badge variant="outline" className="text-sm px-3 py-1">
                {TIME_RANGE_LABELS[timeRange]}
              </Badge>
              <span className="text-muted-foreground text-sm">•</span>
              <span className="text-sm text-muted-foreground font-medium tabular-nums">
                {incidents.length} incident{incidents.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          
          {/* Actions Bar */}
          <div className="px-5 py-3 border-t border-border flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onClear} className="h-8 text-sm">
              <RotateCcw className="h-3.5 w-3.5 mr-2" />
              Clear Filter
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 text-sm">
              <ArrowLeft className="h-3.5 w-3.5 mr-2" />
              Back
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleOpenInList} 
              className="h-8 text-sm ml-auto"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-2" />
              Open in List
            </Button>
          </div>
        </div>

        {/* Table - fills remaining space */}
        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-muted/50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border w-[100px]">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                  Summary
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border w-[64px]">
                  Sev
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border w-[90px]">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border w-[60px]">
                  Age
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border w-[80px]">
                  SLA
                </th>
              </tr>
            </thead>
            <tbody>
              {incidents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="text-muted-foreground">
                      <p className="text-sm font-medium">No incidents match this filter</p>
                      <p className="text-xs mt-1 opacity-70">Try adjusting your selection</p>
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
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-sm font-medium text-[var(--brand-primary)]">
                            {incident.incident_key}
                          </span>
                          {incident.is_major_incident && (
                            <span className="px-1 py-0.5 text-[9px] font-bold uppercase bg-destructive/10 text-destructive rounded">
                              M
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span className="text-sm text-foreground leading-snug line-clamp-2">
                          {incident.title}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span className={cn(
                          "text-sm font-semibold",
                          incident.severity === 'SEV1' && "text-destructive",
                          incident.severity === 'SEV2' && "text-[hsl(var(--warning))]"
                        )}>
                          {incident.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span className="text-sm text-foreground">
                          {STATUS_LABELS[incident.status] || incident.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span className="text-sm font-mono tabular-nums text-muted-foreground">
                          {formatAge(incident.age_hours)}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle">
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
      </div>
    </>
  );
}
