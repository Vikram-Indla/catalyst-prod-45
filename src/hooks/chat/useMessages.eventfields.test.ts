import { describe, it, expect } from 'vitest';
import type { ChatMessage } from '@/types/chat';

// Mirrors the mapping added in useMessages.fetchPage. Kept as a pure helper so
// the event-field plumbing is unit-testable without a live Supabase.
export function mapEventFields(row: { event_type?: string | null; event_meta?: unknown }): Pick<ChatMessage, 'eventType' | 'eventMeta'> {
  return {
    eventType: row.event_type ?? null,
    eventMeta: (row.event_meta as Record<string, unknown> | null) ?? null,
  };
}

describe('message event fields', () => {
  it('surfaces huddle_summary event_type + meta', () => {
    const out = mapEventFields({ event_type: 'huddle_summary', event_meta: { duration_seconds: 62 } });
    expect(out.eventType).toBe('huddle_summary');
    expect(out.eventMeta).toEqual({ duration_seconds: 62 });
  });
  it('normal rows map to null', () => {
    const out = mapEventFields({});
    expect(out.eventType).toBeNull();
    expect(out.eventMeta).toBeNull();
  });
});
