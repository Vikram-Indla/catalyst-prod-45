/**
 * ResourceWorkDrawer — Enterprise drawer showing a resource's Jira work items
 * Story-first hierarchy with subtasks nested underneath
 * Jira icons, sync, nav, dates, clickable links
 */
import { X, ChevronDown, ChevronRight, ChevronLeft, RefreshCw, Calendar } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { useResourceJiraWork, useSyncResourceJira, type StoryGroup, type JiraWorkItem } from '@/hooks/capacity/useResourceJiraWork';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const JIRA_BASE = 'https://digital-transformation.atlassian.net/browse';

interface ResourceWorkDrawerProps {
  resourceId: string | null;
  resourceName?: string;
  onClose: () => void;
  /** List of resource IDs in the same department for prev/next navigation */
  departmentResourceIds?: { id: string; name: string }[];
  onNavigate?: (resourceId: string, resourceName: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  'Done': '#0d9488',
  'done': '#0d9488',
  'IN PROGRESS': 'var(--ds-text-brand, var(--ds-text-brand, #2563eb))',
  'In Progress': 'var(--ds-text-brand, var(--ds-text-brand, #2563eb))',
  'in progress': 'var(--ds-text-brand, var(--ds-text-brand, #2563eb))',
  'To Do': 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748b))',
  'ToDo': 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748b))',
  'todo': 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748b))',
  'BACKLOG': 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748b))',
  'Backlog': 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748b))',
  'In Review': '#8b5cf6',
  'Blocked': 'var(--ds-text-danger, var(--ds-text-danger, #dc2626))',
  'ready for production': '#7c3aed',
  'Ready for Production': '#7c3aed',
  'READY FOR PRODUCTION': '#7c3aed',
};

function getStatusColor(status: string) {
  return STATUS_COLORS[status] || STATUS_COLORS[status?.toLowerCase()] || 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748b))';
}

/** Jira-native type icons — outline style matching Jira's UI */
function JiraTypeIcon({ type, size = 16 }: { type: string; size?: number }) {
  const t = type.toLowerCase();

  // Epic — purple lightning bolt
  if (t === 'epic') return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M9.41 1.59a.55.55 0 0 1 .47.84L7.17 7.45h3.38a.55.55 0 0 1 .43.89l-4.95 6.2a.55.55 0 0 1-.97-.53l2.04-4.46H3.98a.55.55 0 0 1-.48-.82L8.85 1.8a.55.55 0 0 1 .56-.21z" fill="#904ee2"/>
    </svg>
  );

  // Story — green bookmark
  if (t === 'story') return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M4 2.5A1.5 1.5 0 0 1 5.5 1h5A1.5 1.5 0 0 1 12 2.5v12a.5.5 0 0 1-.77.42L8 12.6l-3.23 2.32A.5.5 0 0 1 4 14.5v-12z" fill="#36b37e"/>
    </svg>
  );

  // Task — blue square with checkmark
  if (t === 'task') return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="2" fill="#4bade8"/>
      <path d="M4.5 8.5L7 11l4.5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // Sub-task — blue square with nested icon
  if (t === 'sub-task' || t === 'subtask') return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="2" fill="#4bade8"/>
      <rect x="4.5" y="4.5" width="7" height="7" rx="1" stroke="white" strokeWidth="1" fill="none"/>
      <path d="M6.5 8h3M8 6.5v3" stroke="white" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );

  // Bug / QA Bug — red bug icon
  if (t === 'bug' || t === 'defect' || t === 'qa bug') return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="9" r="5" fill="#e5493a"/>
      <path d="M6 7.5h4M6 9.5h4M6 11.5h4" stroke="white" strokeWidth=".8"/>
      <path d="M3 7l2 1M13 7l-2 1M3 11l2-1M13 11l-2-1M5.5 4L6.5 6M10.5 4L9.5 6" stroke="#e5493a" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );

  // Production Incident — orange circle with question mark
  if (t.includes('production incident') || t.includes('incident')) return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="#ff8b00" strokeWidth="1.5" fill="none"/>
      <text x="8" y="11.5" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#ff8b00">?</text>
    </svg>
  );

  // Feature — blue square with checkmark (same as Task style)
  if (t === 'feature') return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="2" fill="#2684ff"/>
      <path d="M4.5 8.5L7 11l4.5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // Change Request — blue square with checkmark
  if (t.includes('change request')) return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="2" fill="#2684ff"/>
      <path d="M4.5 8.5L7 11l4.5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // Business Gap — orange/red rounded square with exclamation
  if (t.includes('business gap')) return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="3" fill="#ff5630"/>
      <rect x="7.25" y="4" width="1.5" height="5" rx=".75" fill="white"/>
      <circle cx="8" cy="11.5" r="1" fill="white"/>
    </svg>
  );

  // API Requirement — orange gear
  if (t.includes('api requirement') || t.includes('api')) return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="3" stroke="#ff8b00" strokeWidth="1.5" fill="none"/>
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="#ff8b00" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );

  // Frontend — blue code brackets
  if (t === 'frontend') return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="2" fill="#2684ff"/>
      <path d="M5 6l-2 2 2 2M11 6l2 2-2 2M9 5l-2 6" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // Backend — purple server
  if (t === 'backend') return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="2" fill="#8777d9"/>
      <rect x="4" y="4.5" width="8" height="2.5" rx=".5" fill="white"/>
      <rect x="4" y="9" width="8" height="2.5" rx=".5" fill="white"/>
    </svg>
  );

  // Integration — teal link
  if (t === 'integration') return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="2" fill="#00b8d9"/>
      <path d="M5 8h6M8 5v6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );

  // Figma
  if (t === 'figma' || t === 'entity figma') return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="2" fill="#f24e1e"/>
      <circle cx="8" cy="8" r="2.5" fill="white"/>
    </svg>
  );

  // Default — gray circle
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="#97a0af" strokeWidth="1.5" fill="none"/>
      <circle cx="8" cy="8" r="2" fill="#97a0af"/>
    </svg>
  );
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  try {
    return format(new Date(dateStr), 'dd MMM yyyy');
  } catch {
    return '—';
  }
}

function JiraLink({ issueKey }: { issueKey: string }) {
  return (
    <a
      href={`${JIRA_BASE}/${issueKey}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[11px] font-mono text-primary hover:underline cursor-pointer"
      onClick={(e) => e.stopPropagation()}
    >
      {issueKey}
    </a>
  );
}

function SubtaskRow({ item }: { item: JiraWorkItem }) {
  const statusColor = getStatusColor(item.status);

  return (
    <div className="flex items-start gap-2 py-1.5 px-3 ml-6 border-l-2 border-border/50 hover:bg-muted/30 transition-colors">
      <div className="mt-0.5 shrink-0">
        <JiraTypeIcon type={item.issue_type} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <JiraLink issueKey={item.issue_key} />
          <span
            className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded"
            style={{ color: statusColor, backgroundColor: `${statusColor}15` }}
          >
            {item.status}
          </span>
          <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{item.issue_type}</span>
        </div>
        <p className="text-xs text-foreground/80 truncate mt-0.5">{item.summary}</p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {formatDate(item.jira_created_at)}
          </span>
          <span className="text-[10px] text-muted-foreground">
            Updated: {formatDate(item.jira_updated_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

function StoryGroupRow({ group }: { group: StoryGroup }) {
  const [expanded, setExpanded] = useState(false);
  const { story, subtasks } = group;
  const statusColor = getStatusColor(story.status);

  return (
    <div className="mb-2">
      {/* Story header */}
      <div
        className="flex items-start gap-2 py-2 px-3 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="mt-0.5 shrink-0">
          <JiraTypeIcon type={story.issue_type} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <JiraLink issueKey={story.issue_key} />
            {story.status && (
              <span
                className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded"
                style={{ color: statusColor, backgroundColor: `${statusColor}15` }}
              >
                {story.status}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{story.issue_type}</span>
          </div>
          <p className="text-sm font-semibold text-foreground truncate mt-0.5">{story.summary}</p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {formatDate(story.jira_created_at)}
            </span>
            <span className="text-[10px] text-muted-foreground">
              Updated: {formatDate(story.jira_updated_at)}
            </span>
          </div>
        </div>
        {subtasks.length > 0 && (
          <div className="shrink-0 flex items-center gap-1 mt-0.5">
            <span className="text-[10px] text-muted-foreground">{subtasks.length}</span>
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </div>
        )}
      </div>
      {/* Subtasks */}
      {expanded && subtasks.length > 0 && (
        <div className="mt-0.5 space-y-0">
          {subtasks.map((sub) => (
            <SubtaskRow key={sub.issue_key} item={sub} />
          ))}
        </div>
      )}
    </div>
  );
}

function SectionGroup({ title, count, groups, defaultOpen }: { title: string; count: number; groups: StoryGroup[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? true);

  if (count === 0) {
    return (
      <div className="mb-4">
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</span>
          <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">0</span>
        </div>
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
        <div className="mt-1">
          {groups.map((g) => (
            <StoryGroupRow key={g.story.issue_key} group={g} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ResourceWorkDrawer({
  resourceId,
  resourceName,
  onClose,
  departmentResourceIds,
  onNavigate,
}: ResourceWorkDrawerProps) {
  const { data, isLoading, error, refetch } = useResourceJiraWork(resourceId);
  const syncResource = useSyncResourceJira();
  const [syncing, setSyncing] = useState(false);

  // ESC to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Navigation
  const currentIndex = departmentResourceIds?.findIndex((r) => r.id === resourceId) ?? -1;
  const canPrev = currentIndex > 0;
  const canNext = departmentResourceIds ? currentIndex < departmentResourceIds.length - 1 : false;

  const handlePrev = useCallback(() => {
    if (canPrev && departmentResourceIds && onNavigate) {
      const prev = departmentResourceIds[currentIndex - 1];
      onNavigate(prev.id, prev.name);
    }
  }, [canPrev, departmentResourceIds, currentIndex, onNavigate]);

  const handleNext = useCallback(() => {
    if (canNext && departmentResourceIds && onNavigate) {
      const next = departmentResourceIds[currentIndex + 1];
      onNavigate(next.id, next.name);
    }
  }, [canNext, departmentResourceIds, currentIndex, onNavigate]);

  const handleSync = async () => {
    if (!resourceId || syncing) return;
    setSyncing(true);
    try {
      await syncResource(resourceId);
      await refetch();
    } finally {
      setSyncing(false);
    }
  };

  if (!resourceId) return null;

  const resource = data?.resource;
  const name = resource?.name || resourceName || 'Resource';
  const role = resource?.role || '';
  const totalItems = data?.flatItems?.length || 0;

  // Avatar initials
  const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/25 z-[499] transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-screen w-[560px] max-w-[90vw] bg-background border-l border-border shadow-2xl z-[500] flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="shrink-0 border-b border-border">
          {/* Top bar: nav + sync + close */}
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrev}
                disabled={!canPrev}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Previous resource"
              >
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              </button>
              <button
                onClick={handleNext}
                disabled={!canNext}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Next resource"
              >
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
              {departmentResourceIds && currentIndex >= 0 && (
                <span className="text-[10px] text-muted-foreground ml-1">
                  {currentIndex + 1} of {departmentResourceIds.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                title="Sync this resource's data"
              >
                <RefreshCw className={cn("w-4 h-4 text-muted-foreground", syncing && "animate-spin")} />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Resource info */}
          <div className="flex items-center gap-4 px-5 pb-4">
            {/* Avatar */}
            <div className="shrink-0">
              {resource?.avatarUrl ? (
                <img
                  src={resource.avatarUrl}
                  alt={name}
                  className="w-14 h-14 rounded-full border-2 border-dashed border-primary/50 object-cover"
                />
              ) : (
                <div className="w-14 h-14 rounded-full border-2 border-dashed border-primary/50 bg-primary/10 flex items-center justify-center text-primary font-semibold text-lg">
                  {initials}
                </div>
              )}
            </div>
            {/* Name + meta */}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-foreground truncate">{name}</h2>
              <p className="text-sm text-muted-foreground">{role}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {resource?.assignmentType && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-primary/10 text-primary">
                    {resource.assignmentType}
                  </span>
                )}
                {resource?.location && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground">
                    {resource.location}
                  </span>
                )}
                {resource?.department && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground">
                    {resource.department}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats bar */}
          {!isLoading && (
            <div className="flex items-center gap-4 px-5 pb-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{totalItems} work items</span>
              <span>·</span>
              <span>Last 60 days</span>
            </div>
          )}
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
                count={data.groups.thisWeek.reduce((s, g) => s + 1 + g.subtasks.length, 0)}
                groups={data.groups.thisWeek}
                defaultOpen={true}
              />
              <SectionGroup
                title="This Month"
                count={data.groups.thisMonth.reduce((s, g) => s + 1 + g.subtasks.length, 0)}
                groups={data.groups.thisMonth}
                defaultOpen={true}
              />
              <SectionGroup
                title="Last Month"
                count={data.groups.lastMonth.reduce((s, g) => s + 1 + g.subtasks.length, 0)}
                groups={data.groups.lastMonth}
                defaultOpen={false}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}
