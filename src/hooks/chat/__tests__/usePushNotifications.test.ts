/**
 * usePushNotifications.test.ts — Test browser push notification integration
 */
import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePushNotifications } from '../usePushNotifications';
import { notificationManager } from '@/lib/chat/NotificationManager';

// Mock the NotificationManager
vi.mock('@/lib/chat/NotificationManager', () => ({
  notificationManager: {
    requestPermission: vi.fn().mockResolvedValue(true),
    isPermitted: vi.fn().mockReturnValue(true),
    notify: vi.fn().mockResolvedValue({}),
    playSoundIfEnabled: vi.fn(),
    setSoundEnabled: vi.fn(),
    isSoundEnabled: vi.fn().mockReturnValue(false),
    getPermissionState: vi.fn().mockReturnValue('granted'),
  },
}));

/**
 * jsdom defines `document.hidden` as a getter on Document.prototype, and a
 * defineProperty without `configurable: true` makes later re-mocks throw
 * "Cannot redefine property: hidden". isUserAway() reads `document.hidden`,
 * so we shadow it with an own configurable getter and delete it afterEach to
 * restore the prototype getter.
 */
function setDocumentHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    get: () => hidden,
  });
}

describe('usePushNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDocumentHidden(false);
  });

  afterEach(() => {
    delete (document as any).hidden;
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
      const onPermissionRequested = vi.fn();
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
      setDocumentHidden(true);

      const { result } = renderHook(() => usePushNotifications());
      expect(result.current.isUserAway()).toBe(true);
    });
  });

  describe('hasMention', () => {
    it('should detect @mention patterns', () => {
      const { result } = renderHook(() => usePushNotifications());

      expect(result.current.hasMention('Hey @alice')).toBe(true);
      expect(result.current.hasMention('Check @bob-smith')).toBe(true);
      expect(result.current.hasMention('@everyone')).toBe(true);
    });

    it('should return false for text without an @ token', () => {
      const { result } = renderHook(() => usePushNotifications());

      expect(result.current.hasMention('Hello there')).toBe(false);
      expect(result.current.hasMention('')).toBe(false);
    });

    it('does not treat email addresses as mentions', () => {
      // Regression guard: the old /@[\w]+/ regex matched "@example" inside
      // "user@example.com" and fired a push for every email in a body.
      const { result } = renderHook(() => usePushNotifications());

      expect(result.current.hasMention('Email: user@example.com')).toBe(false);
      expect(result.current.hasMention('ping @sara about user@example.com')).toBe(true);
    });
  });

  describe('notifyMention', () => {
    it('should send push notification when user is away', async () => {
      setDocumentHidden(true);
      vi.mocked(notificationManager.isPermitted).mockReturnValue(true);

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
    });

    it('should not send notification if user is not away', async () => {
      const { result } = renderHook(() => usePushNotifications());

      await act(async () => {
        await result.current.notifyMention('Alice', 'Project Chat', 'Hey');
      });

      expect(notificationManager.notify).not.toHaveBeenCalled();
    });

    it('should not send notification if permission not granted', async () => {
      setDocumentHidden(true);
      vi.mocked(notificationManager.isPermitted).mockReturnValue(false);

      const { result } = renderHook(() => usePushNotifications());

      await act(async () => {
        await result.current.notifyMention('Alice', 'Project Chat', 'Hey');
      });

      expect(notificationManager.notify).not.toHaveBeenCalled();
    });

    it('should play sound after notification', async () => {
      setDocumentHidden(true);
      vi.mocked(notificationManager.isPermitted).mockReturnValue(true);

      const { result } = renderHook(() => usePushNotifications());

      await act(async () => {
        await result.current.notifyMention('Alice', 'Project Chat', 'Hey');
      });

      expect(notificationManager.playSoundIfEnabled).toHaveBeenCalled();
    });
  });

  describe('notifyDirectMessage', () => {
    it('should send push notification for direct message when away', async () => {
      setDocumentHidden(true);
      vi.mocked(notificationManager.isPermitted).mockReturnValue(true);

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
    });
  });

  describe('notifyReminder', () => {
    it('should send reminder notification regardless of away status', async () => {
      vi.mocked(notificationManager.isPermitted).mockReturnValue(true);

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
      vi.mocked(notificationManager.isPermitted).mockReturnValue(false);

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
