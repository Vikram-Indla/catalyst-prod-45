# Doc Intel Screen Blueprint and Lock Decisions

**Feature Work ID:** CAT-DOCINTEL-V2-20260709-001
**Status:** Proposed product contract — no implementation
**Primary job:** Review a BRD and turn accepted findings into traceable work

## The product in one sentence

Doc Intel turns trusted source material into grounded understanding, reviewed findings, cited
deliverables and governed delivery work. It is not an extraction viewer and it is not generic chat.

## Final navigation proposal

```text
Document Intelligence
  For you          intent-first starting point
  Library          trusted sources and their useful state
  Themes           reusable source groupings
  Deliverables     cited outputs awaiting review or action

Source workbench
  Overview         meaning, attention and next action
  Ask              grounded questions in visible scope
  Findings         reviewable requirements, risks, gaps and questions
  Deliverables     generate and govern outputs for this source
  Work items       linked delivery work and traceability

Contextual—not primary navigation
  View source      readable document/translation
  Evidence         exact extracted source anchor
  Versions         available source versions

Admin
  Sources, ingestion and raw extraction
  Processing health
  Audit and retries

Deferred behind a separate permission Plan Lock
  Prompts and models
```

This resolves the inconsistency in the first draft: `Document`, `Evidence` and `Traceability` are
not equal user jobs. Source reading and evidence are contextual trust tools; traceability belongs
with the resulting work.

## Screen 1 — For you

**Question answered:** “What can Doc Intel help me accomplish?”

```text
┌ Document Intelligence                                      Upload source ┐
│ Good morning. What do you need to understand or produce?                 │
│ ┌ Ask | Review | Create ────────────────────────────────────────────────┐ │
│ │ [ Project · source(s) · theme ]                                      │ │
│ │ Ask a grounded question, review a BRD, or create a deliverable…      │ │
│ │                                                            Continue │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│ Review a BRD  · Find missing requirements · Build test readiness         │
│                                                                           │
│ Needs your attention                  Recent sources and deliverables     │
└───────────────────────────────────────────────────────────────────────────┘
```

Content order:

1. Outcome statement and one dominant composer.
2. Mode: Ask, Review or Create.
3. Visible source scope before submission.
4. Four proven task starters, not an agent marketplace.
5. Needs-attention items and resumable sources/deliverables.

Adopted pattern: Rovo's intent-first front door. NotebookLM contributes visible source scope.

Never show here: pages extracted, chunk counts, embeddings, provider, queue, latency or prompt ID.

States: no project, no sources, first visit, ready, needs review, processing, failed, scoped theme.

## Screen 2 — Start a BRD review

**Question answered:** “What am I reviewing, and what outcome should I expect?”

No persisted “analysis” is implied. This is a guided launch into an existing source workbench.

```text
1 Review job            2 Source and version             3 Expected outcome
● BRD completeness      ● Product BRD v3                 ● Findings review
○ Requirements          ○ Product BRD v2                   + cited BRD
○ Test readiness        ○ Add another source               + work preview

                                                        Start review
```

Rules:

- Maximum three decisions.
- Existing source or Upload source.
- BRD-first labels, with other documentation jobs available only when backed by existing
  classifications/deliverables.
- “Compare versions” is absent because the current version control has no diff contract.
- Starting opens `Findings` for the selected source; it does not create a fake durable review row.

Adopted pattern: Elicit's explicit criteria and controlled workflow, simplified for enterprise BA.

## Screen 3 — Library

**Question answered:** “What trusted sources do we have, and which need action?”

JiraTable columns:

| Column | Meaning |
|---|---|
| Source | Canonical type icon + title; uploaded document, Jira issue or git file |
| Context | Project and theme |
| Useful state | Ready, processing, failed, or needs review—not repeated technical stages |
| Review | Unreviewed/partially reviewed/reviewed only when proven from facts |
| Deliverables | Count/state only when available |
| Freshness | Created/synced time, truthfully labelled |
| Actions | Ask, Review, Create; row click opens Overview |

Filters: project, theme, source type, useful state, needs review, freshness. Pages, language and
processing duration move to source details/Admin unless specifically useful.

Adopted pattern: Dovetail's clear source identity and evidence continuity; existing JiraTable is
mandatory.

## Screen 4 — Source Overview

**Question answered:** “What is this source about, what needs attention, and what should I do next?”

```text
Product BRD                  Ready · Uploaded document     View source  Versions
Project / Theme / freshness

┌ What this source can support ┐  ┌ Review progress ──────────────────────┐
│ Ask grounded questions       │  │ 5 findings · 0 reviewed              │
│ Review extracted findings    │  │ 2 open questions                     │
│ Create cited deliverables    │  │ No approved deliverable yet          │
└──────────────────────────────┘  └───────────────────────────────────────┘

Next best action: Review the 5 findings
```

No model-generated executive summary is displayed unless a real cited summary artifact exists.
Counts render only from proven data. Unknown values render nothing or a dash.

Adopted pattern: Productboard's action-oriented context plus NotebookLM's bounded source model.

## Screen 5 — Ask

**Question answered:** “What do these selected sources say?”

- Conversation area is primary, not a narrow drawer or single field in empty space.
- Scope strip remains visible before and after submission.
- Job-specific prompts derive from proven capabilities.
- Inline citations open Source & Evidence at the exact available anchor.
- “Not found in selected sources” is a successful grounded outcome.
- Current-turn conversation is labelled non-durable until persistence exists.

Adopted pattern: NotebookLM grounding and Rovo's natural-language entry.

## Screen 6 — Findings

**Question answered:** “What did the source establish, and has a human accepted it?”

Use JiraTable, not custom cards. Current `FactsReviewPanel` data becomes a canonical review list.

| Field | Contract |
|---|---|
| Finding | English statement; Arabic counterpart available without duplicating hierarchy |
| Kind | Capability, actor, workflow, requirement, constraint, risk, assumption, open question |
| Evidence | Count and exact source anchor |
| Review state | Unreviewed, confirmed or rejected |
| Action | Confirm, reject, reset; edit remains deferred |

Filters: kind, review state and source. Summary communicates reviewed/total, not an invented quality
score. Citation opens the contextual evidence drawer.

Adopted pattern: Elicit's structured extraction and human override; Dovetail's governed insight.

## Screen 7 — Deliverables

**Question answered:** “What decision-ready output should I create or review?”

Creation groups preserve the exact 12 backend values:

- Understand: English summary, Arabic summary, gap analysis, open questions.
- Plan delivery: Full BRD, epic, user stories, business process.
- Validate and ship: acceptance criteria, test cases, traceability matrix, release notes.

Existing deliverables appear in JiraTable with title, type, source, review state, grounding state,
updated time and next action. The project-level Deliverables page uses a drawer for details because
artifacts currently lack slug-safe standalone routes. Rich editing stays deferred.

Adopted pattern: NotebookLM Studio separation plus Elicit report rigor.

## Screen 8 — Deliverable review and Promote to work

**Question answered:** “Is this output trustworthy and ready to become delivery work?”

- Readable cited content with source scope and grounding warning.
- Approve/reject remains an explicit human decision.
- Promote is absent until approved.
- Promotion preview includes target project, work type, fields, owners and evidence backlinks.
- Work-created/link-failed is a visible partial success with retry—not a success toast.

Adopted pattern: Productboard's reviewed evidence-to-work handoff.

## Screen 9 — Work items and traceability

**Question answered:** “What work resulted, and can I trace it back?”

Two peer views inside one destination:

- Linked work: existing manual/promoted links, origin and unlink action.
- Traceability: accepted finding/deliverable → exact source anchor → resulting work.

This preserves both current Links and Traceability capability without exposing implementation
entities as top-level tabs.

## Screen 10 — Source and evidence drawer

**Question answered:** “Show me the original context for this claim.”

- Tabs: Readable source and Exact evidence for the selected claim.
- Opens from citation, finding, deliverable or View source.
- Focuses the exact page/section when available; never invents Jira page or git line anchors.
- Shows source type, title, version/freshness and quotation.
- Full-page/block extraction, block UUID, embeddings, confidence math and prompt/model detail are
  absent. Raw extraction is available only in authorized Admin; prompt/model controls remain
  deferred until their permission contract is separately locked.

## Screen 11 — Admin / Document Intelligence

**Question answered:** “Is the knowledge system operating correctly, and can an authorized person
recover it?”

- Sources and ingestion: adapters, processing stage, raw extraction inspection and source-level retry.
- Processing health: queue/failures, sanitized provider detail, re-sync by explicit project.
- Audit and retries: operational history and recoverable failures.

Prompts/models are not part of this executable Admin slice. The current prompt-table access policy
must be secured by a separate RLS/grant Plan Lock before those controls can be shown.

Admin navigation is not authorization. Global actions require the locked backend role contract.

## Cross-screen state contract

| State | User surface | Admin surface |
|---|---|---|
| Processing normally | Quiet “Processing” where the source appears | Stage, job and queue detail |
| Needs user review | Finding/deliverable count and next action | No special operational alert |
| Source failed | Plain-language blocked state and retry/contact path | Provider error, stage and retry |
| No grounded answer | “Not found in selected sources” | Retrieval diagnostics if authorized |
| Citation available | Exact quote and truthful source anchor | Block/model telemetry |
| Unknown metadata | Omit or dash | Raw field may be inspected |

## Capability-preservation map

| Current capability | New location |
|---|---|
| Project Ask drawer | For you Ask and source Ask |
| Evidence tab | Source and evidence drawer |
| Document tab | Source and evidence drawer → Readable source |
| Facts tab | Findings |
| Artifacts tab | Deliverables |
| Traceability tab | Work items → Traceability |
| Ask tab | Ask |
| Links tab | Work items → Linked work |
| Upload/version/themes | Home/Library, header version action, Library/Themes |
| Health/re-sync | Admin after backend authorization |

## Lock decisions

The council recommends locking all of the following together:

1. The first user contract is BRD review; other document jobs use the same architecture only when
   backed by real capability.
2. Rovo influences Home, not the complete product.
3. Findings is a primary workspace destination, not buried under “Analysis.”
4. Source reading/evidence are contextual, not primary destinations.
5. Citations stay user-facing; technical citation machinery moves to Admin.
6. No persisted analysis, rich editor, version diff or artifact deep link is promised in this plan.
7. Only approved deliverables may be promoted.
8. Global operational controls require backend authority: recommended `legacy admin OR product
   super_admin`.
9. The final build must preserve every current capability through the mapping above.
