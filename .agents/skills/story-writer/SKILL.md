---
name: story-writer
description: >
  Deterministic, coverage-gated decomposition of an epic into Jira user stories
  with acceptance criteria. Reads epic attachments (PDFs), description, and
  validates cross-artefact consistency. Same content always yields the same story
  skeleton; re-running never duplicates. Max 25 stories per epic covering ≥80%
  of documentation. User selects which artefacts to use. Runs in background with
  Atlaskit flag notification. Replaces "Improve Epic" button with "Generate Stories".
trigger: convert to stories, write stories, decompose epic, break down BRD, BRD to stories, epic to stories, generate stories, story writer, @stories
---

# Story Writer — Epic to Stories Decomposition

## PURPOSE

Turn an epic's documentation (attachments + description) into ≤25 Jira stories
deterministically. Structure decides count. Same content → same skeleton.
Click again on a covered epic → zero new stories.

---

## TRIGGER

- `@stories(<epic-key>)` or natural language: "convert to stories", "generate stories for this epic"
- Product surface: the "Generate Stories" rainbow CTA button on CatalystViewEpic

---

## ARTEFACT SELECTION (user picks sources)

Before generation, user sees ArtefactPickerModal:
- ☐ Epic Description (from `description_text` / `description_adf`)
- ☐ PDF Attachments (from `ph_attachments` where `mime_type LIKE 'application/pdf%'`)
- ☐ All of the above

If NO artefacts available (no attachments AND no description):
→ Show Atlaskit Flag: "Not enough details to generate stories. Add a description or attach documentation to this epic."

---

## PIPELINE (7 steps, every run)

EXTRACT → LEDGER → GATE → PROPOSE → APPROVE → CREATE → RECOMPUTE

### 1. EXTRACT (deterministic, cache by content_hash)

Sources → merged text corpus. Re-extract ONLY when content_hash changes.

- **PDF attachments**: fetch via `jira-attachment-proxy`, send to Gemini as base64 `inlineData` for text extraction (Gemini handles Arabic natively)
- **Epic description**: `description_text` or ADF→markdown via `adfToMarkdown()`
- **Content hash**: SHA-256 of (sorted PDF hashes + description text) → deterministic key

Each requirement unit gets a structural CUID:
  UC{nnn}-MAIN | UC{nnn}-ALT{nnn} | UC{nnn}-FM{nnn} | UC{nnn}-ERR{nnn}
  UC{nnn}-BC{nnn} | UC{nnn}-MSG | UC{nnn}-STATES | RBAC-MATRIX | NFR-{id}

Canonical sort: UC asc, then MAIN → FM → ALT → MSG → STATES → BC.

### 2. LEDGER

Load epic's child stories from `ph_issues WHERE parent_key = epicKey`.
Read each story's `cuid:` label for canonical coverage.
Legacy stories without label → semantic match (≥ 0.80 threshold) → covered-PENDING-CONFIRM (surface for human confirm, never auto-assume).

### 3. GATE

coverage% = covered CUIDs ÷ total CUIDs.

**HARD CAP**: If epic already has ≥25 child stories → DISABLE button entirely. Tooltip: "Maximum 25 stories reached."
**COVERAGE GATE**: If coverage ≥ 85% OR uncovered ≤ 5 → DISABLE. Show gap list + "generate anyway" override.
**SIZE WARN**: If uncovered > 55 → WARN "epic too large — split into sub-epics." Do NOT truncate.

### 4. PROPOSE (STORY GRAMMAR — count is structural, not model-chosen)

Apply to UNCOVERED CUIDs only (deduped by CUID). Hard cap at 25 total stories (existing + new).

STORY GRAMMAR:
  R1  each UC MAIN path                         → 1 story
  R2  each form FM                              → 1 "fields & validation" story (ERR + field-level BC fold into AC)
  R3  each ALT that is a distinct user action   → 1 story; trivial ALT folds into parent
  R4  each back-office/reviewer action          → 1 story
  R5  each multi-channel notification (MSG)     → 1 story
  R6  each state machine (STATES)               → 1 story
  R7  leftover BC                               → AC on nearest functional story (NO own story)
  R8  RBAC-MATRIX                               → 1 story
  R9  NFR                                       → EXCLUDED (EXCLUDE_NFR=true)

Each story shape:
  - summary: contextual title (not generic)
  - description: "As a [role], I want [action], so that [benefit]"
  - acceptanceCriteria: Given/When/Then bullets
  - brdRef: which section/page of source doc
  - covers: [CUID...]

### 5. APPROVE (human-in-the-loop, ALWAYS)

Show proposed stories in modal with:
- Checkboxes per story (all pre-checked)
- Story title + user story preview + AC count
- Coverage projection: "Creating N stories will cover X% of documentation"
- User can uncheck stories they don't want
- "Create Selected" button

**Nothing is written to Jira/Supabase until Vikram approves.**

### 6. CREATE

For each approved story, call `createChildIssue()` from workItemRepo.ts:
  - parent = epicKey
  - issueType = 'Story' (ALWAYS Story, never Task/Subtask)
  - summary = proposed title
  - projectKey from epic
  - label `cuid:<CUID>` for every unit the story covers

### 7. RECOMPUTE

Refresh child story count. If ≥25 → disable button.
Update coverage projection. Show completion flag.

---

## IDEMPOTENCY

- Content hash guarantees: same docs → same extraction → same CUIDs
- CUID dedup guarantees: second run on unchanged epic → zero new stories
- Cache table: `story_generation_cache(epic_key, content_hash, stories JSONB)`
- Unchanged content → return cached proposals (no AI call)

## DRIFT CONTROL

- Near-duplicate CUIDs flagged for human review, never auto-created
- Inventory cached by content_hash; unchanged sources reuse it

---

## CONFIG

  MAX_STORIES         = 25
  COVERAGE_TARGET     = 0.80  (80% of documentation)
  DISABLE_THRESHOLD   = 85    (coverage %)
  GAP_FLOOR           = 5     (uncovered CUIDs)
  SOFT_CEILING        = 55    (uncovered CUIDs before split warning)
  EXCLUDE_NFR         = true
  MATCH_FLOOR         = 0.80  (legacy semantic-match threshold)

---

## NOTIFICATIONS (Atlaskit Flags)

| Event | Flag Type | Message |
|---|---|---|
| Generation started | Info AutoDismissFlag | "Generating stories from your epic documentation..." |
| Success | Success AutoDismissFlag | "✅ Generated N stories for EPIC-KEY" |
| No artefacts | Warning Flag | "Not enough details. Add description or attach PDFs." |
| Max reached | Info Flag | "Maximum 25 stories reached for this epic." |
| Error | Error Flag | "Story generation failed: {message}" |

---

## PRODUCT SURFACE

- `<GenerateStoriesButton epicKey issue>` — rainbow CTA replacing "Improve Epic"
- `<ArtefactPickerModal>` — source selection with checkboxes
- `<StoryProposalModal>` — review + approve generated stories
- `useStoryGeneration(epicKey)` — { state, proposals, coverage, isDisabled, generate, approve }

Button disabled when:
- Epic has ≥25 child stories
- Coverage ≥ 85%
- No artefacts available (show "not enough details" instead)

---

## FINAL PRINCIPLES

If structure didn't set the count, it isn't predictable.
If it isn't CUID-deduped, it isn't idempotent.
If it isn't coverage-gated, the button shouldn't exist.
If Vikram didn't approve the proposal, nothing is written.
If the label isn't on the Jira issue, it isn't covered.
If there are no attachments and no description, say so — don't guess.
