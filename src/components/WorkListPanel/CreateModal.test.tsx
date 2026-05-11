/**
 * CreateModal — Issue creation dialog (F1.10)
 *
 * Contract:
 *   - Renders with type selector and form (when type selected)
 *   - Closes on cancel
 *   - Submits issue with selected type + form data
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateModal } from './CreateModal';

describe('CreateModal', () => {
  const renderWithQuery = (component: React.ReactElement) => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return render(
      <QueryClientProvider client={qc}>{component}</QueryClientProvider>
    );
  };

  it('renders type selector initially', () => {
    renderWithQuery(
      <CreateModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />
    );
    expect(screen.getByText(/select type/i)).toBeInTheDocument();
  });

  it('shows form after type is selected', () => {
    renderWithQuery(
      <CreateModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />
    );
    const typeButton = screen.getByRole('button', { name: /select type/i });
    fireEvent.click(typeButton);

    const storyOption = screen.getByText('Story');
    fireEvent.click(storyOption);

    expect(screen.getByPlaceholderText(/summary/i)).toBeInTheDocument();
  });

  it('closes modal on cancel', () => {
    const onClose = vi.fn();
    renderWithQuery(
      <CreateModal isOpen={true} onClose={onClose} onSubmit={vi.fn()} />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('calls onSubmit with type and form data', () => {
    const onSubmit = vi.fn();
    renderWithQuery(
      <CreateModal isOpen={true} onClose={vi.fn()} onSubmit={onSubmit} />
    );

    const typeButton = screen.getByRole('button', { name: /select type/i });
    fireEvent.click(typeButton);
    const storyOption = screen.getByText('Story');
    fireEvent.click(storyOption);

    const summaryInput = screen.getByPlaceholderText(/summary/i);
    fireEvent.change(summaryInput, { target: { value: 'Test story' } });

    const submitButton = screen.getByRole('button', { name: /create/i });
    fireEvent.click(submitButton);

    expect(onSubmit).toHaveBeenCalledWith({
      issueType: 'Story',
      summary: 'Test story',
      description: '',
    });
  });

  it('does not render when isOpen is false', () => {
    const { container } = renderWithQuery(
      <CreateModal isOpen={false} onClose={vi.fn()} onSubmit={vi.fn()} />
    );

    expect(
      container.querySelector('[data-testid="create-modal"]')
    ).not.toBeInTheDocument();
  });
});
