# /jira-compare — For You, Recommended tab
Generated: 2026-04-24 · Auditor: Claude (Cowork) via Chrome MCP DOM probe

**Jira baseline**: https://digital-transformation.atlassian.net/jira/for-you (Recommended tab)
**Catalyst target**: http://localhost:8080/ (Recommended tab)
**Method**: `javascript_tool` + `getComputedStyle` on both live DOMs. No hallucination — every row below is directly observed.

---

## 0. Scope lock

This audit covers ONLY the "Recommended" tab view + surrounding chrome:
- H1 greeting
- "Recommended spaces" / "Recommended projects" strip (header + link + cards)
- Tab strip (the container + all 5 tabs)
- First row/card inside the Recommended tab panel

Tabs Assigned / Starred / Worked on / Viewed are out of scope for this report and will follow in P7.6–P7.9.

## 1. Intentional divergences (do NOT fix)

These are deliberate Catalyst house decisions, confirmed with Vikram in-chat. Document, don't touch.

| Field | Jira | Catalyst | Reason |
|---|---|---|---|
| H1 text | "For you" | "Good to see you, Vikram" | Personalised greeting — Catalyst house style. |
| Strip heading | "Recommended spaces" | "Recommended projects" | Catalyst vocabulary — "project", not "space". |
| "View all" link | "View all spaces" → `/jira/projects` | "View all projects" → `/projects` | Same vocabulary rule. |
| Heading font family | Atlassian Sans | Sora (headings) / Inter (body) | Catalyst typography locked per CLAUDE.md §4. |

Everything below is a **parity gap** that should be closed.

## 2. Parity gaps — ranked by blast radius

### 🔴 P0 — Tab strip uses wrong pattern (HIGH impact, single file)

| Field | Jira | Catalyst |
|---|---|---|
| Container bg | `rgba(5,21,36,0.06)` (Atlaskit `--ds-background-neutral`) | `transparent` |
| Container radius | `8px` | `0px` |
| Container padding | `4px` | `0px` |
| Container gap | `4px` | `4px` ✅ |
| Container width | `563px` (fits content) | `1216px` (stretches full width) |
| Tab height | `24px` | `41px` (70% too tall) |
| Tab font | `Atlassian Sans 13.33px` | (unmeasured — rebuild anyway) |
| Tab widths | 127 · 162 · 76 · 99 · 76 | 125 · 160 · 73 · 96 · 74 ✅ near-pixel |

**Diagnosis**: Catalyst currently renders classic Atlaskit underlined tabs. Jira's For You uses the newer rounded-pill tab cluster (a `display:flex` inline container with rounded-8 background, each tab being a small 24-tall chip). These are two different @atlaskit patterns — widths already match because the text is identical, but everything else differs.

**Fix**: rebuild `src/components/for-you/atlaskit/ForYouTabs.tsx` as a pill cluster. Use `token('color.background.neutral')` for the container, inline flex, `borderRadius: 8, padding: 4, gap: 4, height: 32`. Each tab becomes a 24px-tall button with `padding: 2px 12px`, `borderRadius: 6`, transparent bg at rest, `rgba(0,0,0,0.04)` on hover, and the selected tab gets white bg + subtle shadow (`elevation.surface`).

### 🔴 P0 — Project card size + radius + icon source

| Field | Jira | Catalyst | Gap |
|---|---|---|---|
| Card width | 230px | 602px | 2.6× too wide |
| Card height | 62px | 60px | ✅ close |
| Card radius | 4px | 8px | Double |
| Card padding | 12px 16px | 12px 14px | Close |
| Card bg | #FFFFFF | #FFFFFF | ✅ |
| Card border | `1.11px solid rgba(11,18,14,0.14)` | `1.11px solid rgba(11,18,14,0.14)` | ✅ EXACT |
| Card title font | `Atlassian Sans 600 14px/20px` | Inter (inside text) | Need family swap — but Catalyst uses Inter by house rule, so keep Inter 600 14/20 |
| **Icon** | `<img src="…/universal_avatar/view/type/project/avatar/{id}?size=small" 32×32 radius 4` | `<svg>` from invented `ProjectKindIcon` 32×32 | 🔴 HALLUCINATED per CLAUDE.md §11 |
| Icon radius | 4px | varies per SVG | Match Jira at 4px |
| Subtitle | none visible on current Jira layout | "9 items" count | Remove subtitle OR keep as count — Jira has nothing, so drop |
| Strip layout | `display:grid`, `gap:16px`, wraps (overflow:visible) | `display:grid`, `gap:12px`, `overflow-x:auto`, single row | Switch to wrapping grid |
| Strip columns | multi-col wrap at 230px-ish | 2 cols × 602px | Too few columns, too wide |

**Diagnosis**: This is the "icons completely messed up" finding. Jira ground truth (probed, not Rovo) confirms project cards use the project's own configured avatar URL from `/rest/api/2/universal_avatar/…`, not a type-category glyph. My 20 invented SVGs in `ProjectKindIcon.tsx` are wrong for this surface and must be removed.

**Fix**:
1. Delete `src/components/shared/ProjectKindIcon.tsx` (and all imports — only `RecommendedProjectsStrip.tsx` + `ForYouRow.tsx` import it; the row usage already has `WorkItemIcon` as primary and `ProjectKindIcon` only as a fallback — search and remove).
2. Add `avatar_url` to `WorkItem` (and upstream hook). Source it from the project row in Supabase.
3. In the strip, render `<Avatar src={card.avatarUrl} appearance="square" size="small" />` — Atlaskit's `Avatar` at `size="small"` is 32×32 with 4px radius, which nails the Jira spec.
4. Change card box to `width: 230, minWidth: 230`, `borderRadius: 4`, `padding: '12px 16px'`.
5. Change strip container to `display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 16px` — wraps naturally at any viewport without a horizontal scrollbar.
6. Drop the "{count} items" subtitle (Jira shows nothing under the title on this layout).

### 🟡 P1 — Strip heading typography

| Field | Jira | Catalyst |
|---|---|---|
| Size | 16px / 20px | 14px / 20px |
| Weight | 653 | 600 |
| Color | `rgb(41,42,46)` ✅ | `rgb(41,42,46)` ✅ |

**Fix**: bump `font` to `600 16px/20px "Inter"…` in `RecommendedProjectsStrip.tsx`. Atlaskit's 653 maps to Inter 600 in the Catalyst context.

### 🟡 P1 — "View all" link color

| Field | Jira | Catalyst |
|---|---|---|
| Color | `rgb(41,42,46)` (text color — NOT a link color) | `rgb(24,104,219)` (blue) |
| Weight | 400 | 500 |

**Fix**: change the link to `color: token('color.text')`, `fontWeight: 400`. Keep `ChevronRight` chevron. Jira's "View all" reads like body text, not a CTA.

### 🔴 P0 — Recommended panel first-card is the wrong pattern

| Field | Jira | Catalyst |
|---|---|---|
| "Reply to mentions" card | ~1158 × 378 — a full feed with avatar list of each mention | 1216 × 74 — a single blue banner button ("You've been mentioned in 10 items…") |
| bg | transparent | `rgb(233,242,254)` blue tint |
| border | none | `1.11px solid rgb(53,125,232)` blue |

**Diagnosis**: Catalyst currently shows a summary CTA banner; Jira shows the actual expandable mentions feed with each mentioner's avatar, the comment preview, and a "Reply" affordance per row. This is a structural gap, not a styling one.

**Fix (deferred to P7.5 iteration 2)**: rebuild `RecommendedPanel.tsx` to list the actual mention rows with avatars, comment preview, and per-row reply action. Will need a new hook/query for `user_recommended_mentions`. Scope this separately — it's larger than a styling iteration.

## 3. Design token reference (Jira ground truth)

Captured from `getComputedStyle(document.documentElement)` on the live Jira DOM:

| Token | Value | Catalyst usage |
|---|---|---|
| `--ds-text` | `#292A2E` | Primary text on all surfaces |
| `--ds-text-subtle` | `#505258` | Secondary labels |
| `--ds-text-subtlest` | `#6B6E76` | Placeholder / metadata |
| `--ds-surface` | `#FFFFFF` | Card bg |
| `--ds-surface-sunken` | `#F8F8F8` | Page alt bg |
| `--ds-surface-hovered` | `#F0F1F2` | Row hover |
| `--ds-background-neutral` | `#0515240F` | **Tab pill container bg (confirmed)** |
| `--ds-background-neutral-hovered` | `#0B120E24` | Tab hover |
| `--ds-border` | `#0B120E24` | Card / row border |
| `--ds-border-bold` | `#7D818A` | Input border / focus |
| `--ds-link` | `#1868DB` | Link color (but For You's "View all" is text color, not link) |
| `--ds-space-100` | `0.5rem` | 8px |
| `--ds-space-150` | `0.75rem` | 12px |
| `--ds-space-200` | `1rem` | 16px |
| `--ds-space-300` | `1.5rem` | 24px |

All values above round-trip through `@atlaskit/tokens` via `token('color.text')` etc. — do not hard-code.

## 4. Fix manifest (iteration 1)

Single pass, surgical, three files:

1. `src/components/for-you/atlaskit/ForYouTabs.tsx` — rebuild as pill cluster (P0)
2. `src/components/for-you/atlaskit/RecommendedProjectsStrip.tsx` — Avatar swap + card size 230 + radius 4 + wrapping grid + heading 16/20 + View all text color (P0+P1)
3. `src/hooks/useForYouData.ts` — add `avatar_url` field to `WorkItem` (dependency for #2)
4. Delete `src/components/shared/ProjectKindIcon.tsx` + remove its imports in `ForYouRow.tsx`

Deferred to iteration 2:
- `RecommendedPanel.tsx` full rebuild (Reply to mentions feed)
- Tokens sweep (verify every hex literal is `token()`)

## 5. Acceptance gates for P7.5

After iteration 1 ships, re-probe Catalyst and these must all pass:

- [ ] Tab strip: container width wraps content (not 1216), bg `rgba(5,21,36,0.06)`, radius 8, pad 4, gap 4
- [ ] Tab height: 24–32px (not 41)
- [ ] Card width: 230 (not 602)
- [ ] Card radius: 4 (not 8)
- [ ] Card icon: `<img>` (not `<svg>`) — `src` resolves to a project avatar URL
- [ ] Heading: 16px/20px, weight 600
- [ ] View all link: text color, weight 400
- [ ] `ProjectKindIcon.tsx` deleted
- [ ] `ForYouRow.tsx` no longer imports `ProjectKindIcon`
- [ ] No HSL, no new `!important`, single `.dark` block (CLAUDE.md §10)
