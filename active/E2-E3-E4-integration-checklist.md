# E2/E3/E4 Integration Test Checklist

**Date:** 2026-06-10  
**Status:** Manual verification steps (Jest not configured in project)  

---

## E2: Notifications Integration

### Permission Flow
- [ ] App loads → no permission banner (already granted or prompt shown)
- [ ] Click "Enable notifications" → browser asks permission
- [ ] Click "Allow" → localStorage stores `Notification.permission === 'granted'`
- [ ] Subsequent app loads → no prompt (stored)
- [ ] Click "Deny" → toasts still show, browser push disabled

### Toast Notifications
- [ ] Send message → toast "Message sent" appears + auto-dismisses after 3s
- [ ] Message send fails (network) → toast "Message failed" sticky + red background
- [ ] Click reaction → toast "Reaction added" appears + auto-dismisses
- [ ] Reaction fails (RLS) → toast "Reaction failed" sticky + red background

### Browser Push (Away Detection)
- [ ] Switch to another tab (document.hidden = true)
- [ ] Colleague mentions you in chat
- [ ] Browser notification appears with title + body
- [ ] Sound plays (if enabled)
- [ ] Click notification → app focuses + scroll to message
- [ ] Return to chat tab → notification goes away (no longer away)

### Mention Detection
- [ ] Message with `@alice` triggers push
- [ ] Message with `alice@example.com` (email) does NOT trigger push
- [ ] Message with `@here / @channel / @everyone` triggers push

---

## E3: Presence Integration

### Online Status Dots
- [ ] Open chat in 2 browsers (same user or different)
- [ ] Browser A: avatar shows green dot (online)
- [ ] Browser B: open same conversation → see Browser A's member in header with dot
- [ ] Browser A: switch to different tab (away) → dot turns grey after 5s
- [ ] Browser A: return to chat → dot turns green immediately

### Typing Indicator
- [ ] Browser A: type in composer → "Alice is typing…" appears in Browser B
- [ ] Browser A: stop typing or wait 3s → indicator disappears in Browser B
- [ ] Browser A: hit Enter (send) → indicator immediately disappears

### Last-Seen Timestamps
- [ ] Browser A: send message → composer clears + "now" timestamp on message
- [ ] Browser B: conversation list shows "just now" next to conversation
- [ ] Wait 5 minutes → Browser B shows "5m ago"
- [ ] Browser A: refresh page → last-seen still accurate

### Heartbeat (Server-Side Verification)
- [ ] Monitor DB: `ph_presence.last_heartbeat` for current user
- [ ] Heartbeat fires every 30s (check timestamps)
- [ ] Close tab → heartbeat stops (no more updates)
- [ ] Open tab again → heartbeat resumes

---

## E4: Reactions Integration

### Optimistic Updates
- [ ] Hover over message → reaction picker appears
- [ ] Click emoji (👍) → chip appears IMMEDIATELY (optimistic)
- [ ] Network delay 2s → chip stays visible during wait
- [ ] Server confirms → chip persists with correct count

### Server Sync
- [ ] Browser A: react with 👍
- [ ] Refresh browser or check DB: `ph_comment_reactions` row exists for emoji + user
- [ ] Browser B (same conversation): see 👍 chip with count = 1

### Conflict Handling
- [ ] Rapid-click same emoji 5x → only 1 reaction created (not 5)
- [ ] Browser A + B simultaneously click different emoji → both reactions appear

### RLS Enforcement
- [ ] Browser A: non-member tries to react → 403 error toast
- [ ] Browser A: non-member tries to view reactions → none displayed

### Reaction Removal
- [ ] Click reaction chip twice → first click adds, second click removes
- [ ] DB confirms row deleted
- [ ] Browser B (same conversation): chip disappears for non-owner

---

## Multi-User Scenarios (Realtime)

### Concurrent Mentions
- [ ] Browser A + B both mention user C simultaneously
- [ ] User C receives 2 browser notifications (or deduplicated to 1)
- [ ] Both mentions appear in conversation

### Reaction Broadcast
- [ ] Browser A: react with 🎉
- [ ] Browser B (same conversation): sees 🎉 chip within 500ms
- [ ] Realtime subscription propagates change

### Presence Sync
- [ ] 5 browsers in same conversation
- [ ] Member stack in header shows all 5 avatars
- [ ] Close 1 browser → stack updates to 4 within 1-2s

---

## RLS Policy Verification

### Permissions Test
- [ ] Create test user WITHOUT project membership
- [ ] Try to read conversation messages → 0 rows (RLS blocks)
- [ ] Try to post reaction → 403 error (RLS blocks)
- [ ] Try to update presence → 403 error (RLS blocks)

### Membership Check
- [ ] Add test user to project members
- [ ] Try to read conversation → now visible
- [ ] Try to react → success

---

## Findings Template

Copy for real testing:

```
### E2 Notifications
- [x/x] Permission flow
- [?] Toast auto-dismiss timing (expected 3s)
- [?] Browser push sound (if enabled)
- [?] Away detection (tab switch)
- Issues: [list any bugs found]

### E3 Presence
- [x/x] Online dots update
- [?] Typing indicator latency (expected <1s)
- [?] Heartbeat frequency (expected 30s)
- Issues: [list any bugs found]

### E4 Reactions
- [x/x] Optimistic update
- [?] Conflict deduplication
- [?] RLS blocks non-members
- Issues: [list any bugs found]
```

---

## Notes

- Realtime latency target: <500ms for all subscriptions
- Toast auto-dismiss: 3s for success/info, sticky for error/warning
- Heartbeat interval: 30s (logged per update in DB)
- Permission request: once per session, not on every app load
