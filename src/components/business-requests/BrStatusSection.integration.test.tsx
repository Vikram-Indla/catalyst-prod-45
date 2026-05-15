import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrStatusSection } from './BrStatusSection';

const mockStatuses = [
  {
    id: 'status-1',
    scheme_id: 'br-main-scheme',
    name: 'Funnel',
    slug: 'funnel',
    category: 'todo' as const,
    color: '#42526E',
    position: 1,
    is_initial: true,
    is_final: false,
    is_active: true,
    wip_limit: null,
    slug_aliases: [],
    owner_name: 'Khaled',
    entry_criteria: 'Opportunity identified',
    exit_criteria: 'Pre-qualification complete',
    expected_outputs: 'Opportunity summary',
    impacted_roles: ['Business Development'],
    activities: ['Opportunity screening'],
    risks: 'May not meet criteria',
    backward_routes: [],
    next_movements: ['demand_intake'],
  },
  {
    id: 'status-2',
    scheme_id: 'br-main-scheme',
    name: 'Demand Intake',
    slug: 'demand_intake',
    category: 'todo' as const,
    color: '#5243AA',
    position: 2,
    is_initial: false,
    is_final: false,
    is_active: true,
    wip_limit: null,
    slug_aliases: [],
    owner_name: 'Nada Alfassam',
    entry_criteria: 'Approved from Funnel',
    exit_criteria: 'Intake review complete',
    expected_outputs: 'Intake form, requirements',
    impacted_roles: ['Portfolio Manager'],
    activities: ['Requirements gathering'],
    risks: 'Requirements unclear',
    backward_routes: ['funnel'],
    next_movements: ['analysis_design'],
  },
];

vi.mock('@/hooks/useBRWorkflowStatus', () => ({
  useBRWorkflowStatuses: () => ({ data: mockStatuses, isLoading: false }),
  getBRWorkflowStatus: (statuses: typeof mockStatuses, slug: string) =>
    statuses.find((s) => s.slug === slug),
}));

vi.mock('@/hooks/useBRStatusTransition', () => ({
  useBRStatusTransition: () => ({
    mutate: vi.fn((params: any, { onSuccess }: any) => {
      onSuccess({ success: true, requestId: params.requestId, newStatus: params.toStatusSlug });
    }),
    isPending: false,
  }),
}));

describe('BrStatusSection Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  const renderComponent = (props = {}) => {
    const defaultProps = {
      currentStatusSlug: 'funnel',
      requestId: 'br-123',
      onStatusChange: vi.fn(() => Promise.resolve()),
      isLoading: false,
      ...props,
    };
    return render(
      <QueryClientProvider client={queryClient}>
        <BrStatusSection {...defaultProps} />
      </QueryClientProvider>,
    );
  };

  it('should display current status lozenge', () => {
    renderComponent();
    expect(screen.getByText('Funnel')).toBeInTheDocument();
  });

  it('should show Move Status button when transitions available', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: /move status/i })).toBeInTheDocument();
  });

  it('should open dialog on Move Status button click', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /move status/i }));
    // Dialog heading appears — use getAllByText to handle button + heading both matching
    expect(screen.getAllByText('Move Status').length).toBeGreaterThanOrEqual(1);
  });
});
