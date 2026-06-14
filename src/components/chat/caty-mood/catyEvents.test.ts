import { describe, it, expect } from 'vitest';
import {
  classifyEvent,
  refineKind,
  summarizeUnseen,
  unseenCount,
  gestureFor,
  buildEventLine,
  type CatyEvent,
} from './catyEvents';

const ev = (p: Partial<CatyEvent>): CatyEvent => ({
  id: 'x',
  kind: 'assignment',
  entityKey: 'BAU-1',
  entityTitle: null,
  actorName: null,
  createdAt: '2026-06-14',
  seen: false,
  ...p,
});

describe('classifyEvent — real notification_type values', () => {
  it('maps assignment family', () => {
    for (const t of ['assigned', 'assigned_story', 'assigned_work_item', 'reassigned_work_item'])
      expect(classifyEvent(t)).toBe('assignment');
  });
  it('maps status / mention / due', () => {
    expect(classifyEvent('status_changed')).toBe('status');
    expect(classifyEvent('mentioned_in_comment')).toBe('mention');
    expect(classifyEvent('chat_mention')).toBe('mention');
    expect(classifyEvent('due_date_approaching')).toBe('due');
  });
  it('unknown → other', () => {
    expect(classifyEvent('created_work_item')).toBe('other');
    expect(classifyEvent(null)).toBe('other');
  });
});

describe('refineKind — incident escalation', () => {
  it('escalates assignment/status on incident entities', () => {
    expect(refineKind('assignment', 'Production Incident')).toBe('incident');
    expect(refineKind('status', 'Production Incident')).toBe('incident');
  });
  it('leaves non-incident entities and mentions alone', () => {
    expect(refineKind('assignment', 'Story')).toBe('assignment');
    expect(refineKind('mention', 'Production Incident')).toBe('mention');
  });
});

describe('summarise + count unseen', () => {
  const events = [
    ev({ kind: 'assignment', seen: false }),
    ev({ kind: 'assignment', seen: true }),
    ev({ kind: 'incident', seen: false }),
    ev({ kind: 'mention', seen: false }),
  ];
  it('counts only unseen by kind', () => {
    const s = summarizeUnseen(events);
    expect(s.assignment).toBe(1);
    expect(s.incident).toBe(1);
    expect(s.mention).toBe(1);
  });
  it('unseenCount totals unseen', () => {
    expect(unseenCount(events)).toBe(3);
  });
});

describe('gestureFor — one gesture per kind', () => {
  it('maps each kind to a class id', () => {
    expect(gestureFor('assignment')).toBe('cmf-perk');
    expect(gestureFor('incident')).toBe('cmf-snap');
    expect(gestureFor('other')).toBe('');
  });
});

describe('buildEventLine — fact-only summary', () => {
  it('summarises unseen events', () => {
    const line = buildEventLine([ev({ kind: 'incident' }), ev({ kind: 'assignment' })]);
    expect(line).toContain('1 incident');
    expect(line).toContain('1 new');
  });
  it('says nothing new when all seen', () => {
    expect(buildEventLine([ev({ seen: true })])).toBe('nothing new');
  });
});
