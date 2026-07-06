/**
 * chat-dock-titlebar.test.tsx — TDD for ChatDock Option-C title bar (2026-06-11).
 *
 * Header contract:
 *   1. "CATY" wordmark is visible (renamed from "Caty Connect" 2026-06-12).
 *   2. Both mode tabs ("Messages", "Assistant") render as role="tab".
 *   3. A static AI gradient accent hairline (.cc-dock__accent) exists.
 *   4. Unread count surfaces in the Messages tab badge (status line removed 2026-06-12).
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
// ChatDock calls useIncomingHuddle → useAuth; stub it so the render needs no
// AuthProvider (matches the useConversations mock pattern above).
vi.mock('@/hooks/chat/useIncomingHuddle', () => ({
  useIncomingHuddle: () => ({ incoming: null, snoozedCall: null }),
}));

import { ChatDock } from '../ChatDock';

const baseProps = {
  openConversationIds: [] as string[],
  onSelect: vi.fn(),
  onClose: vi.fn(),
  onToggleCollapsed: vi.fn(),
  // The title bar only renders once the dock is mounted+open (lazy ~32ms in
  // prod, a prop here); without it ChatDock returns just the FAB.
  dockMounted: true,
  // contentReady=true reaches the full panel (open-tab bar + Messages unread
  // badge) rather than the skeleton loading branch.
  contentReady: true,
};

describe('ChatDock Option-C title bar', () => {
  it('renders the CATY wordmark', () => {
    render(<ChatDock {...baseProps} />);
    expect(screen.getByText('CATY')).toBeInTheDocument();
  });

  it('renders both mode tabs', () => {
    render(<ChatDock {...baseProps} />);
    expect(screen.getByRole('tab', { name: /Messages/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Assistant/ })).toBeInTheDocument();
  });

  it('renders the static AI gradient accent hairline', () => {
    const { container } = render(<ChatDock {...baseProps} />);
    expect(container.querySelector('.cc-dock__accent')).toBeTruthy();
  });

  it('renders unread count in Messages tab badge', () => {
    render(<ChatDock {...baseProps} />);
    const tab = screen.getByRole('tab', { name: /Messages/ });
    expect(tab.textContent).toMatch(/5/);
  });
});
