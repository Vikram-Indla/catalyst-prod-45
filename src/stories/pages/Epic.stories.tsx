/**
 * Epic detail view — renders REAL production components.
 * NO hand-rolled HTML. CatalystViewBase + CatalystSidebarDetails + CatalystKeyDetails.
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
import { ISSUES } from '../fixtures/production-data';

const issue = {
  ...ISSUES.epic,
  id: 'ph-epic-001',
  project_key: 'BAU',
  description_adf: null,
  deleted_at: null,
  sprint_release: null,
  assignee_account_id: 'u-nada',
  reporter_account_id: 'u-nada',
  due_date: '2026-09-30',
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

function RealEpicView({ panelMode = true }: { panelMode?: boolean }) {
  const iss = issue as any;
  return (
    <Seed>
      <div style={{ height: 700, position: 'relative' }}>
        <CatalystViewBase
          isOpen={true} onClose={fn()} panelMode={panelMode}
          itemType="Epic" itemKey={iss.issue_key}
          projectKey={iss.project_key} projectName="Senaei BAU"
          moreMenuItems={[
            { label: 'Print', onClick: fn() },
            { label: 'Clone', onClick: fn() },
            { label: 'Delete', onClick: fn(), danger: true },
          ]}
          leftContent={
            <>
              <CatalystTitleEditor issue={iss} onSave={fn()} />
              <CatalystQuickActions />
              <CatalystKeyDetails issue={iss} itemType="epic" showPriority={false} />
              <Description issue={iss} />
            </>
          }
          rightContent={
            <CatalystSidebarDetails
              issue={iss} itemId={iss.issue_key}
              onStatusChange={fn()} onClose={fn()} onDelete={fn()}
              statusPill={
                <CatalystStatusPill
                  status={iss.status} statusCategory={iss.status_category}
                  onStatusChange={fn()} issueType="Epic"
                />
              }
            />
          }
          isLoading={false}
        />
      </div>
    </Seed>
  );
}

const meta: Meta = { title: 'Pages/Epic', parameters: { layout: 'fullscreen' } };
export default meta;

export const PanelMode: StoryObj = { render: () => <RealEpicView /> };
export const FullPage: StoryObj = { render: () => <RealEpicView panelMode={false} /> };
