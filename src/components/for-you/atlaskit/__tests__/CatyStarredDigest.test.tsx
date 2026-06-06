import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        in: () => ({
          gte: () => ({
            order: () => Promise.resolve({ data: [
              { issue_key: 'BAU-100', summary: 'Test item', status: 'Done', status_category: 'done', updated_at: new Date().toISOString() },
            ], error: null }),
          }),
        }),
      }),
    }),
    functions: { invoke: vi.fn() },
  },
}));

vi.mock('@/hooks/useForYouData', () => ({
  useForYouData: () => ({
    workItems: [],
    starredItems: ['BAU-100', 'BAU-200'],
    tabCounts: {},
    activeTab: 'starred',
    setActiveTab: vi.fn(),
    isLoading: false,
    isRefreshing: false,
    toggleStar: vi.fn(),
    trackView: vi.fn(),
    recommendedMentions: [],
    recommendedComments: [],
    allUserProjects: [],
    user: null,
  }),
}));

import { CatyStarredDigest } from '../CatyStarredDigest';

describe('CatyStarredDigest', () => {
  it('renders the insight card with title', () => {
    render(<CatyStarredDigest starredKeys={['BAU-100', 'BAU-200']} />);
    expect(screen.getByText("What's changed")).toBeInTheDocument();
  });

  it('renders empty state when no starred keys', () => {
    render(<CatyStarredDigest starredKeys={[]} />);
    expect(screen.getByText(/Star some items/i)).toBeInTheDocument();
  });
});
