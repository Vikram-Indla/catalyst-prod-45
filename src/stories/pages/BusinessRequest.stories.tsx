/**
 * Business Request detail view — renders REAL production components.
 * Uses CatalystViewBase + BrSidebarDetails (the canonical BR sidebar).
 */
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React, { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CatalystViewBase } from '@/components/catalyst-detail-views/shared/CatalystViewBase';
import {
  CatalystTitleEditor,
  CatalystQuickActions,
  CatalystStatusPill,
} from '@/components/catalyst-detail-views/shared/sections';
import { Description } from '@/components/catalyst-detail-views/shared/sections/Description';
import { ISSUES } from '../fixtures/production-data';

const issue = {
  ...ISSUES.businessRequest,
  id: 'ph-br-001',
  project_key: 'MDT',
  description_adf: null,
  deleted_at: null,
  sprint_release: null,
  assignee_account_id: 'u-nada',
  reporter_account_id: null,
  description_text: 'Enable investors to submit fast-track shipment requests directly from the portal, with automatic routing to the operations team and SLA tracking.',
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

function RealBRView({ panelMode = true }: { panelMode?: boolean }) {
  const iss = issue as any;
  return (
    <Seed>
      <div style={{ height: 700, position: 'relative' }}>
        <CatalystViewBase
          isOpen={true} onClose={fn()} panelMode={panelMode}
          itemType="Business Request" itemKey={iss.issue_key}
          projectKey="MDT" projectName="MDT Platform"
          moreMenuItems={[
            { label: 'Print', onClick: fn() },
            { label: 'Clone', onClick: fn() },
            { label: 'Move to product…', onClick: fn() },
            { label: 'Delete', onClick: fn(), danger: true },
          ]}
          leftContent={
            <>
              <CatalystTitleEditor issue={iss} onSave={fn()} />
              <CatalystQuickActions />
              <Description issue={iss} />
            </>
          }
          rightContent={
            <div style={{ padding: 16 }}>
              <CatalystStatusPill
                status={iss.status} statusCategory={iss.status_category}
                onStatusChange={fn()} issueType="Business Request"
              />
              <div style={{ marginTop: 16, fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)' }}>
                <div style={{ fontWeight: 653, fontSize: 14, color: 'var(--ds-text, #292A2E)', marginBottom: 16 }}>Details</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                  <span>Assignee</span>
                  <span style={{ fontSize: 14, color: 'var(--ds-text, #172B4D)' }}>{iss.assignee_display_name ?? 'Unassigned'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                  <span>Priority</span>
                  <span style={{ fontSize: 14, color: 'var(--ds-text, #172B4D)' }}>{iss.priority}</span>
                </div>
              </div>
            </div>
          }
          isLoading={false}
        />
      </div>
    </Seed>
  );
}

const meta: Meta = { title: 'Pages/Business Request', parameters: { layout: 'fullscreen' } };
export default meta;

export const PanelMode: StoryObj = { render: () => <RealBRView /> };
export const FullPage: StoryObj = { render: () => <RealBRView panelMode={false} /> };
