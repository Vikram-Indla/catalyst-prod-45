# CATALYST V12 HYBRID PRECISION DESIGN SYSTEM
## Complete Specification & Implementation Reference

**Version:** 12.0.0
**Codename:** Hybrid Precision
**Release Date:** March 2026
**Quality Target:** ≥9.5/10 (GOD-TIER)
**Foundation:** Catalyst V11 Carbon Precision + Jira UI Design Contract (Best-of-Breed Synthesis)
**Platform:** Saudi Arabia Ministry of Industry — Catalyst Portfolio Management

---

## CHANGELOG: V11 → V12

| Area | V11 Value | V12 Value | Rationale |
|------|-----------|-----------|-----------|
| Border radius (data elements) | 6px | 4px | Sharper = more professional for data UIs |
| Border radius (buttons) | 6px | 6px | Kept — buttons benefit from softer edges |
| Border radius (cards/containers) | 8px | 6px | Tightened for cohesion |
| Table row height | 36px | 36px | Kept — 11% density advantage over Jira's 40px |
| Table cell padding | 12px × 16px | 8px × 12px | Jira-inspired tighter economy |
| Table header padding | 12px × 16px | 10px × 12px | Slightly more than data for visual anchor |
| Table container shadow | shadow-sm | none | Jira-inspired — shadow adds unnecessary mass |
| Table container border | 1px solid | 1px solid | Kept — border replaces shadow as boundary |
| Row divider thickness | 1px | 0.75px | Sub-pixel inspired by Jira's 0.56px |
| Body emphasis weight | 600 | 650 | Jira's 653 concept — optical calibration |
| Heading emphasis weight | 600–700 | 650–700 | Harmonized with body emphasis |
| Hover technique | background swap | rgba overlay | Jira's mathematical overlay system |
| Interaction states | 2 (rest/hover) | 4 (rest/hover/select/press) | Jira's complete state model |
| Button primary | gradient + shadow | gradient + shadow | Kept — brand identity for CTAs |
| Toolbar buttons | bg swap | rgba overlay (no border) | Jira pattern — cleaner toolbar |
| Status lozenges | Jira 3-color | Jira 3-color (refined) | Guardrail preserved, height reduced to 20px |
| Focus ring | 3px solid + offset | 2px solid + 2px offset | Slightly thinner, still AAA |
| Sidebar width | 220px | 232px | Slightly wider for Arabic text |
| Icon sizing | 16/20/24 | 16/20/24 | Kept |
| Avatar sizes | 30px header, 24px table | 28px header, 24px table | Harmonized with Jira |

---

## TABLE OF CONTENTS

1. [Design Philosophy](#1-design-philosophy)
2. [Design Tokens — Complete CSS](#2-design-tokens)
3. [Typography System](#3-typography-system)
4. [Color System](#4-color-system)
5. [Spacing & Density System](#5-spacing--density-system)
6. [Surface & Elevation Architecture](#6-surface--elevation-architecture)
7. [Border System](#7-border-system)
8. [Interactive States — 4-State Model](#8-interactive-states)
9. [Component Library](#9-component-library)
10. [Layout Patterns](#10-layout-patterns)
11. [Status Lozenge Guardrail](#11-status-lozenge-guardrail)
12. [Accessibility (WCAG AAA)](#12-accessibility)
13. [Dark Mode](#13-dark-mode)
14. [RTL Support](#14-rtl-support)
15. [Print Styles](#15-print-styles)
16. [Quality Audit Checklist](#16-quality-audit-checklist)
17. [Migration Guide (V11 → V12)](#17-migration-guide)

---

## 1. DESIGN PHILOSOPHY

### Core Identity

Catalyst V12 is the synthesis of two design philosophies:

- **V11's ENGINEERED ARCHITECTURE** — Token-based, scalable, dark-mode-native, RTL-native, AAA accessible
- **Jira's INVISIBLE CRAFTSMANSHIP** — Ultra-subtle separation, mathematical hover states, content-first density

The result: **a design system that feels premium at first glance and invisible after 10 minutes of use.**

### The 7 V12 Principles

1. **CONTENT SUPREMACY** — The interface serves the data. No decorative element should compete with content.
2. **MATHEMATICAL INTERACTIONS** — All hover/press states use rgba overlays calculated from the same base. No arbitrary color swaps.
3. **OPTICAL CALIBRATION** — Font weights, border widths, and spacing are optically adjusted, not mathematically rounded.
4. **4-STATE COMPLETENESS** — Every interactive element has rest → hover → selected → pressed states defined.
5. **TOKEN ABSOLUTISM** — Zero hardcoded values in component CSS. Every color, spacing, font, shadow, and radius references a token.
6. **DENSITY BY DEFAULT** — 36px rows, 8×12 cell padding, 0.75px dividers. Compact mode available for power users.
7. **DUAL CONTEXT** — Must look impressive in a boardroom presentation AND invisible during 8-hour operational use.

### Non-Negotiable Guardrails

- **StatusLozenge:** Jira-native 3-color ONLY (Grey/Blue/Green). No overrides. No custom colors.
- **CATALYST10 Compliance:** Agent 3B audits 47 checks. V12 tokens override V10 where specified.
- **Dual Tokens:** Base for fills (`--cp-*`), `-text` suffix for text where contrast requires it.
- **Ministry Branding:** #2563EB primary blue preserved. Sora heading font preserved.
- **Saudi Calendar:** Sunday = first day of work week in all date-aware components.

---

## 2. DESIGN TOKENS — COMPLETE CSS

```css
/**
 * CATALYST V12 HYBRID PRECISION — COMPLETE DESIGN TOKENS
 * Version: 12.0.0
 *
 * COPY THIS ENTIRE BLOCK into your root CSS file.
 * These tokens are the single source of truth for the entire design system.
 *
 * NAMING CONVENTION:
 *   --cp-{category}-{variant}
 *   cp = Catalyst Precision
 *
 * TOKEN CATEGORIES:
 *   color-*    → Raw color scale (0-100)
 *   bg-*       → Semantic backgrounds
 *   text-*     → Semantic text colors
 *   border-*   → Semantic border colors
 *   space-*    → Spacing scale
 *   type-*     → Typography scale
 *   size-*     → Component sizing
 *   radius-*   → Border radius
 *   shadow-*   → Box shadows
 *   duration-* → Animation timing
 *   z-*        → Z-index scale
 *   interact-* → Interactive state overlays (NEW in V12)
 */

/* ═══════════════════════════════════════════════════════════════
   LIGHT MODE (DEFAULT)
   ═══════════════════════════════════════════════════════════════ */

:root {
  /* ─── COLOR SCALE: NEUTRAL ─── */
  --cp-neutral-0: #FFFFFF;
  --cp-neutral-5: #FAFAFA;
  --cp-neutral-10: #F5F5F5;
  --cp-neutral-15: #F1F5F9;
  --cp-neutral-20: #E5E5E5;
  --cp-neutral-25: #E2E8F0;
  --cp-neutral-30: #D4D4D4;
  --cp-neutral-35: #CBD5E1;
  --cp-neutral-40: #A3A3A3;
  --cp-neutral-50: #737373;
  --cp-neutral-60: #525252;
  --cp-neutral-70: #404040;
  --cp-neutral-80: #262626;
  --cp-neutral-90: #171717;
  --cp-neutral-95: #0F0F0F;
  --cp-neutral-100: #000000;

  /* ─── COLOR SCALE: PRIMARY (Blue — Brand) ─── */
  --cp-primary-5: #EFF6FF;
  --cp-primary-10: #DBEAFE;
  --cp-primary-20: #BFDBFE;
  --cp-primary-30: #93C5FD;
  --cp-primary-40: #60A5FA;
  --cp-primary-50: #3B82F6;
  --cp-primary-60: #2563EB;        /* ← Brand primary */
  --cp-primary-70: #1D4ED8;        /* ← Brand hover */
  --cp-primary-80: #1E3A8A;
  --cp-primary-90: #1E293B;

  /* ─── COLOR SCALE: TEAL (Secondary) ─── */
  --cp-teal-5: #F0FDFA;
  --cp-teal-10: #CCFBF1;
  --cp-teal-20: #99F6E4;
  --cp-teal-30: #5EEAD4;
  --cp-teal-40: #2DD4BF;
  --cp-teal-50: #14B8A6;
  --cp-teal-60: #0D9488;
  --cp-teal-70: #0F766E;
  --cp-teal-80: #115E59;
  --cp-teal-90: #134E4A;

  /* ─── COLOR SCALE: SUCCESS (Green) ─── */
  --cp-success-5: #F0FDF4;
  --cp-success-10: #DCFCE7;
  --cp-success-20: #BBF7D0;
  --cp-success-30: #86EFAC;
  --cp-success-40: #4ADE80;
  --cp-success-50: #22C55E;
  --cp-success-60: #16A34A;
  --cp-success-70: #15803D;
  --cp-success-80: #166534;
  --cp-success-90: #14532D;

  /* ─── COLOR SCALE: WARNING (Amber) ─── */
  --cp-warning-5: #FFFBEB;
  --cp-warning-10: #FEF3C7;
  --cp-warning-20: #FDE68A;
  --cp-warning-30: #FCD34D;
  --cp-warning-40: #FBBF24;
  --cp-warning-50: #F59E0B;
  --cp-warning-60: #D97706;
  --cp-warning-70: #B45309;
  --cp-warning-80: #92400E;
  --cp-warning-90: #78350F;

  /* ─── COLOR SCALE: DANGER (Red) ─── */
  --cp-danger-5: #FEF2F2;
  --cp-danger-10: #FEE2E2;
  --cp-danger-20: #FECACA;
  --cp-danger-30: #FCA5A5;
  --cp-danger-40: #F87171;
  --cp-danger-50: #EF4444;
  --cp-danger-60: #DC2626;
  --cp-danger-70: #B91C1C;
  --cp-danger-80: #991B1B;
  --cp-danger-90: #7F1D1D;

  /* ─── COLOR SCALE: INFO (Sky Blue) ─── */
  --cp-info-5: #F0F9FF;
  --cp-info-10: #E0F2FE;
  --cp-info-20: #BAE6FD;
  --cp-info-30: #7DD3FC;
  --cp-info-40: #38BDF8;
  --cp-info-50: #0EA5E9;
  --cp-info-60: #0284C7;
  --cp-info-70: #0369A1;
  --cp-info-80: #075985;
  --cp-info-90: #0C4A6E;

  /* ─── COLOR SCALE: PURPLE (AI Features) ─── */
  --cp-purple-5: #F5F3FF;
  --cp-purple-10: #EDE9FE;
  --cp-purple-20: #DDD6FE;
  --cp-purple-30: #C4B5FD;
  --cp-purple-40: #A78BFA;
  --cp-purple-50: #8B5CF6;
  --cp-purple-60: #7C3AED;
  --cp-purple-70: #6D28D9;
  --cp-purple-80: #5B21B6;
  --cp-purple-90: #4C1D95;

  /* ═══════════════════════════════════════════════════════════════
     SEMANTIC THEME TOKENS — LIGHT MODE
     Always use these in components. Never use raw scale tokens.
     ═══════════════════════════════════════════════════════════════ */

  /* ─── BACKGROUNDS ─── */
  --cp-bg-page: #FFFFFF;                         /* Page/app background */
  --cp-bg-surface: #F8FAFC;                      /* Cards, panels, sidebar headers */
  --cp-bg-sunken: #F1F5F9;                       /* Table headers, nested surfaces */
  --cp-bg-elevated: #FFFFFF;                     /* Modals, popovers, dropdowns */
  --cp-bg-overlay: rgba(0, 0, 0, 0.5);          /* Modal backdrop */
  --cp-bg-backdrop: rgba(0, 0, 0, 0.25);        /* Subtle overlay */

  /* ─── TEXT ─── */
  --cp-text-primary: #0F172A;                    /* Titles, body text, field values */
  --cp-text-secondary: #334155;                  /* Field labels, secondary info */
  --cp-text-tertiary: #64748B;                   /* Placeholders, timestamps, breadcrumbs */
  --cp-text-muted: #94A3B8;                      /* Disabled text, hints */
  --cp-text-inverse: #FFFFFF;                    /* Text on dark/brand backgrounds */
  --cp-text-link: var(--cp-primary-60);          /* Links */
  --cp-text-link-hover: var(--cp-primary-70);    /* Link hover */

  /* ─── BORDERS ─── */
  --cp-border-subtle: rgba(15, 23, 42, 0.06);   /* Row dividers (NEW: rgba from Jira) */
  --cp-border-default: rgba(15, 23, 42, 0.12);  /* Standard borders (NEW: rgba) */
  --cp-border-strong: rgba(15, 23, 42, 0.20);   /* Emphasized borders */
  --cp-border-interactive: var(--cp-primary-60); /* Focus, active input borders */
  --cp-border-selected: var(--cp-primary-60);    /* Selected state borders */

  /* ─── INTERACTIVE STATE OVERLAYS (NEW in V12 — Jira-inspired) ─── */
  --cp-interact-hover: rgba(15, 23, 42, 0.04);       /* Hover overlay */
  --cp-interact-press: rgba(15, 23, 42, 0.08);       /* Press/active overlay */
  --cp-interact-selected: rgba(37, 99, 235, 0.08);   /* Selected row/item bg */
  --cp-interact-selected-hover: rgba(37, 99, 235, 0.12); /* Selected + hover */
  --cp-interact-selected-press: rgba(37, 99, 235, 0.16); /* Selected + press */

  /* ─── TOOLBAR BUTTON OVERLAYS (NEW in V12) ─── */
  --cp-toolbar-bg: rgba(15, 23, 42, 0.05);           /* Toolbar button resting */
  --cp-toolbar-bg-hover: rgba(15, 23, 42, 0.10);     /* Toolbar button hover */
  --cp-toolbar-bg-press: rgba(15, 23, 42, 0.16);     /* Toolbar button press */
  --cp-toolbar-bg-active: rgba(37, 99, 235, 0.10);   /* Toolbar button active/selected */

  /* ─── INPUT STATES (NEW in V12) ─── */
  --cp-input-bg: #FFFFFF;
  --cp-input-bg-hover: #F8FAFC;
  --cp-input-bg-focus: #FFFFFF;
  --cp-input-border: rgba(15, 23, 42, 0.14);
  --cp-input-border-hover: rgba(15, 23, 42, 0.22);
  --cp-input-border-focus: var(--cp-primary-60);

  /* ─── FOCUS ─── */
  --cp-focus-ring: var(--cp-primary-60);
  --cp-focus-ring-offset: 2px;
  --cp-focus-ring-width: 2px;                         /* V12: 2px (was 3px in V11) */
  --cp-focus-ring-alpha: rgba(37, 99, 235, 0.18);

  /* ─── SHADOWS ─── */
  --cp-shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.04);
  --cp-shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.04);
  --cp-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.04);
  --cp-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04);
  --cp-shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.03);
  --cp-shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.2);
  --cp-shadow-overlay: 0px 8px 12px rgba(30, 31, 33, 0.15), 0px 0px 1px rgba(30, 31, 33, 0.31);
  --cp-shadow-focus: 0 0 0 var(--cp-focus-ring-width) var(--cp-focus-ring-alpha);

  /* ═══════════════════════════════════════════════════════════════
     SPACING SYSTEM — 8px Base Grid
     ═══════════════════════════════════════════════════════════════ */

  --cp-space-0: 0;
  --cp-space-025: 2px;        /* 0.25 × 8px — Micro gap */
  --cp-space-05: 4px;         /* 0.5 × 8px — Minimal */
  --cp-space-1: 8px;          /* 1.0 × 8px — Base unit */
  --cp-space-1h: 12px;        /* 1.5 × 8px — Comfortable */
  --cp-space-2: 16px;         /* 2.0 × 8px — Standard */
  --cp-space-2h: 20px;        /* 2.5 × 8px — Button padding */
  --cp-space-3: 24px;         /* 3.0 × 8px — Card padding */
  --cp-space-4: 32px;         /* 4.0 × 8px — Section gap */
  --cp-space-5: 40px;         /* 5.0 × 8px — Large gap */
  --cp-space-6: 48px;         /* 6.0 × 8px — Page padding */
  --cp-space-8: 64px;         /* 8.0 × 8px — Hero */
  --cp-space-10: 80px;        /* 10.0 × 8px — Maximum */

  /* ═══════════════════════════════════════════════════════════════
     TYPOGRAPHY
     ═══════════════════════════════════════════════════════════════ */

  /* Font Families */
  --cp-font-heading: 'Sora', -apple-system, 'Segoe UI', system-ui, sans-serif;
  --cp-font-body: 'Inter', -apple-system, 'Segoe UI', system-ui, sans-serif;
  --cp-font-mono: 'JetBrains Mono', 'SF Mono', 'Consolas', monospace;

  /* Productive Type Scale (UI) */
  --cp-type-caption: 11px;         /* Micro labels, lozenge text */
  --cp-type-caption-md: 12px;      /* Table headers, sidebar section labels */
  --cp-type-body-sm: 13px;         /* Dense UI, table cells, compact text */
  --cp-type-body: 14px;            /* Standard body, field labels, field values */
  --cp-type-body-lg: 16px;         /* Emphasized paragraphs */
  --cp-type-heading-xs: 18px;      /* Card titles, widget headers */
  --cp-type-heading-sm: 20px;      /* Page subtitles, section headings */
  --cp-type-heading-md: 24px;      /* Page sections */
  --cp-type-heading-lg: 28px;      /* Page titles */
  --cp-type-heading-xl: 32px;      /* Hero headings */
  --cp-type-display: 40px;         /* Display text */

  /* Line Heights */
  --cp-leading-none: 1;
  --cp-leading-tight: 1.2;        /* Headings */
  --cp-leading-snug: 1.35;        /* Subheadings, card titles */
  --cp-leading-normal: 1.5;       /* Body text, UI elements */
  --cp-leading-relaxed: 1.6;      /* Long-form content */

  /* Font Weights (V12: Optically Calibrated) */
  --cp-weight-regular: 400;
  --cp-weight-medium: 500;
  --cp-weight-semibold: 600;
  --cp-weight-bold: 650;           /* V12: Jira-inspired optical bold (was 700) */
  --cp-weight-extrabold: 700;      /* V12: Reserved for display/hero only */

  /* Letter Spacing */
  --cp-tracking-tight: -0.02em;
  --cp-tracking-normal: 0;
  --cp-tracking-wide: 0.04em;      /* V12: Tighter than V11's 0.05em */
  --cp-tracking-widest: 0.06em;    /* Table headers, section labels */

  /* ═══════════════════════════════════════════════════════════════
     COMPONENT SIZING
     ═══════════════════════════════════════════════════════════════ */

  /* Row & Cell Density */
  --cp-size-table-row: 36px;       /* Bloomberg density — kept from V11 */
  --cp-size-table-row-compact: 32px;
  --cp-size-table-cell-px: 8px;    /* V12: Cell vertical padding (was 12px) */
  --cp-size-table-cell-py: 12px;   /* V12: Cell horizontal padding (was 16px) */
  --cp-size-table-header-px: 10px; /* V12: Header vertical padding */
  --cp-size-table-header-py: 12px; /* V12: Header horizontal padding */

  /* Buttons */
  --cp-size-button: 36px;          /* V12: Standard button (was 40px) */
  --cp-size-button-sm: 28px;       /* V12: Small/toolbar button (was 32px) */
  --cp-size-button-lg: 44px;       /* Touch-target CTA */

  /* Inputs */
  --cp-size-input: 36px;           /* V12: Standard input (was 40px) */
  --cp-size-input-sm: 32px;
  --cp-size-input-lg: 44px;        /* Touch target */

  /* Icons */
  --cp-size-icon-sm: 16px;
  --cp-size-icon: 20px;
  --cp-size-icon-lg: 24px;

  /* Avatars */
  --cp-size-avatar-xs: 20px;
  --cp-size-avatar-sm: 24px;       /* Table cells, detail fields */
  --cp-size-avatar: 28px;          /* V12: Standard (was 30px) */
  --cp-size-avatar-lg: 32px;       /* Comments, profiles */
  --cp-size-avatar-xl: 40px;       /* Profile cards */

  /* ═══════════════════════════════════════════════════════════════
     BORDER RADIUS
     ═══════════════════════════════════════════════════════════════ */

  --cp-radius-none: 0;
  --cp-radius-sm: 3px;             /* V12: Lozenges, mini elements (Jira-aligned) */
  --cp-radius-md: 4px;             /* V12: Inputs, table containers (was 6px) */
  --cp-radius-default: 6px;        /* Buttons, cards, standard elements */
  --cp-radius-lg: 8px;             /* Large cards, panels */
  --cp-radius-xl: 12px;            /* Modals, large panels */
  --cp-radius-full: 9999px;        /* Pills, badges, avatars */

  /* ═══════════════════════════════════════════════════════════════
     ANIMATION
     ═══════════════════════════════════════════════════════════════ */

  --cp-duration-instant: 80ms;      /* V12: Faster for data interactions */
  --cp-duration-fast: 120ms;        /* V12: Hover states */
  --cp-duration-normal: 200ms;      /* V12: Standard transitions */
  --cp-duration-slow: 300ms;        /* Modals, panels */

  --cp-easing-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --cp-easing-enter: cubic-bezier(0, 0, 0.2, 1);
  --cp-easing-exit: cubic-bezier(0.4, 0, 1, 1);

  /* ═══════════════════════════════════════════════════════════════
     Z-INDEX
     ═══════════════════════════════════════════════════════════════ */

  --cp-z-base: 0;
  --cp-z-sticky-header: 10;
  --cp-z-dropdown: 1000;
  --cp-z-sticky: 1100;
  --cp-z-fixed: 1200;
  --cp-z-modal-backdrop: 1300;
  --cp-z-modal: 1400;
  --cp-z-popover: 1500;
  --cp-z-tooltip: 1600;
  --cp-z-toast: 1700;

  /* ═══════════════════════════════════════════════════════════════
     LAYOUT
     ═══════════════════════════════════════════════════════════════ */

  --cp-layout-sidebar: 232px;      /* V12: Wider for Arabic (was 220px) */
  --cp-layout-sidebar-collapsed: 56px;
  --cp-layout-topnav: 48px;
  --cp-layout-max-width: 1440px;
  --cp-layout-detail-panel: 280px;

  /* ═══════════════════════════════════════════════════════════════
     STATUS LOZENGE GUARDRAIL (IMMUTABLE)
     ═══════════════════════════════════════════════════════════════ */

  --cp-lozenge-grey-bg: #DFE1E6;
  --cp-lozenge-grey-text: #253858;
  --cp-lozenge-blue-bg: #DEEBFF;
  --cp-lozenge-blue-text: #0747A6;
  --cp-lozenge-green-bg: #E3FCEF;
  --cp-lozenge-green-text: #006644;
}


/* ═══════════════════════════════════════════════════════════════
   DARK MODE
   ═══════════════════════════════════════════════════════════════ */

[data-theme="dark"] {
  --cp-bg-page: #0A0A0A;
  --cp-bg-surface: #141414;
  --cp-bg-sunken: #0A0A0A;
  --cp-bg-elevated: #1A1A1A;
  --cp-bg-overlay: rgba(0, 0, 0, 0.75);

  --cp-text-primary: #FAFAFA;
  --cp-text-secondary: #D4D4D4;
  --cp-text-tertiary: #A3A3A3;
  --cp-text-muted: #737373;
  --cp-text-link: var(--cp-primary-40);
  --cp-text-link-hover: var(--cp-primary-30);

  --cp-border-subtle: rgba(255, 255, 255, 0.06);
  --cp-border-default: rgba(255, 255, 255, 0.10);
  --cp-border-strong: rgba(255, 255, 255, 0.18);

  --cp-interact-hover: rgba(255, 255, 255, 0.04);
  --cp-interact-press: rgba(255, 255, 255, 0.08);
  --cp-interact-selected: rgba(37, 99, 235, 0.15);
  --cp-interact-selected-hover: rgba(37, 99, 235, 0.22);
  --cp-interact-selected-press: rgba(37, 99, 235, 0.30);

  --cp-toolbar-bg: rgba(255, 255, 255, 0.06);
  --cp-toolbar-bg-hover: rgba(255, 255, 255, 0.10);
  --cp-toolbar-bg-press: rgba(255, 255, 255, 0.16);
  --cp-toolbar-bg-active: rgba(37, 99, 235, 0.20);

  --cp-input-bg: #141414;
  --cp-input-bg-hover: #1A1A1A;
  --cp-input-bg-focus: #141414;
  --cp-input-border: rgba(255, 255, 255, 0.12);
  --cp-input-border-hover: rgba(255, 255, 255, 0.20);

  --cp-shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
  --cp-shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.4);
  --cp-shadow-overlay: 0px 8px 12px rgba(0, 0, 0, 0.5), 0px 0px 1px rgba(0, 0, 0, 0.6);

  --cp-lozenge-grey-bg: #3B3D42;
  --cp-lozenge-grey-text: #D4D4D4;
  --cp-lozenge-blue-bg: #1E3A5F;
  --cp-lozenge-blue-text: #93C5FD;
  --cp-lozenge-green-bg: #14532D;
  --cp-lozenge-green-text: #86EFAC;
}


/* ═══════════════════════════════════════════════════════════════
   DENSITY MODES
   ═══════════════════════════════════════════════════════════════ */

[data-density="compact"] {
  --cp-size-table-row: var(--cp-size-table-row-compact);
  --cp-size-table-cell-px: 6px;
  --cp-size-table-cell-py: 8px;
  --cp-size-button: 32px;
  --cp-size-input: 32px;
  --cp-space-2: 12px;
  --cp-space-3: 16px;
}
```

---

## 3. TYPOGRAPHY SYSTEM

### Font Loading

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=Inter:wght@400;500;600;650;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Typography Contract

| Element | Font | Size | Weight | Line-Height | Color | Tracking |
|---------|------|------|--------|-------------|-------|----------|
| Page title | Sora | 28px (heading-lg) | 700 | 1.2 | text-primary | -0.02em |
| Page subtitle | Inter | 13px (body-sm) | 400 | 1.5 | text-tertiary | 0 |
| Section heading | Sora | 18px (heading-xs) | 650 | 1.35 | text-primary | 0 |
| Card title | Sora | 16px (body-lg) | 650 | 1.35 | text-primary | 0 |
| Field label | Inter | 14px (body) | 500 | 1.5 | text-secondary | 0 |
| Field value | Inter | 14px (body) | 400 | 1.5 | text-primary | 0 |
| Table header | Inter | 11px (caption) | 650 | 1.2 | text-tertiary | 0.06em |
| Table cell | Inter | 13px (body-sm) | 400 | 1.2 | text-primary | 0 |
| Table ID cell | JetBrains Mono | 12px | 500 | 1 | text-link | 0 |
| Sidebar item | Inter | 13px (body-sm) | 400 | 1.5 | text-secondary | 0 |
| Sidebar section label | Inter | 11px (caption) | 650 | 1.2 | text-muted | 0.06em |
| Toolbar button | Inter | 13px (body-sm) | 500 | 1 | text-secondary | 0 |
| Status lozenge | Inter | 11px (caption) | 700 | 1 | lozenge-*-text | 0.03em |
| Nav link | Inter | 13px (body-sm) | 500 | 1 | text-secondary | 0 |
| Nav link active | Inter | 13px (body-sm) | 600 | 1 | primary-60 | 0 |
| Breadcrumb | Inter | 13px (body-sm) | 400 | 1.5 | text-tertiary | 0 |
| Timestamp | JetBrains Mono | 12px | 400 | 1.5 | text-tertiary | 0 |
| Badge count | Inter | 10px | 700 | 1 | inverse | 0 |
| Avatar initials | Inter | 10px | 600 | 1 | inverse | 0.02em |
| Date values | JetBrains Mono | 12px | 400 | 1 | text-secondary | 0 |

### V12 Typography Rules

1. **Sora** is ONLY for headings (page titles, section headings, card titles). Never for body text.
2. **Inter** is for ALL UI text (labels, values, buttons, navigation, badges).
3. **JetBrains Mono** is for ALL data text (IDs, dates, numbers, scores, code).
4. **650 weight** replaces 700 for all non-display text. 700 is reserved for page titles only.
5. **Uppercase** is ONLY for table headers and sidebar section labels. Never for buttons or badges.
6. **letter-spacing: 0.06em** accompanies all uppercase text. Never add tracking to mixed-case text.
7. **tabular-nums** is mandatory on all JetBrains Mono usage via `font-variant-numeric: tabular-nums`.

---

## 4. COLOR SYSTEM

### Text Hierarchy (4 Levels)

```
--cp-text-primary   (#0F172A)  → Titles, body, field values, names     — 13.5:1 on white
--cp-text-secondary (#334155)  → Field labels, toolbar, inactive tabs  — 9.0:1 on white
--cp-text-tertiary  (#64748B)  → Breadcrumbs, timestamps, placeholders — 5.2:1 on white
--cp-text-muted     (#94A3B8)  → Disabled, decoration, section labels  — 3.0:1 on white
```

### When to Use Each Level

- **Primary:** Any text the user MUST read (titles, data values, names, active content)
- **Secondary:** Text that provides context (labels, column headers in nav, toolbar text)
- **Tertiary:** Text that can be ignored (timestamps, breadcrumbs, helper text)
- **Muted:** Text that's decorative or disabled (section labels, placeholder hints, disabled actions)

### Semantic Status Colors

| Semantic | Fill Token | Text Token | Fill Hex | Text Hex |
|----------|-----------|------------|----------|----------|
| Success | --cp-success-10 | --cp-success-60 | #DCFCE7 | #16A34A |
| Warning | --cp-warning-10 | --cp-warning-60 | #FEF3C7 | #D97706 |
| Danger | --cp-danger-10 | --cp-danger-60 | #FEE2E2 | #DC2626 |
| Info | --cp-info-10 | --cp-info-60 | #E0F2FE | #0284C7 |
| Purple/AI | --cp-purple-10 | --cp-purple-60 | #EDE9FE | #7C3AED |

### Dual Token System (Preserved from V10)

For badges and type badges where fill and text colors must have independent contrast:

```css
/* Fill token (for backgrounds) */
background: var(--cp-teal-60);       /* #0D9488 */

/* Text token (for text on white backgrounds — darker for contrast) */
color: var(--cp-teal-text, #0A8277);
```

---

## 5. SPACING & DENSITY SYSTEM

### The V12 Density Contract

```
┌──────────────────────────────────────────────────────────────┐
│  COMFORTABLE (default)        │  COMPACT (power users)       │
├──────────────────────────────────────────────────────────────┤
│  Table row:     36px          │  Table row:     32px         │
│  Cell padding:  8px × 12px    │  Cell padding:  6px × 8px   │
│  Header pad:    10px × 12px   │  Header pad:    8px × 8px   │
│  Button:        36px          │  Button:        32px         │
│  Input:         36px          │  Input:         32px         │
│  Card padding:  24px          │  Card padding:  16px         │
│  Page padding:  24px × 28px   │  Page padding:  16px × 20px │
└──────────────────────────────────────────────────────────────┘
```

### Page Layout Spacing

```
┌─ Top Nav ─────────────────────────────── 48px height ────────┐
├─ Sidebar (232px) ─┬─ Main Content (flex: 1) ─────────────────┤
│                   │ ┌─ 24px top, 28px sides ────────────────┐│
│ 12px × 0 top pad  │ │ Page Title (Sora 28px/700)           ││
│ 8px item spacing   │ │ 4px gap                              ││
│ 16px section gap   │ │ Page Subtitle (Inter 13px/400)       ││
│                   │ │ 20px gap                              ││
│                   │ │ Toolbar (8px gap between items)       ││
│                   │ │ 12px gap                              ││
│                   │ │ Filter Tabs                            ││
│                   │ │ 12px gap                              ││
│                   │ │ Type Legend                             ││
│                   │ │ 8px gap                               ││
│                   │ │ Table Container                        ││
│                   │ └────────────────────────────────────────┘│
└───────────────────┴──────────────────────────────────────────┘
```

---

## 6. SURFACE & ELEVATION ARCHITECTURE

### V12 Surface Stack

```
ELEVATION 0 (Sunken)    #F1F5F9     → Table headers, nested panels
ELEVATION 1 (Page)      #FFFFFF     → Page background, table rows, sidebar
ELEVATION 2 (Surface)   #F8FAFC     → Cards, panel headers, filter bg
ELEVATION 3 (Elevated)  #FFFFFF     → Modals, dropdowns, popovers (+ shadow-overlay)
```

### Shadow Usage Rules

| Element | Shadow | Reasoning |
|---------|--------|-----------|
| Table container | NONE | V12 change — border alone defines boundary |
| Cards | shadow-xs | Barely perceptible lift |
| Modals | shadow-overlay | Must clearly float above page |
| Dropdowns | shadow-overlay | Same as modals |
| Tooltips | shadow-md | Medium lift |
| Popovers | shadow-lg | Strong lift |
| Primary buttons | `0 2px 8px rgba(37,99,235,0.15)` | Brand shadow |

---

## 7. BORDER SYSTEM

### V12 Border Contract

```css
/* ROW DIVIDERS — barely visible, content-first */
border-bottom: 0.75px solid var(--cp-border-subtle);     /* rgba(15,23,42,0.06) */

/* STANDARD BORDERS — panels, inputs, containers */
border: 1px solid var(--cp-border-default);               /* rgba(15,23,42,0.12) */

/* EMPHASIS BORDERS — table header bottom, section dividers */
border-bottom: 1.5px solid var(--cp-border-default);

/* ACTIVE BORDERS — focused inputs, selected items */
border: 2px solid var(--cp-border-interactive);            /* #2563EB */

/* SIDEBAR SEPARATOR */
border-inline-end: 0.75px solid var(--cp-border-subtle);

/* ACTIVE TAB INDICATOR */
border-bottom: 2px solid var(--cp-primary-60);
```

### Border Radius Rules

| Element | Radius | Token |
|---------|--------|-------|
| Status lozenges | 3px | --cp-radius-sm |
| Table containers | 4px | --cp-radius-md |
| Inputs | 4px | --cp-radius-md |
| Buttons | 6px | --cp-radius-default |
| Cards | 6px | --cp-radius-default |
| Sidebar active item | 6px | --cp-radius-default |
| Modals | 12px | --cp-radius-xl |
| Badges/pills | 9999px | --cp-radius-full |
| Avatars | 9999px | --cp-radius-full |

---

## 8. INTERACTIVE STATES — 4-STATE MODEL

This is the **single most important V12 upgrade.** Every interactive element MUST define all 4 states.

### Table Rows

| State | Background | Text | Border |
|-------|-----------|------|--------|
| **Rest** | transparent | text-primary | border-subtle |
| **Hover** | var(--cp-interact-hover) | text-primary | border-subtle |
| **Selected** | var(--cp-interact-selected) | text-primary | border-subtle |
| **Pressed** | var(--cp-interact-press) | text-primary | border-subtle |
| **Selected+Hover** | var(--cp-interact-selected-hover) | text-primary | border-subtle |

### Toolbar Buttons

| State | Background | Text |
|-------|-----------|------|
| **Rest** | var(--cp-toolbar-bg) | text-secondary |
| **Hover** | var(--cp-toolbar-bg-hover) | text-primary |
| **Active** | var(--cp-toolbar-bg-active) | primary-60 |
| **Pressed** | var(--cp-toolbar-bg-press) | text-primary |

### Primary Buttons (CTA)

| State | Background | Text | Shadow |
|-------|-----------|------|--------|
| **Rest** | gradient(primary-60, primary-70) | inverse | brand shadow |
| **Hover** | gradient(primary-70, primary-80) | inverse | deeper shadow + translateY(-1px) |
| **Pressed** | primary-80 (flat) | inverse | no shadow |
| **Disabled** | opacity: 0.5 | inverse | no shadow |

### Inputs

| State | Background | Border |
|-------|-----------|--------|
| **Rest** | var(--cp-input-bg) | var(--cp-input-border) |
| **Hover** | var(--cp-input-bg-hover) | var(--cp-input-border-hover) |
| **Focus** | var(--cp-input-bg-focus) | var(--cp-input-border-focus) + shadow-focus |
| **Error** | var(--cp-input-bg) | var(--cp-danger-60) |
| **Disabled** | var(--cp-bg-sunken) | var(--cp-border-subtle) |

### Sidebar Items

| State | Background | Text |
|-------|-----------|------|
| **Rest** | transparent | text-secondary |
| **Hover** | var(--cp-interact-hover) | text-primary |
| **Active** | var(--cp-interact-selected) | primary-60 |
| **Active+Hover** | var(--cp-interact-selected-hover) | primary-60 |

---

## 9. COMPONENT LIBRARY

### StatusLozenge (GUARDRAIL — IMMUTABLE)

```css
.cp-lozenge {
  display: inline-flex;
  align-items: center;
  height: 20px;                                    /* V12: 20px (was 22px) */
  padding-inline: 6px;
  border-radius: var(--cp-radius-sm);              /* 3px */
  font-family: var(--cp-font-body);
  font-size: var(--cp-type-caption);               /* 11px */
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  line-height: 1;
  white-space: nowrap;
}

.cp-lozenge-grey {
  background: var(--cp-lozenge-grey-bg);
  color: var(--cp-lozenge-grey-text);
}

.cp-lozenge-blue {
  background: var(--cp-lozenge-blue-bg);
  color: var(--cp-lozenge-blue-text);
}

.cp-lozenge-green {
  background: var(--cp-lozenge-green-bg);
  color: var(--cp-lozenge-green-text);
}

/* NO OTHER LOZENGE COLORS PERMITTED */
```

### Table

```css
.cp-table-container {
  border: 1px solid var(--cp-border-default);
  border-radius: var(--cp-radius-md);              /* 4px */
  overflow: hidden;
  /* NO shadow — V12 change */
}

.cp-table {
  width: 100%;
  border-collapse: collapse;
}

.cp-table thead {
  background: var(--cp-bg-sunken);
  border-bottom: 1.5px solid var(--cp-border-default);
  position: sticky;
  top: 0;
  z-index: var(--cp-z-sticky-header);
}

.cp-table th {
  padding: var(--cp-size-table-header-px) var(--cp-size-table-header-py);
  text-align: start;
  font-family: var(--cp-font-body);
  font-size: var(--cp-type-caption);               /* 11px */
  font-weight: var(--cp-weight-bold);              /* 650 */
  text-transform: uppercase;
  letter-spacing: var(--cp-tracking-widest);        /* 0.06em */
  color: var(--cp-text-tertiary);
  white-space: nowrap;
  user-select: none;
}

.cp-table td {
  padding: var(--cp-size-table-cell-px) var(--cp-size-table-cell-py);
  font-size: var(--cp-type-body-sm);               /* 13px */
  color: var(--cp-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: var(--cp-leading-tight);
}

.cp-table tbody tr {
  height: var(--cp-size-table-row);                /* 36px */
  border-bottom: 0.75px solid var(--cp-border-subtle);
  transition: background var(--cp-duration-instant) var(--cp-easing-standard);
}

.cp-table tbody tr:hover {
  background: var(--cp-interact-hover);
}

.cp-table tbody tr[aria-selected="true"] {
  background: var(--cp-interact-selected);
}

.cp-table tbody tr[aria-selected="true"]:hover {
  background: var(--cp-interact-selected-hover);
}

.cp-table tbody tr:active {
  background: var(--cp-interact-press);
}

.cp-table tbody tr:last-child {
  border-bottom: none;
}

/* Monospace data cells */
.cp-table td[data-type="id"],
.cp-table td[data-type="date"],
.cp-table td[data-type="number"] {
  font-family: var(--cp-font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 12px;
}

.cp-table td[data-type="id"] {
  color: var(--cp-text-link);
  font-weight: 500;
  cursor: pointer;
}

.cp-table td[data-type="id"]:hover {
  text-decoration: underline;
}

.cp-table td[data-type="number"] {
  text-align: end;
}
```

### Buttons

```css
/* Base */
.cp-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--cp-space-05);
  height: var(--cp-size-button);
  padding-inline: var(--cp-space-2);
  font-family: var(--cp-font-body);
  font-size: var(--cp-type-body-sm);
  font-weight: var(--cp-weight-semibold);
  line-height: 1;
  border: none;
  border-radius: var(--cp-radius-default);
  cursor: pointer;
  transition: all var(--cp-duration-fast) var(--cp-easing-standard);
  white-space: nowrap;
  user-select: none;
}

.cp-btn:focus-visible {
  outline: var(--cp-focus-ring-width) solid var(--cp-focus-ring);
  outline-offset: var(--cp-focus-ring-offset);
}

.cp-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

/* Primary (CTA — gradient preserved) */
.cp-btn-primary {
  background: linear-gradient(135deg, var(--cp-primary-60), var(--cp-primary-70));
  color: var(--cp-text-inverse);
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.15);
}

.cp-btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--cp-primary-70), var(--cp-primary-80));
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(37, 99, 235, 0.22);
}

.cp-btn-primary:active:not(:disabled) {
  background: var(--cp-primary-80);
  transform: none;
  box-shadow: none;
}

/* Toolbar (V12: rgba overlay — NO border) */
.cp-btn-toolbar {
  height: var(--cp-size-button-sm);
  padding-inline: var(--cp-space-1h);
  background: var(--cp-toolbar-bg);
  color: var(--cp-text-secondary);
  border: none;
  border-radius: var(--cp-radius-md);
  font-size: var(--cp-type-body-sm);
  font-weight: var(--cp-weight-medium);
}

.cp-btn-toolbar:hover:not(:disabled) {
  background: var(--cp-toolbar-bg-hover);
  color: var(--cp-text-primary);
}

.cp-btn-toolbar:active:not(:disabled) {
  background: var(--cp-toolbar-bg-press);
}

.cp-btn-toolbar[aria-pressed="true"],
.cp-btn-toolbar.active {
  background: var(--cp-toolbar-bg-active);
  color: var(--cp-primary-60);
}

/* Outline */
.cp-btn-outline {
  background: transparent;
  color: var(--cp-text-secondary);
  border: 1px solid var(--cp-border-default);
}

.cp-btn-outline:hover:not(:disabled) {
  background: var(--cp-interact-hover);
  border-color: var(--cp-border-strong);
}

/* Ghost */
.cp-btn-ghost {
  background: transparent;
  color: var(--cp-text-secondary);
}

.cp-btn-ghost:hover:not(:disabled) {
  background: var(--cp-interact-hover);
}

/* Small */
.cp-btn-sm {
  height: var(--cp-size-button-sm);
  padding-inline: var(--cp-space-1h);
  font-size: var(--cp-type-caption-md);
}
```

### Sidebar

```css
.cp-sidebar {
  width: var(--cp-layout-sidebar);
  min-width: var(--cp-layout-sidebar);
  background: var(--cp-bg-page);
  border-inline-end: 0.75px solid var(--cp-border-subtle);
  overflow-y: auto;
  padding-block: var(--cp-space-1h);
}

.cp-sidebar-section-label {
  font-size: var(--cp-type-caption);
  font-weight: var(--cp-weight-bold);
  color: var(--cp-text-muted);
  text-transform: uppercase;
  letter-spacing: var(--cp-tracking-widest);
  padding: var(--cp-space-05) var(--cp-space-2) var(--cp-space-1);
}

.cp-sidebar-item {
  display: flex;
  align-items: center;
  gap: var(--cp-space-1);
  padding: 6px var(--cp-space-2);
  margin: 1px var(--cp-space-1);
  font-size: var(--cp-type-body-sm);
  font-weight: var(--cp-weight-regular);
  color: var(--cp-text-secondary);
  border-radius: var(--cp-radius-default);
  cursor: pointer;
  transition: all var(--cp-duration-instant) var(--cp-easing-standard);
}

.cp-sidebar-item:hover {
  background: var(--cp-interact-hover);
  color: var(--cp-text-primary);
}

.cp-sidebar-item[aria-current="page"],
.cp-sidebar-item.active {
  background: var(--cp-interact-selected);
  color: var(--cp-primary-60);
  font-weight: var(--cp-weight-semibold);
}

.cp-sidebar-item[aria-current="page"]:hover,
.cp-sidebar-item.active:hover {
  background: var(--cp-interact-selected-hover);
}
```

### Cards

```css
.cp-card {
  background: var(--cp-bg-elevated);
  border: 1px solid var(--cp-border-default);
  border-radius: var(--cp-radius-default);        /* 6px */
  overflow: hidden;
  box-shadow: var(--cp-shadow-xs);                /* Barely visible */
  transition: box-shadow var(--cp-duration-fast) var(--cp-easing-standard);
}

.cp-card:hover {
  box-shadow: var(--cp-shadow-sm);
}

.cp-card-header {
  padding: var(--cp-space-2) var(--cp-space-3);
  border-bottom: 0.75px solid var(--cp-border-subtle);
}

.cp-card-body {
  padding: var(--cp-space-3);
}

.cp-card-footer {
  padding: var(--cp-space-1h) var(--cp-space-3);
  border-top: 0.75px solid var(--cp-border-subtle);
  background: var(--cp-bg-sunken);
}
```

### Inputs

```css
.cp-input {
  width: 100%;
  height: var(--cp-size-input);
  padding-inline: var(--cp-space-1h);
  font-family: var(--cp-font-body);
  font-size: var(--cp-type-body);
  color: var(--cp-text-primary);
  background: var(--cp-input-bg);
  border: 1px solid var(--cp-input-border);
  border-radius: var(--cp-radius-md);              /* 4px */
  transition: all var(--cp-duration-fast) var(--cp-easing-standard);
  outline: none;
}

.cp-input::placeholder {
  color: var(--cp-text-tertiary);
}

.cp-input:hover {
  background: var(--cp-input-bg-hover);
  border-color: var(--cp-input-border-hover);
}

.cp-input:focus {
  background: var(--cp-input-bg-focus);
  border-color: var(--cp-input-border-focus);
  box-shadow: var(--cp-shadow-focus);
}

.cp-input[aria-invalid="true"] {
  border-color: var(--cp-danger-60);
}

.cp-input:disabled {
  background: var(--cp-bg-sunken);
  color: var(--cp-text-muted);
  cursor: not-allowed;
}
```

### Badges (Type Tags)

```css
.cp-type-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--cp-space-05);
  font-size: var(--cp-type-caption);
  font-weight: var(--cp-weight-medium);
  padding: 2px 8px;
  border-radius: var(--cp-radius-md);
}

.cp-type-enhancement { background: var(--cp-primary-5); color: var(--cp-primary-60); }
.cp-type-project { background: var(--cp-success-5); color: var(--cp-success-60); }
.cp-type-improvement { background: var(--cp-warning-5); color: var(--cp-warning-60); }
.cp-type-entity { background: var(--cp-purple-5); color: var(--cp-purple-60); }
```

### Tabs (Filter/Sub-navigation)

```css
.cp-tabs {
  display: flex;
  gap: 0;
  border-bottom: 0.75px solid var(--cp-border-subtle);
}

.cp-tab {
  padding: var(--cp-space-1) var(--cp-space-1h);
  font-family: var(--cp-font-body);
  font-size: var(--cp-type-body-sm);
  font-weight: var(--cp-weight-medium);
  color: var(--cp-text-tertiary);
  cursor: pointer;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -0.75px;
  background: none;
  transition: all var(--cp-duration-fast) var(--cp-easing-standard);
}

.cp-tab:hover {
  color: var(--cp-text-secondary);
}

.cp-tab[aria-selected="true"],
.cp-tab.active {
  color: var(--cp-primary-60);
  border-bottom-color: var(--cp-primary-60);
  font-weight: var(--cp-weight-semibold);
}

.cp-tab .cp-tab-badge {
  background: var(--cp-primary-60);
  color: var(--cp-text-inverse);
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: var(--cp-radius-full);
  margin-inline-start: var(--cp-space-05);
}
```

### Pagination

```css
.cp-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--cp-size-table-cell-px) var(--cp-size-table-cell-py);
  border-top: 0.75px solid var(--cp-border-subtle);
  font-size: var(--cp-type-caption-md);
  color: var(--cp-text-tertiary);
  background: var(--cp-bg-sunken);
}
```

---

## 10. LAYOUT PATTERNS

### Global Layout (All Pages)

```
┌─ Top Navigation Bar ──── 48px ── full width ── z-index: 1200 ────────┐
├─ Sidebar (232px) ─┬─ Main Content Area ──────────────────────────────┤
│  position: sticky  │  padding: 24px 28px                             │
│  top: 48px         │  overflow-y: auto                               │
│  height: calc(    │  max-width: none (fluid)                         │
│   100vh - 48px)   │                                                  │
│  overflow-y: auto  │  ┌─ Optional Detail Panel (280px) ─────────────┐│
│                   │  │  position: sticky                           ││
│                   │  │  border-inline-start: 0.75px solid subtle   ││
│                   │  └─────────────────────────────────────────────┘│
└───────────────────┴──────────────────────────────────────────────────┘
```

### Top Navigation

```css
.cp-topnav {
  height: var(--cp-layout-topnav);                 /* 48px */
  background: var(--cp-bg-page);
  border-bottom: 0.75px solid var(--cp-border-subtle);
  display: flex;
  align-items: center;
  padding-inline: var(--cp-space-2);
  position: sticky;
  top: 0;
  z-index: var(--cp-z-fixed);
}
```

### Required Navigation Chrome

Every Catalyst page MUST show this top navigation:

```
Home | StrategyHub | ProductHub | ProjectHub | ReleaseHub | TestHub | IncidentHub | TaskHub | PlanHub
```

Side navigation is contextual per Hub.

---

## 11. STATUS LOZENGE GUARDRAIL

**THIS SECTION IS IMMUTABLE. NO OVERRIDES PERMITTED.**

### The Rule

All status indicators across ALL Catalyst modules use EXACTLY 3 colors:

| Category | Background | Text | Usage |
|----------|-----------|------|-------|
| **Grey** (To-Do/Default) | #DFE1E6 | #253858 | New, Backlog, To Do, On Hold, Waiting |
| **Blue** (In-Progress) | #DEEBFF | #0747A6 | In Progress, In Review, Analysis, Active |
| **Green** (Done) | #E3FCEF | #006644 | Done, Approved, Completed, Resolved |

### Rendering Rules

- Height: 20px
- Font: 11px / 700 / uppercase / 0.03em tracking
- Border-radius: 3px
- No dots, no borders, no icons inside lozenges
- Padding: 0 6px

---

## 12. ACCESSIBILITY (WCAG AAA)

### Contrast Requirements (V12 Enforced)

| Combination | Ratio | AA | AAA |
|-------------|-------|----|----|
| text-primary on bg-page | 13.5:1 | ✅ | ✅ |
| text-secondary on bg-page | 9.0:1 | ✅ | ✅ |
| text-tertiary on bg-page | 5.2:1 | ✅ | ❌ (AA only) |
| text-primary on bg-sunken | 11.8:1 | ✅ | ✅ |
| text-tertiary on bg-sunken | 4.5:1 | ✅ | ❌ |
| lozenge-grey-text on lozenge-grey-bg | 8.5:1 | ✅ | ✅ |
| lozenge-blue-text on lozenge-blue-bg | 7.2:1 | ✅ | ✅ |
| lozenge-green-text on lozenge-green-bg | 6.4:1 | ✅ | ❌ |
| white on primary-60 (button) | 4.6:1 | ✅ | ❌ |

### Focus Management

- Focus ring: `2px solid var(--cp-focus-ring)` with `2px offset`
- All interactive elements must be focusable via Tab
- Enter/Space activates buttons and links
- Escape closes modals and dropdowns
- Arrow keys navigate within tab lists and radio groups

### ARIA Requirements

- All tables: `role="grid"` or semantic `<table>`
- Selected rows: `aria-selected="true"`
- Sortable columns: `aria-sort="ascending|descending|none"`
- Tabs: `role="tablist"` / `role="tab"` / `role="tabpanel"`
- Sidebar navigation: `role="navigation"` with `aria-label`
- Status lozenges: Include `aria-label` with full status text

---

## 13. DARK MODE

Enabled via `data-theme="dark"` on `<html>`.

All semantic tokens auto-switch. Components using semantic tokens require zero code changes.

**Rules:**
1. Never use raw color scale tokens in components — only semantic tokens
2. Test every page in both modes before shipping
3. Shadows get stronger in dark mode (higher opacity)
4. Borders shift from `rgba(15,23,42,*)` to `rgba(255,255,255,*)`

---

## 14. RTL SUPPORT

All CSS uses logical properties:

```css
/* ❌ NEVER */
margin-left: 16px;
padding-right: 12px;
border-left: 2px solid;
left: 0;
text-align: left;

/* ✅ ALWAYS */
margin-inline-start: var(--cp-space-2);
padding-inline-end: var(--cp-space-1h);
border-inline-start: 2px solid;
inset-inline-start: 0;
text-align: start;
```

Toggle via `dir="rtl"` on `<html>`.

---

## 15. PRINT STYLES

```css
@media print {
  :root {
    --cp-bg-page: white;
    --cp-text-primary: black;
    --cp-border-default: #999;
  }

  .cp-topnav, .cp-sidebar, .cp-btn, .cp-toolbar { display: none !important; }
  .cp-table-container { box-shadow: none; border: 1px solid black; }
  .cp-table tbody tr { height: auto; }
  .cp-card { box-shadow: none; border: 1px solid #999; }

  h1, h2, h3 { page-break-after: avoid; }
  tr { page-break-inside: avoid; }
}
```

---

## 16. QUALITY AUDIT CHECKLIST

### Agent 3B — V12 47-Point Check (Updated)

**Typography (12 checks)**
- [ ] Page title uses Sora font
- [ ] Body text uses Inter font
- [ ] Data text uses JetBrains Mono
- [ ] Bold weight is 650 (not 700) for non-display
- [ ] Table headers are 11px/uppercase/0.06em tracking
- [ ] No font below 11px
- [ ] Line heights match contract
- [ ] No orphan text weights (every weight is intentional)
- [ ] tabular-nums on all mono text
- [ ] No uppercase on buttons or badges (only headers/labels)
- [ ] Letter spacing only on uppercase text
- [ ] Heading hierarchy maintained (no skipped levels)

**Color & Contrast (10 checks)**
- [ ] All text meets AA (4.5:1 minimum)
- [ ] Primary/secondary text meets AAA (7:1)
- [ ] No hardcoded hex values in components
- [ ] Only semantic tokens used
- [ ] Status lozenges use 3-color guardrail only
- [ ] Dual tokens used where needed
- [ ] Dark mode renders correctly
- [ ] Hover states use rgba overlays (not color swaps)
- [ ] Selected states use blue-tinted rgba
- [ ] Links are primary-60 (not custom blue)

**Spacing & Layout (10 checks)**
- [ ] 8px grid alignment (4px sub-grid OK)
- [ ] Table rows are 36px
- [ ] Cell padding is 8px × 12px
- [ ] Page padding is 24px × 28px
- [ ] Sidebar is 232px
- [ ] Top nav is 48px
- [ ] No spacing below 2px
- [ ] Consistent gap tokens throughout
- [ ] RTL-safe logical properties
- [ ] No fixed widths on fluid content

**Interactive (8 checks)**
- [ ] All 4 states defined (rest/hover/select/press)
- [ ] Focus ring visible on all interactive elements
- [ ] Tab navigation works in correct order
- [ ] Escape closes modals/dropdowns
- [ ] Cursor: pointer on all clickables
- [ ] Disabled states have opacity 0.5 + not-allowed
- [ ] Transitions use V12 duration tokens
- [ ] No state uses color-only differentiation

**Components (7 checks)**
- [ ] Table container has no shadow (border only)
- [ ] Row dividers are 0.75px
- [ ] Sidebar separator is 0.75px
- [ ] Buttons use V12 height tokens
- [ ] Modals have shadow-overlay
- [ ] Cards have shadow-xs
- [ ] Toolbar buttons use rgba overlays

---

## 17. MIGRATION GUIDE (V11 → V12)

### Breaking Changes

| V11 Token/Value | V12 Replacement |
|-----------------|-----------------|
| `--cp-shadow-sm` on table containers | Remove shadow, keep border |
| `border-radius: 6px` on inputs | `border-radius: 4px` |
| `border-radius: 8px` on cards | `border-radius: 6px` |
| `border: 1px solid #E2E8F0` | `border: 1px solid rgba(15,23,42,0.12)` |
| `font-weight: 700` (body) | `font-weight: 650` |
| Row dividers `1px solid` | `0.75px solid var(--cp-border-subtle)` |
| Hover `background: #F8FAFC` | `background: var(--cp-interact-hover)` |
| Table cell padding `12px 16px` | `8px 12px` |
| Button height `40px` | `36px` |
| Input height `40px` | `36px` |
| Toolbar button with border | Toolbar button borderless (rgba bg) |

### Non-Breaking Enhancements

- New `--cp-interact-*` tokens (additive)
- New `--cp-toolbar-bg-*` tokens (additive)
- New `--cp-input-*` tokens (additive)
- Dark mode lozenge tokens added
- Compact density mode updated

---

**END OF CATALYST V12 HYBRID PRECISION DESIGN SYSTEM**

**Quality Target:** ≥9.5/10 (GOD-TIER)
**Version:** 12.0.0
**Last Updated:** March 2026
