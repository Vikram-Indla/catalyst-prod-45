# Objective — CAT-FILTER001-20260630-001

## Goal
Canonical filter that works correctly across ALL consumers: BR backlog, Product backlog, Project backlog, TestHub, Kanban, Timeline.

## Done Looks Like
- [ ] Filter panel fixed width (480–520px), no full-stretch
- [ ] Status pills identical to home page canonical pills (StatusLozenge, bold appearance)
- [ ] Assignee populates with real users + UserAvatar
- [ ] Parent field hidden in BR/TestHub/Idea contexts
- [ ] Work type filtered to context-valid types only
- [ ] Advanced tab removed; Saved = 3rd tab
- [ ] "Give feedback" footer removed
- [ ] "Add field" removed — fixed context fields
- [ ] 8 rgba hex-fallback violations fixed
- [ ] Labels field added to all non-subtask work types and wired to filter
- [ ] FilterContext prop: 'business-request' | 'product' | 'project' | 'testhub'
- [ ] ADS token audit passes (npm run lint:colors:gate)

## Non-Scope
- JQL editor internals (keep as-is)
- Saved filters CRUD backend (keep existing useSavedFilters hook)
- Filter→URL sync (keep existing basicToJql.ts)
- Sprint/quarter filters (separate feature)
