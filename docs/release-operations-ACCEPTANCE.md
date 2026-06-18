# Release Operations — Acceptance & Parity Report

Branch: `release-operations-rebuild-01` · Phases 1–18 · 2026-06-18
Source of truth: `Release/design-handoffs/release-operations/` (`14-acceptance-checklist.md`, `01-artifact-source.html`).

Legend: ✅ done · 🟡 partial (notes) · ⛔ deferred/not built · 📝 proposed (awaiting apply).

> **Verification basis:** ADS audit (`design-governance`) PASS on every touched UI file; `tsc` clean on every touched file; lifecycle unit tests pass (14/14). **Screenshot visual-diff parity vs `01-artifact-source.html` is NOT in this report** — it needs a live run (light/dark, mobile, open modals). Flagged below under Parity.

---

## Guardrails (hard fails if violated)
| Item | Status | Note |
|---|---|---|
| No new design system | ✅ | Reused JiraTable, StatusLozenge, @atlaskit/*, ads/Avatar, KanbanBoardShell |
| No new tokens; only `var(--*)` | ✅ | Enforced by ADS token scanner on every file |
| 3-colour status guardrail | ✅ | StatusLozenge; health/risk use severity tones (allowed) |
| Blue only for +Create/links/active-nav | ✅ | |
| All tables = JiraTable | ✅ | Releases, Changes, SOP Templates, Production Events, Freeze Windows |
| StatusLozenge / user picker / date picker | ✅ | @atlaskit/select + @atlaskit/datetime-picker |
| Light mode unchanged on baseline surfaces | 🟡 | Non-Release surfaces untouched; Release surfaces intentionally rebuilt off --cp |
| Dark mode renders correctly | 🟡 | All colours are ADS tokens (dark-aware); not explicitly DOM-probed |
| Top nav unchanged; rail extended (not forked) | ✅ | ReleaseHubSidebar relabelled in place |
| Incident Management fully absent | ✅ | No nav/route/flow added |

## Module shell
| Item | Status | Note |
|---|---|---|
| Sidebar relabelled + sections; Triage/Compare removed | ✅ | Phase 2 (§6 sections) |
| Routes wired; deep links; breadcrumbs | ✅ | Phases 2–17; detail back-links present |

## Surfaces
| Item | Status | Note |
|---|---|---|
| Overview (KPIs drill-down, Pending Approvals, prod events, AI risk) | 🟡 | Phase 3; AI risk summary lives on **release detail**, not Overview |
| Releases list (cols/filters/states) | 🟡 | Phase 4a; status filter + search; **faceted filters (product/health/env/type) deferred** |
| Create Release modal (fields + validation) | 🟡 | Phase 4b; required type/env/date validated. **Advanced rules deferred**: product-required, ≥1 BR unless hotfix, dup-key block, readiness policy, emergency reason+approver |
| Release detail (header, 9-step tracker, 8 tabs) | ✅ | Phase 5 (Overview/Scope/Readiness/Changes/Sign-offs/Release Notes/Production Events/Audit) |
| Change Records + Create/Map modal | 🟡 | Phase 7; **external-vs-Catalyst source toggle deferred** (all = catalyst) |
| Change detail + SOP execution table | 🟡 | Phase 8; tabs = Overview/SOP/Work items/Sign-offs/Activity. Spec's separate Implementation/Validation/Rollback/Linked-Releases tabs folded into Overview/SOP/Activity |
| SOP Templates + apply-to-change | ✅ | Phase 9 |
| Production Events list + detail + auto-gen | 🟡 | Phase 10; auto-gen on prod-release completion ✅; **jsonb snapshots not populated** (counts show —) |
| Calendar (lanes + conflict + click→detail) | ✅ | Phase 11 |
| Sign-off Queue (Approve/Reject) | 🟡 | Phase 12; aggregates **change** sign-offs (release-level sign-offs have no table) |
| Freeze Windows + create + conflict detection | ✅ | Phase 13 |
| Settings | 🟡 | Phase 14; **read-only reference** (editable config needs tables + consumer rewiring) |

## Lifecycles & rules
| Item | Status | Note |
|---|---|---|
| Release lifecycle enforced (9-stage + terminal) | ✅ | Phase 15 (`lifecycle.ts`), unit-tested |
| Change lifecycle enforced (9-stage + terminal) | ✅ | Phase 15, unit-tested |
| SOP step lifecycle (pending→…→done + blocked/skipped/failed) | 🟡 | Phase 8b status select; **transitions not guarded** (any→any) |
| Production release needs linked change to schedule/deploy | ✅ | Phase 15 |
| Change cannot schedule into a freeze window (same env) w/o override | ✅ | Phase 15 (emergency override exempt) |
| Release cannot schedule before required sign-offs | 🟡 | Approval gate is **change-level** (releases have no signoff table) |

## Traceability
| Item | Status | Note |
|---|---|---|
| Release full chain (product→BR→sprint→WI→tests→signoff→change→SOP→notes→prod→audit) | 🟡 | Scope/Changes/Sign-offs/Notes/Prod/Audit tabs exist; tests-link + full chain partial |
| Change full chain | 🟡 | Work items + sign-offs + SOP + activity present; deployment-metadata/rollback partial |
| Work-item Release & Change Traceability panel | 🟡 | Phase 16; shows linked changes + releases + status. **env/deployment-status/prod-event/post-deploy line not shown** |

## States, a11y, i18n
| Item | Status | Note |
|---|---|---|
| Interaction states (default/hover/…/empty/error) | 🟡 | loading/empty/error present; **permission-denied state + role-disabled buttons not built** |
| Permission matrix in UI **and** server | 🟡 | **RLS done** (Phase 1, user_roles pattern); **UI role-gating not built** (buttons not disabled by role) |
| Accessibility (`13`) | 🟡 | aria-labels on icon buttons; not formally contrast/keyboard probed |
| i18n (zero hardcoded strings, RTL) | ⛔ | Strings are hardcoded English throughout |
| Responsive (`09`) | 🟡 | Flex/grid layouts; not breakpoint-verified |

## Approval cycle, Notify & traceability (v3 priorities)
| Item | Status | Note |
|---|---|---|
| Approvers added on Create Change / Release | ✅ | Phase 7b (user picker + role) |
| Overview Pending Approvals: avatars + name + role + wait + Review | ✅ | Phase 3 + 12 |
| Approval window from Atlaskit; writes signoffs + audit | ✅ | Phase 12 (Approve/Reject + comment; never auto-approve) |
| Production item cannot schedule/deploy until approvers approve | ✅ | Phase 15 (change-level; emergency override exempt) |
| Notify list editable; notify on every transition + change creation | 🟡 | Notify list CRUD ✅ (Phase 5b); **fan-out trigger 📝 PROPOSED, not applied**; Caty-chat delivery deferred |
| change-number written into linked BR/work-item history; post-prod line | 🟡 | Traceability panel surfaces the linkage; **explicit history-label write deferred** |
| Status pills canonical solids, identical light/dark; Production green | ✅ | StatusLozenge / statusPalette |
| Top nav matches CatalystHeader; **no Ask Caty pill** | ✅ | Top nav untouched |

## AI
| Item | Status | Note |
|---|---|---|
| Input basis + output; regenerate/save; **never auto-approve/execute** | ✅ | Phase 17; Generate/Regenerate/Edit/Save on notes; advisory risk + missing-SOP. **Deterministic (no LLM)** — Gemini upgrade is a follow-up; Copy action not added |

## Parity
| Item | Status | Note |
|---|---|---|
| Visual parity report (screenshots vs artifact, deltas explained) | ⛔ | **Not produced** — needs a live run (desktop light/dark, mobile, open modal/drawer). This document is the *functional* acceptance report |

---

## Outstanding to reach full acceptance
1. **Apply** the notify trigger migration (`20260618130000`) — currently 📝 proposed.
2. Create Release advanced validation (product/BR/dup-key/readiness/emergency).
3. Faceted filters on Releases/Changes lists.
4. UI permission-gating (disable create/edit/approve by role) + permission-denied banner.
5. i18n string extraction + RTL.
6. Visual screenshot parity pass (light/dark/mobile) vs `01-artifact-source.html`.
7. Production-event jsonb snapshot capture on auto-gen.
8. Gemini-backed AI prose (risk summary / notes) via edge function; Caty-chat notify delivery.
9. Release-level sign-offs table (currently change-only); release scheduling gated on them.

## Tests
- `src/lib/release-ops/__tests__/lifecycle.test.ts` — 14 tests, all pass (transition validity: forward/back/skip-block/terminal/legacy-alias; stage definitions).
- Scheduling-guard + permission integration tests (DB-mocked) — not added (would need a supabase mock harness).
