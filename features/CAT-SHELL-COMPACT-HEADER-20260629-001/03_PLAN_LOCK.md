# PLAN LOCK — CAT-SHELL-COMPACT-HEADER-20260629-001

**Status**: AWAITING VIKRAM APPROVAL — do not code until approved  
**Timebox**: 2 hours  
**Date**: 2026-06-29

---

## Objective

Eliminate 30% vertical chrome waste from ALL product-hub / project-hub pages.  
First data row currently at **324px** from viewport top (33.9% of 956px viewport).  
Target: **≤ 200px** from viewport top (≤ 21%).  
**Universal shell change — not per-page.** Applies to all 8 INV pages + all project-hub + incident-hub + testhub pages simultaneously.

## Non-Scope (DO NOT TOUCH)

- Top navigation bar (`CatalystShell.tsx`, `GlobalPageHeader.tsx`)
- Sidebar (`ProductHubSidebar.tsx`, `ProjectHubSidebar.tsx`, any `*Sidebar.tsx`)
- JiraTable internals (column rendering, row data, cell editors)
- Any route file, data hook, or Supabase query
- Row height (keep at 43px — NOT changing density in Phase 1)
- Virtual scroll (Phase 3)
- Filter chip row (Phase 2)

---

## Measured Waste Breakdown

| Zone | Current px | Target px | Delta | File |
|---|---|---|---|---|
| Outer canvas padY | 16px | 4px | −12px | BacklogPage.atlaskit.tsx: `cardPadding.y` |
| ProjectPageHeader top pad | 8px | 4px | −4px | ProjectPageHeader.tsx |
| Breadcrumb row | 24px | — | merged | ProjectPageHeader.tsx |
| Gap between breadcrumb+title | 2px | — | merged | ProjectPageHeader.tsx |
| Title row | 28px | 32px (combined) | −22px net | ProjectPageHeader.tsx |
| ProjectPageHeader bottom pad | 4px | 0px | −4px | ProjectPageHeader.tsx |
| chromeBand paddingBottom | 12px | 6px | −6px | AtlaskitPageShell.tsx |
| Card internal top pad | ~32px | 8px | −24px | BacklogToolbar.tsx or workspace |
| Post-toolbar gap | 29px | 4px | −25px | BacklogToolbar.tsx or workspace |
| **Total** | **268px** | **~100px** | **−168px** | |

---

## Files to Modify (EXACT LIST — no other files)

1. **`src/components/layout/ProjectPageHeader.tsx`**
   - Change from 2-row stack (breadcrumb above title) to 1-row inline layout
   - Breadcrumb on left (smaller, de-emphasized), title after separator, actions on right
   - New padding: `4px 20px 0px` (was `8px 20px 4px`)
   - Row height: ~32px total (was 54px stacked)

2. **`src/components/ads/AtlaskitPageShell.tsx`**
   - `chromeBand` wrapper `paddingBottom: 12` → `paddingBottom: 4`

3. **`src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx`**
   - `cardPadding={{ x: 24, y: 16 }}` → `cardPadding={{ x: 24, y: 4 }}`

4. **`src/modules/backlog/components/BacklogToolbar.tsx`** (or wherever the 32px pre-toolbar pad + 29px post-toolbar gap live)
   - Reduce pre-toolbar padding from ~32px to 8px
   - Reduce post-toolbar gap from ~29px to 4px

**FORBIDDEN files (regression risk):**
- `src/components/layout/CatalystShell.tsx`
- Any `*Sidebar.tsx`
- `src/modules/backlog/components/BacklogListView.tsx` (table data rendering)
- Any `.test.tsx` or `.stories.tsx` unless purely cosmetic

---

## UI/UX Rules

- ADS tokens only — no bare hex, no Tailwind color utilities
- Breadcrumb in combined row: `var(--ds-text-subtlest)`, font-size 12px
- Separator ` / ` or thin `|` between breadcrumb and title
- Title: `var(--ds-text)`, font-weight 600, font-size 20px (unchanged)
- Star button remains immediately after title
- Actions slot (right side) unchanged
- Sticky behavior: combined header row sticks to top on scroll (add `position: sticky; top: 56px; z-index: 10` to chromeBand wrapper in AtlaskitPageShell)

---

## Screenshot Checklist

- [ ] Backlog page — first data row visible position (must be ≤ 200px from viewport top)
- [ ] Board page — no regression in header
- [ ] Timeline page — no regression in header
- [ ] Dashboard page — no regression
- [ ] Milestones page — no regression
- [ ] Dependencies page — no regression
- [ ] Filters page — no regression
- [ ] Work/AllWork page — no regression
- [ ] Dark mode — header colors correct (ADS tokens)
- [ ] Sidebar expanded state — header still fits

---

## Validation Commands

```bash
# 1. ADS token compliance (must be zero output)
grep -rn --include="*.tsx" --include="*.ts" --include="*.css" \
  -E "(#[0-9a-fA-F]{3,8}|rgba?\(|hsl[a]?\(|bg-(red|green|blue|yellow|slate|gray)-|text-(red|green|blue|yellow|slate|gray)-)" \
  src/ | grep -v "node_modules" | grep -v "\.snap"

# 2. TypeScript (must pass)
npx tsc --noEmit

# 3. Ratchet gates (must pass)
npm run lint:colors:gate
npm run audit:ads:gate
```

---

## Stop Conditions

- TypeScript errors in touched files → stop, fix before committing
- Any `DANGER` pattern in git diff (git add -A, hex colors) → stop
- If `ProjectPageHeader` change breaks any page other than the 8 listed → revert and scope narrower
- If sticky behavior causes scroll jank on JiraTable → remove sticky, keep height savings only

---

## Drift / Rebaseline

- If Vikram adjusts any target px value during implementation → update this Plan Lock before continuing
- Phase 1 = this plan. Phase 2 (scroll-collapse + filter chips) = new Plan Lock.

---

## Approved by

☐ Vikram — sign off here before implementation starts
