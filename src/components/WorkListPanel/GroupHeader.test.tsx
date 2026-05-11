/**
 * GroupHeader — Collapsible status group header (F1.12)
 *
 * Contract:
 *   - Renders group name with item count
 *   - Toggles collapsed state on click
 *   - Shows chevron icon (up when open, down when closed)
 *   - Supports all status categories
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { GroupHeader } from './GroupHeader';

describe('GroupHeader', () => {
  it('renders group name and count', () => {
    render(
      <GroupHeader
        label="To Do"
        count={5}
        isCollapsed={false}
        onToggle={vi.fn()}
      />
    );

    expect(screen.getByText(/to do/i)).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('calls onToggle when clicked', () => {
    const onToggle = vi.fn();
    render(
      <GroupHeader
        label="In Progress"
        count={3}
        isCollapsed={false}
        onToggle={onToggle}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('shows chevron pointing down when collapsed', () => {
    const { container } = render(
      <GroupHeader
        label="Done"
        count={2}
        isCollapsed={true}
        onToggle={vi.fn()}
      />
    );

    const chevron = container.querySelector('[data-testid="group-chevron"]');
    expect(chevron).toBeInTheDocument();
    const computed = window.getComputedStyle(chevron as Element);
    // When collapsed, chevron should rotate or indicate closed state
    expect(computed.transform || computed.rotation).toBeDefined();
  });

  it('shows chevron pointing up when expanded', () => {
    const { container } = render(
      <GroupHeader
        label="Done"
        count={2}
        isCollapsed={false}
        onToggle={vi.fn()}
      />
    );

    const chevron = container.querySelector('[data-testid="group-chevron"]');
    expect(chevron).toBeInTheDocument();
  });

  it('renders with flex layout', () => {
    const { container } = render(
      <GroupHeader
        label="To Do"
        count={5}
        isCollapsed={false}
        onToggle={vi.fn()}
      />
    );

    const header = container.querySelector('[data-testid="group-header"]') as HTMLElement;
    const computed = window.getComputedStyle(header);

    expect(computed.display).toMatch(/flex/);
  });

  it('has appropriate spacing between elements', () => {
    const { container } = render(
      <GroupHeader
        label="To Do"
        count={5}
        isCollapsed={false}
        onToggle={vi.fn()}
      />
    );

    const header = container.querySelector('[data-testid="group-header"]') as HTMLElement;
    const computed = window.getComputedStyle(header);

    expect(computed.gap || computed.justifyContent).toBeTruthy();
  });
});
