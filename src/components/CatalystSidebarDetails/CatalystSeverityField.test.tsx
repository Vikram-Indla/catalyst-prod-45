/**
 * CatalystSeverityField — Severity for Incident/Defect (F3.5)
 *
 * Contract:
 *   - Displays severity level
 *   - Click to edit with dropdown
 *   - Type-gated (Incident, Defect only)
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { CatalystSeverityField } from './CatalystSeverityField';

describe('CatalystSeverityField (F3.5)', () => {
  it('renders severity field label', () => {
    render(<CatalystSeverityField severity="Critical" onSeverityChange={() => {}} />);
    expect(screen.getByText(/severity/i)).toBeInTheDocument();
  });

  it('displays current severity', () => {
    render(<CatalystSeverityField severity="Critical" onSeverityChange={() => {}} />);
    expect(screen.getByText(/Critical/i)).toBeInTheDocument();
  });

  it('opens severity dropdown on click', async () => {
    const user = userEvent.setup();
    render(<CatalystSeverityField severity="Critical" onSeverityChange={() => {}} />);
    await user.click(screen.getByTestId('severity-button'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('shows severity options', async () => {
    const user = userEvent.setup();
    render(<CatalystSeverityField severity="Critical" onSeverityChange={() => {}} />);
    await user.click(screen.getByTestId('severity-button'));
    expect(screen.getByRole('option', { name: /critical/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /high/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /medium/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /low/i })).toBeInTheDocument();
  });

  it('calls onSeverityChange when selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CatalystSeverityField severity="Critical" onSeverityChange={onChange} />);
    await user.click(screen.getByTestId('severity-button'));
    await user.click(screen.getByRole('option', { name: /low/i }));
    expect(onChange).toHaveBeenCalledWith('Low');
  });

  it('closes dropdown after selection', async () => {
    const user = userEvent.setup();
    render(<CatalystSeverityField severity="Critical" onSeverityChange={() => {}} />);
    await user.click(screen.getByTestId('severity-button'));
    await user.click(screen.getByRole('option', { name: /medium/i }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
