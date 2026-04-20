---
name: jira-compare
description: Pixel-perfect audit that compares a Catalyst surface (http://localhost:8080) against the equivalent Jira (Atlassian) surface, with the Atlassian Design System reference at https://atlassian.design/components as the canonical spec. Uses the visual Chrome MCP (`mcp__Claude_in_Chrome__*`) on all three sides — never dev-browser, never computer-use — because the audit needs the real rendered DOM and live computed styles in a visible browser. Trigger whenever the user says "jira compare", "compare to jira", "audit vs jira", "match jira", "clone jira", "mirror jira", "jira parity", "jira audit", or shares a Jira screenshot/URL alongside a Catalyst screen and asks for feedback, alignment, or a migration plan. Use it for every Catalyst-vs-Jira comparison — field-level, typography, spacing, tab order, scroll, labels, component identity. The skill's HARD GUARDRAIL is Atlaskit-only: every interactive element on the Catalyst side within the screenshot's scope MUST map to an `@atlaskit/*` primitive documented at https://atlassian.design/components. This guardrail OVERRIDES any "legacy shadcn is OK until migration" language in CLAUDE.md — when this skill runs, Atlaskit is the single source of truth for that surface.
---

## Pinned endpoints (hard guardrails — never substitute)

| Endpoint | URL | Used for |
|----------|-----|----------|
| Atlaskit design reference | `https://atlassian.design/components` | Canonical spec for every `@atlaskit/*` primitive — props, anatomy, accessibility, dos/don'ts. Every P0 finding must cite the matching `/components/<name>` page. |
| Catalyst (local dev) | `http://localhost:8080` | Default Catalyst side of the audit. Never audit a production URL unless the user explicitly names one. If localhost:8080 isn't responding, stop and tell the user to start the dev server. |
| Jira | User-supplied URL | `<tenant>.atlassian.net/...` — always provided per-audit. |

**Tooling mandate:** all three endpoints are driven through the visual Chrome MCP (`mcp__Claude_in_Chrome__*`). Do not use the dev-browser skill (headless), and do not use computer-use (browsers are tier "read" — clicks and typing are blocked). Chrome MCP is DOM-aware, visible to the user, and the only path that produces a reliable computed-style snapshot. If the Chrome extension isn't connected, stop and ask the user to install/connect it — never fall through to a slower tier.


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

A fourth reference — the Atlaskit design site (`https://atlassian.design/components`) — is always opened as a third tab. The user does not provide this; the skill opens it automatically and consults it whenever a primitive needs disambiguating (variant props, allowed appearances, anatomy diagrams).

---

## Workflow

### Step 1 — Confirm scope with the user

Before touching any tool, restate the scope in one sentence and confirm. Example:

> "Scoping to the Issue Create dialog on the Jira side (`https://vikramataol.atlassian.net/...`) and the Create Issue modal on Catalyst (`http://localhost:8080/projects/PROJ-1/create`). I'll audit every field visible in your screenshot, typography across the dialog, tab order, and scroll. Proceed?"

If the user adjusts, adjust before continuing.

### Step 2 — Load the visual Chrome MCP toolkit

The Chrome MCP tools are deferred. Load them in bulk in one call:

```
ToolSearch({ query: "chrome", max_results: 20 })
```

You need `mcp__Claude_in_Chrome__navigate`, `mcp__Claude_in_Chrome__get_page_text`, `mcp__Claude_in_Chrome__javascript_tool`, `mcp__Claude_in_Chrome__tabs_create_mcp`, `mcp__Claude_in_Chrome__tabs_context_mcp`, `mcp__Claude_in_Chrome__find`, `mcp__Claude_in_Chrome__read_page`.

**Tool discipline (mandatory):**
- Use the visual Chrome MCP only. Never run the dev-browser / headless playwright setup for this skill — the user wants to *see* the browser doing the work.
- Never attempt computer-use clicks/typing on browser windows — browsers are tier "read" there and the call will error.
- If the Chrome extension isn't connected, stop and ask the user to install/connect it. Do not degrade to any other tier.

### Step 3 — Open all three sides in parallel tabs

Use `tabs_create_mcp` for three named contexts and keep them throughout the audit:

1. `"jira"` → the user's Jira URL.
2. `"catalyst"` → `http://localhost:8080` + the route. Pin to localhost:8080 unless the user explicitly names a different URL. If the page 404s or the dev server isn't running, stop and tell the user to start Catalyst locally — do not substitute production.
3. `"atlaskit"` → `https://atlassian.design/components`. Keep this tab open for the entire audit; navigate within it to each primitive's page as the audit references them (e.g., `/components/button/examples`, `/components/modal-dialog/examples`).

Jira auth: if the Jira tab redirects to login, stop and tell the user "please log into Jira in the tab I just opened, then say continue." Never try to automate Atlassian auth.

Set viewport to match the user's screenshot width if obvious (1280×900 is a good default; 1440×900 for large macs).

### Step 4 — Extract the surface on both sides

For each side, run a single `javascript_tool` call that returns structured data. Keep the scope tight — target the container that matches the screenshot (modal root, form root, right-rail, etc.), not the whole page.

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

### Step 5 — Build the side-by-side diff

For each element in scope, zip Jira ↔ Catalyst. Any element that exists on one side but not the other is itself a finding.

Classify every delta into one of three tiers:

| Priority | What it covers |
|----------|----------------|
| **P0 — Atlaskit mismatch** | Catalyst uses shadcn, Radix, Tailwind-bespoke, or raw HTML where Atlaskit has a primitive. Also: wrong Atlaskit primitive for the role (e.g., `@atlaskit/button` where Jira uses `@atlaskit/dropdown-menu`). |
| **P1 — Parity drift** | Typography, spacing, border-radius, label position, field type, placeholder, validation copy, options list, tab order, scroll region, empty/loading/error states differ from Jira. |
| **P2 — Polish** | Animation curve, focus ring thickness, micro-interaction timing, icon weight, tooltip copy — things that matter once P0/P1 are clean. |

### Step 6 — Produce the audit report

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
- [ ] DevTools: fonts & spacing resolve to Atlaskit tokens (--ds-*).
```

Save the report to `.catalyst/audits/jira-compare/<YYYY-MM-DD>-<surface-slug>.md` in the repo, and also surface it inline in the reply so the user can scan it immediately.

### Step 7 — Offer the fix handoff

After the report, ask: "Want me to generate a CC Task Brief for step 1 of the fix plan?" — phrased in CLAUDE.md §10 format, one file at a time.

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

## How to get Atlaskit token values

For any Catalyst element you want to flag as "wrong token", you need to know what the right Atlaskit token resolves to. Inside the Jira tab's DevTools context (via `javascript_tool`), read the CSS custom property:

```js
getComputedStyle(document.documentElement).getPropertyValue('--ds-background-neutral');
// → "#f1f2f4" in light mode
```

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
- Screenshots (Jira & Catalyst, rendered for comparison): `.catalyst/audits/jira-compare/assets/<YYYY-MM-DD>-<surface-slug>/{jira.png, catalyst.png}`
- Diff JSON (optional, machine-readable copy of the element zip): same folder, `diff.json`

If the audit directory doesn't exist, create it. Don't commit these unless the user asks.

## When NOT to use this skill

- User wants a general design critique without a specific Jira reference → use `design:design-critique` instead.
- User wants a11y audit only → use `design:accessibility-review`.
- User wants developer specs for a Catalyst surface that isn't meant to mirror Jira → use `design:design-handoff`.
- User wants a full-app audit → ask them to pick a single surface first. This skill refuses to audit more than one surface at a time; the scoping discipline is the value.

## Verification step (mandatory before handing the report back)

Before you send the report, verify:

- [ ] All three inputs were captured (Jira URL, Catalyst URL, screenshot scope).
- [ ] All three tabs were actually opened in the visual Chrome MCP and responded with real DOM (jira tab, catalyst at `http://localhost:8080`, atlaskit at `https://atlassian.design/components`).
- [ ] Catalyst side is `http://localhost:8080` unless the user explicitly named a different URL.
- [ ] Every row in the P0 table names a specific `@atlaskit/*` package AND links to its `https://atlassian.design/components/<name>` page.
- [ ] Typography sweep has at least one row per distinct text role visible in the screenshot.
- [ ] Tab order was computed, not guessed.
- [ ] Fix plan cites concrete file paths in `src/`.
- [ ] Report is saved to `.catalyst/audits/jira-compare/<...>.md`.
- [ ] No dev-browser calls, no computer-use clicks/typing on a browser — only `mcp__Claude_in_Chrome__*`.

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
| Avatar | `@atlaskit/avatar` | https://atlassian.design/components/avatar |
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
