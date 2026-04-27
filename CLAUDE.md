# CLAUDE.md — Catalyst Platform Context
## Claude Code Persistent Context File
## Last Updated: April 2026 (F5 font lock) | Owner: Vikram (Delivery Manager)

> **READ THIS FILE FIRST — BEFORE TOUCHING ANY CODE.**
> This file is the authoritative context for all Claude Code work on the Catalyst platform.
> Every task brief, fix prompt, and code change must comply with everything below.

---

## 1. PROJECT IDENTITY

**Platform:** Catalyst — Enterprise Portfolio Management  
**Client:** Saudi Arabia Ministry of Industry & Mineral Resources (MoIM)  
**Operator:** TurnQy FZCO LLC (Vikram, Delivery Manager + Senior UX Engineer)  
**Quality Standard:** GOD-TIER ≥9.5/10 — no exceptions  
**Benchmarks:** Linear, Jira Align, Notion, Bloomberg Terminal

**Stack:**
```
Frontend:   React + TypeScript
Styling:    Tailwind CSS + shadcn/ui
Backend:    Supabase (PostgreSQL + Edge Functions + Auth)
Data:       TanStack Query (React Query)
Icons:      Lucide React for UI chrome; canonical SVGs for work-item types (see §11)
Builder:    Lovable AI (Claude Code now assists/replaces for fixes)
Fonts:      Sora (headings) · Inter (body/UI) · JetBrains Mono (data)
            Token chain (F1 complete): --cp-font-* (index.css :root)
              → --ds-font-family-* (catalyst-typography.css)
              → Tailwind fontFamily / FONT_STACK / tokens.ts
            F2 will swap --cp-font-* values to Charlie Display (no pixel change until then)

Atlassian Design System / Atlaskit:
  Active migration target. Catalyst is being migrated to @atlaskit/* and the
  Atlassian Design System progressively, one surface at a time. Adopting
  @atlaskit/* primitives in any new or refactored surface is ENCOURAGED and
  requires no path-scoping review. When an Atlaskit primitive exists for a
  role (Breadcrumbs, Page header, Tabs, Lozenge, primitives/tokens, editor,
  dynamic-table, etc.), prefer it over a bespoke clone. Tokens from
  @atlaskit/tokens are the source of truth for spacing/color/typography on
  surfaces that have migrated. Legacy shadcn/Tailwind surfaces remain in
  place until their scheduled migration — do not mix the two systems on the
  same surface in a single change.

  Adoption protocol (DO THIS every time you add a new @atlaskit/* package):
    1. Add "@atlaskit/<pkg>": "^<version>" to package.json dependencies.
    2. Add '@atlaskit/<pkg>' to vite.config.ts optimizeDeps.include so vite
       pre-bundles it on first dev start (otherwise first render stalls on
       cold optimize and can 404 in-flight chunks — the modal loading class
       of bug we fought in April 2026).
    3. Import canonically in the target surface.
    4. No manual `bun install` needed — `npm run dev` / `bun run dev`
       auto-sync via scripts/sync-deps.js (runs <10ms when lockfile matches
       node_modules, installs otherwise).
```

**Calendar:** Sunday = first day of work week (Saudi convention — enforce in ALL date components)  
**Currency:** SAR | **Timezone:** Asia/Riyadh (UTC+3) | **Language:** English primary  
**Names in seed data:** Saudi context — Dr. Ahmed Al-Rashid, Eng. Fatima Al-Harbi, etc.

---

## 2. HUB ARCHITECTURE

**Nav Chrome (top nav — present on EVERY page):**
```
Home | StrategyHub | ProductHub | ProjectHub | ReleaseHub | TestHub | IncidentHub | TaskHub | PlanHub
```

**Hub Registry:**

| Hub | Status | Notes |
|-----|--------|-------|
| Hub 0 — Nav Chrome | ✅ SHIPPED | ECLIPSE dark mode complete |
| Hub 1 — StrategyHub | 🟡 CASCADE FIX | Regression pending |
| Hub 2 — ProductHub | 🟡 UNVERIFIED FIX | Fix prompts exist, DevTools not confirmed |
| Hub 3 — ProjectHub | 🔴 MID-FIX | HSL drift active, inline style violations |
| Hub 4 — ReleaseHub | ✅ SHIPPED | G0–G9 complete |
| Hub 5 — TestHub | ✅ SHIPPED | `tm_test_cases` (NOT legacy `test_cases`) |
| Hub 6 — IncidentHub | ✅ SHIPPED | |
| Hub 7 — TaskHub | ✅ SHIPPED | |
| Hub 8 — PlanHub | ✅ SHIPPED | Planner V9; typography bridge to `--cp-font-*` live (F5/L43) |
| Hub 9 — WikiHub | ✅ SHIPPED | RAG-powered, 9 domains |

**Active Pipelines:**
- ECLIPSE v2.0 — NOCTURNE Dark Mode conversion (ongoing)
- Font Migration F2–F5 — ✅ COMPLETE (Apr 2026) — Charlie ADS fonts locked across all hubs

---

## 3. ECLIPSE DARK MODE PIPELINE

### NOCTURNE Geist — Canonical Dark Tokens (Apr 2026)

```
Page background:    #0A0A0A
Card / surface:     #1A1A1A
Hover surface:      #1F1F1F   (solid hex — NEVER rgba)
Active / pressed:   #292929
Sidebar bg:         #111111
Modal / overlay:    #000000
Border default:     #2E2E2E   (solid hex — NEVER rgba)
Border subtle:      #292929
Border medium:      #454545
Text primary:       #EDEDED
Text secondary:     #A1A1A1
Text muted:         #878787
Text tertiary:      #7D7D7D
Placeholder:        #878787
Shadow sm:          none
Shadow md:          0 2px 8px rgba(0,0,0,0.4)
```

### ECLIPSE Lessons — ENFORCED IN EVERY FIX

These are hard-won lessons from the ECLIPSE pipeline. Violating them causes regressions.

**L27 — CRITICAL: Lovable/Tailwind Dark Mode**
> Lovable ignores CSS custom property (`var()`) declarations inside `.dark {}` blocks.
> **Rule:** Use Tailwind `dark:` utility classes directly on elements. Never rely on CSS vars for dark mode overrides in Tailwind context.
> `dark:bg-[#0A0A0A]` NOT `background: var(--bg-nocturne)`

**L32 — Cascade Audit Mandatory**
> Before touching `index.css`, run: `grep -r ".dark .bg-white" src/`
> Multiple `.dark .bg-white { !important }` blocks = elevation token conflicts (S7 root cause)
> **Rule:** Always audit cascade BEFORE writing any dark mode CSS.

**L34 — !important Upstream Signal**
> 3+ failed Tailwind dark: overrides on the same element = `!important` upstream in `index.css`
> **Rule:** Stop. grep for the upstream block. Fix root cause, not symptoms.
> `grep -r "!important" src/index.css` before any cascade work.

**L35 — Consolidate, Don't Stack**
> Design drift creates duplicate override blocks. Each session stacks another layer.
> **Rule:** Before adding any `.dark` override block, search for existing ones. Consolidate into ONE block per selector. Never stack.

**L36 — Prompt Length Ceiling**
> Lovable ignores prompts >~2000 words. (For Claude Code: keep task briefs surgical — single component scope.)
> **Rule:** One component, one file, one fix per task execution.

**L37 — No Surface-Level Passes**
> "Looks dark in the screenshot" is not a pass. DevTools verification is mandatory.
> **Rule:** After any dark mode fix, verify: computed `background-color` = `rgb(26, 23, 20)` in DevTools. No exceptions.

**L38 — HSL Conversion Drift (ProjectHub dominant pattern)**
> Lovable converts hex literals to HSL during builds. HSL drifts from original hex.
> **Rule:** Claude Code must use **hex literals only** — never HSL — in all style assignments.
> Verify with: computed `rgb()` values in DevTools, not visual inspection.

**L39 — CRITICAL: Supabase UUID Column Type Mismatch (Silent 400)**
> When a Supabase `.neq('id', value)` or `.eq('id', value)` is called where `id` is a UUID column
> but `value` is a non-UUID string (e.g. an issue key like "BAU-5389"), PostgreSQL rejects with
> error `22P02: invalid input syntax for type uuid`. The Supabase JS client returns this as a
> silent 400 — **no rows returned, no JS exception thrown, just empty `data`**.
> **Rule:** NEVER pass issue keys, display names, or any non-UUID string to UUID-typed columns
> (`id`, `user_id`, `project_id`, etc.). Always verify the prop name matches the actual value type.
> If a prop is named `issueId` but receives `issue_key`, use `.neq('issue_key', value)` instead.
> **Debug pattern:** If a Supabase query returns empty unexpectedly, check column types first.
> RCA: BAU-5389 convert-to-subtask parent search returned 0 results for 6 consecutive fix attempts.

**L40 — CRITICAL: ADS Font Chain — Never Bypass the Bridge (F1 complete)**
> `--ds-font-family-{body,heading,monospaced}` are the tokens @atlaskit/* reads.
> They delegate to `--cp-font-{body,heading,mono}` in `src/index.css :root` via `catalyst-typography.css`.
> **Rule:** Never assign a literal font name directly to `--ds-font-family-*`. Always use `var(--cp-font-*)`.
> To change a font globally, update `--cp-font-*` in the F1 bridge block in `index.css` — nowhere else.

**L41 — Bridge Token Discipline**
> `--cp-font-*` in `src/index.css :root` is the SINGLE source of truth for font families.
> Tailwind `fontFamily`, `typography.ts` FONT_STACK constants, and `tokens.ts` all read via the ADS chain.
> **Rule:** Do NOT set font-family literals in tailwind.config.ts, typography.ts, or tokens.ts.
> Those files use `var(--ds-font-family-*)` with fallbacks only.

**L42 — F2 Scope Guard (Charlie Display)**
> F2 swaps `--cp-font-heading` and `--cp-font-body` to Charlie Display.
> F1 (committed) established the chain without changing rendered pixels.
> **Rule:** Do NOT change `--cp-font-*` values in any task other than the F2 task brief.
> Ringfenced: `--ph-font`, `--planner-*`, `src/styles/planhub.css`, `src/modules/planner/styles/*`.

**L43 — CRITICAL: ph_issues SELECT silent 400**
> Selecting a non-existent column from `ph_issues` (e.g. `comment_count`)
> triggers a PostgREST 400 with PG error `42703 column does not exist`.
> The Supabase JS client returns the error inside the result object, but
> React Query callers that throw on error catch it internally — the rest
> of the page renders fine while the affected query holds an empty array.
> Symptom seen Apr 28, 2026: BAU's Parent picker rendered "No parent" +
> "No matches" on every row. Cause: `useEpicBacklog` selected
> `comment_count`, returned `[]`, `parentOptions = epics.map()` was empty.
> **Rule:** Before adding a column to a SELECT against `ph_issues`,
> verify it exists by checking `src/integrations/supabase/types.ts`
> (auto-generated from the schema). Forbidden columns (do not exist):
> `comment_count`, `attachment_count`, `child_count`, `children_count`,
> `link_count`, `worklog_count`. Identity columns that DO exist:
> `id` (UUID) AND `issue_key` (text PK).
> **Diagnostic:** when a derived UI element (picker, filter, badge) is
> empty when it shouldn't be, fire the underlying SQL DIRECTLY against
> the Supabase REST endpoint with `fetch()` and read the error body
> BEFORE assuming a render bug. A 400 from PostgREST is invisible in the
> UI and trivial to spot in DevTools network.

### ProjectHub Violation Pattern (S7 RCA)

**Root cause:** Multiple `.dark .bg-white { background: ... !important }` blocks in `index.css` create elevation token conflicts.

**Primary violation type:** Inline `style={{ background: '#...' }}` props on JSX elements override Tailwind `dark:` classes. Tailwind dark cannot override inline styles.

**Fix strategy:** Option C Hybrid
1. Replace inline `style={{ background }}` with conditional className: `className={isDark ? 'bg-[#0A0A0A]' : 'bg-white'}`
2. Add scoped CSS override as fallback: `.dark .component-name { background: #0A0A0A !important }`
3. Consolidate all `.dark` blocks — never allow duplicates

---

## 4. CATALYST V12 HYBRID PRECISION — DESIGN TOKENS

**Token prefix:** `--cp-*`

### Core Semantic Tokens

```css
/* BACKGROUNDS */
--cp-bg-page:        #FFFFFF      /* page canvas */
--cp-bg-surface:     #FFFFFF      /* cards, panels */
--cp-bg-overlay:     #F8FAFC      /* subtle alt sections */
--cp-bg-inset:       #F1F5F9      /* table header, input bg */

/* TEXT */
--cp-text-primary:   #0F172A
--cp-text-secondary: #475569
--cp-text-muted:     #94A3B8
--cp-text-disabled:  #CBD5E1
--cp-text-inverse:   #FFFFFF

/* BORDERS */
--cp-border-default: #E2E8F0
--cp-border-strong:  #CBD5E1
--cp-border-focus:   #2563EB

/* BRAND */
--cp-primary-60:     #2563EB      /* primary CTA, +Create button ONLY */
--cp-primary-70:     #1D4ED8      /* primary hover */

/* INTERACTIVE OVERLAYS (4-State Model) */
--cp-interact-hover:    rgba(0,0,0,0.04)
--cp-interact-selected: rgba(37,99,235,0.08)
--cp-interact-press:    rgba(0,0,0,0.08)

/* AI / INTELLIGENCE (Purple reserved) */
--cp-ai-primary:     #7C3AED
--cp-ai-secondary:   #0D9488

/* SPACING */
--cp-space-1: 4px   --cp-space-2: 8px   --cp-space-3: 12px
--cp-space-4: 16px  --cp-space-5: 20px  --cp-space-6: 24px

/* RADIUS */
--cp-radius-input:  4px
--cp-radius-button: 6px
--cp-radius-card:   6px
--cp-radius-modal:  8px

/* LAYOUT */
--cp-topnav-height:   48px
--cp-sidebar-width:   232px
```

### Table Density (Locked)

```
Row height:     36px (max-height: 36px — never inflate)
Cell padding:   8px × 12px
Header padding: 10px × 12px
Divider:        0.75px solid var(--cp-border-default)
Shadow:         NONE (border only, no table shadow)
```

### Typography (Locked)

```
Headings:      Sora           → --cp-font-heading → --ds-font-family-heading
Body/UI:       Inter          → --cp-font-body    → --ds-font-family-body
Data/Mono:     JetBrains Mono → --cp-font-mono    → --ds-font-family-monospaced
Body emphasis: font-weight 650 (NOT 700)
Display/Hero:  font-weight 700
Uppercase:     table headers + sidebar section labels ONLY

Token chain (F1):
  src/index.css :root  →  --cp-font-{body,heading,mono}  (SINGLE source of truth)
  catalyst-typography.css  →  --ds-font-family-{body,heading,monospaced}: var(--cp-font-*)
  tailwind.config.ts   →  fontFamily.{sans,body,heading,display,mono}: var(--ds-font-family-*)
  typography.ts        →  FONT_STACK / FONT_STACK_HEADING / FONT_STACK_MONO: var(--ds-font-family-*)
  tokens.ts            →  typography.fontFamily.* / fonts.*: var(--ds-font-family-*)

Font weight bridge tokens (index.css :root):
  --cp-font-weight-regular:  400
  --cp-font-weight-medium:   500
  --cp-font-weight-semibold: 650
  --cp-font-weight-bold:     700
```

---

## 5. STATUSLOZENGE — ABSOLUTE GUARDRAIL

**3 colours only. Zero exceptions. Zero overrides.**

```
GREY  → bg:#DFE1E6  text:#253858  → To Do / Backlog / On Hold
BLUE  → bg:#DEEBFF  text:#0747A6  → In Progress / In Review / Active
GREEN → bg:#E3FCEF  text:#006644  → Done / Approved / Completed

Height:  20px
Font:    11px / weight 700 / UPPERCASE / letter-spacing 0.03em
Radius:  3px
Format:  CAPS only, no dots, no custom colours
```

**If you see any other colour in a status badge — it is a bug. Fix it.**

---

## 6. HUB BADGE COLOURS (structural, not semantic)

```
Project:  BLUE        #2563EB
Product:  NEUTRAL     #3F3F46
Task:     LIGHT GREY  #D4D4D8
Incident: RED         #DC2626
```

These are NON-SEMANTIC structural identifiers. They must NEVER be confused with status colours.

---

## 7. PERMANENTLY BANNED — NEVER USE

```
❌ Golden Hour palette:  #C69C6D  #5C7C5C  #8B7355  #D4B896
❌ Yellow/Amber in hub badges
❌ Purple (#7C3AED) on non-AI elements
❌ HSL color values anywhere in code (use hex only)
❌ Native <select> elements (use shadcn/ui Select)
❌ Saturated status pills (only the 3-colour guardrail above)
❌ Literal font-family values outside @font-face — always use --cp-font-* tokens
❌ System fonts (Charlie Display/Text/Code via ADS CDN are the only valid fonts)
❌ Dark mode in light-mode demos/screenshots
❌ Zebra striping on tables
❌ Card wrappers around tables
❌ Black-bg filter chips
❌ max-width constraints on full-page layouts
❌ "Sprint" terminology anywhere (use "Release" only)
❌ HSL in style props or CSS — hex literals always
❌ Stacked !important blocks (consolidate to one per selector)
❌ Multiple duplicate .dark override blocks in index.css
❌ Direct font-family literals in tailwind.config.ts, typography.ts, or tokens.ts (use var(--ds-font-family-*) with fallback)
❌ Assigning a literal font name to --ds-font-family-* (always delegate via var(--cp-font-*))
❌ Changing --cp-font-* values outside the F2 task brief (L42)
❌ Selecting non-existent ph_issues columns (`comment_count`, `attachment_count`, `child_count`, `children_count`, `link_count`, `worklog_count`) — these trigger silent PostgREST 400s (L43 / §9 / FP-012). Always verify against `src/integrations/supabase/types.ts` before adding to a SELECT
```

---

## 8. COLOUR RESERVATIONS (strict)

```
#7C3AED (Purple)   → AI features ONLY
#2563EB (Blue)     → +Create CTA ONLY (primary button)
#0D9488 (Teal)     → AI elements only (KA bot shape)
Status colours     → StatusLozenge only, never hub badges
```

---

## 9. DATABASE SCHEMA GUARDS

**These are canonical table names — never use legacy/wrong names:**

```sql
-- TestHub
tm_test_cases      (NOT test_cases — legacy, BANNED)
tm_test_steps
-- Field: case_key (NOT id for display)

-- PlanHub / Planner
planner_tasks
planner_statuses
workstreams

-- RAG Pipeline
brd_documents.raw_text          (NOT "content")
brd_processing_queue.brd_id     (NOT "document_id")
pipeline_stage                  (Edge Function authority only — never client-set)
```

**RAG wiring rule:** Never propose new vector search tables or new LLM services. Always wire to existing `kb-query V2` endpoint.

---

### ph_issues — schema guard (Apr 28, 2026)

**Identity columns that DO exist on `ph_issues`:**
- `id` (UUID) — secondary identifier.
- `issue_key` (text, primary key) — the canonical join key for parent
  resolution and writeback. Use this for `.eq('issue_key', key)` queries.

**Columns that DO NOT exist (writing them in a SELECT = silent 400):**

```
❌ comment_count        ❌ attachment_count        ❌ child_count
❌ children_count       ❌ link_count              ❌ worklog_count
```

If a derived count is required, fetch it via a separate JOIN/aggregation
query (e.g., count rows in `ph_comments` grouped by `issue_key`) and
merge client-side. Never add a count column to the `ph_issues` SELECT
hoping the column exists.

**The canonical reference for every column on `ph_issues` is
`src/integrations/supabase/types.ts`** (auto-generated from the live
schema). Before adding a column to any SELECT against `ph_issues`,
search that file for the column name. If it's not in the `Row:` type
definition, it doesn't exist — and selecting it will trigger PostgREST
400 silently.

**The 2026-04-28 BAU "Parent picker shows no epics" bug:** `useEpicBacklog`
selected `comment_count`. PostgREST returned `42703 column does not
exist`. React Query treated `epics` as `[]`. The Parent picker on every
BAU row rendered "No parent" + "No matches" because `parentOptions =
epics.map(...)` was empty. The 400 was invisible in the UI and persisted
for hours.

**Diagnostic shortcut:** if a derived UI element (picker, filter, badge)
is unexpectedly empty, fire the underlying SQL DIRECTLY against the
Supabase REST endpoint and read the error body before assuming a render
bug. A bare `fetch()` with the apikey + bearer token is the fastest
ground truth.

---

## 10. CLAUDE CODE OPERATING RULES

### Surgical Scope (MANDATORY)

```
ONE component. ONE file. ONE fix.
Never touch files outside the explicitly scoped list.
Never rewrite working logic to fix a styling bug.
Never introduce new npm dependencies.
Never rename existing exports or interfaces.
Always check what exists before creating new.
```

### NEW-FILE GUARDRAIL (Apr 28, 2026 — L44)

**Never generate new files of ANY kind unless Vikram explicitly asks for one.**
This applies in BOTH directions:

- **No new source files (.ts / .tsx / .js / .css / .json):** when a fix is
  needed, patch the existing file in place. Do NOT spin up a new helper
  module, types file, hooks file, utility lib, or "canonical chokepoint"
  abstraction unsolicited — even when consolidating duplication. The
  refactor is invisible to Vikram and just adds files they have to
  maintain. If consolidation seems necessary, ASK first.
- **No new audit / doc / report files (.md / .json under `.catalyst/...`,
  `audits/...`, `reports/...`, `handoffs/...`, `patches/...`):** Vikram
  doesn't read them. Surface findings inline in the chat. If a skill
  (e.g. `jira-compare`) wants to write probe snapshots / audit reports,
  override that behaviour and report inline instead. Existing audit
  files in the repo are legacy; do not add to them.

**The only thing to write to disk is the fix itself, in the existing
file that needs the fix.** Everything else is conversation.

If Vikram asks "make this canonical" or "lock this as a lesson" — the
canonical part is updating CLAUDE.md (this file) and patching the bug
in place across affected sites. The lesson part is appending a §3
lesson entry like L43/L44 + a §13 FP entry. NOT spinning up a new
module to host shared constants. If the constants must live somewhere,
inline them at the top of an EXISTING file (e.g. the hook that already
uses them) and let consumers import from there.

**Symptom this lesson came from:** in the 2026-04-28 BAU parent-picker
session, Claude Code created a brand-new
`src/modules/project-work-hub/lib/phIssueQueries.ts` to host SELECT
constants AND wrote ~6 audit/probe/handoff/patch files under
`.catalyst/audits/jira-compare/2026-04-28-...` — none of which Vikram
asked for. Token waste + maintenance debt. The TS file was reverted
out of the import graph but left orphaned in the repo for Vikram to
delete; the audit files remain on disk for the same reason. Don't
repeat this pattern.

### Pre-Flight Checks (Run Before ANY Fix)

```bash
# Before touching index.css
grep -rn "!important" src/index.css
grep -rn ".dark .bg-white" src/

# Before touching a component
grep -rn "style={{" src/components/[HubName]/
grep -rn "background.*#" src/components/[HubName]/

# Before touching any CSS / style prop — font literal audit (P0 ban)
grep -rn "font-family.*'Inter'\|font-family.*'Sora'\|font-family.*'JetBrains" src/
# Any hit outside @font-face is a P0 bug — bridge to var(--cp-font-*)

# After a dark mode fix — verify NOCTURNE
# Expected: rgb(26, 23, 20) computed in browser DevTools
```

### CC Task Brief Format

When Claude Chat (Forge) hands off a task, it arrives in this format:

```
📋 CC TASK BRIEF — [Hub] [Fix Type]
════════════════════════════════════
CONTEXT: [what's broken and why]

TASK: [precise single-scope instruction]

FILES TO TOUCH:
  - src/components/[Hub]/[Component].tsx
  - src/index.css  (ECLIPSE section only, if required)

GUARDRAILS:
  - [relevant ECLIPSE lessons from Section 3]

ACCEPTANCE CRITERIA:
  - [ ] Computed bg: rgb(26, 23, 20) in DevTools
  - [ ] No regression on [sibling component]
  - [ ] Zero new !important blocks

DO NOT TOUCH:
  - [explicit out-of-scope file list]
```

Execute the brief exactly. Do not expand scope.

### Verification After Fix

After every fix, output a checklist:

```
✅ FIX VERIFICATION
━━━━━━━━━━━━━━━━━━━━━━
Component:    [name]
File:         [path]
Change type:  [style / logic / schema / wiring]

Changes made:
  - [bullet: what changed, why]

Checks:
  □ No new !important blocks introduced
  □ No duplicate .dark selectors added
  □ No HSL values in output
  □ No inline style={{ background }} props remaining
  □ Tailwind dark: classes used (not CSS vars)
  □ Files touched: [list only scoped files]
  □ Files NOT touched: [confirm out-of-scope untouched]

Send to Vikram for DevTools verification.
```

---

## 11. WORK ITEM ICONS — ABSOLUTE FREEZE

> ⛔ **IMMUTABLE GUARDRAIL — READ BEFORE TOUCHING ANY ICON.**
> These icons are the canonical Catalyst/Jira work-item type system approved by MoIM.
> **No AI, no Claude Code pass, no Lovable prompt may change the color, shape, or component
> of any icon listed below — even to "fix" it, "improve" it, or "align it to a design system".**
> If an icon looks wrong in a screenshot, check the mapping first before touching any file.
> The only person who may update this table is Vikram (owner). All other changes are P0 bugs.

### Canonical Icon Table (all 14 types — exact hex, exact shape)

| `iconType` key | Display Name | Bg Color | Shape | Notes |
|----------------|--------------|----------|-------|-------|
| `api_requirement` | API Requirement | `#06B6D4` cyan | Monitor screen + gear badge | Teal monitor outline, small gear bottom-right |
| `backend` | Backend | `#3B82F6` blue | Stacked server bars | 3 horizontal bars in a server/DB stack |
| `business_gap` | Business Gap | `#F97316` orange | Lightning bolt in outlined box | Orange border box, lightning fill |
| `change_request` | Change Request | `#2563EB` blue | Checkbox with check | Square border, diagonal tick |
| `epic` | Epic | `#8B5CF6` purple | Lightning bolt | Standalone bolt, no background square |
| `feature` | Feature | `#2563EB` blue | Checkbox with check | Same family as Task/Change Request |
| `figma` | Figma | `#374151` dark grey | Grid / window icon | Dark charcoal, 4-cell grid |
| `frontend` | Frontend | `#3B82F6` blue | Monitor / computer screen | Screen with stand |
| `integration` | Integration | `#2563EB` blue | Gear with spokes | Cog shape with 6–8 teeth |
| `production_incident` | Production Incident | `#F97316` orange | Circle with question mark | Outlined circle, `?` inside |
| `bug` | QA Bug | `#E5493A` red | Asterisk / snowflake | 6-arm star (horizontal + vertical + 2 diagonals) |
| `story` | Story | `#22C55E` green | Bookmark ribbon | Inverted-V bottom notch |
| `subtask` | Sub-task | `#2563EB` blue | Chain link / two squares | Two overlapping rounded squares |
| `task` | Task | `#2563EB` blue | Checkbox with check | Square border, thick diagonal tick |

### Mapping aliases (DB value → iconType key)

```
'assigned_work_item' | 'assigned_story' | 'tester_assigned' → 'task'
'new_feature'         → 'feature'
'improvement'         → 'task'
'question'            → 'production_incident'
'incident'            → 'production_incident'
```

### Implementation contract

```
Canonical component:  src/components/shared/WorkItemIcon.tsx
  props:  type: WorkItemIconType, size?: number (default 16)
  renders: inline SVG only — never <img>, never Lucide, never emoji

DirectWorkItemIcon.tsx (notifications):
  DELEGATES to <WorkItemIcon> — never duplicates SVG paths

All hubs (ProjectHub, TestHub, IncidentHub, etc.):
  Import WorkItemIcon from '@/components/shared/WorkItemIcon'

BANNED substitutions (zero tolerance):
  ❌ Lucide icons for work item types (Lucide = UI chrome only)
  ❌ Emoji as icon fallback
  ❌ Different hex values than the table above
  ❌ Any rounding, shadow, or border-radius change to the SVG
  ❌ Color variation for dark mode (icons are always on-color, no dark swap)
```

---

## 12. FORGE PIPELINE SYNC

### Pipeline State (Current)

```
Active pipeline:   ECLIPSE v2.0 — NOCTURNE Dark Mode (ongoing)
Completed:         Font Migration F2–F5 (Apr 2026) — Charlie ADS, all hubs bridged
Quality gate:      GOD-TIER ≥9.5/10

ECLIPSE NOCTURNE hub states:
  Hub 0 (Nav):         ✅ DONE
  Hub 1 (Strategy):    🟡 Regression pending
  Hub 2 (Product):     🟡 Fix unverified
  Hub 3 (Project):     🔴 Active fix — inline style violations
  Hub 4+ :             ✅ Light mode complete, dark mode TBD

Font pipeline hub states (F4 — ALL ✅ COMPLETE):
  release-hub.module.css      --rh-font-* → var(--cp-font-*)
  product-kanban.css          --pk-font-* → var(--cp-font-*)
  initiative-detail-panel.css --idp-font-* → var(--cp-font-*)
  task-detail-modal-enterprise.css --tm-font-* → var(--cp-font-*)
  budget-module.css           --budget-font-* → var(--cp-font-*)
  capacity-module.css         --ct-font-* → var(--cp-font-*)
  users-module.css            --usr-font-* → var(--cp-font-*)  [renamed from --ct-*]
  workhub-tokens.css          --wh-f* → var(--cp-font-*)
  caty.css                    --caty-font-family → var(--cp-font-body)
  mytasks.css                 --mytasks-id-font-family → var(--cp-font-mono)
  roadmap-ringfenced.css      already bridged (no change needed)
  planhub.css                 --ph-font → var(--cp-font-body)  [F5/G1 sign-off]
  planner-calendar.css        --pln-cal-font-family → var(--cp-font-body)  [F5/G1]
```

### Forge → Claude Code Handoff Protocol

1. **Claude Chat runs** G0–G6 (research, design, critique) as normal
2. **At G7**, instead of Lovable DYNAMITE prompt, Forge generates a **CC Task Brief** (Section 10)
3. **Claude Code receives** the brief + reads this CLAUDE.md = full context
4. **Claude Code executes** the surgical fix, outputs verification checklist
5. **Vikram takes screenshot / DevTools screenshot** → pastes back to Claude Chat
6. **Claude Chat runs** G9 QA scoring against the result

### SDLC Gate Reference

| Gate | Name | Owner |
|------|------|-------|
| G0 | Discovery | Forge (Claude Chat) |
| G1 | Research | Forge (Claude Chat) |
| G2 | Benchmark | Forge (Claude Chat) |
| G3 | Schema | Forge (Claude Chat) |
| G4 | HTML Demo | Forge (Claude Chat) |
| G5 | Compare | Forge (Claude Chat) |
| G6 | Critique | Forge (Claude Chat) |
| G7 | Task Brief | Forge → **Claude Code** |
| G8 | Build | **Claude Code** |
| G9 | QA Score | Forge (Claude Chat) |
| G10 | Wiring Audit | Forge + **Claude Code** |
| G11 | Polish | **Claude Code** |
| G12 | Ship Decision | Forge (Claude Chat) |

---

## 13. LOVABLE FAILURE PREVENTION (LFL)

These failures occur in Lovable builds. Claude Code must verify these are NOT present in any file it touches:

```
FP-001: perPage default missing → must be useState(12)
FP-002: Row height inflation → height: 36px max-height: 36px enforced
FP-003: Pagination controls appearing without request → remove
FP-004: Title Case in table headers → uppercase only (text-transform: uppercase)
FP-005: Always-visible action buttons → opacity:0 + hover reveal
FP-006: Golden Hour color drift → banned list, exact hex
FP-007: Status-coloured version badges → neutral gray only
FP-008: Lucide icons for work item types → use canonical SVGs
FP-009: HSL values in style props → hex only
FP-010: Duplicate .dark blocks → consolidate
FP-011: Literal font-family values outside @font-face → P0 bug; bridge to var(--cp-font-*)
         Banned literals: 'Inter', 'Sora', 'JetBrains Mono', 'Atlassian Sans',
         'Playfair Display', 'Plus Jakarta Sans', system font stacks in component CSS
FP-012: SELECT against ph_issues with a non-existent column → silent
         PostgREST 400 (PG 42703). React Query swallows the error and
         the UI renders empty. Symptom: parent pickers show "No parent /
         No matches" even when the project has epics. Fix: verify every
         column in the SELECT exists in `src/integrations/supabase/types.ts`
         before submitting. Banned columns: comment_count,
         attachment_count, child_count, children_count, link_count,
         worklog_count. See §9 + L43.
```

---

## 14. QUALITY GOALS (CATALYST GOALS — ENFORCED)

```
CG-01: UI/UX           ≥9.8
CG-02: Colour          =10.0
CG-03: Font            ≥9.8
CG-04: Design System   =10.0
CG-05: Mental Model    ≥9.5
CG-06: AI              ≥9.5 (where applicable)
CG-07: Empty States    =10.0
CG-08: Integration     =100%
CG-09: Dead CTAs       =0
CG-10: Dead Wiring     =0
CG-11: Token-Only CSS  =100%
CG-12: WCAG AA         =100%
CG-13: Responsive      ≥9.5
```

---

## 15. INTERACTION PATTERNS (4-STATE MODEL)

Every interactive element must implement all 4 states:

```
Rest     → Default appearance
Hover    → rgba(0,0,0,0.04) overlay (NEVER background swap)
Selected → rgba(37,99,235,0.08) overlay
Press    → rgba(0,0,0,0.08) overlay

Focus ring: 2px solid #2563EB, 2px offset
Transition: 150ms ease for all interactive states
```

---

## 16. RAG PIPELINE (DO NOT REBUILD)

The RAG pipeline is LIVE and DEPLOYED. Never create new tables or services for AI features.

```
Existing service: kb-query V2 (Edge Function)
Always wire to:   queryKB() with appropriate filter_source
Column guards:
  brd_documents.raw_text          (NEVER .content)
  brd_processing_queue.brd_id     (NEVER .document_id)
  pipeline_stage                  (Edge Function sets this — client NEVER writes it)
```

---

## 17. FILE STRUCTURE CONVENTIONS

```
src/
  components/
    [HubName]/          ← hub-scoped components
    shared/             ← cross-hub reusable (WorkItemIcon, StatusLozenge, etc.)
    ui/                 ← shadcn primitives (NEVER modify)
  hooks/
    use[Feature].ts     ← TanStack Query hooks
  lib/
    supabase.ts         ← single supabase client
    [hub]-service.ts    ← data layer per hub
    avatars.ts          ← SOLE avatar resolver (§19 chokepoint)
  modules/
    [hub-name]/         ← self-contained hub modules (planner, workhub, product-roadmap…)
      components/       ← module-local components
      styles/           ← module-local CSS (ring-fenced token namespaces)
      pages/            ← module route entries
  pages/
    [HubName].tsx       ← top-level route entry point
  styles/               ← hub-scoped CSS files (ring-fenced --xx-* tokens; see §20)
    [hub].css           ← one file per hub surface
  theme/
    ads/
      AdsThemeProvider.tsx  ← setGlobalTheme({ colorMode, typography: 'typography' })
  index.css             ← global --cp-* tokens + ONE .dark ECLIPSE block
```

**ECLIPSE section in index.css** — all NOCTURNE overrides live in a clearly marked block:
```css
/* ═══════════════════════════════════════
   ECLIPSE — NOCTURNE DARK MODE OVERRIDES
   Last consolidated: [date]
   ═══════════════════════════════════════ */
.dark { ... }
```

There is **ONE** `.dark` block. Never add a second. Always consolidate.

---

## 18. QUICK REFERENCE — NOCTURNE GEIST HEX PALETTE

```
#0A0A0A  page background
#1A1A1A  card / surface
#1F1F1F  hover surface
#292929  active / pressed / border subtle
#111111  sidebar bg / table header bg
#2E2E2E  border default
#454545  border medium
#EDEDED  text primary (dark)
#A1A1A1  text secondary (dark)
#878787  text muted (dark)
#7D7D7D  text tertiary (dark)
```

---

## 19. AVATAR IMAGE MIGRATION (CHOKEPOINT)

User avatar photos resolve **exclusively** through `src/lib/avatars.ts`.
Images are local assets in `src/assets/avatars/<slug>.png` (slug = `slugifyName(name)`).
Auto-discovered at build time via `import.meta.glob` — no manifest edits needed.

**Rules:**
- ❌ Never hard-code an external URL (`https://…`, `gravatar`, `cdn.*`) into `<img src>` for a user avatar
- ❌ Never add a second avatar resolver, manifest, or lookup map — one chokepoint only
- ✅ New surfaces requiring a user photo import `resolveAvatarUrl` from `@/lib/avatars`
- ✅ When `resolveAvatarUrl(name)` returns `null`, fall back to existing `CircleUser` + hash color

**Canonical UserAvatar components (already wired):**
- `src/components/admin/users/UserAvatar.tsx` — supports `avatarUrl` override + resolver fallback
- `src/components/users/UserAvatar.tsx` — resolver-only

**Migration backlog (existing `<img>` sites):** migrate opportunistically when touched for other work.
Do NOT force-migrate all sites in a single pass — blast radius outweighs benefit.

**Populating avatars:** `node scripts/download-avatars.mjs` (argv, stdin `-`, or `scripts/avatar-names.txt`).

---

## 20. FONT ARCHITECTURE (F2–F5 LOCKED — Apr 2026)

### Cascade chain

```
index.html @font-face
  └─ Charlie Display / Charlie Text / Charlie Code  (Atlassian DS CDN)
       └─ src/index.css :root
            --cp-font-heading: 'Charlie Display', system-ui, -apple-system, sans-serif
            --cp-font-body:    'Charlie Text',    system-ui, -apple-system, sans-serif
            --cp-font-mono:    'Charlie Code',    ui-monospace, monospace
              └─ hub namespace tokens (all bridge to --cp-font-*)
                   └─ component CSS / inline styles (token only — never literal)
```

### Hub namespace → --cp-font-* bridge map

| File | Token(s) | Bridges to |
|------|----------|------------|
| `src/styles/release-hub.module.css` | `--rh-font-heading/body/mono` | `--cp-font-*` |
| `src/styles/product-kanban.css` | `--pk-font-heading/body/mono` | `--cp-font-*` |
| `src/styles/initiative-detail-panel.css` | `--idp-font-heading/body/mono` | `--cp-font-*` |
| `src/styles/task-detail-modal-enterprise.css` | `--tm-font-sans/heading/mono` | `--cp-font-*` |
| `src/styles/budget-module.css` | `--budget-font-ui/mono` | `--cp-font-*` |
| `src/styles/capacity-module.css` | `--ct-font-ui/mono` | `--cp-font-*` |
| `src/styles/users-module.css` | `--usr-font-sans/mono` | `--cp-font-*` |
| `src/modules/workhub/shared/tokens/workhub-tokens.css` | `--wh-fh/fn/mo` | `--cp-font-*` |
| `src/styles/caty.css` | `--caty-font-family` | `--cp-font-body` |
| `src/styles/mytasks.css` | `--mytasks-id-font-family` | `--cp-font-mono` |
| `src/styles/roadmap-ringfenced.css` | `--roadmap-key-font/kpi-value-font` | `--cp-font-*` |
| `src/styles/planhub.css` | `--ph-font` | `--cp-font-body` |
| `src/modules/planner/styles/planner-calendar.css` | `--pln-cal-font-family` | `--cp-font-body` |

### Rules

```
✅ Always use a hub namespace token or --cp-font-* directly
✅ New hub CSS files must declare --[prefix]-font-* and bridge immediately
❌ No literal font-family in any CSS rule or JSX style prop (outside @font-face)
❌ No Google Fonts loads for latin scripts — only Arabic i18n exempted
❌ No fallback chains to Inter/Sora/JetBrains Mono — they are retired
```

### Known P0 backlog

✅ **CLEARED Apr 2026** — full codebase sweep completed. Zero literal violations remain.

Only intentional exclusions:
- `src/styles/catalyst-typography.css` — deliberate `--ds-font-*` ADS token override (Inter fallback for ADS surfaces that haven't migrated to Charlie). Do not touch.
- `src/modules/project-work-hub/components/dialogs/StoryDetailModal.tsx` — `"Atlassian Sans"` in ADF renderer inline styles: intentional Jira parity, documented in code comments.

---

> **THE PIPELINE IS THE PRODUCT.**  
> **DIFFERENT > REPEAT — on failure, try a new approach.**  
> **VERIFY > ASSUME — grep before writing.**  
> **HEX ONLY — never HSL.**  
> **ONE BLOCK — never stack .dark overrides.**
