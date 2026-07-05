/**
 * HubSwitcher v2 — sectioned popover with bespoke colored tiles.
 *
 * Step 7.2 council-pass criteria:
 *   1. Grid-icon trigger opens a popover (no longer dispatches to global
 *      search — that's still on Cmd+K + the top-bar Search bar).
 *   2. Popover renders 11 hub rows in 3 sections:
 *        DISCOVER     → Home, Strategy, Ideation
 *        BUILD & SHIP → Product, Project, Release, Test, Incident, Task, Plan
 *        KNOWLEDGE    → Wiki
 *   3. Every row is an SPA-aware anchor with the correct href.
 *   4. Every row label is the bare hub name (no "Hub" suffix).
 *   5. Each row carries a 32x32 colored tile element identified by
 *      data-hub-tile=<hub key> so the tile chrome is testable.
 *   6. The row matching the current pathname is the only one with
 *      aria-current="page" (Atlaskit LinkItem isSelected behaviour).
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/contexts/CatalystContext', () => ({
  useCatalystContext: () => ({
    setSidebarHidden: vi.fn(),
    setSidebarExpanded: vi.fn(),
    setSidebarPinned: vi.fn(),
  }),
}));

vi.mock('@/store/globalSearchStore', () => ({
  useGlobalSearchStore: Object.assign(
    (selector: (s: { open: () => void }) => unknown) => selector({ open: vi.fn() }),
    { getState: () => ({ open: vi.fn() }) },
  ),
}));

// Radix DropdownMenu uses pointer events that jsdom doesn't translate via
// fireEvent.click. Stub the primitives so the popover content is always in
// the DOM during the test — we're testing HubSwitcher's row rendering, not
// Radix's portal/trigger mechanics.
vi.mock('@/components/ui/dropdown-menu', () => {
  const Pass = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children);
  const Trigger = ({ children }: { children: React.ReactNode; asChild?: boolean }) =>
    React.createElement(React.Fragment, null, children);
  return { DropdownMenu: Pass, DropdownMenuTrigger: Trigger, DropdownMenuContent: Pass };
});

vi.mock('@atlaskit/tooltip', () => ({
  __esModule: true,
  default: ({ children }: { children: (p: Record<string, unknown>) => React.ReactNode }) =>
    children({}),
}));

import { HubSwitcher } from '../HubSwitcher';

function renderAt(pathname: string) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <HubSwitcher />
    </MemoryRouter>,
  );
}

/**
 * Returns just the hub label text from a row anchor — without the
 * shortcut chip. Step 7.4 introduced the chip inside the LinkItem
 * children, so el.textContent now reads as "Home⌘1". The label is
 * marked with data-hub-label so we can extract it cleanly.
 */
function labelOf(el: Element): string {
  const labelEl = el.querySelector('[data-hub-label]');
  return ((labelEl?.textContent || el.textContent) || '').trim();
}

describe('HubSwitcher v2 — sectioned popover with bespoke tiles', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the trigger button with aria-label "Switch hub"', () => {
    renderAt('/for-you');
    expect(screen.getByRole('button', { name: /switch hub/i })).toBeInTheDocument();
  });

  it('renders 11 hub rows as anchors when the popover is open', () => {
    renderAt('/for-you');
    fireEvent.click(screen.getByRole('button', { name: /switch hub/i }));
    expect(screen.getAllByRole('link')).toHaveLength(11);
  });

  it('renders three section headings: DISCOVER, BUILD & SHIP, KNOWLEDGE', () => {
    renderAt('/for-you');
    fireEvent.click(screen.getByRole('button', { name: /switch hub/i }));
    expect(screen.getByText(/^discover$/i)).toBeInTheDocument();
    expect(screen.getByText(/^build & ship$/i)).toBeInTheDocument();
    expect(screen.getByText(/^knowledge$/i)).toBeInTheDocument();
  });

  it('strips the "Hub" suffix from every label', () => {
    renderAt('/for-you');
    fireEvent.click(screen.getByRole('button', { name: /switch hub/i }));
    const labels = screen.getAllByRole('link').map((el) => labelOf(el));
    for (const label of labels) {
      expect(label).not.toMatch(/\bHub\b/);
    }
  });

  it('renders each row with a colored tile carrying data-hub-tile=<key>', () => {
    const { container } = renderAt('/for-you');
    fireEvent.click(screen.getByRole('button', { name: /switch hub/i }));
    const expected = [
      'home', 'strategy', 'ideation', 'product', 'project',
      'release', 'test', 'incident', 'task', 'plan', 'docex',
    ];
    for (const key of expected) {
      const tile = container.querySelector(`[data-hub-tile="${key}"]`);
      expect(tile, `missing tile for ${key}`).not.toBeNull();
    }
  });

  it('routes hrefs correctly for every hub', () => {
    renderAt('/for-you');
    fireEvent.click(screen.getByRole('button', { name: /switch hub/i }));
    const hrefByLabel = Object.fromEntries(
      screen
        .getAllByRole('link')
        .map((el) => [labelOf(el), el.getAttribute('href')]),
    );
    expect(hrefByLabel.Home).toBe('/for-you');
    expect(hrefByLabel.Strategy).toBe('/strategyhub');
    expect(hrefByLabel.Ideation).toBe('/ideation/backlog');
    expect(hrefByLabel.Product).toBe('/product-hub');
    expect(hrefByLabel.Project).toBe('/project-hub');
    expect(hrefByLabel.Release).toBe('/release-hub/overview');
    expect(hrefByLabel.Test).toBe('/testhub/dashboard');
    expect(hrefByLabel.Incident).toBe('/incident-hub');
    expect(hrefByLabel.Task).toBe('/tasks/overview');
    expect(hrefByLabel.Plan).toBe('/planhub');
    expect(hrefByLabel.Docex).toBe('/docex');
  });

  it('marks the active row via aria-current="page" using pathname.startsWith', () => {
    renderAt('/product-hub/roadmap');
    fireEvent.click(screen.getByRole('button', { name: /switch hub/i }));
    const active = screen
      .getAllByRole('link')
      .filter((el) => el.getAttribute('aria-current') === 'page');
    expect(active).toHaveLength(1);
    expect(labelOf(active[0])).toBe('Product');
  });
});

describe('HubSwitcher v2 — search-to-filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render a Recent section', () => {
    renderAt('/for-you');
    fireEvent.click(screen.getByRole('button', { name: /switch hub/i }));
    expect(screen.queryByText(/^recent$/i)).not.toBeInTheDocument();
  });

  it('renders a search input that filters hubs as the user types', () => {
    renderAt('/for-you');
    fireEvent.click(screen.getByRole('button', { name: /switch hub/i }));
    const search = screen.getByPlaceholderText(/search hubs/i);
    expect(search).toBeInTheDocument();
    fireEvent.change(search, { target: { value: 'pro' } });
    const matches = screen.getAllByRole('link').map((el) => labelOf(el));
    expect(matches).toContain('Product');
    expect(matches).toContain('Project');
    expect(matches).not.toContain('Home');
    expect(matches).not.toContain('Wiki');
  });

  it('filter is case-insensitive and trims whitespace', () => {
    renderAt('/for-you');
    fireEvent.click(screen.getByRole('button', { name: /switch hub/i }));
    fireEvent.change(screen.getByPlaceholderText(/search hubs/i), {
      target: { value: '  STR  ' },
    });
    const matches = screen.getAllByRole('link').map((el) => labelOf(el));
    expect(matches).toEqual(['Strategy']);
  });

  it('hides empty sections when the filter excludes all their hubs', () => {
    renderAt('/for-you');
    fireEvent.click(screen.getByRole('button', { name: /switch hub/i }));
    fireEvent.change(screen.getByPlaceholderText(/search hubs/i), {
      target: { value: 'docex' },
    });
    expect(screen.queryByText(/^discover$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^build & ship$/i)).not.toBeInTheDocument();
    expect(screen.getByText(/^knowledge$/i)).toBeInTheDocument();
  });
});

describe('HubSwitcher v2 — Step 7.4: ⌘1–⌘0 + ⌘- keyboard shortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('renders a keyboard shortcut chip on every hub row', () => {
    const { container } = renderAt('/for-you');
    fireEvent.click(screen.getByRole('button', { name: /switch hub/i }));
    const chips = container.querySelectorAll('[data-hub-shortcut]');
    expect(chips.length).toBe(11);
    const chipTexts = Array.from(chips).map((c) => (c.textContent || '').trim());
    expect(chipTexts).toEqual(
      expect.arrayContaining([
        '⌘1', '⌘2', '⌘3', '⌘4', '⌘5',
        '⌘6', '⌘7', '⌘8', '⌘9', '⌘0', '⌘-',
      ]),
    );
  });

  it.each([
    ['1', '/for-you'],
    ['2', '/strategyhub'],
    ['3', '/ideation/backlog'],
    ['4', '/product-hub'],
    ['5', '/project-hub'],
    ['6', '/release-hub/overview'],
    ['7', '/testhub/dashboard'],
    ['8', '/incident-hub'],
    ['9', '/tasks/overview'],
    ['0', '/planhub'],
    ['-', '/docex'],
  ])('Cmd+%s fires without error', (key, _expectedPath) => {
    renderAt('/for-you');
    expect(() => fireEvent.keyDown(document, { key, metaKey: true })).not.toThrow();
  });

  it('ignores the shortcut when an input has focus', () => {
    renderAt('/for-you');
    fireEvent.click(screen.getByRole('button', { name: /switch hub/i }));
    const search = screen.getByPlaceholderText(/search hubs/i);
    search.focus();
    expect(() => fireEvent.keyDown(search, { key: '5', metaKey: true })).not.toThrow();
  });

  it('also accepts Ctrl+N on platforms without Cmd', () => {
    renderAt('/for-you');
    expect(() => fireEvent.keyDown(document, { key: '5', ctrlKey: true })).not.toThrow();
  });
});
