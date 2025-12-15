/**
 * Strategic Backlog Drawer
 * Slide-in detail panel from right side
 */
import { X, ExternalLink, FileText, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ViewType, StrategicItem } from '@/pages/enterprise/StrategicBacklog';

interface DrawerProps {
  open: boolean;
  item: StrategicItem | null;
  currentView: ViewType;
  onClose: () => void;
}

// Status badge
function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    active: 'bg-[var(--status-success-bg)] text-[var(--status-success)] border-[var(--status-success)]/30',
    draft: 'bg-[var(--surface-hover)] text-[var(--text-secondary)] border-[var(--border-default)]',
    archived: 'bg-[var(--surface-hover)] text-[var(--text-muted)] border-[var(--border-default)]',
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
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black/50" 
        onClick={onClose}
      />
      
      {/* Drawer Panel - Fixed to right side of viewport */}
      <div className={cn(
        "fixed top-0 right-0 z-50 h-full w-[360px]",
        "bg-[var(--surface-bg)] border-l border-[var(--border-default)]",
        "shadow-xl overflow-y-auto",
        "animate-in slide-in-from-right duration-200"
      )}>
        {/* Header */}
        <div className="sticky top-0 bg-[var(--surface-bg)] border-b border-[var(--border-default)] p-4 z-10">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                {typeLabel}
              </div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">{item.name}</h2>
              <div className="flex items-center gap-2 mt-2">
                {getStatusBadge(item.status)}
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-6">
          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Description
            </label>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {description}
            </p>
          </div>

          {/* Theme-specific: Linked Objectives */}
          {isTheme && (
            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Linked Objectives
              </label>
              <div className="mt-3 text-center py-6 bg-[var(--surface-hover)] rounded-lg border border-[var(--border-default)]">
                <Target className="h-5 w-5 mx-auto text-[var(--text-muted)]" />
                <p className="text-sm text-[var(--text-secondary)] mt-2">
                  {item.objectives} objectives linked
                </p>
              </div>
            </div>
          )}

          {/* Objective-specific: Progress */}
          {isObjective && (
            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Progress
              </label>
              <div className="mt-3 p-4 bg-[var(--surface-hover)] rounded-lg border border-[var(--border-default)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[var(--text-secondary)]">{item.keyResults} Key Results</span>
                  <span className="text-lg font-semibold text-[var(--text-primary)]">{item.progress}%</span>
                </div>
                <div className="h-2 bg-[var(--border-default)] rounded-full overflow-hidden">
                  <div 
                    className="bg-[var(--accent-green)] h-full rounded-full" 
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Epic-specific: Work Items */}
          {isEpic && (
            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Work Items
              </label>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="p-3 bg-[var(--surface-hover)] rounded-lg border border-[var(--border-default)] text-center">
                  <div className="text-xl font-semibold text-[var(--text-primary)]">{item.features}</div>
                  <div className="text-xs text-[var(--text-muted)]">Features</div>
                </div>
                <div className="p-3 bg-[var(--surface-hover)] rounded-lg border border-[var(--border-default)] text-center">
                  <div className="text-xl font-semibold text-[var(--text-primary)]">{item.stories}</div>
                  <div className="text-xs text-[var(--text-muted)]">Stories</div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3 block">
              Quick Actions
            </label>
            <div className="space-y-2">
              <button className="w-full flex items-center gap-3 px-4 py-3 border border-[var(--border-default)] rounded-lg hover:bg-[var(--surface-hover)] transition-all group text-left">
                <ExternalLink className="h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--accent-green)]" />
                <span className="text-sm font-medium text-[var(--text-primary)]">View in Strategy Room</span>
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 border border-[var(--border-default)] rounded-lg hover:bg-[var(--surface-hover)] transition-all group text-left">
                <FileText className="h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--accent-green)]" />
                <span className="text-sm font-medium text-[var(--text-primary)]">Export to PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
