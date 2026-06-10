/**
 * usePushNotifications.test.ts — Test browser push notification integration
 */
import { renderHook, act } from '@testing-library/react';
import { usePushNotifications } from '../usePushNotifications';
import { notificationManager } from '@/lib/chat/NotificationManager';

// Mock the NotificationManager
jest.mock('@/lib/chat/NotificationManager', () => ({
  notificationManager: {
    requestPermission: jest.fn().mockResolvedValue(true),
    isPermitted: jest.fn().mockReturnValue(true),
    notify: jest.fn().mockResolvedValue({}),
    playSoundIfEnabled: jest.fn(),
    setSoundEnabled: jest.fn(),
    isSoundEnabled: jest.fn().mockReturnValue(false),
    getPermissionState: jest.fn().mockReturnValue('granted'),
  },
}));

describe('usePushNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock document.hidden
    Object.defineProperty(document, 'hidden', {
      writable: true,
      value: false,
    });
  });

  describe('requestPermission', () => {
    it('should request notification permission', async () => {
      const { result } = renderHook(() => usePushNotifications());

      const granted = await act(async () => {
        return await result.current.requestPermission();
      });

      expect(notificationManager.requestPermission).toHaveBeenCalled();
      expect(granted).toBe(true);
    });

    it('should call onPermissionRequested callback', async () => {
      const onPermissionRequested = jest.fn();
      const { result } = renderHook(() =>
        usePushNotifications({ onPermissionRequested }),
      );

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(onPermissionRequested).toHaveBeenCalled();
    });

    it('should only request permission once', async () => {
      const { result } = renderHook(() => usePushNotifications());

      await act(async () => {
        await result.current.requestPermission();
        await result.current.requestPermission();
      });

      // Should only be called once even though we called it twice
      expect(notificationManager.requestPermission).toHaveBeenCalledTimes(1);
    });
  });

  describe('isUserAway', () => {
    it('should return false when document is not hidden', () => {
      const { result } = renderHook(() => usePushNotifications());
      expect(result.current.isUserAway()).toBe(false);
    });

    it('should return true when document is hidden', () => {
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: true,
        configurable: true,
      });

      const { result } = renderHook(() => usePushNotifications());
      expect(result.current.isUserAway()).toBe(true);

      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: false,
        configurable: true,
      });
    });
  });

  describe('hasMention', () => {
    it('should detect @mention patterns', () => {
      const { result } = renderHook(() => usePushNotifications());

      expect(result.current.hasMention('Hey @alice')).toBe(true);
      expect(result.current.hasMention('Check @bob-smith')).toBe(true);
      expect(result.current.hasMention('@everyone')).toBe(true);
    });

    it('should return false for text without @mention', () => {
      const { result } = renderHook(() => usePushNotifications());

      expect(result.current.hasMention('Hello there')).toBe(false);
      expect(result.current.hasMention('Email: user@example.com')).toBe(false);
      expect(result.current.hasMention('')).toBe(false);
    });
  });

  describe('notifyMention', () => {
    it('should send push notification when user is away', async () => {
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: true,
        configurable: true,
      });

      (notificationManager.isPermitted as jest.Mock).mockReturnValue(true);

      const { result } = renderHook(() => usePushNotifications());

      await act(async () => {
        await result.current.notifyMention('Alice', 'Project Chat', '@carol check this out');
      });

      expect(notificationManager.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'mention',
          title: '@mention from Alice',
        }),
      );

      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: false,
        configurable: true,
      });
    });

    it('should not send notification if user is not away', async () => {
      const { result } = renderHook(() => usePushNotifications());

      await act(async () => {
        await result.current.notifyMention('Alice', 'Project Chat', 'Hey');
      });

      expect(notificationManager.notify).not.toHaveBeenCalled();
    });

    it('should not send notification if permission not granted', async () => {
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: true,
        configurable: true,
      });

      (notificationManager.isPermitted as jest.Mock).mockReturnValue(false);

      const { result } = renderHook(() => usePushNotifications());

      await act(async () => {
        await result.current.notifyMention('Alice', 'Project Chat', 'Hey');
      });

      expect(notificationManager.notify).not.toHaveBeenCalled();

      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: false,
        configurable: true,
      });
    });

    it('should play sound after notification', async () => {
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: true,
        configurable: true,
      });

      (notificationManager.isPermitted as jest.Mock).mockReturnValue(true);

      const { result } = renderHook(() => usePushNotifications());

      await act(async () => {
        await result.current.notifyMention('Alice', 'Project Chat', 'Hey');
      });

      expect(notificationManager.playSoundIfEnabled).toHaveBeenCalled();

      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: false,
        configurable: true,
      });
    });
  });

  describe('notifyDirectMessage', () => {
    it('should send push notification for direct message when away', async () => {
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: true,
        configurable: true,
      });

      (notificationManager.isPermitted as jest.Mock).mockReturnValue(true);

      const { result } = renderHook(() => usePushNotifications());

      await act(async () => {
        await result.current.notifyDirectMessage('Bob', 'Direct Chat', 'Are you free?');
      });

      expect(notificationManager.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'direct_message',
          title: 'Message from Bob',
        }),
      );

      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: false,
        configurable: true,
      });
    });
  });

  describe('notifyReminder', () => {
    it('should send reminder notification regardless of away status', async () => {
      (notificationManager.isPermitted as jest.Mock).mockReturnValue(true);

      const { result } = renderHook(() => usePushNotifications());

      await act(async () => {
        await result.current.notifyReminder('Meeting', 'Standup in 5 min');
      });

      expect(notificationManager.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'reminder',
          title: 'Meeting',
          body: 'Standup in 5 min',
        }),
      );
    });

    it('should not send reminder if permission not granted', async () => {
      (notificationManager.isPermitted as jest.Mock).mockReturnValue(false);

      const { result } = renderHook(() => usePushNotifications());

      await act(async () => {
        await result.current.notifyReminder('Meeting', 'Standup in 5 min');
      });

      expect(notificationManager.notify).not.toHaveBeenCalled();
    });
  });

  describe('setSoundEnabled', () => {
    it('should call notificationManager.setSoundEnabled', () => {
      const { result } = renderHook(() => usePushNotifications());

      act(() => {
        result.current.setSoundEnabled(true);
      });

      expect(notificationManager.setSoundEnabled).toHaveBeenCalledWith(true);
    });
  });

  describe('getPermissionState', () => {
    it('should return permission state from notificationManager', () => {
      const { result } = renderHook(() => usePushNotifications());

      const state = result.current.getPermissionState();

      expect(notificationManager.getPermissionState).toHaveBeenCalled();
      expect(state).toBe('granted');
    });
  });
});
