/**
 * useChatNotifications.test.ts — Test the toast notification hook
 */
import { renderHook, act } from '@testing-library/react';
import { useChatNotifications } from '../useChatNotifications';

describe('useChatNotifications', () => {
  describe('addToast', () => {
    it('should add a toast to the queue', () => {
      const { result } = renderHook(() => useChatNotifications());

      act(() => {
        result.current.addToast('success', 'Test', 'Description');
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0]).toMatchObject({
        type: 'success',
        title: 'Test',
        description: 'Description',
      });
    });

    it('should generate unique toast ids', () => {
      const { result } = renderHook(() => useChatNotifications());

      let id1: string;
      let id2: string;

      act(() => {
        id1 = result.current.addToast('success', 'Toast 1');
        id2 = result.current.addToast('error', 'Toast 2');
      });

      expect(id1).not.toBe(id2);
    });

    it('should auto-dismiss after specified timeout', async () => {
      const { result } = renderHook(() => useChatNotifications());

      act(() => {
        result.current.addToast('success', 'Will dismiss', undefined, 100);
      });

      expect(result.current.toasts).toHaveLength(1);

      // Wait for auto-dismiss
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(result.current.toasts).toHaveLength(0);
    });

    it('should not auto-dismiss if autoDismissMs is 0 or undefined', async () => {
      const { result } = renderHook(() => useChatNotifications());

      act(() => {
        result.current.addToast('error', 'Sticky toast', undefined, 0);
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Toast should still be there
      expect(result.current.toasts).toHaveLength(1);
    });
  });

  describe('removeToast', () => {
    it('should remove a toast by id', () => {
      const { result } = renderHook(() => useChatNotifications());

      let id: string;
      act(() => {
        id = result.current.addToast('success', 'Toast');
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        result.current.removeToast(id!);
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('should not error on removing non-existent id', () => {
      const { result } = renderHook(() => useChatNotifications());

      act(() => {
        expect(() => result.current.removeToast('non-existent')).not.toThrow();
      });
    });
  });

  describe('clearAllToasts', () => {
    it('should clear all toasts', () => {
      const { result } = renderHook(() => useChatNotifications());

      act(() => {
        result.current.addToast('success', 'Toast 1');
        result.current.addToast('error', 'Toast 2');
        result.current.addToast('info', 'Toast 3');
      });

      expect(result.current.toasts).toHaveLength(3);

      act(() => {
        result.current.clearAllToasts();
      });

      expect(result.current.toasts).toHaveLength(0);
    });
  });

  describe('notifyMessageSent', () => {
    it('should show success toast that auto-dismisses', async () => {
      const { result } = renderHook(() => useChatNotifications());

      act(() => {
        result.current.notifyMessageSent();
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0]).toMatchObject({
        type: 'success',
        title: 'Message sent',
      });

      // Should auto-dismiss after 3s
      await new Promise((resolve) => setTimeout(resolve, 3100));
      expect(result.current.toasts).toHaveLength(0);
    });

    it('should accept optional description', () => {
      const { result } = renderHook(() => useChatNotifications());

      act(() => {
        result.current.notifyMessageSent('Delivered to 5 recipients');
      });

      expect(result.current.toasts[0]).toMatchObject({
        title: 'Message sent',
        description: 'Delivered to 5 recipients',
      });
    });
  });

  describe('notifyMessageFailed', () => {
    it('should show error toast that does not auto-dismiss', async () => {
      const { result } = renderHook(() => useChatNotifications());

      act(() => {
        result.current.notifyMessageFailed('Network timeout');
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0]).toMatchObject({
        type: 'error',
        title: 'Message failed',
        description: 'Network timeout',
      });

      // Should NOT auto-dismiss
      await new Promise((resolve) => setTimeout(resolve, 3100));
      expect(result.current.toasts).toHaveLength(1);
    });
  });

  describe('notifyReactionAdded', () => {
    it('should show success toast with emoji', async () => {
      const { result } = renderHook(() => useChatNotifications());

      act(() => {
        result.current.notifyReactionAdded('👍');
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].title).toContain('👍');

      // Should auto-dismiss
      await new Promise((resolve) => setTimeout(resolve, 3100));
      expect(result.current.toasts).toHaveLength(0);
    });
  });

  describe('notifyReminder', () => {
    it('should show info toast that does not auto-dismiss', async () => {
      const { result } = renderHook(() => useChatNotifications());

      act(() => {
        result.current.notifyReminder('Meeting in 5 min', 'Daily standup');
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0]).toMatchObject({
        type: 'info',
        title: 'Meeting in 5 min',
        description: 'Daily standup',
      });

      // Should NOT auto-dismiss
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(result.current.toasts).toHaveLength(1);
    });
  });

  describe('multiple toasts', () => {
    it('should maintain independent auto-dismiss timers', async () => {
      const { result } = renderHook(() => useChatNotifications());

      act(() => {
        result.current.notifyMessageSent(); // 3000ms
        result.current.notifyMessageFailed(); // sticky
      });

      expect(result.current.toasts).toHaveLength(2);

      // After 3100ms, first toast should be gone but not the second
      await new Promise((resolve) => setTimeout(resolve, 3100));
      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].type).toBe('error');
    });
  });
});
