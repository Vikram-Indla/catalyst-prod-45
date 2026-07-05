# Plan Lock — CAT-CHAT-POLISH2-20260705-001

## Objective
Continue chat-v2 polish. Prior engagement (CAT-CHAT-V2-PROD-20260704-001,
CAT-CHAT-SLASH-20260705-001) covered: sidebar, empty state, message bubbles,
composer, reactions, notification menu, seen/read receipts, RTL shell, slash
commands, typography rescale, dock. This pass targets surfaces NOT yet
specifically audited: Thread pane, Search modal, Drafts/Scheduled/Sent, Summarize
panel, Later panel, EmojiPicker, ForwardModal, CreateChannel modals.

## Non-scope
No new features. No schema changes. No new dependencies. Fixes only —
consistency with the craft already established (rounded pill rows, focus traps,
ADS-remapped type scale, dir="auto" bidi, no color-law violations).

## Process
1. Discovery agent (read-only) sweeps the 8 unaudited surfaces for concrete
   file:line defects — no vague suggestions.
2. I triage findings into P1 (visual/functional inconsistency vs established
   pattern) / P2 (polish) / P3 (nice-to-have), verify each against live code.
3. Fix in priority order, live-verify each, run tests + tsc after each slice.
4. No regression: full chat-v2 + hooks/chat suite must stay green at every commit.

## Guardrails
- ADS/cv2 tokens only, zero hex/rgb/Tailwind color classes.
- Any new dialog gets useFocusTrap — matches the 13-dialog precedent already set.
- Any user-generated text gets dir="auto" — matches the established bidi pattern.
- Stage explicit files only; never git add -A (shared checkout has other
  sessions' uncommitted work in it).
