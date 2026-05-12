/**
 * CatalystFixVersionsField — Fix versions selector (F3.8)
 *
 * Contract:
 *   - Displays selected fix versions
 *   - Click to edit with multi-select picker
 *   - Type-gated per screen scheme
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { CatalystFixVersionsField } from './CatalystFixVersionsField';

describe('CatalystFixVersionsField (F3.8)', () => {
  it('renders fix versions field label', () => {
    render(<CatalystFixVersionsField fixVersions={[]} onFixVersionsChange={() => {}} />);
    expect(screen.getByText(/fix versions/i)).toBeInTheDocument();
  });

  it('displays selected fix versions', () => {
    render(<CatalystFixVersionsField fixVersions={['v1.0', 'v1.1']} onFixVersionsChange={() => {}} />);
    expect(screen.getByText(/v1.0/i)).toBeInTheDocument();
    expect(screen.getByText(/v1.1/i)).toBeInTheDocument();
  });

  it('shows empty state when no versions', () => {
    render(<CatalystFixVersionsField fixVersions={[]} onFixVersionsChange={() => {}} />);
    expect(screen.getByText(/none selected/i)).toBeInTheDocument();
  });

  it('opens version picker on click', async () => {
    const user = userEvent.setup();
    render(<CatalystFixVersionsField fixVersions={[]} onFixVersionsChange={() => {}} />);
    await user.click(screen.getByTestId('versions-button'));
    expect(screen.getByTestId('versions-picker')).toBeInTheDocument();
  });

  it('shows available versions in picker', async () => {
    const user = userEvent.setup();
    render(<CatalystFixVersionsField fixVersions={[]} onFixVersionsChange={() => {}} />);
    await user.click(screen.getByTestId('versions-button'));
    expect(screen.getByText(/v1.0/i)).toBeInTheDocument();
    expect(screen.getByText(/v2.0/i)).toBeInTheDocument();
  });

  it('toggles version selection', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CatalystFixVersionsField fixVersions={[]} onFixVersionsChange={onChange} />);
    await user.click(screen.getByTestId('versions-button'));
    await user.click(screen.getByRole('checkbox', { name: /v1.0/i }));
    expect(onChange).toHaveBeenCalledWith(expect.arrayContaining(['v1.0']));
  });

  it('allows multiple selections', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CatalystFixVersionsField fixVersions={[]} onFixVersionsChange={onChange} />);
    await user.click(screen.getByTestId('versions-button'));
    await user.click(screen.getByRole('checkbox', { name: /v1.0/i }));
    await user.click(screen.getByRole('checkbox', { name: /v2.0/i }));
    expect(onChange).toHaveBeenLastCalledWith(expect.arrayContaining(['v1.0', 'v2.0']));
  });
});
