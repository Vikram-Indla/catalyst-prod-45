# WAYS OF WORKING — MANDATORY FOR ALL IMPLEMENTATION

These rules apply to every implementation task. No exceptions.

---

## TDD Cycle (non-negotiable)

1. **Write a failing test first.** No implementation code before a test exists.
2. **Write the minimal code** to make the test pass — nothing more.
3. **Refactor** only after the test is green, and only if needed for clarity.

If asked to implement something without a test path (e.g. UI-only, no test harness), state this explicitly and ask Vikram how to proceed before writing any code.

---

## Small Steps — One Logical Change at a Time

After every single logical change (one test, one implementation unit, one refactor):

1. **Stop.**
2. **Explain** what was done and why.
3. **Suggest a commit message** (imperative, under 72 chars).
4. **Ask for confirmation** before proceeding to the next step.

Do NOT generate full solutions in one go. Do NOT bundle multiple logical changes into one response.

---

## Code Quality Rules

- Prefer **simple, readable, maintainable** code over clever code.
- Follow **clean architecture**: separate concerns, keep components/modules focused on one responsibility.
- No dead code, no speculative abstractions, no features beyond what the spec asks for.
- Default to **no comments** — only add one when the WHY is non-obvious.
- No backwards-compatibility shims for things that don't exist yet.

---

## When Unclear — Ask, Don't Assume

If a spec, requirement, or edge case is ambiguous: **stop and ask Vikram** before writing any code. State exactly what is unclear and offer 2–3 concrete options if possible.

---

## Output Format Per Step

Each response during an implementation session must follow this structure:

```
**Step N — [brief description]**

Test (failing):
[test code]

---
Awaiting approval to proceed with implementation.
```

After approval:

```
**Step N — Implementation**

[minimal implementation code only]

Suggested commit: `<imperative message>`

---
Ready for next step when you confirm.
```

---

# jira-compare — compounding lessons

Append-only. Newest at top. Each entry: date, pattern, rule, surface.

---

## 2026-05-05 — Schema-probe before field add, in practice (B4 anti-pattern #18 applied)
**Surface:** CatalystSidebarDetails right rail
**Pattern:** B4 4a/4b spec said "add Time tracking + Components + Due date to right rail." Before coding, ran `getJiraIssueTypeMetaWithFields` for all 9 BAU types (Story 10006 / Task 10010 / QA Bug 10012 / PI 10045 / Business Gap 10035 / Backend 10022 / Feature 10173 / CR 10305 / API Req 10206). Result: `timetracking` and `components` are NOT in ANY BAU type's screen scheme. `duedate` is in Backend (subtask family share screen), Production Incident, Change Request, Epic only. Adding Time tracking + Components would have shipped fields with no Jira backing — anti-pattern #18 violation. Only Due date was added, gated on the 3 confirmed types (Epic already had its own block).
**Rule:** Anti-pattern #18 isn't theoretical. The audit's pending list is a snapshot — re-probe at code time, not just at audit time. The Distilled-note finding "right rail Dev / More fields / Automation trays missing" was framed in terms of standard Jira; the BAU project schemas reject most of that scope. Honor the schema, not the Atlassian stock catalogue.

## 2026-05-05 — EpicDueDateField generalized to non-Epic types
**Surface:** EpicDueDateField + CatalystSidebarDetails (B4 4a)
**Pattern:** B4 needed Due date on Backend / Production Incident / Change Request. The existing `EpicDueDateField` had `if (!isEpic) return null;` as a defensive guard. Removed the guard — the `isEpic` prop is kept on the signature so existing Epic callers don't break, but it no longer affects rendering. Component now renders whenever the caller passes it; the schema gate lives at the call site (`normalizeIssueTypeBucket(issue.issue_type) === 'subtask' || issue.issue_type === 'Production Incident' || issue.issue_type === 'Change Request'`).
**Rule:** When generalizing a component, remove early-return guards rather than passing dummy values from new callers. Keep the prop signature stable so old callers don't break, mark the prop semantically deprecated in the docstring. Don't rename the file just to chase the name — naming churn breaks too many imports.

## 2026-05-05 — Watchers manage-popover (eye glyph + click-outside, B1)
**Surface:** WatchersChip
**Pattern:** Eye glyph swap shipped 2026-05-03. Manage-popover added 2026-05-05: `WatchersChip` opens an absolutely-positioned popover (260-320px wide) listing watchers with avatars + names, plus a primary "Start watching" / subtle "Stop watching" button. Self-rolled `useRef` triggerRef + popupRef + `mousedown` listener for click-outside — `@atlaskit/popup` v4.16 has the empty-portal bug noted in `AllProjectsTable.tsx:19-22`. `useCatalystWatchers` extended to hydrate profile rows from `profiles(id, full_name, avatar_url, email)`.
**Rule:** Self-rolled popups (with `useRef` + mousedown listener) are the canonical pattern in this codebase until @atlaskit/popup is upgraded. Don't introduce yet another popup pattern; mirror `AllProjectsTable`'s `useClickOutside` shape.

## 2026-05-05 — jira-attachment-proxy hardened for performance (D1)
**Surface:** supabase/functions/jira-attachment-proxy
**Pattern:** Old proxy buffered the whole attachment via `arrayBuffer()` (OOM risk on large files), did a `ph_jira_connection` DB hit on every request, and returned generic `{ error: 'Jira returned X' }` for all upstream failures. New proxy: streaming pass-through (`new Response(jiraRes.body)` — no buffering), 5-min connection cache per cold-start worker, ETag/If-None-Match passthrough → 304 short-circuit, HEAD method support for size-checks, tiered error codes (`JIRA_UNAUTHORIZED` / `JIRA_FORBIDDEN` / `JIRA_NOT_FOUND` / `JIRA_UPSTREAM_ERROR` / `INTERNAL_ERROR`).
**Rule:** Edge functions must stream binary content, not buffer it. Connection lookups belong in a per-worker cache. Pass through ETag and conditional headers — let the browser revalidate, don't make the worker round-trip when it doesn't have to.

## 2026-05-05 — Epic ParentAndLabels deleted; CatalystKeyDetails is canonical for all types (C1)
**Surface:** CatalystViewEpic + CatalystKeyDetails + ParentAndLabels (deleted)
**Pattern:** Epic was the last view using the legacy `ParentAndLabels` block (parent only, despite the name; Labels was removed globally 2026-05-05). Replaced with `<CatalystKeyDetails issue=… itemType="epic" />`. The component already routes Parent through CatalystParentLinker (Epic → Business Request via `parentSource="business_request"` per parent-rules.ts) and renders Priority via the canonical `EditablePriority` — Priority placement matches the 2026-05-05 directive (Key details left, never right rail). Deleted `epic/ParentAndLabels.tsx`. Updated CatalystKeyDetails docstring to remove the stale "Future step: unify ParentAndLabels into this" note.
**Rule:** Type-specific legacy blocks die when the canonical primitive can absorb them. Check that the canonical resolves the right `parentSource` via parent-rules.ts before deleting (Epic → BR is the rule; CatalystParentLinker honored it).

## 2026-05-05 — MDT Ref + Labels banned from CatalystSidebarDetails (jira-compare cycle 1)
**Surface:** CatalystSidebarDetails (all issue type views, but caught on BAU-5737 QA Bug)
**Pattern:** Cycle 1 jira-compare audit on BAU-5737. Lane B Rovo `getJiraIssueTypeMetaWithFields(BAU, QA Bug=10012)` returns 11 fields: Assignee, Severity, Assessment Feature, Description, Fix versions, Issue Type, Parent, Priority, Project, Reporter, Summary. **Labels is NOT in the QA Bug screen scheme. MDT Ref is NOT in the QA Bug screen scheme.** Catalyst rendered both globally because the 2026-05-03 "RESTORED" directive (based on a Story-only DOM probe of BAU-5609) was over-generalised to all routing buckets. Vikram caught it: "MDT ref field is banned... how did you leave custom fields of Catalyst on defect when i did not ask for explicitly".
**Rule:** **MDT Ref is permanently banned from ALL Catalyst views and sidebars, for every issue type, forever.** No exceptions, no per-type asks will override this. **Labels removed globally** — add back per type only after Jira screen scheme validation (anti-pattern #18). 2026-05-07: Labels restored for Task type only (Fix J, BAU-5538 re-probe confirmed). **General rule (anti-pattern #18):** Before adding ANY field to CatalystSidebarDetails or any rail Details section, query `getJiraIssueTypeMetaWithFields` for the target issue type and confirm the field is in `fields[].key`. Catalyst-side custom fields require an EXPLICIT per-type ask from Vikram — do NOT generalise from a single Lane A probe to other types.

## 2026-05-05 — Status pill colors: ADS bold tokens ≠ Jira actual colors
**Surface:** CatalystStatusPill (all issue type views)
**Pattern:** ADS `color.background.success.bold` = `#1F845A` (dark forest green). Jira's actual header status pill for "done" category = `rgb(148,199,72)` = `#94C748` (lime green) with dark text `#292A2E` and `fontWeight: 500` — not white text, not 600 weight. ADS bold tokens are too dark and produce white-on-dark contrast, not matching Jira's light-on-lime. Other probed values: `inprogress` = `#669DF1`, `default/todo` = `rgba(5,21,36,0.06)`.
**Rule:** Always DOM-probe Jira's actual `getComputedStyle` for status pill background/color/fontWeight before choosing an ADS token. When no ADS token matches, use exact Jira hex (jira-compare bypass applies — Jira parity overrides ADS-token preference).

## 2026-05-06 — "Assign to me" IS a persistent link in Jira's idle right rail (correction)
**Surface:** CatalystSidebarDetails Assignee field row
**Pattern:** 2026-05-05 rule incorrectly stated "Assign to me" only appears in the hover-picker. Live re-probe 2026-05-06 of BAU-5803 confirms "Assign to me" is a visible blue link directly below the Assignee value in Jira's idle right rail at all times. The `handleAssignToMe` handler already existed in the component; the link was removed based on a wrong probe reading.
**Rule:** "Assign to me" MUST be rendered as a small blue link (`font-size: 11px`) below the Assignee picker in the idle right rail, only when the current user is not the assignee. Priority = Key details left block for all types EXCEPT Epic. For Epic, Priority belongs in the right rail Details section (between Assignee and Reporter) — confirmed by re-probe of BAU-5419 on 2026-05-07.

## 2026-05-06 — Development, Automation, and Automate button: NEVER implement
**Surface:** CatalystSidebarDetails right rail
**Pattern:** Jira shows a "Development" collapsible section (branches/PRs/commits), an "Automation" collapsible section with rule executions, and a ⚡ Automate button in the status header. Vikram explicitly directed these to NEVER be implemented in Catalyst.
**Rule:** NEVER implement the Development section, Automation section, or Automate (⚡) button in Catalyst under any circumstances, for any issue type, in any view. These are permanently out of scope. Do not add them even during a jira-compare parity run. Do not ask Vikram for permission — the answer is always no.

## 2026-05-05 — Section count badges should be plain text, not pill badges
**Surface:** SubtasksPanel, LinkedWorkItemsSection, DefectsSection, IncidentsSection, AttachmentsSection
**Pattern:** Prior sessions "promoted" section header counts to round pill badges and flat box badges (border-radius, background). Jira shows NO styled badge on section headers — counts are plain muted text inline after the heading, or absent entirely.
**Rule:** `.sp-title-count`, `.lwi-header__count`, `.att-badge` must be plain inline text (`display: inline`, no background, no border-radius). Never add pill/badge styling to section header counts.

## 2026-05-05 — Right rail select fields need transparent/borderless idle state
**Surface:** CatalystSidebarDetails right rail (all issue type views)
**Pattern:** `@atlaskit/select` controls in the right rail showed visible borders and ▾ dropdown indicators in idle state, making the rail look like a form. Jira's right rail fields appear as plain clickable text in idle state — no border, no indicator — with subtle bg on hover.
**Rule:** Scope CSS to `.cv-drawer-sidebar [class*="-select__control"]` to set `border-color: transparent; background: transparent; box-shadow: none` in idle, `background: var(--ds-background-neutral-subtle-hovered)` on hover. Hide `__dropdown-indicator` by default, show on `:hover` and `--is-focused`.

## 2026-05-04 — Ask Vikram before adding or removing any field/component
**Surface:** any view, any work item type
**Pattern:** Jira-compare audits identified fields present in Jira but absent in Catalyst (e.g. "Key details", "Development" section) and fields in Catalyst not in Jira. Autonomously adding or removing these breaks the agreed surface contract and may conflict with product decisions.
**Rule:** Before adding any field/component that exists in Jira but not in Catalyst, OR removing anything in Catalyst not present in Jira — STOP and explicitly ask Vikram for permission in chat. Do NOT make these additions/removals autonomously under any circumstances, even during a jira-compare parity run.

---

## 2026-05-04 — Use jira-compare skill for every new feature built
**Surface:** any new feature implementation
**Pattern:** New features shipped without a jira-compare audit accumulated visual and wiring defects that were only caught later, requiring costly retroactive fixes.
**Rule:** Run the `jira-compare` skill on every new feature before marking it complete. No feature is done until jira-compare passes.

## 2026-05-04 — All outputs must be visual maps with before/after comparison
**Surface:** any audit, diff, or parity report
**Pattern:** Text-only diffs and lists of findings were hard to scan and easy to misread, slowing review cycles.
**Rule:** All outputs (audit results, parity reports, defect summaries) must be presented as visual maps showing the before state (current Catalyst) and after state (target Jira parity) side by side. No text-only findings lists.

## 2026-05-04 — Dark/light mode themes must come exclusively from Atlassian Design System
**Surface:** any theming, color, or token change
**Pattern:** Custom or third-party theme tokens were used for dark/light mode, causing inconsistency with ADS primitives and breaking parity with Jira's own theming.
**Rule:** All dark and light mode theme values must come exclusively from https://atlassian.design/ tokens. No custom color values, no third-party theme libraries for theming. If a token doesn't exist in ADS, raise it with Vikram before inventing one.

## 2026-05-04 — Handover: write Obsidian file + copy-paste block for next conversation
**Surface:** any handover request
**Pattern:** Handovers written as plain markdown docs required manual re-mapping in the next session, losing context and wasting warm-up time.
**Rule:** When a handover is requested: (1) write the full handover to the Obsidian vault, (2) produce a self-contained copy-paste block with all file paths, issue keys, component names, and state mapped — ready to paste as the first message of the next conversation. No context should need to be reconstructed manually.

## 2026-05-04 — Warm-up: read Obsidian files first, fall back to Claude memory
**Surface:** session warm-up / context loading
**Pattern:** Claude memory alone was stale or incomplete between sessions; Obsidian files contain the most recent handover state but weren't being consulted first.
**Rule:** At the start of every session, read the relevant Obsidian vault files before consulting Claude memory. Obsidian is the primary source of truth for session state. Claude memory is the fallback for anything not covered by Obsidian.

---

## 2026-04-28 — Handover items can conflict with in-code prohibitions
**Surface:** any patch listed in a handover
**Pattern:** Handover labelled Story Points as the "highest-asked Story-specific field" and option B for the next round. CatalystSidebarDetails.tsx line 422 has the explicit comment `Story Points: BANNED platform-wide. Do NOT re-add.` plus a JSDoc GUARDRAIL — added 2026-04-16 by Lovable co-authored with Vikram, citing Catalyst spec. The handover was written 12 days later and didn't reconcile with the ban. Following the handover blindly would have re-added a field the spec explicitly removed.
**Rule:** Before implementing any handover-listed feature, grep the codebase for negative directives ("BANNED", "Do NOT", "DEPRECATED", "REMOVED") that mention the feature. If a directive exists, halt and surface the conflict to Vikram. In-code directives win over handovers — they were authored against the live codebase, the handover was a snapshot.

## 2026-04-28 — `cv-*-select__*` DOM classes don't mean non-Atlaskit
**Surface:** any Lane A DOM probe that flags Atlaskit compliance
**Pattern:** I saw `cv-priority-select__control` in the rendered DOM and inferred the priority field bypassed `@atlaskit/select`. Wrong. `@atlaskit/select` is a styled wrapper around react-select and forwards `classNamePrefix` to it. The `cv-` prefix here was a deliberate styling override passed to Atlaskit Select (`classNamePrefix="cv-priority-select"` on line 264 of `EditableFields.tsx`, with `import Select from '@atlaskit/select'` on line 9). The DOM class prefix was a developer choice, not a primitive choice.
**Rule:** Before flagging an ADS-compliance defect from DOM classnames, grep the source for the component's `import` statement. `@atlaskit/select` + custom `classNamePrefix` is fine. Only flag a violation when the component imports `react-select` directly (no `@atlaskit/*` wrapper) or rolls its own dropdown.

## 2026-04-28 — CRUD gate is about data flow on each side, not cross-system parity (sync deliberately off)
**Surface:** Defect (QA Bug) right-rail, BAU-5717
**Pattern:** I treated a Catalyst-vs-Jira data divergence (BAU-5717: Status ToDo vs Ready for QA, Assignee Syed Habib vs Yazeed Daraz) as a P0 defect. Vikram corrected: Catalyst is in functionality-mode, wh-jira-sync is intentionally parked, divergence is expected and the risk is accepted. The CRUD gate's job is to prove data FLOWS through CRUD on each side independently — UI → backend → render — not that the two sides agree.
**Rule:** Don't flag stale data as a defect while sync is parked. CRUD-R diff is informational only, not pass/fail. The gate's pass criteria are: CRUD-C lands a row in each side's backend, CRUD-U writes through and renders after reload, CRUD-D removes the row. Cross-system parity is out of scope for this regime. Pick recently-synced tickets (a couple days old) when you want incidental data alignment, but don't make alignment the test.

## 2026-04-28 — Round 1 cross-type patches: 8 self-contained P0 fixes closed 113 of 253
**Surface:** /allwork list + Defect/Incident/Task/Story views
**Pattern:** Audit produced 253 cross-type findings dominated by 8 root-cause clusters (status pill uppercase, footer count, deep-link, lozenge typography, parent rendering, smart-card crash, description font, page H1). Each fix was tiny but repeated across 7 issue types — fixing once at the shared component closed 24+ findings in one shot.
**Rule:** Before patching one type's view, grep for the same legacy component in OTHER type views — if `WorkItemStatusLozenge`, `CatalystParentLinker`, `AtlaskitRenderer` etc. is shared, one edit shuts down findings on all surfaces. Per-type one-offs are a smell.

## 2026-04-28 — Atlaskit Lozenge needs structural CSS override, not prop fix
**Surface:** any lozenge-using surface
**Pattern:** `@atlaskit/lozenge` v11 renders `<span class="css-X"><span class="css-Y">LABEL</span></span>` where the inner span carries `text-transform: uppercase`, `font-weight: 653`, `letter-spacing > 0`. Modern Jira renders sentence case. The lozenge has no prop to disable transform.
**Rule:** Wrap each lozenge in `<span data-cp-lozenge-jira-parity>` and add a global CSS rule overriding the inner span. Don't try to override via props — they don't exist for typography.

## 2026-04-28 — useItemSelection URL race deletes deep-link param on mount
**Surface:** ProjectAllWorkView (and any consumer of useItemSelection)
**Pattern:** URL-sync effect deleted `?issue=KEY` whenever `activeItemId` was null — but null is the default during first render before items have loaded. Hydration ran on the next tick, but the URL param was already gone, so deep-link landings always fell back to default.
**Rule:** Sync-to-URL deletion must guard on `items.some(i => i.jiraKey === current || i.id === current)` — only delete when the param's value is known-stale. For unmatched values, preserve the param so a late refetch can hydrate.

## 2026-04-28 — /allwork list excludes Epic, Feature, Task — non-Defect types unreachable from this surface
**Surface:** /allwork
**Pattern:** Search "BAU-4466" (Epic), "BAU-3726" (Feature), "BAU-4038" (Task) all returned `0 of 1000`. CatalystViewEpic/Feature/Task.tsx exist in code but are unreachable end-to-end through this navigator.
**Rule:** Audit `useProjectAllWorkItems` query for type-filter / page-cap before claiming a per-type view is testable from /allwork. If the row never appears in the list, route the audit through the surface that DOES include the type.

## 2026-04-28 — v4 skill rewrite: 3-lane logical-parallel model
**Surface:** skill itself
**Pattern:** v3 was 1350 lines, screenshot-mandatory, doc-heavy, single-tool (Chrome MCP only). Loop ran open-ended without a hard cap and without a CRUD acceptance test, so audits closed on visual match alone and shipped wiring defects.
**Rule:** Three lanes (Chrome MCP, Rovo/Atlassian MCP, Computer Use) report OBSERVATION before DIFF. CRUD on a canonical entity is the acceptance gate. Loop capped at 5 cycles. No standalone docs — only prompt blocks, MONITOR block, JIRA bug filings, and lessons here.

## 2026-04-24 — Rovo prompts need full probe payload
**Surface:** any
**Pattern:** Asking Rovo "what primitive is this?" without DOM context wastes a round — Rovo cannot infer from a screenshot alone.
**Rule:** Every Rovo prompt block must include the element's className, computed styles, and data-attrs from the Lane A probe. Rovo gets what Claude saw.

## 2026-04-24 — Visual match is not parity
**Surface:** any
**Pattern:** Surfaces declared "parity-complete" on visual match shipped wiring defects (composer doesn't submit, reaction increments visually but doesn't persist).
**Rule:** CRUD parity at C, R, U, D is the acceptance gate. Visual match without CRUD green is a fail. If a surface has no interactive behaviour in scope, state it explicitly and require Vikram sign-off.

---
