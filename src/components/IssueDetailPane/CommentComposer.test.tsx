/**
 * CommentComposer — Rich text comment input (F2.11)
 *
 * Contract:
 *   - Shows rich text editor input
 *   - "Add comment" button
 *   - Submit and reset handlers
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { CommentComposer } from './CommentComposer';

describe('CommentComposer (F2.11)', () => {
  it('renders composer section', () => {
    render(<CommentComposer onSubmit={() => {}} />);
    expect(screen.getByRole('heading', { name: /add comment/i })).toBeInTheDocument();
  });

  it('has text input for comment', () => {
    const { container } = render(<CommentComposer onSubmit={() => {}} />);
    expect(container.querySelector('[data-testid="comment-input"]')).toBeInTheDocument();
  });

  it('shows add comment button', () => {
    render(<CommentComposer onSubmit={() => {}} />);
    expect(screen.getByRole('button', { name: /add comment/i })).toBeInTheDocument();
  });

  it('disables button when input empty', () => {
    render(<CommentComposer onSubmit={() => {}} />);
    expect(screen.getByRole('button', { name: /add comment/i })).toBeDisabled();
  });

  it('enables button when text entered', async () => {
    const user = userEvent.setup();
    const { container } = render(<CommentComposer onSubmit={() => {}} />);
    const input = container.querySelector('[data-testid="comment-input"]') as HTMLTextAreaElement;
    await user.type(input, 'Test comment');
    expect(screen.getByRole('button', { name: /add comment/i })).toBeEnabled();
  });

  it('calls onSubmit when button clicked', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { container } = render(<CommentComposer onSubmit={onSubmit} />);
    const input = container.querySelector('[data-testid="comment-input"]') as HTMLTextAreaElement;
    await user.type(input, 'Test comment');
    await user.click(screen.getByRole('button', { name: /add comment/i }));
    expect(onSubmit).toHaveBeenCalledWith('Test comment');
  });

  it('clears input after submit', async () => {
    const user = userEvent.setup();
    const { container } = render(<CommentComposer onSubmit={() => {}} />);
    const input = container.querySelector('[data-testid="comment-input"]') as HTMLTextAreaElement;
    await user.type(input, 'Test comment');
    await user.click(screen.getByRole('button', { name: /add comment/i }));
    expect(input.value).toBe('');
  });
});
