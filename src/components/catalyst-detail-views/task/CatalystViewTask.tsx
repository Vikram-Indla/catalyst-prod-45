/**
 * CatalystViewTask — Task detail overlay.
 *
 * Uses CatalystViewBase for the shared layout shell and canonical
 * hooks/sections for data + UI. Only task-specific sections remain inline:
 *   - Description section
 *   - Acceptance Criteria section
 *   - Priority field in sidebar
 */
import React from 'react';
import { toast } from 'sonner';
import { CatalystViewBase } from '../shared/CatalystViewBase';
import { useCatalystIssue, useCatalystIssueMutations } from '../shared/hooks';
import { CatalystTitleEditor, CatalystActivitySection, CatalystSidebarDetails } from '../shared/sections';
import type { CatalystViewBaseProps } from '../shared/types';
import {
  PRIORITY_STYLES,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/constants';

export default function CatalystViewTask({
  isOpen, onClose, itemId, projectId, projectKey,
  onOpenItem, panelMode, onTogglePanelMode, navigationItems, onNavigate,
}: CatalystViewBaseProps) {

  const { data: issue, isLoading } = useCatalystIssue(itemId, isOpen);
  const mutations = useCatalystIssueMutations(itemId, onClose);

  const priorityStyle = PRIORITY_STYLES[issue?.priority ?? 'Medium'] ?? PRIORITY_STYLES.Medium;

  /* ── LEFT PANEL ─────────────────────────── */
  const leftContent = (
    <>
      {/* CANONICAL: Title */}
      <CatalystTitleEditor
        issue={issue ?? null}
        onTitleChange={(t) => mutations.updateField.mutate({ field: 'summary', value: t, oldValue: issue?.summary ?? '' })}
      />

      {/* TASK-UNIQUE: Description */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#172B4D', marginBottom: 8 }}>Description</div>
        <div style={{ fontSize: 14, color: '#172B4D', lineHeight: 1.7, whiteSpace: 'pre-wrap', minHeight: 60 }}>
          {issue?.description_text || <span style={{ color: '#97A0AF', fontStyle: 'italic' }}>Add a description…</span>}
        </div>
      </div>

      {/* TASK-UNIQUE: Acceptance Criteria */}
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
      typeLabel="task"
    >
      {/* TASK-UNIQUE: Priority field */}
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
      itemType={issue?.issue_type || 'Task'}
      itemKey={issue?.issue_key || null}
      parentKey={issue?.parent_key}
      parentType="Story"
      onParentClick={issue?.parent_key ? () => onOpenItem?.(issue.parent_key!) : undefined}
      onShare={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied'); }}
      moreMenuItems={[
        { label: 'Clone task', onClick: () => toast('Clone — coming soon') },
        { label: 'Delete task', onClick: () => mutations.deleteIssue.mutate(), danger: true },
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
