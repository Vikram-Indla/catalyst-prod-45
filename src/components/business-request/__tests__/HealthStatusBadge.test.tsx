import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { HealthStatusBadge } from '../HealthStatusBadge';
import type { BusinessRequestHealth } from '@/types/date-pulse';

// CatalystStatusPill renders the status string — stub it
vi.mock('@/components/catalyst-detail-views/shared/sections/CatalystStatusPill', () => ({
  CatalystStatusPill: ({ status }: { status: string }) =>
    React.createElement('span', { 'data-testid': 'status-pill' }, status),
}));

function makeHealth(overrides: Partial<BusinessRequestHealth> = {}): BusinessRequestHealth {
  return {
    health_status: 'Uncommitted',
    health_severity: 'neutral',
    health_summary: '0 violations · 0 linked items',
    health_descriptor: 'No target date or linked work set.',
    linked_work_count: 0,
    linked_work_with_dates_count: 0,
    in_progress_count: 0,
    done_count: 0,
    open_blockers_count: 0,
    br_target_date: null,
    br_end_date: null,
    release_target_date: null,
    earliest_story_due: null,
    latest_story_due: null,
    days_to_deadline: 0,
    is_overdue: false,
    is_urgent: false,
    date_pulse_violations: [],
    violation_count: 0,
    critical_violation_count: 0,
    evaluated_at: '2026-06-19T00:00:00Z',
    evaluation_duration_ms: 10,
    ...overrides,
  };
}

describe('HealthStatusBadge', () => {
  it('renders without crashing', () => {
    render(React.createElement(HealthStatusBadge, { health: makeHealth() }));
    expect(screen.getByTestId('status-pill')).toBeDefined();
  });

  it('shows the health_status text via CatalystStatusPill', () => {
    render(React.createElement(HealthStatusBadge, { health: makeHealth({ health_status: 'On Track' }) }));
    expect(screen.getByTestId('status-pill').textContent).toBe('On Track');
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(React.createElement(HealthStatusBadge, { health: makeHealth(), onClick }));
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders a button wrapper with transparent background', () => {
    render(React.createElement(HealthStatusBadge, { health: makeHealth() }));
    const btn = screen.getByRole('button');
    expect(btn.style.background).toBe('transparent');
  });

  it('all 7 health states render without error', () => {
    const states = ['Uncommitted', 'Committed', 'On Track', 'Delayed', 'At Risk', 'Blocked', 'Delivered'] as const;
    for (const state of states) {
      const { unmount } = render(
        React.createElement(HealthStatusBadge, { health: makeHealth({ health_status: state }) }),
      );
      expect(screen.getByTestId('status-pill').textContent).toBe(state);
      unmount();
    }
  });
});
