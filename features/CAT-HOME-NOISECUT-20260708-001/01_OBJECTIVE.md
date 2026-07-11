# Objective

Cut visual noise on Home / For You to "calmer than Jira" without changing layout, data, or behavior —
subtraction only. Enforce two laws on this surface: **subtle-tier lozenges by default** (bold reserved
for critical/blocking) and **one red per viewport** (notifications bell pip keeps it at nav level;
CHG card keeps it at content level).

## Done means (slice 1)
- Grouped Assigned view renders zero per-row status lozenges; status appears once, in section headers.
- Sections are 3 category buckets (To do / In progress / On hold), sentence case, counts intact.
- Nav timer chip: neutral border/dot/text at rest ("CHG-1042 · 1 live change" style), no red, no pulse;
  CHG card unchanged (keeps red rail + live counter).
- Avatar presence ring: offline renders gray, not amber.
- Collapsed home rail: neutral icon tiles; active hub only gets brand tint; `#4A7FE0`/`#38BDF8` hexes gone.
- `npx tsc --noEmit` no new errors (baseline 183), color + ADS ratchet gates pass, baselines ratcheted
  DOWN where hexes were removed.
- Light + dark screenshots of Home on localhost:8080 live data accepted by Vikram.

## Non-goals
- No layout, spacing, or data changes. No token-layer (theme-tokens.css) surgery — post-demo track.
- No changes to other surfaces consuming shared components beyond what slice scope states.
- Changes 5–6 are slice 2, not this lock.
