/**
 * WorkListFilters — Filter bar for work list (F1.17)
 *
 * Contract:
 *   - Renders search input
 *   - Shows active filter count
 *   - Calls onChange with search term
 *   - Calls onClearFilters when requested
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { WorkListFilters, WorkListFiltersProps } from './WorkListFilters';

describe('WorkListFilters', () => {
  it('renders search input', () => {
    render(
      <WorkListFilters
        searchTerm=""
        activeFilterCount={0}
        onChange={() => {}}
        onClearFilters={() => {}}
      />
    );
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('calls onChange when typing in search', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <WorkListFilters
        searchTerm="BAU"
        activeFilterCount={0}
        onChange={onChange}
        onClearFilters={() => {}}
      />
    );

    const input = screen.getByPlaceholderText(/search/i) as HTMLInputElement;
    await user.type(input, '-123');
    expect(onChange).toHaveBeenCalled();
  });

  it('shows active filter count badge', () => {
    render(
      <WorkListFilters
        searchTerm=""
        activeFilterCount={3}
        onChange={() => {}}
        onClearFilters={() => {}}
      />
    );
    expect(screen.getByText(/3/)).toBeInTheDocument();
  });

  it('calls onClearFilters when clear button clicked', async () => {
    const user = userEvent.setup();
    const onClearFilters = vi.fn();
    render(
      <WorkListFilters
        searchTerm="test"
        activeFilterCount={1}
        onChange={() => {}}
        onClearFilters={onClearFilters}
      />
    );

    const clearButton = screen.getByRole('button', { name: /clear/i });
    await user.click(clearButton);
    expect(onClearFilters).toHaveBeenCalled();
  });

  it('displays current search term in input', () => {
    render(
      <WorkListFilters
        searchTerm="my search"
        activeFilterCount={0}
        onChange={() => {}}
        onClearFilters={() => {}}
      />
    );
    expect(screen.getByDisplayValue('my search')).toBeInTheDocument();
  });
});
