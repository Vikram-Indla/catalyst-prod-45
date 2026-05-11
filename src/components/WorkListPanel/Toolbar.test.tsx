/**
 * Toolbar — Search, filter, sort, refresh controls for WorkListPanel (F1.2)
 *
 * Contract:
 *   - Renders search input with magnifying glass icon
 *   - Renders filter button (count badge when active)
 *   - Renders sort dropdown (Status, Created, Updated, etc.)
 *   - Renders refresh button (click to refetch)
 *   - Callbacks fire on input/click
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Toolbar } from './Toolbar';

describe('Toolbar', () => {
  beforeEach(() => {
    // Setup
  });

  it('renders search input with placeholder', () => {
    const onSearch = vi.fn();
    render(
      <Toolbar
        searchValue=""
        onSearch={onSearch}
        onFilter={vi.fn()}
        onSort={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText(/search issues/i);
    expect(input).toBeInTheDocument();
  });

  it('calls onSearch when input value changes', () => {
    const onSearch = vi.fn();
    render(
      <Toolbar
        searchValue=""
        onSearch={onSearch}
        onFilter={vi.fn()}
        onSort={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText(/search issues/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'BAU-123' } });

    expect(onSearch).toHaveBeenCalledWith('BAU-123');
  });

  it('renders filter button with badge when filters are active', () => {
    render(
      <Toolbar
        searchValue=""
        onSearch={vi.fn()}
        onFilter={vi.fn()}
        onSort={vi.fn()}
        onRefresh={vi.fn()}
        activeFilterCount={3}
      />
    );

    const filterButton = screen.getByRole('button', { name: /filter/i });
    expect(filterButton).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // Badge
  });

  it('calls onFilter when filter button is clicked', () => {
    const onFilter = vi.fn();
    render(
      <Toolbar
        searchValue=""
        onSearch={vi.fn()}
        onFilter={onFilter}
        onSort={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    const filterButton = screen.getByRole('button', { name: /filter/i });
    fireEvent.click(filterButton);

    expect(onFilter).toHaveBeenCalledTimes(1);
  });

  it('renders sort dropdown with current sort option', () => {
    render(
      <Toolbar
        searchValue=""
        onSearch={vi.fn()}
        onFilter={vi.fn()}
        onSort={vi.fn()}
        onRefresh={vi.fn()}
        sortBy="created"
      />
    );

    const sortSelect = screen.getByDisplayValue('Created') as HTMLSelectElement;
    expect(sortSelect).toBeInTheDocument();
    expect(sortSelect.value).toBe('created');
  });

  it('calls onSort when sort option is changed', () => {
    const onSort = vi.fn();
    render(
      <Toolbar
        searchValue=""
        onSearch={vi.fn()}
        onFilter={vi.fn()}
        onSort={onSort}
        onRefresh={vi.fn()}
        sortBy="created"
      />
    );

    const sortSelect = screen.getByDisplayValue('Created') as HTMLSelectElement;
    fireEvent.change(sortSelect, { target: { value: 'updated' } });

    expect(onSort).toHaveBeenCalledWith('updated');
  });

  it('calls onRefresh when refresh button is clicked', () => {
    const onRefresh = vi.fn();
    render(
      <Toolbar
        searchValue=""
        onSearch={vi.fn()}
        onFilter={vi.fn()}
        onSort={vi.fn()}
        onRefresh={onRefresh}
      />
    );

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('renders all toolbar buttons without crashing', () => {
    const { container } = render(
      <Toolbar
        searchValue="test"
        onSearch={vi.fn()}
        onFilter={vi.fn()}
        onSort={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    const toolbar = container.querySelector('[data-testid="work-list-toolbar"]');
    expect(toolbar).toBeInTheDocument();

    // Should have search input, filter button, sort dropdown, refresh button
    expect(screen.getByPlaceholderText(/search issues/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /filter/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
  });
});
