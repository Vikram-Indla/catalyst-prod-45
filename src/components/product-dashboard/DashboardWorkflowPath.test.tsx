/**
 * DashboardWorkflowPath — thin horizontal stepper showing active demand process steps.
 *
 * Contract (this test is the spec — implementation follows):
 *   - Renders a list of active steps in sort_order via useActiveDemandProcessSteps
 *   - Each step is accessible by its label text
 *   - Shows a loading skeleton while steps are loading
 *   - Shows nothing (empty) when steps array is empty
 *   - Uses role="list" / role="listitem" for accessibility
 *   - Step count label reflects actual number of steps (e.g. "9 stages")
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { DashboardWorkflowPath } from './DashboardWorkflowPath';
import { useActiveDemandProcessSteps } from '@/hooks/useDemandProcessSteps';

vi.mock('@/hooks/useDemandProcessSteps');

const STEPS = [
  { id: '1', value: 'funnel', label: 'Funnel', sort_order: 1, is_active: true, color: null, created_at: '', updated_at: '' },
  { id: '2', value: 'discovery', label: 'Discovery', sort_order: 2, is_active: true, color: '#5243AA', created_at: '', updated_at: '' },
  { id: '3', value: 'design', label: 'Design', sort_order: 3, is_active: true, color: null, created_at: '', updated_at: '' },
  { id: '4', value: 'done', label: 'Done', sort_order: 11, is_active: true, color: '#00875A', created_at: '', updated_at: '' },
];

describe('DashboardWorkflowPath', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders all active steps as a list', () => {
    (useActiveDemandProcessSteps as any).mockReturnValue({ data: STEPS, isLoading: false });

    render(<DashboardWorkflowPath />);

    const list = screen.getByRole('list');
    expect(list).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(STEPS.length);
  });

  it('shows each step label', () => {
    (useActiveDemandProcessSteps as any).mockReturnValue({ data: STEPS, isLoading: false });

    render(<DashboardWorkflowPath />);

    expect(screen.getByText('Funnel')).toBeInTheDocument();
    expect(screen.getByText('Discovery')).toBeInTheDocument();
    expect(screen.getByText('Design')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('renders nothing when steps array is empty', () => {
    (useActiveDemandProcessSteps as any).mockReturnValue({ data: [], isLoading: false });

    const { container } = render(<DashboardWorkflowPath />);

    expect(container.firstChild).toBeNull();
  });

  it('renders a loading skeleton while steps are loading', () => {
    (useActiveDemandProcessSteps as any).mockReturnValue({ data: undefined, isLoading: true });

    render(<DashboardWorkflowPath />);

    expect(screen.getByTestId('workflow-path-skeleton')).toBeInTheDocument();
  });

  it('shows the stage count', () => {
    (useActiveDemandProcessSteps as any).mockReturnValue({ data: STEPS, isLoading: false });

    render(<DashboardWorkflowPath />);

    expect(screen.getByText(`${STEPS.length} stages`)).toBeInTheDocument();
  });

  it('renders steps in sort_order (ascending)', () => {
    const shuffled = [STEPS[3], STEPS[1], STEPS[0], STEPS[2]];
    (useActiveDemandProcessSteps as any).mockReturnValue({ data: shuffled, isLoading: false });

    render(<DashboardWorkflowPath />);

    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Funnel');
    expect(items[1]).toHaveTextContent('Discovery');
    expect(items[2]).toHaveTextContent('Design');
    expect(items[3]).toHaveTextContent('Done');
  });
});
