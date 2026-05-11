/**
 * ActivityPanel — Activity with comments tab (F2.10)
 *
 * Contract:
 *   - Shows activity/comments section
 *   - Displays comment list with author, timestamp
 *   - Tab switching for history view
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ActivityPanel } from './ActivityPanel';

function renderPanel(comments: any = []) {
  return render(
    <BrowserRouter>
      <ActivityPanel issueKey="BAU-1" comments={comments} />
    </BrowserRouter>
  );
}

describe('ActivityPanel (F2.10)', () => {
  it('renders activity section', () => {
    renderPanel();
    expect(screen.getByRole('heading', { name: /activity/i })).toBeInTheDocument();
  });

  it('shows comments tab', () => {
    renderPanel();
    expect(screen.getByRole('tab', { name: /comments/i })).toBeInTheDocument();
  });

  it('shows history tab', () => {
    renderPanel();
    expect(screen.getByRole('tab', { name: /history/i })).toBeInTheDocument();
  });

  it('displays comments', () => {
    renderPanel([
      { id: '1', author: 'John', body: 'Test comment', timestamp: '2026-05-11T10:00:00Z' }
    ]);
    expect(screen.getByText(/test comment/i)).toBeInTheDocument();
  });

  it('shows author name in comment', () => {
    renderPanel([
      { id: '1', author: 'John', body: 'Test comment', timestamp: '2026-05-11T10:00:00Z' }
    ]);
    expect(screen.getByText(/John/)).toBeInTheDocument();
  });

  it('shows timestamp in comment', () => {
    renderPanel([
      { id: '1', author: 'John', body: 'Test comment', timestamp: '2026-05-11T10:00:00Z' }
    ]);
    expect(screen.getByText(/may 11/i)).toBeInTheDocument();
  });

  it('shows empty state when no comments', () => {
    renderPanel([]);
    expect(screen.getByText(/no comments/i)).toBeInTheDocument();
  });

  it('switches to history tab', async () => {
    const user = userEvent.setup();
    renderPanel([]);
    await user.click(screen.getByRole('tab', { name: /history/i }));
    expect(screen.getByRole('tab', { name: /history/i })).toHaveAttribute('aria-selected', 'true');
  });
});
