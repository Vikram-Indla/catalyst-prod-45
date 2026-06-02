/**
 * RecommendedProjectsStrip — "View all" navigation contract.
 *
 * Acceptance criterion:
 *   "View all" must navigate to /project-hub/projects (AllProjectsPage),
 *   NOT /projects (ProjectDirectory — a legacy catch-all).
 *
 * Root-cause ref: preflight 2026-05-10 F2-HIGH
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@atlaskit/tokens', () => ({ token: (_k: string, fb: string) => fb }));
vi.mock('@/components/shared/ProjectIcon', () => ({
  ProjectIcon: () => <span>icon</span>,
}));
vi.mock('@/hooks/home/useRecentProjects', () => ({
  useRecentProjects: () => ({ recentLocations: [], loading: false }),
}));
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return { ...actual, useQuery: () => ({ data: [], isLoading: false }) };
});
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

const PROJECTS = [
  { id: 'proj-1', key: 'BAU', name: 'Senaei BAU', avatar_url: null, icon: null, color: null },
  { id: 'proj-2', key: 'MIM', name: 'MIM Digital', avatar_url: null, icon: null, color: null },
];

let RecommendedProjectsStrip: React.ComponentType<{ projects: typeof PROJECTS }>;

describe('RecommendedProjectsStrip — View all route', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../RecommendedProjectsStrip');
    RecommendedProjectsStrip = mod.default;
  });

  it('navigates to /project-hub/:key when a project card is clicked', () => {
    render(
      <MemoryRouter>
        <RecommendedProjectsStrip projects={PROJECTS} />
      </MemoryRouter>
    );

    const bauCard = screen.getByRole('button', { name: /Senaei BAU/i });
    fireEvent.click(bauCard);

    expect(mockNavigate).toHaveBeenCalledWith('/project-hub/BAU');
    expect(mockNavigate).not.toHaveBeenCalledWith('/projects/proj-1');
    expect(mockNavigate).not.toHaveBeenCalledWith('/projects');
  });
});
