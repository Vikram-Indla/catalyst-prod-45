/**
 * WorkListHeader — Header for work list (F1.18)
 *
 * Contract:
 *   - Renders title and item count
 *   - Renders create button
 *   - Calls onCreateClick when create button clicked
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { WorkListHeader, WorkListHeaderProps } from './WorkListHeader';

describe('WorkListHeader', () => {
  it('renders title with item count', () => {
    render(
      <WorkListHeader itemCount={15} onCreateClick={() => {}} />
    );
    expect(screen.getByText(/work items/i)).toBeInTheDocument();
    expect(screen.getByText(/15/)).toBeInTheDocument();
  });

  it('renders create button', () => {
    render(
      <WorkListHeader itemCount={5} onCreateClick={() => {}} />
    );
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });

  it('calls onCreateClick when create button clicked', async () => {
    const user = userEvent.setup();
    const onCreateClick = vi.fn();
    render(
      <WorkListHeader itemCount={5} onCreateClick={onCreateClick} />
    );

    const createButton = screen.getByRole('button', { name: /create/i });
    await user.click(createButton);
    expect(onCreateClick).toHaveBeenCalled();
  });

  it('shows zero count when no items', () => {
    render(
      <WorkListHeader itemCount={0} onCreateClick={() => {}} />
    );
    expect(screen.getByText(/0/)).toBeInTheDocument();
  });

  it('has flex layout with space between', () => {
    const { container } = render(
      <WorkListHeader itemCount={10} onCreateClick={() => {}} />
    );
    const header = container.firstChild as HTMLElement;
    const computed = window.getComputedStyle(header);
    expect(computed.display).toMatch(/flex/);
  });
});
