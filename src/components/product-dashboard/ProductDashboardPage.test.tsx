/**
 * ProductDashboardPage — shell for the Product Dashboard v2.
 *
 * Contract (this test is the spec — implementation follows):
 *   - Renders DashboardWorkflowPath (data-testid="workflow-path")
 *   - Renders filter bar with @atlaskit/dropdown-menu triggers (A4 compliant — no hand-rolled pills)
 *   - Renders a widget grid area (data-testid="widget-grid")
 *   - Page title is "Product Dashboard"
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ProductDashboardPage } from './ProductDashboardPage';
import { useActiveDemandProcessSteps } from '@/hooks/useDemandProcessSteps';
import { useAuth } from '@/hooks/useAuth';

vi.mock('@/hooks/useDemandProcessSteps');
vi.mock('@/hooks/useAuth');
vi.mock('./DashboardWorkflowPath', () => ({
  DashboardWorkflowPath: () => <div data-testid="workflow-path-mock" />,
}));
vi.mock('./widgets/AtAGlanceWidget', () => ({
  AtAGlanceWidget: () => <div data-testid="at-a-glance-mock" />,
}));
vi.mock('./widgets/StageOverviewWidget', () => ({
  StageOverviewWidget: ({ onStageClick }: { onStageClick: () => void }) => (
    <div data-testid="stage-overview-mock" onClick={onStageClick} />
  ),
}));
vi.mock('./widgets/NeedsAttentionWidget', () => ({
  NeedsAttentionWidget: () => <div data-testid="needs-attention-mock" />,
}));
vi.mock('./widgets/ActiveInterventionsWidget', () => ({
  ActiveInterventionsWidget: () => <div data-testid="active-interventions-mock" />,
}));
vi.mock('./widgets/WhoCarriesWhatWidget', () => ({
  WhoCarriesWhatWidget: () => <div data-testid="who-carries-what-mock" />,
}));
vi.mock('./widgets/RecentReleasesWidget', () => ({
  RecentReleasesWidget: () => <div data-testid="recent-releases-mock" />,
}));

// @atlaskit/dropdown-menu uses class constructors incompatible with jsdom.
// Stub with a plain functional component that renders children + a trigger button.
vi.mock('@atlaskit/dropdown-menu', () => ({
  default: ({ trigger, children }: { trigger: React.ReactNode; children: React.ReactNode }) => (
    <div>
      <button type="button">{trigger}</button>
      <div>{children}</div>
    </div>
  ),
  DropdownItemGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>{children}</button>
  ),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <BrowserRouter>
      <QueryClientProvider client={qc}>
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('ProductDashboardPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (useAuth as any).mockReturnValue({ user: { id: 'u1' }, loading: false, isAuthenticated: true });
    (useActiveDemandProcessSteps as any).mockReturnValue({ data: [], isLoading: false });
  });

  it('renders the page heading', () => {
    render(<ProductDashboardPage />, { wrapper });
    expect(screen.getByRole('heading', { name: /product dashboard/i })).toBeInTheDocument();
  });

  it('renders DashboardWorkflowPath region', () => {
    render(<ProductDashboardPage />, { wrapper });
    expect(screen.getByTestId('workflow-path-region')).toBeInTheDocument();
  });

  it('renders the widget grid area', () => {
    render(<ProductDashboardPage />, { wrapper });
    expect(screen.getByTestId('widget-grid')).toBeInTheDocument();
  });

  it('renders filter bar with dropdown triggers', () => {
    render(<ProductDashboardPage />, { wrapper });
    const filterBar = screen.getByTestId('filter-bar');
    expect(filterBar).toBeInTheDocument();
    // At minimum one dropdown trigger must be present (ADS DropdownMenu, not hand-rolled)
    const triggers = screen.getAllByTestId('filter-trigger');
    expect(triggers.length).toBeGreaterThan(0);
  });
});
