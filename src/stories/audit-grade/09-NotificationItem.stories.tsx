
import type { StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React, { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
function Providers({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={qc}><MemoryRouter>{children}</MemoryRouter></QueryClientProvider>;
}
function Frame({ children, width = 900 }: { children: React.ReactNode; width?: number }) {
  return <Providers><div style={{ maxWidth: width, padding: 16, background: 'var(--ds-surface, #fff)' }}>{children}</div></Providers>;
}

import { NotificationItem } from '@/components/layout/NotificationItem';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';

export default { title: 'Audit Grade/09 — Notification Item' };

export const MentionUnread: StoryObj = {
  render: () => <Frame width={400}><NotificationItem id="n1" type="mention" title="Yazeed mentioned you" body="@Vikram can you review the validation logic on BAU-5972?" timestamp={new Date(Date.now() - 1_800_000).toISOString()} read={false} href="/project-hub/BAU/allwork?issue=BAU-5972" sourceIcon={<JiraIssueTypeIcon type="Story" size={24} />} /></Frame>,
};
export const CommentRead: StoryObj = {
  render: () => <Frame width={400}><NotificationItem id="n2" type="comment" title="Nada commented on BAU-5831" body="The deployment is ready for staging review." timestamp={new Date(Date.now() - 7_200_000).toISOString()} read={true} href="#" sourceIcon={<JiraIssueTypeIcon type="QA Bug" size={24} />} /></Frame>,
};
export const StatusChange: StoryObj = {
  render: () => <Frame width={400}><NotificationItem id="n3" type="status" title="BAU-4521 moved to Done" body="Decoupling Upgrade completed by Imran Aslam." timestamp={new Date(Date.now() - 86_400_000).toISOString()} read={false} href="#" /></Frame>,
};
export const OldNotification: StoryObj = {
  render: () => <Frame width={400}><NotificationItem id="n4" type="assign" title="You were assigned BAU-5974" body="Intent Ranking task assigned by Yazeed Daraz." timestamp={new Date(Date.now() - 3 * 86_400_000).toISOString()} read={true} href="#" /></Frame>,
};
export const ListOfNotifications: StoryObj = {
  name: 'Notification Stack (5 items)',
  render: () => (
    <Frame width={400}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <NotificationItem id="n1" type="mention" title="Yazeed mentioned you" body="@Vikram review BAU-5972 validation" timestamp={new Date(Date.now() - 1_800_000).toISOString()} read={false} href="#" />
        <NotificationItem id="n2" type="comment" title="Nada on BAU-5831" body="Deployment ready for staging" timestamp={new Date(Date.now() - 7_200_000).toISOString()} read={false} href="#" />
        <NotificationItem id="n3" type="status" title="BAU-4521 → Done" body="Completed by Imran" timestamp={new Date(Date.now() - 14_400_000).toISOString()} read={true} href="#" />
        <NotificationItem id="n4" type="assign" title="Assigned BAU-5974" body="By Yazeed Daraz" timestamp={new Date(Date.now() - 86_400_000).toISOString()} read={true} href="#" />
        <NotificationItem id="n5" type="mention" title="Andrew on MWR-947" body="@Vikram allocation engine review" timestamp={new Date(Date.now() - 2 * 86_400_000).toISOString()} read={true} href="#" />
      </div>
    </Frame>
  ),
};
