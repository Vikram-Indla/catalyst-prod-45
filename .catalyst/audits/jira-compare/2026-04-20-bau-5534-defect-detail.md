# JIRA COMPARE — BAU-5534 Defect detail + BAU-5538 Description editor
Date: 2026-04-20 · Auditor: Claude (jira-compare skill)

## Scope (from user's 4 screenshots)
Defect detail drawer for BAU-5534 on both sides (Description block, Key details block, Resolution row, Comments/Activity footer), plus the Description rich-text editor on BAU-5538 which exhibits a data-loss regression on focus.

| Endpoint  | URL                                                                                  |
|-----------|--------------------------------------------------------------------------------------|
| Jira      | `https://digital-transformation.atlassian.net/browse/BAU-5534` (tab 1405486567)      |
| Catalyst  | `http://localhost:8080/project-hub/BAU/allwork?issue=BAU-5534` (tab 1405486570)      |
| Atlaskit  | `https://atlassian.design/components` (tab 1405486573)                               |

Screenshot scope: user-provided (4 images — Jira description with inline screenshots, Catalyst description with broken placeholders, BAU-5538 description view, BAU-5538 description edit revealing empty editor).

## Executive verdict
Catalyst's defect drawer is now **structurally** on Atlaskit — Key details block, Lozenges, chevron collapse, Inline layout primitives. Five material parity gaps remain, one of which (BAU-5538 editor on-focus content loss) is a **data-integrity bug**, not a cosmetic one, and should ship first. The other four are field-level — wrong label (`Fix in` vs `Fix version`), an unneeded field (`Found in`), two read-only fields that Jira makes editable (`Severity`, `Resolution`), and one inline-text field that Jira renders as a rich-text block (`Root cause`). Parent resolution works in principle but fails for BAU-4466 because the parent key isn't seeded in `ph_issues`; fix the resolver to match BAU-5538's working path (which reaches the parent through `business_requests` fallback).

## P0 — Atlaskit mismatches & Atlaskit-primitive misuse
| # | Element | Jira (component) | Catalyst (today) | Fix (target `@atlaskit/*`) | Spec |
|---|---------|-------------------|-------------------|-----------------------------|------|
| 1 | Severity field | `@atlaskit/select` (single-select, editable inline) | `@atlaskit/lozenge` only — static display, no click-to-edit | Replace Severity cell in `CatalystDefectKeyRows` with an editable control that mirrors `EditablePriority` — `@atlaskit/select` opening on click, Lozenge surface in idle state, writes through `useCatalystIssueMutations.updateField({field:'severity', ...})` | https://atlassian.design/components/select |
| 2 | Resolution field | `@atlaskit/select` | `@atlaskit/lozenge` only — read-only | Same pattern — idle = Lozenge, edit = Select with {Done, Won't Do, Duplicate, Cannot Reproduce, Incomplete, Won't Fix} | https://atlassian.design/components/select |
| 3 | Root cause field | `@atlaskit/editor-core` (rich text, same editor as Description) | Plain `<span>` rendered as an inline FieldRow value | Promote to a below-the-fold rich-text block using the same `CatalystRichTextEditor` as Description; keep it collapsed by default | https://atlassian.design/components/editor |
| 4 | Description media (inline screenshots) | Atlaskit renderer resolves `media` ADF nodes via the Atlassian media API and renders actual `<img>` | `adfNodeToTiptap()` emits an italic `📎 <filename>` paragraph because the source URL is missing/proxied — visible as broken placeholder in view mode | Either (a) proxy the Atlassian media URL, (b) look up the attachment in the Catalyst `attachments` table by filename, or (c) drop the ADF path on save so imported defects land as structured ADF with uploaded-asset URLs | https://atlassian.design/components/editor |
| 5 | Comments section collapse state | Jira renders Comments collapsed-by-default when the Activity tab is not pinned to Comments | `CatalystActivitySection` renders always-expanded | Wrap the Comments section in the same chevron-toggle pattern used by `CatalystKeyDetails` / `CatalystDescriptionSection`; store the `defaultCollapsed` default as `true` | https://atlassian.design/components/expand |

## P1 — Parity drift (typography, labels, fields, tab order, scroll)

### Key details block
| Element | Jira | Catalyst today | Fix |
|---------|------|----------------|-----|
| `Fix in` label | Jira renders this field as **"Fix version/s"** | Label is **"Fix in"** in `CatalystDefectKeyRows` | Rename to **"Fix version"** (single) |
| `Found in` field | Not rendered on Jira defect view — Jira has no "Found in build" concept by default (requires a custom field) | Rendered with a "None" empty state | Remove the `Found in` row from `CatalystDefectKeyRows` and drop `foundInBuild` from the props interface |
| `Parent` row resolution | Shows clickable issue-type icon + `BAU-XXXX` + summary | For BAU-5534: shows `BAU-4466 (details unavailable)` because BAU-4466 isn't in `ph_issues`. For BAU-5538: resolves correctly because its parent comes through a different code path | Make defect parent resolution use the same fallback chain as BAU-5538 — check `PARENT_LINK_RULES['defect']` vs `PARENT_LINK_RULES['feature']` (or whatever 5538's type is); if the rule only reads `ph_issues`, add a second query against `business_requests` (mirroring the BR parent path) so BAU-4466 is reachable |

### Description block
| Element | Jira | Catalyst today | Fix |
|---------|------|----------------|-----|
| Inline screenshots | Rendered as actual `<img>` tags with proper sizing, caption, click-to-enlarge | Rendered as italic attachment-pill placeholders | See P0 #4 |
| Edit-mode content preload (BAU-5538) | Jira loads the stored ADF into the editor so existing content is visible on focus | **Data-loss bug** — on click into the Catalyst Description field, the editor mounts empty and the user's existing content is not loaded into TipTap state. Saving in this state would wipe the description. | See **Critical bugs** below |

### Tab order (as captured from DOM walk)
1. Title (H1, editable) — both sides match
2. Quick actions row — both sides match
3. Key details (chevron toggle) — both sides match
4. Parent — **Catalyst: keyboard-inaccessible for unresolved parents** (the raw `BAU-4466` span isn't a focusable element; Jira's link is)
5. Priority — both sides match
6. Severity — **Catalyst: not focusable** (static lozenge has no tab stop); Jira's select is position 6
7. Fix version — matches Jira (Jira position 7)
8. Root cause — **Catalyst: not focusable**; Jira position 8
9. Resolution — **Catalyst: not focusable**; Jira position 9
10. Description editor — matches Jira but loads blank (see data-loss bug)
11. Activity/Comments — Catalyst is always-expanded; Jira collapsed

### Scroll behaviour
Matches Jira — both sides scroll the left pane while the right sidebar is sticky. No finding.

## P2 — Polish
- Severity Lozenge: case-sensitive lookup has been fixed in the helper (`severityAppearance()`) but we haven't verified the 'Low' value turns the Lozenge green on a defect that actually has severity set — BAU-5534 has no wired severity so this is untested.
- Empty-state `None` text is `#6B778C` (4.6:1, passes AA) — matches Atlaskit `color.text.subtlest`, good.

## Typography sweep (page-level)
| Role             | Jira (Atlaskit)                                | Catalyst today                                         | Match? |
|------------------|------------------------------------------------|--------------------------------------------------------|--------|
| Section heading  | `@atlaskit/heading size="small"` — 14/600      | `@atlaskit/heading size="small"` — 14/600              | ✅     |
| Key details label| 14/500/18.67 line-height/#505258               | 14/500/18.67/#505258                                   | ✅     |
| Key details value| 14/400/#292A2E                                 | 14/400/#292A2E                                         | ✅     |
| Empty state      | 14/400/#6B778C ("None")                        | 14/400/#6B778C ("None")                                | ✅     |
| Lozenge text     | 11/700 uppercase via `@atlaskit/lozenge`       | 11/700 uppercase via `@atlaskit/lozenge`               | ✅     |
| Description body | Atlaskit renderer, 14/400/22                   | TipTap `prose` classes, 14/400/21                      | ≈     |

## Critical bugs (must-ship-first, outside the P0 matrix)

### 🔴 BAU-5538 Description editor loses existing content on focus
**Evidence:** your image 3 shows the Description view-mode populated with the full validation-checks markdown list. Image 4 shows the same field after clicking into edit mode — the editor is empty, the stored content isn't loaded into TipTap state.

**Root cause (suspected):** in `CatalystDescriptionSection` the edit-mode pivot renders `CatalystRichTextEditor` with an initial-content prop that only reads `issue.description_adf` at mount time. If the ADF parse fails (e.g., unknown node type, malformed JSON), the fallback returns empty nodes rather than falling back to the plaintext `issue.description` field, and the user sees an empty editor. On save, TipTap will emit empty ADF and overwrite the real description.

**Fix shape:**
1. In the ADF → TipTap conversion (`adf-utils.ts`), if the converter throws or emits zero nodes, fall back to a paragraph node containing `issue.description` (plaintext) instead of emitting `{}`.
2. Add a guard in the save path: refuse to `updateField('description_adf', …)` if the new ADF has zero text-content AND the issue previously had non-empty description. Toast the user and log to `activity_logs` instead of silently overwriting.

## Proposed fix plan (Atlaskit-first, surgical)
1. `src/components/shared/rich-text/adf-utils.ts` — in `adfToTiptap()`, wrap the root conversion in try/catch; on empty output fall back to a paragraph with `issue.description`.
2. `src/components/shared/rich-text/CatalystRichTextEditor.tsx` — add `minContentGuard` prop: if initial TipTap doc is empty but the fallback plaintext is non-empty, emit a soft warning and block the first save.
3. `src/components/catalyst-detail-views/defect/CatalystDefectFields.tsx`
   - Remove the `Found in` FieldRow and drop `foundInBuild` from props.
   - Rename the `Fix in` FieldRow label to `Fix version`.
   - Replace the `Severity` Lozenge with an editable wrapper that toggles between idle (Lozenge) and edit (`@atlaskit/select`), mirroring `EditablePriority`.
   - Replace the `Resolution` Lozenge with the same editable wrapper pattern, options `[Done, Won't Do, Duplicate, Cannot Reproduce, Incomplete, Won't Fix]`.
   - Remove the `rootCause` row from `CatalystDefectKeyRows`.
4. `src/components/catalyst-detail-views/defect/CatalystViewDefect.tsx`
   - Import a new `CatalystRootCauseSection` (see step 5), mount it below `CatalystDescriptionSection`.
5. `src/components/catalyst-detail-views/defect/CatalystRootCauseSection.tsx` — **new file** — wraps `CatalystRichTextEditor` with section heading `Root cause`, collapse chevron, reads/writes `issue.root_cause_adf`.
6. `src/components/catalyst-detail-views/shared/sections/CatalystKeyDetails.tsx` — extend `PARENT_LINK_RULES` so `defect` falls back to `business_requests` when the parent key isn't found in `ph_issues` (match BAU-5538's working resolver).
7. `src/components/catalyst-detail-views/shared/sections/CatalystActivitySection.tsx` — add `defaultCollapsed?: boolean` prop (default `true`), wrap content in a chevron-toggle pattern matching `CatalystKeyDetails`.
8. `src/components/catalyst-detail-views/defect/CatalystViewDefect.tsx` — pass `defaultCollapsed` to `<CatalystActivitySection>`.
9. Schema follow-up: add columns `severity`, `resolution`, `root_cause_adf`, `root_cause` to `ph_issues` (migration + regenerated Supabase types) so the editable controls actually persist. Until then the UI will read/write locally but revert on reload.
10. `src/components/catalyst-detail-views/shared/sections/CatalystDescriptionSection.tsx` — add the media-lookup fallback described in P0 #4, preferring the `attachments` table over Atlassian's external URL.

Each step: one file, one change, one reason.

## Acceptance checks (for the human)
- [ ] BAU-5538: click into Description → existing content remains visible in the editor. No data loss on save.
- [ ] BAU-5534: Severity cell is clickable and opens an `@atlaskit/select` dropdown.
- [ ] BAU-5534: Resolution cell is clickable and opens an `@atlaskit/select` dropdown.
- [ ] BAU-5534: `Fix in` label reads `Fix version`. `Found in` row does not render.
- [ ] BAU-5534: Root cause rendered as a collapsible rich-text block below Description, not as a Key-detail inline row.
- [ ] BAU-5534: Parent `BAU-4466` is clickable; click opens BAU-4466's detail view.
- [ ] BAU-5534: Description screenshots render as images, not attachment placeholders.
- [ ] Comments section starts collapsed; chevron expands it.
- [ ] All listed elements are `@atlaskit/*` primitives — no shadcn/Radix/bespoke Tailwind in scope.

---

_Audit artifacts:_
- Source files inspected: `CatalystDefectFields.tsx`, `CatalystViewDefect.tsx`, `CatalystKeyDetails.tsx`, `CatalystDescriptionSection.tsx`, `adf-utils.ts`
- Chrome MCP tabs: jira (1405486567), catalyst (1405486570), atlaskit (1405486573)
- User screenshots: 4 (2× BAU-5534 description comparison, 2× BAU-5538 editor data-loss evidence)
