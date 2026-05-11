/**
 * WorkListStates — Empty and loading state displays (F1.14)
 *
 * Contract:
 *   - Shows loading spinner when isLoading=true
 *   - Shows empty message when items empty and not loading
 *   - Shows appropriate messaging
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { WorkListEmptyState, WorkListLoadingState } from './WorkListStates';

describe('WorkListLoadingState', () => {
  it('renders loading indicator', () => {
    render(<WorkListLoadingState />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('renders loading message', () => {
    render(<WorkListLoadingState />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('has centered layout', () => {
    const { container } = render(<WorkListLoadingState />);
    const wrapper = container.querySelector('[data-testid="loading-state"]') as HTMLElement;
    const computed = window.getComputedStyle(wrapper);
    expect(computed.display).toMatch(/flex/);
  });
});

describe('WorkListEmptyState', () => {
  it('renders empty state message', () => {
    render(<WorkListEmptyState />);
    expect(screen.getByText(/no items/i)).toBeInTheDocument();
  });

  it('shows suggestion to create', () => {
    render(<WorkListEmptyState />);
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });

  it('has centered layout', () => {
    const { container } = render(<WorkListEmptyState />);
    const wrapper = container.querySelector('[data-testid="empty-state"]') as HTMLElement;
    const computed = window.getComputedStyle(wrapper);
    expect(computed.display).toMatch(/flex/);
  });

  it('shows appropriate padding', () => {
    const { container } = render(<WorkListEmptyState />);
    const wrapper = container.querySelector('[data-testid="empty-state"]') as HTMLElement;
    const computed = window.getComputedStyle(wrapper);
    expect(computed.padding).toBeTruthy();
  });
});
