/**
 * HomeSidebar — space-grouped Recents display contract (Alt B, 2026-06-17).
 *
 * Acceptance criteria:
 *   1. The space GROUP HEADER shows the project name ("Senaei BAU") + a
 *      ProjectIcon resolved from the projectKey. Identity lives here, once.
 *   2. The ROW title shows only the section label ("Backlog") + a time chip —
 *      it does NOT repeat the project key (that's now in the header).
 *   3. No time-bucket headers ("Today" / "Yesterday" / "Day before") — space is
 *      the organising axis, not time.
 *
 * Supersedes the pre-2026-06-17 contract (projectKey-in-row, no ProjectIcon,
 * time buckets), which the space-grouped redesign intentionally inverts.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRecentLocations = [
  {
    projectKey: 'BAU',
    projectName: 'Senaei BAU',
    path: '/project-hub/BAU/backlog',
    section: 'backlog',
    sectionLabel: 'Backlog',
    iconName: null,
    color: null,
    visitedAt: Date.now(),
    hub: 'project' as const,
  },
];

vi.mock('@/hooks/home/useRecentProjects', () => ({
  useRecentProjects: () => ({ recentLocations: mockRecentLocations, loading: false }),
}));

const capturedProjectIconProps: Record<string, unknown>[] = [];
vi.mock('@/components/shared/ProjectIcon', () => ({
  ProjectIcon: (props: Record<string, unknown>) => {
    capturedProjectIconProps.push(props);
    return <span data-testid="project-icon" />;
  },
}));

// Stub SidebarBase to render section headers (titleNode) AND rows so we can
// assert both the group-header identity and the row contents independently.
vi.mock('@/components/layout/SidebarBase', () => ({
  SidebarBase: ({
    config,
  }: {
    config: {
      sections: Array<{
        title: string;
        titleNode?: React.ReactNode;
        items: Array<{ title: React.ReactNode; icon?: React.ComponentType }>;
      }>;
    };
  }) => (
    <div>
      {config.sections.map((s, si) => (
        <div key={si}>
          <div data-testid="section-header">{s.titleNode ?? s.title}</div>
          {s.items.map((item, i) => (
            <div key={i} data-testid="recent-row">
              {item.title}
              {item.icon && React.createElement(item.icon as React.ComponentType, {})}
            </div>
          ))}
        </div>
      ))}
    </div>
  ),
}));

let HomeSidebar: React.ComponentType<{ expanded?: boolean; onToggle?: () => void }>;

describe('HomeSidebar — space-grouped Recents', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    capturedProjectIconProps.length = 0;
    const mod = await import('../HomeSidebar');
    HomeSidebar = mod.default;
  });

  it('renders the project name in the space group header', () => {
    render(<HomeSidebar />, { wrapper });
    const header = screen.getByTestId('section-header');
    expect(within(header).getByText('Senaei BAU')).toBeTruthy();
  });

  it('passes projectKey to the canonical ProjectIcon (no letter tile)', () => {
    render(<HomeSidebar />, { wrapper });
    expect(capturedProjectIconProps.length).toBeGreaterThan(0);
    expect(capturedProjectIconProps[0].projectKey).toBe('BAU');
  });

  it('row shows the section label and NOT the project key', () => {
    render(<HomeSidebar />, { wrapper });
    const row = screen.getByTestId('recent-row');
    expect(within(row).getByText('Backlog')).toBeTruthy();
    // Project key is in the header, never repeated in the row.
    expect(within(row).queryByText('BAU')).toBeNull();
  });

  it('renders no time-bucket headers', () => {
    render(<HomeSidebar />, { wrapper });
    expect(screen.queryByText('Today')).toBeNull();
    expect(screen.queryByText('Yesterday')).toBeNull();
    expect(screen.queryByText('Day before')).toBeNull();
  });
});
