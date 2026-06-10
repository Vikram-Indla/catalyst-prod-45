# Chat Notification System — Integration Guide

Step-by-step instructions to integrate the notification system into your chat components.

## System Architecture

```
NotificationManager (Singleton)
  ↓ (uses)
  ├─ Web Push API (browser notifications)
  ├─ Audio API (sound playback)
  └─ document.hidden (presence tracking)

useChatNotifications Hook
  └─ Returns: toast queue + methods

usePushNotifications Hook
  ├─ Calls: NotificationManager
  └─ Returns: push notification methods + permission management

useMessagesWithNotifications Hook ← Recommended for new integrations
  ├─ Wraps: useMessages hook
  ├─ Includes: useChatNotifications
  ├─ Includes: usePushNotifications
  └─ Returns: all of the above + wrapped message operations
```

## Step 1: Add Notification Permission Banner

**Where:** Top of ChatDockMount or main chat shell (renders once per session)

**File:** `src/components/chat/ChatDockMount.tsx` or similar

```typescript
import { NotificationPermissionGate } from '@/components/chat/NotificationPermissionGate';
import ChatMainView from '@/components/chat/ChatMainView';

export function ChatDockMount() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Notification permission gate (rendered once, disappears after granted) */}
      <NotificationPermissionGate
        onPermissionGranted={() => {
          console.debug('User enabled notifications');
        }}
        onDismissed={() => {
          console.debug('User dismissed notification prompt (can re-prompt later)');
        }}
      />

      {/* Rest of chat UI */}
      <ChatMainView />
    </div>
  );
}
```

## Step 2: Integrate Toast Notifications into MessageComposer

**Where:** `src/components/chat/main/MessageComposer.tsx`

**Changes:**
1. Import `useChatNotifications` and `ChatToastRenderer`
2. Call hook to get notification methods
3. Wrap `onSend` to show success/error toasts
4. Add `ChatToastRenderer` to JSX

**Code:**

```typescript
import { useChatNotifications } from '@/hooks/chat/useChatNotifications';
import { ChatToastRenderer } from '@/components/chat/ChatToastRenderer';

export function MessageComposer({
  conversationTitle,
  conversationId,
  disabled,
  onSend,
  onAskCaty,
  lastSentMessageId,
}: MessageComposerProps) {
  // ... existing code ...

  // Add notification hook
  const { toasts, removeToast, notifyMessageSent, notifyMessageFailed, notifyReactionAdded } =
    useChatNotifications();

  // ... existing state and effects ...

  // Modify the send handler to show notifications
  const handleSend = async () => {
    if (!value.trim() || !conversationId) return;

    setSending(true);
    try {
      // Call the existing onSend prop
      await onSend(value, {
        adf: richMode ? richAdf : null,
        scheduled_for: scheduledFor,
      });

      // Show success toast (auto-dismisses after 3s)
      notifyMessageSent();

      // Clear draft and form state
      setValue('');
      setRichMode(false);
      setRichAdf(createEmptyADF());
      setScheduledFor(null);
      if (taRef.current) taRef.current.style.height = 'auto';
    } catch (err) {
      // Show error toast (sticky, user must dismiss)
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      notifyMessageFailed(errorMsg);
    } finally {
      setSending(false);
    }
  };

  // ... rest of component ...

  return (
    <div ref={composerRef} className="cc-composer">
      {/* Add toast renderer at the top */}
      <ChatToastRenderer toasts={toasts} onDismiss={removeToast} />

      {/* ... rest of composer UI ... */}
    </div>
  );
}
```

## Step 3: Integrate Push Notifications into ChatMainView

**Where:** `src/components/chat/ChatMainView.tsx`

**Option A: Simple Integration (usePushNotifications)**

```typescript
import { usePushNotifications } from '@/hooks/chat/usePushNotifications';
import { useConversations } from '@/hooks/chat/useConversations';

export function ChatMainView({ activeConversationId, onSelectConversation }: ChatMainViewProps) {
  // ... existing code ...

  const pushNotify = usePushNotifications();
  const { conversations } = useConversations();

  // Request permission once on mount
  useEffect(() => {
    pushNotify.requestPermission();
  }, [pushNotify]);

  // Handle incoming messages with @mention detection
  const handleNewMessage = useCallback(
    async (message: ChatMessage) => {
      const activeConv = conversations.find((c) => c.id === activeConversationId);
      const isDirectMessage = activeConv?.kind === 'dm';

      // Notify on @mention if user is away
      if (pushNotify.hasMention(message.bodyText)) {
        await pushNotify.notifyMention(
          message.authorName,
          activeConv?.title ?? 'Conversation',
          message.bodyText.substring(0, 100),
        );
      }
      // Or notify for direct messages in 1-on-1
      else if (
        isDirectMessage &&
        message.authorId !== currentUserId &&
        pushNotify.isUserAway()
      ) {
        await pushNotify.notifyDirectMessage(
          message.authorName,
          activeConv?.title ?? 'Direct Message',
          message.bodyText.substring(0, 100),
        );
      }
    },
    [conversations, activeConversationId, currentUserId, pushNotify],
  );

  // ... rest of component, call handleNewMessage when new message arrives ...
}
```

**Option B: Recommended Integration (useMessagesWithNotifications)**

Use this instead of `useMessages` in ChatMainView:

```typescript
import { useMessagesWithNotifications } from '@/hooks/chat/useMessagesWithNotifications';
import { ChatToastRenderer } from '@/components/chat/ChatToastRenderer';
import { NotificationPermissionGate } from '@/components/chat/NotificationPermissionGate';

export function ChatMainView({ activeConversationId, onSelectConversation }: ChatMainViewProps) {
  const params = useSearchParams()[0];
  const urlConv = params.get('conv') ?? undefined;

  // Use the integrated hook instead of useMessages
  const {
    messages,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    currentUserId,
    toasts,
    removeToast,
    requestPushPermission,
    setSoundEnabled,
  } = useMessagesWithNotifications(activeConversationId ?? urlConv ?? undefined);

  // Request permission once on mount
  useEffect(() => {
    requestPushPermission();
  }, [requestPushPermission]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Toast notifications */}
      <ChatToastRenderer toasts={toasts} onDismiss={removeToast} />

      {/* Existing chat UI components */}
      <ConversationHeader conversation={activeConversation} />

      <MessageStream
        messages={messages}
        onToggleReaction={toggleReaction}
        onEdit={editMessage}
        onDelete={deleteMessage}
      />

      <MessageComposer
        conversationId={activeConversationId ?? urlConv}
        onSend={sendMessage}
      />
    </div>
  );
}
```

## Step 4: Add Sound Configuration (Optional)

Add a toggle in chat settings or preferences:

```typescript
import { usePushNotifications } from '@/hooks/chat/usePushNotifications';

function ChatSettings() {
  const [soundEnabled, setSoundEnabled] = React.useState(false);
  const { setSoundEnabled: setPushSound } = usePushNotifications();

  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabled(enabled);
    setPushSound(enabled);
  };

  return (
    <label>
      <input
        type="checkbox"
        checked={soundEnabled}
        onChange={(e) => handleSoundToggle(e.target.checked)}
      />
      Play sound on @mention
    </label>
  );
}
```

## Step 5: Create Notification Sound Asset (Optional)

Create `/public/notification-ping.mp3`:

**Option 1: Use online tool**
- Go to https://ttsmp3.com/ or https://www.nch.com.au/tonegen/
- Generate a simple bell/ping sound (200-400ms)
- Export as MP3
- Save to `public/notification-ping.mp3`

**Option 2: Use existing sound**
- Any short notification sound works
- Keep file under 50KB for fast preload
- Supported formats: MP3, WAV, OGG, M4A

**Verify in browser DevTools:**
```javascript
const audio = new Audio('/notification-ping.mp3');
audio.play(); // Should hear the ping
```

## Step 6: Run Tests

```bash
# Test toast notifications
npm test -- useChatNotifications.test.ts

# Test push notifications
npm test -- usePushNotifications.test.ts

# Run all chat tests
npm test -- src/hooks/chat/
npm test -- src/components/chat/
```

## Step 7: Verify in Browser

**Test Toast Notifications:**
1. Open the app
2. Send a message
3. Should see green "Message sent" toast (auto-dismisses 3s)
4. Try sending invalid message
5. Should see red "Message failed" toast (sticky)

**Test Push Notifications:**
1. Open the app
2. See notification permission banner
3. Click "Enable"
4. In browser DevTools: check if permission is 'granted'
5. @mention yourself in a message
6. Minimize or tab away from the app
7. Should receive push notification in OS notification center

**Test Sound:**
1. Enable sound in settings
2. Minimize app
3. Get @mentioned
4. Should hear ping sound

## Common Integration Patterns

### Pattern 1: Simple Toast-Only (No Push)

```typescript
function ChatComponent() {
  const { toasts, removeToast, notifyMessageSent, notifyMessageFailed } =
    useChatNotifications();

  return (
    <>
      <ChatToastRenderer toasts={toasts} onDismiss={removeToast} />
      {/* rest of UI */}
    </>
  );
}
```

### Pattern 2: Toast + Push (Recommended)

```typescript
function ChatComponent() {
  const { messages, sendMessage, toasts, removeToast, requestPushPermission } =
    useMessagesWithNotifications(conversationId);

  useEffect(() => {
    requestPushPermission();
  }, [requestPushPermission]);

  return (
    <>
      <NotificationPermissionGate />
      <ChatToastRenderer toasts={toasts} onDismiss={removeToast} />
      {/* rest of UI */}
    </>
  );
}
```

### Pattern 3: Custom @Mention Logic

```typescript
function ChatComponent() {
  const pushNotify = usePushNotifications();

  const customMentionCheck = (text: string): boolean => {
    // Add your own logic: check roster, exact name match, etc.
    return pushNotify.hasMention(text);
  };

  const handleMessage = async (msg: ChatMessage) => {
    if (customMentionCheck(msg.bodyText)) {
      await pushNotify.notifyMention(msg.authorName, 'Convo', msg.bodyText);
    }
  };
}
```

## Troubleshooting

### Toasts don't appear
- [ ] `ChatToastRenderer` is mounted in JSX
- [ ] `toasts` array is passed correctly
- [ ] `onDismiss` callback is connected

### Push notifications don't work
- [ ] Check browser DevTools: `Notification.permission === 'granted'`
- [ ] App must be in background (document.hidden = true)
- [ ] Reload page to re-request permission if previously denied
- [ ] Check console for errors from NotificationManager

### Sound doesn't play
- [ ] `/public/notification-ping.mp3` exists and loads without 404
- [ ] Audio file format is supported by browser
- [ ] Sound is enabled: `setPushSound(true)`
- [ ] Try in browser DevTools: `new Audio('/notification-ping.mp3').play()`

### Permission stays 'default'
- [ ] User dismissed the browser prompt without choosing
- [ ] Call `requestPermission()` again on next user interaction
- [ ] In browser: Settings → Permissions → Notifications → Clear for this site

## Next Steps

1. **Integrate the notification system into your chat components** (follow steps 1-5 above)
2. **Run tests** to verify functionality
3. **Test in browser** with actual notifications
4. **Add to your PR checklist** before code review
5. **Document in your project's chat module documentation**

## References

- Full API docs: See `NOTIFICATIONS.md`
- Example integration: See `ChatNotificationExample.tsx`
- Tests: See `src/hooks/chat/__tests__/`
- NotificationManager: See `src/lib/chat/NotificationManager.ts`
