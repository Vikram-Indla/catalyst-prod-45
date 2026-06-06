/**
 * Subtask detail view — renders REAL production components.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React, { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CatalystViewBase } from '@/components/catalyst-detail-views/shared/CatalystViewBase';
import {
  CatalystTitleEditor,
  CatalystQuickActions,
  CatalystKeyDetails,
  CatalystSidebarDetails,
  CatalystStatusPill,
} from '@/components/catalyst-detail-views/shared/sections';
import { Description } from '@/components/catalyst-detail-views/shared/sections/Description';

const issue = {
  id: 'ph-sub-001',
  issue_key: 'BAU-5958', summary: 'Add client-side validation rule for price field',
  issue_type: 'Sub-task', status: 'In Progress', status_category: 'indeterminate',
  priority: 'Medium', assignee_display_name: 'Amadou Ndiaye', reporter_display_name: 'Ahmed Yousry',
  assignee_account_id: 'u-amadou', reporter_account_id: 'u-ahmed',
  parent_key: 'BAU-5957', parent_summary: 'Update product details survey – add price validation',
  labels: [] as string[], severity: null, due_date: null,
  project_key: 'BAU', description_adf: null, deleted_at: null, sprint_release: null,
  description_text: 'Implement the client-side validation rule that rejects negative or zero prices.',
  jira_created_at: '2026-04-18T10:00:00Z', jira_updated_at: '2026-06-01T14:00:00Z',
};

function Seed({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  useEffect(() => {
    qc.setQueryData(['cv-issue-detail', issue.issue_key], issue);
    qc.setQueryData(['cv-watchers', issue.issue_key], []);
    qc.setQueryData(['cv-activity', issue.issue_key], []);
  }, [qc]);
  return <>{children}</>;
}

function RealSubtaskView({ panelMode = true }: { panelMode?: boolean }) {
  const iss = issue as any;
  return (
    <Seed>
      <div style={{ height: 700, position: 'relative' }}>
        <CatalystViewBase
          isOpen={true} onClose={fn()} panelMode={panelMode}
          itemType="Sub-task" itemKey={iss.issue_key}
          projectKey="BAU" projectName="Senaei BAU"
          parentKey={iss.parent_key} parentSummary={iss.parent_summary} parentType="Story" onParentClick={fn()}
          moreMenuItems={[
            { label: 'Print', onClick: fn() },
            { label: 'Clone', onClick: fn() },
            { label: 'Delete', onClick: fn(), danger: true },
          ]}
          leftContent={
            <>
              <CatalystTitleEditor issue={iss} onSave={fn()} />
              <CatalystQuickActions />
              <CatalystKeyDetails issue={iss} itemType="subtask" />
              <Description issue={iss} />
            </>
          }
          rightContent={
            <CatalystSidebarDetails
              issue={iss} itemId={iss.issue_key}
              onStatusChange={fn()} onClose={fn()} onDelete={fn()}
              statusPill={<CatalystStatusPill status={iss.status} statusCategory={iss.status_category} onStatusChange={fn()} issueType="Sub-task" />}
            />
          }
          isLoading={false}
        />
      </div>
    </Seed>
  );
}

const meta: Meta = { title: 'Pages/Subtask', parameters: { layout: 'fullscreen' } };
export default meta;

export const PanelMode: StoryObj = { render: () => <RealSubtaskView /> };
export const FullPage: StoryObj = { render: () => <RealSubtaskView panelMode={false} /> };
