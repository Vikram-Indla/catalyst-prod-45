/**
 * HomeSidebar — sidebar display contract.
 *
 * Acceptance criteria:
 *   1. Row title shows projectKey ("BAU"), NOT projectName ("Senaei BAU").
 *   2. ProjectIcon receives projectKey so bundled avatars resolve.
 *
 * Root-cause ref: preflight 2026-05-10 L1 + L2
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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

// SidebarBase renders items — stub minimally so we can check what's passed
vi.mock('./SidebarBase', async () => {
  // no-op: we test HomeSidebar's own output
  return {};
});

// Stub SidebarBase to render its items directly
vi.mock('@/components/layout/SidebarBase', () => ({
  SidebarBase: ({ config }: { config: { sections: Array<{ items: Array<{ title: React.ReactNode; icon: React.ComponentType }> }> } }) => (
    <div>
      {config.sections.flatMap(s => s.items).map((item, i) => (
        <div key={i}>
          {typeof item.title === 'string' ? item.title : item.title}
          {item.icon && React.createElement(item.icon as React.ComponentType, {})}
        </div>
      ))}
    </div>
  ),
}));

let HomeSidebar: React.ComponentType<{ expanded?: boolean; onToggle?: () => void }>;

describe('HomeSidebar — sidebar display', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    capturedProjectIconProps.length = 0;
    const mod = await import('../HomeSidebar');
    HomeSidebar = mod.default;
  });

  it('renders projectKey (BAU) not full projectName (Senaei BAU) in row title', () => {
    render(<HomeSidebar />, { wrapper });

    // "BAU" should appear
    expect(screen.getByText('BAU')).toBeTruthy();
    // "Senaei BAU" (full name) must NOT appear as the primary label
    const fullName = screen.queryByText('Senaei BAU');
    expect(fullName).toBeNull();
  });

  it('passes projectKey to ProjectIcon so bundled avatars can resolve', () => {
    render(<HomeSidebar />, { wrapper });

    // At least one ProjectIcon should have been rendered with projectKey="BAU"
    const withKey = capturedProjectIconProps.find(p => p.projectKey === 'BAU');
    expect(withKey).toBeTruthy();
  });
});
