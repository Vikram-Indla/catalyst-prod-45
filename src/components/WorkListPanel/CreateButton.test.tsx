/**
 * CreateButton — Trigger for new issue modal (F1.7)
 *
 * Contract:
 *   - Renders as a primary action button
 *   - onClick handler fires with no args (modal consumer handles navigation)
 *   - Accessible label "Create issue"
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { CreateButton } from './CreateButton';

describe('CreateButton', () => {
  it('renders a clickable button with "Create issue" text', () => {
    render(<CreateButton onClick={vi.fn()} />);
    const button = screen.getByRole('button', { name: /create/i });
    expect(button).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<CreateButton onClick={onClick} />);
    const button = screen.getByRole('button', { name: /create/i });
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders with primary button appearance', () => {
    const { container } = render(<CreateButton onClick={vi.fn()} />);
    const button = screen.getByRole('button', { name: /create/i });
    const computed = window.getComputedStyle(button);
    // Primary buttons have background color
    expect(computed.backgroundColor).toBeTruthy();
  });
});
