
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

import Lozenge from '@atlaskit/lozenge';
import Badge from '@atlaskit/badge';
import Spinner from '@atlaskit/spinner';
import Toggle from '@atlaskit/toggle';
import { CatalystProgressTracker } from '@/components/ads/CatalystProgressTracker';
import { CatalystBanner } from '@/components/ads/CatalystBanner';
import { CatalystTag, CatalystTagGroup } from '@/components/ads/CatalystTag';
import { CatalystDrawer } from '@/components/ads/CatalystDrawer';

export default { title: 'Audit Grade/20 — ADS Component Showcase' };

export const Lozenges: StoryObj = {
  render: () => (
    <Frame width={600}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Lozenge appearance="default">To Do</Lozenge>
        <Lozenge appearance="inprogress">In Progress</Lozenge>
        <Lozenge appearance="success">Done</Lozenge>
        <Lozenge appearance="moved">On Hold</Lozenge>
        <Lozenge appearance="removed">Blocked</Lozenge>
        <Lozenge appearance="new">New</Lozenge>
      </div>
    </Frame>
  ),
};
export const Badges: StoryObj = {
  render: () => (
    <Frame width={400}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <span>Comments <Badge>{3}</Badge></span>
        <span>Unread <Badge appearance="primary">{12}</Badge></span>
        <span>Issues <Badge appearance="important">{99}</Badge></span>
        <span>Done <Badge appearance="added">{42}</Badge></span>
      </div>
    </Frame>
  ),
};
export const Spinners: StoryObj = {
  render: () => (
    <Frame width={400}>
      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        <Spinner size="xsmall" />
        <Spinner size="small" />
        <Spinner size="medium" />
        <Spinner size="large" />
        <Spinner size="xlarge" />
      </div>
    </Frame>
  ),
};
export const Toggles: StoryObj = {
  render: () => (
    <Frame width={400}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Toggle id="t1" /> Show done items</label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Toggle id="t2" defaultChecked /> Dark mode</label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Toggle id="t3" isDisabled /> Feature flag (disabled)</label>
      </div>
    </Frame>
  ),
};
export const Tags: StoryObj = {
  render: () => (
    <Frame width={500}>
      <CatalystTagGroup>
        <CatalystTag text="frontend" color="blue" />
        <CatalystTag text="backend" color="green" />
        <CatalystTag text="urgent" color="red" />
        <CatalystTag text="design-system" color="purple" />
        <CatalystTag text="Q3" color="teal" />
      </CatalystTagGroup>
    </Frame>
  ),
};
export const Banner: StoryObj = {
  render: () => <Frame><CatalystBanner appearance="warning">Jira sync is paused. Data may be stale. Contact your admin to resume.</CatalystBanner></Frame>,
};
