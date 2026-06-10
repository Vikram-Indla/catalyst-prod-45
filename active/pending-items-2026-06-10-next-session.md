# Pending Items Handover (Next Session)

**Created:** 2026-06-10  
**Priority:** P1 fixes (blocking design completion) → integration tests → edge cases  
**Estimated Time:** 4-5 hours total  

---

## IMMEDIATE (Phase C Design P1 Fixes) — 2-3h

### 1. H1 Loading Indicator on Toolbar Buttons
**File:** `src/components/chat/main/MessageActionsToolbar.tsx`  
**Issue:** Copy, mark unread, remind, turn-into-issue buttons disable during async ops but show no loading state.  
**Fix:**
- Add `isLoading` state tracking for each button
- Show `<Spinner size="small">` inside button during pending
- Update button label to "Loading…" OR keep icon + disabled attr + optional label
- Test: verify spinner visible while `onCopyLink` / `onMarkUnread` / `onRemind` / `onTurnIntoIssue` awaiting

**Code location:**
```tsx
// Line ~80: onCopyLink handler
const onCopyLink = async () => {
  setLoadingState(prev => ({...prev, copy: true}));
  try {
    // copy logic
  } finally {
    setLoadingState(prev => ({...prev, copy: false}));
  }
};

// Line ~120: render
{isLoading.copy && <Spinner size="small" />}
```

---

### 2. H2 Icon Clarity: "Turn Into Issue" Icon
**File:** `src/components/chat/main/MessageActionsToolbar.tsx`  
**Issue:** ArrowUpIcon doesn't metaphorically match "turn message into issue" (not Jira pattern).  
**Options:**
- Option A: Change to DocumentIcon or TicketIcon (if available in Atlaskit icons)
- Option B: Document as "Catalyst-specific affordance" in design system with custom icon
- Option C: Keep ArrowUpIcon but add tooltip: "Create work item from message" (more explicit)

**Decision needed:** Which icon? Recommend DocumentIcon (📝 = create note/issue).

---

### 3. H4 Button Consistency: Use @atlaskit/button
**File:** `src/components/chat/main/MessageActionsToolbar.tsx`  
**Issue:** Toolbar buttons are raw `<button>` HTML with inline styles, not `@atlaskit/button` (inconsistent with rest of app).  
**Fix:**
```tsx
import Button from '@atlaskit/button/standard-button';

// Before: <button onClick={onCopyLink} title="Copy message link" className="toolbar-btn">
// After:
<Button
  appearance="subtle"
  size="small"
  iconBefore={CopyIcon}
  title="Copy message link"
  onClick={onCopyLink}
  isDisabled={isLoading.copy}
/>
```

**Challenge:** Ensure Atlaskit Button padding/height matches current 28x28px design. May need `spacing="compact"` or custom sizing.

---

### 4. H6 CTA Visibility: "Add Reaction" Always Visible
**File:** `src/components/chat/main/MessageItem.tsx`  
**Issue:** Reaction affordance hidden until hover (toolbar opacity:0). Users won't discover without exploring.  
**Fix:**
- Add visible "Add reaction" button/emoji icon even when reaction count = 0
- OR: Add empty state placeholder: "Be the first to react — 👍"
- OR: One-time tooltip on first chat load: "Hover over messages for actions"

**Recommend:** Add emoji picker trigger button visible at all times (cleaner than placeholder text).

```tsx
// After last MessageReactions or in reactions section:
{!reactions.length && (
  <button onClick={() => setShowReactPicker(true)} title="Add reaction">
    😊 Add reaction
  </button>
)}
```

---

### 5. H10 Help Text: Document Toolbar Actions
**File:** `src/components/chat/main/ChatMainView.tsx` or `index.html`  
**Issue:** Toolbar actions not documented; users rely on hover/discovery.  
**Fix:**
- Add one-time tooltip on first chat load: "Hover over messages to copy, react, or turn into an issue"
- OR: Add help icon (?) next to conversation title linking to help doc
- OR: Add keyboard shortcut legend (? key opens cheat sheet)

**Recommend:** One-time banner on ChatMainView mount (use localStorage flag to show only once).

```tsx
const [showFirstTimeHint, setShowFirstTimeHint] = useState(
  !localStorage.getItem('catalyst.chat.first-time-hint-seen')
);

useEffect(() => {
  if (showFirstTimeHint) {
    localStorage.setItem('catalyst.chat.first-time-hint-seen', 'true');
  }
}, [showFirstTimeHint]);

// Render @atlaskit/flag or banner with hint + close button
```

---

## FOLLOW-UP (Integration Testing) — 1-2h

### E2: Notifications Integration
**Files:** 
- `src/hooks/chat/useChatNotifications.ts`
- `src/hooks/chat/usePushNotifications.ts`
- `src/hooks/chat/useMessagesWithNotifications.ts` (recommended entry point)

**Tests needed:**
1. **Permission flow:**
   - Request permission on first @mention
   - Verify browser shows permission dialog
   - Test deny + retry flow
   - Verify localStorage tracks permission state

2. **Toast notifications:**
   - Verify sent ✅ auto-dismiss 3s
   - Verify failed ❌ sticky (no auto-dismiss)
   - Verify reaction count toast

3. **Browser push:**
   - @mention when user away (document.hidden = true)
   - DM in 1-on-1 when away
   - Verify click → focus app + scroll to message

4. **Sound:**
   - Optional ping on @mention
   - Verify toggle in settings (future UI)

### E3: Presence Integration
**Files:**
- `src/hooks/chat/usePresence.ts`
- `src/lib/chat/presence.types.ts`

**Tests needed:**
1. **Heartbeat:**
   - 30s interval fires `ensure_presence` RPC
   - Verify `last_heartbeat` updated in DB
   - Offline detection after 5min silence

2. **Realtime subscription:**
   - Subscribe to presence channel on conversation load
   - Verify other users' online dots appear
   - Verify presence changes broadcast to all subscribers

3. **Typing indicator:**
   - Keystroke after 300ms shows "Alice is typing…"
   - Disappear on send or 3s idle
   - Verify no spam (debounce working)

4. **Last-seen:**
   - Update on message send
   - Display relative time ("2h ago")
   - Verify sync across devices

### E4: Custom Status Integration
**Files:**
- `src/hooks/chat/useUserStatus.ts`

**Tests needed:**
1. **Status picker modal:**
   - Emoji selector opens + closes
   - Text input accepts max 50 chars
   - Submit saves to `ph_user_status`

2. **Realtime broadcast:**
   - Other users see status update immediately
   - Verify Realtime channel subscription

3. **Display:**
   - Status emoji + message visible in sidebar + header
   - Truncate long messages (2 lines max)

---

## FOLLOW-UP (Phase F Edge Cases) — 1h

### Drag-to-Reorder localStorage
**File:** `src/components/chat/main/ConversationList.tsx`

**Tests:**
- Drag conversation item → order changes visually
- Reload page → order persists (localStorage.catalyst.chat.conversation-order)
- Delete conversation → order list cleaned up
- Add new conversation → inserted at top (or user position)
- localStorage recovery if corrupted (fallback to server order)

### ConversationCreationModal Validation
**File:** `src/components/chat/main/ConversationCreationModal.tsx`

**Tests:**
- Name required (1-on-1 auto-fills with contact name, group requires user input)
- Duplicate prevention (can't create 1-on-1 with someone twice)
- Member selection (min 1, max configurable)
- Cancel button dismisses without creating

### Search Conversations Performance
**File:** `src/components/chat/main/ConversationList.tsx`

**Tests:**
- Filter by name (instant, no debounce for <100 convos)
- Filter by last message text
- Clear search restores list
- Performance: 100+ conversations shouldn't lag

### Unread Badge Real-time Updates
**File:** `src/components/chat/main/ConversationList.tsx`

**Tests:**
- Mark conversation as read → badge disappears
- New message in background → badge appears
- Realtime broadcast: badge appears for all users immediately
- Badge count accuracy (multiple unread messages)

---

## Design Critique Re-Run — 2-3h

**Once P1 fixes land:**

1. **Screenshot all states** (ChatMainView):
   - Default (3 messages, active conversation)
   - Empty (0 messages)
   - Loading (skeleton state)
   - Error (network failure)
   - Dark mode (all above)
   - Conversation list (sidebar)
   - Notification (toast + push)
   - Typing indicator visible
   - Presence dots visible

2. **Measure against canonical** (Slack / Jira):
   - Row height (target: 48px)
   - Shadow depth on toolbar
   - Transition timing (hover → toolbar visibility)
   - Color contrast WCAG AA (all text, icons)
   - Keyboard focus outline (visible, not obscured)

3. **Re-run design-critique:**
   - Target: 27-28/30 after P1 fixes
   - Arrow protocol (before/after screenshots with annotations)
   - Resolve any new findings

---

## Performance Baseline — 1h

**Once integration tests pass:**

1. **MessageStream scroll performance:**
   - Load 1000 messages → scroll smooth?
   - Check if virtualization needed
   - Profile CPU/memory during scroll

2. **Realtime subscription churn:**
   - 50+ conversations open → how many subscriptions?
   - Verify unsubscribe on unmount (no leaks)
   - Test re-subscribe on reconnect

3. **Bundle size:**
   - Chat code + dependencies impact on app.js
   - Goal: <150kb (chat-only gzip)
   - Identify bloat (Atlaskit icons?, Notifications deps?)

---

## Success Criteria (Next Session Done)

- ✅ Phase C design audit re-run: 27-30/30
- ✅ E2/E3/E4 integration tests passing (5+ tests each subsystem)
- ✅ F edge cases: drag, modal validation, search, unread all working
- ✅ Performance baseline established (scroll, realtime, bundle)
- ✅ Zero console errors or warnings (chat module)
- ✅ WCAG 2.1 AA full audit passing (keyboard, color, screen reader)

---

## Start Next Session With

```bash
# Pull latest
git pull origin main

# Verify state
git log --oneline -5

# Run tests
npm test -- src/components/chat

# Run design-governance audit (should be 0 violations)
node design-governance/rules/audit.js src/components/chat

# Start dev server
npm run dev
```

**Branch:** Working on main (no feature branch needed for P1 fixes)

**Files to focus on:**
1. `src/components/chat/main/MessageActionsToolbar.tsx` (H1, H2, H4)
2. `src/components/chat/main/MessageItem.tsx` (H6)
3. `src/components/chat/ChatMainView.tsx` (H10)
4. Hook integration tests (E2/E3/E4)
5. `src/components/chat/main/ConversationList.tsx` (F edge cases)

---

**Estimated time to production-ready: 4-5 hours**

Start with Phase C P1 fixes, then move to integration tests, then edge cases. Design re-run at the end with fresh eyes.
