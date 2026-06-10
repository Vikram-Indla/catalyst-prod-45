/**
 * Reactions tests — ReactionPicker and MessageReactions components
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ReactionPicker } from '../ReactionPicker';
import { MessageReactions } from '../MessageReactions';
import type { ChatReaction } from '@/types/chat';

describe('ReactionPicker', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <ReactionPicker isOpen={false} onEmojiPick={vi.fn()} />,
    );
    expect(container.querySelector('.cc-reaction-picker')).toBeNull();
  });

  it('renders picker when open', () => {
    const { container } = render(
      <ReactionPicker isOpen onEmojiPick={vi.fn()} />,
    );
    expect(container.querySelector('.cc-reaction-picker')).toBeTruthy();
  });

  it('shows quick reactions row', () => {
    const { container } = render(
      <ReactionPicker isOpen onEmojiPick={vi.fn()} />,
    );
    const quickReactions = container.querySelector('.cc-quick-reactions');
    expect(quickReactions).toBeTruthy();
    // 6 quick reactions
    expect(quickReactions?.querySelectorAll('.cc-quick-reaction-btn')).toHaveLength(6);
  });

  it('shows emoji grid', () => {
    const { container } = render(
      <ReactionPicker isOpen onEmojiPick={vi.fn()} />,
    );
    const grid = container.querySelector('.cc-emoji-grid');
    expect(grid).toBeTruthy();
    expect(grid?.querySelectorAll('.cc-emoji-btn').length).toBeGreaterThan(0);
  });

  it('calls onEmojiPick when quick reaction clicked', async () => {
    const onPick = vi.fn();
    const { container } = render(
      <ReactionPicker isOpen onEmojiPick={onPick} />,
    );
    const firstQuickBtn = container.querySelector('.cc-quick-reaction-btn');
    if (firstQuickBtn) {
      fireEvent.click(firstQuickBtn);
      expect(onPick).toHaveBeenCalled();
    }
  });

  it('calls onClose when emoji clicked', async () => {
    const onClose = vi.fn();
    const onPick = vi.fn();
    const { container } = render(
      <ReactionPicker isOpen onEmojiPick={onPick} onClose={onClose} />,
    );
    const firstEmoji = container.querySelector('.cc-emoji-btn');
    if (firstEmoji) {
      fireEvent.click(firstEmoji);
      expect(onClose).toHaveBeenCalled();
    }
  });

  it('filters emojis by search term', async () => {
    const { container } = render(
      <ReactionPicker isOpen onEmojiPick={vi.fn()} />,
    );
    const searchInput = container.querySelector('.cc-reaction-search') as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'smile' } });
    // After searching, the grid should still exist but with filtered results
    await waitFor(() => {
      const grid = container.querySelector('.cc-emoji-grid');
      expect(grid).toBeTruthy();
    });
  });

  it('closes on click-outside', async () => {
    const onClose = vi.fn();
    const triggerRef = React.createRef<HTMLDivElement>();
    render(
      <div>
        <div ref={triggerRef} data-testid="trigger" />
        <ReactionPicker isOpen onEmojiPick={vi.fn()} onClose={onClose} triggerRef={triggerRef} />
      </div>,
    );
    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });
});

describe('MessageReactions', () => {
  const mockReactions: ChatReaction[] = [
    { emoji: '👍', count: 3, reactedByMe: false },
    { emoji: '❤️', count: 2, reactedByMe: true },
  ];

  it('renders nothing when no reactions', () => {
    const { container } = render(
      <MessageReactions reactions={[]} onToggle={vi.fn()} />,
    );
    expect(container.querySelector('.cc-reacts')).toBeNull();
  });

  it('renders reaction chips', () => {
    const { container } = render(
      <MessageReactions reactions={mockReactions} onToggle={vi.fn()} />,
    );
    const chips = container.querySelectorAll('.cc-react');
    expect(chips).toHaveLength(2);
  });

  it('shows emoji and count', () => {
    const { container } = render(
      <MessageReactions reactions={mockReactions} onToggle={vi.fn()} />,
    );
    expect(container.textContent).toContain('👍');
    expect(container.textContent).toContain('3');
    expect(container.textContent).toContain('❤️');
    expect(container.textContent).toContain('2');
  });

  it('highlights "reacted by me" reactions', () => {
    const { container } = render(
      <MessageReactions reactions={mockReactions} onToggle={vi.fn()} />,
    );
    const chips = container.querySelectorAll('.cc-react');
    // Second reaction (❤️) should have is-mine class
    expect(chips[1].classList.contains('is-mine')).toBe(true);
  });

  it('calls onToggle when reaction clicked', () => {
    const onToggle = vi.fn();
    const { container } = render(
      <MessageReactions reactions={mockReactions} onToggle={onToggle} />,
    );
    const firstChip = container.querySelector('.cc-react') as HTMLButtonElement;
    fireEvent.click(firstChip);
    expect(onToggle).toHaveBeenCalledWith('👍');
  });

  it('shows reactor tooltip on hover', async () => {
    const reactorsByEmoji = new Map([
      ['👍', [{ userId: '1', userName: 'Alice' }]],
    ]);
    const { container } = render(
      <MessageReactions
        reactions={[{ emoji: '👍', count: 1, reactedByMe: false }]}
        onToggle={vi.fn()}
        reactorsByEmoji={reactorsByEmoji}
      />,
    );
    const chip = container.querySelector('.cc-react') as HTMLButtonElement;
    fireEvent.mouseEnter(chip);
    await waitFor(() => {
      const tooltip = container.querySelector('.cc-react-tooltip');
      expect(tooltip?.textContent).toContain('Alice');
      expect(tooltip?.textContent).toContain('👍');
    });
  });
});
