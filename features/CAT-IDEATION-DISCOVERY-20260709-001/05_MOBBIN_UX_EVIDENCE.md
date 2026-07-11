# IDEATION — MOBBIN UX EVIDENCE ADDENDUM (Design Pack v2.1 — true Mobbin MCP)

> Upgrades `04_ELITE_DESIGN_BLUEPRINT.md` with **Mobbin MCP evidence** (connected and used 2026-07-09; screens image-verified through `mobbin.search_screens`, not metadata-inferred). Supersedes the v2.0 web-fallback version of this file entirely.
> **Rule honored**: Mobbin informs UX only; Catalyst design system (ADS tokens + canonical components) governs final UI.

---

## 0. EVIDENCE QUALITY + CORRECTIONS TO v2.0

All rows below are grade **mobbin-mcp (image-verified)** — the actual screen renders were examined. The prior web-fallback pass under-claimed in three places, now corrected:

| v2.0 claim (web fallback) | v2.1 finding (MCP, image-verified) |
|---|---|
| "Merge preview: no credible Mobbin evidence" | **Found**: Salesforce *Compare Leads* field-by-field merge + folk *Duplicates* side-by-side cards |
| "Prioritization scatter: not catalogued" | **Found**: TheyDo *Opportunities Matrix* — value/effort scatter with **configurable axis dropdowns** |
| "Canny absent from Mobbin" | **Found**: 3 Canny screens (roadmap table w/ votes+impact+score columns, public status board, upvote list) |

Still honest limits: Jira/Atlassian not re-queried via MCP (in-repo ForYouPage precedent governs the home surface regardless); Featurebase/Frill/Sleekplan not re-queried (Canny now covers the feedback-tool class); versioned-config publish UX still has **no reference found anywhere** — remains declared novel.

---

## C. MOBBIN EVIDENCE BOARD (image-verified)

| # | Target screen (04 §C) | App · screen | Pattern seen in image | Mobbin URL | Catalyst adaptation | Avoid |
|---|---|---|---|---|---|---|
| 1 | C.1 Inbox | **Intercom** · inbox workspace | 4-pane: nav → inbox list w/ counts → conversation → details rail **with "Details / Copilot" tabs**; unassigned/mentions queues | mobbin.com/screens/d4d6efaf-d387-4211-9bdf-1c207d1f2714 | Copy the queue-list-with-counts + preview structure (JiraTable compact + pane); **adopt the Details/Copilot rail-tab idea on Idea Detail (see C.5 note)** | 4 panes exceed our width budget — Inbox stays 2-pane (sidebar counts cover the queue-nav role) |
| 1 | C.1 Inbox | Givingli · inbox | Minimal 2-pane split (list + preview) | mobbin.com/screens/17d1e6c9-66db-464a-bb1f-19b076c63b76 | Confirms 2-pane sufficiency for our volume | Consumer-thin metadata — keep our key/age/votes columns |
| 2 | C.2 Explore | **Deel** · People table | Filter-chip row above table + "Customize columns" checklist panel | mobbin.com/screens/6acab441-2244-43e6-a6f8-e4215a179b0b | Copy chip row + column customizer → JiraTable ColumnHeaderMenu already provides the latter | 21-column sprawl; our default is 9 columns |
| 2 | C.2 Explore | Dovetail · Contacts table | Per-field visibility toggles; colored semantic chips in cells | mobbin.com/screens/832e5719-7133-4733-a7d2-87061364df60 | Chips-in-cells = our stage/class Lozenges (ADS-owned colors only) | Rainbow chip palette — semantic tokens only |
| 3 | C.3 Create modal | **Linear** · New Issue ×3 | Title-first modal; inline pickers (status/priority/assignee/project/date) as chips under title; **"Save as draft"**; **"Create more" toggle** | mobbin.com/screens/7d2d62c7-8fb9-40d8-bd36-f1a8ff0a860c · /ffa2e456-85c7-4005-b361-de79dc6b6dc7 · /34ddd604-d9f4-40b6-adbb-2a1a8df50c59 | Copy: title-first + inline class/product chips; **adopt Save-as-draft and "Create more" toggle** (workshop rapid capture) — both added to C.3 spec | Linear's picker chips are icon-dense; ours keep text labels (first-time submitters) |
| 4 | C.4 Detail | **Linear** · issue detail ×2 | Title+description center, Activity feed + comment box below, right rail Properties/Labels/Project | mobbin.com/screens/2e6c00de-40a7-455d-875f-0d8cb27c8270 · /cef36326-d8ec-4c6f-acd4-a9f1e1060d33 | Structural 1:1 with C.4 (CatalystViewBase + ActivityPanel + rail) — confirmed | Rail is sparse; ours carries scoring/community/linked-BR blocks — keep 32px rhythm to avoid clutter |
| 4 | C.4 Detail | ClickUp · task detail | Field grid top + right activity panel; inline "Ask Brain" AI affordance near title | mobbin.com/screens/f4c643f2-5fd0-4432-8c00-e4f9f4bebaac | Inline AI affordance validates AIIntelligenceButton placement at detail header | Field-grid-above-description buries the narrative; our problem statement stays top |
| 5 | C.5 AI Copilot | **Intercom** · details rail "Copilot" tab (same screen as C.1 row) | AI copilot as a *tab of the right rail*, peer to Details | mobbin.com/screens/d4d6efaf-d387-4211-9bdf-1c207d1f2714 | **Design refinement adopted**: on Idea Detail, AI Copilot renders as rail tab (Details \| Copilot ✦) instead of a separate overlay drawer — less chrome, persistent context. Drawer remains the pattern on Inbox preview (no rail there) | — |
| 5 | C.5 AI Copilot | Asana · AI panel | Right-side AI panel over content with grouped suggestion chips ("For you" / "Insights") + free-text ask box | mobbin.com/screens/f2b651ef-bce1-464c-9c47-52f2fb187238 | Grouped suggestion sections validate our card-stack grouping by kind (classification/duplicate/mapping/scores) | Chat-first framing; ours is suggestion-ledger-first, chat optional via Caty |
| 5 | C.5 AI Copilot | WRITER · agent home | "Agent can make mistakes. Monitor and verify results." persistent disclaimer line | mobbin.com/screens/c70f2089-3d3c-4b0a-aaa2-ae4a5145236e | Copy the persistent-disclaimer placement for our fixed disclosure string (04 §D microcopy) | — |
| 6 | C.6 Merge preview | **Salesforce** · Potential Duplicate Records → Compare leads | Step 1 select duplicates; Step 2 **field-by-field radio choice** of surviving value, "principal record" concept, explicit "relationships shifted to principal" copy | mobbin.com/screens/8b2f44e1-8d2a-454f-b9f1-08fc582eee8f · /5dc154a3-7f3d-4869-8a5d-1398d85fb0ca | Validates C.6 transfer-manifest; **per-field value selection recorded as P2 enhancement** (V1 = winner-takes + manifest) | 2-step modal-in-modal depth; ours is one preview modal |
| 6 | C.6 Merge preview | folk · Duplicates queue | Dedicated "Duplicates (1)" nav item; side-by-side cards + checkbox field pick + Merge/Don't merge | mobbin.com/screens/75065e3c-d49c-43fc-8705-fc5d622b140c | Copy "Don't merge" as an explicit recorded decision (feeds `duplicate_review_complete` guard) | Standalone duplicates page unneeded — Inbox surfaces them |
| 7 | C.7 Portfolio | **TheyDo** · Opportunities Matrix ×2 | Value/effort scatter; **Table \| Matrix toggle**; **axis dropdowns choosing among input scores (Customer Value / Business Value / Effort) and computed scores**; empty-state coaching text on blank matrix | mobbin.com/screens/58a50369-040c-4673-ac5f-255ced83d65a · /aec5549c-1143-4596-993c-f588464539e4 | Direct validation of C.7: configurable driver axes = our scoring-model drivers; adopt Table\|Matrix toggle (our Field\|Funnel); adopt empty-state coaching ("Add Value and Effort scores to place ideas") | Unquadranted free field — keep our labeled quadrants for decision semantics |
| 8 | C.8 Wizard | Remote · self-enrollment | "N tasks remaining · % complete" progress bar + gated task cards | mobbin.com/screens/156170a2-7331-438f-9a0a-e7eba294b489 | Validates guard-checklist-as-cards in wizard step 2 (green/red per guard) | KYC tone; ours stays 3 steps |
| 8 | C.8 Wizard | Apollo · setup checklist | Per-step Start/Completed states with expandable rows | mobbin.com/screens/09da790a-fc80-4bd0-b0cf-0bc5fcedc394 | Per-item state affordance for advisory vs blocking guards | — |
| 9 | C.9 Admin | ClickUp · Workspace Settings ×2 | Left-nav sectioned settings (People/Security/Task Types/…) + inline toggle rows + explicit Save | mobbin.com/screens/a762fff5-de8c-43d8-a52b-6503ff4349d7 · /6e4cfaf4-de25-4b00-84c8-563a7bfb77ee | Copy sectioned left-nav shell for `/admin/ideation`; "Task Types" section is the closest analog to our scoring-model section | Danger-zone placement inline with settings — ours isolates destructive ops |
| 9 | C.9 Admin | Notion · workspace settings modal | Settings as overlay modal with grouped nav + Danger zone | mobbin.com/screens/a2994b3a-67f5-4d8e-8405-aae846f36955 | Alternative form factor; we stay full-page per Catalyst admin precedent [pages/admin/] | Modal settings don't fit deep config (scoring drivers) |
| 10 | C.10 Widgets | Wix · dashboard | "Your key stats" metric cards + prioritized Activity feed ("Action Required" grouping) | mobbin.com/screens/25f77924-59a4-4abc-ab51-fee2c46b044e | "Action Required" grouping validates ForYou "Ideas waiting on you" section framing | Promo-banner noise |
| 10 | C.10 Widgets | Bonsai · dashboard | KPI row + tasks + right-rail chronological activity | mobbin.com/screens/34d0f00d-1ca1-4c73-b388-14b96f0b88a9 | Widget grid → WidgetShell/MetricCard mapping confirmed | — |
| 11 | C.11 Mobile | **Asana iOS** · Swipe actions sheet | User-configurable swipe: primary action (Archive/Mark read/Create follow-up) + direction choice | mobbin.com/screens/e84044e8-a33f-40e6-a4c0-ac5eeb765b6a | Swipe triage **now evidenced**; adopt fixed defaults V1 (right=advance, left=decline w/ reason sheet), configurability = P2 | Don't ship configurable swipe before defaults are validated |
| 11 | C.11 Mobile | Spark Mail iOS · Swipes config | Short/long swipe per direction mapped to 4 actions | mobbin.com/screens/87671ae6-77fe-4c31-880f-29efeac59e2f | Confirms swipe-triage as an established email/task idiom | 4-way swipe overload — 2 actions max |
| 11 | C.11 Mobile | Things 3 iOS · Today + action bar | **Sticky bottom action bar** (When/Move/Delete/…) on selection | mobbin.com/screens/d6e7f013-e95c-4203-b98f-dfe27bac343d | Copy sticky bottom action bar for mobile idea detail (C.11 spec confirmed) | — |
| 12 | Feedback-tool class | **Canny** · roadmap table / public board / request list | Roadmap table with **Votes, Impact (0–10), Score columns + score-weight ⚙**; public board (Under Review/Planned/In Progress); upvote list w/ status labels + inline create | mobbin.com/screens/1d30c2c6-9fc9-44c1-bcc3-2e432d46a452 · /73f0e4d9-94ce-4aa7-b016-f3094b162630 · /72d6580c-bdb1-4c51-94b5-ee5fdda19fc1 | Votes+score columns side-by-side in a table validates C.2 Explore column set; score-weight gear = our admin scoring models; public status board recorded as P2 (portal) evidence | Public portal out of V1 scope (04 §B P2) |

---

## D-DELTA. DESIGN REFINEMENTS ADOPTED FROM IMAGE EVIDENCE (spec changes to 04 §C)

1. **C.4/C.5 — Copilot as rail tab**: Idea Detail right rail becomes tabbed **Details | Copilot ✦** (Intercom pattern) instead of a separate overlay drawer; the drawer form survives only on Inbox preview. Fewer layers, persistent AI context.
2. **C.3 — Save-as-draft + "Create more"**: both Linear modal affordances added to the Create Idea modal (draft already existed in the lifecycle; "Create more" serves workshop rapid capture).
3. **C.7 — Field/Funnel toggle + coached empty state**: TheyDo's Table|Matrix toggle and its empty-state coaching line ("Add Value and Effort scores to place ideas on the matrix") adopted verbatim-in-spirit.
4. **C.6 — "Don't merge" as recorded decision**: explicit not-a-duplicate action (folk) persisted, feeding the `duplicate_review_complete` guard; Salesforce per-field survivor choice logged as P2 enhancement.
5. **C.11 — swipe defaults fixed, config later**: swipe triage is now evidence-backed (Asana/Spark); V1 ships fixed right=advance/left=decline, configurability deferred (Asana's config sheet as the P2 reference).
6. **C.5 — persistent AI disclaimer line**: WRITER's always-visible "can make mistakes — verify results" placement adopted for our fixed disclosure string.

---

## A-DELTA. VERDICT UPDATE

With MCP-verified evidence, **all 11 target surfaces + the feedback-tool class now carry image-verified Mobbin references** (previous pass: 8 of 11, metadata-only). Two v2.0 "no evidence" declarations were false negatives, now corrected (merge → Salesforce/folk; scatter → TheyDo), and one absent-app claim reversed (Canny present). Six concrete spec refinements were extracted from the images (§D-delta). The single remaining novel-UX surface is the **versioned scoring-model publish flow** — no reference found on Mobbin or in the benchmark; it stays flagged for Phase 3 prototype + screenshot review.

---

## K-DELTA. ACCEPTANCE CRITERIA (replaces v2.0 K-delta; append to 04 §J)

□ Every screen spec cites an image-verified Mobbin MCP reference (all 11 do) or a declared novel-UX flag (scoring-model publish flow only).
□ The six §D-delta refinements are reflected in the built screens (rail-tab Copilot, draft+create-more, Field/Funnel toggle + coached empty state, Don't-merge decision, fixed swipe defaults, persistent AI disclaimer).
□ Mobbin-sourced patterns render exclusively through canonical components + ADS tokens — zero imported visual styling.
□ Departures recorded in `09_DECISIONS.md`: 2-pane (not 4-pane) Inbox; card-stack (not chat-first) Copilot; labeled quadrants (not free field); one-modal merge (not 2-step); winner-takes merge V1 (per-field P2).
□ P2 backlog entries created from evidence: per-field merge survivor choice (Salesforce), configurable swipe (Asana), public status board/portal (Canny).

---

## J-DELTA. BLIND SPOTS (replaces v2.0 items 11–13)

11. ~~Evidence ceiling (metadata-only)~~ **Resolved** — all rows image-verified via Mobbin MCP.
12. Swipe triage: pattern now evidenced, but our enterprise/AR audience still needs the Phase 7 usability check (3 AR + 3 EN users) before gestures become the primary path; buttons remain always available.
13. Versioned-config publish UX: still no industry reference anywhere — prototype in Phase 3 admin slice, screenshot-review before Phase 4 consumes model versions.
14. **New**: Intercom-style rail-tab Copilot needs a width check on 13" laptops (rail already carries scoring + community blocks) — validate in Phase 2 detail-page screenshot review before Phase 4 mounts the tab.
