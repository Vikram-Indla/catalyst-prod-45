/**
 * ResourceWorkDrawer — Enterprise drawer showing a resource's Jira work items
 * Grouped by: This Week, This Month, Last Month
 */
import { X, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useResourceJiraWork, type JiraWorkItem } from '@/hooks/capacity/useResourceJiraWork';
import { cn } from '@/lib/utils';

interface ResourceWorkDrawerProps {
  resourceId: string | null;
  resourceName?: string;
  onClose: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  'Done': '#0d9488',
  'In Progress': '#2563eb',
  'To Do': '#64748b',
  'In Review': '#8b5cf6',
  'Blocked': '#dc2626',
};

const TYPE_COLORS: Record<string, string> = {
  'Story': '#10b981',
  'Bug': '#dc2626',
  'Task': '#2563eb',
  'Sub-task': '#6b7280',
  'Frontend': '#3b82f6',
  'Backend': '#8b5cf6',
  'Integration': '#0d9488',
  'Figma': '#ec4899',
};

function getStatusColor(status: string) {
  return STATUS_COLORS[status] || '#64748b';
}
function getTypeColor(type: string) {
  return TYPE_COLORS[type] || '#64748b';
}

function WorkItemRow({ item }: { item: JiraWorkItem }) {
  const statusColor = getStatusColor(item.status);
  const typeColor = getTypeColor(item.issue_type);

  return (
    <div className="flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors group">
      {/* Type icon */}
      <div className="mt-0.5 shrink-0">
        {item.type_icon_url ? (
          <img src={item.type_icon_url} alt={item.issue_type} className="w-4 h-4" />
        ) : (
          <div
            className="w-4 h-4 rounded-sm"
            style={{ backgroundColor: typeColor }}
          />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-muted-foreground">{item.issue_key}</span>
          <span
            className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded"
            style={{ color: statusColor, backgroundColor: `${statusColor}15` }}
          >
            {item.status}
          </span>
        </div>
        <p className="text-sm font-medium text-foreground truncate mt-0.5">{item.summary}</p>
        {item.parent_key && (
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
            ↳ {item.parent_key} · {item.parent_summary}
          </p>
        )}
      </div>

      <span
        className="text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 mt-0.5"
        style={{ color: typeColor, backgroundColor: `${typeColor}12` }}
      >
        {item.issue_type}
      </span>
    </div>
  );
}

function SectionGroup({ title, count, items, defaultOpen }: { title: string; count: number; items: JiraWorkItem[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? true);

  if (count === 0) {
    return (
      <div className="mb-4">
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</span>
          <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">0</span>
        </div>
        <p className="text-xs text-muted-foreground px-3 py-2 italic">No items in this period</p>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-muted/50 rounded-lg transition-colors"
      >
        {open ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
        <span className="text-xs font-semibold text-foreground uppercase tracking-wider">{title}</span>
        <span className="text-[10px] font-semibold text-white bg-primary px-1.5 py-0.5 rounded-full">{count}</span>
      </button>
      {open && (
        <div className="mt-1 space-y-0.5">
          {items.map((item) => (
            <WorkItemRow key={item.issue_key} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ResourceWorkDrawer({ resourceId, resourceName, onClose }: ResourceWorkDrawerProps) {
  const { data, isLoading, error } = useResourceJiraWork(resourceId);

  // ESC to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!resourceId) return null;

  const name = data?.resource?.name || resourceName || 'Resource';
  const role = data?.resource?.role || '';
  const totalItems = data ? data.groups.thisWeek.length + data.groups.thisMonth.length + data.groups.lastMonth.length : 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/25 z-[499] transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-screen w-[520px] max-w-[90vw] bg-background border-l border-border shadow-2xl z-[500] flex flex-col animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-foreground truncate">{name}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{role}</p>
            {!isLoading && (
              <p className="text-xs text-muted-foreground mt-1">
                {totalItems} work item{totalItems !== 1 ? 's' : ''} · Last 60 days
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors shrink-0"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Loading work items…</p>
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive p-3 bg-destructive/10 rounded-lg">
              Failed to load work items
            </div>
          )}

          {data && !data.resource.jiraAccountId && (
            <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg text-center">
              <p className="font-medium">No Jira mapping found</p>
              <p className="text-xs mt-1">This resource has not been mapped to a Jira account yet.</p>
            </div>
          )}

          {data && data.resource.jiraAccountId && (
            <>
              <SectionGroup
                title="This Week"
                count={data.groups.thisWeek.length}
                items={data.groups.thisWeek}
                defaultOpen={true}
              />
              <SectionGroup
                title="This Month"
                count={data.groups.thisMonth.length}
                items={data.groups.thisMonth}
                defaultOpen={true}
              />
              <SectionGroup
                title="Last Month"
                count={data.groups.lastMonth.length}
                items={data.groups.lastMonth}
                defaultOpen={false}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}
