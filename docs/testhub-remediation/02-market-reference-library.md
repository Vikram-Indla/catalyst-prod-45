# Test Hub External Research Archive — Excluded from Design Decisions

**Feature Work ID:** CAT-TESTHUB-REMEDIATION-20260711-001  
**Status:** ARCHIVED / NON-GOVERNING — excluded by owner direction on 2026-07-11  
**Date:** 2026-07-11

## Owner direction

Vikram directed that Test Hub must not take design influence from Mobbin or any
other external product. This document is retained only as an audit record of
previous research. It must not be cited to select a screen, layout, component,
interaction, or visual treatment. The authoritative source is now
`09-premium-testhub-design-direction.md`, backed by Catalyst canonicals, Atlaskit,
and ADS tokens.

## Historical evidence method

Mobbin screen and flow search became available in continuation session 005. Each
accepted reference below was inspected from its returned image. Metadata-only
results were not used. These references guide information hierarchy and
interaction sequencing; they do not authorize copying a foreign design system or
replacing Catalyst canonical components.

## Accepted references

| Capability | Mobbin evidence | Observed pattern | Catalyst adaptation | Do not copy |
|---|---|---|---|---|
| Repository and creation | [ElevenLabs — Tests](https://mobbin.com/screens/e935a058-10c5-4a2b-8850-c97d1c6a6720) | A dedicated Tests area uses a short explanation, search, sparse table, folder action, primary create action, row-level run action, and success flag. | Keep the Test Hub repository tree + JiraTable. Put active Test Space and scope above search; retain one primary Create case action; keep row actions secondary; use ADS Flag for completion. | ElevenLabs navigation, branding, raw table styling, or its limited case metadata. |
| Planning and readiness summary | [Jira — Project summary](https://mobbin.com/screens/52be3fa9-15b9-4c83-b6a8-c8e8538ec25f) | Identity and navigation precede compact health cards, status distribution, and recent activity; the page explains what each region represents. | Keep `ProjectDashboardPage`; show active Test Space, governed lifecycle counts, readiness/attention items, and recent audited activity. Every number must reconcile to lifecycle facts and link to its drill-down. | Decorative metrics, duplicated global navigation, or activity/counts that cannot reconcile. |
| Configure → run → result | [Vapi — Running a test flow](https://mobbin.com/flows/9d86eada-d3f8-40c2-ba98-e3b1163ce039) | A five-screen flow separates configuration from runs, exposes one Run Tests action, summarizes totals before detail, and lets a user expand a result into script, rubric, reasoning, and transcript evidence. | Separate Plan/Execution configuration from Cycle/Run history. On completion show a reconciled summary first, then expand into step results, actual result, evidence, defect lineage, and immutable case version. | Dark visual treatment, AI-specific tester/target model, score semantics, or hidden manual-test states. |
| Coverage triage | [Vanta — Tests: All](https://mobbin.com/screens/7b3e98c2-b1fd-4c66-b4f4-51fbbb0a346f) | The page begins with `OK` and `Needs attention`, then provides category counts, filters, owner assignment, status, deadlines, and remediation counts in one dense list. | Traceability and Reports should lead with reconciled covered/attention totals, make active filters visible, and provide accessible JiraTable drill-down with owner and remediation state. | Treating compliance tests as QA cases, card colors outside ADS tokens, or a summary that uses a different fact source from the list. |
| Roles and permissions | [Remote — Admins and Permissions](https://mobbin.com/screens/334c15f5-5f5f-42cb-8b54-f0209b5a0840) | Role definitions are primary; members are secondary. Each role explains its access boundary, user count, and management actions. | Preserve the Catalyst Roles → Permissions mental model. Show scope, role description, member count, and denied-state implications, while RLS/RPC enforcement remains authoritative. | Card implementation, direct user-to-permission assignment, or UI-only enforcement. |

## Resulting experience rules

1. Active Test Space and lifecycle position are visible before local controls.
2. Creation/configuration, execution, and retrospective are distinct stages.
3. One primary action exists per stage; bulk and row actions remain secondary.
4. Summary facts always reconcile to the drill-down dataset.
5. Attention states explain the reason, owner, and recovery action.
6. Run history expands from aggregate truth into immutable step-level evidence.
7. Roles define permissions; members inherit roles; the server enforces both.
8. Loading, empty, error, denied, archived, volume, offline, conflict, dark,
   responsive, and keyboard states are part of the design contract.

## Canonical implementation mapping

| Pattern | Catalyst/ADS implementation |
|---|---|
| Repository, coverage, permissions lists | `JiraTable` and existing cell factories |
| Page identity and scope | Existing Test Hub/Catalyst page header + approved Test Space selector |
| Status and attention | `CatalystStatusPill` / ADS Lozenge; token-owned color only |
| Primary/secondary actions | ADS Button through Catalyst wrappers |
| Row and bulk actions | ADS Dropdown Menu / existing JiraTable action factories |
| Success/failure feedback | ADS Flag and Inline Message |
| Progressive detail | Existing Catalyst detail shell/drawer/modal patterns |
| Activity and evidence | Existing activity/comments/evidence components, extended by adapter |

## Evidence boundary

These sources support the proposed hierarchy and interaction progression. They
do not prove Catalyst functionality, accessibility, data safety, or visual
parity. Those require current-route DOM probes, policy/RPC tests, browser
journeys, light/dark screenshots, and owner signoff after implementation.
