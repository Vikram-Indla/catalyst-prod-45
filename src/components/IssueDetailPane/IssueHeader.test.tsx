/**
 * IssueHeader — Detail header with breadcrumb, navigation, close (F2.2)
 *
 * Contract:
 *   - Shows breadcrumb navigation
 *   - Prev/next arrows for navigation
 *   - Close button
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { IssueHeader } from './IssueHeader';

function renderHeader(issue: any = { id: '1', issue_key: 'BAU-1', summary: 'Test' }) {
  return render(
    <BrowserRouter>
      <IssueHeader issue={issue} onClose={() => {}} />
    </BrowserRouter>
  );
}

describe('IssueHeader (F2.2)', () => {
  it('renders header container', () => {
    const { container } = renderHeader();
    expect(container.querySelector('[data-testid="issue-header"]')).toBeInTheDocument();
  });

  it('shows breadcrumb navigation', () => {
    renderHeader();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('shows prev arrow button', () => {
    renderHeader();
    expect(screen.getByLabelText(/previous/i)).toBeInTheDocument();
  });

  it('shows next arrow button', () => {
    renderHeader();
    expect(screen.getByLabelText(/next/i)).toBeInTheDocument();
  });

  it('shows close button', () => {
    renderHeader();
    expect(screen.getByLabelText(/close/i)).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(
      <BrowserRouter>
        <IssueHeader issue={{ id: '1', issue_key: 'BAU-1' }} onClose={onClose} />
      </BrowserRouter>
    );
    screen.getByLabelText(/close/i).click();
    expect(onClose).toHaveBeenCalled();
  });
});
