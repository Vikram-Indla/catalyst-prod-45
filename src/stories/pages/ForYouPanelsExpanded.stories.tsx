import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import AssignedPanel from '@/components/for-you/atlaskit/AssignedPanel';
import StarredPanel from '@/components/for-you/atlaskit/StarredPanel';
import ThemeCard from '@/components/for-you/atlaskit/ThemeCard';
import type { WorkItem } from '@/hooks/useForYouData';
import type { Theme } from '@/hooks/useAiThemes';

// ─── Mock WorkItems ────────────────────────────────────────────────────────

const now = new Date().toISOString();
const yesterday = new Date(Date.now() - 86_400_000).toISOString();

function makeWorkItem(overrides: Partial<WorkItem> & { id: string; key: string; summary: string }): WorkItem {
  return {
    mode: 'assigned',
    level: 'standard',
    project: 'Senaei BAU',
    projectKey: 'BAU',
    hub: 'project',
    hubLabel: 'Project Hub',
    updatedAt: yesterday,
    createdAt: '2026-01-15T10:00:00Z',
    assignee: { name: 'Vikram Indla', accountId: 'u1' },
    issueType: 'Story',
    group: 'today',
    status: 'In Progress',
    statusCategory: 'indeterminate',
    priority: 'Medium',
    priorityLevel: 3,
    ...overrides,
  };
}

const assignedItems: WorkItem[] = [
  makeWorkItem({ id: '1', key: 'BAU-5972', summary: 'Industrial Capabilities: Add Item Interface', status: 'In Requirements', statusCategory: 'new', issueType: 'QA Bug' }),
  makeWorkItem({ id: '2', key: 'BAU-5831', summary: 'Upgrade to Production — Request deployment', status: 'In Development', statusCategory: 'indeterminate', issueType: 'Story', priority: 'High', priorityLevel: 2 }),
  makeWorkItem({ id: '3', key: 'BAU-4489', summary: 'Unified Search implementation', status: 'In Progress', statusCategory: 'indeterminate', issueType: 'Task' }),
  makeWorkItem({ id: '4', key: 'BAU-5609', summary: 'Fix section header typography', status: 'Done', statusCategory: 'done', issueType: 'Story' }),
  makeWorkItem({ id: '5', key: 'BAU-4521', summary: 'Decoupling Upgrade to Establish from Supported Services', status: 'Done', statusCategory: 'done', issueType: 'Feature', priority: 'Critical', priorityLevel: 1 }),
  makeWorkItem({ id: '6', key: 'MWR-947', summary: 'Market Place - Raw Material allocation engine', status: 'To Do', statusCategory: 'new', issueType: 'Epic', projectKey: 'MWR', project: 'MWR Platform' }),
];

const starredItems: WorkItem[] = [
  makeWorkItem({ id: '10', key: 'BAU-5737', summary: 'QA Bug triage for release 2.2', starred: true, issueType: 'QA Bug', status: 'In QA', statusCategory: 'indeterminate' }),
  makeWorkItem({ id: '11', key: 'BAU-4435', summary: 'Decoupling initiative — phase 2', starred: true, issueType: 'Feature', status: 'In Progress' }),
  makeWorkItem({ id: '12', key: 'MDT-815', summary: 'Customs Exemption Workflow Level 2', starred: true, issueType: 'Story', projectKey: 'MDT', project: 'MDT Platform' }),
];

// ─── Mock Themes ───────────────────────────────────────────────────────────

const bugTheme: Theme = {
  id: 't1',
  name: 'Industrial Capabilities Validation',
  summary: 'Multiple QA bugs relate to item validation in industrial capabilities. The add-item interface fails silently when required fields are empty, and tooltip descriptions are missing across 4 surfaces.',
  count: 19,
  percentage: 38,
  intent: 'bug',
  issueKeys: ['BAU-5972', 'BAU-5973', 'BAU-5974', 'BAU-5975'],
};

const featureTheme: Theme = {
  id: 't2',
  name: 'Know Your Journey Platform Buildout',
  summary: 'These issues represent the foundational development of the Know Your Journey feature, covering both front-end and back-end aspects including CRUD operations for industrial locations, sectors, and services.',
  count: 6,
  percentage: 12,
  intent: 'feature',
  issueKeys: ['BAU-5059', 'BAU-5061', 'BAU-5057'],
};

const uxTheme: Theme = {
  id: 't3',
  name: 'National Design System Migration',
  summary: 'Issues tracking the systematic migration from the old design system to the new NDS, involving auditing existing UI/UX elements and replacing components across various pages.',
  count: 19,
  percentage: 38,
  intent: 'ux',
  issueKeys: ['MWR-919', 'MWR-902', 'MWR-909'],
};

const infraTheme: Theme = {
  id: 't4',
  name: 'Website SEO & Performance',
  summary: 'Tasks covering Google Search Console errors, page indexing, load time optimization, and performance improvements across the public-facing website.',
  count: 5,
  percentage: 10,
  intent: 'infra',
  issueKeys: ['BAU-5101', 'BAU-5102'],
};

// ─── AssignedPanel ─────────────────────────────────────────────────────────

const assignedMeta: Meta<typeof AssignedPanel> = {
  title: 'Pages/For You/AssignedPanel',
  component: AssignedPanel,
  decorators: [(Story) => <MemoryRouter><div style={{ maxWidth: 900, padding: 16 }}><Story /></div></MemoryRouter>],
  args: {
    items: assignedItems,
    isLoading: false,
    onSelect: fn(),
    onToggleStar: fn(),
  },
};

export default assignedMeta;

type APStory = StoryObj<typeof AssignedPanel>;

export const WithItems: APStory = {};

export const Loading: APStory = {
  args: { items: [], isLoading: true },
};

export const Empty: APStory = {
  args: { items: [], isLoading: false },
};

export const Refreshing: APStory = {
  args: { isRefreshing: true },
};

export const WithThemifyCTA: APStory = {
  args: { onAskCatyThemify: fn() },
};

// ─── StarredPanel ──────────────────────────────────────────────────────────

export const StarredWithItems: StoryObj = {
  name: 'StarredPanel / With Items',
  render: () => (
    <MemoryRouter>
      <div style={{ maxWidth: 900, padding: 16 }}>
        <StarredPanel items={starredItems} isLoading={false} onSelect={fn()} onToggleStar={fn()} onSwitchTab={fn()} />
      </div>
    </MemoryRouter>
  ),
};

export const StarredEmpty: StoryObj = {
  name: 'StarredPanel / Empty',
  render: () => (
    <MemoryRouter>
      <div style={{ maxWidth: 900, padding: 16 }}>
        <StarredPanel items={[]} isLoading={false} onSelect={fn()} onToggleStar={fn()} onSwitchTab={fn()} />
      </div>
    </MemoryRouter>
  ),
};

export const StarredLoading: StoryObj = {
  name: 'StarredPanel / Loading',
  render: () => (
    <MemoryRouter>
      <div style={{ maxWidth: 900, padding: 16 }}>
        <StarredPanel items={[]} isLoading={true} onSelect={fn()} onToggleStar={fn()} />
      </div>
    </MemoryRouter>
  ),
};

// ─── ThemeCard ──────────────────────────────────────────────────────────────

export const ThemeBugCollapsed: StoryObj = {
  name: 'ThemeCard / Bug Intent (collapsed)',
  render: () => (
    <MemoryRouter>
      <div style={{ maxWidth: 640, padding: 16 }}>
        <ThemeCard theme={bugTheme} />
      </div>
    </MemoryRouter>
  ),
};

export const ThemeFeatureExpanded: StoryObj = {
  name: 'ThemeCard / Feature Intent (expanded)',
  render: () => (
    <MemoryRouter>
      <div style={{ maxWidth: 640, padding: 16 }}>
        <ThemeCard theme={featureTheme} defaultExpanded />
      </div>
    </MemoryRouter>
  ),
};

export const ThemeUX: StoryObj = {
  name: 'ThemeCard / UX Intent',
  render: () => (
    <MemoryRouter>
      <div style={{ maxWidth: 640, padding: 16 }}>
        <ThemeCard theme={uxTheme} />
      </div>
    </MemoryRouter>
  ),
};

export const AllThemes: StoryObj = {
  name: 'ThemeCard / All Intents Grid',
  render: () => (
    <MemoryRouter>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, maxWidth: 1200, padding: 16 }}>
        <ThemeCard theme={bugTheme} />
        <ThemeCard theme={featureTheme} />
        <ThemeCard theme={uxTheme} />
        <ThemeCard theme={infraTheme} />
      </div>
    </MemoryRouter>
  ),
};
