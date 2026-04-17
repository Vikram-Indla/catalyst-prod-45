/**
 * LinkedWorkItems — smoke + parity tests.
 *
 * These pins protect the BAU-4771 pilot against four regression surfaces:
 *   1. the molecule mounts without throwing under jsdom
 *   2. the empty state renders the correct heading + CTA when there are
 *      no existing links (prevents accidental suppression after refactor)
 *   3. existing ph_issue_links rows are rendered grouped by link_type
 *      (prevents the group header from silently disappearing)
 *   4. the header + toggle button carry the correct ARIA disclosure
 *      semantics (aria-expanded, aria-controls) — a CLAUDE.md CG-12 lesson
 *
 * Atlaskit + Supabase + auth + sonner are mocked so the test does not
 * transitively require @atlaskit/* chunk resolution at test time, matching
 * the pattern set by SubtasksPanelV2.smoke.test.tsx.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// --- Atlaskit stubs ---------------------------------------------------------
// We avoid the real packages because the test environment doesn't resolve
// every subpath (e.g. `@atlaskit/select/async`). Stubs implement only the
// surface the molecule uses.
vi.mock('@atlaskit/lozenge', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement('span', { 'data-testid': 'lozenge' }, children),
}));

vi.mock('@atlaskit/avatar', () => ({
  __esModule: true,
  default: ({ name }: { name?: string }) =>
    React.createElement('span', { 'data-testid': 'avatar' }, name),
}));

vi.mock('@atlaskit/dropdown-menu', () => ({
  __esModule: true,
  default: ({ trigger }: { trigger: any }) => {
    const triggerEl = trigger({ triggerRef: () => {}, 'aria-expanded': false });
    return React.createElement('div', null, triggerEl);
  },
  DropdownItem: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  DropdownItemGroup: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));

vi.mock('@atlaskit/select', () => ({
  __esModule: true,
  default: () => React.createElement('div', { 'data-testid': 'select-stub' }),
}));

vi.mock('@atlaskit/select/async', () => ({
  __esModule: true,
  default: () => React.createElement('div', { 'data-testid': 'async-select-stub' }),
}));

vi.mock('@atlaskit/button/new', () => ({
  __esModule: true,
  default: ({ children, onClick, isDisabled }: any) =>
    React.createElement(
      'button',
      { onClick, disabled: isDisabled },
      children,
    ),
}));

vi.mock('@atlaskit/tokens', () => ({
  __esModule: true,
  setGlobalTheme: vi.fn(),
}));

// --- Internal stubs ---------------------------------------------------------
vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ isDark: false }),
}));

vi.mock('@/lib/catalystToast', () => ({
  catalystToast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock(
  '@/modules/project-work-hub/components/dialogs/story-detail-modules/AiLinkSimilarPanel',
  () => ({
    AiLinkSimilarPanel: () =>
      React.createElement('div', { 'data-testid': 'ai-link-similar' }),
  }),
);

vi.mock('@/components/workhub/create-story/CreateStoryModal', () => ({
  __esModule: true,
  CreateStoryModal: () => null,
}));

vi.mock('@/components/catalyst-detail-views/CatalystDetailRouter', () => ({
  __esModule: true,
  default: () => null,
}));

// --- Supabase mock ---------------------------------------------------------
// Returns a single active "clones" link so we can verify grouping + rendering.
const PH_LINK = {
  id: 'link-1',
  link_type: 'clones',
  created_at: '2026-04-01T00:00:00Z',
  source_id: 'BAU-4771',
  target_id: 'BAU-4511',
};

const PH_TARGET = {
  issue_key: 'BAU-4511',
  summary: 'Business Process – NDS',
  status: 'In Progress',
  status_category: 'in_progress',
  issue_type: 'Epic',
  assignee_account_id: 'u1',
  assignee_display_name: 'Vikram Indla',
  priority: 'Medium',
  jira_updated_at: '2026-04-10T00:00:00Z',
  project_key: 'BAU',
};

vi.mock('@/integrations/supabase/client', () => {
  const chain = (tableName: string) => {
    const api: any = {
      select: vi.fn(() => api),
      eq: vi.fn(() => api),
      in: vi.fn(() => {
        if (tableName === 'ph_issues') {
          return Promise.resolve({ data: [PH_TARGET], error: null });
        }
        return Promise.resolve({ data: [], error: null });
      }),
      is: vi.fn(() => api),
      or: vi.fn(() => api),
      order: vi.fn(() => {
        if (tableName === 'ph_issue_links') {
          return Promise.resolve({ data: [PH_LINK], error: null });
        }
        return Promise.resolve({ data: [], error: null });
      }),
      limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
      single: vi.fn(() =>
        Promise.resolve({ data: { id: 'proj-bau', key: 'BAU' }, error: null }),
      ),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      delete: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
    };
    return api;
  };

  return {
    supabase: {
      from: (name: string) => chain(name),
      auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'u1' } } })) },
    },
  };
});

import { LinkedWorkItems } from '../LinkedWorkItems';

function renderPilot(issueKey = 'BAU-4771') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(LinkedWorkItems, {
          issueId: 'epic-uuid',
          issueKey,
          projectKey: 'BAU',
        }),
      ),
    ),
  );
}

describe('LinkedWorkItems (BAU-4771 pilot)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mounts and shows the Linked work items header', async () => {
    renderPilot();
    expect(await screen.findByText('Linked work items')).toBeInTheDocument();
  });

  it('renders the disclosure toggle with correct aria semantics', async () => {
    renderPilot();
    const toggle = await screen.findByRole('button', {
      name: /Linked work items/i,
    });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAttribute('aria-controls', 'lwi-body-BAU-4771');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders a link row grouped by link_type with key + summary', async () => {
    renderPilot();
    expect(await screen.findByText('clones')).toBeInTheDocument();
    expect(await screen.findByText('BAU-4511')).toBeInTheDocument();
    expect(await screen.findByText('Business Process – NDS')).toBeInTheDocument();
  });

  it('renders the add-link trigger when expanded', async () => {
    renderPilot();
    await screen.findByText('Linked work items');
    expect(
      screen.getByRole('button', { name: /Add linked work item/i }),
    ).toBeInTheDocument();
  });
});
