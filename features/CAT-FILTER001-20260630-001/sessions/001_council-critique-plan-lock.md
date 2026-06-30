# Session 001 — Council + Design Critique + Plan Lock
**Date**: 2026-06-30  
**Branch**: main  

## What happened
- Council run on filter redesign request
- 3 parallel discovery agents: hierarchy, filter consumers, status/avatar components
- Design critique: 14/30 (HALT)
- Home page status pills probed: StatusLozenge + bold ADS tokens
- Filter width identified: 720px (too wide — change to 520)
- Plan Lock written and approved

## Key findings
- Filter width: `CanonicalFilter.tsx:626` → `width: 720` (change to 520)
- Status mismatch: filter uses raw `@atlaskit/lozenge` (soft), home uses `StatusLozenge` (bold)
- Status render: `CanonicalFilter.tsx:3006`
- rgba violations: lines 631, 720, 886, 1003, 2089, 2457, 2514, 2630
- Advanced tab: `CanonicalFilter.tsx:660` — `['basic', 'advanced', 'jql']`
- Assignee broken: `CanonicalFilter.tsx:3013` — uses `<img src={a.avatarUrl}>` and 0 options fed

## Next session
Start with Slice A (width + rgba) → B (StatusLozenge) → C (remove Advanced/add Saved tab)
