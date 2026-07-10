import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { HealthStatusBadge } from '../HealthStatusBadge';
import type { BusinessRequestHealth } from '@/types/date-pulse';

// NOTE: HealthStatusBadge was refactored (ba9715bed "simplify health components") to render its
// own dot + friendly-label + subtitle markup directly instead of delegating to
// CatalystStatusPill, and the onClick prop is no longer wired to any click handler (the wrapper
// is a non-interactive `role="button"` used only for tooltip anchoring, with a `cursor: default`
// styling — clicking does nothing and Enter/Space are explicitly prevented). The assertions below
// were written against the pre-refactor contract; they're updated here to match current behavior.

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
    expect(screen.getByRole('button')).toBeDefined();
  });

  it('shows the friendly label for the health_status', () => {
    render(React.createElement(HealthStatusBadge, { health: makeHealth({ health_status: 'On Track' }) }));
    expect(screen.getByRole('button')).toHaveTextContent('On schedule');
  });

  it('does not throw when clicked (wrapper is a non-interactive tooltip anchor)', () => {
    const onClick = vi.fn();
    render(React.createElement(HealthStatusBadge, { health: makeHealth(), onClick }));
    expect(() => fireEvent.click(screen.getByRole('button'))).not.toThrow();
  });

  it('renders a button wrapper with transparent background', () => {
    render(React.createElement(HealthStatusBadge, { health: makeHealth() }));
    const btn = screen.getByRole('button');
    expect(btn.style.background).toBe('transparent');
  });

  it('all 7 health states render without error', () => {
    const states = ['Uncommitted', 'Committed', 'On Track', 'Delayed', 'At Risk', 'Blocked', 'Delivered'] as const;
    const friendlyLabels: Record<string, string> = {
      Uncommitted: 'Not planned',
      Committed: 'Plan in place',
      'On Track': 'On schedule',
      Delayed: 'Behind schedule',
      'At Risk': 'At risk',
      Blocked: 'Blocked',
      Delivered: 'Delivered',
    };
    for (const state of states) {
      const { unmount } = render(
        React.createElement(HealthStatusBadge, { health: makeHealth({ health_status: state }) }),
      );
      expect(screen.getByRole('button')).toHaveTextContent(friendlyLabels[state]);
      unmount();
    }
  });
});
