# CAT-AI-ADMIN-CONSOLE-DESIGN-HANDOFF-IMPLEMENTATION-20260627-001 — Karpathy Loop Log

> Karpathy Loop for Catalyst means Hypothesis → Experiment → Measure → Keep/Discard → Log.

---

## [LOOP-001] Canonical component viability

**Date:** 2026-06-27
**Phase:** Discovery
**Hypothesis:** All handoff @/components/ads imports resolve without changes.
**Experiment:** Canonical Component Discovery agent read Button, Lozenge, Textfield, Spinner, AdminGuard.
**Evidence:**
- Button: ✓ primary/default/subtle/danger, iconBefore/iconAfter
- Lozenge: ✓ success/moved/removed/inprogress/new/default, isBold
- Textfield: ✓ elemBeforeInput, 40px default / 32px compact (NOT 48px)
- Spinner: ✓ size="small"
- AdminGuard: ✓ at @/components/admin/AdminGuard
**Decision:** KEEP
**Reason:** Zero import changes needed for ADS components. Handoff is 100% compatible.
**Next step:** Proceed to drop in handoff files as-is for ADS imports.

---

## [LOOP-002] Raw `<input>` in AiCommandComposer

**Date:** 2026-06-27
**Phase:** Discovery
**Hypothesis:** Raw `<input>` in AiCommandComposer is a CLAUDE.md violation (hand-rolled UI ban).
**Experiment:** UI/UX Critic cross-checked CLAUDE.md banned list against the composer input element.
**Evidence:** CLAUDE.md bans tables, menus, dropdowns, modals, drawers, tabs, badges, lozenges, status pills, avatars, date fields, inline edit fields, rich text editors, tooltips, spinners, empty states, sidebars, navigation, permission matrices, action menus. Single `<input>` for AI command prompt not listed. Textfield API maxes at 40px; handoff needs 48px + 2px focus border transition not in Textfield API.
**Decision:** KEEP
**Reason:** Raw `<input>` is justified by unsatisfiable Textfield API constraints. Aria-label + keyboard handling = accessible.
**Next step:** Proceed with raw input in composer. Document in Plan Lock.

---

## [LOOP-003] Backend wiring in this PR

**Date:** 2026-06-27
**Phase:** Discovery
**Hypothesis:** useAiCommandConsole.ts hook can be wired to real edge function within this PR.
**Experiment:** Integration Architect audited edge function contract vs handoff expectations.
**Evidence:**
- Handoff expects: Phase 1 → {plan_id, plan}; Phase 2 → {plan_id, confirmed: true}
- Edge function current: Phase 1 → {type, text, plan}; Phase 2 → {action: 'execute', plan: ...}
- Gap: no plan_id, no server-side plan storage, no admin_audit_log table, no 409 conflict detection
- Bridging requires: edge function rewrite + new DB table migration
**Decision:** DISCARD
**Reason:** Data layer wiring is a separate PR scope. Ship UI with simulated hook (timers); avoids scope creep and edge function regression risk.
**Next step:** Note in Plan Lock non-scope. Create follow-up task for data-layer wiring.

---

## [LOOP-004] Import path renames

**Date:** 2026-06-27
**Phase:** Discovery
**Hypothesis:** Handoff files drop in verbatim with no import changes.
**Experiment:** Implementation Planner traced all relative imports across 10 handoff files.
**Evidence:** catalog.ts → renamed aiCommands.catalog.ts; types.ts → renamed aiAdminConsole.types.ts. Six consumer files use `from './catalog'` and `from './types'` — will break after rename.
**Decision:** KEEP with modification
**Reason:** File renames needed for repo naming conventions. All six consumer files need two import path edits each — mechanical, low risk.
**Next step:** In implementation, update imports before writing files.

---

## [LOOP-005] Old component cleanup scope

**Date:** 2026-06-27
**Phase:** Discovery
**Hypothesis:** All 10 old ai-assistant components should be deleted in this PR.
**Experiment:** Canonical Screen Discovery confirmed file inventory and external consumers.
**Evidence:** No tests. No external imports of old components found outside AiAccessPage. Route is lazy-loaded. useAdminAiAssistant.ts imported only by current AiAccessPage (being replaced).
**Decision:** KEEP (delete all old files)
**Reason:** No consumers, no tests, no risk. Clean slate.
**Next step:** DELETE: AiActionPlanPanel, AiAdminStatsStrip, AiCommandHeader, AiCommandLibrary, AiConversationTimeline, AiConfirmationModal, AiExecutionProgress, AiRecentActions, aiAdminAssistant.types.ts. KEEP: useAdminAiAssistant.ts (no harm, avoid unknown-consumer risk).

---

## [LOOP-006] Module access commands executability

**Date:** 2026-06-27
**Phase:** Discovery
**Hypothesis:** "Module access" catalog commands are fully executable via edge function.
**Experiment:** Data/Safety Guard checked admin_role_module_permissions RLS + edge function capabilities.
**Evidence:** admin_role_module_permissions requires super_admin role. Edge function has admin role only. Module access action_types not in current edge function. user_permission_overrides table may not exist.
**Decision:** DISCARD
**Reason:** Module access commands are non-executable in this PR. Acceptable since hook runs simulated timers anyway (Loop 3 decision). Commands visible in library UI but produce simulated results.
**Next step:** Note in Plan Lock non-scope. Do NOT remove module access from catalog (visibility is fine).
