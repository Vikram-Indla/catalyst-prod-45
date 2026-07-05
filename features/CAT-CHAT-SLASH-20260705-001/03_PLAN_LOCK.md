# Plan Lock — CAT-CHAT-SLASH-20260705-001

## Objective
Deliver the not-built Slack-inventory items in sequence, uninterrupted:
1. Slash command palette (`/`) — THIS slice
2. Channel-level read receipts
3. Chat i18n scaffold + shell RTL mirroring
4. Huddle >4 (SFU) — dependency whitelist request (no blind install)

## Slice 1 — Slash command palette
Mirror the existing `@` mention system exactly (readMentionTrigger → MentionPicker →
replaceMentionAtCaret). Trigger only when the composer text is `^/(\w*)$` (slash at the
absolute start, no space yet) — Slack semantics.

**Commands (real only, zero-assumption — no fake actions):**
- Text inserts (composer-local): `/shrug`, `/tableflip`, `/unflip`, `/lenny` → replace the
  `/cmd` token with the glyph, caret after.
- Action commands (injected by MessagePanel, real wired handlers): `/huddle` → onStartHuddle.
  Extensible via a `slashActions` prop so conversation-aware actions can be added without
  touching the composer.

**Files:**
- NEW `components/SlashCommandPicker/SlashCommandPicker.tsx` + `commands.ts`
- EDIT `Composer/ComposerEditor.tsx` (add onSlashTrigger + readSlashTrigger + replaceAll handle)
- EDIT `Composer/Composer.tsx` (slashState, render picker, handlePickSlash, slashActions prop)
- EDIT `MessagePanel/MessagePanel.tsx` (pass slashActions=[huddle])
- NEW tests for the trigger regex + command registry

**Guardrails:** ADS tokens only; keyboard nav (↑↓ enter esc) + aria; no new deps; tsc clean;
chat suites green; live-verify in browser; no regression to mention/emoji triggers.

**Stop conditions:** slash trigger must NOT fire mid-message (only at start); must not
collide with the mention `@` trigger; picker must trap arrow keys without breaking Enter-to-send.
