# Patch log — iteration 3 (continuation, post-handoff verification)
Date: 2026-04-27
Surface: BAU list (groupBy=status)
Auditor: Claude (jira-compare skill v3, Cowork session — iter-3 continuation)

## Why this continuation exists

The original iter-3 patch (chromeBg/cardPadding/cardBorder props on AtlaskitPageShell.tsx)
was applied earlier the same day. Vikram's screenshot review then surfaced four post-ship
findings (F-NEW-1..F-NEW-4) and a Phase 9 Context Handoff was emitted pointing at a fresh
conversation to process them. This is that fresh conversation's continuation log.

When this conversation opened, F-NEW-1 was assumed pending. Re-reading
patches/iter3.md and re-probing both surfaces confirmed F-NEW-1 IS already live and
correct. So this continuation processes F-NEW-2 and F-NEW-3 as handoffs, queues F-NEW-4
as a /regression invocation, and ships.

## What changed in this continuation

| File | Change |
|---|---|
| `.catalyst/audits/jira-compare/2026-04-27-bau-list-grouped/handoffs/LOVABLE-F-NEW-2-inline-create-group.md` | NEW — full LOVABLE prompt for the per-group "+ Add group item" inline create row, with Jira testids and coords baked in (L17). |
| `.catalyst/audits/jira-compare/2026-04-27-bau-list-grouped/handoffs/CC-F-NEW-3-issue-chevron-uniform.md` | NEW — CC Task Brief for the uniform issue chevron slot. Spec corrected: Jira renders the chevron slot on EVERY issue row, not just parents — which differs from the original handoff text. |
| `.catalyst/audits/jira-compare/2026-04-27-bau-list-grouped/handoffs/F-NEW-4-run-regression.md` | NEW — invocation block + carryover punch list for the auto-chained /regression run. |
| `.catalyst/audits/jira-compare/2026-04-27-bau-list-grouped/patches/iter3-continuation.md` | THIS file. |

No `src/` files touched in this continuation — all four findings were either already
patched (F-NEW-1) or are external-handoff-only (F-NEW-2 LOVABLE, F-NEW-3 CC, F-NEW-4
/regression).

## Re-probe results (iter-3 continuation)

Probe date: 2026-04-27, viewport Jira 1093×971, Catalyst 1710×981.

### F-NEW-1 — page chrome bg
| Metric | Jira | Catalyst | Verdict |
|---|---|---|---|
| Body bg | rgb(255, 255, 255) | rgb(255, 255, 255) | match |
| Chrome layer bg (depth 1 from edge) | rgb(233, 242, 254) | rgb(233, 242, 254) | ✓ match |
| Chrome layer DOM | unsafe-design-system-page-layout-root child div with classes `_4t3i1osq _1e0c1txw _2lx21bp4 _9beo1bgi _11q3ne5i` | AtlaskitPageShell outer wrapper with style background={chromeBg} | structural parity acceptable |

CRITICAL: the chrome bg is NOT painted on body. It's painted on a div one level inside
`unsafe-design-system-page-layout-root`. The original probe at body-level returned white
in iter-1, then iter-3 re-probed at edge points and caught the inner div correctly.
This continuation re-confirms the inner-div paint with ancestor-chain walking.

### F-NEW-2 — inline create row at group header
| Element | Jira | Catalyst | Verdict |
|---|---|---|---|
| Per-group "+" button | testid `business-list.common.ui.create-issue-plus-button.child-create-button-wrapper` at (203, 329) on each group header, 24×24 | NOT PRESENT — 0 matches for any per-group create affordance | P0 gap, LOVABLE handoff emitted |
| Sticky bottom "+ Create" | NOT present in Jira (Jira only has top-right Create + per-group +) | PRESENT in Catalyst | acceptable difference; Catalyst keeps both |

### F-NEW-3 — issue chevron uniform slot
| Element | Jira | Catalyst | Verdict |
|---|---|---|---|
| Issue-row chevron slot | testid `business-list.ui.list-view.base-table.expand-icon.expand-button` at x=121 y=370+, 24×24, on EVERY visible issue row (12 captured) | NOT PRESENT — 0 expand buttons on issue rows; group rows render literal `▾` character only | P0 gap, CC handoff emitted |
| Group-row chevron | testid `business-list.ui.list-view.group-item.expand-icon.expand-icon-wrapper-{n}` at x=101, 24×24 button | literal Unicode `▾` character in row text (text content "▾ AWAITING INFO 21") | P1 — should also be replaced with @atlaskit/icon button per L11 |

## Handoff index (continuation)

| Tag | Finding | Status | File |
|---|---|---|---|
| [LOVABLE] | F-NEW-2 inline create at group | emitted | handoffs/LOVABLE-F-NEW-2-inline-create-group.md |
| [CLAUDE CODE] | F-NEW-3 issue chevron uniform slot | emitted | handoffs/CC-F-NEW-3-issue-chevron-uniform.md |
| [REGRESSION] | F-NEW-4 full-page geometry parity | queued for auto-chain | handoffs/F-NEW-4-run-regression.md |
| [LOVABLE] | #1 avatar strip + Add people | carryover | handoffs/LOVABLE-01-avatar-strip-add-people.md |
| [DESIGN-CRITIQUE] | #9 top-right CTAs | carryover | handoffs/DESIGN-CRITIQUE-09-top-right-ctas.md |
| [A11Y] | #11 + #13 (AvatarGroup) | carryover, depends on LOVABLE #1 | (inline in audit) |

## Phase 8 wiring test (carryover from iter-2)

Not re-run in this continuation (no `src/` changes since iter-2 close). Last verified
state from `patches/iter2.md`:
  - Row click → side panel ✓
  - Group expand/collapse ✓
  - Group pill → URL round-trip ✓
  - More Actions menu ✓
  - View Options menu ✓
  - Row inline edit save / Group-Sort independence (carryover, no code touched)
  - Epic→Story expand: not testable on ?groupBy=status (flat list); to be re-tested
    after F-NEW-3 lands (chevron slot needed first).

## Lessons appended to skill (proposed §19 entries)

### L24 — Chrome bg lives on an INNER div, not body
**Date:** 2026-04-27
**Pattern:** Iter-1 audit reported "Jira body bg is white, Catalyst is correct." In
fact Jira paints `rgb(233, 242, 254)` on a div one level inside
`unsafe-design-system-page-layout-root`, not the body. Probing only `getComputedStyle(body)`
misses it. The right probe walks the ancestor chain at edge coords (e.g., 2,2 or
w-2,h-2) and reports the first non-transparent bg found.
**Rule:** When auditing page-chrome bg parity, probe edge coordinates with ancestor
walk. The body element is rarely the chrome painter — it's almost always an inner
layout container. Update §2 probe payload to require an ancestor chain alongside the
flat element-from-point lookup.

### L25 — Spec text drifts from live DOM; re-probe before scoping the fix
**Date:** 2026-04-27
**Pattern:** F-NEW-3 handoff text said "render chevron only when row has children."
Live Jira probe shows the chevron slot is uniform on ALL issue rows; only the icon
visibility/orientation varies. Designing the fix to the handoff text would have left
rows without children with no slot, which would misalign the column grid by 24px.
**Rule:** Even when a handoff is already written, re-probe before generating the CC
brief / Lovable prompt. Bake the actual probe payload (testids, coordinates, parent
geometry) into the handoff so downstream tools (Lovable, Claude Code) can verify
without re-probing. L17 codified this for Rovo prompts; this lesson extends it to all
handoff types.

### L26 — patches/iter<n>.md exists ≠ patch is in source
**Date:** 2026-04-27
**Pattern:** This continuation found `patches/iter3.md` already in the repo; reading
its claims about F-NEW-1 took the patch on faith. The skill mandate is "DOM probe is
ground truth." Proceeded to re-probe, confirmed the patch was real. But future
continuations should ALWAYS re-probe rather than trust patches/iter<n>.md as the
oracle — file existence proves intent, not application.
**Rule:** When opening a continuation conversation and finding existing patch logs,
re-probe the surface BEFORE deciding what's open vs closed. Trust the DOM, not the
markdown.

## Ship decision

**SHIPPABLE** for /jira-compare scope. Three external handoffs are emitted with
real probe payloads. Auto-chain to /regression per Vikram's Phase 0 confirmation.

Final files modified in iter-3 cumulative:
  1. src/components/ads/AtlaskitPageShell.tsx (iter-3 base — additive props)
  2. src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx (iter-3 base — opt-in)
  3. .catalyst/audits/jira-compare/2026-04-27-bau-list-grouped/handoffs/LOVABLE-F-NEW-2-inline-create-group.md (this continuation)
  4. .catalyst/audits/jira-compare/2026-04-27-bau-list-grouped/handoffs/CC-F-NEW-3-issue-chevron-uniform.md (this continuation)
  5. .catalyst/audits/jira-compare/2026-04-27-bau-list-grouped/handoffs/F-NEW-4-run-regression.md (this continuation)
  6. .catalyst/audits/jira-compare/2026-04-27-bau-list-grouped/patches/iter3-continuation.md (this file)
