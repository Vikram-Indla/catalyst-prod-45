/**
 * AllWorkTab — "All work" tab: Work summary, Hierarchy, Related issues, Activity
 * ════════════════════════════════════════════════════════════════════════════
 * Receives real data from IssueViewShell → IssueRightPanel.
 * Development section EXCLUDED per spec.
 * Collapse state persisted per issue key in localStorage.
 */
import { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  ChevronDown, ChevronRight, Link2, MessageSquare,
  ListTree, Activity, Plus, Loader2,
} from 'lucide-react';
import { HierarchySection } from './sections/HierarchySection';
import { RelatedIssuesSection } from './sections/RelatedIssuesSection';
import { ActivitySection } from './sections/ActivitySection';
import type { AllWorkItem } from '@/types/allwork.types';

interface AllWorkTabProps {
  issueKey: string;
  isDark: boolean;
  item?: AllWorkItem | null;
  parentItem?: AllWorkItem | null;
  children?: AllWorkItem[];
  childrenLoading?: boolean;
  links?: any[];
  linksLoading?: boolean;
  comments?: any[];
  commentsLoading?: boolean;
  history?: any[];
  historyLoading?: boolean;
  createComment?: any;
}

interface SectionState {
  hierarchy: boolean;
  links: boolean;
  activity: boolean;
}

function loadCollapsedState(issueKey: string): SectionState {
  try {
    const raw = localStorage.getItem(`allwork.collapsed.${issueKey}`);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { hierarchy: true, links: true, activity: true };
}

function saveCollapsedState(issueKey: string, state: SectionState) {
  try {
    localStorage.setItem(`allwork.collapsed.${issueKey}`, JSON.stringify(state));
  } catch { /* ignore */ }
}

function CountChip({ label, count, isDark, icon }: {
  label: string; count: number; isDark: boolean; icon: React.ReactNode;
}) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-body font-medium',
      count === 0
        ? isDark ? 'text-[#878787]' : 'text-[#6B6E76]'
        : isDark ? 'text-[#EDEDED] bg-[#292929]' : 'text-[#292A2E] bg-[#F4F5F7]',
    )}>
      {icon}
      {label}: {count}
    </span>
  );
}

function CollapsibleSection({ title, count, isOpen, onToggle, isDark, actions, children }: {
  title: string; count?: number; isOpen: boolean; onToggle: () => void;
  isDark: boolean; actions?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className={cn('border rounded-lg overflow-hidden', isDark ? 'border-[#2E2E2E]' : 'border-[#DFE1E6]')}>
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center gap-2 px-4 py-3 text-left transition-colors',
          isDark ? 'bg-[#1A1A1A] hover:bg-[#1F1F1F]' : 'bg-white hover:bg-[#F4F5F7]',
          isOpen && (isDark ? 'border-b border-[#2E2E2E]' : 'border-b border-[#DFE1E6]'),
        )}
      >
        {isOpen
          ? <ChevronDown className="w-4 h-4 shrink-0 text-[#878787]" />
          : <ChevronRight className="w-4 h-4 shrink-0 text-[#878787]" />}
        <span className={cn('font-body text-xs font-semibold tracking-wide uppercase', isDark ? 'text-[#EDEDED]' : 'text-[#292A2E]')}>
          {title}
        </span>
        {count !== undefined && count > 0 && (
          <span className={cn('text-xs font-body font-medium', isDark ? 'text-[#878787]' : 'text-[#6B6E76]')}>
            {count}
          </span>
        )}
        {actions && <div className="ml-auto flex items-center gap-1" onClick={e => e.stopPropagation()}>{actions}</div>}
      </button>
      {isOpen && <div className={cn('px-4 py-3', isDark ? 'bg-[#111111]' : 'bg-white')}>{children}</div>}
    </div>
  );
}

export function AllWorkTab({
  issueKey, isDark, item, parentItem,
  children: childItems = [], childrenLoading = false,
  links = [], linksLoading = false,
  comments = [], commentsLoading = false,
  history = [], historyLoading = false,
  createComment,
}: AllWorkTabProps) {
  const [sections, setSections] = useState<SectionState>(() => loadCollapsedState(issueKey));

  // Persist collapse state
  useEffect(() => { saveCollapsedState(issueKey, sections); }, [issueKey, sections]);

  // Reset collapse state when issue changes
  useEffect(() => { setSections(loadCollapsedState(issueKey)); }, [issueKey]);

  const toggleSection = useCallback((key: keyof SectionState) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const hierarchyCount = (item?.parent_key ? 1 : 0) + (childItems.length || item?.child_count || 0);
  const linksCount = Array.isArray(links) ? links.length : 0;
  const activityCount = (comments?.length || 0) + (history?.length || 0);

  return (
    <div className="p-4 space-y-3">
      {/* ─── Work summary header ─── */}
      <div className={cn('p-4 rounded-lg border', isDark ? 'border-[#2E2E2E] bg-[#1A1A1A]' : 'border-[#DFE1E6] bg-white')}>
        <div className="flex items-center gap-2 mb-3">
          <span className={cn('font-mono text-xs font-medium', isDark ? 'text-[#A1A1A1]' : 'text-[#505258]')}>
            {issueKey}
          </span>
          <span className={cn('font-body text-sm truncate', isDark ? 'text-[#EDEDED]' : 'text-[#292A2E]')}>
            {item?.summary ?? 'Loading...'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CountChip label="Hierarchy" count={hierarchyCount} isDark={isDark} icon={<ListTree className="w-3 h-3" />} />
          <CountChip label="Links" count={linksCount} isDark={isDark} icon={<Link2 className="w-3 h-3" />} />
          <CountChip label="Activity" count={activityCount} isDark={isDark} icon={<Activity className="w-3 h-3" />} />
        </div>
      </div>

      {/* ─── Hierarchy ─── */}
      <CollapsibleSection
        title="Hierarchy"
        count={hierarchyCount}
        isOpen={sections.hierarchy}
        onToggle={() => toggleSection('hierarchy')}
        isDark={isDark}
      >
        {childrenLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className={cn('w-4 h-4 animate-spin', isDark ? 'text-[#878787]' : 'text-[#505258]')} />
          </div>
        ) : (
          <HierarchySection
            issueKey={issueKey}
            isDark={isDark}
            parentKey={item?.parent_key ?? null}
            parentSummary={item?.parent_summary ?? null}
            childCount={item?.child_count ?? 0}
            parentItem={parentItem}
            children={childItems}
          />
        )}
      </CollapsibleSection>

      {/* ─── Related issues ─── */}
      <CollapsibleSection
        title="Related issues"
        count={linksCount}
        isOpen={sections.links}
        onToggle={() => toggleSection('links')}
        isDark={isDark}
      >
        {linksLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className={cn('w-4 h-4 animate-spin', isDark ? 'text-[#878787]' : 'text-[#505258]')} />
          </div>
        ) : (
          <RelatedIssuesSection isDark={isDark} links={links} />
        )}
      </CollapsibleSection>

      {/* ─── Activity ─── */}
      <CollapsibleSection
        title="Activity"
        count={activityCount}
        isOpen={sections.activity}
        onToggle={() => toggleSection('activity')}
        isDark={isDark}
      >
        <ActivitySection
          isDark={isDark}
          issueKey={issueKey}
          commentCount={item?.comment_count ?? 0}
          comments={comments}
          commentsLoading={commentsLoading}
          history={history}
          historyLoading={historyLoading}
          createComment={createComment}
        />
      </CollapsibleSection>
    </div>
  );
}
