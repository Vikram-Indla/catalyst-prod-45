/**
 * chat-dock-tabs.test.tsx — regression guard for the bottom open-conversation
 * tab bar (2026-06-11). Each open tab must expose a hover/click close (×)
 * button that fires onClose(id) without selecting the tab.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('@/hooks/chat/useConversations', () => ({
  useConversations: () => ({
    conversations: [
      { id: 'a', kind: 'dm', title: 'Yazeed Daraz', isArchived: false, lastMessageAt: null, lastMessagePreview: null, unreadCount: 0, ticketKey: null, ticketType: null, projectKey: null, projectName: null },
    ],
  }),
}));
vi.mock('../DockDirectory', () => ({ DockDirectory: () => <div data-testid="stub-dir" /> }));
vi.mock('../DockConversationPane', () => ({ DockConversationPane: () => <div data-testid="stub-pane" /> }));
vi.mock('../CatyPanel', () => ({ CatyPanel: () => <div data-testid="stub-caty" /> }));

import { ChatDock } from '../ChatDock';

const baseProps = {
  openConversationIds: ['a'],
  onSelect: vi.fn(),
  onClose: vi.fn(),
  onToggleCollapsed: vi.fn(),
};

describe('ChatDock bottom tabs — hover close', () => {
  it('renders a close (×) button per open conversation tab', () => {
    render(<ChatDock {...baseProps} />);
    expect(screen.getByRole('button', { name: /Close Yazeed Daraz tab/i })).toBeInTheDocument();
  });

  it('fires onClose(id) when the × is clicked and does not select the tab', () => {
    const onClose = vi.fn();
    const onSelect = vi.fn();
    render(<ChatDock {...baseProps} onClose={onClose} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /Close Yazeed Daraz tab/i }));
    expect(onClose).toHaveBeenCalledWith('a');
    expect(onSelect).not.toHaveBeenCalled();
  });
});
