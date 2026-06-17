/**
 * ForYouPage — R360 full-screen mode.
 *
 * When the Resource 360° tab is active the r360-panel container gets
 * data-r360-fullscreen="true".
 */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/hooks/useForYouData', () => ({
  useForYouData: () => ({
    activeTab: 'r360',
    setActiveTab: vi.fn(),
    tabCounts: { recommended: 0, assigned: 0, starred: 0, r360: 0, ageing: 0, 'ai-theme': 0 },
    workItems: [],
    visibleItems: [],
    isLoading: false,
    hasMore: false,
    loadMore: vi.fn(),
    toggleStar: vi.fn(),
    trackView: vi.fn(),
    handleSelect: vi.fn(),
    recommendedMentions: [],
    recommendedComments: [],
    currentUserName: 'Vikram',
    allUserProjects: [],
    user: null,
    searchQuery: '',
    setSearchQuery: vi.fn(),
    inlineFilters: {},
    setInlineFilters: vi.fn(),
  }),
}));

vi.mock('@/components/R360AccessTile', () => ({
  R360AccessTile: () => <div data-testid="r360-access-tile">Access Tile</div>,
}));

vi.mock('@/components/for-you/atlaskit/R360Panel', () => ({
  default: () => <div data-testid="r360-panel" />,
}));

vi.mock('@/components/for-you/atlaskit/ForYouTabs', () => ({
  default: ({ activeTab, onChange }: any) => <div data-testid="for-you-tabs" />,
  FOR_YOU_TAB_KEY: 'catalyst.forYou.activeTab.v1',
  FOR_YOU_TAB_ORDER: [{ id: 'r360', label: 'Resource 360°', showCount: false }],
}));

vi.mock('@atlaskit/tokens', () => ({ token: (_: string, fb: string) => fb }));

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: { id: 'test-user', email: 'test@test.com' }, session: null, loading: false }),
}));

import ForYouPage from '../ForYouPage.atlaskit';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function renderPage() {
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><ForYouPage /></MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ForYouPage — R360 full-screen mode', () => {
  it('sets data-r360-fullscreen on the panel container when r360 is active', () => {
    renderPage();
    expect(document.querySelector('[data-r360-fullscreen="true"]')).toBeTruthy();
  });
});
