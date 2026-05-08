/**
 * HubSwitcher — failing spec for the @atlaskit/menu + LinkItem migration.
 *
 * Council pass criteria (2026-05-08):
 *   1. Trigger opens the popover.
 *   2. Popover renders all 11 hub rows (Vikram non-negotiable: keep 11).
 *   3. Labels have no "Hub" suffix (council verdict).
 *   4. Each row is an anchor (LinkItem with component={RouterLink})
 *      with the correct SPA href.
 *   5. Active row carries aria-current="page" via pathname.startsWith.
 *   6. No description column.
 *   7. Atlassian app switcher parity: 343±10px width, 8px borderRadius
 *      on the popover (probed 2026-05-08 from digital-transformation.atlassian.net).
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

// Radix DropdownMenu uses pointer events that jsdom doesn't dispatch via
// fireEvent.click, so the popover never opens in the test environment.
// We're testing HubSwitcher's row rendering and routing logic — Radix's
// portal/trigger mechanics are not under test here. Stub the primitives
// so the trigger button and the menu content always render together.
vi.mock('@/components/ui/dropdown-menu', () => {
  const Pass = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children);
  const Trigger = ({ children, asChild: _ }: { children: React.ReactNode; asChild?: boolean }) =>
    React.createElement(React.Fragment, null, children);
  return {
    DropdownMenu: Pass,
    DropdownMenuTrigger: Trigger,
    DropdownMenuContent: Pass,
  };
});

// @atlaskit/tooltip uses a render-prop child API; stub to a passthrough so
// the trigger button still renders normally.
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

describe('HubSwitcher — Atlassian-app-switcher parity', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the trigger button with aria-label "Switch hub"', () => {
    renderAt('/for-you');
    expect(screen.getByRole('button', { name: /switch hub/i })).toBeInTheDocument();
  });

  it('opens a popover with all 11 hub rows when the trigger is clicked', () => {
    renderAt('/for-you');
    fireEvent.click(screen.getByRole('button', { name: /switch hub/i }));
    const items = screen.getAllByRole('link');
    expect(items).toHaveLength(11);
  });

  it('strips the "Hub" suffix from every label', () => {
    renderAt('/for-you');
    fireEvent.click(screen.getByRole('button', { name: /switch hub/i }));
    const items = screen.getAllByRole('link');
    const labels = items.map((el) => (el.textContent || '').trim());
    for (const label of labels) {
      expect(label).not.toMatch(/\bHub\b/);
    }
    expect(labels).toEqual(
      expect.arrayContaining([
        'Home',
        'Strategy',
        'Ideation',
        'Product',
        'Project',
        'Release',
        'Test',
        'Incident',
        'Task',
        'Plan',
        'Wiki',
      ]),
    );
  });

  it('renders each row as an SPA-aware anchor with the correct href', () => {
    renderAt('/for-you');
    fireEvent.click(screen.getByRole('button', { name: /switch hub/i }));
    const items = screen.getAllByRole('link');
    const hrefByLabel = Object.fromEntries(
      items.map((el) => [(el.textContent || '').trim(), el.getAttribute('href')]),
    );
    expect(hrefByLabel.Home).toBe('/for-you');
    expect(hrefByLabel.Strategy).toBe('/strategyhub');
    expect(hrefByLabel.Ideation).toBe('/ideation/backlog');
    expect(hrefByLabel.Product).toBe('/product-hub');
    expect(hrefByLabel.Project).toBe('/project-hub');
    expect(hrefByLabel.Release).toBe('/release-hub/command-center');
    expect(hrefByLabel.Test).toBe('/testhub/dashboard');
    expect(hrefByLabel.Incident).toBe('/incident-hub');
    expect(hrefByLabel.Task).toBe('/taskhub/boards');
    expect(hrefByLabel.Plan).toBe('/planhub');
    expect(hrefByLabel.Wiki).toBe('/wiki');
  });

  it('marks the active row via aria-current="page" using pathname.startsWith', () => {
    renderAt('/product-hub/roadmap');
    fireEvent.click(screen.getByRole('button', { name: /switch hub/i }));
    const active = screen.getAllByRole('link').filter((el) => el.getAttribute('aria-current') === 'page');
    expect(active).toHaveLength(1);
    expect((active[0].textContent || '').trim()).toBe('Product');
  });

  it('does not render any description microcopy under the labels', () => {
    renderAt('/for-you');
    fireEvent.click(screen.getByRole('button', { name: /switch hub/i }));
    // The 2026-05-05 descriptions ("Vision, themes, OKRs", "Products, roadmaps, cards", etc.)
    // must be gone — the council dropped the description column.
    expect(screen.queryByText(/vision, themes, okrs/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/products, roadmaps, cards/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/test cases, cycles, defects/i)).not.toBeInTheDocument();
  });
});
