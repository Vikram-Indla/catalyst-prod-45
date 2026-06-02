/**
 * CatalystSprintReleaseField — Sprint/Release selector (F3.8)
 *
 * Contract:
 *   - Displays selected sprint/release versions
 *   - Click to edit with multi-select picker
 *   - Type-gated per screen scheme
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { CatalystSprintReleaseField } from './CatalystSprintReleaseField';

describe('CatalystSprintReleaseField (F3.8)', () => {
  it('renders sprint/release field label', () => {
    render(<CatalystSprintReleaseField sprintRelease={[]} onSprintReleaseChange={() => {}} />);
    expect(screen.getByText(/sprint\/release/i)).toBeInTheDocument();
  });

  it('displays selected sprint/release versions', () => {
    render(<CatalystSprintReleaseField sprintRelease={['v1.0', 'v1.1']} onSprintReleaseChange={() => {}} />);
    expect(screen.getByText(/v1.0/i)).toBeInTheDocument();
    expect(screen.getByText(/v1.1/i)).toBeInTheDocument();
  });

  it('shows empty state when no versions', () => {
    render(<CatalystSprintReleaseField sprintRelease={[]} onSprintReleaseChange={() => {}} />);
    expect(screen.getByText(/none selected/i)).toBeInTheDocument();
  });

  it('opens version picker on click', async () => {
    const user = userEvent.setup();
    render(<CatalystSprintReleaseField sprintRelease={[]} onSprintReleaseChange={() => {}} />);
    await user.click(screen.getByTestId('versions-button'));
    expect(screen.getByTestId('versions-picker')).toBeInTheDocument();
  });

  it('shows available versions in picker', async () => {
    const user = userEvent.setup();
    render(<CatalystSprintReleaseField sprintRelease={[]} onSprintReleaseChange={() => {}} />);
    await user.click(screen.getByTestId('versions-button'));
    expect(screen.getByText(/v1.0/i)).toBeInTheDocument();
    expect(screen.getByText(/v2.0/i)).toBeInTheDocument();
  });

  it('toggles version selection', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CatalystSprintReleaseField sprintRelease={[]} onSprintReleaseChange={onChange} />);
    await user.click(screen.getByTestId('versions-button'));
    await user.click(screen.getByRole('checkbox', { name: /v1.0/i }));
    expect(onChange).toHaveBeenCalledWith(expect.arrayContaining(['v1.0']));
  });

  it('allows multiple selections', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CatalystSprintReleaseField sprintRelease={[]} onSprintReleaseChange={onChange} />);
    await user.click(screen.getByTestId('versions-button'));
    await user.click(screen.getByRole('checkbox', { name: /v1.0/i }));
    await user.click(screen.getByRole('checkbox', { name: /v2.0/i }));
    expect(onChange).toHaveBeenLastCalledWith(expect.arrayContaining(['v1.0', 'v2.0']));
  });
});
