/**
 * BrPostMortemModal — AI-generated post-mortem for a completed BR.
 *
 * Contract (this test is the spec — implementation follows):
 *   - Accepts: brId, brTitle, onClose
 *   - Renders nothing when brId is null
 *   - Renders modal with data-testid="postmortem-modal" when brId is set
 *   - Shows the BR title as the modal heading
 *   - Shows loading state (data-testid="postmortem-loading") while fetching
 *   - Shows generated content in data-testid="postmortem-content" after load
 *   - Shows error state (data-testid="postmortem-error") on fetch failure
 *   - Close button calls onClose
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { BrPostMortemModal } from './BrPostMortemModal';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

const POSTMORTEM = {
  summary: 'The initiative delivered on time with minor scope adjustments.',
  timeline: '8 weeks from funnel to done.',
  lessons: ['Earlier stakeholder alignment reduces rework.'],
};

const mockInvoke = () => supabase.functions.invoke as ReturnType<typeof vi.fn>;

describe('BrPostMortemModal', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders nothing when brId is null', () => {
    const { container } = render(
      <BrPostMortemModal brId={null} brTitle="" onClose={vi.fn()} />,
      { wrapper },
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the modal when brId is provided', async () => {
    mockInvoke().mockResolvedValueOnce({ data: POSTMORTEM, error: null });

    render(
      <BrPostMortemModal brId="br-1" brTitle="Improve onboarding" onClose={vi.fn()} />,
      { wrapper },
    );
    expect(await screen.findByTestId('postmortem-modal')).toBeInTheDocument();
  });

  it('shows the BR title as heading', async () => {
    mockInvoke().mockResolvedValueOnce({ data: POSTMORTEM, error: null });

    render(
      <BrPostMortemModal brId="br-1" brTitle="Improve onboarding" onClose={vi.fn()} />,
      { wrapper },
    );
    expect(await screen.findByRole('heading', { name: /improve onboarding/i })).toBeInTheDocument();
  });

  it('shows loading state while fetching', () => {
    mockInvoke().mockReturnValueOnce(new Promise(() => {})); // never resolves

    render(
      <BrPostMortemModal brId="br-1" brTitle="Improve onboarding" onClose={vi.fn()} />,
      { wrapper },
    );
    expect(screen.getByTestId('postmortem-loading')).toBeInTheDocument();
  });

  it('shows generated content after successful fetch', async () => {
    mockInvoke().mockResolvedValueOnce({ data: POSTMORTEM, error: null });

    render(
      <BrPostMortemModal brId="br-1" brTitle="Improve onboarding" onClose={vi.fn()} />,
      { wrapper },
    );

    await waitFor(() =>
      expect(screen.getByTestId('postmortem-content')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('postmortem-content')).toHaveTextContent(POSTMORTEM.summary);
  });

  it('shows error state on fetch failure', async () => {
    mockInvoke().mockResolvedValueOnce({ data: null, error: new Error('Edge function error') });

    render(
      <BrPostMortemModal brId="br-1" brTitle="Improve onboarding" onClose={vi.fn()} />,
      { wrapper },
    );

    await waitFor(() =>
      expect(screen.getByTestId('postmortem-error')).toBeInTheDocument(),
    );
  });

  it('calls onClose when the close button is clicked', async () => {
    mockInvoke().mockResolvedValueOnce({ data: POSTMORTEM, error: null });
    const onClose = vi.fn();

    render(
      <BrPostMortemModal brId="br-1" brTitle="Improve onboarding" onClose={onClose} />,
      { wrapper },
    );

    await screen.findByTestId('postmortem-modal');
    await userEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
