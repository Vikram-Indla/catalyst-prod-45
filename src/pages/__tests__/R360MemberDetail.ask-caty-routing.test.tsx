/**
 * R360MemberDetail — Ask Caty button routing branch.
 *
 * Own profile: navigates to /profile?tab=caty
 * Other member: opens the R360ProfileDrawer (sets aiOpen=true)
 *
 * FAILS until the onClick branch is implemented.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ resourceId: 'res-123' }),
    useLocation: () => ({ pathname: '/project-hub/resources/res-123', search: '', hash: '', state: null, key: 'default' }),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

const MOCK_AUTH_USER_ID = 'user-aaa';

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: { id: MOCK_AUTH_USER_ID } }),
}));

vi.mock('@/hooks/useR360', () => ({
  useR360Overview: () => ({
    data: { name: 'Test User', profile_id: MOCK_AUTH_USER_ID, role_name: 'Dev', department_name: 'Eng' },
    isLoading: false,
  }),
  useR360WorkItems: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ isDark: false }),
}));

vi.mock('@/services/r360Service', () => ({
  computeCarriedFromLabel: () => null,
}));

vi.mock('@/hooks/useR360Reporting', () => ({
  useR360Reporting: () => ({ managerName: null, options: [], updateManager: vi.fn(), isUpdating: false }),
}));

vi.mock('@atlaskit/tokens', () => ({
  token: (_: string, fb: string) => fb,
}));

vi.mock('@/components/r360/R360ProfileDrawer', () => ({
  __esModule: true,
  default: () => <div data-testid="r360-profile-drawer">Drawer</div>,
}));

vi.mock('@/components/ui/AIIntelligenceButton', () => ({
  AIIntelligenceButton: ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button data-testid="ai-button" onClick={onClick}>{label}</button>
  ),
}));

// Stub remaining sub-components
vi.mock('@/pages/r360-member/WeekStripCollapsible', () => ({ WeekStripCollapsible: () => null }));
vi.mock('@/pages/r360-member/RingView', () => ({ RingView: () => null }));
vi.mock('@/pages/r360-member/ChronologyView', () => ({ ChronologyView: () => null }));
vi.mock('@/pages/r360-member/BoardView', () => ({ BoardView: () => null }));
vi.mock('@/pages/r360-member/DetailPanel', () => ({ DetailPanel: () => null }));
vi.mock('@/pages/r360-member/TimelineView', () => ({ TimelineView: () => null }));
vi.mock('@/pages/r360-member/utils', () => ({
  getWeekRange: () => ({ weekStart: new Date(), weekEnd: new Date(), weekLabel: 'W1', weekNumber: 1, periodType: 'week' }),
  getMonthRange: () => ({ monthStart: new Date(), monthEnd: new Date(), monthLabel: 'Jan' }),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/project-hub/resources/res-123']}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('R360MemberDetail Ask Caty routing', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('navigates to /profile?tab=caty when viewing own profile', async () => {
    const R360MemberDetail = (await import('../R360MemberDetail')).default;
    render(<R360MemberDetail />, { wrapper: Wrapper });

    const btn = screen.getByTestId('ai-button');
    fireEvent.click(btn);

    expect(mockNavigate).toHaveBeenCalledWith('/profile?tab=caty');
  });
});
