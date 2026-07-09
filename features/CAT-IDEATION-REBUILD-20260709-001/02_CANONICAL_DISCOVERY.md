# Canonical Discovery — pointer

Full discovery lives in `features/CAT-IDEATION-DISCOVERY-20260709-001/` (6 parallel discovery lanes + 6-product benchmark + Mobbin MCP pass). Key canonical selections:

| Need | Canonical choice | Evidence |
|---|---|---|
| Table | JiraTable (+cells/editors/ColumnHeaderMenu) | src/components/shared/JiraTable/ |
| Board (funnel toggle) | PragmaticBoard family | src/components/kanban/ |
| Detail layout | CatalystViewBase + ActivityPanel | src/components/catalyst-detail-views/shared/, catalyst-ds/activity/ |
| Rich text | EpicDescriptionEditor (ADF) | src/components/shared/rich-text/atlaskit/ |
| Attachments | CatalystAttachmentsPanel | catalyst-detail-views/shared/sections/ |
| Modals/confirm | Atlaskit ModalDialog + Confirm* family | catalyst-detail-views/shared/ |
| Similar items | LinkSimilarItemsDialog pattern + ai-similar-items fn | catalyst-detail-views/improve/ |
| Scoring editor UX | WSJFScoringModal interaction pattern | src/components/prioritization/ |
| Widgets | WidgetShell + MetricCard | product-dashboard/, dashboard/ |
| Charts | recharts ^3.5.1 (already a dependency — package.json) | resolved 2026-07-09 |
| Icons | @atlaskit/icon/core/lightbulb (+filled); hub SVGs icons.registry.ts:371-392 | verified installed |
| Shell seats | HubSwitcher.tsx:72 (repoint), CatalystShell.tsx:127-130,242, sidebar config swap | verified |
| Workflow | ph_wf_* runtime + guard registry | src/lib/workflow/canonical/runtime.ts |
| Notifications | trigger service + schemes | src/services/notificationTriggerService.ts |
| AI gateway | supabase/functions/_shared/llm.ts (+ ai_usage_log) | verified |
| Voice / docs | voice-flow + voice-transcribe; docintel pipeline | verified |
| BR terminal event | precedent: track_epic_process_step_change() trigger (20251211141446 migration:1401,11918) + useWorkItemRealtime.ts | resolved 2026-07-09 |

New components requiring approval (no canonical exists): vote-with-importance control, AI suggestion card, portfolio field chart (recharts), guard checklist, phone card-list. Approval = Plan Lock D-item.
