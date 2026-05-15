import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrStatusSection } from './BrStatusSection';

// Mock the hooks
jest.mock('@/hooks/useBRWorkflowStatuses', () => ({
  useBRWorkflowStatuses: () => ({
    data: [
      {
        id: 'status-1',
        scheme_id: 'br-main-scheme',
        name: 'Funnel',
        slug: 'funnel',
        category: 'todo',
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
        next_movements: ['demand_intake']
      },
      {
        id: 'status-2',
        scheme_id: 'br-main-scheme',
        name: 'Demand Intake',
        slug: 'demand_intake',
        category: 'todo',
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
        next_movements: ['analysis_design']
      }
    ],
    isLoading: false
  }),
  getBRWorkflowStatus: (statuses: any[], slug: string) =>
    statuses.find(s => s.slug === slug)
}));

jest.mock('@/hooks/useBRStatusTransition', () => ({
  useBRStatusTransition: () => ({
    mutate: jest.fn((params, { onSuccess }) => {
      onSuccess({ success: true, requestId: params.requestId, newStatus: params.toStatusSlug });
    }),
    isPending: false
  })
}));

describe('BrStatusSection Integration', () => {
  const queryClient = new QueryClient();

  const renderComponent = (props = {}) => {
    const defaultProps = {
      currentStatusSlug: 'funnel',
      requestId: 'br-123',
      onStatusChange: jest.fn(() => Promise.resolve()),
      isLoading: false,
      ...props
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <BrStatusSection {...defaultProps} />
      </QueryClientProvider>
    );
  };

  it('should display current status with popover trigger', () => {
    renderComponent();
    expect(screen.getByText('Funnel')).toBeInTheDocument();
    const infoIcon = screen.getByRole('button', { name: /status information/i });
    expect(infoIcon).toBeInTheDocument();
  });

  it('should show Move Status button when transitions available', () => {
    renderComponent();
    const moveButton = screen.getByRole('button', { name: /move status/i });
    expect(moveButton).toBeInTheDocument();
  });

  it('should open dialog on Move Status button click', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /move status/i }));
    expect(screen.getByText('Move Status')).toBeInTheDocument();
    expect(screen.getByText('Next Status')).toBeInTheDocument();
  });

  it('should show available next statuses in dropdown', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /move status/i }));
    expect(screen.getByText('Demand Intake')).toBeInTheDocument();
  });

  it('should display target status metadata when selected', async () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /move status/i }));

    // Select Demand Intake
    const selectButton = screen.getByText('Next Status');
    fireEvent.click(selectButton);
    fireEvent.click(screen.getByText('Demand Intake'));

    await waitFor(() => {
      expect(screen.getByText(/Approved from Funnel/)).toBeInTheDocument();
    });
  });

  it('should require comment before moving', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /move status/i }));

    const moveButton = screen.getByRole('button', { name: 'Move Status' });
    expect(moveButton).toBeDisabled();
  });

  it('should enable move when comment provided', async () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /move status/i }));

    // Select status and add comment
    const selectTrigger = screen.getByPlaceholderText('Select a status...');
    fireEvent.click(selectTrigger);
    fireEvent.click(screen.getByText('Demand Intake'));

    const commentField = screen.getByPlaceholderText('Explain the reason...');
    fireEvent.change(commentField, { target: { value: 'Requirements clarified' } });

    await waitFor(() => {
      const moveButton = screen.getByRole('button', { name: 'Move Status' });
      expect(moveButton).not.toBeDisabled();
    });
  });

  it('should close dialog on cancel', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /move status/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText('Next Status')).not.toBeInTheDocument();
  });

  it('should disable inputs while submitting', async () => {
    const { rerender } = renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /move status/i }));

    renderComponent({ isLoading: true });

    await waitFor(() => {
      const moveButton = screen.getByRole('button', { name: /move status/i });
      expect(moveButton).toBeDisabled();
    });
  });
});
