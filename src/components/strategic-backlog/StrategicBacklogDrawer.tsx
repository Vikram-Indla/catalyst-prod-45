/**
 * Strategic Backlog Drawer - CLAUDE NUCLEAR OVERWRITE
 * Slide-in detail panel matching Claude HTML exactly
 */
import { X, ExternalLink, FileText, Target, Layers, Box } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ViewType, StrategicItem } from '@/pages/enterprise/StrategicBacklog';

interface DrawerProps {
  open: boolean;
  item: StrategicItem | null;
  currentView: ViewType;
  onClose: () => void;
}

// Status badge matching Claude HTML
function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    draft: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    archived: 'bg-stone-500/20 text-stone-400 border-stone-500/30',
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

export function StrategicBacklogDrawer({ open, item, currentView, onClose }: DrawerProps) {
  if (!open || !item) return null;

  const isTheme = currentView === 'themes';
  const isObjective = currentView === 'objectives';
  const isEpic = currentView === 'epics';

  const typeLabel = isTheme ? 'Theme' : isObjective ? 'Objective' : 'Epic';
  const description = isTheme 
    ? 'Strategic initiative focused on driving organizational transformation.'
    : isObjective 
      ? 'Measurable outcome that contributes to the parent theme goals.'
      : 'Deliverable work package that supports the parent objective.';

  return (
    <div className="fixed inset-0 z-50 lg:relative lg:inset-auto">
      {/* Backdrop for mobile */}
      <div 
        className="absolute inset-0 bg-black/60 lg:hidden" 
        onClick={onClose}
      />
      
      {/* Drawer Panel */}
      <div className={cn(
        "absolute right-0 top-0 w-full max-w-md h-full",
        "bg-catalyst-surface border-l border-catalyst-border shadow-xl",
        "lg:relative lg:w-96 lg:max-w-none",
        "overflow-y-auto",
        "animate-in slide-in-from-right duration-200"
      )}>
        {/* Header */}
        <div className="sticky top-0 bg-catalyst-surface border-b border-catalyst-border p-4 z-10">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              <div className="text-xs font-semibold text-catalyst-text-muted uppercase tracking-wider mb-1">
                {typeLabel}
              </div>
              <h2 className="text-lg font-semibold text-catalyst-text">{item.name}</h2>
              <div className="flex items-center gap-2 mt-2">
                {getStatusBadge(item.status)}
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-catalyst-surface-hover text-catalyst-text-muted hover:text-catalyst-text transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-6">
          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-catalyst-text-muted uppercase tracking-wider">
              Description
            </label>
            <p className="mt-2 text-sm text-catalyst-text-muted">
              {description}
            </p>
          </div>

          {/* Theme-specific: Linked Objectives */}
          {isTheme && (
            <div>
              <label className="text-xs font-semibold text-catalyst-text-muted uppercase tracking-wider">
                Linked Objectives
              </label>
              <div className="mt-3 text-center py-6 bg-catalyst-surface-hover rounded-lg">
                <Target className="h-5 w-5 mx-auto text-catalyst-text-muted" />
                <p className="text-sm text-catalyst-text-muted mt-2">
                  {item.objectives} objectives linked
                </p>
              </div>
            </div>
          )}

          {/* Objective-specific: Progress */}
          {isObjective && (
            <div>
              <label className="text-xs font-semibold text-catalyst-text-muted uppercase tracking-wider">
                Progress
              </label>
              <div className="mt-3 p-4 bg-catalyst-surface-hover rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-catalyst-text-muted">{item.keyResults} Key Results</span>
                  <span className="text-lg font-semibold text-catalyst-text">{item.progress}%</span>
                </div>
                <div className="h-2 bg-catalyst-border rounded-full overflow-hidden">
                  <div 
                    className="bg-catalyst-green h-full rounded-full" 
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Epic-specific: Work Items */}
          {isEpic && (
            <div>
              <label className="text-xs font-semibold text-catalyst-text-muted uppercase tracking-wider">
                Work Items
              </label>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="p-3 bg-catalyst-surface-hover rounded-lg text-center">
                  <div className="text-xl font-semibold text-catalyst-text">{item.features}</div>
                  <div className="text-xs text-catalyst-text-muted">Features</div>
                </div>
                <div className="p-3 bg-catalyst-surface-hover rounded-lg text-center">
                  <div className="text-xl font-semibold text-catalyst-text">{item.stories}</div>
                  <div className="text-xs text-catalyst-text-muted">Stories</div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div>
            <label className="text-xs font-semibold text-catalyst-text-muted uppercase tracking-wider mb-3 block">
              Quick Actions
            </label>
            <div className="space-y-2">
              <button className="w-full flex items-center gap-3 px-4 py-3 border border-catalyst-border rounded-lg hover:bg-catalyst-surface-hover transition-all group text-left">
                <ExternalLink className="h-4 w-4 text-catalyst-text-muted group-hover:text-catalyst-green" />
                <span className="text-sm font-medium text-catalyst-text">View in Strategy Room</span>
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 border border-catalyst-border rounded-lg hover:bg-catalyst-surface-hover transition-all group text-left">
                <FileText className="h-4 w-4 text-catalyst-text-muted group-hover:text-catalyst-green" />
                <span className="text-sm font-medium text-catalyst-text">Export to PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
