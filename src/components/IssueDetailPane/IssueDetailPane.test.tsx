/**
 * IssueDetailPane — Detail view container (F2.1)
 *
 * Contract:
 *   - Renders header, sections with scroll
 *   - Receives issue data and displays all sections
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { IssueDetailPane } from './IssueDetailPane';

function renderPane(issue: any = { id: '1', issue_key: 'BAU-1', summary: 'Test' }) {
  return render(
    <BrowserRouter>
      <IssueDetailPane issue={issue} />
    </BrowserRouter>
  );
}

describe('IssueDetailPane (F2.1)', () => {
  it('renders the detail pane container', () => {
    const { container } = renderPane();
    expect(container.querySelector('[data-testid="issue-detail-pane"]')).toBeInTheDocument();
  });

  it('renders issue header', () => {
    renderPane();
    expect(screen.getByTestId('issue-header')).toBeInTheDocument();
  });

  it('renders scrollable sections container', () => {
    const { container } = renderPane();
    expect(container.querySelector('[data-testid="detail-sections"]')).toBeInTheDocument();
  });

  it('passes issue data to header', () => {
    renderPane({ id: '1', issue_key: 'BAU-123', summary: 'Test Issue' });
    expect(screen.getByText(/BAU-123/)).toBeInTheDocument();
  });

  it('supports scrolling with overflow', () => {
    const { container } = renderPane();
    const scroll = container.querySelector('[data-testid="detail-sections"]');
    expect(scroll).toHaveStyle({ overflow: 'auto' });
  });
});
