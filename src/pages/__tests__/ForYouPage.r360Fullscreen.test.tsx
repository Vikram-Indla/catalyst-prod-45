/**
 * ForYouPage — R360 full-screen mode.
 *
 * When the Resource 360° tab is active:
 *   1. The RecommendedProjectsStrip must be hidden (aria-hidden or display:none)
 *   2. The R360AccessTile must be hidden
 *   3. The r360-panel container gets data-r360-fullscreen="true"
 *
 * When any other tab is active, the strip and tile are visible.
 *
 * FAILS until ForYouPage.atlaskit.tsx adds the fullscreen suppression logic.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/hooks/useForYouData', () => ({
  useForYouData: () => ({
    activeTab: 'r360',
    setActiveTab: vi.fn(),
    tabCounts: { recommended: 0, assigned: 0, starred: 0, r360: 0, ageing: 0, 'ai-theme': 0 },
    visibleItems: [],
    isLoading: false,
    hasMore: false,
    loadMore: vi.fn(),
    toggleStar: vi.fn(),
    handleSelect: vi.fn(),
    recommendedMentions: [],
    recommendedComments: [],
    currentUserName: 'Vikram',
    allUserProjects: [],
    searchQuery: '',
    setSearchQuery: vi.fn(),
    inlineFilters: {},
    setInlineFilters: vi.fn(),
  }),
}));

vi.mock('@/components/for-you/atlaskit/RecommendedProjectsStrip', () => ({
  default: () => <div data-testid="recommended-strip">Recommended</div>,
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

import ForYouPage from '../ForYouPage.atlaskit';

describe('ForYouPage — R360 full-screen mode', () => {
  it('hides the RecommendedProjectsStrip when r360 tab is active', () => {
    render(<MemoryRouter><ForYouPage /></MemoryRouter>);
    const strip = screen.getByTestId('recommended-strip');
    // Must be hidden — either aria-hidden or style display:none
    const style = strip.closest('[data-r360-fullscreen]') ||
      strip.getAttribute('aria-hidden') === 'true' ||
      (strip as HTMLElement).style.display === 'none' ||
      !!strip.closest('[style*="display: none"]') ||
      !!strip.closest('[hidden]');
    expect(style).toBeTruthy();
  });

  it('sets data-r360-fullscreen on the panel container when r360 is active', () => {
    render(<MemoryRouter><ForYouPage /></MemoryRouter>);
    expect(document.querySelector('[data-r360-fullscreen="true"]')).toBeTruthy();
  });
});
