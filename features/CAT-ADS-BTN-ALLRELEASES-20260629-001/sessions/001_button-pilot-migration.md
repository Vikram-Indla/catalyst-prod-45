# Session 001 — Button pilot migration

Date: 2026-06-29
Branch: fix/r360-status-pill-typography (pilot applied here)

## Plan
Migrate 10 shadcn buttons in all-releases → @atlaskit/button/new per 03_PLAN_LOCK.md.

## Karpathy loop
- Hypothesis: shadcn Button → ADS Button/IconButton is a clean swap; removes banned blue/primary Tailwind on buttons.
- Experiment: edit 4 files, swap imports + JSX, badges → @atlaskit/badge, selected → isSelected.
- Measure: tsc app project, lint:colors:gate, dark-mode screenshots, dropdown aria-expanded probe.

## Log
- (in progress)
