# Folio → Jira/Catalyst Enterprise — HANDOVER

**Feature:** CAT-FOLIO-NOTION-20260706
**Direction (Vikram-approved):** Notion behavior stays ONLY inside the rich BlockNote editor body. All chrome, database views, comments, hierarchy, actions, typography, spacing, layout → Jira/Confluence-style Catalyst. Use existing Catalyst ADS direction + `/cre` rules AS-IS — no invented mockups.
**Branch:** main. Tree in sync at time of writing.

---

## LANDED + LIVE-VERIFIED (on main)

| Fix | Commit | Files | Proof |
|---|---|---|---|
| "Could not add the row" | (row-fix) | `src/hooks/useDocexDatabase.ts`, `src/components/wiki-hub/database/DatabaseSurface.tsx` | POST 201, rows 1→3 persisted on cyij |
| Icon picker top-left → anchored | `1afe4b3cf` | `WikiPageSurface.tsx` | opens under icon in content column |
| DB view-switcher → @atlaskit/tabs | `1eb4fa766` | `DatabaseSurface.tsx` | Table↔Board switching verified |
| ADS baseline ratchet | `6683dfd17` | `design-governance/audit-baseline.json` | −160 hardcoded px |
| Jira page header/title/icon | earlier (d9c1cf186, 8371deabf) | `WikiPageSurface.tsx` | title heading-large, icon 28px, ProjectPageHeader |

**Row-fix root cause (non-obvious):** `onClick={addRow}` at DatabaseSurface passed the React click event (an HTMLButtonElement graph) as the row `values`. `JSON.stringify` of the insert payload threw "Converting circular structure to JSON" BEFORE the request — hidden because the onError used `e instanceof Error` and a Supabase `PostgrestError` is a plain object (not an Error), so the real cause was discarded. Fix: guard `addRow` to accept only a plain-object seed; add `docexErrorMessage()` to surface PostgrestError; guard databaseId+session.

---

## PENDING SLICES (B–F) — none started

**B — Right rail = outline-only.** Right drawer currently duplicates the page tree (left `WikiSidebar` already shows it). Make it Confluence-style on-this-page heading OUTLINE (TOC) only; drop the hand-rolled drawer tabs. File: `WikiPageSurface.tsx` (~:1429–1524 drawer, `:1445-1468` hand-rolled tabs). Benefit: kills left/right hierarchy duplication (Unknowns U2). Risk: LOW.

**C — Comments → CatalystAvatar.** Comment surface = `src/components/knowledge-hub/DocumentComments.tsx` (lazy-imported by WikiPageSurface). Swap raw `@atlaskit/avatar` → `CatalystAvatar`/`UserAvatar` (CRE Grid G1). Convert hardcoded font-px → ADS tokens. Benefit: Jira-style commenter avatars. Risk: LOW.

**D — L1 home canonicalize.** `/folio` home = `src/pages/wiki/WikiHomePage.tsx`. Ensure it uses `CatalystListPageLayout` + `ProjectPageHeader hubType="folio"` (CRE Grid E1, no trail/title). Check current state first — may be partially done. Reference: `src/pages/project-hub/filters/FiltersListPage.tsx`. Risk: LOW–MED.

**E — Attachments RTL.** `src/components/wiki-hub/DocexAttachments.tsx` — add `dir="auto"` to filename/label text. Benefit: Arabic filenames render right. Risk: TRIVIAL.

**F 🚩 — Shell/breadcrumb swap (HELD, needs design decision).** Migrate WikiPageSurface's hand-rolled sticky top bar (`:773–987`) → `ProjectPageHeader` (CRE Grid E5). BLOCKER: that bar hosts AI-generate (`GenerateStoriesFromPage`), Arabic translate (`WikiTranslateBar`), live presence (`WikiPresence`), and save-status — none have a `ProjectPageHeader` slot. Also conflicts with Vikram's deliberate 2026-07-06 tuning (page-width, `maxItems={12}` breadcrumb, emoji removed). HIGH regression risk. Do NOT do without an explicit design call on where those controls go.

---

## CANONICAL REFERENCES (mirror these, don't invent)
- L2 page/db shell: `src/pages/wiki/DocexDatabasePage.tsx` (already canonical — `ProjectPageHeader hubType="folio" paddingX={40} hideTitle trail=[...]` + 1080 centered doc column + `heading-large`). The 1080 centered width is INTENDED (Confluence doc column) — NOT a bug.
- L1 list / L2 detail patterns: CRE Grid E (`src/lib/catalyst-rules/RULE_TABLE.md`), `FiltersListPage.tsx` / `FilterDetailPage.tsx`.
- Avatars: CRE Grid G. Tables: JiraTable (Grid H typography inherited free).

## VERIFICATION PER SLICE
`npx tsc --noEmit` (grep touched file) · `npm run lint:colors:gate` · `npm run audit:ads:gate` · `npm run lint:cre` · live screenshot at localhost:8080 (dev server on :8080; staging DB = cyij). Stage explicit files only; push to main authorized.

## GOTCHAS
- AkPopup would NOT anchor inside WikiPageSurface's sticky/flex context (renders top-left). Icon picker uses a scoped `position:relative inline-flex` wrapper instead — reuse that pattern for the cover picker if canonicalizing it.
- WikiPageSurface title/icon edits were reverted once mid-session by an external process; re-check before assuming.
- Session had a transient concurrent-session file-deletion scare (self-healed). If working tree shows foreign deletions, do NOT sweep them — isolate.
