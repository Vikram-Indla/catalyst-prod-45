/**
 * CatalystTitleEditor — Title inline edit (F2.3)
 *
 * Contract:
 *   - Displays title as H1
 *   - Click to edit mode
 *   - Enter to save, Escape to cancel
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { CatalystTitleEditor } from './CatalystTitleEditor';

describe('CatalystTitleEditor (F2.3)', () => {
  it('renders title as H1', () => {
    render(<CatalystTitleEditor title="Test Title" onSave={() => {}} />);
    expect(screen.getByRole('heading', { level: 1, name: /test title/i })).toBeInTheDocument();
  });

  it('enters edit mode on click', async () => {
    const user = userEvent.setup();
    render(<CatalystTitleEditor title="Test Title" onSave={() => {}} />);
    await user.click(screen.getByRole('heading'));
    expect(screen.getByDisplayValue(/test title/i)).toBeInTheDocument();
  });

  it('saves on Enter key', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<CatalystTitleEditor title="Test Title" onSave={onSave} />);
    await user.click(screen.getByRole('heading'));
    const input = screen.getByDisplayValue(/test title/i);
    await user.type(input, ' Updated');
    await user.keyboard('{Enter}');
    expect(onSave).toHaveBeenCalledWith('Test Title Updated');
  });

  it('cancels on Escape key', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<CatalystTitleEditor title="Test Title" onSave={onSave} />);
    await user.click(screen.getByRole('heading'));
    const input = screen.getByDisplayValue(/test title/i);
    await user.type(input, ' Updated');
    await user.keyboard('{Escape}');
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: /test title/i })).toBeInTheDocument();
  });

  it('exits edit mode on blur', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<CatalystTitleEditor title="Test Title" onSave={onSave} />);
    await user.click(screen.getByRole('heading'));
    const input = screen.getByDisplayValue(/test title/i);
    await user.click(document.body);
    expect(onSave).toHaveBeenCalled();
  });
});
