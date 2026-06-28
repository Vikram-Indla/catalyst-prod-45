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

import type { ParentSource } from '@/components/catalyst-detail-views/shared/parent-rules';

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
  parentSummaryFallback = null,
}: AddParentPickerProps) {
  const [showAllPanel, setShowAllPanel] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const isBR = parentSource === 'business_request';
  const isStory = parentSource === 'story';
  const isEpicOnly = parentSource === 'epic';
  const isMultiNoBR = parentSource === 'story_epic_feature';
  const isMultiWithBR = parentSource === 'story_epic_feature_br';
  // br_epic_feature: BR + Epic + Feature — Production Incident, Business Gap (NOT Story)
  const isBrEpicFeature = parentSource === 'br_epic_feature';
  // story_epic_br: Story + Epic + BR — Change Request (NOT Feature)
  const isStoryEpicBr = parentSource === 'story_epic_br';
  const isMulti = isMultiNoBR || isMultiWithBR || isBrEpicFeature || isStoryEpicBr;

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
  const EPIC_TYPES = ['Epic', 'epic'];
  const STORY_TYPES = ['Story', 'story', 'Improvement', 'improvement'];
  const STORY_EPIC_FEATURE_TYPES = [
    'Story', 'story', 'Improvement', 'improvement',
    'Epic', 'epic',
    'Feature', 'feature', 'New Feature', 'new feature',
  ];
  // br_epic_feature: Epic + Feature only (the non-BR half); BRs fetched separately.
  const BR_EPIC_FEATURE_NOTYPES = [
    'Epic', 'epic',
    'Feature', 'feature', 'New Feature', 'new feature',
  ];
  // story_epic_br: Story + Epic only (the non-BR half); BRs fetched separately.
  const STORY_EPIC_BR_NOTYPES = [
    'Story', 'story', 'Improvement', 'improvement',
    'Epic', 'epic',
  ];

  // Business Requests live in the MDT project (ProductHub backlog).
  const BR_PROJECT_KEYS = ['MDT'];

  // Resolve allowed issue types for the non-BR half of each source.
  // For sources that include BRs, typesForSource scopes the ph_issues query;
  // BRs are fetched in a parallel query and merged.
  const typesForSource = isBR ? BR_TYPES
    : isStory ? STORY_TYPES
    : isBrEpicFeature ? BR_EPIC_FEATURE_NOTYPES
    : isStoryEpicBr ? STORY_EPIC_BR_NOTYPES
    : isMulti ? STORY_EPIC_FEATURE_TYPES
    : EPIC_TYPES;

  // Whether this source includes a separate BR fetch
  const needsBRFetch = isMultiWithBR || isBrEpicFeature || isStoryEpicBr;

  // Recent candidates (shown on first open)
  const { data: recentCandidates = [] } = useQuery({
    queryKey: ['ph-recent-parent-canonical', parentSource, projectKey],
    enabled: isBR ? true : !!projectKey,
    queryFn: async (): Promise<CandidateRow[]> => {
      // Mixed scope: non-BR parents from current project + BR parents from MDT.
      if (needsBRFetch) {
        const [nonBr, br] = await Promise.all([
          supabase.from('ph_issues')
            .select('id, issue_key, summary, issue_type, status, status_category')
            .in('issue_type', STORY_EPIC_FEATURE_TYPES)
            .eq('project_key', projectKey)
            .is('deleted_at', null)
            .neq('status_category', 'done')
            .order('jira_updated_at', { ascending: false, nullsFirst: false })
            .limit(4),
          supabase.from('ph_issues')
            .select('id, issue_key, summary, issue_type, status, status_category')
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
        .select('id, issue_key, summary, issue_type, status, status_category')
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
            .select('id, issue_key, summary, issue_type, status, status_category')
            .in('issue_type', STORY_EPIC_FEATURE_TYPES)
            .eq('project_key', projectKey)
            .is('deleted_at', null)
            .order('jira_updated_at', { ascending: false, nullsFirst: false })
            .limit(200),
          supabase.from('ph_issues')
            .select('id, issue_key, summary, issue_type, status, status_category')
            .in('issue_type', BR_TYPES)
            .in('project_key', BR_PROJECT_KEYS)
            .is('deleted_at', null)
            .order('jira_updated_at', { ascending: false, nullsFirst: false })
            .limit(200),
        ]);
        return [...((nonBr.data || []) as CandidateRow[]), ...((br.data || []) as CandidateRow[])];
      }
      let q = supabase.from('ph_issues')
        .select('id, issue_key, summary, issue_type, status, status_category')
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
      const effectiveSummary = parentSummary?.summary ?? parentSummaryFallback ?? null;
      const effectiveType = parentSummary?.issue_type ?? iconType;
      if (parentKey && effectiveSummary) {
        return (
          <button
            title={`Change ${noun}`}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 8,
              borderRadius: 3, fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))',
              transition: 'background 150ms', width: '100%', textAlign: 'left',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-surface-sunken, var(--cp-bg-sunken))')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <JiraIssueTypeIcon type={effectiveType} size={16} />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <span style={{ fontFamily: 'var(--cp-font-mono)', marginRight: 6 }}>{parentKey}</span>
              {effectiveSummary}
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
              borderRadius: 3, fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))',
              transition: 'background 150ms',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-surface-sunken, var(--cp-bg-sunken))')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <JiraIssueTypeIcon type={iconType} size={16} />
            <span style={{ fontFamily: 'var(--cp-font-mono)' }}>{parentKey}</span>
          </button>
        );
      }
      return (
        <button
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text-subtlest, var(--cp-text-secondary))', borderRadius: 3,
            transition: 'background 150ms',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-surface-sunken, var(--cp-bg-sunken))')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          None
        </button>
      );
    }

    // Breadcrumb variant — parent present: matches Jira breadcrumb link style
    // jira-compare 2026-05-16 corrected: Jira breadcrumb items are 14px/400/rgb(80,82,88)
    if (parentKey) {
      return (
        <button
          title={`Change ${noun}`}
          style={{
            background: 'transparent', border: 'none', borderRadius: 3, cursor: 'pointer',
            padding: '2px 4px', display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 'var(--ds-font-size-400)', fontWeight: 400, color: 'var(--ds-text-subtle)',
            fontFamily: 'var(--cp-font-body)', lineHeight: '20px',
            transition: 'background 150ms, color 150ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--ds-background-neutral-hovered)'; e.currentTarget.style.color = 'var(--ds-text)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ds-text-subtle)'; }}
        >
          <JiraIssueTypeIcon type={iconType} size={14} />
          <span>{parentKey}</span>
        </button>
      );
    }
    // Jira-parity "Add parent" trigger — plain text, matches breadcrumb link style.
    // jira-compare 2026-05-16 corrected: 14px/400/rgb(80,82,88) — Jira breadcrumbs are 14px.
    return (
      <button
        className="awAddParentLink"
        title={`Add ${noun}`}
        aria-label={`Add ${noun}`}
        style={{
          background: 'transparent', border: 'none', borderRadius: 3, cursor: 'pointer',
          padding: '2px 4px', display: 'inline-flex', alignItems: 'center',
          fontSize: 'var(--ds-font-size-400)', fontWeight: 400, color: 'var(--ds-text-subtle)',
          fontFamily: 'var(--cp-font-body)', lineHeight: '20px',
          transition: 'background 150ms, color 150ms',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--ds-background-neutral-hovered)'; e.currentTarget.style.color = 'var(--ds-text)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ds-text-subtle)'; }}
        onFocus={e => { e.currentTarget.style.background = 'var(--ds-background-neutral-hovered)'; }}
        onBlur={e => { e.currentTarget.style.background = 'transparent'; }}
      >
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
          boxShadow: '0 8px 16px var(--ds-shadow-raised, rgba(0,0,0,0.12)), 0 0 1px var(--ds-shadow-raised, rgba(0,0,0,0.12))',
          width: showAllPanel ? 480 : 380,
        }}
      >
        {!showAllPanel ? (
          <>
            {/* Recent items */}
            <div style={{ padding: '10px 16px 6px', fontSize: 'var(--ds-font-size-100)', fontWeight: 700, color: 'var(--ds-text-subtlest, var(--cp-text-secondary))', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
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
                    fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))', transition: 'background 100ms',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-surface-sunken, var(--cp-bg-sunken))')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <JiraIssueTypeIcon type={row.issue_type ?? iconType} size={16} />
                  <span>{row.issue_key} {row.summary}</span>
                </button>
              ))}
              {recentCandidates.length === 0 && (
                <div style={{ padding: '12px 16px', fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtlest, var(--cp-text-secondary))' }}>No {plural} found</div>
              )}
            </div>
            <div style={{ borderTop: '1px solid var(--ds-border)' }}>
              {/* Unlink parent */}
              {parentKey && (
                <button
                  onClick={() => handleSelect(null)}
                  style={{
                    width: '100%', padding: '10px 16px', border: 'none', background: 'transparent',
                    textAlign: 'left', cursor: 'pointer', fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))', fontWeight: 400,
                    transition: 'background 100ms',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-surface-sunken, var(--cp-bg-sunken))')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  Unlink parent
                </button>
              )}
              <button
                onClick={() => setShowAllPanel(true)}
                style={{
                  width: '100%', padding: '10px 16px', border: 'none', background: 'transparent',
                  textAlign: 'left', cursor: 'pointer', fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))', fontWeight: 500,
                  transition: 'background 100ms',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-surface-sunken, var(--cp-bg-sunken))')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                View all {plural}
              </button>
            </div>
          </>
        ) : (
          /* "View all" panel with search */
          <div style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: 'var(--ds-font-size-600)', fontWeight: 700, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))', marginBottom: 8 }}>Change {noun}</div>
            <div style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtlest, var(--cp-text-secondary))', marginBottom: 4 }}>
              Select a parent work item. Work items can only belong to one parent at a time.
            </div>
            {parentKey && (
              <div style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))', marginBottom: 16 }}>
                <strong>{issueKey}</strong> is currently assigned to <strong>{parentKey}</strong>.
              </div>
            )}
            <div style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))', marginBottom: 6 }}>{Noun}</div>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Choose parent"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                autoFocus
                style={{
                  width: '100%', padding: '8px 12px', border: '2px solid var(--ds-background-information-bold)', borderRadius: 4,
                  fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))', outline: 'none', background: 'var(--ds-surface)',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid var(--cp-lozenge-grey-bg, var(--cp-border-neutral))', borderTop: 'none', borderRadius: '0 0 4px 4px', background: 'var(--ds-surface)' }}>
                {parentKey && (
                  <button
                    onClick={() => { handleSelect(null); handleReset(); }}
                    style={{
                      width: '100%', padding: '10px 14px', border: 'none', background: 'var(--ds-surface-sunken, var(--cp-bg-sunken))',
                      textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                      fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-background-danger-bold)', fontWeight: 500, transition: 'background 100ms',
                      borderBottom: '1px solid var(--ds-border)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-background-danger)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--ds-surface-sunken, var(--cp-bg-sunken))')}
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
                        fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))', transition: 'background 100ms',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-background-information)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <JiraIssueTypeIcon type={row.issue_type ?? iconType} size={16} />
                      <span>{row.issue_key} {row.summary}</span>
                    </button>
                  ))}
                {allCandidates.length === 0 && (
                  <div style={{ padding: '12px 14px', fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtlest, var(--cp-text-secondary))' }}>No {plural} found</div>
                )}
              </div>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
