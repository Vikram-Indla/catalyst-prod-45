/**
 * RingView — V13 ADS token compliance + visual redesign.
 *
 * FAILS until RingView.tsx:
 *   1. Imports and uses token() from @atlaskit/tokens (no --cp-* vars in output)
 *   2. Renders centre avatar at 72px (was 56px)
 *   3. SVG spokes use ADS border token (not --ds-text-disabled)
 *   4. Orbital card Row 1 no longer outputs uppercase item_type text label
 *
 * Updated 2026-07-09:
 *   - The centre avatar was later unified onto the canonical PresenceRing
 *     component ("feat(r360): add PresenceRing to all avatar surfaces"),
 *     which renders it at PresenceRing/CatalystAvatar's "xlarge" size (96px),
 *     not the original hand-rolled 72px div — a deliberate reuse-over-
 *     hand-rolled-UI decision (CLAUDE.md canonical-component rule). Assertion
 *     updated from 72px to 96px to match.
 *   - The SVG spoke fallback chain (`T.borderBold`) had a real bug: it fell
 *     back through `--ds-text-disabled` (a text token) before reaching
 *     `--ds-border-bold`. Fixed in RingView.tsx to fall back straight to
 *     `--ds-border-bold`.
 *
 * Note: vitest may fail at startup on Node 20.12.2 (rolldown styleText compat bug
 * — pre-existing environment issue). Tests are written for when Node is upgraded.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@atlaskit/tokens', () => ({ token: (_: string, fb: string) => fb }));
vi.mock('@/hooks/useTheme', () => ({ useTheme: () => ({ isDark: false }) }));
vi.mock('@/utils/r360Utils', () => ({ initials: (n: string) => n[0].toUpperCase() }));
vi.mock('@/components/r360/R360JiraIcons', () => ({
  getJiraIcon: (type: string) => <span data-testid={`icon-${type}`} />,
}));
vi.mock('@/pages/r360-member/StatusLozenge', () => ({
  StatusLozenge: () => <span data-testid="status-lozenge" />,
}));
vi.mock('@/pages/r360-member/SmallComponents', () => ({
  MiniAvatar: () => <span data-testid="mini-avatar" />,
}));

import { RingView } from '@/pages/r360-member/RingView';

const makeItems = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `id-${i}`,
    item_key: `BAU-${i + 1}`,
    item_type: 'Story',
    title: `Item ${i + 1} — a fairly long summary that may wrap`,
    status: 'In Progress',
    status_category: 'inprogress',
    priority: 'Medium',
    age_days: 5,
    project_key: 'BAU',
    role_on_item: 'Assignee',
    carried_from_label: null,
    resolved_at: null,
    updated_at: null,
    assignee_name: 'Test User',
  }));

const BASE_PROPS = {
  name: 'Alice Test',
  role: 'Senior Engineer',
  onSelect: vi.fn(),
  selected: null,
};

describe('RingView — V13 ADS token compliance', () => {
  it('renders no --cp- CSS variables in the normal ring view (4+ items)', () => {
    const { container } = render(
      <RingView {...BASE_PROPS} items={makeItems(4)} />,
    );
    expect(container.innerHTML).not.toContain('--cp-');
  });

  it('renders no --cp- CSS variables in the summary card view (≤2 items)', () => {
    const { container } = render(
      <RingView {...BASE_PROPS} items={makeItems(1)} />,
    );
    expect(container.innerHTML).not.toContain('--cp-');
  });

  it('renders centre avatar at 96px (PresenceRing "xlarge") in normal ring view', () => {
    const { container } = render(
      <RingView {...BASE_PROPS} items={makeItems(4)} />,
    );
    // The centre avatar now renders via the canonical PresenceRing/
    // CatalystAvatar component — a <span role="img"> at "xlarge" (96px),
    // not a hand-rolled 72px <div>. Query both element types.
    const hits = Array.from(container.querySelectorAll('div, span')).filter(
      el => (el as HTMLElement).style.width === '96px' || (el as HTMLElement).style.height === '96px',
    );
    expect(hits.length).toBeGreaterThan(0);
  });

  it('SVG spokes do not use --ds-text-disabled token (wrong token for a border)', () => {
    const { container } = render(
      <RingView {...BASE_PROPS} items={makeItems(4)} />,
    );
    const svg = container.querySelector('svg');
    expect(svg?.innerHTML ?? '').not.toContain('--ds-text-disabled');
  });

  it('orbital card rows do not render uppercase item_type as standalone text label', () => {
    const { container } = render(
      <RingView {...BASE_PROPS} items={makeItems(4)} />,
    );
    // The old Row 1 rendered item.item_type ("Story") in uppercase as a span
    // New design removes this — icon is the sole type indicator
    const cards = container.querySelectorAll('[data-testid^="r360-ring-card-"]');
    expect(cards.length).toBeGreaterThan(0);
    cards.forEach(card => {
      // The type name as plain text should NOT appear as a label
      const cardText = card.innerHTML;
      // Should not have a span with uppercase 'STORY' (old textTransform:uppercase label)
      // The item_key BAU-N is still there but not the type label
      expect(cardText).not.toMatch(/text-transform:\s*uppercase[^}]*>Story</);
    });
  });

  it('renders 72px avatar in summary card mode too (≤2 items)', () => {
    const { container } = render(
      <RingView {...BASE_PROPS} items={makeItems(2)} />,
    );
    const hits = Array.from(container.querySelectorAll('div')).filter(
      el => el.style.width === '72px',
    );
    expect(hits.length).toBeGreaterThan(0);
  });

  it('completed panel popover contains no --cp- vars when open', () => {
    const doneItem = {
      id: 'done-1',
      item_key: 'BAU-99',
      item_type: 'Story',
      title: 'Completed item',
      status: 'Done',
      status_category: 'done',
      priority: 'Low',
      age_days: 3,
      project_key: 'BAU',
      role_on_item: 'Assignee',
      carried_from_label: null,
      resolved_at: '2026-05-10T12:00:00Z',
      updated_at: '2026-05-10T12:00:00Z',
      assignee_name: 'Test User',
    };
    const { container, getByTestId } = render(
      <RingView {...BASE_PROPS} items={[doneItem, ...makeItems(4)]} />,
    );
    // Open the completed badge popover
    const badge = getByTestId('r360-completed-badge');
    badge.click();
    expect(container.innerHTML).not.toContain('--cp-');
  });
});
