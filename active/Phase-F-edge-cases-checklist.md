# Phase F Edge Cases Verification Checklist

**Date:** 2026-06-10  
**Scope:** ConversationList, ConversationCreationModal, Unread badge updates  

---

## 1. Drag-to-Reorder localStorage

### Test Steps
- [ ] Conversation list loaded (5+ conversations visible)
- [ ] Drag "Project Chat" to position 2 (was position 1)
- [ ] Verify visual order updates immediately
- [ ] Refresh page → order persists (localStorage key: `catalyst.chat.conversation-order`)
- [ ] Drag another conversation → order updates again
- [ ] Open DevTools → check localStorage key contains JSON array of IDs in correct order

### Edge Cases
- [ ] Delete conversation → order list cleaned up (deleted ID removed)
- [ ] Create new conversation → inserted at top (or user-specified position)
- [ ] Clear localStorage manually → fallback to server order (no crash)
- [ ] localStorage corrupted (invalid JSON) → catch error + reset to server order
- [ ] 100+ conversations → performance still smooth (no lag during drag)

### Expected Behavior
- localStorage updates on every drag drop
- Server order is fallback (RLS enforced, user's own ordering only)
- No network calls during drag (client-side only)

---

## 2. ConversationCreationModal Validation

### Test Steps
- [ ] Click "+" button → modal opens
- [ ] Leave name field empty → "Create" button is disabled
- [ ] Type name → "Create" becomes enabled
- [ ] Try to create conversation with same name + same member(s) → error "Conversation already exists"
- [ ] Create 1-on-1 with "Alice" → modal auto-fills "Alice" as name
- [ ] Create group with 3 members → name required (not auto-filled)

### Member Selection
- [ ] Click member field → dropdown shows available users
- [ ] Select 5 members → all appear as chips
- [ ] Try to add same member twice → deduped (appears once)
- [ ] Remove member chip → reflected in member list
- [ ] Try to create with 0 members selected → error "Select at least 1 member"
- [ ] Try to create with >50 members → error "Max 50 members per conversation"

### Duplicate Prevention
- [ ] Create conversation with "Alice" + "Bob"
- [ ] Try to create again with "Alice" + "Bob" → error "Already exists"
- [ ] Create with "Alice" + "Bob" + "Carol" (different 3rd member) → allowed (different set)

### Error Handling
- [ ] Network fails during create → error toast "Failed to create conversation"
- [ ] User loses permission (RLS) → error toast "Permission denied"
- [ ] Required field missing → validation error above field

### Expected Behavior
- Name required (except 1-on-1 with auto-fill)
- Member selection required (min 1)
- Duplicate name+members detected server-side
- Form validates before sending

---

## 3. Search Conversations Performance

### Test Steps
- [ ] Conversation list loaded (50+ conversations)
- [ ] Type "project" in search → results filter immediately (<200ms)
- [ ] Type "alice" → shows only conversations with "alice" in name
- [ ] Search by last message content (future: search messages) → shows relevant conversations
- [ ] Clear search → list restores to full order (or reorder)

### Performance Edge Cases
- [ ] 100 conversations loaded → search still responsive
- [ ] Rapid typing (10 keystrokes/sec) → no lag, results update smoothly
- [ ] Search term with special chars "@alice" → no crash
- [ ] Very long search term (100 chars) → handled gracefully

### Expected Behavior
- Client-side filter (no server call per keystroke)
- Case-insensitive search
- Search matches name + last message preview
- Results update as user types (live filtering)

---

## 4. Unread Badge Real-time Updates

### Test Steps
- [ ] Conversation A has 3 unread messages
- [ ] Click conversation A → message list loads + mark as read
- [ ] Badge disappears from conversation list (was "3", now empty)
- [ ] Browser B (same user): unread badge also disappears (Realtime sync)

### Mark as Read
- [ ] New message arrives while conversation is open → unread badge appears
- [ ] Scroll to message → auto-mark as read (or click button)
- [ ] Badge disappears
- [ ] Realtime broadcasts update to other browsers

### Multiple Browsers
- [ ] Browser A: conversation list shows "5" unread for Chat-Team
- [ ] Browser B: open Chat-Team conversation
- [ ] Browser A: badge updates to "0" within 1-2s (Realtime)

### Edge Cases
- [ ] Mark all as read → all badges disappear
- [ ] New message arrives while marking read → correct count displayed (not 0)
- [ ] Rapid message arrivals → badge count always accurate
- [ ] Offline (network lost) → mark as read queued, synced on reconnect

### Badge Accuracy
- [ ] Unread count = messages since last_seen timestamp
- [ ] Reading message with threads → only parent counts as read
- [ ] Thread replies don't affect parent unread count

---

## Dark Mode / Light Mode

### Visual Verification
- [ ] Switch to dark mode → conversation list background updates
- [ ] Text contrast still WCAG AA in dark mode
- [ ] Badge colors visible in both modes
- [ ] Hover states clear in both modes

---

## Keyboard Navigation

### Conversation List
- [ ] Tab → cycles through conversations
- [ ] Arrow Up/Down → navigate within list
- [ ] Enter → select conversation
- [ ] Escape → blur list (if focused)

### Search Input
- [ ] Focus search field → type search term
- [ ] Arrow Down → focus first conversation
- [ ] Tab → cycle through conversations (search stays open)
- [ ] Escape → close search, restore full list

---

## Accessibility (WCAG 2.1 AA)

### Screen Reader
- [ ] Conversation list announces "3 conversations"
- [ ] Each conversation announces: "Chat Team, 5 unread messages, Alice, Bob, Carol"
- [ ] Unread badge announced: "5 new messages"
- [ ] Search input labeled "Search conversations"

### Focus Management
- [ ] Focus order is logical: search → conversations → create button
- [ ] Focus outline visible on all interactive elements
- [ ] Tab order matches visual order

---

## Test Results Template

```
### Drag-to-Reorder
- [x] Order persists after refresh
- [x] localStorage updates on drag
- [?] Performance with 100+ conversations
- Issues: [list]

### ConversationCreationModal
- [x] Name validation
- [x] Duplicate prevention
- [?] Member selection UX
- Issues: [list]

### Search Performance
- [x] Results filter <200ms
- [x] Handles 50+ conversations
- [?] Special characters
- Issues: [list]

### Unread Badge Updates
- [x] Badge appears/disappears correctly
- [x] Realtime sync between browsers
- [?] Rapid message arrivals
- Issues: [list]
```

---

## Notes

- All timestamps should use ISO format (UTC)
- localStorage keys prefixed with `catalyst.chat.`
- Realtime updates expected within 500ms
- Dark mode uses `prefer-color-scheme: dark` media query + CSS vars
