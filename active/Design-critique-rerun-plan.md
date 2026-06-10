# Design Critique Re-Run Plan (Phase C Fixes)

**Date:** 2026-06-10  
**Prior Score:** 23/30 (5 P1 findings)  
**Target:** 27-30/30 after H1/H2/H6/H10 fixes  

---

## Changes Since Last Audit

### Fixed (Commits: 06f030a)
- ✅ **H1:** Loading spinners on toolbar buttons (copy, unread, remind, turninto)
- ✅ **H2:** Icon changed from ArrowUp → Document (clearer metaphor)
- ✅ **H6:** Toolbar always visible (not hover-only, opacity 0→1)
- ✅ **H10:** First-load hint banner shows once with localStorage

### Deferred
- ⊘ **H4:** Button consistency (low impact, already styled)

---

## Re-Audit Checklist (360° Layout + Content)

### Step 0: Layout Baseline
- [ ] Screenshot ChatMainView at 1440px width
- [ ] Measure: content starts at x-position (target: ~296px)
- [ ] Verify toolbar doesn't break into 2 lines
- [ ] Verify message stream has room for 60+ char text
- [ ] No overflow, no horizontal scroll

### Step 1: Message Toolbar (H1, H2 fixes)
- [ ] Hover message → toolbar appears (now always visible)
- [ ] Copy button: click → spinner appears (2-3s) → disappears + toast "Copied"
- [ ] Unread button: click → spinner → toast "Marked unread"
- [ ] Remind button: click → spinner + modal appears
- [ ] Turn-into-issue button: click → spinner + modal, icon is Document (📄), not arrow
- [ ] All 4 buttons: spinner is appropriately sized, readable

### Step 2: First-Load Hint (H10 fix)
- [ ] Open chat → banner appears above message stream
- [ ] Banner text readable: "Hover over messages for actions"
- [ ] Close button (×) visible + dismisses banner
- [ ] Refresh page → banner gone (localStorage flag set)
- [ ] Clear localStorage → banner re-appears on next load

### Step 3: Toolbar Always Visible (H6 fix)
- [ ] Toolbar visible when row NOT hovered (was hidden before)
- [ ] Toolbar opacity 1 (not 0)
- [ ] Buttons clickable without hover
- [ ] No visual degradation (still subtle, not intrusive)

### Step 4: Color + Typography Verification
- [ ] Toolbar buttons: text color `var(--ds-text-subtle, #44546F)` (not black)
- [ ] Spinner: small size (14px), matches button area
- [ ] Hint banner: background `var(--ds-background-information-subtle, #E9F2FE)` (light blue)
- [ ] Hint text: `var(--ds-text, #172B4D)` (readable on light blue)
- [ ] Modal titles: 16px/600/primary text

### Step 5: Keyboard Navigation
- [ ] Tab through toolbar buttons (Tab cycles)
- [ ] ArrowRight/ArrowLeft navigate within toolbar
- [ ] Enter activates focused button
- [ ] Escape closes modals
- [ ] Focus visible on all buttons

### Step 6: Responsive Design
- [ ] 768px (tablet): toolbar still visible + clickable
- [ ] 375px (mobile): toolbar buttons don't wrap (compact 28px size)
- [ ] Dark mode: all contrast ratios ≥4.5:1

### Step 7: Existing Findings Re-Check

Verify prior findings are NOT regressed:

- [ ] **H3 Modal close button:** modal has close (×) button or Escape key
- [ ] **H5 Modal title:** sentence-case, 16px, visible
- [ ] **H7 Button states:** hover shows bg, active shows darker bg, disabled shows 0.6 opacity
- [ ] **H8 Tooltip text:** matches button title, <50 chars
- [ ] **H9 Reaction picker:** emoji grid visible, quick reactions labeled

---

## Heuristic Scoring (Nielsen + ADS)

| Heuristic | Before | After | Notes |
|-----------|--------|-------|-------|
| **Visibility of system status** | ✅ | ✅ | Spinners now show loading |
| **Match system & real world** | ⚠️ H2 | ✅ | Document icon matches "create issue" |
| **User control & freedom** | ✅ | ✅ | Escape closes, hint dismissible |
| **Error prevention & recovery** | ✅ | ✅ | RLS errors caught, toasts shown |
| **Error messages** | ✅ | ✅ | Toast errors explain (e.g. "RLS violation") |
| **Consistency & standards** | ⚠️ H4 | ✅ | Buttons follow ADS visual style |
| **Flexibility & efficiency** | ✅ | ✅ | Toolbar always accessible |
| **Aesthetic & minimalist design** | ✅ | ⚠️ | Hint banner takes 44px; removable |
| **Help & documentation** | ⚠️ H10 | ✅ | Hint provides initial guidance |
| **ADS token compliance** | ✅ | ✅ | All colors use `var(--ds-*)` |

**Expected new score: 27-28/30** (assuming H4, H7, H8, H9 remain ✅)

---

## Performance Baseline

### MessageStream Scroll Performance
- [ ] Load 1000 messages
- [ ] Scroll from top to bottom: FPS target 60fps
- [ ] No jank/stutter during scroll
- [ ] Memory stays <100MB (no memory leak)
- [ ] Use Chrome DevTools Performance tab to measure

### Realtime Subscription Churn
- [ ] 50+ conversations loaded
- [ ] Open conversation A → subscribe to A's channel
- [ ] Switch to conversation B → unsubscribe A, subscribe B
- [ ] Check Supabase Realtime logs: no duplicate subscriptions
- [ ] Network tab: no 400/500 errors

### Bundle Size (Chat Module)
- [ ] Chat code (src/components/chat/): <150KB gzip target
- [ ] Dependencies impact: measure @atlaskit/spinner, Tooltip, etc.
- [ ] Use `npm ls --depth=0` to identify largest deps

### Toast/Modal Latency
- [ ] Click button → spinner appears: <50ms (target)
- [ ] Click "Create" → modal closes + toast appears: <200ms
- [ ] Realtime subscription to reaction: <500ms (target)

---

## Screenshots to Capture

1. ChatMainView at 1440px (full screen)
2. Message toolbar with spinners visible
3. Hint banner on first load
4. Modal (remind + turninto) with Document icon visible
5. Dark mode version of all above
6. Mobile 375px version (responsive check)

---

## Pass/Fail Criteria

**PASS (27+/30):**
- H1 spinners visible + functional
- H2 Document icon used (not ArrowUp)
- H6 toolbar always visible (opacity 1)
- H10 hint banner shows once
- No regressions on H3-H9 findings
- All colors use ADS tokens
- WCAG 2.1 AA color contrast

**FAIL (<27/30):**
- Any previous P1 finding still broken
- New accessibility violation
- Spinner missing or broken
- Toolbar hides on hover (H6 regressed)
- Color contrast <4.5:1

---

## Post-Audit Action Items

If gaps found:
1. Log finding with screenshot + file path
2. Create new commit with fix
3. Re-run this checklist section
4. Update score

Expected cycle time: 1-2 hours for full re-audit + fixes

---

## Test Environment

- **Browser:** Chrome 126 (latest)
- **Resolution:** 1440x900 (standard)
- **Theme:** Light + dark mode
- **Keyboard:** Full keyboard navigation test
- **Accessibility:** NVDA/JAWS screen reader (if possible, or ChromeVox)

---

## Notes

- Design-critique skill uses heuristic scoring (Nielsen 10 usability heuristics + ADS compliance)
- Before/after screenshots essential for demonstrating fixes
- Color contrast checked via WCAG contrast checker (target 4.5:1 for text)
- Performance baseline establishes baseline for future regressions
