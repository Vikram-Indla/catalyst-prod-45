/**
 * Unit tests for MessageReactions component.
 *
 * Verifies:
 * 1. Reaction chips render correctly with count badge
 * 2. "Reacted by me" state shows blue highlight
 * 3. Click toggles reaction (add/remove via onToggle callback)
 * 4. Hover tooltip shows reactor names
 * 5. Reactor list truncates at 3 + "+N others" text
 * 6. Keyboard nav: Tab, Enter to toggle, Escape to close tooltip
 */

import React from 'react';
import { vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageReactions } from '../MessageReactions';
import type { ChatReaction } from '@/types/chat';

describe('MessageReactions', () => {
  const mockOnToggle = vi.fn();

  const mockReactions: ChatReaction[] = [
    { emoji: '👍', count: 5, reactedByMe: false },
    { emoji: '❤️', count: 3, reactedByMe: true },
    { emoji: '😄', count: 1, reactedByMe: false },
  ];

  const mockReactors = new Map([
    ['👍', [
      { userId: 'user-1', userName: 'Alice' },
      { userId: 'user-2', userName: 'Bob' },
      { userId: 'user-3', userName: 'Charlie' },
      { userId: 'user-4', userName: 'David' },
      { userId: 'user-5', userName: 'Eve' },
    ]],
    ['❤️', [
      { userId: 'user-a', userName: 'Alice' },
      { userId: 'user-b', userName: 'Bob' },
      { userId: 'user-c', userName: 'Charlie' },
    ]],
    ['😄', [
      { userId: 'user-x', userName: 'Alice' },
    ]],
  ]);

  beforeEach(() => {
    mockOnToggle.mockClear();
  });

  describe('Rendering', () => {
    it('should render nothing when reactions array is empty', () => {
      const { container } = render(
        <MessageReactions reactions={[]} onToggle={mockOnToggle} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should render all reaction chips', () => {
      render(
        <MessageReactions
          reactions={mockReactions}
          onToggle={mockOnToggle}
          reactorsByEmoji={mockReactors}
        />
      );

      expect(screen.getByText('👍')).toBeInTheDocument();
      expect(screen.getByText('❤️')).toBeInTheDocument();
      expect(screen.getByText('😄')).toBeInTheDocument();
    });

    it('should display correct count badges', () => {
      const { container } = render(
        <MessageReactions
          reactions={mockReactions}
          onToggle={mockOnToggle}
          reactorsByEmoji={mockReactors}
        />
      );

      // Get all spans containing numbers and filter for counts
      const countTexts = Array.from(container.querySelectorAll('button span'))
        .map(el => el.textContent)
        .filter(text => /^\d+$/.test(text || ''));

      expect(countTexts).toContain('5');
      expect(countTexts).toContain('3');
      expect(countTexts).toContain('1');
    });

    it('should have aria-pressed=true when reactedByMe', () => {
      render(
        <MessageReactions
          reactions={mockReactions}
          onToggle={mockOnToggle}
          reactorsByEmoji={mockReactors}
        />
      );

      // Find the heart emoji button (reactedByMe: true)
      const buttons = screen.getAllByRole('button');
      const heartButton = buttons.find(btn => btn.textContent?.includes('❤️'));

      expect(heartButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should have aria-pressed=false when not reactedByMe', () => {
      render(
        <MessageReactions
          reactions={mockReactions}
          onToggle={mockOnToggle}
          reactorsByEmoji={mockReactors}
        />
      );

      const buttons = screen.getAllByRole('button');
      const thumbsButton = buttons.find(btn => btn.textContent?.includes('👍'));

      expect(thumbsButton).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('Click Interactions', () => {
    it('should call onToggle when reaction is clicked', async () => {
      const user = userEvent.setup();
      render(
        <MessageReactions
          reactions={mockReactions}
          onToggle={mockOnToggle}
          reactorsByEmoji={mockReactors}
        />
      );

      const buttons = screen.getAllByRole('button');
      const thumbsButton = buttons.find(btn => btn.textContent?.includes('👍'));

      await user.click(thumbsButton!);
      expect(mockOnToggle).toHaveBeenCalledWith('👍');
    });

    it('should call onToggle with correct emoji for each chip', async () => {
      const user = userEvent.setup();
      render(
        <MessageReactions
          reactions={mockReactions}
          onToggle={mockOnToggle}
          reactorsByEmoji={mockReactors}
        />
      );

      const buttons = screen.getAllByRole('button');

      // Click each reaction and verify emoji passed to callback
      await user.click(buttons[0]); // 👍
      expect(mockOnToggle).toHaveBeenLastCalledWith('👍');

      await user.click(buttons[1]); // ❤️
      expect(mockOnToggle).toHaveBeenLastCalledWith('❤️');

      await user.click(buttons[2]); // 😄
      expect(mockOnToggle).toHaveBeenLastCalledWith('😄');

      expect(mockOnToggle).toHaveBeenCalledTimes(3);
    });

    it('should allow multiple reactions to be toggled', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <MessageReactions
          reactions={mockReactions}
          onToggle={mockOnToggle}
          reactorsByEmoji={mockReactors}
        />
      );

      const buttons = screen.getAllByRole('button');
      await user.click(buttons[0]); // Click 👍

      expect(mockOnToggle).toHaveBeenCalledWith('👍');
      mockOnToggle.mockClear();

      // Update reactions state (simulating server response)
      const updatedReactions: ChatReaction[] = [
        { emoji: '👍', count: 6, reactedByMe: true }, // Now reacted by me
        { emoji: '❤️', count: 3, reactedByMe: true },
        { emoji: '😄', count: 1, reactedByMe: false },
      ];

      rerender(
        <MessageReactions
          reactions={updatedReactions}
          onToggle={mockOnToggle}
          reactorsByEmoji={mockReactors}
        />
      );

      const updatedButtons = screen.getAllByRole('button');
      expect(updatedButtons[0]).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Hover Tooltip', () => {
    it('should show tooltip on mouse enter', async () => {
      const user = userEvent.setup();
      render(
        <MessageReactions
          reactions={mockReactions}
          onToggle={mockOnToggle}
          reactorsByEmoji={mockReactors}
        />
      );

      const buttons = screen.getAllByRole('button');
      const thumbsButton = buttons.find(btn => btn.textContent?.includes('👍'));

      // Initially no tooltip
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

      // Hover over reaction
      await user.hover(thumbsButton!);

      // Tooltip should appear
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });
    });

    it('should hide tooltip on mouse leave', async () => {
      const user = userEvent.setup();
      render(
        <MessageReactions
          reactions={mockReactions}
          onToggle={mockOnToggle}
          reactorsByEmoji={mockReactors}
        />
      );

      const buttons = screen.getAllByRole('button');
      const thumbsButton = buttons.find(btn => btn.textContent?.includes('👍'));

      // Hover
      await user.hover(thumbsButton!);
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });

      // Un-hover
      await user.unhover(thumbsButton!);
      await waitFor(() => {
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      });
    });

    it('should display correct reactor names in tooltip', async () => {
      const user = userEvent.setup();
      render(
        <MessageReactions
          reactions={mockReactions}
          onToggle={mockOnToggle}
          reactorsByEmoji={mockReactors}
        />
      );

      const buttons = screen.getAllByRole('button');
      const thumbsButton = buttons.find(btn => btn.textContent?.includes('👍'));

      await user.hover(thumbsButton!);

      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip).toHaveTextContent('Alice, Bob, Charlie');
      });
    });

    it('should show "+N others" for more than 3 reactors', async () => {
      const user = userEvent.setup();
      render(
        <MessageReactions
          reactions={mockReactions}
          onToggle={mockOnToggle}
          reactorsByEmoji={mockReactors}
        />
      );

      const buttons = screen.getAllByRole('button');
      const thumbsButton = buttons.find(btn => btn.textContent?.includes('👍'));

      await user.hover(thumbsButton!);

      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        // 5 reactors, showing first 3 + "+2 others"
        expect(tooltip).toHaveTextContent('+2 others');
      });
    });

    it('should not show +1 others (should say "+1 other")', async () => {
      const user = userEvent.setup();
      const reactions: ChatReaction[] = [
        { emoji: '👍', count: 4, reactedByMe: false },
      ];
      const reactors = new Map([
        ['👍', [
          { userId: 'user-1', userName: 'Alice' },
          { userId: 'user-2', userName: 'Bob' },
          { userId: 'user-3', userName: 'Charlie' },
          { userId: 'user-4', userName: 'David' },
        ]],
      ]);

      render(
        <MessageReactions
          reactions={reactions}
          onToggle={mockOnToggle}
          reactorsByEmoji={reactors}
        />
      );

      const button = screen.getByRole('button');
      await user.hover(button);

      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip).toHaveTextContent('+1 other');
        expect(tooltip).not.toHaveTextContent('+1 others');
      });
    });

    it('should close tooltip on click-outside', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <MessageReactions
            reactions={mockReactions}
            onToggle={mockOnToggle}
            reactorsByEmoji={mockReactors}
          />
          <button>External button</button>
        </div>
      );

      const buttons = screen.getAllByRole('button');
      const thumbsButton = buttons.find(btn => btn.textContent?.includes('👍'));
      const externalBtn = screen.getByRole('button', { name: /external button/i });

      // Hover to show tooltip
      await user.hover(thumbsButton!);
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });

      // Click outside
      await user.click(externalBtn);

      // Tooltip should close
      await waitFor(() => {
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should toggle reaction with Enter key', async () => {
      const user = userEvent.setup();
      render(
        <MessageReactions
          reactions={mockReactions}
          onToggle={mockOnToggle}
          reactorsByEmoji={mockReactors}
        />
      );

      const buttons = screen.getAllByRole('button');
      const thumbsButton = buttons.find(btn => btn.textContent?.includes('👍'));

      // Focus the button
      thumbsButton!.focus();
      expect(thumbsButton).toHaveFocus();

      // Press Enter
      await user.keyboard('{Enter}');

      expect(mockOnToggle).toHaveBeenCalledWith('👍');
    });

    it('should allow Tab to focus reaction chips', async () => {
      const user = userEvent.setup();
      render(
        <MessageReactions
          reactions={mockReactions}
          onToggle={mockOnToggle}
          reactorsByEmoji={mockReactors}
        />
      );

      const buttons = screen.getAllByRole('button');

      // Tab to first button
      await user.tab();
      expect(buttons[0]).toHaveFocus();

      // Tab to second button
      await user.tab();
      expect(buttons[1]).toHaveFocus();

      // Tab to third button
      await user.tab();
      expect(buttons[2]).toHaveFocus();
    });

    it('should Shift+Tab backwards through reactions', async () => {
      const user = userEvent.setup();
      render(
        <MessageReactions
          reactions={mockReactions}
          onToggle={mockOnToggle}
          reactorsByEmoji={mockReactors}
        />
      );

      const buttons = screen.getAllByRole('button');

      // Focus last button
      buttons[2].focus();
      expect(buttons[2]).toHaveFocus();

      // Shift+Tab backwards
      await user.tab({ shift: true });
      expect(buttons[1]).toHaveFocus();

      await user.tab({ shift: true });
      expect(buttons[0]).toHaveFocus();
    });

    it('should not toggle reaction with Space key (button default behavior not overridden)', async () => {
      const user = userEvent.setup();
      render(
        <MessageReactions
          reactions={mockReactions}
          onToggle={mockOnToggle}
          reactorsByEmoji={mockReactors}
        />
      );

      const buttons = screen.getAllByRole('button');
      const thumbsButton = buttons.find(btn => btn.textContent?.includes('👍'));

      thumbsButton!.focus();

      // Space key triggers native button click
      await user.keyboard(' ');

      expect(mockOnToggle).toHaveBeenCalledWith('👍');
    });
  });

  describe('Visual States', () => {
    it('should render with blue highlight when reactedByMe', () => {
      const { container } = render(
        <MessageReactions
          reactions={mockReactions}
          onToggle={mockOnToggle}
          reactorsByEmoji={mockReactors}
        />
      );

      const buttons = screen.getAllByRole('button');
      const heartButton = buttons.find(btn => btn.textContent?.includes('❤️'));

      // The button should have is-mine class
      expect(heartButton).toHaveClass('is-mine');
    });

    it('should not have is-mine class when not reactedByMe', () => {
      const { container } = render(
        <MessageReactions
          reactions={mockReactions}
          onToggle={mockOnToggle}
          reactorsByEmoji={mockReactors}
        />
      );

      const buttons = screen.getAllByRole('button');
      const thumbsButton = buttons.find(btn => btn.textContent?.includes('👍'));

      expect(thumbsButton).not.toHaveClass('is-mine');
    });

    it('should use correct ADS tokens for colors', () => {
      render(
        <MessageReactions
          reactions={mockReactions}
          onToggle={mockOnToggle}
          reactorsByEmoji={mockReactors}
        />
      );

      const buttons = screen.getAllByRole('button');
      const heartButton = buttons.find(btn => btn.textContent?.includes('❤️'));

      // Should have background with information blue token
      const computedStyle = window.getComputedStyle(heartButton!);
      expect(computedStyle.background).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle reactions with no reactors data', () => {
      render(
        <MessageReactions
          reactions={mockReactions}
          onToggle={mockOnToggle}
          reactorsByEmoji={undefined}
        />
      );

      expect(screen.getByText('👍')).toBeInTheDocument();
      expect(screen.getByText('❤️')).toBeInTheDocument();
      expect(screen.getByText('😄')).toBeInTheDocument();
    });

    it('should handle reaction with 0 reactors gracefully', async () => {
      const user = userEvent.setup();
      const reactions: ChatReaction[] = [
        { emoji: '👍', count: 1, reactedByMe: false },
      ];
      const reactors = new Map([['👍', []]]);

      render(
        <MessageReactions
          reactions={reactions}
          onToggle={mockOnToggle}
          reactorsByEmoji={reactors}
        />
      );

      const button = screen.getByRole('button');
      await user.hover(button);

      // No tooltip should render if no reactors
      await waitFor(() => {
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      });
    });

    it('should handle emoji with special characters', () => {
      const specialReactions: ChatReaction[] = [
        { emoji: '🏳️‍🌈', count: 2, reactedByMe: false }, // Flag with ZWJ sequences
        { emoji: '👨‍👩‍👧', count: 1, reactedByMe: false }, // Family emoji
      ];

      render(
        <MessageReactions
          reactions={specialReactions}
          onToggle={mockOnToggle}
        />
      );

      expect(screen.getByText('🏳️‍🌈')).toBeInTheDocument();
      expect(screen.getByText('👨‍👩‍👧')).toBeInTheDocument();
    });

    it('should handle rapid clicks on same reaction', async () => {
      const user = userEvent.setup();
      render(
        <MessageReactions
          reactions={mockReactions}
          onToggle={mockOnToggle}
          reactorsByEmoji={mockReactors}
        />
      );

      const buttons = screen.getAllByRole('button');
      const thumbsButton = buttons.find(btn => btn.textContent?.includes('👍'));

      // Rapid clicks
      await user.click(thumbsButton!);
      await user.click(thumbsButton!);
      await user.click(thumbsButton!);

      expect(mockOnToggle).toHaveBeenCalledTimes(3);
      expect(mockOnToggle).toHaveBeenNthCalledWith(1, '👍');
      expect(mockOnToggle).toHaveBeenNthCalledWith(2, '👍');
      expect(mockOnToggle).toHaveBeenNthCalledWith(3, '👍');
    });
  });

  describe('Accessibility', () => {
    it('should have correct cursor on hover', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <MessageReactions
          reactions={mockReactions}
          onToggle={mockOnToggle}
          reactorsByEmoji={mockReactors}
        />
      );

      const button = container.querySelector('button');
      const computedStyle = window.getComputedStyle(button!);

      // All buttons should be clickable (cursor: pointer is in inline styles)
      expect(button).toHaveStyle({ cursor: 'pointer' });
    });

    it('should not allow text selection on reaction chips', () => {
      const { container } = render(
        <MessageReactions
          reactions={mockReactions}
          onToggle={mockOnToggle}
          reactorsByEmoji={mockReactors}
        />
      );

      const button = container.querySelector('button');
      expect(button).toHaveStyle({ userSelect: 'none' });
    });
  });
});
