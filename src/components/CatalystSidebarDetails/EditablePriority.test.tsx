/**
 * EditablePriority — Priority field with 4-bar dropdown (F3.4)
 *
 * Contract:
 *   - Displays priority with icon bars
 *   - Click to open priority dropdown
 *   - Select new priority to update
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { EditablePriority } from './EditablePriority';

describe('EditablePriority (F3.4)', () => {
  it('renders priority field label', () => {
    render(<EditablePriority priority="High" onPriorityChange={() => {}} />);
    expect(screen.getByText(/priority/i)).toBeInTheDocument();
  });

  it('displays current priority', () => {
    render(<EditablePriority priority="High" onPriorityChange={() => {}} />);
    expect(screen.getByText(/High/i)).toBeInTheDocument();
  });

  it('shows priority icon bars', () => {
    const { container } = render(<EditablePriority priority="High" onPriorityChange={() => {}} />);
    expect(container.querySelectorAll('[data-testid="priority-bar"]').length).toBeGreaterThan(0);
  });

  it('opens priority dropdown on click', async () => {
    const user = userEvent.setup();
    render(<EditablePriority priority="High" onPriorityChange={() => {}} />);
    await user.click(screen.getByTestId('priority-button'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('shows all priority options', async () => {
    const user = userEvent.setup();
    render(<EditablePriority priority="High" onPriorityChange={() => {}} />);
    await user.click(screen.getByTestId('priority-button'));
    expect(screen.getByRole('option', { name: /lowest/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /low/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /medium/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /high/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /highest/i })).toBeInTheDocument();
  });

  it('calls onPriorityChange when selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<EditablePriority priority="High" onPriorityChange={onChange} />);
    await user.click(screen.getByTestId('priority-button'));
    await user.click(screen.getByRole('option', { name: /lowest/i }));
    expect(onChange).toHaveBeenCalledWith('Lowest');
  });

  it('closes dropdown after selection', async () => {
    const user = userEvent.setup();
    render(<EditablePriority priority="High" onPriorityChange={() => {}} />);
    await user.click(screen.getByTestId('priority-button'));
    await user.click(screen.getByRole('option', { name: /low/i }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
