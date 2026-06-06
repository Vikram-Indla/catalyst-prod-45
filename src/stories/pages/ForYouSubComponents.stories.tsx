import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React, { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ForYouSubTabs } from '@/components/for-you/ForYouSubTabs';
import { ForYouInlineFilters } from '@/components/for-you/ForYouInlineFilters';

// ─── ForYouSubTabs ─────────────────────────────────────────────────────────

const subTabsMeta: Meta<typeof ForYouSubTabs> = {
  title: 'Pages/For You/SubTabs',
  component: ForYouSubTabs,
  args: {
    activeTab: 'worked',
    counts: { worked: 58, assigned: 24, starred: 3 },
    onTabChange: fn(),
  },
};

export default subTabsMeta;
type STStory = StoryObj<typeof ForYouSubTabs>;

export const WorkedActive: STStory = {};

export const AssignedActive: STStory = {
  args: { activeTab: 'assigned' },
};

export const StarredActive: STStory = {
  args: { activeTab: 'starred' },
};

export const ZeroCounts: STStory = {
  args: { counts: { worked: 0, assigned: 0, starred: 0 } },
};

export const Interactive: StoryObj = {
  render: () => {
    const [tab, setTab] = useState<string>('worked');
    return (
      <ForYouSubTabs
        activeTab={tab as any}
        counts={{ worked: 58, assigned: 24, starred: 3 }}
        onTabChange={setTab as any}
      />
    );
  },
};

// ─── ForYouInlineFilters ───────────────────────────────────────────────────

const projectOpts = [
  { value: 'BAU', label: 'Senaei BAU' },
  { value: 'MWR', label: 'MWR Platform' },
  { value: 'MDT', label: 'MDT Platform' },
  { value: 'INV', label: 'Investor Journey' },
];

const hubOpts = [
  { value: 'project', label: 'Project Hub' },
  { value: 'product', label: 'Product Hub' },
  { value: 'release', label: 'Releases' },
];

export const FiltersDefault: StoryObj = {
  name: 'InlineFilters / Default',
  render: () => (
    <MemoryRouter>
      <div style={{ maxWidth: 900, padding: 16 }}>
        <ForYouInlineFilters
          filters={{}}
          onFiltersChange={fn()}
          projectOptions={projectOpts}
          hubOptions={hubOpts}
          reportedByOptions={[]}
        />
      </div>
    </MemoryRouter>
  ),
};

export const FiltersWithSelections: StoryObj = {
  name: 'InlineFilters / With Active Filters',
  render: () => (
    <MemoryRouter>
      <div style={{ maxWidth: 900, padding: 16 }}>
        <ForYouInlineFilters
          filters={{ project: 'BAU', hub: 'project' }}
          onFiltersChange={fn()}
          projectOptions={projectOpts}
          hubOptions={hubOpts}
          reportedByOptions={[]}
        />
      </div>
    </MemoryRouter>
  ),
};
