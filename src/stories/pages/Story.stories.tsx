/**
 * Story detail view — renders the REAL CatalystViewBase + CatalystSidebarDetails
 * + CatalystKeyDetails + Description production components.
 *
 * Data is pre-seeded into the QueryClient cache so hooks resolve immediately.
 * NO hand-rolled HTML. Every element on screen is the actual production component.
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
  ...ISSUES.story,
  id: 'ph-story-001',
  project_key: 'BAU',
  description_adf: null,
  deleted_at: null,
  sprint_release: null,
  assignee_account_id: 'u-habib',
  reporter_account_id: 'u-ali',
};

/** Pre-seeds QueryClient so production hooks don't hit Supabase */
function Seed({ issueKey, children }: { issueKey: string; children: React.ReactNode }) {
  const qc = useQueryClient();
  useEffect(() => {
    qc.setQueryData(['cv-issue-detail', issueKey], issue);
    qc.setQueryData(['cv-watchers', issueKey], []);
    qc.setQueryData(['cv-activity', issueKey], []);
  }, [qc, issueKey]);
  return <>{children}</>;
}

function RealStoryView({ panelMode = true }: { panelMode?: boolean }) {
  const iss = issue as any;
  return (
    <Seed issueKey={iss.issue_key}>
      <div style={{ height: 700, position: 'relative' }}>
        <CatalystViewBase
          isOpen={true}
          onClose={fn()}
          panelMode={panelMode}
          itemType="Story"
          itemKey={iss.issue_key}
          projectKey={iss.project_key}
          projectName="Senaei BAU"
          parentKey={iss.parent_key}
          parentSummary={iss.parent_summary}
          parentType="Epic"
          onParentClick={fn()}
          moreMenuItems={[
            { label: 'Print', onClick: fn() },
            { label: 'Clone', onClick: fn() },
            { label: 'Move', onClick: fn() },
            { label: 'Delete', onClick: fn(), danger: true },
          ]}
          leftContent={
            <>
              <CatalystTitleEditor issue={iss} onSave={fn()} />
              <CatalystQuickActions />
              <CatalystKeyDetails issue={iss} itemType="story" />
              <Description issue={iss} />
            </>
          }
          rightContent={
            <CatalystSidebarDetails
              issue={iss}
              itemId={iss.issue_key}
              onStatusChange={fn()}
              onClose={fn()}
              onDelete={fn()}
              statusPill={
                <CatalystStatusPill
                  status={iss.status}
                  statusCategory={iss.status_category}
                  onStatusChange={fn()}
                  issueType="Story"
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

const meta: Meta = {
  title: 'Pages/Story',
  parameters: { layout: 'fullscreen' },
};
export default meta;

export const PanelMode: StoryObj = {
  render: () => <RealStoryView panelMode />,
};

export const FullPage: StoryObj = {
  render: () => <RealStoryView panelMode={false} />,
};

export const Loading: StoryObj = {
  render: () => (
    <div style={{ height: 700, position: 'relative' }}>
      <CatalystViewBase
        isOpen={true} onClose={fn()} panelMode
        itemType="Story" itemKey={null} projectKey="BAU"
        leftContent={<div />} rightContent={<div />} isLoading={true}
      />
    </div>
  ),
};
