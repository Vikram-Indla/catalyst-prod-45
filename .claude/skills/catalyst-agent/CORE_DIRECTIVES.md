---
name: catalyst-agent-core-directives
version: 2.0.0
applies_to: every dispatched agent (probe + implementer)
non_negotiable: true
directive_1:
  name: ads_ring_fence
  source: https://atlassian.design/
  scope: exclusive
  components: "@atlaskit/* only"
  tokens: "@atlaskit/tokens — var(--ds-*) only"
  typography: "@atlaskit/heading + ADS tokens (live Jira anchors override per CLAUDE.md)"
  icons: "@atlaskit/icon + @/lib/jira-issue-type-icons only"
  paired_with: atlassian_mcp_probe
directive_2:
  name: green_signal_gate
  intensity: intensive
  dimensions_required: 7
  dimensions: [visual, structural, behavioral, schema, architecture, accessibility, claude_md]
  blocks_execution_until: "GREEN"
  override: vikram_only_explicit_chat_confirmation
directive_3:
  name: tool_override
  scope: all_tools_authorized
  banned: ["testsprite_*", "preview_*"]
  computer_use: explicitly_enabled
  chrome_mcp: enabled
  atlassian_mcp: enabled
  supabase_mcp: enabled
  figma_mcp: enabled
  claude_md_lane_b_restriction: suspended_for_catalyst_agent_sessions
directive_4:
  name: context_window_guard
  threshold_70pct: warn_only
  threshold_90pct: stop_save_handover
  spec: CONTEXT_GUARD.md
  phase_checkpoints: [before_step_4, before_step_4_5, before_step_6, before_step_8, before_step_9]
directive_5:
  name: screenshot_evidence
  tool: "mcp__computer-use__screenshot"
  mandatory: true
  blocks_done_declaration: true
  spec: "GAP_REPORT.md section 4"
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
GREEN SIGNAL — probe complete · cleared for execution
   Coverage: visual ok · structural ok · behavioral ok · schema ok ·
             architecture ok · a11y ok · CLAUDE.md ok
   Findings: <count> · Halts: 0 · Open questions: <count, with list>
   Probe agents: <list of personas that ran>
   Probe duration: <wall-clock>
   Verdict: SAFE TO EXECUTE per Directive 2
```

OR

```
RED SIGNAL — probe incomplete · execution BLOCKED
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

## Directive 3 — Tool Override (all tools authorized for catalyst-agent sessions)

For every session dispatched by `/catalyst-agent`, the following tool authorization applies:

### Authorized tools (use freely)

| Tool category | Tool prefix | Use for |
|---|---|---|
| Computer Use | `mcp__computer-use__*` | Screenshots (mandatory for evidence), desktop interaction |
| Chrome MCP | `mcp__Claude_in_Chrome__*` | DOM probing, computed-style, keyboard/click testing |
| Atlassian MCP | `mcp__cedf80a0-*` | Jira schema reads, issue metadata, transitions |
| Supabase MCP | `mcp__42209857-*` | Database schema, RLS policy reads (read-only during probe) |
| Figma MCP | `mcp__2d8919de-*` | Design token lookups, component spec reads |
| Bash | — | CLI commands, git, design-governance audit runner |
| Read / Edit / Write | — | Source file reads and edits |
| Agent | — | Dispatch specialist agents |

### Banned tools (never use in any session)

| Tool | Reason |
|---|---|
| `mcp__TestSprite__*` | Globally banned per tool_restrictions.md |
| `preview_*` (any Claude preview tool) | Globally banned per CLAUDE.md Claude Preview section |

### CLAUDE.md restriction suspended

CLAUDE.md says "Chrome MCP only for Lane B DOM probing." That restriction is **suspended for catalyst-agent sessions**. You may use ANY authorized tool above to probe or implement. This directive takes precedence over that CLAUDE.md constraint for this skill's sessions.

### Why

The CLAUDE.md "Chrome MCP only" restriction was a safety default. Catalyst-agent sessions require Computer Use MCP for screenshot evidence (Directive 5) and may need Supabase MCP for schema reads mid-session. Restricting to Chrome MCP only blocks legitimate probe work.

---

## Directive 4 — Context Window Guard (mandatory continuous duty)

Every agent running under `/catalyst-agent` MUST monitor context depletion and act at defined thresholds. Full spec: `CONTEXT_GUARD.md`.

### Summary

| Threshold | Signal | Action |
|---|---|---|
| 70% | Any 2 of: 3+ components probed, 4+ phases done, 2+ re-probes, 30+ gap rows | Emit 70% warning block. Continue. |
| 90% | 2+ implement-verify cycles done, OR all 70% signals active | STOP. Run /obsidian save. Emit HANDOVER BLOCK. Explain to user. |

### Phase checkpoints (mandatory check at each)

- Before Step 4 (MCP Probe)
- Before Step 4.5 (ADS Surface Scan)
- Before Step 6 (Implementation)
- Before Step 8 (Screenshot Evidence)
- Before Step 9 (Loop/Re-probe)

### HANDOVER BLOCK format

When 90% triggers, output a copy-pasteable block (full format in `CONTEXT_GUARD.md` section 3) that starts with:

```
/obsidian branch [NN]
```

This allows the next conversation to resume immediately by pasting the block and triggering the obsidian skill's mandatory CLAUDE.md-first sequence.

---

## Directive 5 — Screenshot Evidence (mandatory after every implementation action)

After EVERY implementation action (code change, fix, wiring update), you MUST:

1. Trigger a hard reload if needed: `mcp__Claude_in_Chrome__navigate` to the surface URL
2. Call `mcp__computer-use__screenshot` to capture the current state
3. Output the Completion Evidence Block (full format in `GAP_REPORT.md` section 4):

```
EVIDENCE — Component N ([Component Name])
   URL:          http://localhost:8080/[path]
   Screenshot:   [attached]
   Gap items resolved: N of [total]
   Fixed: [list]
   Remaining open: [list]
   ADS violations fixed: N / remaining: N
```

### Hard rules for Directive 5

- "Done" is BLOCKED until the evidence block is produced with an attached screenshot
- If Computer Use MCP is unavailable, state "Computer Use unavailable — manual verification required" — do NOT silently skip
- One evidence block per implementation action — not one per session
- The screenshot must show the AFTER state (post-fix) — not the before state

---

## How to use this file

`/catalyst-agent`'s dispatch template **prepends** the contents of this file to every agent's prompt. The agent reads these directives first, then receives its task-specific brief.

If you (the dispatched agent) are reading this and your task brief later contradicts these directives, **the directives win**. Surface the conflict; do not execute against the conflict.

---

## See also

- `SKILL.md` — the 11-step pipeline; step 5.5 is the Green Signal gate; Continuous Duties reference Directives 3-5
- `ROUTER.md` — Probe Matrix shows which probes cover which dimensions
- `GAP_REPORT.md` — mandatory gap report table format (Directive 5 uses section 4)
- `CONTEXT_GUARD.md` — full context window depletion spec (Directive 4)
- `../AGENT_PIPELINE.md` — shared activation protocol; this file is referenced as a prerequisite
- `CLAUDE.md` (project root) — bans + lessons that the probe cross-references
- `https://atlassian.design/` — the design system ring-fence's source of truth
