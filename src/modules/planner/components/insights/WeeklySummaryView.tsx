// ============================================================
// WEEKLY SUMMARY VIEW - Operational Dashboard
// Uses ONLY real data from database - NO MOCK DATA
// ============================================================

import { format } from 'date-fns';
import { 
  FileText, Download, Rocket, AlertTriangle, Bug, 
  GitBranch, BarChart3, TrendingUp, TrendingDown, Inbox
} from 'lucide-react';
import { useWeeklyInsightsData } from '../../hooks/useInsightsData';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    'resolved': 'bg-emerald-100 text-emerald-700',
    'fixed': 'bg-emerald-100 text-emerald-700',
    'done': 'bg-emerald-100 text-emerald-700',
    'open': 'bg-slate-100 text-slate-600',
    'investigating': 'bg-amber-100 text-amber-700',
    'in-progress': 'bg-blue-100 text-blue-700',
    'in-dev': 'bg-blue-100 text-blue-700',
    'in-qa': 'bg-purple-100 text-purple-700',
    'blocked': 'bg-red-100 text-red-700',
    'approved': 'bg-emerald-100 text-emerald-700',
    'pending': 'bg-amber-100 text-amber-700',
    'rejected': 'bg-red-100 text-red-700',
    'draft': 'bg-slate-100 text-slate-600',
  };
  
  return (
    <span className={cn(
      'px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase',
      styles[status?.toLowerCase()] || 'bg-slate-100 text-slate-600'
    )}>
      {(status || 'unknown').replace('-', ' ')}
    </span>
  );
}

// Empty state component
function EmptyState({ title, icon: Icon }: { title: string; icon: any }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #878787))]">
      <Icon className="w-8 h-8 mb-2" />
      <p className="text-sm">No {title} this week</p>
    </div>
  );
}

export function WeeklySummaryView() {
  const { data, isLoading, error } = useWeeklyInsightsData();

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full text-slate-500 dark:text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #878787))] dark:text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #A1A1A1))]">
        <AlertTriangle className="w-12 h-12 mb-4 text-amber-500" />
        <p>Failed to load weekly insights data</p>
      </div>
    );
  }

  const { period, releases, incidents, defects, stories } = data;
  const dateRange = `${format(period.start, 'MMM d')} - ${format(period.end, 'MMM d, yyyy')}`;

  // Calculate statistics from real data
  const headerKPIs = [
    { label: 'Stories Added', value: stories.length },
    { label: 'Releases', value: releases.length },
    { label: 'Incidents', value: incidents.length },
  ];

  // KPI Strip data from real counts
  const kpiStrip = [
    { label: 'Stories', value: stories.length, colorClass: 'text-slate-800 dark:text-[var(--ds-text,var(--ds-text, #EDEDED))]' },
    { label: 'Releases', value: releases.length, colorClass: 'text-emerald-600', highlight: releases.length > 0 },
    { label: 'Incidents', value: incidents.length, colorClass: incidents.length > 0 ? 'text-amber-600' : 'text-slate-800 dark:text-[var(--ds-text,var(--ds-text, #EDEDED))]' },
    { label: 'Defects', value: defects.length, colorClass: defects.length > 0 ? 'text-red-600' : 'text-slate-800 dark:text-[var(--ds-text,var(--ds-text, #EDEDED))]' },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="p-6 bg-slate-100 dark:bg-[var(--ds-surface,var(--ds-surface, #0A0A0A))] min-h-full">
        {/* Dashboard Header - Slate Gradient */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 rounded-xl px-8 py-6 text-white mb-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold mb-1">Weekly Summary</h1>
              <p className="text-sm opacity-90">{dateRange}</p>
            </div>
            <div className="flex gap-8">
              {headerKPIs.map(kpi => (
                <div key={kpi.label} className="text-center">
                  <div className="text-3xl font-extrabold">{kpi.value}</div>
                  <div className="text-[10px] uppercase tracking-wide opacity-85 mt-1">{kpi.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {kpiStrip.map(kpi => (
            <div 
              key={kpi.label}
              className={cn(
                "bg-white dark:bg-[var(--ds-surface-raised,var(--ds-surface-raised, #1A1A1A))] rounded-lg p-4 border border-slate-200 dark:border-[var(--ds-border,var(--ds-border, #2E2E2E))] text-center transition-all hover:-translate-y-0.5 hover:shadow-md",
                kpi.highlight && "border-emerald-400 bg-emerald-50"
              )}
            >
              <div className={cn("text-3xl font-extrabold", kpi.colorClass)}>{kpi.value}</div>
              <div className="text-[10px] font-semibold text-slate-500 dark:text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #878787))] uppercase mt-1.5">{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Dashboard Grid - 2 columns */}
        <div className="grid grid-cols-2 gap-4">
          {/* Releases Card */}
          <div className="bg-white dark:bg-[var(--ds-surface-raised,var(--ds-surface-raised, #1A1A1A))] rounded-xl border border-slate-200 dark:border-[var(--ds-border,var(--ds-border, #2E2E2E))] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[var(--ds-border,var(--ds-border, #2E2E2E))]">
              <div className="flex items-center gap-2">
                <Rocket className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-800 dark:text-[var(--ds-text,var(--ds-text, #EDEDED))]">Releases</h3>
              </div>
              <span className="text-xs text-slate-500 dark:text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #878787))]">{releases.length} this week</span>
            </div>
            <div className="p-4 space-y-3">
              {releases.length === 0 ? (
                <EmptyState title="releases" icon={Rocket} />
              ) : (
                releases.slice(0, 5).map((release: any) => (
                  <div key={release.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-[#111111] rounded-lg hover:bg-slate-100 dark:hover:bg-[var(--ds-surface-overlay,var(--ds-surface-overlay, #1F1F1F))] transition-colors">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-600 text-white font-bold text-xs">
                      REL
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-800 dark:text-[var(--ds-text,var(--ds-text, #EDEDED))]">
                        {release.name || release.version}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #878787))] mt-0.5">
                        {release.release_date ? format(new Date(release.release_date), 'MMM d, yyyy') : 'No date'}
                      </div>
                    </div>
                    <StatusBadge status={release.status} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Incidents Card */}
          <div className="bg-white dark:bg-[var(--ds-surface-raised,var(--ds-surface-raised, #1A1A1A))] rounded-xl border border-slate-200 dark:border-[var(--ds-border,var(--ds-border, #2E2E2E))] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[var(--ds-border,var(--ds-border, #2E2E2E))]">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-800 dark:text-[var(--ds-text,var(--ds-text, #EDEDED))]">Incidents</h3>
              </div>
              <span className="text-xs text-slate-500 dark:text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #878787))]">{incidents.length} this week</span>
            </div>
            <div className="p-4 space-y-2">
              {incidents.length === 0 ? (
                <EmptyState title="incidents" icon={AlertTriangle} />
              ) : (
                incidents.slice(0, 5).map((incident: any) => (
                  <div key={incident.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-[#111111] rounded-lg hover:bg-slate-100 dark:hover:bg-[var(--ds-surface-overlay,var(--ds-surface-overlay, #1F1F1F))] transition-colors">
                    <div className={cn(
                      "w-2.5 h-2.5 rounded-full flex-shrink-0",
                      incident.severity === 'critical' && "bg-red-500 animate-pulse",
                      incident.severity === 'high' && "bg-amber-500",
                      incident.severity === 'medium' && "bg-blue-500",
                      incident.severity === 'low' && "bg-slate-400"
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-800 dark:text-[var(--ds-text,var(--ds-text, #EDEDED))] truncate">
                        {incident.title}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #878787))] mt-0.5">
                        {incident.severity || 'Unknown'} severity
                      </div>
                    </div>
                    <StatusBadge status={incident.status} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Defects Card */}
          <div className="bg-white dark:bg-[var(--ds-surface-raised,var(--ds-surface-raised, #1A1A1A))] rounded-xl border border-slate-200 dark:border-[var(--ds-border,var(--ds-border, #2E2E2E))] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[var(--ds-border,var(--ds-border, #2E2E2E))]">
              <div className="flex items-center gap-2">
                <Bug className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-slate-800 dark:text-[var(--ds-text,var(--ds-text, #EDEDED))]">Defects</h3>
              </div>
              <span className="text-xs text-slate-500 dark:text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #878787))]">{defects.length} this week</span>
            </div>
            <div className="p-4 space-y-2">
              {defects.length === 0 ? (
                <EmptyState title="defects" icon={Bug} />
              ) : (
                defects.slice(0, 5).map((defect: any) => (
                  <div key={defect.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-[#111111] rounded-lg hover:bg-slate-100 dark:hover:bg-[var(--ds-surface-overlay,var(--ds-surface-overlay, #1F1F1F))] transition-colors">
                    <div className={cn(
                      "w-2.5 h-2.5 rounded-full flex-shrink-0",
                      defect.severity === 'critical' && "bg-red-500",
                      defect.severity === 'major' && "bg-amber-500",
                      defect.severity === 'minor' && "bg-teal-500"
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-800 dark:text-[var(--ds-text,var(--ds-text, #EDEDED))] truncate">
                        {defect.title}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #878787))] mt-0.5">
                        {defect.severity || 'Unknown'} severity
                      </div>
                    </div>
                    <StatusBadge status={defect.status} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Stories Card */}
          <div className="bg-white dark:bg-[var(--ds-surface-raised,var(--ds-surface-raised, #1A1A1A))] rounded-xl border border-slate-200 dark:border-[var(--ds-border,var(--ds-border, #2E2E2E))] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[var(--ds-border,var(--ds-border, #2E2E2E))]">
              <div className="flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-slate-800 dark:text-[var(--ds-text,var(--ds-text, #EDEDED))]">Stories</h3>
              </div>
              <span className="text-xs text-slate-500 dark:text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #878787))]">{stories.length} this week</span>
            </div>
            <div className="p-4 space-y-2">
              {stories.length === 0 ? (
                <EmptyState title="stories" icon={GitBranch} />
              ) : (
                stories.slice(0, 5).map((story: any) => (
                  <div key={story.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-[#111111] rounded-lg hover:bg-slate-100 dark:hover:bg-[var(--ds-surface-overlay,var(--ds-surface-overlay, #1F1F1F))] transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-800 dark:text-[var(--ds-text,var(--ds-text, #EDEDED))] truncate">
                        {story.title}
                      </div>
                    </div>
                    <StatusBadge status={story.status} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-6 px-2">
          <span className="text-xs text-slate-500 dark:text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #878787))]">
            Data as of {format(new Date(), 'MMM d, yyyy h:mm a')}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
