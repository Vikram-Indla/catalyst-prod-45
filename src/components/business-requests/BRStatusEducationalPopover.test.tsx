import { render, screen, fireEvent } from '@testing-library/react';
import { BRStatusEducationalPopover } from './BRStatusEducationalPopover';

describe('BRStatusEducationalPopover', () => {
  const mockStatus = {
    id: 'status-1',
    scheme_id: 'br-scheme',
    name: 'Analysis & Design',
    slug: 'analysis_design',
    category: 'in_progress' as const,
    color: '#0052CC',
    position: 2,
    is_initial: false,
    is_final: false,
    is_active: true,
    wip_limit: null,
    slug_aliases: [],
    owner_name: 'Ahmed Basudan',
    entry_criteria: 'BR has been accepted',
    exit_criteria: 'Design review approved',
    expected_outputs: 'Design document, wireframes',
    impacted_roles: ['Product Designer', 'Product Manager'],
    activities: ['Design kickoff', 'Research', 'Mockups'],
    risks: 'Design delays impact timeline',
    backward_routes: ['demand_intake'],
    next_movements: ['product_validation']
  };

  it('should render info icon as trigger', () => {
    render(<BRStatusEducationalPopover status={mockStatus} />);
    const icon = screen.getByRole('button', { name: /status information/i });
    expect(icon).toBeInTheDocument();
  });

  it('should open popover on icon click', () => {
    render(<BRStatusEducationalPopover status={mockStatus} />);
    const icon = screen.getByRole('button', { name: /status information/i });
    fireEvent.click(icon);
    expect(screen.getByText('Analysis & Design')).toBeInTheDocument();
    expect(screen.getByText(/Ahmed Basudan/)).toBeInTheDocument();
  });

  it('should display all educational metadata fields', () => {
    render(<BRStatusEducationalPopover status={mockStatus} />);
    fireEvent.click(screen.getByRole('button', { name: /status information/i }));

    expect(screen.getByText('Entry Criteria')).toBeInTheDocument();
    expect(screen.getByText('Exit Criteria')).toBeInTheDocument();
    expect(screen.getByText('Expected Outputs')).toBeInTheDocument();
    expect(screen.getByText('Impacted Roles')).toBeInTheDocument();
    expect(screen.getByText('Activities')).toBeInTheDocument();
    expect(screen.getByText('Risks')).toBeInTheDocument();
  });

  it('should close on Escape key', () => {
    render(<BRStatusEducationalPopover status={mockStatus} />);
    fireEvent.click(screen.getByRole('button', { name: /status information/i }));
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByText('Analysis & Design')).not.toBeInTheDocument();
  });

  it('should support dark mode via ADS tokens', () => {
    const { container } = render(<BRStatusEducationalPopover status={mockStatus} />);
    const popover = container.querySelector('[data-testid="br-status-popover"]');
    expect(popover).toHaveStyle('backgroundColor: var(--ds-surface)');
  });
});
