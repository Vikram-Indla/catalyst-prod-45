import { describe, it, expect } from 'vitest';
import { buildRenderList } from './MessageList';
import type { ChatMessage } from '@/types/chat';

const ME = 'user-me';
const OTHER = 'user-other';

function msg(id: string, authorId: string, createdAt: string): ChatMessage {
  return {
    id,
    conversationId: 'c1',
    parentId: null,
    authorId,
    authorName: authorId,
    authorAvatarUrl: null,
    bodyText: `body ${id}`,
    createdAt,
    editedAt: null,
    deletedAt: null,
    reactions: [],
    replyCount: 0,
  } as unknown as ChatMessage;
}

describe('buildRenderList unread divider', () => {
  const messages = [
    msg('m1', OTHER, '2026-07-04T10:00:00Z'),
    msg('m2', ME, '2026-07-04T10:05:00Z'),
    msg('m3', OTHER, '2026-07-04T10:10:00Z'),
    msg('m4', OTHER, '2026-07-04T10:11:00Z'),
  ];

  it('renders no divider without a watermark', () => {
    const out = buildRenderList(messages, null, ME);
    expect(out.some(i => i.kind === 'unread')).toBe(false);
  });

  it('places the divider before the first unread message from another author', () => {
    const out = buildRenderList(messages, '2026-07-04T10:06:00Z', ME);
    const idx = out.findIndex(i => i.kind === 'unread');
    expect(idx).toBeGreaterThan(-1);
    const next = out.slice(idx + 1).find(i => i.kind === 'message');
    expect(next?.message?.id).toBe('m3');
    // Exactly one divider even with multiple unread messages.
    expect(out.filter(i => i.kind === 'unread')).toHaveLength(1);
  });

  it('skips my own messages when anchoring the divider', () => {
    // Watermark before m2 (mine) — divider must anchor to m3, not m2.
    const out = buildRenderList(messages, '2026-07-04T10:02:00Z', ME);
    const idx = out.findIndex(i => i.kind === 'unread');
    const next = out.slice(idx + 1).find(i => i.kind === 'message');
    expect(next?.message?.id).toBe('m3');
  });

  it('renders no divider when everything unread is mine', () => {
    const mineOnly = [msg('a', ME, '2026-07-04T10:00:00Z'), msg('b', ME, '2026-07-04T10:10:00Z')];
    const out = buildRenderList(mineOnly, '2026-07-04T09:00:00Z', ME);
    expect(out.some(i => i.kind === 'unread')).toBe(false);
  });

  it('breaks author grouping at the divider', () => {
    const grouped = [
      msg('g1', OTHER, '2026-07-04T10:00:00Z'),
      msg('g2', OTHER, '2026-07-04T10:01:00Z'),
    ];
    const out = buildRenderList(grouped, '2026-07-04T10:00:30Z', ME);
    const g2 = out.find(i => i.kind === 'message' && i.message?.id === 'g2');
    expect(g2?.showHeader).toBe(true);
  });
});
