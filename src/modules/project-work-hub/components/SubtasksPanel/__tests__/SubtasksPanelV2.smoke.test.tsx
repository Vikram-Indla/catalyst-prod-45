/**
 * SubtasksPanelV2 — smoke render.
 *
 * Pins that the V2 panel:
 *   • mounts without throwing against a jsdom environment
 *   • renders the empty state and Create CTA when the children query is empty
 *   • does not mount the grid when there are no children
 *
 * The heavy Atlaskit editor, Supabase client, auth hook, sonner, and
 * @/utils/adf are mocked so the test does not transitively require
 * @atlaskit/* package resolution at test time.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/components/shared/AtlaskitEditor', () => ({
  __esModule: true,
  default: React.forwardRef(function MockEditor(_props: unknown, _ref: unknown) {
    return React.createElement('div', { 'data-testid': 'mock-atlaskit-editor' });
  }),
}));

vi.mock('@/utils/adf', () => ({
  adfToPlainText: () => '',
  isADFEmpty: () => true,
  createEmptyADF: () => ({ version: 1, type: 'doc', content: [{ type: 'paragraph', content: [] }] }),
  parseADF: () => null,
}));

vi.mock('@/integrations/supabase/client', () => {
  const emptyListResult = Promise.resolve({ data: [], error: null });
  return {
    supabase: {
      from: () => ({
        select: () => ({
          eq: () => ({
            is: () => ({ order: () => emptyListResult }),
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
          in: () => emptyListResult,
        }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        insert: () => Promise.resolve({ error: null }),
      }),
    },
  };
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'test-user' } }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { SubtasksPanelV2 } from '../SubtasksPanelV2';

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(React.createElement(QueryClientProvider, { client: qc }, ui));
}

describe('SubtasksPanelV2', () => {
  it('renders the Subtasks title and empty state when there are no children', async () => {
    renderWithClient(
      React.createElement(SubtasksPanelV2, {
        storyKey: 'EPIC-1',
        storyId: 'epic-uuid',
        projectKey: 'CAT',
      }),
    );

    expect(await screen.findByText('Subtasks')).toBeInTheDocument();
    expect(await screen.findByText(/No subtasks yet/i)).toBeInTheDocument();
    // Empty state CTA uses plain-text label; the header "+" icon button has aria-label="Create subtask".
    expect(screen.getByText(/\+ Create subtask/i)).toBeInTheDocument();
  });

  it('does not render the grid when children is empty', async () => {
    renderWithClient(
      React.createElement(SubtasksPanelV2, {
        storyKey: 'EPIC-1',
        storyId: 'epic-uuid',
        projectKey: 'CAT',
      }),
    );
    await screen.findByText(/No subtasks yet/i);
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
  });

  it('exposes data-testid for downstream regression tests', async () => {
    renderWithClient(
      React.createElement(SubtasksPanelV2, {
        storyKey: 'EPIC-1',
        storyId: 'epic-uuid',
        projectKey: 'CAT',
      }),
    );
    expect(await screen.findByTestId('subtasks-panel-v2')).toBeInTheDocument();
  });
});
