/**
 * ConversationSidebar — section grouping logic (pure unit tests).
 *
 * Covers the four section buckets:
 *   projects  = kind 'ticket'  OR  kind 'channel' with a projectKey
 *   channels  = kind 'custom_channel'  OR  kind 'channel' without a projectKey
 *   dms       = kind 'dm'  OR  kind 'group_dm'
 *   archived  = isArchived === true  (any kind)
 */

import { describe, it, expect } from 'vitest';
import { groupConversationsForTest } from '../components/sidebar/ConversationSidebar';
import type { ChatConversation } from '@/types/chat';

function makeConv(
  overrides: Partial<ChatConversation> & { id: string; kind: ChatConversation['kind'] },
): ChatConversation {
  return {
    ticketKey: null,
    ticketType: null,
    projectKey: null,
    projectName: null,
    title: `conv-${overrides.id}`,
    isArchived: false,
    unreadCount: 0,
    lastMessageAt: null,
    lastMessagePreview: null,
    ...overrides,
  };
}

describe('groupConversations — projects section', () => {
  it('kind=ticket → projects', () => {
    const convs = [makeConv({ id: '1', kind: 'ticket' })];
    const { projects } = groupConversationsForTest(convs);
    expect(projects).toHaveLength(1);
    expect(projects[0].id).toBe('1');
  });

  it('kind=channel with projectKey → projects', () => {
    const convs = [makeConv({ id: '2', kind: 'channel', projectKey: 'BAU' })];
    const { projects } = groupConversationsForTest(convs);
    expect(projects).toHaveLength(1);
  });

  it('kind=channel without projectKey → NOT projects', () => {
    const convs = [makeConv({ id: '3', kind: 'channel', projectKey: null })];
    const { projects } = groupConversationsForTest(convs);
    expect(projects).toHaveLength(0);
  });

  it('archived ticket → NOT in projects', () => {
    const convs = [makeConv({ id: '4', kind: 'ticket', isArchived: true })];
    const { projects } = groupConversationsForTest(convs);
    expect(projects).toHaveLength(0);
  });
});

describe('groupConversations — channels section', () => {
  it('kind=custom_channel → channels', () => {
    const convs = [makeConv({ id: '5', kind: 'custom_channel' })];
    const { channels } = groupConversationsForTest(convs);
    expect(channels).toHaveLength(1);
  });

  it('kind=channel without projectKey → channels', () => {
    const convs = [makeConv({ id: '6', kind: 'channel', projectKey: null })];
    const { channels } = groupConversationsForTest(convs);
    expect(channels).toHaveLength(1);
  });

  it('kind=channel with projectKey → NOT channels', () => {
    const convs = [makeConv({ id: '7', kind: 'channel', projectKey: 'BAU' })];
    const { channels } = groupConversationsForTest(convs);
    expect(channels).toHaveLength(0);
  });
});

describe('groupConversations — dms section', () => {
  it('kind=dm → dms', () => {
    const convs = [makeConv({ id: '8', kind: 'dm' })];
    const { dms } = groupConversationsForTest(convs);
    expect(dms).toHaveLength(1);
  });

  it('kind=group_dm → dms', () => {
    const convs = [makeConv({ id: '9', kind: 'group_dm' })];
    const { dms } = groupConversationsForTest(convs);
    expect(dms).toHaveLength(1);
  });

  it('archived dm → NOT in dms', () => {
    const convs = [makeConv({ id: '10', kind: 'dm', isArchived: true })];
    const { dms } = groupConversationsForTest(convs);
    expect(dms).toHaveLength(0);
  });
});

describe('groupConversations — archived section', () => {
  it('isArchived=true → archived regardless of kind', () => {
    const convs = [
      makeConv({ id: '11', kind: 'ticket',       isArchived: true }),
      makeConv({ id: '12', kind: 'dm',            isArchived: true }),
      makeConv({ id: '13', kind: 'custom_channel', isArchived: true }),
    ];
    const { archived } = groupConversationsForTest(convs);
    expect(archived).toHaveLength(3);
  });

  it('isArchived=false → NOT in archived', () => {
    const convs = [makeConv({ id: '14', kind: 'ticket', isArchived: false })];
    const { archived } = groupConversationsForTest(convs);
    expect(archived).toHaveLength(0);
  });
});

describe('groupConversations — mixed list', () => {
  it('routes each kind to the correct bucket', () => {
    const convs = [
      makeConv({ id: 'p1', kind: 'ticket' }),
      makeConv({ id: 'p2', kind: 'channel', projectKey: 'MWR' }),
      makeConv({ id: 'c1', kind: 'custom_channel' }),
      makeConv({ id: 'c2', kind: 'channel', projectKey: null }),
      makeConv({ id: 'd1', kind: 'dm' }),
      makeConv({ id: 'd2', kind: 'group_dm' }),
      makeConv({ id: 'a1', kind: 'ticket', isArchived: true }),
    ];
    const grouped = groupConversationsForTest(convs);
    expect(grouped.projects).toHaveLength(2);
    expect(grouped.channels).toHaveLength(2);
    expect(grouped.dms).toHaveLength(2);
    expect(grouped.archived).toHaveLength(1);
    // Sections are mutually exclusive for non-archived items
    const allActive = [...grouped.projects, ...grouped.channels, ...grouped.dms];
    expect(allActive).toHaveLength(6);
  });

  it('empty list → all sections empty', () => {
    const grouped = groupConversationsForTest([]);
    expect(grouped.projects).toHaveLength(0);
    expect(grouped.channels).toHaveLength(0);
    expect(grouped.dms).toHaveLength(0);
    expect(grouped.archived).toHaveLength(0);
  });
});
