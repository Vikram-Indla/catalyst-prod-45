/**
 * SubtasksPanel — Subtasks list and create (F2.8)
 *
 * Contract:
 *   - Displays subtasks list
 *   - Shows "+ Create sub-task" button
 *   - Inline create row when creating
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { SubtasksPanel } from './SubtasksPanel';

function renderPanel(subtasks: any = []) {
  return render(
    <BrowserRouter>
      <SubtasksPanel issueKey="BAU-1" subtasks={subtasks} onCreateSubtask={() => {}} />
    </BrowserRouter>
  );
}

describe('SubtasksPanel (F2.8)', () => {
  it('renders subtasks section', () => {
    renderPanel();
    expect(screen.getByRole('heading', { name: /subtasks/i })).toBeInTheDocument();
  });

  it('displays list of subtasks', () => {
    renderPanel([
      { key: 'BAU-1.1', summary: 'Subtask 1' },
      { key: 'BAU-1.2', summary: 'Subtask 2' }
    ]);
    expect(screen.getByText(/Subtask 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Subtask 2/i)).toBeInTheDocument();
  });

  it('shows empty state when no subtasks', () => {
    renderPanel([]);
    expect(screen.getByText(/no subtasks/i)).toBeInTheDocument();
  });

  it('shows create button', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: /create sub-task/i })).toBeInTheDocument();
  });

  it('shows inline create row when creating', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <SubtasksPanel issueKey="BAU-1" subtasks={[]} onCreateSubtask={() => {}} />
      </BrowserRouter>
    );
    await user.click(screen.getByRole('button', { name: /create sub-task/i }));
    expect(screen.getByTestId('inline-create-row')).toBeInTheDocument();
  });

  it('makes subtask keys clickable', () => {
    renderPanel([{ key: 'BAU-1.1', summary: 'Subtask 1' }]);
    expect(screen.getByRole('link', { name: /BAU-1\.1/i })).toBeInTheDocument();
  });
});
