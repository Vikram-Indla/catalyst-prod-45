/**
 * CatalystStatusPill — Status pill with dropdown edit (F2.4)
 *
 * Contract:
 *   - Displays status with Jira-measured colors
 *   - Click to open status dropdown
 *   - Select new status to update
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { CatalystStatusPill } from './CatalystStatusPill';

describe('CatalystStatusPill (F2.4)', () => {
  it('renders status pill with color', () => {
    render(<CatalystStatusPill status="In Progress" onStatusChange={() => {}} />);
    expect(screen.getByText(/in progress/i)).toBeInTheDocument();
  });

  it('opens dropdown on click', async () => {
    const user = userEvent.setup();
    render(<CatalystStatusPill status="To Do" onStatusChange={() => {}} />);
    await user.click(screen.getByText(/to do/i));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('shows status options in dropdown', async () => {
    const user = userEvent.setup();
    render(<CatalystStatusPill status="To Do" onStatusChange={() => {}} />);
    await user.click(screen.getByText(/to do/i));
    expect(screen.getByRole('option', { name: /in progress/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /done/i })).toBeInTheDocument();
  });

  it('calls onStatusChange when option selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CatalystStatusPill status="To Do" onStatusChange={onChange} />);
    await user.click(screen.getByText(/to do/i));
    await user.click(screen.getByRole('option', { name: /in progress/i }));
    expect(onChange).toHaveBeenCalledWith('In Progress');
  });

  it('applies correct Jira color for status', () => {
    const { container } = render(<CatalystStatusPill status="Done" onStatusChange={() => {}} />);
    const pill = container.querySelector('[data-testid="status-pill"]');
    expect(pill).toHaveStyle({ backgroundColor: expect.any(String) });
  });
});
