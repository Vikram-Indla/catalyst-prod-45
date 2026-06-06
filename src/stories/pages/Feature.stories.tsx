/**
 * Feature detail view — renders REAL production components.
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
  id: 'ph-feat-001',
  issue_key: 'BAU-5174', summary: 'Landing Page – DGA modification',
  issue_type: 'Feature', status: 'In Development', status_category: 'indeterminate',
  priority: 'High', assignee_display_name: 'Nada Alfassam', reporter_display_name: 'Hassan Raza Hasrat',
  assignee_account_id: 'u-nada', reporter_account_id: 'u-hassan',
  parent_key: 'BAU-4466', parent_summary: 'Senaei App – Revamp (UI)',
  labels: ['dga', 'landing-page'], severity: null, due_date: null,
  project_key: 'BAU', description_adf: null, deleted_at: null, sprint_release: null,
  description_text: 'Modify the public landing page to align with DGA guidelines — accessibility, bilingual support, and unified header.',
  jira_created_at: '2026-03-15T10:00:00Z', jira_updated_at: '2026-06-01T14:00:00Z',
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

function RealFeatureView({ panelMode = true }: { panelMode?: boolean }) {
  const iss = issue as any;
  return (
    <Seed>
      <div style={{ height: 700, position: 'relative' }}>
        <CatalystViewBase
          isOpen={true} onClose={fn()} panelMode={panelMode}
          itemType="Feature" itemKey={iss.issue_key}
          projectKey="BAU" projectName="Senaei BAU"
          parentKey={iss.parent_key} parentSummary={iss.parent_summary} parentType="Epic" onParentClick={fn()}
          moreMenuItems={[
            { label: 'Print', onClick: fn() },
            { label: 'Clone', onClick: fn() },
            { label: 'Delete', onClick: fn(), danger: true },
          ]}
          leftContent={
            <>
              <CatalystTitleEditor issue={iss} onSave={fn()} />
              <CatalystQuickActions />
              <CatalystKeyDetails issue={iss} itemType="feature" />
              <Description issue={iss} />
            </>
          }
          rightContent={
            <CatalystSidebarDetails
              issue={iss} itemId={iss.issue_key}
              onStatusChange={fn()} onClose={fn()} onDelete={fn()}
              statusPill={<CatalystStatusPill status={iss.status} statusCategory={iss.status_category} onStatusChange={fn()} issueType="Feature" />}
            />
          }
          isLoading={false}
        />
      </div>
    </Seed>
  );
}

const meta: Meta = { title: 'Pages/Feature', parameters: { layout: 'fullscreen' } };
export default meta;

export const PanelMode: StoryObj = { render: () => <RealFeatureView /> };
export const FullPage: StoryObj = { render: () => <RealFeatureView panelMode={false} /> };
