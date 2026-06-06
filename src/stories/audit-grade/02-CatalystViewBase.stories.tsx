
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

import { CatalystViewBase } from '@/components/catalyst-detail-views/shared/CatalystViewBase';

const leftContent = (
  <div style={{ padding: 16 }}>
    <h3 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 16px' }}>Industrial Capabilities: Add Item Interface</h3>
    <div style={{ padding: '16px 0', borderTop: '1px solid var(--ds-border, #DFE1E6)' }}>
      <p style={{ fontSize: 14, color: 'var(--ds-text, #172B4D)' }}>Implement the add item interface for industrial capabilities module with full validation, error handling, and i18n support.</p>
    </div>
  </div>
);

const rightContent = (
  <div style={{ padding: 16 }}>
    <div style={{ fontSize: 12, fontWeight: 653, color: 'var(--ds-text-subtle, #42526E)', marginBottom: 8 }}>Details</div>
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--ds-border, #DFE1E6)' }}>
      <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)' }}>Assignee</span>
      <span style={{ fontSize: 14 }}>Vikram Indla</span>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--ds-border, #DFE1E6)' }}>
      <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)' }}>Reporter</span>
      <span style={{ fontSize: 14 }}>Yazeed Daraz</span>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
      <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)' }}>Priority</span>
      <span style={{ fontSize: 14 }}>High</span>
    </div>
  </div>
);

const navItems = [
  { id: 'BAU-5972', summary: 'Industrial Capabilities: Add Item', issue_key: 'BAU-5972' },
  { id: 'BAU-5973', summary: 'Search Keyword Highlighting', issue_key: 'BAU-5973' },
  { id: 'BAU-5974', summary: 'Default Ranking Algorithm', issue_key: 'BAU-5974' },
];

export default { title: 'Audit Grade/02 — Detail View Shell' };

export const PanelMode: StoryObj = {
  render: () => (
    <Frame width={1200}>
      <div style={{ height: 600, position: 'relative' }}>
        <CatalystViewBase
          isOpen={true} onClose={fn()} panelMode={true}
          itemType="Story" itemKey="BAU-5972" projectKey="BAU" projectName="Senaei BAU"
          moreMenuItems={[
            { label: 'Print', onClick: fn() },
            { label: 'Clone', onClick: fn() },
            { label: 'Delete', onClick: fn(), danger: true },
          ]}
          navigationItems={navItems} currentItemId="BAU-5972" onNavigate={fn()}
          leftContent={leftContent} rightContent={rightContent} isLoading={false}
        />
      </div>
    </Frame>
  ),
};

export const FullPageMode: StoryObj = {
  render: () => (
    <Frame width={1200}>
      <div style={{ height: 700, position: 'relative' }}>
        <CatalystViewBase
          isOpen={true} onClose={fn()} fullPageMode={true}
          itemType="Epic" itemKey="BAU-5400" projectKey="BAU" projectName="Senaei BAU"
          parentKey="MDT-815" parentType="Business Request"
          leftContent={leftContent} rightContent={rightContent} isLoading={false}
        />
      </div>
    </Frame>
  ),
};

export const Loading: StoryObj = {
  render: () => (
    <Frame width={1200}>
      <div style={{ height: 600, position: 'relative' }}>
        <CatalystViewBase
          isOpen={true} onClose={fn()} panelMode={true}
          itemType="Story" itemKey={null} projectKey="BAU"
          leftContent={<div />} rightContent={<div />} isLoading={true}
        />
      </div>
    </Frame>
  ),
};

export const WithBreadcrumbAndParent: StoryObj = {
  render: () => (
    <Frame width={1200}>
      <div style={{ height: 600, position: 'relative' }}>
        <CatalystViewBase
          isOpen={true} onClose={fn()} panelMode={true}
          itemType="Story" itemKey="BAU-5972" projectKey="BAU" projectName="Senaei BAU"
          parentKey="BAU-5400" parentType="Epic" onParentClick={fn()}
          leftContent={leftContent} rightContent={rightContent} isLoading={false}
        />
      </div>
    </Frame>
  ),
};

export const WithNavChevrons: StoryObj = {
  name: 'With Navigation (3 items, 2nd selected)',
  render: () => (
    <Frame width={1200}>
      <div style={{ height: 600, position: 'relative' }}>
        <CatalystViewBase
          isOpen={true} onClose={fn()} panelMode={true}
          itemType="Story" itemKey="BAU-5973" projectKey="BAU"
          navigationItems={navItems} currentItemId="BAU-5973" onNavigate={fn()}
          leftContent={leftContent} rightContent={rightContent} isLoading={false}
        />
      </div>
    </Frame>
  ),
};
