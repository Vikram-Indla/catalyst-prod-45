/**
 * WorkCard — Individual work item row (F1.3)
 *
 * Displays:
 *   - Type icon (JiraIssueTypeIcon 14px)
 *   - Key (blue, clickable)
 *   - Summary (ellipsis on overflow)
 *   - Status pill (Jira-measured colors)
 *   - Parent link (if present)
 *
 * Contract:
 *   - Renders all fields
 *   - onClick handler fires on row click
 *   - isSelected prop controls background highlight
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorkCard } from './WorkCard';

describe('WorkCard', () => {
  const mockItem = {
    id: '1',
    key: 'BAU-123',
    issueType: 'Story',
    summary: 'Add feature to support dark mode in settings',
    status: 'In Progress',
    statusCategory: 'inprogress' as const,
    parentKey: 'BAU-100',
    parentSummary: 'UI Theme Refactor',
  };

  const renderWithQuery = (component: React.ReactElement) => {
    const qc = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    return render(
      <QueryClientProvider client={qc}>{component}</QueryClientProvider>
    );
  };

  it('renders work item key', () => {
    renderWithQuery(
      <WorkCard item={mockItem} isSelected={false} onClick={vi.fn()} />
    );

    const keyElement = screen.getByText('BAU-123');
    expect(keyElement).toBeInTheDocument();
  });

  it('renders work item summary', () => {
    renderWithQuery(
      <WorkCard item={mockItem} isSelected={false} onClick={vi.fn()} />
    );

    const summary = screen.getByText(
      /Add feature to support dark mode in settings/i
    );
    expect(summary).toBeInTheDocument();
  });

  it('renders status pill with correct text', () => {
    renderWithQuery(
      <WorkCard item={mockItem} isSelected={false} onClick={vi.fn()} />
    );

    const status = screen.getByText('In Progress');
    expect(status).toBeInTheDocument();
  });

  it('renders parent key as link when present', () => {
    renderWithQuery(
      <WorkCard item={mockItem} isSelected={false} onClick={vi.fn()} />
    );

    const parentKey = screen.getByText('BAU-100');
    expect(parentKey).toBeInTheDocument();
  });

  it('does not render parent when absent', () => {
    const itemWithoutParent = { ...mockItem, parentKey: null };
    renderWithQuery(
      <WorkCard item={itemWithoutParent} isSelected={false} onClick={vi.fn()} />
    );

    expect(screen.queryByText('BAU-100')).not.toBeInTheDocument();
  });

  it('fires onClick when row is clicked', () => {
    const onClick = vi.fn();
    renderWithQuery(
      <WorkCard item={mockItem} isSelected={false} onClick={onClick} />
    );

    const row = screen.getByRole('button');
    fireEvent.click(row);

    expect(onClick).toHaveBeenCalledWith('BAU-123');
  });

  it('highlights row when isSelected is true', () => {
    const { container } = renderWithQuery(
      <WorkCard item={mockItem} isSelected={true} onClick={vi.fn()} />
    );

    const row = container.querySelector('[data-testid="work-card"]') as HTMLElement;
    const computed = window.getComputedStyle(row);
    // Selected state should have a background color
    expect(computed.backgroundColor).not.toBe('transparent');
    expect(computed.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  it('renders issue type icon', () => {
    const { container } = renderWithQuery(
      <WorkCard item={mockItem} isSelected={false} onClick={vi.fn()} />
    );

    // JiraIssueTypeIcon should be present (icon library component)
    const icon = container.querySelector('[data-testid="work-card-type-icon"]');
    expect(icon).toBeInTheDocument();
  });

  it('handles multiple status categories correctly', () => {
    const doneItem = { ...mockItem, status: 'Done', statusCategory: 'done' as const };
    renderWithQuery(
      <WorkCard item={doneItem} isSelected={false} onClick={vi.fn()} />
    );

    expect(screen.getByText('Done')).toBeInTheDocument();
  });
});
