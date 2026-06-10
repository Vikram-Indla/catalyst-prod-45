# Chat Presence System — Integration Checklist

This document guides integration of the presence system into existing chat UI surfaces (MessageComposer, ChatRightPane, ChatSidebar, etc.).

## Database Migration

- [ ] Run migration: `supabase migration up`
  - Creates `ph_presence` table
  - Adds RLS policies
  - Adds 4 RPC functions (`ensure_presence`, `set_typing`, `record_last_message`, `get_conversation_presence`)
  - Migration file: `supabase/migrations/20260610000000_chat_presence.sql`

**Verify:**
```bash
# Check table exists
supabase db pull
grep ph_presence supabase/schema.sql

# Check RPCs exist
psql $DATABASE_URL -c "SELECT routine_name FROM information_schema.routines WHERE routine_schema='public' AND routine_name LIKE 'set_typing%';"
```

## Type Definitions

- [ ] Import from `src/lib/chat/presence.types.ts`:
  ```typescript
  import {
    PresenceUI,
    PresenceState,
    EnsurePresenceResponse,
    SetTypingResponse,
    RecordLastMessageResponse,
  } from '@/lib/chat/presence.types';
  ```

## Hooks

### `usePresence` Hook

- [ ] Import: `import { usePresence } from '@/hooks/chat/usePresence';`
- [ ] Add to conversation component (e.g., `ChatMainView.tsx`):
  ```typescript
  const { presenceList, currentUserPresence, isTyping, setTyping, recordMessage } = usePresence({
    conversationId,
    heartbeatIntervalMs: 30000,
    typingTimeoutMs: 3000,
    enabled: true,
  });
  ```
- [ ] Pass `setTyping` to `MessageComposer` for typing broadcasts
- [ ] Pass `recordMessage` to message send handler
- [ ] Pass `presenceList` to sidebar/participant list UI

### `useTypingIndicator` Hook

- [ ] Import: `import { useTypingIndicator } from '@/hooks/chat/useTypingIndicator';`
- [ ] Add to `MessageComposer.tsx`:
  ```typescript
  const { bindComposer, isComposing } = useTypingIndicator(conversationId, setTyping, {
    debounceMs: 300,
    timeoutMs: 3000,
  });
  ```
- [ ] Spread `bindComposer` onto composer textarea:
  ```tsx
  <textarea
    {...bindComposer}
    value={message}
    onChange={(e) => setMessage(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      } else {
        bindComposer.onKeyDown(e);  // Important: call original handler
      }
    }}
  />
  ```

## UI Components

### `PresenceIndicator` Component

- [ ] Import: `import { PresenceIndicator } from '@/components/chat/PresenceIndicator';`
- [ ] Add next to user avatars in message list or sidebar:
  ```tsx
  <PresenceIndicator
    presenceUI={presenceItem}
    size="medium"
    showLastSeen={true}
    showTyping={true}
  />
  ```

### `TypingIndicator` Component

- [ ] Import: `import { TypingIndicator } from '@/components/chat/PresenceIndicator';`
- [ ] Add at top of message list (or above composer):
  ```tsx
  const typingUsers = presenceList.filter(p => p.is_typing);
  {typingUsers.length > 0 && (
    <TypingIndicator typingUsers={typingUsers} maxNames={2} />
  )}
  ```

### `PresenceList` Component

- [ ] Import: `import { PresenceList } from '@/components/chat/PresenceIndicator';`
- [ ] Add to conversation right sidebar or participant panel:
  ```tsx
  <PresenceList presenceList={presenceList} onlineFirst={true} />
  ```

## Message Send Integration

- [ ] In message send handler (e.g., `handleSendMessage`), after successful message INSERT:
  ```typescript
  const handleSendMessage = async (text: string) => {
    // Insert message to DB
    const { data } = await supabase.from('chat_messages').insert({ /* ... */ });
    
    // Clear message input
    setMessage('');
    
    // Update presence: last_message_at, clear typing
    await recordMessage();  // This calls the RPC
  };
  ```

## Routing & URL State

- [ ] Presence is **conversation-scoped** (not URL-dependent)
- [ ] On conversation change, `usePresence` hook automatically:
  - Unsubscribes from old conversation Realtime
  - Subscribes to new conversation
  - Ensures presence in new conversation
- [ ] No URL params needed (presence is session-only)

## Testing

### Manual Testing

1. **Open 2 browser windows** — Alice and Bob in same conversation
2. **Heartbeat test:**
   - [ ] Alice appears with green dot
   - [ ] Wait 30s → still green
   - [ ] Bob sees green dot next to Alice
3. **Typing test:**
   - [ ] Alice types in composer
   - [ ] "typing…" appears under Alice's name on Bob's screen
   - [ ] Typing clears 3s after Alice stops typing
   - [ ] Bob types → Alice sees typing indicator
4. **Last-seen test:**
   - [ ] Alice sends message
   - [ ] Bob sees "Last seen just now" under Alice (if offline)
   - [ ] After 1h idle, displays "Last seen 1h ago"
5. **Offline test:**
   - [ ] Close Alice's tab
   - [ ] After 5min, Alice's dot turns grey on Bob's screen
   - [ ] "Last seen Xm ago" appears

### Automated Testing

- [ ] Run test suite: `npm run test src/__tests__/chat/presence.test.ts`
- [ ] Verify RLS policies via migration test
- [ ] Verify RPC functions work as expected
- [ ] See `src/__tests__/chat/presence.test.ts` for full test checklist

## Performance Tuning

- [ ] Heartbeat interval: `30000ms` (can reduce to `15000ms` for snappier responsiveness)
- [ ] Typing timeout: `3000ms` (standard for chat apps)
- [ ] Debounce: `300ms` (standard for typing indicators)
- [ ] Consider reducing Realtime frequency if presence updates >10/sec

## Cleanup

- [ ] **Remove `PresenceDemo.tsx`** before merging to main
  - File: `src/components/chat/PresenceDemo.tsx`
  - This is example-only code

- [ ] **Keep for production:**
  - ✅ Migration: `supabase/migrations/20260610000000_chat_presence.sql`
  - ✅ Types: `src/lib/chat/presence.types.ts`
  - ✅ Hooks: `src/hooks/chat/usePresence.ts`, `useTypingIndicator.ts`
  - ✅ Components: `src/components/chat/PresenceIndicator.tsx`
  - ✅ Docs: `src/lib/chat/PRESENCE_SYSTEM.md`
  - ✅ Tests: `src/__tests__/chat/presence.test.ts`

## Commit Checklist

Before committing:

- [ ] Migration compiles without errors
- [ ] Types are exported correctly
- [ ] Hooks compile without TypeScript errors
- [ ] Components render without runtime errors
- [ ] Tests pass (or are skipped pending integration)
- [ ] No console warnings in dev server

**Suggested commit message:**
```
feat(chat): presence system — online status, typing indicators, last-seen

- ph_presence table with Realtime replication (heartbeat, typing_until, last_message_at)
- usePresence hook: 30s heartbeat, Realtime subscription, RPC wiring
- useTypingIndicator hook: 300ms debounce, 3s timeout, keystroke middleware
- PresenceIndicator, TypingIndicator, PresenceList components
- 4 RPC helpers: ensure_presence, set_typing, record_last_message, get_conversation_presence
- Full RLS + test coverage

Closes #XXXX (replace with ticket if applicable)
```

## Rollout Plan

1. **Phase 1:** Deploy migration to staging
2. **Phase 2:** Integrate `usePresence` + `useTypingIndicator` into `ChatMainView` / `MessageComposer`
3. **Phase 3:** Add presence indicators to sidebar + message list
4. **Phase 4:** Manual testing with multiple users
5. **Phase 5:** Deploy to production, monitor Realtime frequency + RPS

## Known Limitations

1. **No offline delivery** — typing indicators and presence are ephemeral (lost on disconnect)
2. **5min online timeout** — if heartbeat fails 5m, user marked offline (by design)
3. **Presence is conversation-scoped** — no global "all users online" view (future enhancement)
4. **No activity logging** — "Alice viewed message X" not tracked (future enhancement)
5. **Typing auto-clear** — if user leaves page without sending, typing clears at timeout (acceptable)

## Debugging

### Check presence row exists:
```sql
SELECT * FROM ph_presence WHERE conversation_id = '<uuid>' LIMIT 5;
```

### Check Realtime is broadcasting:
1. Open DevTools Console → check for `[RealtimeClient]` logs
2. Should see `subscribe: 'SUBSCRIBED'` on channel name
3. Should see event payload on INSERT/UPDATE/DELETE

### Check RLS is working:
```sql
-- As authenticated user (run via PostgREST API, not as service_role)
SELECT * FROM ph_presence WHERE conversation_id = '<uuid>';
-- Should return only presences for conversations you're a member of
```

### Check heartbeat is running:
```sql
-- Run every 30s
SELECT last_heartbeat FROM ph_presence WHERE user_id = '<your-uuid>';
-- Timestamp should update every 30s
```

## Support

See `src/lib/chat/PRESENCE_SYSTEM.md` for full architecture, API reference, and future enhancements.
