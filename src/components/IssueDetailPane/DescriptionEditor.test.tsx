/**
 * DescriptionEditor — Description display and edit (F2.6)
 *
 * Contract:
 *   - Displays description with atlaskit-renderer
 *   - Click to edit with @atlaskit/editor-core
 *   - Save/cancel handlers
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { DescriptionEditor } from './DescriptionEditor';

describe('DescriptionEditor (F2.6)', () => {
  it('renders description section', () => {
    render(<DescriptionEditor description="Test description" onSave={() => {}} />);
    expect(screen.getByRole('heading', { name: /description/i })).toBeInTheDocument();
  });

  it('displays description content', () => {
    render(<DescriptionEditor description="Test description" onSave={() => {}} />);
    expect(screen.getByText(/test description/i)).toBeInTheDocument();
  });

  it('enters edit mode on click', async () => {
    const user = userEvent.setup();
    render(<DescriptionEditor description="Test description" onSave={() => {}} />);
    await user.click(screen.getByText(/test description/i));
    expect(screen.getByTestId('editor-input')).toBeInTheDocument();
  });

  it('shows save button in edit mode', async () => {
    const user = userEvent.setup();
    render(<DescriptionEditor description="Test" onSave={() => {}} />);
    await user.click(screen.getByText(/test/i));
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('shows cancel button in edit mode', async () => {
    const user = userEvent.setup();
    render(<DescriptionEditor description="Test" onSave={() => {}} />);
    await user.click(screen.getByText(/test/i));
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('calls onSave when save clicked', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<DescriptionEditor description="Test" onSave={onSave} />);
    await user.click(screen.getByText(/test/i));
    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(onSave).toHaveBeenCalled();
  });

  it('exits edit mode on cancel', async () => {
    const user = userEvent.setup();
    render(<DescriptionEditor description="Test" onSave={() => {}} />);
    await user.click(screen.getByText(/test/i));
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByTestId('editor-input')).not.toBeInTheDocument();
  });
});
