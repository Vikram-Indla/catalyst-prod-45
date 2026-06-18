import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mutable per-test result for ph_activity_log so we can exercise both the
// "has changes" and the "empty → no card" (anti-flicker) paths.
let actsData: unknown[] = [];

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        // ph_issues: .select().in()  (awaited directly)
        // ph_activity_log: .select().in().in().gte().order()
        in: () => {
          if (table === 'ph_issues') {
            return Promise.resolve({
              data: [{ id: 'uuid-1', issue_key: 'BAU-100', summary: 'Test item', issue_type: 'Story', project_name: 'Senaei BAU' }],
              error: null,
            });
          }
          return {
            in: () => ({
              gte: () => ({
                order: () => Promise.resolve({ data: actsData, error: null }),
              }),
            }),
          };
        },
      }),
    }),
    functions: { invoke: vi.fn() },
  },
}));

vi.mock('@/store/globalSearchStore', () => ({
  useGlobalSearchStore: { getState: () => ({ openDetail: vi.fn() }) },
}));

import { CatyStarredDigest } from '../CatyStarredDigest';

describe('CatyStarredDigest', () => {
  beforeEach(() => { actsData = []; localStorage.clear(); });

  it('renders the insight card with a status transition when an item changed', async () => {
    actsData = [{ id: 'act-1', work_item_id: 'uuid-1', field_name: 'status', old_value: 'In Progress', new_value: 'In QA', created_at: new Date().toISOString() }];
    render(<CatyStarredDigest starredKeys={['BAU-100']} />);
    expect(await screen.findByText("What's changed")).toBeInTheDocument();
    // ForYouRow structure: title, then type · key · project.
    expect(await screen.findByText('Test item')).toBeInTheDocument();
    expect(screen.getByText('BAU-100')).toBeInTheDocument();
    expect(screen.getByText('In QA')).toBeInTheDocument();
  });

  it('never mounts the card when nothing changed (anti-flicker)', async () => {
    actsData = [];
    render(<CatyStarredDigest starredKeys={['BAU-100']} />);
    // Give the effect a tick to resolve, then assert the card is absent — the
    // old code flashed the card in its loading shell before vanishing here.
    await new Promise(r => setTimeout(r, 0));
    expect(screen.queryByText("What's changed")).not.toBeInTheDocument();
  });

  it('renders empty state when no starred keys', () => {
    render(<CatyStarredDigest starredKeys={[]} />);
    expect(screen.getByText(/Star some items/i)).toBeInTheDocument();
  });
});
