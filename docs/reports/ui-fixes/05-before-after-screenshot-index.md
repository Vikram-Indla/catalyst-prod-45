# 05 — Before/After Evidence Index

> Per contract: DOM/CSS computed probes are the rigorous proof (screenshots corroborate). Contrast values are alpha-composited over the effective background and gated at WCAG 4.5:1 (normal text).

## P0 — Notification drawer title, dark mode (`/for-you`, drawer overlay)

| Element | Metric | BEFORE | AFTER | Gate |
|---|---|---|---|---|
| "Notifications" title | color | `rgba(206,206,217,0.07)` (`--ds-background-neutral`) | `rgb(206,207,210)` (`--ds-text`) | — |
| | font-size | 28px (`--ds-font-size-800`) | 17px (`--ds-font-size-500`) | §5.6 |
| | contrast vs `rgb(43,44,47)` | **≈1.1:1** (invisible) | **8.96:1** | ≥4.5 ✅ |
| "Only show unread" | contrast | 4.88:1 | 4.88:1 | ≥4.5 ✅ |
| "Direct" tab | contrast | 5.09:1 | 5.09:1 | ≥4.5 ✅ |
| "Watching" tab | contrast | 4.88:1 | 4.88:1 | ≥4.5 ✅ |
| "Older" section label | contrast | 4.88:1 | 4.88:1 | ≥4.5 ✅ |

**Method:** live probe on `http://localhost:8080/for-you`, dark mode (`html.dark`, `data-color-mode=dark`), authenticated. Alpha-composited contrast computed in-page. Before/after screenshots captured via Chrome MCP (dark drawer open).

**Result:** P0 resolved. Title readable, correctly sized; all header elements pass WCAG AA. No light-mode regression (fix uses `--ds-text`, the value light mode already used).

## Pending (this route not yet PASS)
`/for-you` remains **PENDING** in the matrix — full route acceptance also requires: row-level icon/avatar contrast, Watching-tab + empty state, keyboard/focus (incl. `DirectNotificationRow:175` `outline:none`), light-mode + RTL + 4 viewports, and functional smoke. Tracked for the post-checkpoint sweep.
