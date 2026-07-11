# Preflight v3 — Jira Architect Pattern Checklist

> **Read in Phase 0.5 of `/preflight` on every Standard and High-stake task.**
> Run ALL 28 patterns against the task description and any code touched.
> Even if the task is a CSS fix, a routing change, or a label tweak — every pattern fires.
> Output: Issue Register JSON. Any HALT pattern stops Phase 0.5 immediately.

Author: Preflight v3 × Vikram × Claude  
Updated: 2026-05-10  
Patterns: 28 (Schema ×5, Workflow ×5, Data Model ×5, ADS/Component ×7, Banned ×8, Navigation ×3, Port Safety ×2)  
Rule: **HALT = stop planning, surface violation to Vikram before any code.**

---

## S — Schema Integrity

### S1 · Field Not in Screen Scheme
**Detection:** Task adds or modifies a field in any Catalyst detail view, sidebar, or rail.  
**Check:** Does the task reference a Jira field (Assignee, Severity, Due Date, Time Tracking, Components, Labels, Fix Versions, etc.)?  
**Gate:** Before adding: call `getJiraIssueTypeMetaWithFields(project, issueType)` and confirm the field appears in `fields[].key`. If absent → **HALT**.  
**CLAUDE.md anchor:** 2026-05-05 — Anti-pattern #18. Schema-probe before field add, always.  
**Severity:** P0  
**Known examples:** Time Tracking + Components absent from ALL BAU types. Due Date only on Backend, Production Incident, Change Request, Epic.

---

### S2 · Custom Field Type Mismatch
**Detection:** Task renders a custom field (customfield_XXXXX) in any Catalyst surface.  
**Check:** Is the field type (text, select, multi-select, user picker, date, number) matched by the Catalyst component?  
**Gate:** If the component renders a text input but the Jira field is a multi-select picker → **HALT**.  
**CLAUDE.md anchor:** 2026-05-05 — Anti-pattern #18 generalised.  
**Severity:** P1  

---

### S3 · Field Generalised Across Issue Types Without Probe
**Detection:** Task applies a field change to more than one issue type.  
**Check:** Was the field probed on EACH target issue type? A field in Story's screen scheme may not appear in QA Bug, Production Incident, or Change Request.  
**Gate:** If only one type was probed but multiple types are in scope → **HALT**. Re-probe each.  
**CLAUDE.md anchor:** 2026-05-05 — "Labels removed globally — add back per type only after Jira screen scheme validation."  
**Severity:** P0  

---

### S4 · Epic Link vs Parent Field Confusion
**Detection:** Task adds or modifies parent linking for any issue type.  
**Check:** Company-managed projects use `customfield_10014` (Epic Link, deprecated in newer Jira) OR the `parent` field (Next-gen). BAU is company-managed. CatalystParentLinker must route correctly via `parent-rules.ts`.  
**Gate:** If the task uses `epicLink` and the project is company-managed with next-gen parent model active → **HALT**.  
**CLAUDE.md anchor:** 2026-05-05 — CatalystParentLinker + parentSource resolution.  
**Severity:** P1  

---

### S5 · Story Points Field — Platform-Wide Ban
**Detection:** Any mention of "story points", "sp", "storyPoints", or `customfield_10016` anywhere in the task or code.  
**Check:** Is the task adding, restoring, or referencing Story Points in any Catalyst view?  
**Gate:** If yes → **HALT**. This field is BANNED platform-wide. In-code directive: `CatalystSidebarDetails.tsx:422` — "Story Points: BANNED platform-wide. Do NOT re-add."  
**CLAUDE.md anchor:** 2026-04-28 — In-code directives win over handovers.  
**Severity:** P0 — HALT immediately.  

---

## W — Workflow & Permission

### W1 · Status Transition Not Valid in Workflow
**Detection:** Task adds or changes a status value, status pill, or status transition.  
**Check:** Is the proposed status reachable from the current status in the BAU workflow state machine? Not all statuses are reachable from all states in all issue type workflows.  
**Gate:** If the status transition is not in the workflow → **HALT**. Probe via `getTransitionsForJiraIssue`.  
**CLAUDE.md anchor:** 2026-05-08 — "Status color mapping: use DOM probe, not category assumptions."  
**Severity:** P1  

---

### W2 · Permission Scheme Mismatch
**Detection:** Task adds a CRUD action (create, update, delete) on any Supabase table or Jira API call.  
**Check:** Does the current user's Catalyst role have the Jira project permission for this action? (Browse, Edit Issues, Delete Issues, Manage Watchers, etc.)  
**Gate:** If the action requires a permission not held by all intended user roles → flag as P1 design concern.  
**CLAUDE.md anchor:** 2026-04-28 — CRUD gate is about data flow on each side.  
**Severity:** P1  

---

### W3 · RLS Policy Missing on Cascade Child Tables
**Detection:** Task adds a DELETE or INSERT/UPDATE to a Supabase table that has cascading children.  
**Check:** Tables known to cascade from `projects`: `hi_statuses`, `hi_project_sequences`, `project_members`. Each child needs its own RLS DELETE policy.  
**Gate:** If a DELETE policy exists on the parent but not each child → **HALT**. Add child policies first.  
**CLAUDE.md anchor:** 2026-05-09 — "When adding a Supabase RLS DELETE policy on a table that has cascading children, add a DELETE policy on EACH child table too."  
**Self-join guard:** `USING` clause must reference `projects.id` not `project_members.id` on both sides.  
**Severity:** P0 — HALT.  

---

### W4 · Comment Visibility / Security Levels Not Respected
**Detection:** Task renders, creates, or lists Jira comments in any Catalyst view.  
**Check:** Jira comments support role-level security (e.g., "Developers only", "Service Desk Team"). Catalyst must not expose restricted comments to unauthorised roles.  
**Gate:** If comment rendering doesn't filter by `visibility.type` and `visibility.value` from Jira API → flag as P1.  
**Severity:** P1  

---

### W5 · Watcher Notification Model
**Detection:** Task touches `WatchersChip`, `useCatalystWatchers`, or any watcher add/remove action.  
**Check:** Watcher mutations must use `ph_issue_watchers` table cast correctly. Table is not in generated types → `(supabase as any)` cast silently returns empty. Must use explicit table name.  
**Gate:** If watcher query/mutation returns empty and no error is shown → **HALT**. Root cause: missing generated types.  
**CLAUDE.md anchor:** 2026-05-08 — Kanban modal code path note: "`ph_issue_watchers` table uses `(supabase as any)` cast — table not in generated types, silently returns empty."  
**Severity:** P1  

---

## D — Data Model

### D1 · Issue Hierarchy Violated
**Detection:** Task creates or displays sub-issues, parent links, or child issue lists.  
**Check:** BAU hierarchy: Business Request → Epic → Story/Task/Bug/QA Bug → Subtask. No Story can be a parent of an Epic. No Subtask can be a parent of anything.  
**Gate:** If a component allows linking an issue as parent/child that violates BAU hierarchy → **HALT**.  
**Severity:** P1  

---

### D2 · Sprint Field Surface Mismatch
**Detection:** Task mentions "sprint", "active sprint", or sprint assignment UI.  
**Check:** Sprint field is a board-level concept. It does not appear in all BAU issue types. Showing the Sprint field on issue types that don't support sprints (e.g., Epics in some configurations) is incorrect.  
**Gate:** Probe `getJiraIssueTypeMetaWithFields` for `sprint` field before rendering. If absent → do not render.  
**Severity:** P1  

---

### D3 · Resolution Field Semantics
**Detection:** Task renders or mutates a "resolution" field, or marks an issue as "Done".  
**Check:** In Jira, setting status to "Done" does not automatically set the Resolution field. Resolution is a separate field. "Done" ≠ "Resolved" in all project configurations.  
**Gate:** If Catalyst treats Done status as equivalent to Resolution field being set → flag as P2 design gap.  
**Severity:** P2  

---

### D4 · Priority Scheme — Assumption Not Probe
**Detection:** Task renders priority icons, priority pills, or priority selectors.  
**Check:** Priority ordering and colors are project-specific. The standard Jira priority order (Highest→High→Medium→Low→Lowest) applies to most projects, but BAU may have custom priorities. Always DOM-probe the priority display from Jira before applying colors or ordering.  
**Gate:** If priority colors are hardcoded without a DOM probe → **HALT** and re-probe.  
**CLAUDE.md anchor:** 2026-05-08 — "Always DOM-probe Jira's `getComputedStyle` for ALL status values before assigning appearance."  
**Severity:** P1  

---

### D5 · Attachment Size Limits & Streaming
**Detection:** Task touches file upload, file display, or the `jira-attachment-proxy` edge function.  
**Check:** The proxy must use streaming pass-through (`new Response(jiraRes.body)`), not `arrayBuffer()` (OOM risk). Connection must be cached per cold-start worker. ETag/If-None-Match must be passed through for 304 short-circuit.  
**Gate:** If attachment proxy buffers the full response → **HALT**. Streaming is mandatory.  
**CLAUDE.md anchor:** 2026-05-05 — jira-attachment-proxy hardened for performance.  
**Severity:** P1  

---

## A — ADS / AtlasKit Component

### A1 · Raw Hex in ADS Context
**Detection:** Any task touching CSS, inline styles, or token() calls.  
**Check:** Scan for hardcoded hex values (#RRGGBB), rgb(), rgba() in the changed files.  
**Gate:** If raw hex found AND a DOM probe of live Jira does NOT prove this exact hex is what Jira renders → **HALT**. Use ADS token instead.  
**Exception:** If DOM probe confirms Jira renders that exact hex and no ADS token resolves to it, raw hex is allowed with a `// jira-compare bypass: token resolves to X, Jira uses Y` comment.  
**CLAUDE.md anchor:** 2026-04-28 — "ADS token drift: raw hex scan, banned-value scan."  
**Severity:** P0  

---

### A2 · `@atlaskit/popup` Empty-Portal Bug in overflow:hidden Parent
**Detection:** Task adds a popup, dropdown, or tooltip inside a component that has `overflow: hidden`.  
**Check:** `@atlaskit/popup` v4.16 has a known empty-portal bug on surfaces with `overflow: hidden`. The popup never renders.  
**Gate:** If the parent chain has `overflow: hidden` and the task uses `@atlaskit/popup` → **HALT**. Use `createPortal` to `document.body` with `position: fixed` + `getBoundingClientRect()` for placement. Add `data-filter-portal="true"` to the portal div and guard click-outside handlers.  
**CLAUDE.md anchor:** 2026-05-08 — GlobalSearchPanel filter chips bug.  
**Severity:** P0 — HALT.  

---

### A3 · Colored Dots for Work Item Type (JiraIssueTypeIcon Rule)
**Detection:** Task renders work item type indicators in any rail, sidebar, Recent list, card, or row.  
**Check:** Does the implementation use colored squares, colored dots, or a `issueTypeColor()` / `ITEM_TYPE_COLORS` map?  
**Gate:** If yes → **HALT**. Replace with `JiraIssueTypeIcon` from `@/lib/jira-issue-type-icons`. Size: 14px compact rails, 16px rows. Two-line layout: summary line 1 (12px/400/primary), KEY line 2 (11px/500/mono/secondary).  
**CLAUDE.md anchor:** 2026-05-09 — "Never use coloured dots, squares, or colour-recall maps for work item type display."  
**Severity:** P0 — HALT.  

---

### A4 · Lozenge / Status Pill Appearance Assigned by Assumption
**Detection:** Task sets `appearance` on `@atlaskit/Lozenge` or background on `StatusPill`.  
**Check:** Is the appearance value assigned by inference ("Blocked = red", "In Design = blue") without a live DOM probe?  
**Gate:** If yes → **HALT**. DOM-probe Jira's `getComputedStyle` for the exact status value. StatusPill must use measured hex, NOT Lozenge tokens (token resolution diverges from Jira).  
**CLAUDE.md anchor:** 2026-05-08 — "Status color mapping: use DOM probe, not category assumptions." + 2026-05-07 — "ADS bold tokens ≠ Jira actual colors."  
**Severity:** P0  

---

### A5 · Section Header Using `@atlaskit/heading size="small"`
**Detection:** Task adds a section header (Key details, Details, Activity, Description, etc.) in any detail view or sidebar.  
**Check:** Does the header use `<Heading size="small">` from `@atlaskit/heading`? That renders at 16px/653 — wrong.  
**Gate:** If yes → replace with inline `<h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, lineHeight: '20px', color: 'var(--ds-text, #172B4D)' }}>`.  
**CLAUDE.md anchor:** 2026-05-08 — "Section headers must never use @atlaskit/heading size='small' (16px/653)."  
**Severity:** P1  

---

### A6 · `react-select` Imported Directly (Not via `@atlaskit/select`)
**Detection:** Task adds or modifies a select/dropdown component.  
**Check:** Does the component import from `react-select` directly?  
**Gate:** If yes → **HALT**. Must import from `@atlaskit/select`. Note: `classNamePrefix` on `@atlaskit/select` produces custom DOM classes — this is fine. Only flag when the import is `react-select`, not Atlaskit.  
**CLAUDE.md anchor:** 2026-04-28 — "`cv-*-select__*` DOM classes don't mean non-Atlaskit."  
**Severity:** P1  

---

### A7 · Right Rail Select Field Has Visible Border in Idle State
**Detection:** Task renders a select field in the right rail / CatalystSidebarDetails.  
**Check:** Does the field show a visible border or dropdown indicator (▾) when idle?  
**Gate:** If yes → scope CSS to `.cv-drawer-sidebar [class*="-select__control"]` with `border-color: transparent; background: transparent; box-shadow: none` idle, bg-hovered on hover, hide `__dropdown-indicator` idle.  
**CLAUDE.md anchor:** 2026-05-05 — "Right rail select fields need transparent/borderless idle state."  
**Severity:** P2  

---

## B — Permanently Banned Items

> These patterns are PERMANENT BANS. No new task, handover, or Jira probe overrides them. Halt immediately if any are detected.

### B1 · MDT Ref Field
**Detection:** Any reference to "MDT Ref", `CatalystMdtRefDisplay`, or `customfield_XXXXX` identified as MDT Ref.  
**Gate:** **HALT immediately.** MDT Ref is permanently banned from ALL Catalyst views and sidebars, every issue type, forever.  
**CLAUDE.md anchor:** 2026-05-05 — "MDT Ref is permanently banned."  

### B2 · Service Now# Field
**Detection:** Any reference to "Service Now", `CatalystServiceNowDisplay`, or `customfield_10130`.  
**Gate:** **HALT immediately.** Permanently banned. No exceptions.  
**CLAUDE.md anchor:** 2026-05-07 — Service Now# + Assessment Feature permanently banned.  

### B3 · Assessment Feature Field
**Detection:** Any reference to "Assessment Feature", `CatalystAssessmentFeatureField`, or `customfield_10126`.  
**Gate:** **HALT immediately.** Permanently banned. No exceptions.  
**CLAUDE.md anchor:** 2026-05-07.  

### B4 · Development Section
**Detection:** Any reference to "Development" collapsible section, branches, PRs, commits display in detail views.  
**Gate:** **HALT immediately.** NEVER implement. Permanently out of scope.  
**CLAUDE.md anchor:** 2026-05-06.  

### B5 · Automation Section / Automate Button
**Detection:** Any reference to "Automation" section, rule executions, or ⚡ Automate button.  
**Gate:** **HALT immediately.** NEVER implement. Permanently out of scope.  
**CLAUDE.md anchor:** 2026-05-06.  

### B6 · AI Sparkles / Catalyst Intelligence Inline Button
**Detection:** Any reference to AI Sparkles (✨), `showAiMenu`, `onAiImprove`, `SparklesIcon` in CatalystQuickActions or any detail view surface.  
**Gate:** **HALT immediately.** The ONLY AI improve entry point is `ImproveIssueDropdown` in the right rail.  
**CLAUDE.md anchor:** 2026-05-07 — "Catalyst Intelligence / AI Sparkles inline button permanently banned."  

### B7 · Story Points (also S5)
**Detection:** "story points", "storyPoints", `customfield_10016`, or the SP field in any Catalyst view.  
**Gate:** **HALT immediately.** BANNED platform-wide since 2026-04-16.  
**CLAUDE.md anchor:** CatalystSidebarDetails.tsx:422 + 2026-04-28 CLAUDE.md.  

### B8 · Notion in Projects Module
**Detection:** Any Notion column, Notion sync stats, or Notion data in AllProjectsTable, AllProjectsPage, or any Projects-related component.  
**Gate:** **HALT immediately.** Permanently out of scope. Removed 2026-05-09 by Vikram directive.  
**CLAUDE.md anchor:** 2026-05-09 — "Notion is permanently out of scope for the Projects module."  

---

## N — Navigation Anti-Patterns

### N1 · Dead Issue Route (`/issues/:key`)
**Detection:** Any `navigate('/issues/${...}')` or `navigate(\`/issues/\${key}\`)` pattern.  
**Check:** The route `/issues/:key` does NOT exist in `FullAppRoutes.tsx`. Every use is a silent 404.  
**Gate:** **HALT.** Replace with `useGlobalSearchStore.getState().openDetail({ id: item.phIssueId ?? item.id, itemType, projectKey })`.  
**CLAUDE.md anchor:** 2026-05-10 — "AgeingPanel: navigate('/issues/:key') is a dead route."  
**Severity:** P0  

---

### N2 · Legacy Projects Route (`/projects`)
**Detection:** Any `navigate('/projects')` or link to `/projects` in home-surface or project-surface components.  
**Check:** `/projects` resolves to `ProjectDirectory` (legacy catch-all). The canonical all-projects surface is `/project-hub/projects` (`AllProjectsPage`).  
**Gate:** **HALT.** Replace with `navigate('/project-hub/projects')`.  
**CLAUDE.md anchor:** 2026-05-10 — "View all projects must navigate to /project-hub/projects not /projects."  
**Severity:** P0  

---

### N3 · Portal Missing Inside `overflow:hidden` (Navigation/Popup)
**Detection:** Any popup, tooltip, or dropdown positioned absolutely inside a component with `overflow: hidden`.  
**Check:** `position: absolute` children are clipped by `overflow: hidden` parents. Popups must use `createPortal` to `document.body` with `position: fixed`.  
**Gate:** If `overflow: hidden` detected in the parent chain of any absolute-positioned overlay → **HALT**. Add `createPortal`. Add `data-*-portal` attribute. Guard click-outside handlers against portal clicks.  
**CLAUDE.md anchor:** 2026-05-08 — GlobalSearchPanel portal pattern.  
**Severity:** P0  

---

## P — Port & Tool Safety

### P1 · Dev Server Port Not 8080
**Detection:** Any URL, fetch, or navigation using `localhost:8081`, `localhost:3000`, `localhost:5173`, or any port other than `8080`.  
**Check:** Catalyst local dev server is bound exclusively to `localhost:8080`.  
**Gate:** **HALT immediately.** Flag: `"Port conflict — dev server is localhost:8080 only. Port [X] is not permitted in any plan row."` Update vite.config.ts if the port was changed.  
**CLAUDE.md anchor:** CLAUDE.md top: "The Catalyst local dev server always runs on http://localhost:8080."  
**Severity:** P0 — HALT.  

---

### P2 · Claude Preview Tool Used for Dev Server or SQL
**Detection:** Any plan row that uses `preview_*` tools from the Claude Preview MCP, OR any SQL execution through Claude's own tools.  
**Check:** Two prohibited patterns:
  1. Using `preview_start`, `preview_screenshot`, `preview_eval` etc. for Catalyst — Vikram's directive: never use Claude's dev server preview.
  2. Executing Supabase SQL directly — all SQL must go through Lovable SQL editor with manual Vikram approval.  
**Gate:** **HALT.** For SQL rows: `tool: lovable-sql`, `manual-required: true`. For visual verification: use Chrome MCP only.  
**CLAUDE.md anchor:** CLAUDE.md 2026-05-09 — "wherever sqls come in use me for lovable sql editing and never use claudes preview of dev server."  
**Severity:** P0 — HALT.  

---

## Issue Register Output Format

Phase 0.5 produces this JSON after running all 28 patterns:

```json
{
  "phase": "0.5",
  "task": "<task description>",
  "scanned_at": "<ISO timestamp>",
  "patterns_run": 28,
  "violations": [
    {
      "pattern_id": "S1",
      "name": "Field Not in Screen Scheme",
      "severity": "P0",
      "halt": true,
      "evidence": "<what in the task triggered this>",
      "action": "<what must happen before plan continues>"
    }
  ],
  "halt_required": true,
  "halt_patterns": ["S1", "B2"],
  "safe_to_proceed": false,
  "open_questions": ["<pattern that needs live probe to resolve>"]
}
```

**If `halt_required: true`** → surface all halt violations to Vikram. Do NOT proceed to Phase 1 (evidence acquisition) or Phase 2 (council). Fix the halts first, re-scan, then proceed.

**If `safe_to_proceed: true`** → append this register to the Phase 2 council prompt. Every advisor receives it. Chairman must reference at least one pattern-check result in the verdict.
