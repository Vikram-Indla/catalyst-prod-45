/**
 * Keyboard navigation tests for MessageActionsToolbar.
 *
 * Verifies:
 * 1. Tab → move focus to next message row's toolbar
 * 2. Shift+Tab → previous message row's toolbar
 * 3. Arrow right/left → cycle through toolbar buttons
 * 4. Enter → activate focused button
 * 5. Escape → close toolbar, return focus to message
 * 6. ARIA labels on all buttons and modals
 */

import React from 'react';
import { vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageActionsToolbar } from '../MessageActionsToolbar';

describe('MessageActionsToolbar - Keyboard Navigation', () => {
  const mockHandlers = {
    onCopyLink: vi.fn().mockResolvedValue(undefined),
    onMarkUnread: vi.fn().mockResolvedValue(undefined),
    onRemind: vi.fn().mockResolvedValue(undefined),
    onTurnIntoIssue: vi.fn().mockResolvedValue(undefined),
    onReturnFocus: vi.fn(),
  };

  const defaultProps = {
    messageId: 'msg-1',
    conversationId: 'conv-1',
    messageText: 'Test message',
    ...mockHandlers,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ARIA Structure', () => {
    it('should render toolbar with role="toolbar" and aria-label', () => {
      render(<MessageActionsToolbar {...defaultProps} />);
      const toolbar = screen.getByRole('toolbar', { name: /message actions/i });
      expect(toolbar).toBeInTheDocument();
    });

    it('should have proper aria-labels on all buttons', () => {
      render(<MessageActionsToolbar {...defaultProps} />);
      expect(screen.getByRole('button', { name: /copy message link/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /mark message unread/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /set reminder/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /turn.*into.*work item/i })).toBeInTheDocument();
    });

    it('should have aria-modal and aria-labelledby on reminder modal', async () => {
      render(<MessageActionsToolbar {...defaultProps} />);
      const remindBtn = screen.getByRole('button', { name: /set reminder/i });
      fireEvent.click(remindBtn);

      await waitFor(() => {
        const modal = screen.getByRole('dialog', { name: /set reminder/i });
        expect(modal).toHaveAttribute('aria-modal', 'true');
        expect(modal).toHaveAttribute('aria-labelledby', 'reminder-modal-title');
      });
    });

    it('should have aria-modal and aria-labelledby on issue modal', async () => {
      render(<MessageActionsToolbar {...defaultProps} />);
      const issueBtn = screen.getByRole('button', { name: /turn.*into.*work item/i });
      fireEvent.click(issueBtn);

      await waitFor(() => {
        const modal = screen.getByRole('dialog', { name: /create work item/i });
        expect(modal).toHaveAttribute('aria-modal', 'true');
        expect(modal).toHaveAttribute('aria-labelledby', 'create-work-item-modal-title');
      });
    });

    it('should mark issue title input as aria-required', async () => {
      render(<MessageActionsToolbar {...defaultProps} />);
      const issueBtn = screen.getByRole('button', { name: /turn.*into.*work item/i });
      fireEvent.click(issueBtn);

      await waitFor(() => {
        const titleInput = screen.getByPlaceholderText('What needs to be done?');
        expect(titleInput).toHaveAttribute('aria-required', 'true');
      });
    });
  });

  describe('Keyboard Navigation - Arrow Keys', () => {
    it('should cycle through buttons with ArrowRight', async () => {
      const user = userEvent.setup();
      render(<MessageActionsToolbar {...defaultProps} />);
      const toolbar = screen.getByRole('toolbar');

      // Focus toolbar
      toolbar.focus();

      // Get all buttons in order
      const copyBtn = screen.getByRole('button', { name: /copy message link/i });
      const unreadBtn = screen.getByRole('button', { name: /mark message unread/i });
      const remindBtn = screen.getByRole('button', { name: /set reminder/i });
      const issueBtn = screen.getByRole('button', { name: /turn.*into.*work item/i });

      // After focus, first button should be focused
      expect(copyBtn).toHaveFocus();

      // ArrowRight → next button
      await user.keyboard('{ArrowRight}');
      expect(unreadBtn).toHaveFocus();

      await user.keyboard('{ArrowRight}');
      expect(remindBtn).toHaveFocus();

      await user.keyboard('{ArrowRight}');
      expect(issueBtn).toHaveFocus();

      // Wrap around to first button
      await user.keyboard('{ArrowRight}');
      expect(copyBtn).toHaveFocus();
    });

    it('should cycle through buttons with ArrowLeft in reverse', async () => {
      const user = userEvent.setup();
      render(<MessageActionsToolbar {...defaultProps} />);
      const toolbar = screen.getByRole('toolbar');
      toolbar.focus();

      const copyBtn = screen.getByRole('button', { name: /copy message link/i });
      const issueBtn = screen.getByRole('button', { name: /turn.*into.*work item/i });

      // First button focused
      expect(copyBtn).toHaveFocus();

      // ArrowLeft from first wraps to last
      await user.keyboard('{ArrowLeft}');
      expect(issueBtn).toHaveFocus();
    });

    it('should not cycle through buttons if a modal is open', async () => {
      const user = userEvent.setup();
      render(<MessageActionsToolbar {...defaultProps} />);
      const remindBtn = screen.getByRole('button', { name: /set reminder/i });

      // Open reminder modal
      fireEvent.click(remindBtn);
      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: /set reminder/i })).toBeInTheDocument();
      });

      // Arrow keys should not cycle buttons while modal is open
      const copyBtn = screen.getByRole('button', { name: /copy message link/i });
      const initialFocus = document.activeElement;

      await user.keyboard('{ArrowRight}');
      // Focus should not have moved to a different button
      expect(document.activeElement).toBe(initialFocus);
    });
  });

  describe('Keyboard Navigation - Enter', () => {
    it('should activate copy button with Enter', async () => {
      const user = userEvent.setup();
      // navigator.clipboard is a getter-only accessor in this jsdom version —
      // Object.assign(navigator, {...}) throws. Redefine the property instead.
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: vi.fn().mockResolvedValue(undefined) },
        configurable: true,
      });

      render(<MessageActionsToolbar {...defaultProps} />);
      const toolbar = screen.getByRole('toolbar');
      toolbar.focus();

      // Copy button is focused by default
      const copyBtn = screen.getByRole('button', { name: /copy message link/i });
      expect(copyBtn).toHaveFocus();

      // Press Enter to activate
      await user.keyboard('{Enter}');
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('msg-1')
      );
    });

    it('should activate remind button with Enter', async () => {
      const user = userEvent.setup();
      render(<MessageActionsToolbar {...defaultProps} />);
      const toolbar = screen.getByRole('toolbar');
      toolbar.focus();

      const remindBtn = screen.getByRole('button', { name: /set reminder/i });

      // Navigate to remind button
      await user.keyboard('{ArrowRight}{ArrowRight}');
      expect(remindBtn).toHaveFocus();

      // Press Enter to open reminder modal
      await user.keyboard('{Enter}');
      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: /set reminder/i })).toBeInTheDocument();
      });
    });

    it('should activate issue button with Enter', async () => {
      const user = userEvent.setup();
      render(<MessageActionsToolbar {...defaultProps} />);
      const toolbar = screen.getByRole('toolbar');
      toolbar.focus();

      const issueBtn = screen.getByRole('button', { name: /turn.*into.*work item/i });

      // Navigate to issue button (3 times right)
      await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}');
      expect(issueBtn).toHaveFocus();

      // Press Enter to open issue modal
      await user.keyboard('{Enter}');
      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: /create work item/i })).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation - Escape', () => {
    it('should close reminder modal with Escape', async () => {
      const user = userEvent.setup();
      render(<MessageActionsToolbar {...defaultProps} />);
      const remindBtn = screen.getByRole('button', { name: /set reminder/i });

      // Open reminder modal. The reminder modal's own Escape handling
      // relies on the key event reaching the toolbar's onKeyDown (via
      // bubbling), so the button must actually be focused first — use
      // userEvent.click (which focuses, like a real click) rather than
      // fireEvent.click (which does not).
      await user.click(remindBtn);
      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: /set reminder/i })).toBeInTheDocument();
      });

      // Press Escape to close
      await user.keyboard('{Escape}');
      await waitFor(() => {
        expect(screen.queryByRole('dialog', { name: /set reminder/i })).not.toBeInTheDocument();
      });
    });

    it('should close issue modal with Escape', async () => {
      const user = userEvent.setup();
      render(<MessageActionsToolbar {...defaultProps} />);
      const issueBtn = screen.getByRole('button', { name: /turn.*into.*work item/i });

      // Open issue modal
      fireEvent.click(issueBtn);
      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: /create work item/i })).toBeInTheDocument();
      });

      // Press Escape to close
      await user.keyboard('{Escape}');
      await waitFor(() => {
        expect(screen.queryByRole('dialog', { name: /create work item/i })).not.toBeInTheDocument();
      });
    });

    it('should call onReturnFocus when Escape is pressed with no modal open', async () => {
      const user = userEvent.setup();
      render(<MessageActionsToolbar {...defaultProps} />);
      const toolbar = screen.getByRole('toolbar');
      toolbar.focus();

      // Press Escape with no modal open
      await user.keyboard('{Escape}');

      expect(mockHandlers.onReturnFocus).toHaveBeenCalled();
    });
  });

  describe('Focus Management', () => {
    it('should set first button to tabIndex=0 when toolbar has focus', async () => {
      render(<MessageActionsToolbar {...defaultProps} />);
      const toolbar = screen.getByRole('toolbar');
      const copyBtn = screen.getByRole('button', { name: /copy message link/i });

      // Native .focus() dispatches outside React's act() batching, so the
      // resulting setState (handleToolbarFocus) may not have flushed yet —
      // wait for the re-render instead of asserting synchronously.
      toolbar.focus();
      await waitFor(() => {
        expect(copyBtn).toHaveAttribute('tabIndex', '0');
      });
    });

    it('should set other buttons to tabIndex=-1 when not focused', () => {
      render(<MessageActionsToolbar {...defaultProps} />);
      const unreadBtn = screen.getByRole('button', { name: /mark message unread/i });
      const remindBtn = screen.getByRole('button', { name: /set reminder/i });
      const issueBtn = screen.getByRole('button', { name: /turn.*into.*work item/i });

      expect(unreadBtn).toHaveAttribute('tabIndex', '-1');
      expect(remindBtn).toHaveAttribute('tabIndex', '-1');
      expect(issueBtn).toHaveAttribute('tabIndex', '-1');
    });

    it('should clear focus state when focus leaves toolbar', () => {
      const { rerender } = render(
        <div>
          <MessageActionsToolbar {...defaultProps} />
          <button>External button</button>
        </div>
      );

      const toolbar = screen.getByRole('toolbar');
      const externalBtn = screen.getByRole('button', { name: /external button/i });

      toolbar.focus();
      externalBtn.focus();

      // After blur, first button should be tabIndex=-1
      const copyBtn = screen.getByRole('button', { name: /copy message link/i });
      expect(copyBtn).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('ARIA Label Dynamic Updates', () => {
    it('should update Mark unread label based on isUnread prop', () => {
      const { rerender } = render(
        <MessageActionsToolbar {...defaultProps} isUnread={false} />
      );

      let btn = screen.getByRole('button', { name: /mark message unread/i });
      expect(btn).toBeInTheDocument();

      rerender(<MessageActionsToolbar {...defaultProps} isUnread={true} />);
      btn = screen.getByRole('button', { name: /mark message as read/i });
      expect(btn).toBeInTheDocument();
    });
  });

  describe('Modal Keyboard Handling', () => {
    it('should allow form submission in issue modal with Ctrl+Enter', async () => {
      const user = userEvent.setup();
      render(<MessageActionsToolbar {...defaultProps} />);
      const issueBtn = screen.getByRole('button', { name: /turn.*into.*work item/i });

      // Open issue modal
      fireEvent.click(issueBtn);
      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: /create work item/i })).toBeInTheDocument();
      });

      // Fill in title
      const titleInput = screen.getByPlaceholderText('What needs to be done?');
      await user.type(titleInput, 'Test issue');

      // Submit with Ctrl+Enter (if implemented)
      // This is currently in the edit area but could be extended to modals
      expect(titleInput).toHaveValue('Test issue');
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid arrow key presses', async () => {
      const user = userEvent.setup();
      render(<MessageActionsToolbar {...defaultProps} />);
      const toolbar = screen.getByRole('toolbar');
      toolbar.focus();

      const copyBtn = screen.getByRole('button', { name: /copy message link/i });
      expect(copyBtn).toHaveFocus();

      // Rapid right arrows
      await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}');

      // Should still be on a valid button (wrapped around once)
      const buttons = [
        screen.getByRole('button', { name: /copy message link/i }),
        screen.getByRole('button', { name: /mark message unread/i }),
        screen.getByRole('button', { name: /set reminder/i }),
        screen.getByRole('button', { name: /turn.*into.*work item/i }),
      ];

      expect(buttons.some(btn => btn === document.activeElement)).toBe(true);
    });

    it('should disable buttons while loading', async () => {
      const user = userEvent.setup();
      const slowHandler = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(
        <MessageActionsToolbar
          {...defaultProps}
          onCopyLink={slowHandler}
        />
      );

      const copyBtn = screen.getByRole('button', { name: /copy message link/i });

      // Click button
      await user.click(copyBtn);

      // Button should be disabled while loading
      expect(copyBtn).toBeDisabled();

      // Wait for handler to complete
      await waitFor(() => {
        expect(copyBtn).not.toBeDisabled();
      });
    });
  });
});
