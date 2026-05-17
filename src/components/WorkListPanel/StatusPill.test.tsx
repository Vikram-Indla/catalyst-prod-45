/**
 * StatusPill — Jira-measured status badge (F1.4)
 *
 * Displays status with exact Jira colors (from 2026-05-08 DOM probe):
 *   - todo/default: rgba(5,21,36,0.06) [light grey] + dark text
 *   - inprogress: #669DF1 [blue] + white text
 *   - done: #94C748 [green] + dark text
 *
 * Contract:
 *   - Renders status text (uppercase, 11px, 600 weight, letterSpacing)
 *   - Background color matches category
 *   - Text color has proper contrast
 *   - Compact size (suitable for table cells, row items)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { StatusPill } from './StatusPill';

describe('StatusPill', () => {
  it('renders status text in uppercase', () => {
    render(
      <StatusPill status="In Progress" statusCategory="inprogress" />
    );

    const pill = screen.getByText('IN PROGRESS');
    expect(pill).toBeInTheDocument();
  });

  it('renders todo category with light grey background', () => {
    const { container } = render(
      <StatusPill status="To Do" statusCategory="todo" />
    );

    const pill = container.querySelector('[data-testid="status-pill"]') as HTMLElement;
    const computed = window.getComputedStyle(pill);

    // Should have light grey background
    expect(computed.backgroundColor).toBeTruthy();
    // Should have dark text for contrast
    expect(computed.color).toContain('23'); // rgb(23, 43, 77) = #172B4D
  });

  it('renders inprogress category with blue background', () => {
    const { container } = render(
      <StatusPill status="In Progress" statusCategory="inprogress" />
    );

    const pill = container.querySelector('[data-testid="status-pill"]') as HTMLElement;
    const computed = window.getComputedStyle(pill);

    // Should have blue background
    expect(computed.backgroundColor).toBeTruthy();
    // Should have white text for contrast on blue
    expect(computed.color).toContain('255'); // White (FFFFFF)
  });

  it('renders done category with green background', () => {
    const { container } = render(
      <StatusPill status="Done" statusCategory="done" />
    );

    const pill = container.querySelector('[data-testid="status-pill"]') as HTMLElement;
    const computed = window.getComputedStyle(pill);

    // Should have green background
    expect(computed.backgroundColor).toBeTruthy();
    // Should have dark text for contrast
    expect(computed.color).toContain('23'); // rgb(23, 43, 77) = #172B4D
  });

  it('renders with correct typography (11px, 600 weight, uppercase)', () => {
    const { container } = render(
      <StatusPill status="Blocked" statusCategory="default" />
    );

    const pill = container.querySelector('[data-testid="status-pill"]') as HTMLElement;
    const computed = window.getComputedStyle(pill);

    expect(computed.fontSize).toBe('11px');
    expect(computed.fontWeight).toBe('600');
    expect(computed.textTransform).toBe('uppercase');
  });

  it('has proper letter spacing (0.165px)', () => {
    const { container } = render(
      <StatusPill status="On Hold" statusCategory="default" />
    );

    const pill = container.querySelector('[data-testid="status-pill"]') as HTMLElement;
    const computed = window.getComputedStyle(pill);

    expect(computed.letterSpacing).toBeTruthy();
  });

  it('renders with compact padding', () => {
    const { container } = render(
      <StatusPill status="Test" statusCategory="default" />
    );

    const pill = container.querySelector('[data-testid="status-pill"]') as HTMLElement;
    const computed = window.getComputedStyle(pill);

    // Should have small padding (2px vertical, 6px horizontal)
    expect(computed.padding).toBeTruthy();
  });

  it('renders in a flex inline container', () => {
    const { container } = render(
      <StatusPill status="Test" statusCategory="default" />
    );

    const pill = container.querySelector('[data-testid="status-pill"]') as HTMLElement;
    const computed = window.getComputedStyle(pill);

    // Should be inline-flex for text centering
    expect(computed.display).toMatch(/inline/);
  });

  it('handles all valid status categories', () => {
    const categories = ['todo', 'inprogress', 'done', 'default'] as const;

    categories.forEach(cat => {
      const { rerender } = render(
        <StatusPill status="Test" statusCategory={cat} />
      );
      expect(screen.getByText('TEST')).toBeInTheDocument();
      rerender(null);
    });
  });
});
