/**
 * AllWorkTab — "All work" tab content for the right panel
 * ════════════════════════════════════════════════════════════════════════════
 * Sections: Work summary, Hierarchy, Related issues, Development, Activity
 * Each section is collapsible with persisted open/closed state.
 */
import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  ChevronDown, ChevronRight, Link2, MessageSquare, GitPullRequest,
  ListTree, Activity, Plus, ExternalLink,
} from 'lucide-react';
import { HierarchySection } from './sections/HierarchySection';
import { RelatedIssuesSection } from './sections/RelatedIssuesSection';
import { DevelopmentSection } from './sections/DevelopmentSection';
import { ActivitySection } from './sections/ActivitySection';
import type { AllWorkItem } from '@/types/allwork.types';
import type { STORAGE_KEYS } from '@/types/issue-view.types';

interface AllWorkTabProps {
  issueKey: string;
  isDark: boolean;
  item?: AllWorkItem | null;
}

interface SectionState {
  summary: boolean;
  hierarchy: boolean;
  links: boolean;
  development: boolean;
  activity: boolean;
}

function CountChip({
  label,
  count,
  isDark,
  icon,
}: {
  label: string;
  count: number;
  isDark: boolean;
  icon: React.ReactNode;
}) {
  const isMuted = count === 0;
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-body font-medium',
      isMuted
        ? isDark ? 'text-[#878787]' : 'text-[#6B6E76]'
        : isDark ? 'text-[#EDEDED] bg-[#292929]' : 'text-[#292A2E] bg-[#F4F5F7]',
    )}>
      {icon}
      {label}: {count}
    </span>
  );
}

function CollapsibleSection({
  title,
  count,
  isOpen,
  onToggle,
  isDark,
  actions,
  children,
}: {
  title: string;
  count?: number;
  isOpen: boolean;
  onToggle: () => void;
  isDark: boolean;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(
      'border rounded-lg overflow-hidden',
      isDark ? 'border-[#2E2E2E]' : 'border-[#DFE1E6]',
    )}>
      {/* Section header */}
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center gap-2 px-4 py-3 text-left transition-colors',
          isDark
            ? 'bg-[#1A1A1A] hover:bg-[#1F1F1F]'
            : 'bg-white hover:bg-[#F4F5F7]',
          isOpen && (isDark ? 'border-b border-[#2E2E2E]' : 'border-b border-[#DFE1E6]'),
        )}
      >
        {isOpen
          ? <ChevronDown className="w-4 h-4 shrink-0 text-[#878787]" />
          : <ChevronRight className="w-4 h-4 shrink-0 text-[#878787]" />
        }
        <span className={cn(
          'font-body text-xs font-semibold tracking-wide',
          isDark ? 'text-[#EDEDED]' : 'text-[#292A2E]',
        )}>
          {title}
        </span>
        {count !== undefined && (
          <span className={cn(
            'text-xs font-body font-medium',
            isDark ? 'text-[#878787]' : 'text-[#6B6E76]',
          )}>
            {count}
          </span>
        )}
        {actions && (
          <div className="ml-auto flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
        )}
      </button>

      {/* Section body */}
      {isOpen && (
        <div className={cn('px-4 py-3', isDark ? 'bg-[#111111]' : 'bg-white')}>
          {children}
        </div>
      )}
    </div>
  );
}

export function AllWorkTab({ issueKey, isDark, item }: AllWorkTabProps) {
  const [sections, setSections] = useState<SectionState>({
    summary: true,
    hierarchy: true,
    links: true,
    development: false, // collapsed by default if empty
    activity: true,
  });

  const toggleSection = useCallback((key: keyof SectionState) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Placeholder counts (would come from real data)
  const counts = {
    hierarchy: (item?.parent_key ? 1 : 0) + (item?.child_count ?? 0),
    links: 0,
    development: 0,
    activity: item?.comment_count ?? 0,
  };

  return (
    <div className="p-4 space-y-3">
      {/* ─── Work summary header ─── */}
      <div className={cn(
        'p-4 rounded-lg border',
        isDark ? 'border-[#2E2E2E] bg-[#1A1A1A]' : 'border-[#DFE1E6] bg-white',
      )}>
        <div className="flex items-center gap-2 mb-3">
          <span className={cn(
            'font-mono text-xs font-medium',
            isDark ? 'text-[#A1A1A1]' : 'text-[#505258]',
          )}>
            {issueKey}
          </span>
          <span className={cn(
            'font-body text-sm truncate',
            isDark ? 'text-[#EDEDED]' : 'text-[#292A2E]',
          )}>
            {item?.summary ?? 'Untitled Issue'}
          </span>
        </div>

        {/* Count chips */}
        <div className="flex flex-wrap items-center gap-2">
          <CountChip label="Hierarchy" count={counts.hierarchy} isDark={isDark} icon={<ListTree className="w-3 h-3" />} />
          <CountChip label="Links" count={counts.links} isDark={isDark} icon={<Link2 className="w-3 h-3" />} />
          <CountChip label="Dev" count={counts.development} isDark={isDark} icon={<GitPullRequest className="w-3 h-3" />} />
          <CountChip label="Activity" count={counts.activity} isDark={isDark} icon={<Activity className="w-3 h-3" />} />
        </div>

        {/* Quick actions */}
        <div className={cn(
          'flex items-center gap-2 mt-3 pt-3 border-t',
          isDark ? 'border-[#2E2E2E]' : 'border-[#DFE1E6]',
        )}>
          <button className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-body font-medium transition-colors',
            isDark
              ? 'text-[#A1A1A1] hover:bg-[#292929]'
              : 'text-[#505258] hover:bg-[#F4F5F7]',
          )}>
            <Plus className="w-3 h-3" />
            Link work
          </button>
          <button className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-body font-medium transition-colors',
            isDark
              ? 'text-[#A1A1A1] hover:bg-[#292929]'
              : 'text-[#505258] hover:bg-[#F4F5F7]',
          )}>
            <MessageSquare className="w-3 h-3" />
            Add comment
          </button>
        </div>
      </div>

      {/* ─── Hierarchy section ─── */}
      <CollapsibleSection
        title="HIERARCHY"
        count={counts.hierarchy}
        isOpen={sections.hierarchy}
        onToggle={() => toggleSection('hierarchy')}
        isDark={isDark}
        actions={
          <button className={cn(
            'p-1 rounded transition-colors',
            isDark ? 'text-[#878787] hover:bg-[#292929]' : 'text-[#505258] hover:bg-[#E2E8F0]',
          )}>
            <Plus className="w-3.5 h-3.5" />
          </button>
        }
      >
        <HierarchySection
          issueKey={issueKey}
          isDark={isDark}
          parentKey={item?.parent_key ?? null}
          parentSummary={item?.parent_summary ?? null}
          childCount={item?.child_count ?? 0}
        />
      </CollapsibleSection>

      {/* ─── Related issues section ─── */}
      <CollapsibleSection
        title="RELATED ISSUES"
        count={counts.links}
        isOpen={sections.links}
        onToggle={() => toggleSection('links')}
        isDark={isDark}
        actions={
          <button className={cn(
            'p-1 rounded transition-colors',
            isDark ? 'text-[#878787] hover:bg-[#292929]' : 'text-[#505258] hover:bg-[#E2E8F0]',
          )}>
            <Plus className="w-3.5 h-3.5" />
          </button>
        }
      >
        <RelatedIssuesSection isDark={isDark} links={[]} />
      </CollapsibleSection>

      {/* ─── Development section ─── */}
      <CollapsibleSection
        title="DEVELOPMENT"
        count={counts.development}
        isOpen={sections.development}
        onToggle={() => toggleSection('development')}
        isDark={isDark}
      >
        <DevelopmentSection isDark={isDark} items={[]} />
      </CollapsibleSection>

      {/* ─── Activity section ─── */}
      <CollapsibleSection
        title="ACTIVITY"
        count={counts.activity}
        isOpen={sections.activity}
        onToggle={() => toggleSection('activity')}
        isDark={isDark}
      >
        <ActivitySection isDark={isDark} issueKey={issueKey} commentCount={item?.comment_count ?? 0} />
      </CollapsibleSection>
    </div>
  );
}
