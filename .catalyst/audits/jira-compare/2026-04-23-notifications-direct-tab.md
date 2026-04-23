# JIRA COMPARE — Notifications / Direct Tab
Date: 2026-04-23 · Auditor: Claude (jira-compare skill)

## Scope (from user's screenshot)
Catalyst Notification Panel → Direct tab, full panel including header, tabs, notification rows, thread/comment card, key+status line, avatar, unread dot.

Jira ref:     https://digital-transformation.atlassian.net/jira/projects  
Catalyst ref: http://localhost:8080/  
Screenshot:   user-provided (previous session)

---

## DOM Scan Summary
- Catalyst: 20 Direct rows visible (assigned/updated/transitioned — no comment-type notifs in live data today)
- Jira: ~67 rows, including mentioned + assigned + commented types; aggregation indicators present
- Gate passed: all elements counted, computed styles extracted via javascript_tool

---

## Executive Verdict
**Not acceptable parity.** The panel structure is sound — Atlaskit Avatar, Atlaskit Box/xcss primitives, canonical 16×16 WorkItemIcon SVGs all confirmed rendering. The critical gaps are typographic: every body text node is 1px undersize (13px vs Jira's 14px), the timestamp is dramatically undersize (11px vs 14px), the avatar is 8px too small (32px vs 40px), the panel title is 4px undersize (20px vs 24px), and the comment-preview card uses a white opaque background where Jira uses a transparent card with a barely-visible 0.5px border. These gaps compound to make the panel feel "dull" as the user correctly observed — smaller type + smaller avatar + solid white card all read as lower-fidelity. All fixes are in two files only.

---

## P0 — Atlaskit Mismatches

| # | Element | Jira (component) | Catalyst (today) | Fix | Spec |
|---|---------|-----------------|-----------------|-----|------|
| 1 | Panel title "Notifications" | `@atlaskit/heading` → `<h2>` size "large", 24px/653 weight, Atlassian Sans | `<span>` Sora 20px/700 — not a heading element, wrong size | Swap to `<h2>` with Heading-equivalent styling 24px/600; keep Sora (brand font) | https://atlassian.design/components/heading |
| 2 | Section date labels (Yesterday/Today/Older) | `<h3>` via `@atlaskit/heading` size "xsmall", 12px/600 | `<span>` 12px/600 ✅ size/weight correct but wrong semantic tag | Wrap in `<h3>` or use `@atlaskit/heading` size="xsmall" | https://atlassian.design/components/heading |
| 3 | Item key+status line | Single `<a>` link "BAU-5576 • ToDo" 14px/400 rgb(24,104,219) — one linked element | Split spans: key blue 12px/500 + bullet + status grey 13px — sizes off, key too small | Unify to 14px/400; make key a link; `@atlaskit/link` | https://atlassian.design/components/link |

**Handoff: [CLAUDE CODE] all three — surgical prop/style changes, no rebuild needed**

---

## P1 — Parity Drift (Typography, Spacing, Avatar)

### Typography drift — every body element is 1px undersize

| Role | Jira | Catalyst today | Fix |
|------|------|---------------|-----|
| Panel title | 24px/653 Atlassian Sans rgb(41,42,46) | 20px/700 Sora rgb(15,23,42) | 24px — keep Sora/color per brand |
| Tab labels | 14px/500 | 13px/650 active / 13px/500 inactive | 14px |
| Actor name | 14px/400 rgb(41,42,46) | 13px/600 rgb(41,42,46) | 14px — keep 600 for Catalyst emphasis |
| Verb text | 14px/500 rgb(41,42,46) | 13px/400 rgb(41,42,46) | 14px/500 |
| **Timestamp** | **14px/400 rgb(107,110,118)** | **11px/400 rgb(107,110,118)** | **14px — most glaring gap** |
| Item title | 14px/400 rgb(41,42,46) | 13px/400 | 14px |
| Item key | 14px/400 rgb(24,104,219) | 12px/500 — wrong size AND weight | 14px/400 |
| Status text | folded into key link | 13px/400 grey — separate span | keep separate, bump to 14px |
| Comment preview | 14px/400 rgb(41,42,46) | 12px/400 — 2px short | 14px |
| Reply/View thread | 12px/500 | 11px/500 | 12px |

### Avatar size

| Element | Jira | Catalyst | Fix |
|---------|------|---------|-----|
| Notification avatar | 40px circle (Atlaskit `size="large"`) | 32px circle (`size="medium"`) | `size="large"` — one prop change |

### Comment-preview card

| Property | Jira | Catalyst | Fix |
|----------|------|---------|-----|
| Background | `rgba(0,0,0,0)` transparent | `#FFFFFF` white — opaque card | `transparent` |
| Border | `0.555px solid rgba(11,18,14,0.14)` — barely visible | `1px solid #E8ECEF` — heavy outline | `1px solid rgba(11,18,14,0.14)` light / `1px solid rgba(255,255,255,0.1)` dark |
| Text size | 14px | 12px | 14px |

### Key+Status format

| Property | Jira | Catalyst | Fix |
|----------|------|---------|-----|
| Key size | 14px/400 | 12px/500 | 14px/400 |
| Key color | rgb(24,104,219) blue link | rgb(12,102,228) ≈ same ✅ | — |
| Status | folded into key as "• ToDo" same blue | separate grey span | keep separate — but bump to 14px |
| Bullet size | n/a (inline text) | 10px separate span | 14px inline |

---

## P2 — Polish

- Aggregation indicator ("+2 updates from X") is present in Jira as a 14px/400 blue link — absent in Catalyst when aggregation prop is populated; current aggregation row uses `@atlaskit/avatar` xsmall + 12px text — correct concept, fix to 14px to match.
- Unread dot: 8px blue — Jira uses a similar blue pip. ✅ matches concept.
- Jira has no reaction buttons in the notification panel thread card — only the comment preview text and a "Reply in Jira" style link. Catalyst has 5 emoji reaction buttons which is extra polish beyond Jira spec; keep but reduce font size from 11→12px.

---

## Typography Sweep (page-level)

| Role | Jira | Catalyst today | Match? |
|------|------|---------------|--------|
| Panel title | Atlassian Sans 24px/653 | Sora 20px/700 | ❌ size |
| Tab labels | Atlassian Sans 14px/500 | Inter 13px/650 | ❌ size |
| Section labels | Atlassian Sans 12px/600 #6B6E76 | Inter 12px/600 | ✅ |
| Actor name | Atlassian Sans 14px/400 | Inter 13px/600 | ❌ size |
| Verb phrase | Atlassian Sans 14px/500 | Inter 13px/400 | ❌ size + weight |
| Timestamp | Atlassian Sans 14px/400 #6B6E76 | Inter 11px/400 | ❌ −3px |
| Item title | Atlassian Sans 14px/400 | Inter 13px/400 | ❌ size |
| Item key | Atlassian Sans 14px/400 blue | Inter 12px/500 blue | ❌ size + weight |
| Comment text | Atlassian Sans 14px/400 | Inter 12px/400 | ❌ −2px |

---

## Tab Order
- Jira: Notifications title → Only show unread toggle → Direct tab → Watching tab → notification rows
- Catalyst: same general order + AI Recap + Ageing tabs (Catalyst extras)
- No critical tab-order mismatch

## Scroll Behaviour
- Both sides scroll the notification list vertically; header stays sticky ✅

---

## Proposed Fix Plan

**File 1: `src/features/notifications/components/DirectNotificationRow.tsx`**
1. Avatar: `size="medium"` → `size="large"` (line ~106)
2. Verb line font-size: 13 → 14, weight: 400 → 500
3. Actor name weight: keep 600, size 13 → 14
4. Timestamp font-size: 11 → 14
5. Title font-size: 13 → 14
6. Key font-size: 12 → 14, fontWeight: 500 → 400
7. Status font-size: 13 → 14
8. Bullet span font-size: 10 → 14
9. Thread card background: '#FFFFFF' → 'transparent'
10. Thread card border: `1px solid ${threadBorderColor}` → `1px solid rgba(11,18,14,0.14)` light / `1px solid rgba(255,255,255,0.12)` dark
11. Thread comment preview text: 12px → 14px, lineHeight: '16px' → '20px'
12. Reply/View thread buttons: 11px → 12px
13. Aggregation span: 12px → 14px

**File 2: `src/components/notifications/NotificationPanel.tsx`**
1. Panel title: fontSize 20 → 24 (line 380)
2. Tab labels: fontSize 13 → 14 (line ~504)

---

## Acceptance Checks (for Vikram)
- [ ] Avatar: 40px circles on all rows (Atlaskit `size="large"`)
- [ ] Panel title: 24px
- [ ] Timestamp: 14px (matches all other body text)
- [ ] Verb text: 14px/500
- [ ] Item title: 14px
- [ ] Key: 14px/400 blue
- [ ] Thread card: transparent background, barely-visible border
- [ ] Tab labels: 14px
- [ ] No shadcn / Radix / bespoke Tailwind in this surface ✅ (already Atlaskit)
- [ ] TypeScript: `npx tsc --noEmit` exits 0

## Handoff Index
- [CLAUDE CODE] × 2 files, 13 + 2 surgical style value changes
- [LOVABLE] × 0 — no rebuild required
- [RESEARCH] × 0 — all facts confirmed from DOM scan
