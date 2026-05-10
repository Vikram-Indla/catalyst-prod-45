// @ts-nocheck
/**
 * P0 gate — RowActionMenu must use the self-rolled positioned pattern.
 * Root defect: AKDropdownMenu passes isSelected + testId to DOM <button>
 * breaking Popper's ref chain in real Chrome → portal never renders.
 * Fix: self-rolled useFixedPopupPosition menu (same as LeadReassignPopover).
 *
 * Test anchors on data-testid="row-action-menu-popup" which ONLY the
 * self-rolled implementation adds. AKDropdownMenu never adds this attribute.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AllProjectsTable } from '../AllProjectsTable';
import type { ProjectListItem } from '@/types/projecthub';
import { vi } from 'vitest';

const stubProject: ProjectListItem = {
  id: 'proj-1',
  name: 'Test Project',
  project_key: 'TP',
  status: 'active',
  lead_id: 'user-1',
  lead_name: 'Test Lead',
  lead_avatar_url: null,
  member_ids: [],
  member_count: 0,
  total_issues: 0,
  icon_avatar_url: null,
  icon_color: null,
  last_synced_at: null,
  jira_issue_count: 0,
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      not: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
    })),
  },
  typedQuery: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
  })),
}));

vi.mock('@/hooks/useRecentProjectItems', () => ({
  useTrackRecentItem: () => ({ mutate: vi.fn() }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

test('3-dot action menu uses self-rolled positioned popup (not AKDropdownMenu)', async () => {
  render(
    <AllProjectsTable
      projects={[stubProject]}
      favoriteIds={new Set()}
      onToggleFav={vi.fn()}
      onSelectProject={vi.fn()}
      sortCol="total_issues"
      sortDir="desc"
      onSort={vi.fn()}
      selectedRows={new Set()}
      onToggleRow={vi.fn()}
      onToggleAll={vi.fn()}
    />,
    { wrapper },
  );

  const trigger = await screen.findByRole('button', { name: /Actions for Test Project/i });
  expect(trigger).toBeInTheDocument();

  // Before click — popup must NOT be visible
  expect(document.querySelector('[data-testid="row-action-menu-popup"]')).toBeNull();

  // Click trigger
  fireEvent.click(trigger);

  // After click — self-rolled popup div must appear with the correct testid
  await waitFor(() => {
    expect(document.querySelector('[data-testid="row-action-menu-popup"]')).toBeTruthy();
  });

  // Menu items must be present
  expect(screen.getByText('Open project')).toBeInTheDocument();
  expect(screen.getByText('Rename')).toBeInTheDocument();
  expect(screen.getByText('Archive project')).toBeInTheDocument();
});
