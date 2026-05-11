/**
 * CatalystSidebarDetails — Right rail field rows (F3.1)
 *
 * Contract:
 *   - Container for stacked field rows
 *   - Displays assignee, priority, severity, dates, etc.
 *   - Type-gated field visibility
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { CatalystSidebarDetails } from './CatalystSidebarDetails';

function renderDetails(issue: any = { id: '1', issue_key: 'BAU-1', issue_type: 'Story' }) {
  return render(
    <BrowserRouter>
      <CatalystSidebarDetails issue={issue} />
    </BrowserRouter>
  );
}

describe('CatalystSidebarDetails (F3.1)', () => {
  it('renders sidebar details container', () => {
    const { container } = renderDetails();
    expect(container.querySelector('[data-testid="sidebar-details"]')).toBeInTheDocument();
  });

  it('displays assignee field', () => {
    renderDetails({ id: '1', issue_key: 'BAU-1', assignee: 'John' });
    expect(screen.getByText(/assignee/i)).toBeInTheDocument();
  });

  it('displays priority field for all types', () => {
    renderDetails({ id: '1', issue_key: 'BAU-1', priority: 'High' });
    expect(screen.getByText(/priority/i)).toBeInTheDocument();
  });

  it('displays severity only for defect/incident', () => {
    renderDetails({ id: '1', issue_key: 'BAU-1', issue_type: 'Defect', severity: 'Critical' });
    expect(screen.getByText(/severity/i)).toBeInTheDocument();
  });

  it('hides severity for story', () => {
    const { container } = renderDetails({ id: '1', issue_key: 'BAU-1', issue_type: 'Story' });
    expect(container.textContent).not.toContain('Severity');
  });

  it('stacks fields vertically', () => {
    const { container } = renderDetails();
    const details = container.querySelector('[data-testid="sidebar-details"]');
    expect(details).toHaveStyle({ display: 'flex', flexDirection: 'column' });
  });

  it('applies gap between field rows', () => {
    const { container } = renderDetails();
    const details = container.querySelector('[data-testid="sidebar-details"]');
    expect(details).toHaveStyle({ gap: expect.any(String) });
  });
});
