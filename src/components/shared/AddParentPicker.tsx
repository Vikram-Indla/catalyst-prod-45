/**
 * AddParentPicker — Canonical "Add/Change Parent" popover component.
 * Used in breadcrumbs and Key Details across IssueContentView, StoryDetailModal, etc.
 *
 * Two variants:
 *  - 'breadcrumb': Shows parent key + icon, or "Add parent" link
 *  - 'field': Shows parent summary in a click-to-edit row style
 *
 * Parent source:
 *  - 'epic' (default) → queries ph_issues for Epic/Feature parents (Story behaviour)
 *  - 'business_request' → queries business_requests; only Business Requests are selectable (Epic behaviour)
 *  Visual styling is identical across sources to maintain UI parity with the Story view.
 */
import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { SquarePen } from 'lucide-react';

type ParentSource = 'epic' | 'business_request';

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
  const noun = isBR ? 'business request' : 'epic';
  const Noun = isBR ? 'Business request' : 'Epic';
  const iconType = parentIssueType || (isBR ? 'business request' : 'epic');

  // Business Requests live in ph_issues with issue_type = 'Business Request'
  // (e.g. MDT-740, MDT-693). Scope to the same project as the current issue.
  const BR_TYPES = ['Business Request', 'business request'];
  const EPIC_TYPES = ['Epic', 'epic', 'Feature', 'feature'];

  // Business Requests live in the MDT project (ProductHub backlog).
  // Epics scope to the current project; BRs are cross-project (always MDT).
  const BR_PROJECT_KEYS = ['MDT'];

  // Recent candidates (shown on first open)
  const { data: recentCandidates = [] } = useQuery({
    queryKey: ['ph-recent-parent-canonical', parentSource, projectKey],
    enabled: isBR ? true : !!projectKey,
    queryFn: async (): Promise<CandidateRow[]> => {
      const types = isBR ? BR_TYPES : EPIC_TYPES;
      let q = supabase.from('ph_issues')
        .select('id, issue_key, summary, issue_type, status_category')
        .in('issue_type', types)
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
      const types = isBR ? BR_TYPES : EPIC_TYPES;
      let q = supabase.from('ph_issues')
        .select('id, issue_key, summary, issue_type, status_category')
        .in('issue_type', types)
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
    return (
      <button
        className="awAddParentLink"
        style={{
          background: 'none', border: '1px solid transparent', borderRadius: 4, cursor: 'pointer',
          padding: '2px 6px', display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 13, fontWeight: 500, color: '#1868DB', transition: 'border-color 150ms, background 150ms',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#DEEBFF'; e.currentTarget.style.background = '#F4F5F7'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'none'; }}
      >
        <SquarePen size={13} />
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
              Recent {isBR ? 'business requests' : 'epics'}
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
                  <JiraIssueTypeIcon type={iconType} size={16} />
                  <span>{row.issue_key} {row.summary}</span>
                </button>
              ))}
              {recentCandidates.length === 0 && (
                <div style={{ padding: '12px 16px', fontSize: 13, color: '#6B778C' }}>No {isBR ? 'business requests' : 'epics'} found</div>
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
                View all {isBR ? 'business requests' : 'epics'}
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
                      <JiraIssueTypeIcon type={iconType} size={16} />
                      <span>{row.issue_key} {row.summary}</span>
                    </button>
                  ))}
                {allCandidates.length === 0 && (
                  <div style={{ padding: '12px 14px', fontSize: 13, color: '#6B778C' }}>No {isBR ? 'business requests' : 'epics'} found</div>
                )}
              </div>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
