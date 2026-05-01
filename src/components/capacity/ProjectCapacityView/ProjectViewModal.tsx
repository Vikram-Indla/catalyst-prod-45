/**
 * Project View Modal - Catalyst View 2
 * Detailed view of project staffing with department breakdown and resource list
 */

import { X, Building2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { ProjectUtilization, PeriodRange } from './types';
import { getStaffingStatusConfig, formatFTE, getProjectColor } from './utils';

interface ProjectViewModalProps {
  open: boolean;
  onClose: () => void;
  utilization: ProjectUtilization | null;
  periodRange: PeriodRange;
  onResourceClick?: (resourceId: string) => void;
}

export function ProjectViewModal({ open, onClose, utilization, periodRange, onResourceClick }: ProjectViewModalProps) {
  if (!utilization) return null;

  const { project, totalCommitted, totalForecast, totalFTE, requiredFTE, resources, deptBreakdown, status } = utilization;
  const statusConfig = getStaffingStatusConfig(status);
  const projectColor = getProjectColor(project.name, project.color);
  
  const committedFTE = totalCommitted / 100;
  const forecastFTE = totalForecast / 100;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: projectColor }}
            />
            <DialogTitle className="text-lg font-semibold">{project.name}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {/* Period & Status Header */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="text-sm text-muted-foreground">
              Period: <span className="font-medium text-foreground">{periodRange.label}</span>
            </div>
            <span className={cn(
              "text-xs font-semibold px-2.5 py-1 rounded uppercase tracking-wide",
              statusConfig.bgClass,
              statusConfig.textClass
            )}>
              {statusConfig.label}
            </span>
          </div>

          {/* FTE Summary Cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-foreground">{resources.length}</div>
              <div className="text-xs text-muted-foreground">Resources</div>
            </div>
            <div className="bg-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))]/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))]">{formatFTE(committedFTE)}</div>
              <div className="text-xs text-muted-foreground">Committed FTE</div>
            </div>
            <div className="bg-amber-500/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-amber-600">{formatFTE(forecastFTE)}</div>
              <div className="text-xs text-muted-foreground">Forecast FTE</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-foreground">{formatFTE(requiredFTE)}</div>
              <div className="text-xs text-muted-foreground">Required FTE</div>
            </div>
          </div>

          {/* Staffing Progress Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Staffing Level</span>
              <span className="text-sm text-muted-foreground">
                {formatFTE(totalFTE)} / {formatFTE(requiredFTE)} FTE
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden flex">
              <div
                className="h-full bg-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))] transition-all"
                style={{ width: `${Math.min((committedFTE / requiredFTE) * 100, 100)}%` }}
              />
              <div
                className="h-full bg-amber-500 transition-all"
                style={{ width: `${Math.min((forecastFTE / requiredFTE) * 100, 100 - (committedFTE / requiredFTE) * 100)}%` }}
              />
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))]" />
                <span>Committed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Forecast</span>
              </div>
            </div>
          </div>

          {/* Department Breakdown */}
          {Object.keys(deptBreakdown).length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Department Breakdown
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(deptBreakdown).map(([dept, count]) => (
                  <div
                    key={dept}
                    className="bg-muted/30 rounded-lg p-2.5 text-center"
                  >
                    <div className="text-lg font-bold text-foreground">{count}</div>
                    <div className="text-xs text-muted-foreground truncate">{dept}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resource List */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Assigned Resources</h4>
            <div className="space-y-2">
              {resources.map((resource) => {
                const initials = resource.resource_name
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase();

                return (
                  <button
                    key={resource.resource_id}
                    className="flex items-center gap-3 p-2.5 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors w-full text-left cursor-pointer"
                    onClick={() => onResourceClick?.(resource.resource_id)}
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">
                        {resource.resource_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {resource.role_name || 'No role'} • {resource.department || 'No dept'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {resource.committed > 0 && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))]/10 text-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))]">
                          {resource.committed}% committed
                        </span>
                      )}
                      {resource.forecast > 0 && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-600">
                          {resource.forecast}% forecast
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
              
              {resources.length === 0 && (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  No resources assigned in this period
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
