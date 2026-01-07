# Catalyst V5 Theme Enforcement

## VERSION: 5.0.0 | STATUS: CANONICAL

This document defines the **single source of truth** for Catalyst theme enforcement.

---

## CANONICAL PALETTE (Only these colors allowed)

| Role      | Token       | Hex       | Usage                            |
|-----------|-------------|-----------|----------------------------------|
| Primary   | --primary   | `#2563eb` | CTAs, links, focus, active       |
| Success   | --teal      | `#0d9488` | Success, available, positive     |
| Warning   | --warning   | `#d97706` | Caution, pending, alerts         |
| Danger    | --danger    | `#ef4444` | Error, destructive, critical     |

---

## 🚫 BANNED COLORS (Remove everywhere)

```
❌ #C69C6D (gold) - DEPRECATED
❌ #5C7C5C (olive green) - DEPRECATED  
❌ #8B7355 (bronze) - DEPRECATED
❌ #D4B896 (champagne) - DEPRECATED
❌ rgba(92,124,92,*) - DEPRECATED
❌ Any purple accent (purple-*, violet-*) - NOT IN V5
```

---

## SURFACE ELEVATION SYSTEM (Dark Mode)

| Token          | Hex       | Usage                              |
|----------------|-----------|-----------------------------------|
| --bg-base      | `#09090b` | App shell, deepest background      |
| --bg-subtle    | `#0f0f12` | Page background, main content area |
| --bg-surface   | `#18181b` | Cards, panels, sidebar             |
| --bg-elevated  | `#1f1f23` | Popovers, dropdowns, menus         |
| --bg-overlay   | `#27272a` | Modals, dialogs, command palette   |
| --bg-spotlight | `#2e2e33` | Tooltips, toasts, floating UI      |

---

## TEXT HIERARCHY (Only 3 tiers)

| Token       | Hex       | Contrast  | Usage                            |
|-------------|-----------|-----------|----------------------------------|
| --fg-default| `#fafafa` | 16.1:1    | Primary text, headings, values   |
| --fg-muted  | `#a1a1aa` | 6.8:1     | Secondary text, labels, metadata |
| --fg-subtle | `#71717a` | 4.2:1     | Placeholder, disabled, hints     |

---

## BORDER SYSTEM (Subtle only)

```css
--border-subtle:  rgba(255,255,255,0.06)  /* Card edges */
--border-default: rgba(255,255,255,0.10)  /* Dividers */
--border-strong:  rgba(255,255,255,0.15)  /* Focus states */
```

**NEVER** use white borders (`border-white`, `ring-white`) in dark mode.

---

## SEMANTIC COLOR USAGE RULES

### ✅ Correct Usage

```tsx
// Semantic colors ONLY for semantic meaning
<Badge variant="success">Passed</Badge>      // ✅ Teal for success state
<Badge variant="danger">Failed</Badge>       // ✅ Red for failure state  
<Badge variant="warning">Blocked</Badge>     // ✅ Orange for blocked state
<Button variant="primary">Submit</Button>    // ✅ Blue for primary action
```

### ❌ Incorrect Usage

```tsx
// DON'T use semantic colors for decoration
<div className="bg-purple-500">...</div>     // ❌ Purple not in V5
<div className="text-green-500">...</div>    // ❌ Use teal, not green
<div className="bg-gold-500">...</div>       // ❌ Gold is BANNED
```

---

## CHART COLORS

Charts use **neutral grayscale** for most series. Semantic colors ONLY when the series has semantic meaning:

| Series Type | Color    | Token                |
|-------------|----------|----------------------|
| Passed      | Teal     | `#0d9488`            |
| Failed      | Red      | `#ef4444`            |
| Blocked     | Orange   | `#d97706`            |
| In Progress | Blue     | `#2563eb`            |
| Default     | Neutral  | `rgba(255,255,255,0.72)` |

---

## ENFORCEMENT MECHANISMS

### 1. ESLint Rule (Recommended)

Add to `.eslintrc`:

```json
{
  "rules": {
    "no-restricted-syntax": [
      "error",
      {
        "selector": "Literal[value=/^#(C69C6D|5C7C5C|8B7355|D4B896)/i]",
        "message": "Banned color from deprecated Golden Hour palette. Use V5 tokens."
      }
    ]
  }
}
```

### 2. Tailwind Safelist (Allowed classes)

Only these color classes should be used:

```
bg-primary, text-primary
bg-teal-*, text-teal-*      (for success)
bg-red-*, text-red-*        (for danger)
bg-amber-*, text-amber-*    (for warning)
bg-blue-*, text-blue-*      (for info/primary)
bg-muted, text-muted-foreground
bg-card, bg-background
text-foreground
```

### 3. Pre-commit Hook

```bash
#!/bin/bash
# Check for banned colors
if grep -rn --include="*.tsx" --include="*.css" \
   -E "#(C69C6D|5C7C5C|8B7355|D4B896)|purple-|violet-" src/; then
  echo "ERROR: Banned colors detected. See docs/theme-enforcement.md"
  exit 1
fi
```

---

## WCAG TARGETS

| Element           | Minimum Contrast |
|-------------------|------------------|
| Primary text      | ≥7:1 (AAA)       |
| Secondary text    | ≥4.5:1 (AA)      |
| Muted text        | ≥3:1 (minimum)   |
| Interactive       | ≥4.5:1           |

---

## BENCHMARK

The final output must feel:
- **Bloomberg density** (structured, readable, high-signal)
- **Linear polish** (clean spacing + micro-states)
- **Notion warmth** (comfortable dark, not harsh)

---

## VERSION HISTORY

| Version | Date       | Changes                                    |
|---------|------------|--------------------------------------------|
| 5.0.0   | 2026-01-07 | Canonical V5 - Semantic colors enforced    |
