import { describe, it, expect } from 'vitest';
import { computeSeenCaption, type SeenMemberLike, type SeenMessageLike } from './seenReceipts';

const ME = 'user-me';
const OTHER = 'user-other';
const THIRD = 'user-third';

function msg(id: string, authorId: string, createdAt: string, extra: Partial<SeenMessageLike> = {}): SeenMessageLike {
  return { id, authorId, createdAt, ...extra };
}

function member(userId: string, lastReadAt: string | null): SeenMemberLike {
  return { userId, lastReadAt };
}

describe('computeSeenCaption', () => {
  const myLast = msg('m2', ME, '2026-07-04T10:05:00Z');
  const dmMessages = [msg('m1', OTHER, '2026-07-04T10:00:00Z'), myLast];

  it('dm: returns "Seen" when the other member read at/after my last message', () => {
    const out = computeSeenCaption(
      dmMessages,
      [member(ME, '2026-07-04T11:00:00Z'), member(OTHER, '2026-07-04T10:05:00Z')],
      ME,
      'dm',
    );
    expect(out).toEqual({ messageId: 'm2', text: 'Seen' });
  });

  it('dm: returns null when the other member has not read it (no "Delivered" fabrication)', () => {
    const out = computeSeenCaption(
      dmMessages,
      [member(ME, '2026-07-04T11:00:00Z'), member(OTHER, '2026-07-04T10:04:59Z')],
      ME,
      'dm',
    );
    expect(out).toBeNull();
  });

  it('dm: returns null when the other member lastReadAt is null', () => {
    const out = computeSeenCaption(dmMessages, [member(ME, null), member(OTHER, null)], ME, 'dm');
    expect(out).toBeNull();
  });

  it('ignores my own lastReadAt entirely', () => {
    // Only my membership row has a read watermark — must not count as "seen".
    const out = computeSeenCaption(
      dmMessages,
      [member(ME, '2026-07-04T12:00:00Z'), member(OTHER, null)],
      ME,
      'dm',
    );
    expect(out).toBeNull();
  });

  it('group_dm: counts only OTHER members who read it', () => {
    const out = computeSeenCaption(
      dmMessages,
      [
        member(ME, '2026-07-04T12:00:00Z'),
        member(OTHER, '2026-07-04T10:06:00Z'),
        member(THIRD, '2026-07-04T10:00:00Z'), // read before my message — not counted
      ],
      ME,
      'group_dm',
    );
    expect(out).toEqual({ messageId: 'm2', text: 'Seen by 1' });
  });

  it('group_dm: counts multiple readers', () => {
    const out = computeSeenCaption(
      dmMessages,
      [
        member(ME, null),
        member(OTHER, '2026-07-04T10:05:00Z'),
        member(THIRD, '2026-07-04T10:07:00Z'),
      ],
      ME,
      'group_dm',
    );
    expect(out).toEqual({ messageId: 'm2', text: 'Seen by 2' });
  });

  it('group_dm: hidden when zero others have read it', () => {
    const out = computeSeenCaption(
      dmMessages,
      [member(ME, '2026-07-04T12:00:00Z'), member(OTHER, null), member(THIRD, null)],
      ME,
      'group_dm',
    );
    expect(out).toBeNull();
  });

  it('returns null when the last message is not mine', () => {
    const messages = [...dmMessages, msg('m3', OTHER, '2026-07-04T10:10:00Z')];
    const out = computeSeenCaption(
      messages,
      [member(ME, null), member(OTHER, '2026-07-04T11:00:00Z')],
      ME,
      'dm',
    );
    expect(out).toBeNull();
  });

  it('skips trailing event rows when resolving the last message', () => {
    const messages = [...dmMessages, msg('e1', OTHER, '2026-07-04T10:15:00Z', { eventType: 'huddle_summary' })];
    const out = computeSeenCaption(
      messages,
      [member(ME, null), member(OTHER, '2026-07-04T10:06:00Z')],
      ME,
      'dm',
    );
    expect(out).toEqual({ messageId: 'm2', text: 'Seen' });
  });

  it('channel / custom_channel show "Read by N"; ticket shows nothing', () => {
    const readAll = [member(ME, null), member(OTHER, '2026-07-04T11:00:00Z')];
    expect(computeSeenCaption(dmMessages, readAll, ME, 'channel')).toEqual({ messageId: 'm2', text: 'Read by 1' });
    expect(computeSeenCaption(dmMessages, readAll, ME, 'custom_channel')).toEqual({ messageId: 'm2', text: 'Read by 1' });
    expect(computeSeenCaption(dmMessages, readAll, ME, 'ticket')).toBeNull();
  });

  it('channel: hidden when nobody else has read it', () => {
    const noneRead = [member(ME, '2026-07-04T12:00:00Z'), member(OTHER, null)];
    expect(computeSeenCaption(dmMessages, noneRead, ME, 'channel')).toBeNull();
  });

  it('returns null without a current user or with empty messages', () => {
    const readAll = [member(OTHER, '2026-07-04T11:00:00Z')];
    expect(computeSeenCaption(dmMessages, readAll, null, 'dm')).toBeNull();
    expect(computeSeenCaption([], readAll, ME, 'dm')).toBeNull();
  });
});
