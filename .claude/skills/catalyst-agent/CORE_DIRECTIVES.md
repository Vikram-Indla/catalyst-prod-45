---
name: catalyst-agent-core-directives
applies_to: every dispatched agent (probe + implementer)
non_negotiable: true
directive_1:
  name: ads_ring_fence
  source: https://atlassian.design/
  scope: exclusive                            # components + themes + typography + css
  components: "@atlaskit/* only"
  tokens: "@atlaskit/tokens — var(--ds-*) only"
  typography: "@atlaskit/heading + ADS tokens (live Jira anchors override per CLAUDE.md)"
  icons: "@atlaskit/icon + @/lib/jira-issue-type-icons only"
  paired_with: atlassian_mcp_probe            # design decisions must be grounded in MCP probe evidence
directive_2:
  name: green_signal_gate
  intensity: intensive                        # all 7 dimensions covered, both sides probed
  dimensions_required: 7
  dimensions: [visual, structural, behavioral, schema, architecture, accessibility, claude_md]
  blocks_execution_until: 🟢
  override: vikram_only_explicit_chat_confirmation
enforcement: prepended to every Agent() prompt by /catalyst-agent dispatch template
---

# Core Directives — every agent reads this before doing work

These are **non-negotiable preamble rules**. Every dispatch made by `/catalyst-agent` (probe OR implementer) MUST have this file's contents prepended to the agent's prompt. The rules are stated as if speaking directly to the dispatched agent.

---

## Directive 1 — Atlassian Design System ring-fence (mandatory)

You operate exclusively within the **Atlassian Design System** at https://atlassian.design/.

| Aspect | What's allowed | What's NOT allowed |
|---|---|---|
| Components | `@atlaskit/*` packages only (Button, Lozenge, Avatar, DropdownMenu, Select, Modal, Textfield, etc.) | Bootstrap, Material UI, Chakra, Ant Design, hand-rolled UI, shadcn (legacy), HeadlessUI |
| Themes | ADS tokens via `@atlaskit/tokens` (`var(--ds-*)`) for color, surface, text, border, elevation, opacity | Hardcoded hex/RGB, tailwind palette colors as final values, custom theme libraries |
| Typography | ADS `@atlaskit/heading`, `@atlaskit/css`, ADS font-size/font-weight tokens. Live Jira-measured specs override default ADS tokens when CLAUDE.md anchors specify them (e.g., status pill 11px/653/uppercase) | Custom font scales, Google Fonts injection, arbitrary font-weight numbers without anchor |
| CSS | Token-driven CSS only. ADS spacing primitives (`@atlaskit/primitives` `Box` with `xcss`). `space.*` tokens for padding/margin. | Tailwind utility classes for final visual values (allowed for layout-only scaffolding during build, but final values must resolve to ADS tokens). Raw `px` numbers without an anchor reason. |
| Icons | `@atlaskit/icon/*` (core or glyph). For work-item type icons, `@/lib/jira-issue-type-icons` `JiraIssueTypeIcon`. | `lucide-react` (banned in hub-scope per `eslint.config.js`), Material Icons, FontAwesome, emoji as functional icons. |
| Motion | ADS motion tokens (`cubic-bezier(0.2,0,0,1)`, `cubic-bezier(0.4,0,1,1)`) | Custom easings without ADS reference, Framer Motion for non-Atlaskit components (allowed inside `@/components/ui` legacy zone but not for new work) |

### Probe-side companion

You probe Jira via the **Atlassian MCP server** (tools prefixed `mcp__cedf80a0-7b34-46b3-a380-82b26fc360a4__*`):
- `getJiraIssueTypeMetaWithFields`, `getJiraProjectIssueTypesMetadata`, `searchJiraIssuesUsingJql`, `getTransitionsForJiraIssue`, `getJiraIssue`, `getAccessibleAtlassianResources`
- These are **READ-ONLY** during probe. Even tools that can write (e.g., `editJiraIssue`) are off-limits in probe mode.

### Hard halts

If a task asks you to:

- Add a non-Atlaskit component to a Catalyst surface → **HALT**. Surface the violation and stop.
- Add hardcoded color/font/spacing instead of ADS tokens → **HALT**. Cite the token that should be used.
- Reach for `lucide-react` in hub-scope → **HALT**. Use `@atlaskit/icon` or `@/lib/jira-issue-type-icons`.
- Skip the probe to save time → **HALT**. Probe is mandatory (see Directive 2).

The ring-fence is permanent. No exceptions. No "just this once".

---

## Directive 2 — Green Signal gate (probe completeness)

Before ANY execution (writing code, opening a PR, mutating state, calling an implementer agent), the probe stage must produce a **GREEN signal**. Until the signal is green, no work proceeds.

### What "GREEN" requires — all 7 dimensions covered

| # | Dimension | Probe artifact required |
|---|---|---|
| 1 | **Visual** | Live `getComputedStyle` measurements: font-size, font-weight, line-height, color, background, border-radius, padding, margin, box-shadow. For both Catalyst (localhost:8080) AND Jira (atlassian.net). |
| 2 | **Structural** | DOM tree: element tag, role, aria-* attributes, parent/child relationships, data-* hooks, ID/class fingerprints. |
| 3 | **Behavioral** | Click/keyboard/focus handlers wired, state transitions, network calls fired, optimistic UI vs server-sync. |
| 4 | **Schema** | Jira-side: `getJiraIssueTypeMetaWithFields` for the issue type, fields list, required vs optional, allowed values. Catalyst-side: `ph_*` table columns, RLS policies if backend-touching. |
| 5 | **Architecture** | Source component hierarchy (file:line refs), call chain, hook dependencies, rendering primitives. |
| 6 | **Accessibility** | WCAG 2.1 AA gate: color contrast ratios, keyboard reachability, focus rings, ARIA roles, screen reader semantics. |
| 7 | **CLAUDE.md cross-reference** | Every relevant anchor scanned. Banned items (MDT Ref, Story Points, etc.) flagged. Anti-pattern #18 schema-probe gate satisfied. |

### Signal verdict format

The probe must end with this block:

```
🟢 GREEN SIGNAL — probe complete · cleared for execution
   Coverage: visual ✓ · structural ✓ · behavioral ✓ · schema ✓ ·
             architecture ✓ · a11y ✓ · CLAUDE.md ✓
   Findings: <count> · Halts: 0 · Open questions: <count, with list>
   Probe agents: <list of personas that ran>
   Probe duration: <wall-clock>
   Verdict: SAFE TO EXECUTE per Directive 2
```

OR

```
🔴 RED SIGNAL — probe incomplete · execution BLOCKED
   Missing dimensions: <list>
   Halts: <list — CLAUDE.md anchors hit>
   Required follow-up: <list>
   Verdict: DO NOT EXECUTE — re-probe required
```

### What "intensive" means in practice

For a UI component probe, intensive coverage means:

- Probe **both** sides (Catalyst on localhost:8080 AND Jira on atlassian.net) — never just one
- Measure with `getComputedStyle` — never assume CSS values
- Trace at least 2 levels of component hierarchy (parent + child)
- Read the relevant source file fully if under 500 lines, or the relevant sections if larger
- Cross-reference at least 3 recent CLAUDE.md anchors (last 30 days) touching the surface
- Note what the probe **could not** determine — explicit "needs further probe" markers are required, not optional

A probe that returns generic findings without specific file:line refs or computed-style measurements is **NOT GREEN**. Send it back.

### When the green signal is overridden

Only Vikram (the user) can override a red signal manually, in chat, by explicit text confirmation ("override red, proceed"). Even then:

- The override must be logged in the activation block
- The downstream agent receives a `--override-red` flag in its prompt
- Any defect that emerges post-override is auto-traced to the override decision in the handover doc

---

## How to use this file

`/catalyst-agent`'s dispatch template **prepends** the contents of this file to every agent's prompt. The agent reads these directives first, then receives its task-specific brief.

If you (the dispatched agent) are reading this and your task brief later contradicts these directives, **the directives win**. Surface the conflict; do not execute against the conflict.

---

## See also

- `SKILL.md` — the 9-step pipeline; step 5.5 is the Green Signal gate
- `ROUTER.md` — Probe Matrix shows which probes cover which dimensions
- `../AGENT_PIPELINE.md` — shared activation protocol; this file is referenced as a prerequisite
- `CLAUDE.md` (project root) — bans + lessons that the probe cross-references
- `https://atlassian.design/` — the design system ring-fence's source of truth
