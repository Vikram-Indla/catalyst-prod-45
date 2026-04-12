/**
 * CatalystViewIncident — Production Incident detail overlay.
 *
 * Canonical sections: Title, Description, Acceptance Criteria (as "Impact /
 * Root Cause"), Priority, Activity, Sidebar.
 * Incident-unique: Severity banner (red AlertTriangle).
 */
import React from 'react';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import { CatalystViewBase } from '../shared/CatalystViewBase';
import { useCatalystIssue, useCatalystIssueMutations } from '../shared/hooks';
import {
  CatalystTitleEditor, CatalystParentLinker, CatalystDescriptionSection, CatalystAcceptanceCriteria,
  CatalystActivitySection, CatalystSidebarDetails,
} from '../shared/sections';
import type { CatalystViewBaseProps } from '../shared/types';
import {
  PRIORITY_STYLES,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/constants';

export default function CatalystViewIncident({
  isOpen, onClose, itemId, projectId, projectKey,
  onOpenItem, panelMode, fullPageMode, onTogglePanelMode, navigationItems, onNavigate,
}: CatalystViewBaseProps) {

  const { data: issue, isLoading } = useCatalystIssue(itemId, isOpen);
  const mutations = useCatalystIssueMutations(itemId, onClose);
  const priorityStyle = PRIORITY_STYLES[issue?.priority ?? 'Medium'] ?? PRIORITY_STYLES.Medium;

  const leftContent = (
    <>
      {/* INCIDENT-UNIQUE: Severity banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
        background: '#FFF5F5', borderRadius: 6, marginBottom: 16, border: '1px solid #FFEDEB',
      }}>
        <AlertTriangle size={16} color="#FF5630" />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#BF2600' }}>Production Incident</span>
        <span style={{ fontSize: 12, color: '#5E6C84', marginLeft: 'auto' }}>
          Priority: <span style={{ color: priorityStyle.color, fontWeight: 700 }}>{priorityStyle.symbol} {issue?.priority ?? 'Medium'}</span>
        </span>
      </div>

      <CatalystTitleEditor issue={issue ?? null} onTitleChange={(t) => mutations.updateField.mutate({ field: 'summary', value: t, oldValue: issue?.summary ?? '' })} />
      <CatalystParentLinker issue={issue ?? null} itemId={itemId} itemType="incident" projectKey={projectKey} onOpenItem={onOpenItem} />
      <CatalystDescriptionSection issue={issue ?? null} />
      <CatalystAcceptanceCriteria issue={issue ?? null} label="Impact / Root Cause" />
      <CatalystActivitySection itemId={itemId} isOpen={isOpen} />
    </>
  );

  const rightContent = (
    <CatalystSidebarDetails issue={issue ?? null} itemId={itemId} projectId={projectId} onStatusChange={(st) => mutations.updateStatus.mutate(st)} onClose={onClose} onDelete={() => mutations.deleteIssue.mutate()} typeLabel="incident" />
  );

  return (
    <CatalystViewBase isOpen={isOpen} onClose={onClose} panelMode={panelMode} fullPageMode={fullPageMode}
      itemType={issue?.issue_type || 'Production Incident'} itemKey={issue?.issue_key || null}
      projectKey={issue?.project_key || projectKey}
      parentKey={issue?.parent_key} parentType="Epic"
      onParentClick={issue?.parent_key ? () => onOpenItem?.(issue.parent_key!) : undefined}
      onShare={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied'); }}
      moreMenuItems={[
        { label: 'Clone incident', onClick: () => toast('Clone — coming soon') },
        { label: 'Delete incident', onClick: () => mutations.deleteIssue.mutate(), danger: true },
      ]}
      onTogglePanelMode={onTogglePanelMode} navigationItems={navigationItems} currentItemId={itemId} onNavigate={onNavigate}
      leftContent={leftContent} rightContent={rightContent} isLoading={isLoading}
    />
  );
}
