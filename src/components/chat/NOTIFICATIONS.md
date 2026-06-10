# Chat Notification System

Comprehensive notification system for chat events in Catalyst. Includes toast notifications, browser push notifications, and permission management.

## Components & Hooks

### 1. NotificationManager (Singleton Service)

**Location:** `src/lib/chat/NotificationManager.ts`

Handles Web Push API integration and permission state.

**Key Methods:**
```typescript
requestPermission(): Promise<boolean>  // Request user permission
isPermitted(): boolean                 // Check if permitted
notify(payload: NotificationPayload): Promise<Notification | null>
playSoundIfEnabled(): void            // Play ping sound
setSoundEnabled(enabled: boolean)     // Configure sound
```

**Usage:**
```typescript
import { notificationManager } from '@/lib/chat/NotificationManager';

const granted = await notificationManager.requestPermission();
if (granted) {
  await notificationManager.notify({
    type: 'mention',
    title: '@mention from Alice',
    body: 'in #project: Check this design',
    requireInteraction: false,
  });
}
```

### 2. useChatNotifications Hook

**Location:** `src/hooks/chat/useChatNotifications.ts`

Manages toast notification queue using @atlaskit/flag.

**API:**
```typescript
const {
  toasts,                    // Toast[] queue
  addToast,                  // (type, title, desc?, autoDismissMs?) => id
  removeToast,               // (id) => void
  notifyMessageSent,         // (desc?) => id — auto-dismisses 3s
  notifyMessageFailed,       // (reason?) => id — sticky
  notifyReactionAdded,       // (emoji) => id — auto-dismisses 3s
  notifyReminder,            // (title, desc) => id — sticky
} = useChatNotifications();
```

**Usage in MessageComposer:**
```typescript
function MessageComposer({ onSend }) {
  const { toasts, removeToast, notifyMessageSent, notifyMessageFailed } = useChatNotifications();

  const handleSend = async (text) => {
    try {
      await onSend(text);
      notifyMessageSent();
    } catch (err) {
      notifyMessageFailed(err.message);
    }
  };

  return (
    <>
      <ChatToastRenderer toasts={toasts} onDismiss={removeToast} />
      {/* composer UI */}
    </>
  );
}
```

### 3. usePushNotifications Hook

**Location:** `src/hooks/chat/usePushNotifications.ts`

Integrates browser push notifications, presence awareness, and @mention detection.

**API:**
```typescript
const {
  requestPermission,        // () => Promise<boolean>
  isUserAway,              // () => boolean — checks document.hidden
  hasMention,              // (text) => boolean — regex @pattern check
  notifyMention,           // (author, conv, preview) => Promise
  notifyDirectMessage,     // (sender, conv, preview) => Promise
  notifyReminder,          // (title, desc) => Promise
  setSoundEnabled,         // (enabled) => void
  getPermissionState,      // () => 'granted' | 'denied' | 'default'
} = usePushNotifications();
```

**Usage:**
```typescript
function ChatMainView() {
  const pushNotify = usePushNotifications();

  useEffect(() => {
    // Request permission once on mount (or on first user interaction)
    pushNotify.requestPermission();
  }, []);

  const handleNewMessage = async (message) => {
    // Notify on @mention if user is away
    if (pushNotify.hasMention(message.text)) {
      await pushNotify.notifyMention(
        message.authorName,
        conversation.title,
        message.text
      );
    }
  };

  return (
    <>
      <NotificationPermissionGate />
      {/* chat UI */}
    </>
  );
}
```

### 4. useMessagesWithNotifications Hook

**Location:** `src/hooks/chat/useMessagesWithNotifications.ts`

Combines useMessages + useChatNotifications + usePushNotifications into one integrated hook.

**API:**
```typescript
const {
  // All useMessages fields...
  messages, sendMessage, toggleReaction, editMessage, deleteMessage,

  // Notification fields...
  toasts, removeToast, clearAllToasts,
  notifyReminder,

  // Push notification fields...
  requestPushPermission,
  setSoundEnabled,
  getPushPermissionState,
  isUserAway,
} = useMessagesWithNotifications(conversationId);
```

**Why use this:** Wraps the message operations (sendMessage, toggleReaction) to automatically fire the correct notifications without boilerplate in the consumer.

**Usage in ChatMainView:**
```typescript
function ChatMainView() {
  const { conversationId } = useParams();
  const {
    messages,
    sendMessage,
    toggleReaction,
    toasts,
    removeToast,
    requestPushPermission,
  } = useMessagesWithNotifications(conversationId);

  useEffect(() => {
    // Auto-request permission on first render
    requestPushPermission();
  }, []);

  return (
    <>
      <ChatToastRenderer toasts={toasts} onDismiss={removeToast} />
      <MessageStream messages={messages} onToggleReaction={toggleReaction} />
      <MessageComposer onSend={sendMessage} />
    </>
  );
}
```

### 5. NotificationPermissionGate Component

**Location:** `src/components/chat/NotificationPermissionGate.tsx`

UI banner that prompts user to enable notifications.

**Features:**
- Shows once per session (unless dismissed)
- Disappears after permission granted
- "Not now" button dismisses for the session
- Uses sessionStorage to track dismissal

**Usage:**
```typescript
function ChatDockMount() {
  return (
    <>
      <NotificationPermissionGate
        onPermissionGranted={() => console.log('Notifications enabled!')}
        onDismissed={() => console.log('User dismissed prompt')}
      />
      <ChatMainView />
    </>
  );
}
```

### 6. ChatToastRenderer Component

**Location:** `src/components/chat/ChatToastRenderer.tsx`

Renders the toast queue using @atlaskit/flag + FlagGroup.

**Features:**
- Color-coded icons (success, error, info, warning)
- Auto-dismiss or sticky depending on type
- Manual dismiss via X button

**Usage:**
```typescript
const { toasts, removeToast } = useChatNotifications();

return <ChatToastRenderer toasts={toasts} onDismiss={removeToast} />;
```

## Toast Notification Behavior

| Type | Title | Auto-Dismiss | Color | Icon |
|------|-------|--------------|-------|------|
| Message Sent | "Message sent" | 3s | Green | ✅ |
| Message Failed | "Message failed" | Never | Red | ❌ |
| Reaction Added | "Reaction added: 👍" | 3s | Green | ✅ |
| Reminder | Custom | Never | Blue | 🔔 |

## Browser Push Notification Behavior

| Event | Condition | Auto-Dismiss | Sticky |
|-------|-----------|--------------|--------|
| @mention | User away + permitted | Yes (auto-close) | No |
| Direct Message | User away + 1-on-1 + permitted | Yes | No |
| Reminder | Always | No | Yes ✅ |

## Permission Flow

```
┌─ Browser loads
├─ Notification API available?
├─ Call requestPermission() (typically on first interaction or mount)
├─ User sees browser prompt: "Allow notifications?"
│  ├─ User clicks "Allow" → permission = 'granted'
│  ├─ User clicks "Block" → permission = 'denied' (no further prompts)
│  └─ User dismisses → permission = 'default' (can re-prompt)
└─ NotificationPermissionGate disappears once granted
```

## Configuration: Sound

Notification sound is **disabled by default**. Enable per-user:

```typescript
// In settings or chat preferences
const { setSoundEnabled } = usePushNotifications();

// User toggles sound
setSoundEnabled(true); // Plays /public/notification-ping.mp3 on @mention

// Or via NotificationManager singleton
import { notificationManager } from '@/lib/chat/NotificationManager';
notificationManager.setSoundEnabled(true);
```

## Integration Checklist

### For MessageComposer:

- [ ] Import `useChatNotifications` or `useMessagesWithNotifications`
- [ ] Add `ChatToastRenderer` to the component JSX
- [ ] Call `notifyMessageSent()` on successful send
- [ ] Call `notifyMessageFailed(error)` on send failure
- [ ] Call `notifyReactionAdded(emoji)` when reaction succeeds

### For ChatMainView:

- [ ] Import `usePushNotifications` or `useMessagesWithNotifications`
- [ ] Call `requestPushPermission()` once on mount (or on user interaction)
- [ ] Detect @mentions: check message body text with `hasMention()`
- [ ] Call `notifyMention()` when mention detected and user is away
- [ ] Call `notifyDirectMessage()` for 1-on-1 convos if message from another user

### For ChatDockMount:

- [ ] Render `<NotificationPermissionGate />` at the top
- [ ] Optionally track onPermissionGranted / onDismissed for analytics

### Assets:

- [ ] Create `/public/notification-ping.mp3` (optional, for sound)
  - Suggested: 200-400ms simple bell/ping sound
  - Keep file size under 50KB for fast preload

## Testing

### Test Toast Notifications:

```typescript
import { render, screen } from '@testing-library/react';
import { useChatNotifications } from '@/hooks/chat/useChatNotifications';

function TestComponent() {
  const { addToast } = useChatNotifications();
  return <button onClick={() => addToast('success', 'Test toast')}>Click</button>;
}

test('shows toast on button click', async () => {
  render(<TestComponent />);
  user.click(screen.getByRole('button'));
  expect(await screen.findByText('Test toast')).toBeInTheDocument();
});
```

### Test Push Notifications:

```typescript
import { notificationManager } from '@/lib/chat/NotificationManager';

test('request permission', async () => {
  // Mock Notification API
  global.Notification = {
    permission: 'default',
    requestPermission: jest.fn().mockResolvedValue('granted'),
  } as any;

  const granted = await notificationManager.requestPermission();
  expect(granted).toBe(true);
  expect(Notification.requestPermission).toHaveBeenCalled();
});
```

### Test @Mention Detection:

```typescript
import { usePushNotifications } from '@/hooks/chat/usePushNotifications';

test('detects @mention in message', () => {
  const { hasMention } = usePushNotifications();
  
  expect(hasMention('Hey @alice check this')).toBe(true);
  expect(hasMention('No mention here')).toBe(false);
  expect(hasMention('@everyone')).toBe(true);
});
```

## Future Enhancements

1. **Service Worker Integration**: Background sync for notifications when app is closed
2. **Notification Preferences**: Per-conversation notification settings
3. **Notification History**: View dismissed notifications in a history panel
4. **Smart Batching**: Group multiple notifications if user returns from long away period
5. **Custom Sounds**: Per-notification-type customizable sounds
6. **Notification Click Handlers**: Navigate to conversation when notification is clicked
7. **Scheduled Reminders**: UI for scheduling reminders (not just triggering them)
8. **Rich Notifications**: Attach buttons/actions to push notifications
