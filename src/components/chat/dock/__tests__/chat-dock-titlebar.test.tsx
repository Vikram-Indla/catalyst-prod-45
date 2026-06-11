/**
 * chat-dock-titlebar.test.tsx — TDD for ChatDock Option-C title bar (2026-06-11).
 *
 * Header contract:
 *   1. "Caty" wordmark is visible.
 *   2. Both mode tabs ("Connect", "Ask Caty") render as role="tab".
 *   3. A static AI gradient accent hairline (.cc-dock__accent) exists.
 *   4. A live status line (.cc-dock__status) renders unread count.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('@/hooks/chat/useConversations', () => ({
  useConversations: () => ({
    conversations: [
      { id: 'a', kind: 'dm', title: 'Test', isArchived: false, lastMessageAt: null, lastMessagePreview: null, unreadCount: 5, ticketKey: null, ticketType: null, projectKey: null, projectName: null },
    ],
  }),
}));
vi.mock('../DockDirectory', () => ({ DockDirectory: () => <div data-testid="stub-dir" /> }));
vi.mock('../DockConversationPane', () => ({ DockConversationPane: () => <div data-testid="stub-pane" /> }));
vi.mock('../CatyPanel', () => ({ CatyPanel: () => <div data-testid="stub-caty" /> }));

import { ChatDock } from '../ChatDock';

const baseProps = {
  openConversationIds: [] as string[],
  onSelect: vi.fn(),
  onClose: vi.fn(),
  onToggleCollapsed: vi.fn(),
};

describe('ChatDock Option-C title bar', () => {
  it('renders the Caty wordmark', () => {
    render(<ChatDock {...baseProps} />);
    expect(screen.getByText('Caty')).toBeInTheDocument();
  });

  it('renders both mode tabs', () => {
    render(<ChatDock {...baseProps} />);
    expect(screen.getByRole('tab', { name: /Connect/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Ask Caty/ })).toBeInTheDocument();
  });

  it('renders the static AI gradient accent hairline', () => {
    const { container } = render(<ChatDock {...baseProps} />);
    expect(container.querySelector('.cc-dock__accent')).toBeTruthy();
  });

  it('renders a live status line with the unread count', () => {
    const { container } = render(<ChatDock {...baseProps} />);
    const status = container.querySelector('.cc-dock__status');
    expect(status).toBeTruthy();
    expect(status?.textContent).toMatch(/5/);
  });
});
