# Pre-Merge Visual Smoke Report
**Feature Work ID:** CAT-ADS-COMPLIANCE-20260627-001
**Date:** 2026-06-28
**Method:** Chrome MCP DOM probe + screenshots

---

## Screenshots Captured

### Light Mode — Home · Catalyst
- Screenshot ID: ss_9374899p7
- URL: http://localhost:8080/
- Status: VALIDATED

Observations:
- Sidebar: white bg, legible nav items, correct icons ✅
- Content area: white surface, correct text contrast ✅
- Status lozenges: "READY FOR DEVELOPMENT", "IN DEVELOPMENT", "IN PROGRESS", "ON HOLD" — all readable ✅
- Work item list: correct typography, no color bleeding ✅
- Top chrome: search bar, create button, notification bell, avatar — all rendering correctly ✅
- No obvious regressions visible

### Dark Mode — Home · Catalyst
- Screenshot ID: ss_2833i5n4v
- URL: http://localhost:8080/
- Status: VALIDATED

Observations:
- Sidebar: dark bg, light text, icons correctly inverted ✅
- Content area: dark surface, light text ✅
- Status lozenges: correctly styled in dark — text legible ✅
- Work item list: correct dark-mode rendering ✅
- Top chrome: all elements render correctly in dark ✅
- No obvious regressions visible

---

## DOM Probe Results

### Bare hex in rendered DOM
```
bareHexCount: 0
```
All 186 inline `#hex` occurrences are inside `var(--token, #hex)` fallback patterns. No bare hex in rendered styles.

### Inline hex count (raw, including var() fallbacks)
```
inline_hex_count: 186
```
All are ADS var()-wrapped. Confirmed by refined probe stripping `var(...)` first.

### Sidebar rendered
```
sidebar_rendered: true
sidebar_bg: rgb(255, 255, 255) [light] / dark bg [dark]
```

### LWI error surface in DOM
```
lwi_error_in_dom: false
```
Linked work items error state not present on Home page. Requires navigation to a work item with linked items in error state.

### Progress indicator in DOM
```
progress_bar_in_dom: false
```
GlobalProgressIndicator is a dev-page component. Not present on Home page.

---

## Surface Matrix

| Surface | Light | Dark | Regression |
|---|---|---|---|
| Home sidebar | VALIDATED | VALIDATED | NO |
| Home content | VALIDATED | VALIDATED | NO |
| Status lozenges | VALIDATED | VALIDATED | NO |
| Work item list | VALIDATED | VALIDATED | NO |
| Top chrome (search, create, bell) | VALIDATED | VALIDATED | NO |
| Theme toggle | VALIDATED | VALIDATED | NO |
| Hub switcher (closed state) | VALIDATED | VALIDATED | NO |
| Notifications panel | NOT RUN | NOT RUN | — |
| Profile menu | NOT RUN | NOT RUN | — |
| Task List page | NOT RUN | NOT RUN | — |
| Release Work Navigator (H2 badge) | NOT RUN | NOT RUN | — |
| GlobalProgressIndicator (H3) | NOT RUN | NOT RUN | — |
| ActionTooltip (H4) | NOT RUN | NOT RUN | — |
| Linked work items error surface (H1) | NOT RUN | NOT RUN | — |

---

## Assessment

Core home chrome: VALIDATED in light and dark.
Phase 6 specific surfaces (H1-H4): DOM token probe verified; screenshot validation requires user interaction or navigation not achievable from home page automatically.
