/**
 * SlashCommandPalette unit tests.
 * Tests: command filtering, keyboard navigation, command insertion.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useRef, useState } from 'react';
import { SlashCommandPalette } from './SlashCommandPalette';

// Wrapper component that provides textarea ref and manages value state
function TestWrapper() {
  const [value, setValue] = useState('/');
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [closed, setClosed] = useState(false);

  return (
    <>
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        data-testid="test-textarea"
      />
      {!closed && (
        <SlashCommandPalette
          textareaRef={taRef}
          value={value}
          onChange={setValue}
          onClose={() => setClosed(true)}
        />
      )}
    </>
  );
}

describe('SlashCommandPalette', () => {
  it('should render when value starts with / and trigger conditions are met', () => {
    render(<TestWrapper />);
    const textarea = screen.getByTestId('test-textarea') as HTMLTextAreaElement;

    // Focus and position caret at end to trigger palette
    textarea.focus();
    textarea.setSelectionRange(1, 1);
    fireEvent.input(textarea, { target: { value: '/' } });

    // Should show all 6 commands
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('Remind')).toBeInTheDocument();
    expect(screen.getByText('Poll')).toBeInTheDocument();
    expect(screen.getByText('Code block')).toBeInTheDocument();
    expect(screen.getByText('Table')).toBeInTheDocument();
    expect(screen.getByText('Quote')).toBeInTheDocument();
    expect(screen.getByText('Divider')).toBeInTheDocument();
  });

  it('should filter commands by query', () => {
    render(<TestWrapper />);
    const textarea = screen.getByTestId('test-textarea') as HTMLTextAreaElement;

    textarea.focus();
    textarea.setSelectionRange(2, 2);
    fireEvent.input(textarea, { target: { value: '/po' } });

    // Should show only Poll
    expect(screen.getByText('Poll')).toBeInTheDocument();
    expect(screen.queryByText('Remind')).not.toBeInTheDocument();
    expect(screen.queryByText('Code block')).not.toBeInTheDocument();
  });

  it('should close when whitespace follows /', () => {
    render(<TestWrapper />);
    const textarea = screen.getByTestId('test-textarea') as HTMLTextAreaElement;

    textarea.focus();
    textarea.setSelectionRange(2, 2);
    fireEvent.input(textarea, { target: { value: '/ ' } });

    // Palette should not be visible
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('should insert command text on Enter', async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    const textarea = screen.getByTestId('test-textarea') as HTMLTextAreaElement;

    textarea.focus();
    textarea.setSelectionRange(1, 1);
    fireEvent.input(textarea, { target: { value: '/r' } });

    // Press Enter to select the first (highlighted) command
    await user.keyboard('{Enter}');

    // Should have inserted the command text
    expect(textarea.value).toMatch(/^\/remind/);
  });

  it('should navigate with arrow keys', async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    const textarea = screen.getByTestId('test-textarea') as HTMLTextAreaElement;

    textarea.focus();
    textarea.setSelectionRange(1, 1);
    fireEvent.input(textarea, { target: { value: '/' } });

    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeInTheDocument();

    const remindOption = screen.getByRole('option', { name: /Remind/ });
    const pollOption = screen.getByRole('option', { name: /Poll/ });

    // First option should be selected by default
    expect(remindOption).toHaveAttribute('aria-selected', 'true');
    expect(pollOption).toHaveAttribute('aria-selected', 'false');

    // Arrow down should move selection
    await user.keyboard('{ArrowDown}');
    expect(remindOption).toHaveAttribute('aria-selected', 'false');
    expect(pollOption).toHaveAttribute('aria-selected', 'true');

    // Arrow up should move back
    await user.keyboard('{ArrowUp}');
    expect(remindOption).toHaveAttribute('aria-selected', 'true');
  });

  it('should close on Escape', async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    const textarea = screen.getByTestId('test-textarea') as HTMLTextAreaElement;

    textarea.focus();
    textarea.setSelectionRange(1, 1);
    fireEvent.input(textarea, { target: { value: '/' } });

    expect(screen.getByRole('listbox')).toBeInTheDocument();

    // Press Escape
    await user.keyboard('{Escape}');

    // Palette should be gone
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
