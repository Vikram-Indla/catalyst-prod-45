/**
 * CatalystViewSubtask — Sub-task detail overlay.
 *
 * Uses CatalystViewBase for the shared layout shell and canonical
 * hooks/sections for data + UI. Only subtask-specific sections remain inline:
 *   - Parent story context banner (with parent query)
 *   - Description section
 *   - Acceptance Criteria section
 *   - Priority field in sidebar
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CatalystViewBase } from '../shared/CatalystViewBase';
import { useCatalystIssue, useCatalystIssueMutations } from '../shared/hooks';
import { CatalystTitleEditor, CatalystActivitySection, CatalystSidebarDetails } from '../shared/sections';
import type { CatalystViewBaseProps } from '../shared/types';
import {
  IssueIcon, StatusLozenge,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/shared-components';
import {
  PRIORITY_STYLES,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/constants';

export default function CatalystViewSubtask({
  isOpen, onClose, itemId, projectId, projectKey,
  onOpenItem, panelMode, onTogglePanelMode, navigationItems, onNavigate,
}: CatalystViewBaseProps) {

  const { data: issue, isLoading } = useCatalystIssue(itemId, isOpen);
  const mutations = useCatalystIssueMutations(itemId, onClose);

  const priorityStyle = PRIORITY_STYLES[issue?.priority ?? 'Medium'] ?? PRIORITY_STYLES.Medium;

  /* ── Subtask-specific: parent issue query ── */
  const { data: parentIssue } = useQuery({
    queryKey: ['cv-subtask-parent', issue?.parent_key],
    enabled: !!issue?.parent_key && isOpen,
    queryFn: async () => {
      const { data } = await supabase.from('ph_issues')
        .select('id, issue_key, summary, issue_type, status, status_category')
        .eq('issue_key', issue!.parent_key!)
        .is('deleted_at', null)
        .single();
      return data;
    },
  });

  /* ── LEFT PANEL ─────────────────────────── */
  const leftContent = (
    <>
      {/* SUBTASK-UNIQUE: Parent story context banner */}
      {parentIssue && (
        <div
          onClick={() => onOpenItem?.(parentIssue.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
            background: '#F4F5F7', borderRadius: 6, marginBottom: 16, cursor: 'pointer',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#EBECF0')}
          onMouseLeave={e => (e.currentTarget.style.background = '#F4F5F7')}
        >
          <IssueIcon type={parentIssue.issue_type} size={14} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#5E6C84' }}>{parentIssue.issue_key}</span>
          <span style={{ fontSize: 13, color: '#172B4D', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{parentIssue.summary}</span>
          <StatusLozenge status={parentIssue.status} category={parentIssue.status_category} />
        </div>
      )}

      {/* CANONICAL: Title */}
      <CatalystTitleEditor
        issue={issue ?? null}
        onTitleChange={(t) => mutations.updateField.mutate({ field: 'summary', value: t, oldValue: issue?.summary ?? '' })}
      />

      {/* SUBTASK-UNIQUE: Description */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#172B4D', marginBottom: 8 }}>Description</div>
        <div style={{ fontSize: 14, color: '#172B4D', lineHeight: 1.7, whiteSpace: 'pre-wrap', minHeight: 60 }}>
          {issue?.description_text || <span style={{ color: '#97A0AF', fontStyle: 'italic' }}>Add a description…</span>}
        </div>
      </div>

      {/* SUBTASK-UNIQUE: Acceptance Criteria */}
      {issue?.acceptance_criteria && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#172B4D', marginBottom: 8 }}>Acceptance Criteria</div>
          <div style={{ fontSize: 14, color: '#172B4D', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {issue.acceptance_criteria}
          </div>
        </div>
      )}

      {/* CANONICAL: Activity */}
      <CatalystActivitySection itemId={itemId} isOpen={isOpen} />
    </>
  );

  /* ── RIGHT SIDEBAR ──────────────────────── */
  const rightContent = (
    <CatalystSidebarDetails
      issue={issue ?? null}
      itemId={itemId}
      onStatusChange={(st) => mutations.updateStatus.mutate(st)}
      onClose={onClose}
      onDelete={() => mutations.deleteIssue.mutate()}
      typeLabel="sub-task"
    >
      {/* SUBTASK-UNIQUE: Priority field */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#172B4D', marginBottom: 4 }}>Priority</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px' }}>
          <span style={{ color: priorityStyle.color, fontWeight: 700, fontSize: 14 }}>{priorityStyle.symbol}</span>
          <span style={{ fontSize: 14, color: '#172B4D' }}>{issue?.priority ?? 'Medium'}</span>
        </div>
      </div>
    </CatalystSidebarDetails>
  );

  return (
    <CatalystViewBase
      isOpen={isOpen}
      onClose={onClose}
      panelMode={panelMode}
      itemType={issue?.issue_type || 'Sub-task'}
      itemKey={issue?.issue_key || null}
      parentKey={issue?.parent_key}
      parentType={parentIssue?.issue_type || 'Story'}
      onParentClick={parentIssue ? () => onOpenItem?.(parentIssue.id) : undefined}
      onShare={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied'); }}
      moreMenuItems={[
        { label: 'Clone sub-task', onClick: () => toast('Clone — coming soon') },
        { label: 'Delete sub-task', onClick: () => mutations.deleteIssue.mutate(), danger: true },
      ]}
      onTogglePanelMode={onTogglePanelMode}
      navigationItems={navigationItems}
      currentItemId={itemId}
      onNavigate={onNavigate}
      leftContent={leftContent}
      rightContent={rightContent}
      isLoading={isLoading}
    />
  );
}
