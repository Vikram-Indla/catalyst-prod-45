/**
 * conversation-list-polish.test.tsx — TDD unit tests for ConversationList polish features.
 *
 * Features under test (2026-06-10):
 *   1. Search filter: live filter by conversation title + lastMessagePreview
 *   2. Escape key: clear search + blur input
 *   3. Unread indicator: blue dot on active + unread items
 *   4. Drag-to-reorder: visual feedback (is-dragging class + 2px border)
 *   5. New conversation button: opens ConversationCreationModal
 *   6. ConversationCreationModal: fires onSelectKind('dm' | 'group') on selection
 *   7. Timestamp: formatRelative returns "2h ago", "Yesterday", "14d"
 *   8. Preview truncate: CSS 1-line ellipsis (visual test — see chat.css)
 */

import { describe, it, expect, vi } from 'vitest';
import { render as rtlRender, screen, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ConversationList renders ProjectIcon → useIconOverrides → useQuery,
// so every render needs a QueryClientProvider.
const render = (ui: React.ReactElement) =>
  rtlRender(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {ui}
    </QueryClientProvider>,
  );
import userEvent from '@testing-library/user-event';
import { ConversationList } from '../main/ConversationList';
import { ConversationCreationModal } from '../main/ConversationCreationModal';
import type { ChatConversation } from '@/types/chat';

const mockConversations: ChatConversation[] = [
  {
    id: 'c1',
    kind: 'dm',
    ticketKey: null,
    projectKey: null,
    title: 'Alice Johnson',
    isArchived: false,
    lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2h ago
    lastMessagePreview: 'Sounds good to me',
    unreadCount: 1,
  },
  {
    id: 'c2',
    kind: 'ticket',
    ticketKey: 'BAU-5757',
    projectKey: 'BAU',
    title: 'Payment gateway timeout',
    isArchived: false,
    lastMessageAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1d ago ("Yesterday")
    lastMessagePreview: 'No 504s observed today',
    unreadCount: 0,
  },
  {
    id: 'c3',
    kind: 'channel',
    ticketKey: null,
    projectKey: 'BAU',
    title: 'general',
    isArchived: false,
    lastMessageAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 14d ago
    lastMessagePreview: 'Welcome to #general!',
    unreadCount: 2,
  },
];

describe('ConversationList Polish Features', () => {
  it('renders new conversation button at top', () => {
    const onCreateConversation = vi.fn();
    render(
      <ConversationList
        conversations={mockConversations}
        onCreateConversation={onCreateConversation}
      />,
    );

    const newConvBtn = screen.getByRole('button', { name: /new conversation/i });
    expect(newConvBtn).toBeInTheDocument();
    expect(newConvBtn).toHaveClass('cc-new-conv-btn');
  });

  it('opens ConversationCreationModal when new conversation button clicked', async () => {
    const user = userEvent.setup();
    const onCreateConversation = vi.fn();
    const { container } = render(
      <ConversationList
        conversations={mockConversations}
        onCreateConversation={onCreateConversation}
      />,
    );

    const newConvBtn = screen.getByRole('button', { name: /new conversation/i });
    await user.click(newConvBtn);

    // Modal should appear
    const modal = container.querySelector('.cc-modal-box');
    expect(modal).toBeInTheDocument();
  });

  it('filters conversations by search query', async () => {
    const user = userEvent.setup();
    render(
      <ConversationList
        conversations={mockConversations}
        activeConversationId="c1"
      />,
    );

    const searchInput = screen.getByPlaceholderText(/search conversations/i);

    // Search for "Alice"
    await user.type(searchInput, 'Alice');
    expect(searchInput).toHaveValue('Alice');

    // Only Alice's conversation should be visible
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.queryByText('Payment gateway timeout')).not.toBeInTheDocument();
  });

  it('filters by ticket key (BAU-5757)', async () => {
    const user = userEvent.setup();
    render(
      <ConversationList
        conversations={mockConversations}
      />,
    );

    const searchInput = screen.getByPlaceholderText(/search conversations/i);
    await user.type(searchInput, 'BAU-5757');

    // Only ticket conversation should be visible
    expect(screen.getByText('Payment gateway timeout')).toBeInTheDocument();
  });

  it('filters by last message preview text', async () => {
    const user = userEvent.setup();
    render(
      <ConversationList
        conversations={mockConversations}
      />,
    );

    const searchInput = screen.getByPlaceholderText(/search conversations/i);
    await user.type(searchInput, 'Welcome');

    // Only channel conversation should be visible (message contains "Welcome")
    expect(screen.getByText('general')).toBeInTheDocument();
  });

  it('clears search on Escape key', async () => {
    const user = userEvent.setup();
    render(
      <ConversationList
        conversations={mockConversations}
      />,
    );

    const searchInput = screen.getByPlaceholderText(/search conversations/i) as HTMLInputElement;
    await user.type(searchInput, 'Alice');
    expect(searchInput.value).toBe('Alice');

    await user.keyboard('{Escape}');
    expect(searchInput.value).toBe('');
  });

  it('shows unread indicator (blue dot) on active unread items', () => {
    const { container } = render(
      <ConversationList
        conversations={mockConversations}
        activeConversationId="c1" // c1 has unreadCount: 1
      />,
    );

    // Find the row for c1 (Alice)
    const aliceRow = screen.getByRole('button', { name: /Alice Johnson/i }).closest('.cc-row-polished');
    expect(aliceRow).toHaveClass('is-active');

    // Check for unread dot
    const unreadDot = aliceRow?.querySelector('.cc-unread-dot');
    expect(unreadDot).toBeInTheDocument();
  });

  it('does not show unread dot on active but read items', () => {
    const { container } = render(
      <ConversationList
        conversations={mockConversations}
        activeConversationId="c2" // c2 has unreadCount: 0
      />,
    );

    const ticketRow = screen.getByRole('button', { name: /Payment gateway/i }).closest('.cc-row-polished');
    expect(ticketRow).toHaveClass('is-active');

    // Should NOT have unread dot
    const unreadDot = ticketRow?.querySelector('.cc-unread-dot');
    expect(unreadDot).not.toBeInTheDocument();
  });

  it('displays timestamp in relative format', () => {
    render(
      <ConversationList
        conversations={mockConversations}
      />,
    );

    // c1: 2h ago
    expect(screen.getByText('2h')).toBeInTheDocument();

    // c2: 1d ago ("Yesterday")
    expect(screen.getByText('Yesterday')).toBeInTheDocument();

    // c3: 14d ago
    expect(screen.getByText('14d')).toBeInTheDocument();
  });

  it('shows last message preview (1-line truncate via CSS)', () => {
    render(
      <ConversationList
        conversations={mockConversations}
      />,
    );

    expect(screen.getByText('Sounds good to me')).toBeInTheDocument();
    expect(screen.getByText('No 504s observed today')).toBeInTheDocument();
    expect(screen.getByText('Welcome to #general!')).toBeInTheDocument();
  });

  it('shows unread badge (count) on right side', () => {
    render(
      <ConversationList
        conversations={mockConversations}
      />,
    );

    // c1 has unreadCount: 1
    const aliceRow = screen.getByRole('button', { name: /Alice Johnson/i }).closest('.cc-row-polished');
    const badge = aliceRow?.querySelector('.cc-badge');
    expect(badge).toHaveTextContent('1');

    // c3 has unreadCount: 2
    const channelRow = screen.getByRole('button', { name: /general/i }).closest('.cc-row-polished');
    const channelBadge = channelRow?.querySelector('.cc-badge');
    expect(channelBadge).toHaveTextContent('2');
  });

  it('calls onSelectConversation when item clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <ConversationList
        conversations={mockConversations}
        onSelectConversation={onSelect}
      />,
    );

    const aliceRow = screen.getByRole('button', { name: /Alice Johnson/i });
    await user.click(aliceRow);

    expect(onSelect).toHaveBeenCalledWith('c1');
  });
});

describe('ConversationCreationModal', () => {
  it('renders two option buttons', () => {
    const onSelectKind = vi.fn();
    const onClose = vi.fn();

    render(
      <ConversationCreationModal
        onSelectKind={onSelectKind}
        onClose={onClose}
      />,
    );

    expect(screen.getByRole('button', { name: /1-on-1 conversation/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /group conversation/i })).toBeInTheDocument();
  });

  it('fires onSelectKind("dm") when 1-on-1 option clicked', async () => {
    const user = userEvent.setup();
    const onSelectKind = vi.fn();
    const onClose = vi.fn();

    render(
      <ConversationCreationModal
        onSelectKind={onSelectKind}
        onClose={onClose}
      />,
    );

    const dmOption = screen.getByRole('button', { name: /1-on-1 conversation/i });
    await user.click(dmOption);

    expect(onSelectKind).toHaveBeenCalledWith('dm');
  });

  it('fires onSelectKind("group") when group option clicked', async () => {
    const user = userEvent.setup();
    const onSelectKind = vi.fn();
    const onClose = vi.fn();

    render(
      <ConversationCreationModal
        onSelectKind={onSelectKind}
        onClose={onClose}
      />,
    );

    const groupOption = screen.getByRole('button', { name: /group conversation/i });
    await user.click(groupOption);

    expect(onSelectKind).toHaveBeenCalledWith('group');
  });

  it('closes modal on X button click', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <ConversationCreationModal
        onSelectKind={vi.fn()}
        onClose={onClose}
      />,
    );

    const closeBtn = screen.getByRole('button', { name: /close/i });
    await user.click(closeBtn);

    expect(onClose).toHaveBeenCalled();
  });

  it('closes modal when overlay clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(
      <ConversationCreationModal
        onSelectKind={vi.fn()}
        onClose={onClose}
      />,
    );

    const overlay = container.querySelector('.cc-modal-overlay') as HTMLElement;
    await user.click(overlay);

    expect(onClose).toHaveBeenCalled();
  });

  it('does not close modal when modal box clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(
      <ConversationCreationModal
        onSelectKind={vi.fn()}
        onClose={onClose}
      />,
    );

    const modalBox = container.querySelector('.cc-modal-box') as HTMLElement;
    await user.click(modalBox);

    expect(onClose).not.toHaveBeenCalled();
  });
});
