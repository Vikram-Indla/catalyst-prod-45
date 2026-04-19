/**
 * AddParentPicker — Canonical "Add/Change Parent" popover component.
 * Used in breadcrumbs and Key Details across IssueContentView, StoryDetailModal,
 * and every CatalystView* (via CatalystViewBase middleSlot).
 *
 * Trigger variants:
 *  - 'breadcrumb': Jira-parity inline trigger. When no parent, renders a
 *    bordered SquarePen button matching Atlassian's "Add parent" chip
 *    (https://support.atlassian.com/jira-cloud-administration/docs/
 *    configure-parent-child-issue-relationships/). When parent is set,
 *    renders the parent key + icon as a subtle click-to-change chip.
 *  - 'field': Key-detail row with current parent summary (sidebar usage).
 *
 * Parent sources (canonical Catalyst rules — see parent-rules.ts):
 *  - 'epic'                   → Epic parents from ph_issues (Story / Feature
 *                                picker — Stories and Features can only be
 *                                parented by an Epic).
 *  - 'business_request'       → Business Request parents from MDT project
 *                                (Epic picker — only Epics get BRs directly).
 *  - 'story'                  → Story parents from ph_issues
 *                                (Subtask picker — Subtasks always parent to
 *                                Stories).
 *  - 'story_epic_feature'     → Story / Epic / Feature parents from the
 *                                current project (Defect / Task picker —
 *                                Jira-parity, three work-item types allowed).
 *  - 'story_epic_feature_br'  → Story / Epic / Feature (current project) +
 *                                Business Request (MDT project)
 *                                (Production Incident picker — Catalyst rule:
 *                                only Production Incidents and Epics can
 *                                parent to a Business Request).
 *
 * Visual styling is identical across sources — parity with the Story view.
 */
import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { SquarePen } from 'lucide-react';

type ParentSource =
  | 'epic'
  | 'business_request'
  | 'story'
  | 'story_epic_feature'
  | 'story_epic_feature_br';

interface AddParentPickerProps {
  /** Current issue key (e.g. "BAU-5364") */
  issueKey: string;
  /** Current parent key, or null if no parent */
  parentKey: string | null;
  /** Project key for filtering epics (e.g. "BAU"). Ignored when parentSource = 'business_request'. */
  projectKey: string;
  /** Parent issue type icon hint */
  parentIssueType?: string;
  /** Callback when parent changes — receives new parent key or null */
  onParentChange: (newParentKey: string | null) => Promise<void> | void;
  /** 'breadcrumb' = compact inline link, 'field' = key-detail row style */
  variant?: 'breadcrumb' | 'field';
  /** Source of parent candidates. Default 'epic' (ph_issues). 'business_request' restricts to Business Requests. */
  parentSource?: ParentSource;
  /** Fallback parent summary used when ph_issues lookup returns nothing (e.g. parent lives outside ph_issues). */
  parentSummaryFallback?: string | null;
}

interface CandidateRow {
  id: string;
  issue_key: string;
  summary: string;
  issue_type: string;
  status_category?: string | null;
}

export function AddParentPicker({
  issueKey,
  parentKey,
  projectKey,
  parentIssueType,
  onParentChange,
  variant = 'breadcrumb',
  parentSource = 'epic',
}: AddParentPickerProps) {
  const [showAllPanel, setShowAllPanel] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const isBR = parentSource === 'business_request';
  const isStory = parentSource === 'story';
  const isEpicOnly = parentSource === 'epic';
  const isMultiNoBR = parentSource === 'story_epic_feature';
  const isMultiWithBR = parentSource === 'story_epic_feature_br';
  const isMulti = isMultiNoBR || isMultiWithBR;

  // Single-type sources use specific nouns; multi-type sources use a generic
  // "parent" label so the picker header reads as "Recent parents" / "View all
  // parents" regardless of which work-item types are visible.
  const noun = isBR ? 'business request'
    : isStory ? 'story'
    : isMulti ? 'parent'
    : 'epic';
  const Noun = isBR ? 'Business request'
    : isStory ? 'Story'
    : isMulti ? 'Parent'
    : 'Epic';
  const plural = isBR ? 'business requests'
    : isStory ? 'stories'
    : isMulti ? 'parents'
    : 'epics';
  const iconType = parentIssueType || (isBR ? 'business request' : isStory ? 'story' : 'epic');

  // Business Requests live in ph_issues with issue_type = 'Business Request'
  // (e.g. MDT-740, MDT-693) in the MDT (ProductHub backlog) project.
  const BR_TYPES = ['Business Request', 'business request'];
  // 'epic' source is tight — Story / Feature can only be parented by an Epic
  // (not another Feature). Feature variants are exposed to callers only via
  // the multi sources ('story_epic_feature', 'story_epic_feature_br').
  const EPIC_TYPES = ['Epic', 'epic'];
  const STORY_TYPES = ['Story', 'story', 'Improvement', 'improvement'];
  // Multi-source pickers surface Story + Epic + Feature parents.
  const STORY_EPIC_FEATURE_TYPES = [
    'Story', 'story', 'Improvement', 'improvement',
    'Epic', 'epic',
    'Feature', 'feature', 'New Feature', 'new feature',
  ];

  // Business Requests live in the MDT project (ProductHub backlog).
  // Epics/Stories scope to the current project; BRs are cross-project (always MDT).
  const BR_PROJECT_KEYS = ['MDT'];

  // Resolve allowed issue types for the current source. For the mixed
  // Incident picker ('story_epic_feature_br'), `typesForSource` is used only
  // to scope the non-BR half of the query; BRs are fetched separately below.
  const typesForSource = isBR ? BR_TYPES
    : isStory ? STORY_TYPES
    : isMulti ? STORY_EPIC_FEATURE_TYPES
    : EPIC_TYPES;

  // Recent candidates (shown on first open)
  const { data: recentCandidates = [] } = useQuery({
    queryKey: ['ph-recent-parent-canonical', parentSource, projectKey],
    enabled: isBR ? true : !!projectKey,
    queryFn: async (): Promise<CandidateRow[]> => {
      // Mixed scope: non-BR parents from current project + BR parents from MDT.
      if (isMultiWithBR) {
        const [nonBr, br] = await Promise.all([
          supabase.from('ph_issues')
            .select('id, issue_key, summary, issue_type, status_category')
            .in('issue_type', STORY_EPIC_FEATURE_TYPES)
            .eq('project_key', projectKey)
            .is('deleted_at', null)
            .neq('status_category', 'done')
            .order('jira_updated_at', { ascending: false, nullsFirst: false })
            .limit(4),
          supabase.from('ph_issues')
            .select('id, issue_key, summary, issue_type, status_category')
            .in('issue_type', BR_TYPES)
            .in('project_key', BR_PROJECT_KEYS)
            .is('deleted_at', null)
            .neq('status_category', 'done')
            .order('jira_updated_at', { ascending: false, nullsFirst: false })
            .limit(3),
        ]);
        return [...((nonBr.data || []) as CandidateRow[]), ...((br.data || []) as CandidateRow[])];
      }
      let q = supabase.from('ph_issues')
        .select('id, issue_key, summary, issue_type, status_category')
        .in('issue_type', typesForSource)
        .is('deleted_at', null);
      if (isBR) {
        q = q.in('project_key', BR_PROJECT_KEYS);
      } else {
        q = q.eq('project_key', projectKey).neq('status_category', 'done');
      }
      const { data } = await q
        .order('jira_updated_at', { ascending: false, nullsFirst: false })
        .limit(5);
      return (data || []) as CandidateRow[];
    },
    staleTime: 60000,
  });

  // All candidates (loaded when "View all" panel is opened)
  const { data: allCandidates = [] } = useQuery({
    queryKey: ['ph-all-parent-canonical', parentSource, projectKey],
    enabled: showAllPanel && (isBR ? true : !!projectKey),
    queryFn: async (): Promise<CandidateRow[]> => {
      if (isMultiWithBR) {
        const [nonBr, br] = await Promise.all([
          supabase.from('ph_issues')
            .select('id, issue_key, summary, issue_type, status_category')
            .in('issue_type', STORY_EPIC_FEATURE_TYPES)
            .eq('project_key', projectKey)
            .is('deleted_at', null)
            .order('jira_updated_at', { ascending: false, nullsFirst: false })
            .limit(200),
          supabase.from('ph_issues')
            .select('id, issue_key, summary, issue_type, status_category')
            .in('issue_type', BR_TYPES)
            .in('project_key', BR_PROJECT_KEYS)
            .is('deleted_at', null)
            .order('jira_updated_at', { ascending: false, nullsFirst: false })
            .limit(200),
        ]);
        return [...((nonBr.data || []) as CandidateRow[]), ...((br.data || []) as CandidateRow[])];
      }
      let q = supabase.from('ph_issues')
        .select('id, issue_key, summary, issue_type, status_category')
        .in('issue_type', typesForSource)
        .is('deleted_at', null);
      if (isBR) {
        q = q.in('project_key', BR_PROJECT_KEYS);
      } else {
        q = q.eq('project_key', projectKey);
      }
      const { data } = await q
        .order('jira_updated_at', { ascending: false, nullsFirst: false })
        .limit(200);
      return (data || []) as CandidateRow[];
    },
    staleTime: 60000,
  });

  // Resolve parent summary for field variant — always from ph_issues now
  const { data: parentSummary } = useQuery({
    queryKey: ['ph-parent-summary', parentSource, parentKey],
    enabled: !!parentKey && variant === 'field',
    queryFn: async () => {
      const { data } = await supabase.from('ph_issues')
        .select('issue_key, summary, issue_type')
        .eq('issue_key', parentKey!)
        .is('deleted_at', null)
        .maybeSingle();
      return data;
    },
  });

  const handleSelect = useCallback(async (key: string | null) => {
    await onParentChange(key);
  }, [onParentChange]);

  const handleReset = () => {
    setShowAllPanel(false);
    setSearchTerm('');
  };

  // ── Trigger ──
  const renderTrigger = () => {
    if (variant === 'field') {
      if (parentKey && parentSummary) {
        return (
          <button
            title={`Change ${noun}`}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 8,
              borderRadius: 3, fontSize: 14, color: '#172B4D',
              transition: 'background 150ms', width: '100%', textAlign: 'left',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <JiraIssueTypeIcon type={parentSummary.issue_type ?? iconType} size={16} />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {parentSummary.issue_key} {parentSummary.summary}
            </span>
          </button>
        );
      }
      if (parentKey) {
        return (
          <button
            title={`Change ${noun}`}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 8,
              borderRadius: 3, fontSize: 14, color: '#172B4D',
              transition: 'background 150ms',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <JiraIssueTypeIcon type={iconType} size={16} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{parentKey}</span>
          </button>
        );
      }
      return (
        <button
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 14, color: '#6B778C', borderRadius: 3,
            transition: 'background 150ms',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          None
        </button>
      );
    }

    // Breadcrumb variant
    if (parentKey) {
      return (
        <button
          title={`Change ${noun}`}
          style={{
            background: 'none', border: '1px solid transparent', borderRadius: 4, cursor: 'pointer',
            padding: '2px 6px', display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 12, fontWeight: 500, color: '#5E6C84', transition: 'border-color 150ms, background 150ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#DEEBFF'; e.currentTarget.style.background = '#F4F5F7'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'none'; }}
        >
          <JiraIssueTypeIcon type={iconType} size={14} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{parentKey}</span>
        </button>
      );
    }
    // Jira-parity "Add parent" trigger — text + SquarePen icon only.
    // NO border / no background at rest (verified against Jira Cloud, Apr
    // 2026). The "square" shape users see is the SquarePen icon itself
    // (pencil-in-square artwork from lucide), not a button chip. Hover
    // reveals a light background, focus reveals a border — matching the
    // Atlassian "subtle" button pattern.
    return (
      <button
        className="awAddParentLink"
        title={`Add ${noun}`}
        aria-label={`Add ${noun}`}
        style={{
          background: 'transparent', border: '1px solid transparent', borderRadius: 4, cursor: 'pointer',
          height: 28, padding: '0 8px', display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 14, fontWeight: 500, color: '#44546F',
          fontFamily: "'Inter', sans-serif", lineHeight: 1,
          transition: 'background 150ms, border-color 150ms, color 150ms',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#F1F2F4'; e.currentTarget.style.color = '#172B4D'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#44546F'; }}
        onFocus={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.background = '#F1F2F4'; }}
        onBlur={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent'; }}
      >
        <SquarePen size={16} strokeWidth={1.75} aria-hidden="true" color="#44546F" />
        Add parent
      </button>
    );
  };

  return (
    <Popover onOpenChange={(open) => { if (!open) handleReset(); }}>
      <PopoverTrigger asChild>
        {renderTrigger()}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="p-0 z-[10001]"
        style={{
          borderRadius: 8,
          boxShadow: '0 8px 16px rgba(0,0,0,0.12), 0 0 1px rgba(0,0,0,0.12)',
          width: showAllPanel ? 480 : 380,
        }}
      >
        {!showAllPanel ? (
          <>
            {/* Recent items */}
            <div style={{ padding: '10px 16px 6px', fontSize: 11, fontWeight: 700, color: '#6B778C', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Recent {plural}
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {recentCandidates.map((row) => (
                <button
                  key={row.id}
                  onClick={() => handleSelect(row.issue_key)}
                  style={{
                    width: '100%', padding: '10px 16px', border: 'none', background: 'transparent',
                    textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                    fontSize: 14, color: '#172B4D', transition: 'background 100ms',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <JiraIssueTypeIcon type={row.issue_type ?? iconType} size={16} />
                  <span>{row.issue_key} {row.summary}</span>
                </button>
              ))}
              {recentCandidates.length === 0 && (
                <div style={{ padding: '12px 16px', fontSize: 13, color: '#6B778C' }}>No {plural} found</div>
              )}
            </div>
            <div style={{ borderTop: '1px solid #EBECF0' }}>
              {/* Unlink parent */}
              {parentKey && (
                <button
                  onClick={() => handleSelect(null)}
                  style={{
                    width: '100%', padding: '10px 16px', border: 'none', background: 'transparent',
                    textAlign: 'left', cursor: 'pointer', fontSize: 14, color: '#172B4D', fontWeight: 400,
                    transition: 'background 100ms',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  Unlink parent
                </button>
              )}
              <button
                onClick={() => setShowAllPanel(true)}
                style={{
                  width: '100%', padding: '10px 16px', border: 'none', background: 'transparent',
                  textAlign: 'left', cursor: 'pointer', fontSize: 14, color: '#172B4D', fontWeight: 500,
                  transition: 'background 100ms',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                View all {plural}
              </button>
            </div>
          </>
        ) : (
          /* "View all" panel with search */
          <div style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#172B4D', marginBottom: 8 }}>Change {noun}</div>
            <div style={{ fontSize: 13, color: '#6B778C', marginBottom: 4 }}>
              Select a parent work item. Work items can only belong to one parent at a time.
            </div>
            {parentKey && (
              <div style={{ fontSize: 13, color: '#172B4D', marginBottom: 16 }}>
                <strong>{issueKey}</strong> is currently assigned to <strong>{parentKey}</strong>.
              </div>
            )}
            <div style={{ fontSize: 12, fontWeight: 600, color: '#172B4D', marginBottom: 6 }}>{Noun}</div>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Choose parent"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                autoFocus
                style={{
                  width: '100%', padding: '8px 12px', border: '2px solid #4C9AFF', borderRadius: 4,
                  fontSize: 14, color: '#172B4D', outline: 'none', background: '#FFF',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid #DFE1E6', borderTop: 'none', borderRadius: '0 0 4px 4px', background: '#FFF' }}>
                {parentKey && (
                  <button
                    onClick={() => { handleSelect(null); handleReset(); }}
                    style={{
                      width: '100%', padding: '10px 14px', border: 'none', background: '#F4F5F7',
                      textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                      fontSize: 14, color: '#DE350B', fontWeight: 500, transition: 'background 100ms',
                      borderBottom: '1px solid #EBECF0',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#FFEBE6')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#F4F5F7')}
                  >
                    Remove
                  </button>
                )}
                {allCandidates
                  .filter((row) => {
                    if (!searchTerm) return true;
                    const term = searchTerm.toLowerCase();
                    return row.issue_key?.toLowerCase().includes(term) || row.summary?.toLowerCase().includes(term);
                  })
                  .map((row) => (
                    <button
                      key={row.id}
                      onClick={() => { handleSelect(row.issue_key); handleReset(); }}
                      style={{
                        width: '100%', padding: '10px 14px', border: 'none', background: 'transparent',
                        textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                        fontSize: 14, color: '#172B4D', transition: 'background 100ms',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#DEEBFF')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <JiraIssueTypeIcon type={row.issue_type ?? iconType} size={16} />
                      <span>{row.issue_key} {row.summary}</span>
                    </button>
                  ))}
                {allCandidates.length === 0 && (
                  <div style={{ padding: '12px 14px', fontSize: 13, color: '#6B778C' }}>No {plural} found</div>
                )}
              </div>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
