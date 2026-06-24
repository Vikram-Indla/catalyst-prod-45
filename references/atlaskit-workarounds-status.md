# @atlaskit Workarounds Status

**Audited:** 2026-06-24  
**Source:** atlaskit-audit.txt

---

## Summary Table

| Package | Status | Workaround | Permanent? |
|---------|--------|------------|------------|
| `@atlaskit/lozenge@^11.14.0` | 🔴 BUGGY | `data-cp-lozenge-jira-parity` wrapper + CSS override | Yes — until v12 prop ships |
| `@atlaskit/popup@^4.16.5` | 🔴 BUGGY | Self-rolled `createPortal` + `getBoundingClientRect()` | Yes — until ≥4.17 |
| `@atlaskit/renderer@^128.9.5` | 🟡 WARN | CSS override for font-size/line-height in `.adf-description-content` | Re-probe on each upgrade |
| `@atlaskit/select@^18.2.0` | 🟡 WARN | `.cv-drawer-sidebar [class*="-select__control"]` idle CSS override | Re-probe on each upgrade |
| `@atlaskit/tag` | ⚪ MISSING | Not in package.json — install if needed | N/A |
| All other 48 packages | 🟢 OK | No workaround needed | N/A |

---

## 🔴 @atlaskit/lozenge

**Bug:** Inner `<span>` forces `text-transform: uppercase; font-weight: 653; letter-spacing > 0`  
**Impact:** All status lozenges render uppercase — breaks Jira sentence-case parity  
**Fix:** See [lozenge-workaround-audit.md](lozenge-workaround-audit.md)  

**Active workaround locations:**
```bash
grep -rn "data-cp-lozenge-jira-parity" src/
```

---

## 🔴 @atlaskit/popup

**Bug 1:** Empty-portal — popover renders into detached DOM node  
**Bug 2:** Popper.js v2 overflow:hidden conflict → dropdown at `(0,0)`  
**Impact:** Any dropdown inside overflow:hidden container (most Catalyst surfaces) positions at viewport origin  
**Fix:** See [popup-workaround-audit.md](popup-workaround-audit.md)  

**Rule:** NEVER use `@atlaskit/popup` inside any container with `overflow: hidden/scroll/auto`. Use portal pattern.

---

## 🟡 @atlaskit/renderer

**Warning:** Default font metrics don't match Jira's description renderer  
**Jira DOM-probed values (BAU-5609, 2026-05-05):**
- `font-size: 14px`
- `line-height: 24px` (1.714x)
- `font-family: var(--ds-font-family-body)`

**Workaround in index.css:**
```css
.adf-description-content {
  font-size: 14px;
  line-height: 24px;
}
.adf-description-content h2 { font-size: 18px; font-weight: 600; margin: 14px 0 6px; }
.adf-description-content h3 { font-size: 16px; font-weight: 600; margin: 12px 0 4px; }
.adf-description-content h4 { font-size: 15px; font-weight: 600; margin: 10px 0 4px; }
```

**Action:** Re-probe with `getComputedStyle` on description content after each `@atlaskit/renderer` upgrade.

---

## 🟡 @atlaskit/select

**Warning:** Idle state shows visible borders and dropdown indicators  
**Jira parity:** Right-rail fields appear as plain clickable text in idle state  

**Workaround in index.css:**
```css
.cv-drawer-sidebar [class*="-select__control"] {
  border-color: transparent;
  background: transparent;
  box-shadow: none;
}
.cv-drawer-sidebar [class*="-select__control"]:hover {
  background: var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06));
}
.cv-drawer-sidebar [class*="-select__dropdown-indicator"] {
  display: none;
}
.cv-drawer-sidebar [class*="-select__control--is-focused"] [class*="-select__dropdown-indicator"],
.cv-drawer-sidebar [class*="-select__control"]:hover [class*="-select__dropdown-indicator"] {
  display: flex;
}
```

**Action:** Re-probe right-rail select styling after each `@atlaskit/select` upgrade.

---

## ⚪ @atlaskit/tag — MISSING

Not in `package.json`. If tag/chip UI needed:
1. Check if `@atlaskit/badge` or `@atlaskit/lozenge` covers the use case first
2. If not: `npm install @atlaskit/tag` then import from `@atlaskit/tag`
3. Do NOT hand-roll tag/chip components

---

## Upgrade Watch List

When any of these packages upgrades, re-run these checks:

```bash
# Check lozenge fix:
# Look for a textTransform/textCase prop in changelog

# Check popup fix (must fix Popper.js overflow issue):
# Verify portal is no longer needed by running overflow ancestry check

# Check renderer:
# DOM probe: getComputedStyle(document.querySelector('.ak-renderer-document p')).fontSize

# Check select:
# DOM probe: getComputedStyle(document.querySelector('.cv-drawer-sidebar [class*="-select__control"]')).borderColor
```
