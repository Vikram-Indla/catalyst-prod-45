/**
 * CatalystLabelsField — Labels for Story/Task (F3.7)
 *
 * Contract:
 *   - Displays labels as tags
 *   - Click to edit with picker
 *   - Type-gated (Story, Task only)
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { CatalystLabelsField } from './CatalystLabelsField';

describe('CatalystLabelsField (F3.7)', () => {
  it('renders labels field label', () => {
    render(<CatalystLabelsField labels={[]} onLabelsChange={() => {}} />);
    expect(screen.getAllByText(/labels/i)[0]).toBeInTheDocument();
  });

  it('displays labels as tags', () => {
    render(<CatalystLabelsField labels={['bug', 'urgent']} onLabelsChange={() => {}} />);
    expect(screen.getByText(/bug/i)).toBeInTheDocument();
    expect(screen.getByText(/urgent/i)).toBeInTheDocument();
  });

  it('shows empty state when no labels', () => {
    render(<CatalystLabelsField labels={[]} onLabelsChange={() => {}} />);
    expect(screen.getByText(/no labels/i)).toBeInTheDocument();
  });

  it('opens label picker on click', async () => {
    const user = userEvent.setup();
    render(<CatalystLabelsField labels={[]} onLabelsChange={() => {}} />);
    await user.click(screen.getByTestId('labels-button'));
    expect(screen.getByTestId('labels-picker')).toBeInTheDocument();
  });

  it('shows available labels in picker', async () => {
    const user = userEvent.setup();
    render(<CatalystLabelsField labels={[]} onLabelsChange={() => {}} />);
    await user.click(screen.getByTestId('labels-button'));
    expect(screen.getByText(/backend/i)).toBeInTheDocument();
    expect(screen.getByText(/frontend/i)).toBeInTheDocument();
  });

  it('toggles label selection', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CatalystLabelsField labels={[]} onLabelsChange={onChange} />);
    await user.click(screen.getByTestId('labels-button'));
    await user.click(screen.getByRole('checkbox', { name: /backend/i }));
    expect(onChange).toHaveBeenCalledWith(expect.arrayContaining(['backend']));
  });

  it('closes picker after label change', async () => {
    const user = userEvent.setup();
    render(<CatalystLabelsField labels={[]} onLabelsChange={() => {}} />);
    await user.click(screen.getByTestId('labels-button'));
    await user.click(screen.getByRole('checkbox', { name: /backend/i }));
    expect(screen.queryByTestId('labels-picker')).not.toBeInTheDocument();
  });
});
