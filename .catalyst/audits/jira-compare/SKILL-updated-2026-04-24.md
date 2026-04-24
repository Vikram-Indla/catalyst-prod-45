---
name: jira-compare
description: >-
  Pixel-perfect audit comparing a Catalyst surface (http://localhost:8080)
  against the matching Jira (Atlassian) surface, using the visual Chrome MCP
  on all sides (never dev-browser, never computer-use) with
  https://atlassian.design/components as the canonical spec. Trigger on
  "jira compare", "compare to jira", "audit vs jira", "match jira",
  "clone jira", "mirror jira", "jira parity", "jira audit", or whenever the
  user shares a Jira screenshot/URL alongside a Catalyst screen and asks for
  parity, alignment, or a migration plan. Covers fields, typography, spacing,
  tab order, scroll, labels, and component identity, scoped strictly to the
  user's screenshot. HARD GUARDRAIL — Atlaskit-only. Every interactive
  element on the Catalyst side within scope MUST map to an `@atlaskit/*`
  primitive. This OVERRIDES any CLAUDE.md language about legacy shadcn being
  acceptable until migration; inside this skill, Atlaskit is the single
  source of truth for the scoped surface.
---

## Pinned endpoints (hard guardrails — never substitute)

| Endpoint | URL | Used for |
|----------|-----|----------|
| Atlaskit design reference | `https://atlassian.design/components` | Canonical spec for every `@atlaskit/*` primitive — props, anatomy, accessibility, dos/don'ts. Every P0 finding must cite the matching `/components/<name>` page. |
| Catalyst (local dev) | `http://localhost:8080` | Default Catalyst side of the audit. Never audit a production URL unless the user explicitly names one. If localhost:8080 isn't responding, stop and tell the user to start the dev server. |
| Jira tenant | `https://digital-transformation.atlassian.net` | The user's Jira workspace. Default starting point: `https://digital-transformation.atlassian.net/browse/BAU-5514`. Per-audit, the user names a specific BAU-####/ticket or screen under this tenant. Never swap tenants. |

**Tooling mandate:** all three endpoints are driven through the visual Chrome MCP (`mcp__Claude_in_Chrome__*`). Do not use the dev-browser skill (headless), and do not use computer-use (browsers are tier "read" — clicks and typing are blocked). Chrome MCP is DOM-aware, visible to the user, and the only path that produces a reliable computed-style snapshot. If the Chrome extension isn't connected, stop and ask the user to install/connect it — never fall through to a slower tier.

## Pipeline overview (seven gated phases — never skip a gate)

```
┌──────────────┐   ┌──────────┐   ┌─────────┐   ┌────────┐   ┌─────────┐   ┌────────┐   ┌──────────┐
│  0. Intake   │→│ 1. Setup  │→│ 2. Scan │→│ 3. Diff│→│ 4. Audit│→│ 5. Hand│→│ 6. Verify │
│ (Q&A clarity)│  │ (3 tabs) │  │(DOM pull)│  │(zip)  │  │ report  │  │  off   │  │ (self-check)│
└──────────────┘  └──────────┘  └─────────┘   └────────┘   └─────────┘   └────────┘   └──────────┘
                                                                                          ↓
                                                                            ┌───────────────────────┐
                                                                            │  Iterate until parity │
                                                                            │  (probe → fix → probe)│
                                                                            └───────────────────────┘
```

Every phase has a gate: Claude reports what was found and waits for user confirmation before the next phase starts. The value of the pipeline is the gates — not the speed.

Parity is almost never achieved in one pass. Phase 6 feeds back into Phase 2 — re-probe after every fix round, append an iteration verdict to the same audit report, and repeat until all gates pass. See **"Iterative audit loop"** below.

**Clarity mandate (applies at every phase):** if anything is ambiguous — which route, which field in the screenshot, whether a component is in scope, which hand-off tool to use — **ASK**. Silent assumptions are the single biggest failure mode. Asking twice is cheaper than a wrong audit.

## Tool doctrine — which tool for which job

| Need | Tool | Why |
|------|------|-----|
| Open/inspect Jira, Catalyst, Atlassian Design in a live browser | **Chrome MCP** (`mcp__Claude_in_Chrome__*`) | Visual, DOM-aware, shows the user what's happening. The ONLY way to collect the DOM snapshots this skill needs. |
| Fetch Jira data-shape ground truth (field schema, issue types, status transitions, real seed rows) | **Jira Atlassian MCP** (`mcp__*__getJiraIssue`, `mcp__*__searchJiraIssuesUsingJql`, `mcp__*__getJiraProjectIssueTypesMetadata`) if connected | API responses tell you what data exists before you reverse-engineer it from the DOM. Faster and more reliable for data-driven surfaces (lists, feeds, detail panels). |
| Generate prompts for **important UI/UX implementation** (redesigns, new components, restructuring) | **Lovable prompts** | Lovable is the Catalyst builder. DYNAMITE-style prompts (see `forge` skill) let Lovable ship large UI changes in one round. Always propose a Lovable prompt when the fix plan's P0 item is "rebuild this surface on @atlaskit/*". |
| Drive **code-level changes** (file edits, refactors, prop fixes, typing drift, import swaps) | **Claude Code task briefs** | CLAUDE.md §10 format — one file, one change, one reason. Smaller, surgical, PR-sized. Use this when the fix is "swap this import" or "add this prop", not "redesign". |
| **Research** any unknowns (Atlaskit behaviour not on atlassian.design, Jira product decisions, ADS rationale, token edge cases, a11y rules, competitor parity) | **Claude Chat** | Open a Claude Chat (claude.ai) to research. Paste the specific question and come back with the answer cited. Do not guess when the audit depends on a fact. |
| Delete an invented/obsolete component from the repo | **`mcp__cowork__allow_cowork_file_delete`** then bash `rm` | Bash `rm` alone fails with "Operation not permitted" in the sandbox until the explicit allow-delete permission is granted. Always call allow first. |
| Anything else a dedicated MCP handles (Slack ping, Jira comment, Figma export) | The dedicated MCP | Only if already connected. Never degrade. |

**Handoff rule:** every P0/P1 finding in the audit must be tagged with its handoff target:
- `[LOVABLE]` — emit as a DYNAMITE prompt block.
- `[CLAUDE CODE]` — emit as a task brief per CLAUDE.md §10.
- `[RESEARCH]` — open a Claude Chat query (state the question, wait for the answer before closing the finding).

If a finding has no handoff tag, it's incomplete.

## Data-source tiering — where "ground truth" actually comes from

Parity audits have four distinct sources of truth. Know which one you're citing and never mix them up in a finding.

| Tier | Source | What it tells you | When to use |
|------|--------|-------------------|-------------|
| **T1** | `https://atlassian.design/components/<primitive>` | The *spec* — variant names, prop contracts, anatomy, a11y rules, dos/don'ts. | Every P0 finding. Cite the URL. |
| **T2** | Jira DOM probe via `mcp__Claude_in_Chrome__javascript_tool` | The *runtime* — computed styles, actual token values, pixel dimensions, real tab order. | Every P1 finding about typography, spacing, colour, radius, layout. |
| **T3** | Jira Atlassian MCP (`mcp__*__getJiraIssue`, `mcp__*__searchJiraIssuesUsingJql`, etc.) if connected | The *data shape* — field names, value domains, issue types, status transitions, what the API actually returns. | When parity requires matching Jira's data model (e.g., mentions feed, status lozenge values, issue type enum). Also use to hydrate Catalyst with realistic seed data. |
| **T4** | Catalyst DevTools via `javascript_tool` on the `catalyst` tab | What Catalyst is *actually* rendering right now, including `--cp-*` vs `--ds-*` token resolution. | Proving a Catalyst regression or confirming a fix landed. |

**Cross-check rule:** a P0/P1 finding built on only one tier is suspicious. "Jira uses `@atlaskit/lozenge`" grounded only in the design-site spec (T1) must be confirmed by the DOM probe (T2) before it becomes a P0 — the real Jira page may have diverged. Inversely, a T2 probe finding without a T1 spec link is unfixable (the implementer has nothing to aim at).

If the Jira Atlassian MCP is connected, use T3 **before** probing T2 for data-driven surfaces (lists, detail panels, feeds) — the API response tells you what fields exist, then the DOM probe shows you how they're rendered. This is faster than reverse-engineering the data model from the DOM.

## Probe engineering — the techniques that actually work

Most audit pain in practice comes from probe failures — not from missing design knowledge. The Chrome MCP `javascript_tool` has sharp edges. These patterns are the ones that work reliably against Jira's React SPA and Catalyst's Vite SPA; use them.

### 1. IIFE return discipline

`javascript_tool` evaluates the last expression. If your script wraps everything in an IIFE, the IIFE must **explicitly `return`** the stringified result — otherwise the tool reports `undefined` and you waste a round trip.

```js
// WRONG — returns undefined
(() => {
  const out = { ... };
  JSON.stringify(out, null, 2);   // value thrown away
})();

// RIGHT — explicit return
(() => {
  const out = { ... };
  return JSON.stringify(out);      // or: JSON.stringify(out, null, 2)
})();
```

### 2. Split-probe strategy (output truncation is real)

A single probe that collects tabs + cards + tokens + row info will overflow the tool's output limit and truncate in the middle of the JSON, making the result unparseable. Split into 3–5 narrower probes, each ≤100KB of JSON:

- Probe A — enumerate the tablist (labels, selected state, widths, heights)
- Probe B — one specific card family (the project-card strip, the mentions feed, etc.)
- Probe C — design tokens + first row's computed styles

Re-use the same `javascript_tool` call signature across tabs with just the selector changing. Short probes also make it easier to diff iterations.

### 3. State-setup before probing

Jira and Catalyst both keep per-tab state in localStorage. A fresh `navigate` may land you on a tab other than the one the audit targets. Before probing, run a tiny setup script that activates the correct state:

```js
// Click the "Recommended" tab programmatically so the panel is in scope.
const tab = [...document.querySelectorAll('[role="tab"]')]
  .find(b => /recommended/i.test(b.textContent || ''));
tab?.click();
// Give the panel one paint frame to mount.
return new Promise(r => requestAnimationFrame(() => r('ready')));
```

Only then run the data-collecting probe. Don't mix setup and collection in one call — a mount-delay mid-probe will return stale DOM.

### 4. Heading disambiguation

Jira renders sidebar labels and main-column section titles with the same text ("Recommended" appears in both the tab strip and the sidebar). A naive `document.querySelector('h2')` pick will silently grab the wrong one.

```js
// First enumerate ALL headings with their container context, THEN filter.
const all = [...document.querySelectorAll('h1, h2, h3, h4')].map(h => ({
  tag: h.tagName.toLowerCase(),
  text: h.textContent?.trim(),
  rectTop: h.getBoundingClientRect().top,
  // Walk up to the nearest landmark to disambiguate main vs nav vs aside.
  landmark: h.closest('main, nav, aside, [role="main"], [role="navigation"]')?.tagName,
}));
// Audit decides which to keep.
return JSON.stringify(all);
```

Filter by `landmark === 'MAIN'` (or by proximity to the target card) before asserting "the heading is X".

### 5. SPA screenshot fallback

`mcp__Claude_in_Chrome__screenshot` waits for `document_idle` by default. On SPAs that poll (Jira polls notifications; Catalyst polls Supabase Realtime) `document_idle` never fires and the call times out. When that happens:

1. Stop trying to screenshot.
2. Capture everything via `javascript_tool` (computed styles, positions, text content, tab order).
3. Report "screenshot unavailable — SPA polling blocks `document_idle`; using DOM probe as source of truth."

The audit report is equally valid — probes, not pixels, are what drive pixel parity.

### 6. Chrome tab lifecycle recovery

Chrome MCP tab IDs do **not** survive the browser being closed. If the user closes the window between audits or mid-iteration, every `tabs_*` call errors with "tab not found." Recovery:

1. Call `mcp__Claude_in_Chrome__tabs_create_mcp` to open a fresh tab.
2. Re-`navigate` to the Jira / Catalyst / atlassian.design URL.
3. Re-run state setup (Phase 2 step 3 above).
4. Log in Jira again if the session expired.

Do not keep trying to address the old tab ID — it's gone.

### 7. Token read from live DOM (do not hard-code)

Atlaskit token values drift between versions. Read them off the live `atlaskit` or `jira` tab whenever you need one in a finding:

```js
const s = getComputedStyle(document.documentElement);
return JSON.stringify({
  background_neutral: s.getPropertyValue('--ds-background-neutral').trim(),
  text:               s.getPropertyValue('--ds-text').trim(),
  border:             s.getPropertyValue('--ds-border').trim(),
  link:               s.getPropertyValue('--ds-link').trim(),
  surface_hovered:    s.getPropertyValue('--ds-surface-hovered').trim(),
});
```

Cite the probed value in findings, not a value from memory.


# Jira Compare — Catalyst vs Jira Parity Audit

## What this skill is for

Catalyst is actively migrating to Atlassian Design System (Atlaskit). The user (Vikram) audits one surface at a time against the equivalent Jira screen and wants **exact parity** — same component identity, same field types, same typography, same spacing, same tab order, same scroll behaviour, same label placement.

This skill runs that audit with you (Claude) inspecting both sides via Chrome MCP, scoped strictly to what the user's screenshot shows, and produces a fix-ready report.

## The ONE guardrail that overrides everything else

> **Every interactive element on the Catalyst surface, within the bounds of the user's screenshot, MUST be rendered by an `@atlaskit/*` primitive.**

This supersedes CLAUDE.md's "legacy shadcn surfaces remain in place until scheduled migration" clause. When this skill is running, the scoped surface is being migrated — there is no "later". Any non-Atlaskit component in scope is a **P0 finding** and must be named in the audit.

Concretely:
- A `<Dialog>` from shadcn/ui in scope → P0. Replace with `@atlaskit/modal-dialog`.
- A `<Select>` from shadcn/ui in scope → P0. Replace with `@atlaskit/select`.
- A bespoke status pill → P0. Replace with `@atlaskit/lozenge`.
- A `<Button>` using Tailwind classes → P0. Replace with `@atlaskit/button/new`.
- Typography set by Tailwind utilities when Atlaskit exposes a primitive (`@atlaskit/heading`, `@atlaskit/primitives`) → P0.
- Spacing via Tailwind `p-4 mt-6 gap-2` → P1. Replace with `@atlaskit/primitives` `Box`/`Stack`/`Inline` + tokens from `@atlaskit/tokens`.
- An **invented icon component** (e.g., a bespoke `ProjectKindIcon` with hand-drawn SVGs) → P0. Delete it and use the canonical Atlaskit equivalent (`@atlaskit/avatar` with `appearance="square"` for project tiles; canonical Catalyst `WorkItemIcon` per CLAUDE.md §11 for work-item types). Leaving invented icons dormant in the repo causes future regressions.

If a required Atlaskit package is missing from `package.json`, the audit must name it and append the adoption protocol from CLAUDE.md §1 (add to dependencies, add to `vite.config.ts` `optimizeDeps.include`, import canonically).

---

## Inputs the user provides (human-in-the-loop)

Before any Chrome automation, confirm three things. If any are missing, ask — don't guess.

1. **Jira URL** — the exact Jira screen to mirror. Example: `https://<tenant>.atlassian.net/browse/XYZ-123` or a settings/project page. If the user pasted a screenshot from Jira without a URL, ask for the URL — the DOM is the point, not the pixels.
2. **Catalyst URL** — defaults to `http://localhost:8080` plus the specific route. If the user only names the screen ("Create Issue modal"), combine with `http://localhost:8080` and confirm. Only use a production URL if the user explicitly names it.
3. **Scope screenshot** — the image the user attached defines the blast radius. You audit **only** what is visible in the screenshot. If the user says "just this modal" / "just the right rail" / "just the header", stay inside that region.

Optional but helpful:
- Catalyst component file path (e.g. `src/components/ProjectHub/IssueDetailModal.tsx`) so the fix plan cites exact lines.
- Whether dark mode (NOCTURNE) is in play for the Catalyst view.
- Any intentional house divergences from Jira already known (e.g., "we call it 'projects', not 'spaces'" — Catalyst vocabulary).

A fourth reference — the Atlaskit design site (`https://atlassian.design/components`) — is always opened as a third tab. The user does not provide this; the skill opens it automatically and consults it whenever a primitive needs disambiguating (variant props, allowed appearances, anatomy diagrams).

---

## Workflow — the seven-phase pipeline

### Phase 0 — Intake (always ask; never skip)

Before any tool call, run a short Q&A to lock scope. Ask these in one block using the `AskUserQuestion` tool when possible; otherwise inline. Answer each in writing before moving on.

1. **Jira URL** — confirm the exact ticket or screen under `https://digital-transformation.atlassian.net`. Default offered: `https://digital-transformation.atlassian.net/browse/BAU-5514`. Ask: "Is BAU-5514 the right ticket, or do you want a different one?"
2. **Catalyst route** — `http://localhost:8080` + which path? Ask: "Which Catalyst route on `localhost:8080`?" If the screenshot shows the modal/drawer, also ask what state it's in (created empty, mid-edit, error state).
3. **Scope** — restate in one sentence what the screenshot covers. Ask: "Does this match your scope? Anything I should exclude or include?"
4. **Dark mode** — is Catalyst in NOCTURNE dark mode for this screenshot?
5. **Handoff preference for this audit** — "Do you want the fix plan emitted as (a) Lovable prompts for implementation, (b) Claude Code task briefs for code changes, or (c) both, row-by-row per finding?" Default: (c) — tag each finding with the right handoff.
6. **Research hook** — "Anything you already want me to research in Claude Chat before diving in (e.g., 'why does Jira use a popover here instead of a modal', 'what token does the Jira assignee avatar group use')?"
7. **Known house divergences** — "Any intentional vocabulary/visual differences I should treat as accepted deltas, not findings?" (e.g., "spaces" → "projects", Inter vs Atlassian Sans, house greeting copy.)

Gate: do not advance to Phase 1 until every question above has an answer, even if the answer is "use the default". Silent assumptions about scope are the single largest cause of wasted audits.

### Phase 1 — Setup (load Chrome MCP, open three tabs)

The Chrome MCP tools are deferred. Load them in bulk in one call:

```
ToolSearch({ query: "chrome", max_results: 20 })
```

You need `mcp__Claude_in_Chrome__navigate`, `mcp__Claude_in_Chrome__get_page_text`, `mcp__Claude_in_Chrome__javascript_tool`, `mcp__Claude_in_Chrome__tabs_create_mcp`, `mcp__Claude_in_Chrome__tabs_context_mcp`, `mcp__Claude_in_Chrome__find`, `mcp__Claude_in_Chrome__read_page`.

**Tool discipline (mandatory):**
- Use the visual Chrome MCP only. Never run the dev-browser / headless playwright setup for this skill — the user wants to *see* the browser doing the work.
- Never attempt computer-use clicks/typing on browser windows — browsers are tier "read" there and the call will error.
- If the Chrome extension isn't connected, stop and ask the user to install/connect it. Do not degrade to any other tier.
- If the Jira Atlassian MCP is connected and the surface is data-driven, consider a one-shot T3 pull (via `getJiraIssue` / `searchJiraIssuesUsingJql`) before you probe the DOM — it's cheaper than reverse-engineering the schema.

Use `tabs_create_mcp` for three named contexts and keep them throughout the audit:

1. `"jira"` → the URL confirmed in Phase 0 under `https://digital-transformation.atlassian.net`.
2. `"catalyst"` → `http://localhost:8080` + the route confirmed in Phase 0. If the page 404s or the dev server isn't running, stop and tell the user to start Catalyst locally — do not substitute production.
3. `"atlaskit"` → `https://atlassian.design/components`. Keep this tab open for the entire audit; navigate within it to each primitive's page as the audit references them (e.g., `/components/button/examples`, `/components/modal-dialog/examples`).

Jira auth: if the Jira tab redirects to login, stop and tell the user "please log into Jira in the tab I just opened, then say continue." Never try to automate Atlassian auth.

Set viewport to match the user's screenshot width if obvious (1280×900 is a good default; 1440×900 for large macs).

**Gate 1 → 2:** report "three tabs open, DOM responding on all three" in one line, then proceed.

### Phase 2 — Scan (pull DOM from both sides)

Follow the **Probe engineering** techniques above: use explicit `return`, split into 3–5 narrow probes, set state before collecting, disambiguate headings by landmark, expect no screenshots on the SPA.

For each side, run focused `javascript_tool` calls that return structured data. Keep the scope tight — target the container that matches the screenshot (modal root, form root, right-rail, etc.), not the whole page.

Collect per visible interactive element:

```
{
  role,                   // e.g. "text-input", "select", "textarea", "checkbox",
                          //      "button", "lozenge", "avatar", "link", "heading"
  label,                  // the visible label text, if any
  labelPosition,          // "top" | "left" | "floating" | "inside" | "none"
  placeholder,            // input placeholder
  required,               // boolean from aria-required / asterisk
  fieldType,              // native type="..." for inputs; for selects: single/multi
  options,                // for selects: [{label, value}, ...] if enumerable
  component,              // best guess at the component library:
                          //   @atlaskit/<pkg>  (look for ak- / css- + atlassian data attrs)
                          //   shadcn/radix     (look for data-radix-*)
                          //   tailwind-bespoke (class names with utility patterns)
  typography: {
    fontFamily, fontSize, fontWeight, lineHeight, letterSpacing, color
  },
  box: {
    width, height, paddingTop, paddingRight, paddingBottom, paddingLeft,
    marginTop, marginRight, marginBottom, marginLeft, borderRadius,
    borderWidth, borderColor, backgroundColor
  },
  tabIndex,               // computed from DOM order + explicit tabindex
  scrollable,             // true if this container has overflow that scrolls
  states: {               // sampled where possible
    hover, focus, disabled, error
  }
}
```

Helper heuristics for the `component` field — see `references/atlaskit-detection.md` for the full fingerprint list. Short version:

- `@atlaskit/*` surfaces commonly carry `data-testid` values starting with their role (`form-field-*`, `select-*`, `modal-dialog-*`), use class prefixes like `css-` (Emotion), and render into portals with `data-atlaskit-portal-container`.
- shadcn/Radix surfaces carry `data-radix-*` and `data-state=open|closed`.
- Tailwind-bespoke surfaces have long utility class chains (`flex items-center gap-2 px-3 py-1.5 text-sm font-medium ...`) and no vendor data attributes.

Tab order: compute by walking the focusable tree (`document.querySelectorAll('a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])')`) in DOM order and combine with explicit `tabindex` values.

Typography: resolve with `window.getComputedStyle` on the element itself, not the container — Atlaskit applies typography at the primitive level.

**Gate 2 → 3:** show the user a one-line summary per side (`N interactive elements found, M typography nodes, tab-order length K`). Ask "does this match what you see?" before proceeding. If the count on either side is wildly off from what the screenshot suggests, your `rootSelector` is wrong — fix it before diffing.

### Phase 3 — Diff (zip both sides element-by-element)

For each element in scope, zip Jira ↔ Catalyst. Any element that exists on one side but not the other is itself a finding.

Classify every delta into one of three tiers:

| Priority | What it covers |
|----------|----------------|
| **P0 — Atlaskit mismatch** | Catalyst uses shadcn, Radix, Tailwind-bespoke, or raw HTML where Atlaskit has a primitive. Also: wrong Atlaskit primitive for the role (e.g., `@atlaskit/button` where Jira uses `@atlaskit/dropdown-menu`). Also: invented bespoke icon/component in the repo that should be deleted and replaced with an Atlaskit primitive. |
| **P1 — Parity drift** | Typography, spacing, border-radius, label position, field type, placeholder, validation copy, options list, tab order, scroll region, empty/loading/error states differ from Jira. |
| **P2 — Polish** | Animation curve, focus ring thickness, micro-interaction timing, icon weight, tooltip copy — things that matter once P0/P1 are clean. |
| **Accepted delta** | Intentional house divergences (vocabulary, fonts, known visual choices). Named up front in Phase 0; listed in a dedicated section in the report; never counted against a gate. |

Every row also gets a **handoff tag** — `[LOVABLE]` for important implementation (large UI rebuilds), `[CLAUDE CODE]` for surgical code edits, or `[RESEARCH]` for things that need a Claude Chat research pass before the fix can be specified. Tag before advancing to Phase 4.

**Gate 3 → 4:** post the P0/P1/P2 counts + the handoff tag split (e.g., "P0: 4 [LOVABLE], 2 [CLAUDE CODE]; P1: 7 [CLAUDE CODE]; P2: 3 [POLISH]; 1 [RESEARCH] pending"). Ask "any research items to run first?" before advancing.

### Phase 3.5 — Research (optional, conditional gate)

If any finding is tagged `[RESEARCH]`, open a Claude Chat (claude.ai) and run the question there. State the question in one sentence, cite the specific audit finding, and wait for the answer before closing the row. Do not proceed to Phase 4 with open `[RESEARCH]` tags — either resolve them or downgrade the finding with a note.

Good research questions look like:
- "What @atlaskit/* primitive does Jira use for the issue-type picker (searchable avatar list with recent items)?"
- "Why does Jira's modal footer have two subtle buttons instead of one primary + one subtle?"
- "What token resolves to the pale-blue selected-row background on Jira's dynamic-table, and does @atlaskit/tokens expose it directly?"

Record the answer in the report's "Research notes" section (added to the report template below).

### Phase 4 — Audit report

Always use this exact structure. This is the deliverable.

```
# JIRA COMPARE — <surface name>
Date: <YYYY-MM-DD> · Auditor: Claude (jira-compare skill)

## Scope (from user's screenshot)
<one-sentence description of what's in scope>

Jira ref:     <url>
Catalyst ref: <url>
Screenshot:   <filename or "user-provided">

## Executive verdict
<one paragraph: is this surface acceptable as a clone of Jira, or not.
Name the dominant gap: "predominantly shadcn — must rebuild on @atlaskit/modal-dialog",
or "Atlaskit components correct, typography off by one step", etc.>

## Accepted deltas (intentional house divergences)
Named up front in Phase 0 and not counted against any gate.
| # | Delta | Why accepted |
|---|-------|--------------|
| 1 | "Recommended projects" (not Jira's "Recommended spaces") | Catalyst vocabulary — user direction |
| 2 | Inter / Sora fonts (not Atlassian Sans) | CLAUDE.md §1 Catalyst typography |
| 3 | Tab widths ~6px narrower | Inter vs Atlassian Sans x-height difference |

## P0 — Atlaskit mismatches
| # | Element | Jira (component) | Catalyst (today) | Fix (target @atlaskit/*) | Spec |
|---|---------|-------------------|-------------------|--------------------------|------|
| 1 | Summary field | @atlaskit/textfield | shadcn Input | Replace with `@atlaskit/textfield` ... | https://atlassian.design/components/textfield |

Every P0 row's "Spec" column must link to the exact Atlassian Design System page
(`https://atlassian.design/components/<name>`) the fix targets. The link pins the
audit to a canonical source — variant names, prop names, a11y rules, and
visual anatomy all come from that page, not from memory.

## P1 — Parity drift (typography, spacing, field props, tab order, scroll)
Grouped by element. For each: the Jira value, the Catalyst value, the fix.

## P2 — Polish
Short list. Don't pad.

## Typography sweep (page-level)
A small table of every distinct text role used on the surface:

| Role | Jira font | Jira size/weight/line-height | Catalyst today | Match? |
|------|-----------|------------------------------|----------------|--------|
| Dialog title | -apple-system stack via @atlaskit/heading | 20px/600/24px | Sora 18px/700/28px | ❌ |
| Field label  | ...                                        | 12px/600/16px  | Inter 13px/500/... | ❌ |

Typography is treated as page-level — audit the entire surface, not just one element. This is because Catalyst sets fonts via index.css + Tailwind whereas Jira sets them via Atlaskit primitives, and drift accumulates.

## Tab order
1. <field> (Jira: position 1) ↔ Catalyst: <position or "missing">
2. ...

List any reorderings, missing focus stops, or visual-vs-tab-order mismatches.

## Scroll behaviour
Which containers scroll on Jira, which on Catalyst, and whether they match.
Note sticky headers, sticky footers, and inertial behaviour.

## Data shape (T3 findings)
If the Jira Atlassian MCP was used to pull real issue/comment/field shape,
record what you learned so the implementer can match Jira's data model:
  - Fields present on the Jira response that Catalyst does not carry
  - Fields Catalyst carries that Jira does not
  - Enum value mismatches (status names, issue types, priorities)
  - Any hook extensions needed on the Catalyst side — see "Beyond UI" below.

## Proposed fix plan (Atlaskit-first, surgical)
An ordered, file-scoped punch list Claude Code can execute:
  1. src/components/<Hub>/<Component>.tsx — swap <Dialog> for ModalDialog from @atlaskit/modal-dialog.
  2. package.json — add "@atlaskit/modal-dialog": "^<latest>".
  3. vite.config.ts — add '@atlaskit/modal-dialog' to optimizeDeps.include.
  4. ...
Each step: one file, one change, one reason. No scope creep.

## Acceptance checks (for the human)
- [ ] All P0 rows closed — every interactive element in scope is @atlaskit/*.
- [ ] Typography sweep rows all "Match".
- [ ] Tab order matches Jira exactly.
- [ ] Scroll regions match Jira exactly.
- [ ] No shadcn / Radix / bespoke Tailwind in this surface.
- [ ] No invented icon/component left dormant in the repo.
- [ ] DevTools: fonts & spacing resolve to Atlaskit tokens (--ds-*).
- [ ] `npx tsc --noEmit` clean on the touched files.
```

Save the report to `.catalyst/audits/jira-compare/<YYYY-MM-DD>-<surface-slug>.md` in the repo, and also surface it inline in the reply so the user can scan it immediately.

Also add a `## Research notes` section (if any `[RESEARCH]` items ran) and a `## Handoff index` section listing how many findings go to Lovable vs Claude Code.

**Gate 4 → 5:** ask the user "report saved to `<path>` — ready to generate handoffs?"

### Phase 5 — Handoff (Lovable, Claude Code, or both)

For each finding, emit the right artefact based on its tag:

**`[LOVABLE]` — important implementation prompts.** Use DYNAMITE-style prompts (same format as the `forge` skill). The prompt must:
- Name the exact component file to change (e.g., `src/components/ProjectHub/IssueDetailModal.tsx`).
- Cite the target `@atlaskit/*` primitive AND its spec URL (`https://atlassian.design/components/<name>`).
- Specify acceptance criteria as a checklist (typography matches, tab order matches, tokens resolve to `--ds-*`, no shadcn imports remain).
- Ban mixing (no shadcn, no Radix, no bespoke Tailwind in the scoped surface).
- Include the adoption protocol block (package.json + vite.config.ts + canonical import) if the primitive isn't yet installed.

Template:
```
LOVABLE PROMPT — <surface slug>

Context:
  Catalyst is migrating the <surface> to the Atlassian Design System.
  Canonical spec: https://atlassian.design/components/<primitive>
  File in scope: <src/path/to/Component.tsx>

Task:
  Replace the current <old component> with @atlaskit/<primitive>, matching
  Jira's behaviour at https://digital-transformation.atlassian.net/<path>
  pixel-for-pixel within this surface.

Atlaskit-only mandate (hard):
  Every interactive element in <surface> must be an @atlaskit/* primitive.
  No shadcn, no Radix, no bespoke Tailwind. No exceptions.

Acceptance criteria:
  - [ ] <component> imports exclusively from @atlaskit/*.
  - [ ] Typography resolves via @atlaskit/heading / @atlaskit/primitives <Text>.
  - [ ] Spacing via @atlaskit/primitives (Box/Stack/Inline) + tokens.
  - [ ] Tab order matches Jira (enumerate positions).
  - [ ] Scroll region matches Jira (enumerate containers).
  - [ ] All colors resolve to --ds-* tokens from @atlaskit/tokens.

Adoption protocol (if primitive is not yet in package.json):
  1. Add "@atlaskit/<primitive>": "^<version>" to package.json.
  2. Add '@atlaskit/<primitive>' to vite.config.ts optimizeDeps.include.
  3. Import canonically in the target file.
  4. npm run dev — scripts/sync-deps.js auto-syncs.
```

**`[CLAUDE CODE]` — surgical code edits.** Use CLAUDE.md §10 task brief format. One file, one change, one reason. The brief must cite the failing row in the audit and the target Atlaskit primitive/spec.

Template:
```
CC TASK BRIEF — <concise action>

File:   src/path/to/Component.tsx
Change: <one-sentence diff summary>
Reason: Jira uses @atlaskit/<primitive> for <role>; current Catalyst uses <wrong thing>.
        Audit row: P0 #<n> in .catalyst/audits/jira-compare/<YYYY-MM-DD>-<slug>.md
Spec:   https://atlassian.design/components/<primitive>

Acceptance:
  - [ ] Only this file changed.
  - [ ] Import path: @atlaskit/<primitive> (NOT ~/components/ui/<old>).
  - [ ] TypeScript clean (`npx tsc --noEmit`).
  - [ ] No visual regression outside the scope of this row.
```

**`[RESEARCH]` — pending Claude Chat questions.** Emit as:
```
CLAUDE CHAT RESEARCH — <one-line question>

Context: audit row P<x> #<n>, .catalyst/audits/jira-compare/<YYYY-MM-DD>-<slug>.md
Question: <specific, answerable question>
Needed to: close the finding / choose between two primitives / verify a token value
```

Append all handoff blocks to the audit report under `## Handoff blocks`, and also save them individually to `.catalyst/audits/jira-compare/<YYYY-MM-DD>-<slug>/handoffs/<finding-id>.md` so the user can paste one at a time.

**Gate 5 → 6:** ask "want me to run any of these handoffs now, or queue for you to drive?"

### Phase 6 — Verify (self-check before handing back)

Run the verification checklist at the bottom of this file, then run the **Post-fix verification sequence** below if any fix has landed. Fix anything unchecked. Then report completion with the path to the audit report, the path to the handoff folder, and the P0/P1/P2 counts. Offer to start a new audit on the next surface or to drive one of the handoffs directly.

---

## Iterative audit loop — parity is a moving target

Parity is almost never achieved in one pass. After Phase 6, if any fix landed, **re-probe** against the same scope and append an iteration verdict to the same audit report file. Keep iterating until every acceptance check is green.

### When to iterate

- A [CLAUDE CODE] task brief was executed → iterate to verify the change landed and didn't regress neighbours.
- A [LOVABLE] prompt shipped → iterate to catch prompt drift (Lovable sometimes solves 90% of a brief and regresses an unrelated pixel).
- An [RESEARCH] answer came back and reshaped a finding → iterate to re-classify.
- The user reports "still doesn't look right" → iterate.

Do NOT iterate when every acceptance box is green AND the user has signed off. One pass without iteration is a silent fail.

### Iteration verdict template (append to the same `.md` report)

```
---

## Iteration <N> verdict — <YYYY-MM-DD HH:MM>

### Gate pass/fail

| # | Acceptance check | Iter N-1 | Iter N |
|---|-------------------|----------|--------|
| 1 | All P0 rows closed | ❌ 4 open | ✅ 0 open |
| 2 | Typography sweep matches | ❌ 3 drifts | ⚠️ 1 accepted delta |
| 3 | Tab order matches Jira | ✅ | ✅ |
| 4 | Scroll regions match | ✅ | ✅ |
| 5 | No shadcn in scope | ❌ 2 imports | ✅ |
| 6 | No invented components dormant | ❌ ProjectKindIcon.tsx | ✅ deleted |
| 7 | Tokens resolve to --ds-* | ⚠️ 1 drift | ✅ |
| 8 | `tsc --noEmit` clean | ✅ | ✅ |

### What changed since iter N-1
- <bullet: file touched, component changed>
- <bullet: file deleted>
- <bullet: hook extended with new field>

### New findings this iteration
- <if any new deltas were discovered while probing the fix>

### Accepted deltas carried forward
- <same list from report, reconfirmed>

### Decision
`ACCEPT` / `ITERATE AGAIN` / `REASSESS SCOPE`
```

Every iteration runs its own Phase 2 probe (split probes, state-setup, etc.) against the updated Catalyst DOM. Do not skip probing on the assumption "the fix should have worked" — verify.

### Probe → fix → re-probe cadence

```
iter 1: probe Jira + Catalyst → diff → 6 P0, 4 P1
iter 1: hand off → fixes land
iter 2: re-probe Catalyst ONLY → diff against iter-1 Jira snapshot
iter 2: 0 P0, 1 P1 (accepted delta), 0 regressions → ACCEPT
```

Re-probing Catalyst only (not Jira again) is safe if Jira's DOM hasn't changed between iterations — typically true within a single day. If more than a day has passed, re-probe both sides to catch Jira-side updates.

---

## Beyond UI — when parity requires data-shape changes

Sometimes the Catalyst surface can't reach Jira parity until the underlying data changes. Common signatures:

- The Jira row shows data Catalyst's hook doesn't carry (e.g., comment body, mentioner avatar, resolution date).
- The Jira field uses an enum Catalyst doesn't have (e.g., a Jira-only priority level or issue type).
- Jira renders a structure (groups, sub-rows, icons) that requires a new derived collection.

When this happens, UI edits alone are not enough. The fix plan must include a **hook/data extension step** before the UI step. Two rules of thumb:

### 1. Extend, don't modify

Add a new collection alongside the existing one — don't reshape `WorkItem`. Example:

```ts
// BEFORE
return { recommendedItems };  // WorkItem[] — used everywhere

// AFTER
return {
  recommendedItems,           // unchanged — every tab still works
  recommendedMentions,        // NEW — only RecommendedPanel consumes this
};
```

This contains the blast radius to one consumer. Never edit a type that's used by 10+ files to serve one new consumer.

### 2. Local maps beat stale state in the same tick

If the useEffect just ran `setFoo(map)`, reading `foo` on the next line still sees the stale value — state updates don't apply until the next render. Use the local variable for anything downstream in the same tick:

```ts
// WRONG — uses stale state
const pMap = new Map<string, string>();
jiraProjects.forEach(p => pMap.set(p.key, p.name));
setProjectNameMap(pMap);
// ... later in the same useEffect ...
projectName: projectNameMap.get(key),  // STALE — still the old value

// RIGHT — use the local
const localProjectNameMap = new Map<string, string>();
jiraProjects.forEach(p => localProjectNameMap.set(p.key, p.name));
setProjectNameMap(localProjectNameMap);  // commit to state for next render
// ... later ...
projectName: localProjectNameMap.get(key),  // FRESH
```

### 3. Decide data-shape before coding the UI

Before writing the new UI, confirm the data you need exists in Supabase (or the matching source). A single T3 probe (Jira MCP) + a `SELECT` sketch avoids building a pixel-perfect row that has no data to render. Put the data decision in the report's "Data shape" section before the fix plan.

---

## Atlaskit primitive cheat sheets

### Avatar size + shape

Atlaskit's `@atlaskit/avatar` has fixed sizes and a shape axis. Memorise these — they come up in every row-and-card audit.

| `size` | Pixel box | Typical use |
|--------|-----------|-------------|
| `xsmall` | 16×16 | Inline in dense list cells |
| `small` | 24×24 | Assignee pill, avatar group |
| `medium` | 32×32 | Default row avatar (user) AND default card avatar (project) |
| `large` | 40×40 | Empty-state hero, prominent tile |
| `xlarge` | 96×96 | Profile page |

| `appearance` | Shape | Semantics |
|--------------|-------|-----------|
| default (circle) | round | Users (human faces) — mentioner, assignee, reporter |
| `square` | rounded square | Non-humans — projects, spaces, workspaces, teams |

**Default radius on `appearance="square" size="medium"` is ~8px (~25% of the side).** Jira's project tiles render at radius 4 because they override the token; Atlaskit's default is 8. This is an accepted delta in most Catalyst audits — cite it rather than fighting the primitive.

### Work-item icons (CLAUDE.md §11 immutable)

**Never invent a work-item-type icon component.** The 14 canonical icons live in `src/components/shared/WorkItemIcon.tsx` and are frozen per CLAUDE.md §11. If a finding says "wrong work-item icon", the fix is always: import the canonical `WorkItemIcon` with `type={normalizeIconType(issue.issue_type)}`. Delete any invented substitutes (e.g., a bespoke `ProjectKindIcon.tsx` carrying hand-drawn SVGs) — dormant copies cause future regressions.

Project/space card tiles are NOT work-item icons — those use `@atlaskit/avatar` with `appearance="square"`.

### Atlaskit tokens — observed values (Apr 2026, read live)

Observed from the Jira tab during recent audits. Always re-read via the probe-7 snippet above; these are reference snapshots, not sources of truth.

| Token | Observed value (light) | Role |
|-------|------------------------|------|
| `--ds-background-neutral` | `#0515240F` | Pill tab container bg, neutral inset |
| `--ds-background-neutral-hovered` | `rgba(11, 18, 14, 0.14)` | Neutral hover overlay |
| `--ds-surface-hovered` | `#F0F1F2` | Row / card hover surface |
| `--ds-text` | `#292A2E` | Primary text |
| `--ds-text-subtle` | `#505258` | Secondary / breadcrumb text |
| `--ds-text-subtlest` | `#8590A2` | Mono key, tertiary text |
| `--ds-border` | `rgba(11, 18, 14, 0.14)` | Subtle card border |
| `--ds-link` | `#1868DB` | Hyperlink (Jira) |

Catalyst's `--cp-*` tokens do NOT equal these — a P0/P1 finding may need to remap. When the Catalyst surface is on Atlaskit, prefer `token('color.text', fallback)` from `@atlaskit/tokens` over reading `--cp-*` directly.

---

## Post-fix verification sequence — run every time a fix lands

Before saying "done", run through this sequence in order. It catches the regressions Chrome MCP probes miss.

1. **TypeScript check** — `npx tsc --noEmit --project tsconfig.json` must finish with no errors on the touched files. If it errors, fix before declaring a win.
2. **Grep-for-ghosts** — if a component was deleted or renamed, grep the repo for every reference to the old name. A stale comment or import slipping through will cause a build break on the next cold start. Example: after deleting `ProjectKindIcon.tsx`, run `grep -r "ProjectKindIcon" src/` and clean up any references.
3. **Comment currency** — read the adjacent comments in every file touched. After a component swap the comments often refer to the removed thing (e.g., "renders a <ProjectKindIcon>"). Update to reflect the new reality.
4. **Re-probe** — run Phase 2 against the Catalyst tab ONLY (Jira rarely changes mid-session) and diff against the last iteration's snapshot. Confirm every previously-failing gate now passes.
5. **Accepted-delta audit** — re-read the "Accepted deltas" section in the report. Any new gap that wasn't in that list is a finding, not a delta.
6. **Tab-order + scroll retest** — parity regressions most often hide in focus-move order and overflow containers. Walk the tab ring once and scroll every container that scrolled on Jira.

If any step fails, iterate — do not hand the report back as complete.

---

## Scoping discipline — the single most common failure mode

The scope is the screenshot. Nothing else.

- If the screenshot shows a modal, you do not audit the page behind the modal.
- If the screenshot shows one form field, you do not audit the other fields.
- If the screenshot shows the right rail, you do not audit the top nav.
- You can still note "the rest of the page uses @atlaskit/*" as context — but findings only for in-scope elements.

When in doubt, err on the side of narrower scope and ask the user to widen it explicitly.

## How to fingerprint Atlaskit vs everything else

Load `references/atlaskit-detection.md` when you need the full decision tree (DOM attributes, class prefixes, portal containers, import-graph tells). Short-circuit heuristics:

- `data-testid="<role>--*"` with kebab-case → Atlaskit.
- `data-radix-*` or `data-state="open|closed"` → Radix / shadcn.
- Emotion class names (`css-<hash>`) at the root → likely Atlaskit (Emotion is their style runtime).
- Tailwind utility chains (`class="flex items-center gap-2 ..."`) with no vendor attrs → bespoke Tailwind.
- Lucide SVG children on a work-item type icon → CLAUDE.md §11 violation (must be canonical SVGs), flag as related P1.
- Hand-drawn SVGs inside a bespoke "icon" component → often an invented substitute for an Atlaskit Avatar or canonical WorkItemIcon. Flag as P0.

## How to get Atlaskit token values

For any Catalyst element you want to flag as "wrong token", you need to know what the right Atlaskit token resolves to. Inside the Jira tab's DevTools context (via `javascript_tool`), read the CSS custom property using the probe-7 snippet above. Do not hard-code values — tokens drift between Atlaskit versions.

Catalyst's `--cp-*` tokens are NOT the same as Atlaskit's `--ds-*` tokens. Part of the audit is flagging where Catalyst is using `--cp-*` for a role Atlaskit would set via `--ds-*`.

## What counts as a Catalyst migration debt entry

If the audit finds the right Atlaskit primitive is missing from `package.json`, the entry in the fix plan must include the adoption protocol (CLAUDE.md §1):

1. Add `"@atlaskit/<pkg>": "^<version>"` to `package.json` dependencies.
2. Add `'@atlaskit/<pkg>'` to `vite.config.ts` `optimizeDeps.include`.
3. Import canonically in the target file.
4. Run `npm run dev` — scripts/sync-deps.js auto-syncs.

Call this out as a single block; don't re-explain it on every row.

## Output conventions

- Report file: `.catalyst/audits/jira-compare/<YYYY-MM-DD>-<surface-slug>.md`
- Screenshots (Jira & Catalyst, rendered for comparison): `.catalyst/audits/jira-compare/assets/<YYYY-MM-DD>-<surface-slug>/{jira.png, catalyst.png}` (when SPA polling allows screenshots; otherwise skip and rely on DOM probes).
- Diff JSON (optional, machine-readable copy of the element zip): same folder, `diff.json`
- Per-finding handoff blocks: `.catalyst/audits/jira-compare/<YYYY-MM-DD>-<surface-slug>/handoffs/<finding-id>.md`

If the audit directory doesn't exist, create it. Don't commit these unless the user asks.

## When NOT to use this skill

- User wants a general design critique without a specific Jira reference → use `design:design-critique` instead.
- User wants a11y audit only → use `design:accessibility-review`.
- User wants developer specs for a Catalyst surface that isn't meant to mirror Jira → use `design:design-handoff`.
- User wants a full-app audit → ask them to pick a single surface first. This skill refuses to audit more than one surface at a time; the scoping discipline is the value.

## Verification step (mandatory before handing the report back)

Before you send the report, verify:

- [ ] Phase 0 Intake Q&A was completed and answered — no silent defaults. (Includes question 7 — known house divergences.)
- [ ] Jira URL is under `https://digital-transformation.atlassian.net`.
- [ ] Catalyst side is `http://localhost:8080` unless the user explicitly named a different URL.
- [ ] All three tabs opened in the visual Chrome MCP and responded with real DOM (jira, catalyst, atlaskit at `https://atlassian.design/components`).
- [ ] No dev-browser calls, no computer-use clicks/typing on a browser — only `mcp__Claude_in_Chrome__*`.
- [ ] Gate confirmations were posted at every phase boundary (Phase 1→2, 2→3, 3→4, 4→5, 5→6).
- [ ] Every row in the P0 table names a specific `@atlaskit/*` package AND links to its `https://atlassian.design/components/<name>` page.
- [ ] Every finding has a handoff tag — `[LOVABLE]`, `[CLAUDE CODE]`, or `[RESEARCH]`.
- [ ] All `[RESEARCH]` items were resolved via Claude Chat or explicitly deferred with a note.
- [ ] Accepted deltas section is filled in (even if empty, state "none").
- [ ] Typography sweep has at least one row per distinct text role visible in the screenshot.
- [ ] Tab order was computed, not guessed.
- [ ] Fix plan cites concrete file paths in `src/`.
- [ ] Handoff blocks were emitted in the correct format (DYNAMITE for Lovable, CC Task Brief for Claude Code).
- [ ] Report is saved to `.catalyst/audits/jira-compare/<...>.md` and handoffs to `.catalyst/audits/jira-compare/<...>/handoffs/`.
- [ ] Post-fix verification sequence ran if any fix landed (`tsc --noEmit`, grep-for-ghosts, comment currency, re-probe).
- [ ] Iteration verdict appended if this is iteration ≥ 2.

If any box is unchecked, fix it before replying.

---

## Quick reference — Atlaskit primitives you'll cite most often

Every row includes the canonical spec URL on `https://atlassian.design/components` —
the single source of truth for variants, props, anatomy, and accessibility rules.

| Role in Jira | Atlaskit package | Spec |
|--------------|------------------|------|
| Primary button | `@atlaskit/button/new` (`<Button appearance="primary">`) | https://atlassian.design/components/button |
| Subtle / ghost button | `@atlaskit/button/new` (`appearance="subtle"`) | https://atlassian.design/components/button |
| Icon-only button | `@atlaskit/button/new` (`<IconButton>`) | https://atlassian.design/components/button |
| Text input | `@atlaskit/textfield` | https://atlassian.design/components/textfield |
| Textarea | `@atlaskit/textarea` | https://atlassian.design/components/textarea |
| Select (single/multi) | `@atlaskit/select` | https://atlassian.design/components/select |
| User picker | `@atlaskit/user-picker` | https://atlassian.design/components/user-picker |
| Checkbox | `@atlaskit/checkbox` | https://atlassian.design/components/checkbox |
| Radio | `@atlaskit/radio` | https://atlassian.design/components/radio |
| Toggle | `@atlaskit/toggle` | https://atlassian.design/components/toggle |
| Date / datetime | `@atlaskit/datetime-picker` | https://atlassian.design/components/datetime-picker |
| Calendar | `@atlaskit/calendar` | https://atlassian.design/components/calendar |
| Modal | `@atlaskit/modal-dialog` | https://atlassian.design/components/modal-dialog |
| Drawer | `@atlaskit/drawer` | https://atlassian.design/components/drawer |
| Popover | `@atlaskit/popup` | https://atlassian.design/components/popup |
| Dropdown menu | `@atlaskit/dropdown-menu` | https://atlassian.design/components/dropdown-menu |
| Tabs | `@atlaskit/tabs` | https://atlassian.design/components/tabs |
| Breadcrumbs | `@atlaskit/breadcrumbs` | https://atlassian.design/components/breadcrumbs |
| Page header | `@atlaskit/page-header` | https://atlassian.design/components/page-header |
| Status pill | `@atlaskit/lozenge` | https://atlassian.design/components/lozenge |
| Badge (count) | `@atlaskit/badge` | https://atlassian.design/components/badge |
| Avatar (user = circle; project/space = square) | `@atlaskit/avatar` | https://atlassian.design/components/avatar |
| Avatar group | `@atlaskit/avatar-group` | https://atlassian.design/components/avatar-group |
| Tooltip | `@atlaskit/tooltip` | https://atlassian.design/components/tooltip |
| Toast / flag | `@atlaskit/flag` | https://atlassian.design/components/flag |
| Section message | `@atlaskit/section-message` | https://atlassian.design/components/section-message |
| Empty state | `@atlaskit/empty-state` | https://atlassian.design/components/empty-state |
| Spinner | `@atlaskit/spinner` | https://atlassian.design/components/spinner |
| Progress bar | `@atlaskit/progress-bar` | https://atlassian.design/components/progress-bar |
| Progress tracker | `@atlaskit/progress-tracker` | https://atlassian.design/components/progress-tracker |
| Dynamic table | `@atlaskit/dynamic-table` | https://atlassian.design/components/dynamic-table |
| Table tree | `@atlaskit/table-tree` | https://atlassian.design/components/table-tree |
| Rich-text editor | `@atlaskit/editor-core` | https://atlassian.design/components/editor |
| Form scaffolding | `@atlaskit/form` | https://atlassian.design/components/form |
| Layout primitives | `@atlaskit/primitives` (`Box`/`Stack`/`Inline`/`Grid`) | https://atlassian.design/components/primitives |
| Heading | `@atlaskit/heading` | https://atlassian.design/components/heading |
| Tokens | `@atlaskit/tokens` | https://atlassian.design/tokens |
| Icons | `@atlaskit/icon` / `@atlaskit/icon-lab` | https://atlassian.design/components/icon |

If Jira renders it and Atlaskit has the matching primitive, Catalyst must use that primitive. No exceptions inside scope.
