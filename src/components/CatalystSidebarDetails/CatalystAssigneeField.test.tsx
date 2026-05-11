/**
 * CatalystAssigneeField — Assignee with inline picker (F3.3)
 *
 * Contract:
 *   - Displays current assignee
 *   - Click to open assignee picker (portal)
 *   - Search and select functionality
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { CatalystAssigneeField } from './CatalystAssigneeField';

function renderField(assignee: any = null) {
  return render(
    <BrowserRouter>
      <CatalystAssigneeField assignee={assignee} onAssigneeChange={() => {}} />
    </BrowserRouter>
  );
}

describe('CatalystAssigneeField (F3.3)', () => {
  it('renders assignee field label', () => {
    renderField();
    expect(screen.getByText(/assignee/i)).toBeInTheDocument();
  });

  it('displays current assignee', () => {
    renderField({ name: 'John Doe' });
    expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
  });

  it('shows placeholder when unassigned', () => {
    renderField(null);
    expect(screen.getByText(/unassigned/i)).toBeInTheDocument();
  });

  it('opens picker on click', async () => {
    const user = userEvent.setup();
    renderField();
    await user.click(screen.getByTestId('assignee-button'));
    expect(screen.getByTestId('assignee-picker-portal')).toBeInTheDocument();
  });

  it('shows search input in picker', async () => {
    const user = userEvent.setup();
    renderField();
    await user.click(screen.getByTestId('assignee-button'));
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('filters assignees by search', async () => {
    const user = userEvent.setup();
    renderField();
    await user.click(screen.getByTestId('assignee-button'));
    const input = screen.getByPlaceholderText(/search/i);
    await user.type(input, 'John');
    expect(screen.getByText(/john/i)).toBeInTheDocument();
  });

  it('calls onAssigneeChange when assignee selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <BrowserRouter>
        <CatalystAssigneeField assignee={null} onAssigneeChange={onChange} />
      </BrowserRouter>
    );
    await user.click(screen.getByTestId('assignee-button'));
    await user.click(screen.getByText(/John Doe/i));
    expect(onChange).toHaveBeenCalled();
  });

  it('closes picker after selection', async () => {
    const user = userEvent.setup();
    renderField();
    await user.click(screen.getByTestId('assignee-button'));
    await user.click(screen.getByText(/John Doe/i));
    expect(screen.queryByTestId('assignee-picker-portal')).not.toBeInTheDocument();
  });
});
