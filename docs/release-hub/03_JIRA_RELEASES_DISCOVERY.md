# 03 — Jira Releases Discovery

**Date:** 2026-06-23
**Status:** Synthesized from the repo specs (which are themselves a dated Jira Releases probe, 2026-06-23). **A fresh live Chrome MCP re-probe of the BAU Releases page was NOT performed this run** — no real http:// Jira tab was confirmed open, and CLAUDE.md forbids starting a Chrome MCP probe from `chrome://newtab`. Live screenshots are requested from the human (see `## Screenshots still needed`). No Jira data was created, edited, released, archived, deleted, or merged.

**Target surface:** `https://digital-transformation.atlassian.net/projects/BAU?selectedItem=com.atlassian.jira.jira-projects-plugin%3Arelease-page`

## Releases landing layout (from spec)

- Page title "Releases", breadcrumb `{Project} / Releases`.
- A search box + status filter toolbar; "Create version" CTA.
- Versions grouped into **3 collapsible sections**: **UNRELEASED** (top, expanded), **RELEASED** (middle), **ARCHIVED** (bottom, collapsed by default), each with a count badge.
- Default sort: Unreleased by start date ASC; Released by release date DESC; Archived alphabetical.

## Columns (per spec)

`Version` (link) · `Progress` (segmented bar) · `Start date` · `Release date` · `Description` (truncated 1 line) · `•••` actions. Header copy is sentence-case ("Start date", "Release date").

## Section grouping

3 status buckets driven by `released` + `archived` booleans. Chevron expand/collapse per section; overdue rows show release date in red + warning icon + "OVERDUE" lozenge.

## Search / filter behavior

- Client-side substring match on version name, debounced ~200ms, applied across all sections.
- Status filter: All / Unreleased / Released / Archived / Overdue.
- Spec proposes URL-param filter state (`?status=&q=`).

## Create version behavior

- Spec 1 path 13: **inline form at top of the Unreleased section** (current Jira), fields Name / Start date / Release date / Description; "Save" keeps the form open for rapid creation; "Cancel"/Esc collapses.
- Spec 2 §4: alternatively a modal. (Conflict — see `01`.)
- Validation: name required, ≤255 chars, unique within project (case-sensitive); release date ≥ start date.

## Action menu items (•••)

- **Unreleased:** Release · Edit · Merge · Delete.
- **Released:** Unrelease · Edit · Archive · Merge · Delete.
- **Archived:** Unarchive · Delete.

## Release / unrelease behavior

- **Release:** confirmation modal — counts unresolved issues, optional "move open issues to version X" (select), release date (defaults today). Sets `released:true`. Row animates Unreleased → Released.
- **Unrelease:** immediate (no modal in spec Part 2 §4.5), sets `released:false`, row returns to Unreleased (may become overdue).

## Archive / unarchive behavior

- **Archive:** immediate menu action (Part 2) / confirmation (spec 1 path 37) — conflict noted. Sets `archived:true`, row → Archived section.
- **Unarchive:** immediate, returns to Released or Unreleased per the `released` flag.

## Delete / merge behavior

- **Delete:** modal with issue-reassignment radios for Fix Version and Affects Version ("Move to: {picker}" / "Remove from all issues"). "This action cannot be undone."
- **Merge:** "Merge {name} into: {picker}"; moves all fix/affects-version issues to target then deletes source.

## Release detail navigation

- `Version name` link → Release Detail page: header (name, status lozenge, dates, description, Edit), large segmented progress bar + legend, tabs **Issues** / **Release notes**, breadcrumb back to Releases.

## Release notes navigation

- "Release notes" tab: auto-generated, grouped by issue type, "Copy to clipboard". Format `• [KEY-123] Summary`.

## Typography / density / spacing (observable, from spec — TREAT AS REFERENCE, MAP TO ADS TOKENS)

- Row height ~48px; cell padding 4px V / 8px H; section header 11px/700 uppercase; cell body 14px/400; version link 14px/500.
- **Two palettes appear in the specs and conflict** — old Jira N/B/G/R hex (Part 1) vs newer ADS tokens (spec 2). Do not hardcode either; map to `var(--ds-*)`.

## Screenshots still needed from the human

1. Live BAU Releases landing — full page, all 3 sections expanded, real version rows.
2. A version row at hover (drag handle visibility, •••).
3. Create-version interaction (inline form vs modal — confirm current Jira behavior).
4. Release confirmation modal with unresolved issues.
5. Delete + Merge modals.
6. Release Detail page (header + progress + Issues tab).
7. Release notes tab.
8. Permission-denied view (non-admin) — to confirm hidden create/•••/drag.

Without these, the live-DOM token/spacing values cannot be re-verified against the 2026-06-23 spec probe; the spec is treated as the current best reference.
