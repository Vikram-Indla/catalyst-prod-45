/**
 * DefectsSection — story-level defect list.
 *
 * jira-compare 2026-05-05 (Patch #10): refactored to use lwi-* CSS classes
 * matching LinkedWorkItemsSection header + row pattern. The section now
 * looks structurally identical to Linked Work Items (same chevron header,
 * same bordered card, same row layout) — it is a filtered view of child
 * issues where issue_type IN ('QA Bug', 'Defect').
 *
 * Data logic (Supabase queries, create, delete) is unchanged.
 */
import React, { useState, useEffect, useRef, useId } from 'react';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import AddIcon from '@atlaskit/icon/glyph/add';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import Lozenge from '@atlaskit/lozenge';
import Avatar from '@atlaskit/avatar';
import Spinner from '@atlaskit/spinner';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { PhIssueRow } from './types';
import { WORK_ITEM_ICONS } from './constants';
import { nextPos } from './helpers';
import { ConfirmDialog } from './ConfirmDialog';
import { createChildIssue, type WorkItemSource } from '../../../lib/workItemRepo';
import { PriorityBars, normalisePriority } from '@/components/shared/PriorityIndicator';
import { resolveAvatarUrl } from '@/lib/avatars';
import { catalystToast } from '@/lib/catalystToast';
import '../../linked-work-items/linked-work-items.css';

type AllowedAppearance = 'default' | 'inprogress' | 'success';
function categoryToAppearance(cat: string | null | undefined): AllowedAppearance {
  const c = (cat ?? '').toLowerCase();
  if (c === 'done') return 'success';
  if (c === 'in_progress' || c === 'inprogress') return 'inprogress';
  return 'default';
}

export function DefectsSection({
  storyKey,
  projectKey,
  parentSource = 'jira',
  parentProjectId = null,
}: {
  storyKey: string;
  projectKey: string;
  parentSource?: WorkItemSource;
  parentProjectId?: string | null;
}) {
  const bodyId = useId();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(true);
  const [creating, setCreating] = useState(false);
  const [draftSummary, setDraftSummary] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; key: string } | null>(null);
  const createRef = useRef<HTMLInputElement>(null);

  const { data: defects = [], isLoading } = useQuery({
    queryKey: ['defects', storyKey],
    queryFn: async () => {
      const [phRes, catRes] = await Promise.all([
        (supabase as any).from('ph_issues')
          .select('id,issue_key,summary,status,status_category,issue_type,assignee_account_id,assignee_display_name,priority,position,jira_created_at,jira_updated_at,deleted_at')
          .eq('parent_key', storyKey).in('issue_type', ['QA Bug', 'Defect']).is('deleted_at', null).is('archived_at', null)
          .order('position', { ascending: true }),
        (supabase as any).from('catalyst_issues')
          .select('id,issue_key,title,status,issue_type,assignee_id,priority,parent_key,created_at,updated_at')
          .eq('parent_key', storyKey).in('issue_type', ['QA Bug', 'Defect'])
          .order('created_at', { ascending: true }),
      ]);
      if (phRes.error) throw phRes.error;
      const ph = (phRes.data ?? []) as PhIssueRow[];
      const seen = new Set(ph.map((r) => r.issue_key));
      const cat: PhIssueRow[] = (catRes.data ?? [])
        .filter((r: any) => r.issue_key && !seen.has(r.issue_key))
        .map((r: any) => ({
          id: r.id, issue_key: r.issue_key, summary: r.title,
          status: r.status, status_category: 'todo', issue_type: r.issue_type,
          assignee_account_id: r.assignee_id ?? null, assignee_display_name: null,
          priority: r.priority, position: null,
          jira_created_at: r.created_at, jira_updated_at: r.updated_at, deleted_at: null,
        }));
      return [...ph, ...cat];
    },
  });

  /* Auto-collapse when empty on first load. */
  useEffect(() => {
    if (!isLoading && defects.length === 0) setExpanded(false);
  }, [isLoading, defects.length]);

  const createMutation = useMutation({
    mutationFn: async (summary: string) => {
      await createChildIssue({
        parent: { source: parentSource, id: '', issueKey: storyKey, projectKey },
        summary, issueType: 'Defect', projectKey,
        projectId: parentProjectId, reporterId: user?.id ?? null,
        priority: 'High', position: nextPos(defects),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defects', storyKey] });
      setDraftSummary('');
      setTimeout(() => createRef.current?.focus(), 50);
    },
    onError: (err) => catalystToast.error('Failed to log defect'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const ts = new Date().toISOString();
      const phRes = await supabase.from('ph_issues').update({ deleted_at: ts }).eq('id', id).select('id');
      if (phRes.data && phRes.data.length > 0) return;
      const catRes = await supabase.from('catalyst_issues').update({ deleted_at: ts }).eq('id', id).select('id');
      if (catRes.error) throw catRes.error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['defects', storyKey] }),
  });

  useEffect(() => { if (creating) setTimeout(() => createRef.current?.focus(), 50); }, [creating]);

  return (
    <>
      <div className="lwi-root">
        {/* ── Header ── */}
        <div className="lwi-header">
          <button
            type="button"
            className="lwi-header__toggle"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            aria-controls={bodyId}
          >
            {expanded ? <ChevronDownIcon label="" size="small" /> : <ChevronRightIcon label="" size="small" />}
            <span className="lwi-header__title">Defects</span>
            {defects.length > 0 && (
              <span className="lwi-header__count" aria-label={`${defects.length} defects`}>
                {defects.length}
              </span>
            )}
          </button>
          {expanded && (
            <button
              type="button"
              className="lwi-header__add"
              onClick={() => { setExpanded(true); setCreating(true); }}
              aria-label="Log defect"
              title="Log defect"
            >
              <AddIcon label="Add defect" size="small" />
            </button>
          )}
        </div>

        {/* ── Body ── */}
        {expanded && (
          <div id={bodyId} className="lwi-body">
            {isLoading && (
              <div className="lwi-skeleton">
                {[0, 1].map((i) => (
                  <div key={i} className="lwi-skeleton__row">
                    <div className="lwi-skeleton__pulse lwi-skeleton__icon" />
                    <div className="lwi-skeleton__pulse lwi-skeleton__key" />
                    <div className="lwi-skeleton__pulse lwi-skeleton__summary" />
                    <div className="lwi-skeleton__pulse lwi-skeleton__status" />
                    <div className="lwi-skeleton__pulse lwi-skeleton__avatar" />
                  </div>
                ))}
              </div>
            )}

            {!isLoading && defects.length === 0 && !creating && (
              <div className="lwi-empty">
                <span className="lwi-empty__heading">No defects logged</span>
                <span className="lwi-empty__sub">Log defects found during testing</span>
                <div className="lwi-empty__cta">
                  <button
                    type="button"
                    onClick={() => setCreating(true)}
                    style={{
                      background: 'none', border: 'none', padding: 0,
                      fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text-brand, var(--cp-primary-60))',
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
                  >
                    + Log defect
                  </button>
                </div>
              </div>
            )}

            {!isLoading && defects.length > 0 && (
              <div className="lwi-group__rows" role="list">
                {defects.map((item) => (
                  <DefectRow
                    key={item.id}
                    item={item}
                    onDelete={() => setDeleteTarget({ id: item.id, key: item.issue_key })}
                    onCopyLink={() => navigator.clipboard.writeText(`${window.location.origin}/issues/${item.issue_key}`)}
                  />
                ))}
              </div>
            )}

            {/* ── Inline create ── */}
            {creating && (
              <div style={{
                display: 'flex', alignItems: 'center',
                border: '1px solid var(--ds-border-focused)', borderRadius: 3, marginTop: 4,
                background: 'var(--ds-surface)', overflow: 'hidden',
              }}>
                <input
                  ref={createRef}
                  type="text"
                  placeholder="Describe the defect…"
                  value={draftSummary}
                  onChange={(e) => setDraftSummary(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && draftSummary.trim()) { e.preventDefault(); createMutation.mutate(draftSummary); }
                    if (e.key === 'Escape') { setCreating(false); setDraftSummary(''); }
                  }}
                  maxLength={255}
                  style={{
                    flex: 1, height: 36, padding: '0 12px',
                    border: 'none', outline: 'none', fontSize: 'var(--ds-font-size-400)',
                    color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))', fontFamily: 'inherit', background: 'transparent',
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 8px', borderLeft: '1px solid var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))' }}>
                  <button
                    onClick={() => { if (draftSummary.trim()) createMutation.mutate(draftSummary); }}
                    disabled={!draftSummary.trim() || createMutation.isPending}
                    title="Create (Enter)"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 28, height: 28, border: '1px solid var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))', borderRadius: 3,
                      background: 'var(--ds-surface-sunken, var(--cp-bg-sunken))',
                      cursor: draftSummary.trim() ? 'pointer' : 'not-allowed',
                      color: 'var(--ds-text-subtlest, var(--cp-text-secondary))',
                      opacity: draftSummary.trim() ? 1 : 0.5,
                    }}
                  >
                    {createMutation.isPending ? <Spinner size="small" /> : '↵'}
                  </button>
                </div>
              </div>
            )}
            {creating && (
              <div style={{ textAlign: 'right', padding: '4px 0 2px' }}>
                <button
                  onClick={() => { setCreating(false); setDraftSummary(''); }}
                  style={{ background: 'none', border: 'none', fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtlest, var(--cp-text-secondary))', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.key ?? ''}?`}
        message="This defect will be soft-deleted. It can be restored within 30 days."
        confirmLabel="Delete"
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}

/* ── DefectRow — lwi-row parity ─────────────────────────────────────────── */
function DefectRow({
  item,
  onDelete,
  onCopyLink,
}: {
  item: PhIssueRow;
  onDelete: () => void;
  onCopyLink: () => void;
}) {
  const typeIcon = WORK_ITEM_ICONS[item.issue_type] ?? WORK_ITEM_ICONS['Defect'] ?? WORK_ITEM_ICONS['Task'] ?? '';
  const appearance = categoryToAppearance(item.status_category);

  return (
    <div className="lwi-row" role="listitem">
      <span className="lwi-row__icon" aria-hidden dangerouslySetInnerHTML={{ __html: typeIcon }} />
      <button
        type="button"
        className="lwi-row__key"
        onClick={() => onCopyLink()}
        title={`Copy link to ${item.issue_key}`}
      >
        {item.issue_key}
      </button>
      <span className="lwi-row__summary" title={item.summary}>
        {item.summary}
      </span>
      <span className="lwi-row__status">
        <Lozenge appearance={appearance}>{item.status}</Lozenge>
      </span>
      <span className="lwi-row__assignee">
        {item.assignee_display_name ? (
          <Avatar
            size="small"
            name={item.assignee_display_name}
            src={resolveAvatarUrl(item.assignee_display_name) ?? undefined}
            borderColor="transparent"
          />
        ) : (
          <span className="lwi-row__avatar-empty" aria-label="Unassigned" />
        )}
      </span>
      <span className="lwi-row__priority" aria-label={`Priority: ${item.priority ?? 'None'}`}>
        <PriorityBars priority={normalisePriority(item.priority)} />
      </span>
      <span className="lwi-row__actions">
        <button
          type="button"
          className="lwi-row__action-btn"
          onClick={() => onDelete()}
          aria-label={`Delete ${item.issue_key}`}
          title="Delete defect"
        >
          <CrossIcon label="Remove" size="small" />
        </button>
      </span>
    </div>
  );
}
