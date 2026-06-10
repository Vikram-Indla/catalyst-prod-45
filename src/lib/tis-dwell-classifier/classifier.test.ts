/**
 * classifyDwell — rule-based classifier that diagnoses WHY a ticket has
 * been stuck in a status. Returns one of 5 patterns + confidence.
 *
 * Phase 4 row 6 — Catalyst outlier #5. No competitor exposes named
 * dwell pathologies; they all show raw counts ("5 reassignments").
 * This converts data into diagnosis.
 *
 * Patterns:
 *   ping_pong       — N reassignments ≥ 2 AND returned to original assignee
 *   pl_gap          — assignee inactive > 5d during dwell, then returned
 *   spec_rewrite    — description edited mid-dwell + reassigned
 *   external_dep    — linked external issue open + no internal activity
 *   silent          — 0 comments + 0 transitions + duration > P50 hours
 *   none            — nothing matched
 */
import { describe, it, expect } from 'vitest';
import { classifyDwell, type DwellEvent, type DwellInput } from './classifier';

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

function evt(partial: Partial<DwellEvent>): DwellEvent {
  return {
    field: partial.field ?? 'status',
    from_display: partial.from_display ?? null,
    to_display: partial.to_display ?? null,
    actor_name: partial.actor_name ?? 'Vikram',
    changed_at: partial.changed_at ?? new Date(Date.now()).toISOString(),
  };
}

describe('classifyDwell', () => {
  it('detects PING_PONG when ≥2 reassignments AND returned to original', () => {
    const events: DwellEvent[] = [
      evt({ field: 'assignee', from_display: null, to_display: 'Alice' }),
      evt({ field: 'assignee', from_display: 'Alice', to_display: 'Bob' }),
      evt({ field: 'assignee', from_display: 'Bob', to_display: 'Carol' }),
      evt({ field: 'assignee', from_display: 'Carol', to_display: 'Alice' }),
    ];
    const result = classifyDwell({ events, comments: [], links: [], durationMs: 10 * DAY, p50Hours: 192 });
    expect(result.pattern).toBe('ping_pong');
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('detects SILENT when no comments, no transitions, duration > P50', () => {
    const result = classifyDwell({ events: [], comments: [], links: [], durationMs: 30 * DAY, p50Hours: 192 });
    expect(result.pattern).toBe('silent');
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('detects EXTERNAL_DEP when linked external open + no internal activity', () => {
    const result = classifyDwell({
      events: [],
      comments: [],
      links: [{ type: 'blocked-by', external: true, resolved: false }],
      durationMs: 8 * DAY,
      p50Hours: 192,
    });
    expect(result.pattern).toBe('external_dep');
  });

  it('detects SPEC_REWRITE when description edited mid-dwell + reassigned', () => {
    const events: DwellEvent[] = [
      evt({ field: 'description', from_display: 'old', to_display: 'new' }),
      evt({ field: 'assignee', from_display: 'Alice', to_display: 'Bob' }),
    ];
    const result = classifyDwell({ events, comments: [], links: [], durationMs: 10 * DAY, p50Hours: 192 });
    expect(result.pattern).toBe('spec_rewrite');
  });

  it('detects PL_GAP when assignee inactive > 5d AND returned', () => {
    const now = Date.now();
    const events: DwellEvent[] = [
      evt({ field: 'assignee', from_display: 'Alice', to_display: 'Bob', changed_at: new Date(now - 8 * DAY).toISOString() }),
      evt({ field: 'assignee', from_display: 'Bob', to_display: 'Alice', changed_at: new Date(now - 1 * DAY).toISOString() }),
    ];
    const result = classifyDwell({
      events,
      comments: [],
      links: [],
      durationMs: 10 * DAY,
      p50Hours: 192,
      now: new Date(now),
    });
    expect(result.pattern).toBe('pl_gap');
  });

  it('returns NONE when no patterns match (healthy dwell)', () => {
    const events: DwellEvent[] = [
      evt({ field: 'status', to_display: 'In Design' }),
      evt({ field: 'comment', actor_name: 'Alice' }),
    ];
    const result = classifyDwell({ events, comments: [{ created_at: new Date().toISOString() }], links: [], durationMs: 3 * DAY, p50Hours: 192 });
    expect(result.pattern).toBe('none');
    expect(result.confidence).toBeLessThanOrEqual(0.5);
  });

  it('returns NONE when dwell short and no signals', () => {
    const result = classifyDwell({ events: [], comments: [], links: [], durationMs: 2 * HOUR, p50Hours: 192 });
    expect(result.pattern).toBe('none');
  });
});
