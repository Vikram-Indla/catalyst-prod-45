/**
 * EpicDueDateField — Due date with calendar picker (F3.6)
 *
 * Contract:
 *   - Displays due date
 *   - Click to open calendar picker
 *   - Type-gated per screen scheme (Epic, Backend, PI, CR)
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { EpicDueDateField } from './EpicDueDateField';

describe('EpicDueDateField (F3.6)', () => {
  it('renders due date field label', () => {
    render(<EpicDueDateField dueDate="2026-05-31" onDueDateChange={() => {}} />);
    expect(screen.getByText(/due date/i)).toBeInTheDocument();
  });

  it('displays current due date', () => {
    render(<EpicDueDateField dueDate="2026-05-31" onDueDateChange={() => {}} />);
    expect(screen.getByText(/may 31/i)).toBeInTheDocument();
  });

  it('shows empty state when no date', () => {
    render(<EpicDueDateField dueDate={null} onDueDateChange={() => {}} />);
    expect(screen.getByText(/no due date/i)).toBeInTheDocument();
  });

  it('opens calendar picker on click', async () => {
    const user = userEvent.setup();
    render(<EpicDueDateField dueDate="2026-05-31" onDueDateChange={() => {}} />);
    await user.click(screen.getByTestId('date-button'));
    expect(screen.getByTestId('calendar-picker')).toBeInTheDocument();
  });

  it('shows calendar with current date highlighted', async () => {
    const user = userEvent.setup();
    render(<EpicDueDateField dueDate="2026-05-31" onDueDateChange={() => {}} />);
    await user.click(screen.getByTestId('date-button'));
    expect(screen.getByText('31')).toHaveAttribute('aria-current', 'date');
  });

  it('calls onDueDateChange when date selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<EpicDueDateField dueDate="2026-05-31" onDueDateChange={onChange} />);
    await user.click(screen.getByTestId('date-button'));
    await user.click(screen.getByText('25'));
    expect(onChange).toHaveBeenCalledWith(expect.stringContaining('2026-05-25'));
  });

  it('closes picker after date selection', async () => {
    const user = userEvent.setup();
    render(<EpicDueDateField dueDate="2026-05-31" onDueDateChange={() => {}} />);
    await user.click(screen.getByTestId('date-button'));
    await user.click(screen.getByText('25'));
    expect(screen.queryByTestId('calendar-picker')).not.toBeInTheDocument();
  });
});
