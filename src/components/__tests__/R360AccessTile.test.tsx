import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { R360AccessTile } from '../R360AccessTile';

vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: vi.fn(),
}));
vi.mock('@/hooks/useMyLeadProjects', () => ({
  useMyLeadProjects: vi.fn(),
}));
vi.mock('@atlaskit/tokens', () => ({ token: (_t: string, fb: string) => fb }));

import { useUserRole } from '@/hooks/useUserRole';
import { useMyLeadProjects } from '@/hooks/useMyLeadProjects';

const mockUseUserRole = useUserRole as ReturnType<typeof vi.fn>;
const mockUseMyLeadProjects = useMyLeadProjects as ReturnType<typeof vi.fn>;

function renderTile() {
  return render(
    <MemoryRouter>
      <R360AccessTile />
    </MemoryRouter>
  );
}

describe('R360AccessTile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Resource 360™" link for Manager+ users', () => {
    mockUseUserRole.mockReturnValue({ canAccessEnterprise: true, isLoading: false });
    mockUseMyLeadProjects.mockReturnValue({ projects: [] });
    renderTile();
    expect(screen.getByRole('link', { name: /resource 360/i })).toHaveAttribute('href', '/admin/resources');
  });

  it('renders "My Team" link for Lead users (not enterprise, has lead projects)', () => {
    mockUseUserRole.mockReturnValue({ canAccessEnterprise: false, isLoading: false });
    mockUseMyLeadProjects.mockReturnValue({ projects: [{ id: 'p1', name: 'Alpha' }] });
    renderTile();
    expect(screen.getByRole('link', { name: /my team/i })).toHaveAttribute('href', '/my-team');
  });

  it('renders "My Resource 360°" link for IC users (not enterprise, no lead projects)', () => {
    mockUseUserRole.mockReturnValue({ canAccessEnterprise: false, isLoading: false });
    mockUseMyLeadProjects.mockReturnValue({ projects: [] });
    renderTile();
    expect(screen.getByRole('link', { name: /my resource 360/i })).toHaveAttribute('href', '/me');
  });
});
