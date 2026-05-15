/**
 * StageDrillDownDrawer — slide-in panel opened when a stage card is clicked.
 *
 * Contract (this test is the spec — implementation follows):
 *   - Renders nothing when stageValue is null (closed state)
 *   - Renders panel with data-testid="stage-drilldown-drawer" when open
 *   - Shows the stage label as a heading
 *   - Shows an AI summary region (data-testid="stage-ai-summary")
 *   - Shows a BR colour tree region (data-testid="stage-br-tree")
 *   - Shows a stage handoff SLA timeline (data-testid="stage-sla-timeline")
 *   - Shows an owner accountability footer (data-testid="stage-owner-footer")
 *   - Close button calls onClose
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { StageDrillDownDrawer } from './StageDrillDownDrawer';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/hooks/useAuth');
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

const BRS = [
  { id: 'br-1', title: 'Improve onboarding', process_step: 'discovery', assignee_id: 'u1', assignee_name: 'Alice', entered_step_at: '2026-04-01T00:00:00Z' },
  { id: 'br-2', title: 'Revamp reporting',   process_step: 'discovery', assignee_id: 'u2', assignee_name: 'Bob',   entered_step_at: '2026-04-10T00:00:00Z' },
];

const mockBrsQuery = (rows = BRS) => {
  const isNull = vi.fn().mockResolvedValue({ data: rows, error: null });
  const eq = vi.fn().mockReturnValue({ is: isNull });
  const select = vi.fn().mockReturnValue({ eq });
  (supabase.from as any).mockReturnValue({ select });
};

describe('StageDrillDownDrawer', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (useAuth as any).mockReturnValue({ user: { id: 'u1' }, loading: false, isAuthenticated: true });
    mockBrsQuery();
  });

  it('renders nothing when stageValue is null', () => {
    const { container } = render(
      <StageDrillDownDrawer stageValue={null} stageLabel="" onClose={vi.fn()} />,
      { wrapper },
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the drawer panel when stageValue is set', async () => {
    render(
      <StageDrillDownDrawer stageValue="discovery" stageLabel="Discovery" onClose={vi.fn()} />,
      { wrapper },
    );
    expect(await screen.findByTestId('stage-drilldown-drawer')).toBeInTheDocument();
  });

  it('shows the stage label as a heading', async () => {
    render(
      <StageDrillDownDrawer stageValue="discovery" stageLabel="Discovery" onClose={vi.fn()} />,
      { wrapper },
    );
    expect(await screen.findByRole('heading', { name: /discovery/i })).toBeInTheDocument();
  });

  it('renders the AI summary region', async () => {
    render(
      <StageDrillDownDrawer stageValue="discovery" stageLabel="Discovery" onClose={vi.fn()} />,
      { wrapper },
    );
    expect(await screen.findByTestId('stage-ai-summary')).toBeInTheDocument();
  });

  it('renders the BR colour tree region', async () => {
    render(
      <StageDrillDownDrawer stageValue="discovery" stageLabel="Discovery" onClose={vi.fn()} />,
      { wrapper },
    );
    expect(await screen.findByTestId('stage-br-tree')).toBeInTheDocument();
  });

  it('renders the stage handoff SLA timeline', async () => {
    render(
      <StageDrillDownDrawer stageValue="discovery" stageLabel="Discovery" onClose={vi.fn()} />,
      { wrapper },
    );
    expect(await screen.findByTestId('stage-sla-timeline')).toBeInTheDocument();
  });

  it('renders the owner accountability footer', async () => {
    render(
      <StageDrillDownDrawer stageValue="discovery" stageLabel="Discovery" onClose={vi.fn()} />,
      { wrapper },
    );
    expect(await screen.findByTestId('stage-owner-footer')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn();
    render(
      <StageDrillDownDrawer stageValue="discovery" stageLabel="Discovery" onClose={onClose} />,
      { wrapper },
    );
    await screen.findByTestId('stage-drilldown-drawer');
    await userEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
