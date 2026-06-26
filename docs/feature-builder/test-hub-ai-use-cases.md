# Test Hub — AI Use Cases

**Version:** 1.0  
**Date:** 2026-06-25  
**Existing AI infrastructure:** Gemini API (GEMINI_API_KEY), Anthropic API (ANTHROPIC_API_KEY), edge functions: `ai-digest`, `ai-improve-story`, `ai-similar-items`  
**CATY pattern:** `src/components/ui/AIIntelligenceButton.tsx` (canonical rainbow CTA)

---

## Overview

Catalyst has three working AI capabilities today: digest summarization, story improvement, and similar-item suggestion. All three use the Gemini API via Supabase edge functions. The Test Hub extends this AI infrastructure with test-specific use cases.

AIO Tests has minimal AI (basic test suggestion). Catalyst's advantage is:
1. Full Jira context in `ph_issues` — description, acceptance criteria, issue type
2. Execution history in `tm_*` tables — which tests historically fail, which are flaky
3. Sprint/release context in `iterations` — urgency, coverage needs
4. Team capacity in `resource_inventory` — who has bandwidth

---

## AI Use Case 1 — Test Case Generation from Work Item

### What It Does
Given a Jira work item (Story, Bug, Feature), suggest test cases based on its description and acceptance criteria.

### Trigger Surface
- Work item detail view (CatalystViewStory, CatalystViewTask) → "Suggest test cases" button
- Follows `AIIntelligenceButton` pattern (static rainbow border, NOT animated)
- OR: Repository page → "Generate from Jira issue" in create-case flow

### Context Sent to AI
```typescript
interface TestGenerationContext {
  issue_key: string;
  issue_type: string;
  summary: string;
  description_adf: object | null;  // rendered as markdown
  acceptance_criteria: string | null;
  labels: string[];
  linked_stories: string[];  // if Epic/Feature
  existing_cases: string[];  // case titles already covering this issue
}
```

### Expected AI Output
```typescript
interface GeneratedTestCases {
  cases: Array<{
    title: string;
    case_type: 'functional' | 'regression' | 'smoke' | 'edge_case';
    priority: 'critical' | 'high' | 'medium' | 'low';
    steps: Array<{
      action: string;
      expected_result: string;
      test_data?: string;
    }>;
    rationale: string;  // why this case was generated
  }>;
  coverage_gaps: string[];  // aspects not covered by existing cases
}
```

### Implementation Pattern
- New edge function: `ai-suggest-test-cases`
- Input: `{ issue_key, project_key }`
- Fetches from `ph_issues` + `tm_test_cases.linked_work_item_id`
- Calls Gemini API with structured test generation prompt
- Returns suggested cases
- User reviews → bulk insert into `tm_test_cases` + `tm_test_steps`

### DB Logging
```sql
-- Log to tm_ai_usage_log (per TESTHUB_BUILD_HANDOVER.md)
INSERT INTO tm_ai_usage_log (action, tokens_used, performed_by, performed_at, related_key)
VALUES ('suggest_test_cases', <tokens>, auth.uid(), now(), <issue_key>);
```

### Experiment: 032

---

## AI Use Case 2 — Execution Run Summary

### What It Does
After a test cycle execution run completes (or periodically during), generate a natural-language summary of what passed, what failed, patterns in failures, and risk assessment.

### Trigger Surface
- Cycle detail page → "Summarize results" button (after ≥1 run exists)
- Follows `CatyRainbowCTA` or `AIIntelligenceButton` pattern
- Optionally: auto-generate on cycle status → `completed`

### Context Sent to AI
```typescript
interface ExecutionSummaryContext {
  cycle_name: string;
  cycle_status: string;
  sprint_name: string | null;
  total_cases: number;
  passed: number;
  failed: number;
  blocked: number;
  not_run: number;
  failed_cases: Array<{
    title: string;
    priority: string;
    failed_step: string;
    actual_result: string;
    linked_work_item: string | null;
  }>;
  blocked_cases: Array<{
    title: string;
    blocker_note: string;
  }>;
  linked_defects: Array<{
    title: string;
    severity: string;
    status: string;
  }>;
}
```

### Expected AI Output
```typescript
interface ExecutionSummary {
  overall_health: 'green' | 'amber' | 'red';
  headline: string;         // "87% pass rate — 3 critical failures need attention"
  key_findings: string[];   // bullet list of important findings
  risk_assessment: string;  // can we release? what's the risk?
  patterns: string[];       // "5/6 failures in authentication module"
  recommended_actions: string[];
}
```

### Display
- Rendered as a CATY insight card in cycle detail page
- Dismissable / re-generatable
- Saved to `tm_ai_usage_log` + potentially `tm_cycle_scope` as a JSON metadata column

### Experiment: 033

---

## AI Use Case 3 — My Test Scope Priority Scoring

### What It Does
For the "My Work" tab: rank the current user's pending test assignments by execution priority using AI signals (due dates, defect severity, linked incidents, risk score).

### This is Already Typed
`src/features/my-test-scope/types.ts` defines:
- `AIRecommendation` — priorityTest + reasons + nextTests
- `TestAssignment.priorityScore` — 0-100 score
- `TestAssignment.riskImpact` — critical/high/medium/low
- `TestAssignment.urgency` — overdue/due_today/due_soon/on_track
- `WorkloadAnalysis` — burndown, daily capacity, projected completion

### Implementation (Non-AI first, AI-enhanced later)
Phase 1: Algorithmic scoring (no AI call needed):
```typescript
function computePriorityScore(assignment: TestAssignment): number {
  let score = 0;
  // Urgency component
  if (assignment.urgency === 'overdue') score += 40;
  else if (assignment.urgency === 'due_today') score += 30;
  else if (assignment.urgency === 'due_soon') score += 15;
  // Risk component
  if (assignment.riskImpact === 'critical') score += 30;
  else if (assignment.riskImpact === 'high') score += 20;
  else if (assignment.riskImpact === 'medium') score += 10;
  // Gate blocker
  if (assignment.blocksGate) score += 20;
  // Linked defects (more defects → higher risk)
  score += Math.min(assignment.linkedDefects.length * 5, 15);
  return Math.min(score, 100);
}
```

Phase 2 (AI-enhanced): Use Gemini to analyze patterns across user's history:
- Which types of tests they run fastest
- Historical failure rate for similar case types
- Suggested order based on dependency graph

### Experiment: 013 (algorithmic), 032 (AI-enhanced)

---

## AI Use Case 4 — Flaky Test Detection

### What It Does
Identify test cases with inconsistent results (pass → fail → pass across runs) and flag them for review. Reduce noise in failure reports.

### Data Source
```sql
-- Test cases that flip status across last N runs
SELECT tc.case_key, tc.title,
  COUNT(CASE WHEN tr.status = 'passed' THEN 1 END) AS pass_count,
  COUNT(CASE WHEN tr.status = 'failed' THEN 1 END) AS fail_count,
  COUNT(*) AS total_runs
FROM tm_test_cases tc
JOIN tm_cycle_scope cs ON cs.test_case_id = tc.id
JOIN tm_test_runs tr ON tr.scope_id = cs.id
GROUP BY tc.id, tc.case_key, tc.title
HAVING COUNT(*) > 3
  AND COUNT(CASE WHEN tr.status = 'passed' THEN 1 END) > 0
  AND COUNT(CASE WHEN tr.status = 'failed' THEN 1 END) > 0
ORDER BY (fail_count::float / total_runs) DESC;
```

### Display
- Reports page: "Flaky Tests" report type
- Flag in repository page: `[~]` icon on case key for known-flaky cases
- AI enhancement: suggest common cause patterns ("usually fails on Fridays" / "fails in env X")

### Experiment: 025

---

## AI Use Case 5 — Test Coverage Gap Detection

### What It Does
Given a sprint's Jira stories, identify which ones have no linked test cases (coverage gap) and suggest priority cases to create.

### Logic
```sql
-- Work items in current sprint with no test coverage
SELECT pi.issue_key, pi.summary, pi.issue_type
FROM ph_issues pi
JOIN sprint_issues si ON si.issue_key = pi.issue_key
WHERE si.sprint_id = <current_sprint_id>
  AND NOT EXISTS (
    SELECT 1 FROM tm_test_cases tc
    WHERE tc.linked_work_item_id = pi.id
  )
  AND pi.issue_type IN ('Story', 'Task', 'QA Bug')
ORDER BY pi.priority DESC;
```

### AI Enhancement
For each uncovered story, call AI to suggest: "Based on the description, here are 3 test cases you should create before this ships."

### Display
- Traceability page: "Coverage gaps" panel
- Dashboard widget: "N stories without test coverage in current sprint"

### Experiment: 018, 032

---

## Implementation Constraints (Mandatory)

1. **Use existing Gemini API key** (`GEMINI_API_KEY` in Supabase secrets) — no new AI provider
2. **Follow `AIIntelligenceButton` pattern** — static rainbow border, `animation: none`
3. **Log all AI calls to `tm_ai_usage_log`** — action, tokens, performed_by, performed_at
4. **Never call AI synchronously** — edge function, show loading state, handle errors
5. **Never show AI output without user review** — suggest, don't auto-create
6. **Token budget awareness** — AI use cases should show token count to admin in usage summary
7. **CATY persona** — all AI buttons use "Ask Caty" or "Caty suggests" language, never generic "AI"

---

## Edge Functions to Create (Phase 3)

| Function | Trigger | Gemini call |
|---|---|---|
| `ai-suggest-test-cases` | User clicks "Suggest test cases" | Yes — structured output |
| `ai-summarize-cycle` | User clicks "Summarize results" | Yes — paragraph output |
| `ai-score-test-priority` | Cron or on-demand | Yes — ranking output |
| `ai-detect-flaky-tests` | Cron weekly | SQL-driven, optional AI explanation |

---

## AI Admin Page (`/admin/test/ai-usage`)

Per TESTHUB_BUILD_HANDOVER.md:
- Usage summary chart: calls per day/week, tokens used
- Per-action breakdown (suggest_test_cases vs summarize_cycle)
- Per-user breakdown
- Data source: `tm_ai_usage_log`
- Experiment: Phase 3 (033 or later)
