# Chat Presence System — Design & Implementation

## Overview

The Catalyst Chat Presence System provides real-time awareness of:
1. **Online status** — green dot next to user avatar when online (heartbeat-based)
2. **Typing indicators** — "Alice is typing…" while composing (keystroke-triggered, 3s timeout)
3. **Last-seen** — "Last seen 2h ago" for offline users

## Architecture

### Database Layer

**Table: `ph_presence`**
```sql
CREATE TABLE ph_presence (
  id               uuid PK
  conversation_id  uuid FK → chat_conversations
  user_id          uuid FK → profiles
  status           text ('online' | 'offline')
  last_heartbeat   timestamptz
  typing_until     timestamptz (NULL = not typing)
  last_message_at  timestamptz
  created_at       timestamptz
  updated_at       timestamptz
)
```

**Key fields:**
- `status` — 'online' if heartbeat received in last 5min, else 'offline'
- `typing_until` — expiration timestamp; if `typing_until > now()`, user is typing
- `last_message_at` — timestamp of last message sent (for "Last seen" display)

**Realtime replication:** Table has `REPLICA IDENTITY FULL` and is published on Supabase Realtime channel `postgres_changes` so all clients see live updates.

### RPC Layer

**`ensure_presence(conv_uuid, heartbeat_interval_seconds = 30)`**
- Upsert presence row for current user
- Called every 30s (heartbeat) to keep user online
- Returns current presence record

**`set_typing(conv_uuid, is_typing: boolean)`**
- Set/clear typing indicator
- If `is_typing = true`, sets `typing_until = now() + 3 seconds`
- If `is_typing = false`, clears `typing_until`
- Returns updated presence record

**`record_last_message(conv_uuid)`**
- Update `last_message_at` when user sends a message
- Also clears `typing_until` (stop typing when send)
- Called after successful message INSERT
- Returns updated presence record

**`get_conversation_presence(conv_uuid)`**
- Fetch all presences for a conversation (excluding self)
- Returns:
  - User profile (name, avatar)
  - Current status (online/offline, computed from last_heartbeat)
  - Typing state (is_typing computed from typing_until > now())
  - Last-seen text ("2h ago", "just now", etc.)
- Used to populate presence list UI

### RLS (Row-Level Security)

All policies gate on conversation membership:

- **SELECT:** Members can view presence within their conversations
  ```sql
  EXISTS (SELECT 1 FROM chat_conversation_members m
          WHERE m.conversation_id = ph_presence.conversation_id
          AND m.user_id = auth.uid())
  ```

- **INSERT/UPDATE/DELETE:** Users can only modify their own presence
  ```sql
  user_id = auth.uid()
  ```

## React Integration

### Hooks

#### `usePresence(options)`

**Purpose:** Manage presence for a conversation

**Options:**
```typescript
{
  conversationId: string | null;
  heartbeatIntervalMs?: number;      // Default: 30000 (30s)
  typingTimeoutMs?: number;          // Default: 3000 (3s)
  enabled?: boolean;                 // Default: true
}
```

**Returns:**
```typescript
{
  presenceList: PresenceUI[];        // All other users' presence
  currentUserPresence: PresenceState | null;
  isTyping: boolean;                 // Current user's typing state
  setTyping: (typing: boolean) => Promise<void>;
  recordMessage: () => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}
```

**Behavior:**
1. On mount:
   - Load initial presence list via `get_conversation_presence` RPC
   - Create/ensure presence row via `ensure_presence` RPC
   - Subscribe to Realtime changes on `ph_presence` table filtered by `conversation_id`
2. Every 30s:
   - Call `ensure_presence` RPC to keep user online
3. On typing:
   - Call `set_typing(true)` RPC
   - Auto-clear after 3s idle (browser-side timeout)
4. On message send:
   - Call `recordMessage()` which calls `record_last_message` RPC
   - Clears typing, updates last-seen
5. On unmount:
   - Unsubscribe from Realtime
   - Clear timers

#### `useTypingIndicator(conversationId, setTyping, config)`

**Purpose:** Keystroke middleware for typing broadcasts

**Options:**
```typescript
{
  debounceMs?: number;   // Default: 300 (wait before broadcasting)
  timeoutMs?: number;    // Default: 3000 (clear after idle)
}
```

**Returns:**
```typescript
{
  isComposing: boolean;
  bindComposer: { onKeyDown, onBlur };
  clearTyping: () => Promise<void>;
}
```

**Usage:**
```tsx
const { isComposing, bindComposer, clearTyping } = useTypingIndicator(
  conversationId,
  setTyping
);

<textarea
  {...bindComposer}
  value={message}
  onChange={(e) => setMessage(e.target.value)}
/>
```

**Behavior:**
1. User types → `onKeyDown` fires
2. Wait 300ms debounce
3. Broadcast `setTyping(true)` to Realtime
4. Reset 3s timeout on each keystroke
5. After 3s idle → auto-clear typing
6. On blur → optionally clear typing (currently enabled)

### Components

#### `PresenceIndicator`

Small inline indicator showing user's online/offline status + typing pulse.

**Props:**
```typescript
{
  presenceUI: PresenceUI;
  size?: 'small' | 'medium' | 'large';  // Default: 'medium'
  showLastSeen?: boolean;                // Default: true
  showTyping?: boolean;                  // Default: true
}
```

**Renders:**
- Green dot if online, grey if offline
- Pulse animation if typing
- "Last seen 2h ago" text below dot

#### `TypingIndicator`

Banner showing "Alice, Bob are typing…" with animated dots.

**Props:**
```typescript
{
  typingUsers: { user_name: string; user_avatar: string }[];
  maxNames?: number;  // Default: 2 (show 2 names + "+N more")
}
```

**Renders:**
- Nothing if no users typing
- "Alice is typing…" if 1 user
- "Alice, Bob are typing…" if 2+ users
- Animated dots animation

#### `PresenceList`

Sidebar showing all conversation members with status.

**Props:**
```typescript
{
  presenceList: PresenceUI[];
  onlineFirst?: boolean;  // Default: true
}
```

**Renders:**
- Avatar + name + status for each user
- Online users first (if `onlineFirst = true`)
- "typing…" under typing users
- "Last seen Xh ago" under offline users

## Usage Example

```tsx
import { usePresence } from '@/hooks/chat/usePresence';
import { useTypingIndicator } from '@/hooks/chat/useTypingIndicator';
import {
  PresenceIndicator,
  TypingIndicator,
  PresenceList,
} from '@/components/chat/PresenceIndicator';

function ChatWindow({ conversationId }) {
  const [message, setMessage] = useState('');

  // Initialize presence
  const { presenceList, isTyping, setTyping, recordMessage } = usePresence({
    conversationId,
  });

  // Wire typing to composer
  const { bindComposer } = useTypingIndicator(conversationId, setTyping);

  // Send message
  const handleSend = async () => {
    await sendMessage(message);
    await recordMessage();  // Updates last-seen, clears typing
    setMessage('');
  };

  return (
    <div>
      {/* Show typing users */}
      <TypingIndicator typingUsers={presenceList.filter(p => p.is_typing)} />

      {/* Message list */}
      <div>...</div>

      {/* Composer with typing middleware */}
      <textarea
        {...bindComposer}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <button onClick={handleSend}>Send</button>

      {/* Sidebar with all users */}
      <PresenceList presenceList={presenceList} />
    </div>
  );
}
```

## Performance Considerations

1. **Heartbeat efficiency:** 30s interval balances responsiveness (5min timeout) with bandwidth
2. **Typing debounce:** 300ms prevents thrashing Realtime channel on every keystroke
3. **Typing timeout:** 3s browser-side ensures UI recovers even if server update fails
4. **RLS membership check:** Single EXISTS query per RPC (negligible cost)
5. **Realtime replication:** Filtered by `conversation_id` so only relevant presences broadcast

## Error Handling

All RPC calls have try/catch with console.error logging. If presence fails:
- Heartbeat fails → user appears offline (acceptable degradation)
- Typing broadcast fails → console logs, typing UI recovers on next keystroke
- Message record fails → logged, conversation continues (typing clears at timeout)

## Future Enhancements

1. **Cursor positions** — add `cursor_position` column to track where users are editing (diff view)
2. **Video/audio presence** — add `voice_state` / `video_state` for future chat calling
3. **Activity indicators** — "Alice viewed X" / "Bob reacted to Y" via activity log table
4. **Offline delivery** — store missed typing/presence updates in a queue for reconnection
5. **User status** — extend `status` to support 'dnd' (do not disturb), 'away', etc.

## Testing Checklist

- [ ] Heartbeat: user marked online 5min after last heartbeat
- [ ] Typing: broadcast on keystroke, clear after 3s idle
- [ ] Typing: clear on message send
- [ ] Typing: clear on blur (optional, test both modes)
- [ ] Last-seen: updates on message send
- [ ] Realtime: other users see typing indicator in real-time
- [ ] Realtime: other users see online/offline status changes
- [ ] RLS: offline user cannot see other users' presences (non-members blocked)
- [ ] RLS: user cannot modify another user's presence (403 on cross-user update)
- [ ] Demo: run `PresenceDemo` component, verify all interactions
