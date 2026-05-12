/**
 * R360Panel — sidebar roster (Decision B, preflight 2026-05-11).
 *
 * On wide viewports (≥1200px container width) the team picker changes from a
 * horizontal pill strip to a vertical sidebar with member rows on the LEFT of
 * the R360MemberDetail view.
 *
 * FAILS until R360Panel.tsx renders data-testid="r360-roster-sidebar" when
 * the panel container is ≥1200px wide AND the current user is a team lead.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

// ── Simulate wide viewport (1300px) via window.innerWidth ────────────────────
beforeAll(() => {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1300 });
  // ResizeObserver used in panel but not for the wide-detection path
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(), disconnect: vi.fn(),
  }));
});
afterAll(() => {
  vi.restoreAllMocks();
});

const TEAM = [
  { id: 'res-alice', name: 'Alice Tan',   role_name: 'Engineer',  avatar_url: null },
  { id: 'res-bob',   name: 'Bob Smith',   role_name: 'Designer',  avatar_url: null },
];

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: { id: 'p-vikram' } }),
}));
vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({ isTeamLead: true }),
}));
vi.mock('@/hooks/useR360PanelData', () => ({
  useMyR360ResourceId: () => ({ data: 'res-vikram', isLoading: false }),
  useTeamResourceIds: () => ({ data: TEAM, isLoading: false }),
}));
vi.mock('@atlaskit/tokens', () => ({ token: (_: string, fb: string) => fb }));
vi.mock('@/pages/R360MemberDetail', () => ({
  default: ({ resourceId }: any) => <div data-testid="r360-detail" data-resource-id={resourceId} />,
}));

import R360Panel from '@/components/for-you/atlaskit/R360Panel';

describe('R360Panel — sidebar roster (Decision B)', () => {
  it('renders data-testid="r360-roster-sidebar" on wide viewports', async () => {
    render(<R360Panel />);
    // Wait for the ResizeObserver callback to fire
    await new Promise(r => setTimeout(r, 10));
    expect(screen.getByTestId('r360-roster-sidebar')).toBeTruthy();
  });

  it('sidebar contains "Me" and all team member names', async () => {
    render(<R360Panel />);
    await new Promise(r => setTimeout(r, 10));
    const sidebar = screen.getByTestId('r360-roster-sidebar');
    expect(sidebar.textContent).toContain('Me');
    expect(sidebar.textContent).toContain('Alice Tan');
    expect(sidebar.textContent).toContain('Bob Smith');
  });

  it('clicking a sidebar member row switches the detail view to that member', async () => {
    render(<R360Panel />);
    await new Promise(r => setTimeout(r, 10));
    const aliceRow = screen.getByText('Alice Tan').closest('button') as HTMLButtonElement;
    fireEvent.click(aliceRow);
    const detail = screen.getByTestId('r360-detail');
    expect(detail.getAttribute('data-resource-id')).toBe('res-alice');
  });

  it('clicking "Me" restores own view', async () => {
    render(<R360Panel />);
    await new Promise(r => setTimeout(r, 10));
    // First select Alice
    const aliceRow = screen.getByText('Alice Tan').closest('button') as HTMLButtonElement;
    fireEvent.click(aliceRow);
    // Then click Me
    const meRow = screen.getByText('Me').closest('button') as HTMLButtonElement;
    fireEvent.click(meRow);
    const detail = screen.getByTestId('r360-detail');
    expect(detail.getAttribute('data-resource-id')).toBe('res-vikram');
  });
});
