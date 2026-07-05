# Handover — CAT-CHAT-POLISH2-20260705-001

## State: COMPLETE for this pass. No regression.

Discovery-agent sweep of 8 previously-unaudited chat-v2 surfaces (Thread, Search,
Drafts, Summarize, Later, EmojiPicker, Forward, CreateChannel) found 9 candidate
defects; triaged and fixed the real ones.

## Fixed (82a25cd57)
- **Thread reply reactions were fully dead**, not just a UI no-op:
  `useThreadMessages.ts`'s `fetchThread()` hardcoded `reactions: []` — never
  queried `chat_message_reactions`. Added the same aggregation used by
  `useMessages.ts` (mirrored, not exported — kept hooks decoupled), threaded
  `myId` through for `reactedByMe`. Wired `ThreadPane`'s reply bubbles to
  `useChatMessageActions.toggleReaction`. Live-verified via SQL insert + reopen:
  "headsup" reply shows 🔥1.
- RTL gaps: `WorkspaceSearchResultsPanel` snippet + "in {channel}" line, and
  `ForwardModal`'s forwarded-message preview — both missing `dir="auto"`.
  Matches the bidi pattern already established everywhere else in chat-v2.

## Verified NOT a defect (agent false positive)
`SummarizeMenu` "missing useFocusTrap" — it's a small anchored popover
(like MentionPicker/SlashCommandPicker), correctly untrapped per the
established precedent: only *blocking modals* get focus-trapped, contextual
menus don't (they'd break click-through-to-dismiss and composer focus flow).

## Gates
tsc clean; chat-v2 + hooks/chat 113/113, 0 failed suites (JSON-verified).
ads-audit: 4 remaining offender lines are pre-existing px values in code
this diff never touched — verified line-by-line, not mine.

## Deferred (P2/P3, not fixed this pass — low-impact, cosmetic)
- Assorted hardcoded borderRadius values (2/4/6/8/11px) across Search/EmojiPicker/
  Forward/Later vs cv2-radius tokens — cosmetic only, values are close to the
  token scale already; not worth the diff churn without a visual-QA pass.
- LaterPanel using `var(--cv2-fs-sidebar-header)` instead of the ADS remap —
  verify visually before touching; may be intentional (sidebar-header context).
