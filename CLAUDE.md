# CLAUDE.md — Catalyst Platform Context
## Claude Code Persistent Context File
## Last Updated: April 2026 | Owner: Vikram (Delivery Manager)

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
| Hub 8 — PlanHub | ✅ SHIPPED | Planner V9, ringfenced `--planner-*` tokens |
| Hub 9 — WikiHub | ✅ SHIPPED | RAG-powered, 9 domains |

**Active Pipeline:** ECLIPSE v2.0 — NOCTURNE Dark Mode conversion

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
Headings:      Sora
Body/UI:       Inter
Data/Mono:     JetBrains Mono
Body emphasis: font-weight 650 (NOT 700)
Display/Hero:  font-weight 700
Uppercase:     table headers + sidebar section labels ONLY
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
❌ System fonts (always Sora/Inter/JetBrains Mono)
❌ Dark mode in light-mode demos/screenshots
❌ Zebra striping on tables
❌ Card wrappers around tables
❌ Black-bg filter chips
❌ max-width constraints on full-page layouts
❌ "Sprint" terminology anywhere (use "Release" only)
❌ HSL in style props or CSS — hex literals always
❌ Stacked !important blocks (consolidate to one per selector)
❌ Multiple duplicate .dark override blocks in index.css
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

### Pre-Flight Checks (Run Before ANY Fix)

```bash
# Before touching index.css
grep -rn "!important" src/index.css
grep -rn ".dark .bg-white" src/

# Before touching a component
grep -rn "style={{" src/components/[HubName]/
grep -rn "background.*#" src/components/[HubName]/

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

## 11. WORK ITEM ICONS (NON-NEGOTIABLE)

Work item type icons are **canonical SVGs** — never Lucide icons.

| Type | Color | Notes |
|------|-------|-------|
| Bug | #E5493A (red) | Spider/bug SVG |
| Story | #63BA3C (green) | Bookmark SVG |
| Task | #4BADE8 (blue) | Checkmark SVG |
| Epic | #904EE2 (purple) | Lightning bolt SVG |
| Subtask | #4BADE8 (blue) | Small checkmark SVG |
| New Feature | #63BA3C (green) | Star SVG |
| Improvement | #4BADE8 (blue) | Up arrow SVG |
| Incident | #E5493A (red) | Warning SVG |

**Lucide icons = UI chrome only** (nav, actions, views, form fields, buttons)

---

## 12. FORGE PIPELINE SYNC

### Pipeline State (Current)

```
Active pipeline:   ECLIPSE v2.0 — NOCTURNE Dark Mode
Quality gate:      GOD-TIER ≥9.5/10

Hub states:
  Hub 0 (Nav):         ✅ DONE
  Hub 1 (Strategy):    🟡 Regression pending
  Hub 2 (Product):     🟡 Fix unverified
  Hub 3 (Project):     🔴 Active fix — inline style violations
  Hub 4+ :             ✅ Light mode complete, dark mode TBD
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
    shared/             ← cross-hub reusable
    ui/                 ← shadcn primitives (never modify)
  hooks/
    use[Feature].ts     ← TanStack Query hooks
  lib/
    supabase.ts         ← single supabase client
    [hub]-service.ts    ← data layer per hub
  pages/
    [HubName].tsx       ← route entry point
  index.css             ← global tokens + ECLIPSE dark mode overrides
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

> **THE PIPELINE IS THE PRODUCT.**  
> **DIFFERENT > REPEAT — on failure, try a new approach.**  
> **VERIFY > ASSUME — grep before writing.**  
> **HEX ONLY — never HSL.**  
> **ONE BLOCK — never stack .dark overrides.**
