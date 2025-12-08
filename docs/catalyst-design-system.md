# Catalyst Design System Specification

**Version:** 2.0.0 (Post Fix-Pack)  
**Last Updated:** 2024-12-08

---

## Overview

The Catalyst Design System provides a consistent, token-based foundation for all UI components. This document serves as the single source of truth for design tokens, component specifications, and usage guidelines.

---

## 1. Brand Colors

| Token | Value | HSL | Usage |
|-------|-------|-----|-------|
| `--brand-dark` | `#1A1A1A` | `0 0% 10%` | Dark backgrounds, headers |
| `--brand-gold` | `#C69C6D` | `35 46% 60%` | Primary accent, CTAs |
| `--brand-gold-hover` | `#B8905F` | `35 41% 55%` | Hover state for gold |
| `--brand-gold-pale` | `rgba(198,156,109,0.08)` | - | Selected states, subtle highlights |

---

## 2. Surface Hierarchy

**CRITICAL:** Surfaces must create visual hierarchy. All values are HSL-based.

| Token | Value | Hex | Usage |
|-------|-------|-----|-------|
| `--background` | `0 0% 100%` | `#FFFFFF` | App canvas/background |
| `--card` | `0 0% 100%` | `#FFFFFF` | Raised cards, panels |
| `--muted` | `210 20% 98%` | `#F9FAFB` | Sunken areas, table regions |
| `--surface-sunken` | `210 20% 98%` | `#F9FAFB` | Dense containers, filter panels |
| `--surface-raised` | `0 0% 100%` | `#FFFFFF` | Elevated cards |
| `--surface-backdrop` | `214 15% 96%` | `#F3F4F6` | Modal overlays, backdrop areas |
| `--secondary` | `214 15% 96%` | `#F3F4F6` | Secondary backgrounds |

---

## 3. Text Colors

| Token | Value | Hex | Contrast | Usage |
|-------|-------|-----|----------|-------|
| `--text-primary` | `220 17% 10%` | `#111827` | 16.8:1 | Body text, headings |
| `--text-secondary` | `217 13% 34%` | `#4B5563` | 8.6:1 | Secondary labels |
| `--text-tertiary` | `217 11% 46%` | `#6B7280` | 5.4:1 | Muted text, hints |
| `--text-muted` | `217 10% 64%` | `#9CA3AF` | 3.5:1 | Disabled, placeholders |
| `--text-inverse` | `0 0% 100%` | `#FFFFFF` | - | Text on dark backgrounds |

---

## 4. Status/Semantic Colors

| Token | Value | Hex | Usage |
|-------|-------|-----|-------|
| `--success` | `142 71% 45%` | `#36B37E` | Success states, complete |
| `--warning` | `38 92% 50%` | `#FFAB00` | Warning states, at risk |
| `--destructive` | `14 100% 46%` | `#DE350B` | Error states, critical |
| `--info` | `210 100% 50%` | `#0065FF` | Info states, neutral |

---

## 5. Chart Palette (Golden Hour)

| Level | Token | Hex | Usage |
|-------|-------|-----|-------|
| Expert (5) | `--palette-expert` | `#5c7c5c` | Highest proficiency |
| Advanced (4) | `--palette-advanced` | `#8b7355` | Second tier |
| Intermediate (3) | `--palette-intermediate` | `#c69c6d` | Mid-tier (brand gold) |
| Beginner (2) | `--palette-beginner` | `#d4b896` | Lower tier |
| None (1) | `--palette-none` | `#c8ccd0` | No proficiency |

---

## 6. Layout Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--topnav-h` | `56px` | Global header height |
| `--pagehdr-h` | `56px` | Page header height (standardized) |
| `--sidebar-w` | `280px` | Sidebar expanded width |
| `--sidebar-collapsed` | `56px` | Sidebar collapsed width |
| `--toolbar-h` | `48px` | Toolbar height |
| `--grid-row` | `40px` | Default table row height |
| `--grid-row-compact` | `32px` | Compact table row height |
| `--grid-hdr` | `40px` | Table header height |

---

## 7. Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--s1` | `4px` | XS spacing |
| `--s2` | `8px` | SM spacing |
| `--s3` | `12px` | MD spacing |
| `--s4` | `16px` | LG spacing |
| `--s5` | `20px` | - |
| `--s6` | `24px` | XL spacing |
| `--s7` | `32px` | XXL spacing |
| `--s8` | `48px` | XXXL spacing |

---

## 8. Typography

| Token | Value | Usage |
|-------|-------|-------|
| `--font-size-xs` | `11px` | Micro text, badges |
| `--font-size-sm` | `12px` | Labels, captions |
| `--font-size-md` | `14px` | Body text (default) |
| `--font-size-lg` | `16px` | Subheadings |
| `--font-size-xl` | `18px` | Headings |

---

## 9. Elevation (Shadows)

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle elevation |
| `--shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.1)` | Cards, dropdowns |
| `--shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.1)` | Modals, overlays |
| `--shadow-panel` | `0 8px 24px rgba(0,0,0,0.12)` | Floating panels |

---

## 10. Button Specifications

### Sizes

| Size | Height | Padding | Font | Icon Size |
|------|--------|---------|------|-----------|
| Default | `36px` (h-9) | `px-4` | 14px/500 | 16px |
| Small | `32px` (h-8) | `px-3` | 14px/500 | 16px |
| Large | `40px` (h-10) | `px-8` | 14px/500 | 16px |
| Icon | `32px` (h-8 w-8) | - | - | 16px |

### States

| State | Styles |
|-------|--------|
| Default | `bg-brand-gold text-white` |
| Hover | `bg-brand-gold-hover` (8% darker) |
| Pressed | `active:scale-[0.98] active:brightness-95` |
| Focus | `ring-2 ring-ring ring-offset-2` |
| Disabled | `opacity-50 pointer-events-none` |

---

## 11. Table Specifications

| Property | Value |
|----------|-------|
| Row Height | `40px` (default), `32px` (compact) |
| Header Height | `40px` |
| Cell Padding | `px-4 py-2` |
| Header Padding | `px-4 py-2` |
| Border | `border-b border-border` |
| Hover | `hover:bg-muted/50` |
| Selected | `bg-muted` |

---

## 12. Toast Specifications

| Property | Value |
|----------|-------|
| Placement | `top-center` |
| Width | `360-420px` |
| Duration | `5000ms` |
| Stacking | `8px gap, LIFO` |

### Severity Colors (Token-Based)

| Type | Background | Text | Border |
|------|------------|------|--------|
| Success | `hsl(var(--success)/0.1)` | `hsl(var(--success))` | `hsl(var(--success)/0.2)` |
| Error | `hsl(var(--destructive)/0.1)` | `hsl(var(--destructive))` | `hsl(var(--destructive)/0.2)` |
| Warning | `hsl(var(--warning)/0.1)` | `hsl(var(--warning))` | `hsl(var(--warning)/0.2)` |
| Info | `hsl(var(--info)/0.1)` | `hsl(var(--info))` | `hsl(var(--info)/0.2)` |

---

## 13. Modal/Dialog Specifications

| Size | Width | Max Height |
|------|-------|------------|
| Small | `400px` | `85vh` |
| Medium | `540px` | `85vh` |
| Large | `720px` | `90vh` |
| XL | `960px` | `90vh` |

| Property | Value |
|----------|-------|
| Padding | `20px` (content), `16px` (header/footer) |
| Border Radius | `12px` |
| Overlay | `rgba(0,0,0,0.5)` |
| Focus Trap | Required |
| ESC Close | Required |

---

## 14. Drawer/Sheet Specifications

| Size | Width |
|------|-------|
| Small | `360px` |
| Medium | `480px` |
| Large | `640px` |
| Full | `100vw` |

---

## 15. Focus States

| Element | Focus Ring |
|---------|------------|
| Buttons | `ring-2 ring-ring ring-offset-2` |
| Inputs | `border-brand-gold shadow-[0_0_0_3px_rgba(198,156,109,0.15)]` |
| Links | `outline-2 outline-ring outline-offset-2` |

---

## 16. Border Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--border` | `#E5E7EB` | Default borders |
| `--border-subtle` | `#F3F4F6` | Subtle dividers |
| `--radius-sm` | `4px` | Small elements |
| `--radius-md` | `6px` | Buttons, inputs |
| `--radius-lg` | `12px` | Cards, modals |

---

## 17. Z-Index Scale

| Token | Value | Usage |
|-------|-------|-------|
| Base | `0` | Default |
| Dropdown | `50` | Dropdowns, popovers |
| Sticky | `100` | Sticky headers |
| Fixed | `150` | Fixed elements |
| Sheet | `200` | Drawers, sheets |
| Dialog | `250` | Modals, dialogs |
| Tooltip | `300` | Tooltips |
| Toast | `400` | Toast notifications |

---

## Fix Pack Summary (v2.0.0)

| Fix | Status | Description |
|-----|--------|-------------|
| A | ✅ | Surface hierarchy - sunken/backdrop tokens |
| B | ✅ | PageHeader height standardized to 56px |
| C | ✅ | Table row height set to 40px |
| D | ✅ | Button sizes (36/32/40px) + pressed state |
| E | ✅ | Toast colors use semantic tokens |
| F | ✅ | Modal/Drawer consistency verified |

---

## Governance Rules

1. **Token-First:** All colors must use CSS variables, never raw values
2. **No Hardcoding:** Layout dimensions must reference tokens
3. **Surface Hierarchy:** Cards must be distinct from canvas
4. **Semantic Status:** Success/warning/error must use status tokens
5. **Golden Hour Only:** Charts use only the defined palette

---

## Files Reference

| File | Purpose |
|------|---------|
| `src/index.css` | Core CSS variables |
| `tailwind.config.ts` | Tailwind theme extension |
| `src/theme/tokens.ts` | TypeScript token exports |
| `docs/fix-pack-summary.md` | Fix Pack details |
| `docs/catalyst_to_ads_alignment_matrix.md` | ADS alignment audit |
