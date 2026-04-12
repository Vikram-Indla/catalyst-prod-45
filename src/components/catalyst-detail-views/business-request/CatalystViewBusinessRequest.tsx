/**
 * CatalystViewBusinessRequest — Business Request / Demand detail overlay.
 *
 * Canonical sections: Title, Description, Acceptance Criteria, Priority,
 * Activity, Sidebar.
 * BR-unique: Blue type badge, child issues query + rendering.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FileText } from 'lucide-react';
import { CatalystViewBase } from '../shared/CatalystViewBase';
import { useCatalystIssue, useCatalystIssueMutations } from '../shared/hooks';
import {
  CatalystTitleEditor, CatalystParentLinker, CatalystDescriptionSection, CatalystAcceptanceCriteria,
  CatalystActivitySection, CatalystSidebarDetails,
} from '../shared/sections';
import type { CatalystViewBaseProps } from '../shared/types';
import {
  IssueIcon, StatusLozenge,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/shared-components';

export default function CatalystViewBusinessRequest({
  isOpen, onClose, itemId, projectId, projectKey,
  onOpenItem, panelMode, fullPageMode, onTogglePanelMode, navigationItems, onNavigate,
}: CatalystViewBaseProps) {

  const { data: issue, isLoading } = useCatalystIssue(itemId, isOpen);
  const mutations = useCatalystIssueMutations(itemId, onClose);

  /* ── BR-UNIQUE: child issues query ─────── */
  const { data: childIssues = [] } = useQuery({
    queryKey: ['cv-br-children', issue?.issue_key],
    enabled: !!issue?.issue_key && isOpen,
    queryFn: async () => {
      const { data } = await supabase.from('ph_issues')
        .select('id, issue_key, summary, status, status_category, issue_type, assignee_display_name, priority')
        .eq('parent_key', issue!.issue_key)
        .is('deleted_at', null)
        .order('position', { ascending: true });
      return data || [];
    },
  });

  const doneChildren = childIssues.filter((c: any) => c.status_category === 'done').length;

  const leftContent = (
    <>
      {/* BR-UNIQUE: Type badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px',
        background: '#EFF6FF', borderRadius: 4, marginBottom: 12, fontSize: 12, fontWeight: 600, color: '#1D4ED8',
      }}>
        <FileText size={14} />
        Business Request
      </div>

      <CatalystTitleEditor issue={issue ?? null} onTitleChange={(t) => mutations.updateField.mutate({ field: 'summary', value: t, oldValue: issue?.summary ?? '' })} />
      <CatalystParentLinker issue={issue ?? null} itemId={itemId} itemType="business_request" projectKey={projectKey} onOpenItem={onOpenItem} />
      <CatalystDescriptionSection issue={issue ?? null} />
      <CatalystAcceptanceCriteria issue={issue ?? null} />

      {/* BR-UNIQUE: Child issues */}
      {childIssues.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#172B4D' }}>Child issues</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#5E6C84', background: '#F4F5F7', padding: '1px 6px', borderRadius: 3 }}>{childIssues.length}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
              <div style={{ width: 80, height: 4, borderRadius: 2, background: '#F4F5F7', overflow: 'hidden' }}>
                <div style={{ width: `${(doneChildren / childIssues.length) * 100}%`, height: '100%', borderRadius: 2, background: '#36B37E' }} />
              </div>
              <span style={{ fontSize: 11, color: '#5E6C84' }}>{doneChildren} / {childIssues.length}</span>
            </div>
          </div>
          {childIssues.map((child: any) => (
            <div key={child.id} onClick={() => onOpenItem?.(child.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 4, cursor: 'pointer', transition: 'background 0.12s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <IssueIcon type={child.issue_type} size={14} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#5E6C84', flexShrink: 0 }}>{child.issue_key}</span>
              <span style={{ fontSize: 14, color: '#172B4D', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{child.summary}</span>
              <StatusLozenge status={child.status} category={child.status_category} />
            </div>
          ))}
        </div>
      )}

      <CatalystActivitySection itemId={itemId} isOpen={isOpen} />
    </>
  );

  const rightContent = (
    <CatalystSidebarDetails issue={issue ?? null} itemId={itemId} projectId={projectId} onStatusChange={(st) => mutations.updateStatus.mutate(st)} onClose={onClose} onDelete={() => mutations.deleteIssue.mutate()} typeLabel="business request" />
  );

  return (
    <CatalystViewBase isOpen={isOpen} onClose={onClose} panelMode={panelMode} fullPageMode={fullPageMode}
      itemType={issue?.issue_type || 'Business Request'} itemKey={issue?.issue_key || null}
      projectKey={issue?.project_key || projectKey} projectName={issue?.project_name || undefined}
      parentKey={issue?.parent_key} parentType="Epic"
      onParentClick={issue?.parent_key ? () => onOpenItem?.(issue.parent_key!) : undefined}
      onShare={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied'); }}
      moreMenuItems={[
        { label: 'Clone request', onClick: () => toast('Clone — coming soon') },
        { label: 'Delete request', onClick: () => mutations.deleteIssue.mutate(), danger: true },
      ]}
      onTogglePanelMode={onTogglePanelMode} navigationItems={navigationItems} currentItemId={itemId} onNavigate={onNavigate}
      leftContent={leftContent} rightContent={rightContent} isLoading={isLoading}
    />
  );
}
