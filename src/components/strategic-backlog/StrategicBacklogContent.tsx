/**
 * Strategic Backlog Content - CLAUDE NUCLEAR OVERWRITE
 * Main content area with tabs, coverage panel, and table
 */
import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Layers, Target, Box, AlertTriangle, Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { ViewType, StrategicItem } from '@/pages/enterprise/StrategicBacklog';

interface ContentProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  stats: {
    themes: number;
    themesWithObjectives: number;
    themesWithObjectivesPercent: number;
    objectives: number;
    epics: number;
  };
  filteredData: StrategicItem[];
  selectedItem: StrategicItem | null;
  onSelectItem: (item: StrategicItem) => void;
}

// Status badge styling matching Claude HTML
function getStatusBadge(status: string, isDark = false) {
  const styles: Record<string, string> = {
    active: isDark 
      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
      : 'bg-emerald-50 text-emerald-700 border-emerald-200',
    draft: isDark 
      ? 'bg-slate-500/20 text-slate-300 border-slate-500/30' 
      : 'bg-slate-100 text-slate-600 border-slate-200',
    archived: isDark 
      ? 'bg-stone-500/20 text-stone-400 border-stone-500/30' 
      : 'bg-stone-100 text-stone-500 border-stone-200',
  };
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-1 text-[11px] font-medium rounded border",
      styles[status] || styles.draft
    )}>
      {label}
    </span>
  );
}

function formatDate(dateStr: string) {
  return format(new Date(dateStr), 'MMM d, yyyy');
}

export function StrategicBacklogContent({
  currentView,
  onViewChange,
  searchQuery,
  onSearchChange,
  stats,
  filteredData,
  selectedItem,
  onSelectItem,
}: ContentProps) {
  // View tabs configuration
  const views = [
    { id: 'themes' as const, label: 'Themes', count: stats.themes, icon: Layers },
    { id: 'objectives' as const, label: 'Objectives', count: stats.objectives, icon: Target },
    { id: 'epics' as const, label: 'Epics', count: stats.epics, icon: Box },
  ];

  // Coverage panel metrics
  const coverageMetrics = [
    {
      id: 'themes',
      label: 'Themes',
      icon: Layers,
      count: stats.themes,
      sublabel: `${stats.themesWithObjectives} with objectives (${stats.themesWithObjectivesPercent}%)`,
      hasWarning: stats.themesWithObjectivesPercent < 100,
    },
    {
      id: 'objectives',
      label: 'Objectives',
      icon: Target,
      count: stats.objectives,
      hasWarning: stats.objectives === 0,
    },
    {
      id: 'epics',
      label: 'Epics aligned',
      icon: Box,
      count: stats.epics,
      hasWarning: stats.epics === 0,
    },
  ];

  const searchPlaceholder = `Search ${currentView}...`;

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-6 p-4 lg:p-6">
      {/* Left: Coverage & Gaps Panel */}
      <div className="lg:w-72 flex-shrink-0">
        <div className="bg-catalyst-surface border border-catalyst-border rounded-lg p-4">
          <h3 className="text-xs font-semibold text-catalyst-text-muted uppercase tracking-wider mb-4">
            Coverage & Gaps
          </h3>
          
          <div className="space-y-4">
            {coverageMetrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-catalyst-surface-hover flex items-center justify-center text-catalyst-text-muted">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-catalyst-text">{metric.label}</span>
                        <span className="text-sm text-catalyst-text-muted">{metric.count}</span>
                      </div>
                      {metric.sublabel && (
                        <div className="text-xs text-catalyst-text-muted">{metric.sublabel}</div>
                      )}
                    </div>
                  </div>
                  {metric.hasWarning ? (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  ) : (
                    <Check className="h-4 w-4 text-emerald-500" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: Table Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* View Tabs */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2 -mb-2">
          {views.map((view) => {
            const Icon = view.icon;
            const isActive = currentView === view.id;
            return (
              <button
                key={view.id}
                onClick={() => onViewChange(view.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap",
                  isActive 
                    ? "bg-catalyst-surface-hover text-catalyst-text" 
                    : "text-catalyst-text-muted hover:text-catalyst-text hover:bg-catalyst-surface-hover/50"
                )}
              >
                <span className={isActive ? "text-catalyst-green" : "text-catalyst-text-muted"}>
                  <Icon className="h-5 w-5" />
                </span>
                {view.label}
                <span className={cn(
                  "px-1.5 py-0.5 text-xs rounded",
                  isActive 
                    ? "bg-catalyst-green/20 text-catalyst-green" 
                    : "bg-catalyst-border text-catalyst-text-muted"
                )}>
                  {view.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-catalyst-text-muted" />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-catalyst-surface border-catalyst-border rounded-lg text-sm text-catalyst-text placeholder:text-catalyst-text-muted focus:ring-2 focus:ring-catalyst-gold/50 focus:border-catalyst-gold"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-catalyst-surface border border-catalyst-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-catalyst-surface-hover border-b border-catalyst-border">
                <tr>
                  {currentView === 'themes' && (
                    <>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-catalyst-text-muted uppercase tracking-wider">
                        <button className="flex items-center gap-1 hover:text-catalyst-text">
                          Theme
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="m18 15-6-6-6 6"/>
                          </svg>
                        </button>
                      </th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-catalyst-text-muted uppercase tracking-wider">State</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-catalyst-text-muted uppercase tracking-wider">Objectives</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-catalyst-text-muted uppercase tracking-wider">Updated</th>
                      <th className="w-10"></th>
                    </>
                  )}
                  {currentView === 'objectives' && (
                    <>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-catalyst-text-muted uppercase tracking-wider">Objective</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-catalyst-text-muted uppercase tracking-wider">Theme</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-catalyst-text-muted uppercase tracking-wider">State</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-catalyst-text-muted uppercase tracking-wider">KRs</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-catalyst-text-muted uppercase tracking-wider">Progress</th>
                      <th className="w-10"></th>
                    </>
                  )}
                  {currentView === 'epics' && (
                    <>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-catalyst-text-muted uppercase tracking-wider">Epic</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-catalyst-text-muted uppercase tracking-wider">Objective</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-catalyst-text-muted uppercase tracking-wider">State</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-catalyst-text-muted uppercase tracking-wider">Features</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-catalyst-text-muted uppercase tracking-wider">Priority</th>
                      <th className="w-10"></th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-catalyst-border">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={currentView === 'themes' ? 5 : 6} className="px-4 py-12 text-center">
                      <div className="text-catalyst-text-muted">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-catalyst-surface-hover flex items-center justify-center">
                          {currentView === 'themes' && <Layers className="h-6 w-6" />}
                          {currentView === 'objectives' && <Target className="h-6 w-6" />}
                          {currentView === 'epics' && <Box className="h-6 w-6" />}
                        </div>
                        <p className="font-medium text-catalyst-text mb-1">
                          {searchQuery ? 'No results found' : `No ${currentView} found`}
                        </p>
                        <p className="text-sm">
                          {searchQuery 
                            ? 'Try adjusting your search terms.' 
                            : currentView === 'themes' 
                              ? 'Themes define the strategic pillars that guide your portfolio.'
                              : currentView === 'objectives'
                                ? 'Objectives translate themes into measurable outcomes.'
                                : 'Epics are the deliverable initiatives that fulfill your objectives.'
                          }
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => onSelectItem(item)}
                      className={cn(
                        "hover:bg-catalyst-surface-hover cursor-pointer transition-colors",
                        selectedItem?.id === item.id && "bg-catalyst-surface-hover border-l-2 border-l-catalyst-gold"
                      )}
                    >
                      {currentView === 'themes' && (
                        <>
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium text-catalyst-text">{item.name}</span>
                          </td>
                          <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 text-sm text-catalyst-text-muted">
                              <Target className="h-4 w-4" />
                              {item.objectives}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-catalyst-text-muted">{formatDate(item.updatedAt)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <ChevronRight className="h-4 w-4 text-catalyst-text-muted" />
                          </td>
                        </>
                      )}
                      {currentView === 'objectives' && (
                        <>
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium text-catalyst-text">{item.name}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-catalyst-text-muted">{item.theme || 'Unlinked'}</span>
                          </td>
                          <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-catalyst-text-muted">{item.keyResults}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 w-24">
                              <div className="flex-1 h-1.5 bg-catalyst-border rounded-full overflow-hidden">
                                <div 
                                  className="bg-catalyst-green h-full rounded-full" 
                                  style={{ width: `${item.progress}%` }}
                                />
                              </div>
                              <span className="text-xs text-catalyst-text-muted">{item.progress}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <ChevronRight className="h-4 w-4 text-catalyst-text-muted" />
                          </td>
                        </>
                      )}
                      {currentView === 'epics' && (
                        <>
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium text-catalyst-text">{item.name}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-catalyst-text-muted">{item.objective}</span>
                          </td>
                          <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-catalyst-text-muted">{item.features}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "text-sm",
                              item.priority === 'High' ? 'text-rose-400' : 
                              item.priority === 'Medium' ? 'text-amber-400' : 
                              'text-catalyst-text-muted'
                            )}>
                              {item.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <ChevronRight className="h-4 w-4 text-catalyst-text-muted" />
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
