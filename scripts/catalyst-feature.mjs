#!/usr/bin/env node
/**
 * catalyst-feature.mjs
 * Feature activation and continuation script for the Catalyst operating system.
 *
 * Usage:
 *   node scripts/catalyst-feature.mjs activate "RBAC Admin UI"
 *   node scripts/catalyst-feature.mjs continue CAT-RBAC-ADMIN-UI-20260626-001
 *   node scripts/catalyst-feature.mjs list
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import process from 'process';

const BASE_DIR = path.join(os.homedir(), 'catalyst', 'features');

// ─── helpers ───────────────────────────────────────────────────────────────

function slugify(name) {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function today() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

function generateFeatureWorkId(name) {
  const slug = slugify(name);
  const date = today();
  const prefix = `CAT-${slug}-${date}`;

  // Find next sequence number
  let seq = 1;
  if (fs.existsSync(BASE_DIR)) {
    const existing = fs.readdirSync(BASE_DIR).filter(d => d.startsWith(prefix));
    seq = existing.length + 1;
  }

  return `${prefix}-${String(seq).padStart(3, '0')}`;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writeFile(filePath, content) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
}

function nextSessionNumber(featureDir) {
  const sessionsDir = path.join(featureDir, 'sessions');
  if (!fs.existsSync(sessionsDir)) return 1;
  const files = fs.readdirSync(sessionsDir).filter(f => /^\d{3}_/.test(f));
  if (files.length === 0) return 1;
  const nums = files.map(f => parseInt(f.slice(0, 3), 10));
  return Math.max(...nums) + 1;
}

// ─── file templates ─────────────────────────────────────────────────────────

function readMeFirst(id) {
  return `# ${id} — Read Me First

> Read this file before anything else in this feature folder.
> Do not implement before reading 01_OBJECTIVE.md and 03_PLAN_LOCK.md.

## Feature Work ID
${id}

## Status
ACTIVATED — Plan Lock not yet written.

## What this feature is about
[Fill in after activation agents run]

## How to continue this feature

\`\`\`
continue feature ${id}
\`\`\`

or:

\`\`\`bash
node scripts/catalyst-feature.mjs continue ${id}
\`\`\`

## Files to read on continuation
1. 00_READ_ME_FIRST.md (this file)
2. 01_OBJECTIVE.md
3. 03_PLAN_LOCK.md
4. 07_HANDOVER.md
5. 08_DRIFT_LOG.md
6. 09_DECISIONS.md
7. 11_KARPATHY_LOOP_LOG.md
8. 12_AGENT_OUTPUTS.md
`;
}

function objective(id, name) {
  return `# ${id} — Objective

## Feature name
${name}

## What we are building
[Fill in — one clear sentence]

## Why
[Fill in — business outcome]

## Acceptance criteria
- [ ] [Fill in — specific, measurable]
- [ ] [Fill in — specific, measurable]

## Non-scope
- [Fill in — what we are NOT doing]

## Target surface
[Fill in — route, page, component]

## Stakeholders
- JK: Product Owner
- Aiden: Engineering Lead
- Claude Code: Implementation
`;
}

function canonicalDiscovery(id) {
  return `# ${id} — Canonical Discovery

> Output from Canonical Component Discovery + Canonical Screen Discovery agents.
> Populated by agents spawned during \`activate feature\`.

## Canonical components identified

| Component | File path | Fit verdict | Notes |
|---|---|---|---|
| [TBD] | [TBD] | KEEP / DISCARD | [TBD] |

## Canonical screens identified

| Route/Page | File path | Fit verdict | Notes |
|---|---|---|---|
| [TBD] | [TBD] | KEEP / DISCARD | [TBD] |

## JiraTable evaluation

- Applies to this feature: YES / NO
- Verdict: MANDATORY / NOT_APPLICABLE
- Evidence: [TBD]

## Storybook components reviewed

| Component | MCP query | Verdict |
|---|---|---|
| [TBD] | [TBD] | [TBD] |
`;
}

function planLock(id, name) {
  return `# ${id} — Plan Lock

> Status: NOT_WRITTEN
> This file must be filled in and approved before any implementation begins.
> See template: docs/ways-of-working/CATALYST_PLAN_LOCK_TEMPLATE.md

## Feature Work ID
${id}

## Feature name
${name}

## Timebox
[e.g. 2 hours — one slice]

## Objective
[One sentence]

## Business outcome
[One sentence]

## Exact slice
[What this Plan Lock covers]

## Non-scope
[What this Plan Lock does NOT cover]

## Canonical components
[List selected canonical components with file paths]

## Canonical screens
[List selected canonical screens/routes]

## Files to modify
- [path/to/file.tsx — change summary]

## Files forbidden
- [path/to/file.tsx — reason]

## UI/UX rules
- [specific rules for this feature]

## Data/backend rules
- [specific rules for this feature]

## Integration/wiring rules
- [specific rules for this feature]

## Parallel discovery agents
All seven agents must run before this Plan Lock is finalized.

## Karpathy loop hypotheses
- [LOOP-001] [Hypothesis]
- [LOOP-002] [Hypothesis]

## Screenshot checklist
- [ ] [screenshot description]

## Validation commands
\`\`\`bash
npx tsc --noEmit
\`\`\`

## Regression risks
- [risk description]

## Stop conditions
- Any banned color introduced → stop
- Any hand-rolled UI introduced → stop
- TypeScript error → stop

## Rebaseline rules
After one correction loop: accept / split / rebuild / stop+revert.

## Commit rules
Stage explicit files only. Commit message must reference ${id}.

## Plan Lock status
NOT_WRITTEN — fill in and get Vikram approval before implementing.
`;
}

function executionLog(id) {
  return `# ${id} — Execution Log

> Running log of all actions, decisions, and changes made during implementation.
> Append entries — never delete.

---

## Log entries

[Entries will be appended during execution]
`;
}

function uiUxReview(id) {
  return `# ${id} — UI/UX Review

> Output from UI/UX Critic agent.
> Screenshot acceptance records.

## ADS compliance score
[0–10] — [date]

## Violations found
- [violation description — one per line]

## Canonical substitutions proposed
- [hand-rolled element → canonical replacement]

## Screenshot checklist

| # | Description | Reference | Implementation | Status |
|---|---|---|---|---|
| 1 | [TBD] | [ref screenshot path] | [impl screenshot path] | PENDING |

## Visual acceptance status
PENDING — awaiting implementation and screenshots.
`;
}

function validationEvidence(id) {
  return `# ${id} — Validation Evidence

> Raw output from validation commands, DOM probes, API responses.
> Append — never delete.

---

## Validation entries

[Entries will be appended during validation]
`;
}

function handover(id) {
  return `# ${id} — Handover

> State handover for next session.
> See template: docs/ways-of-working/CATALYST_CONTEXT_HANDOVER_TEMPLATE.md

## Feature Work ID
${id}

## Status
ACTIVATED — no implementation yet.

## Branch
[fill in]

## HEAD
[fill in]

## Plan Lock status
NOT_WRITTEN

## Next exact action
Read this handover and 03_PLAN_LOCK.md, then ask Vikram what to do next.

## Open risks
- Plan Lock not yet written — do not implement

## Next prompt
\`continue feature ${id}\`
`;
}

function driftLog(id) {
  return `# ${id} — Drift Log

> All drift events, rebaseline decisions, superseded Plan Locks.
> Append — never delete.

---

## Drift entries

[Entries will be appended if drift is detected]
`;
}

function decisions(id) {
  return `# ${id} — Decisions

> All explicit decisions made during this feature. Permanent record.
> Append — never delete.

---

## Decisions

[Entries will be appended as decisions are made]
`;
}

function screenshotChecklist(id) {
  return `# ${id} — Screenshot Checklist

> Screenshot acceptance checklist.
> Every item must be ACCEPTED before UI-heavy commit.

## Status
PENDING — awaiting implementation.

## Checklist

| # | Description | Mode | Reference path | Implementation path | Status |
|---|---|---|---|---|---|
| 1 | [TBD — fill in after Plan Lock] | Light | [TBD] | [TBD] | PENDING |
| 2 | [TBD] | Dark | [TBD] | [TBD] | PENDING |
`;
}

function karpathyLog(id) {
  return `# ${id} — Karpathy Loop Log

> Karpathy Loop for Catalyst means Hypothesis → Experiment → Measure → Keep/Discard → Log.
> Log every loop entry here before moving to the next experiment.
> See protocol: docs/ways-of-working/CATALYST_KARPATHY_LOOP.md

---

## Loop entries

[Entries will be appended during discovery and implementation]

### Format

\`\`\`
## [LOOP-NNN] <Short description>

**Date:** YYYY-MM-DD
**Phase:** Discovery | Implementation | Validation
**Hypothesis:** [What you expected to be true]
**Experiment:** [Exact probe run]
**Evidence:** [What you found]
**Decision:** KEEP | DISCARD
**Reason:** [Why — 1-2 sentences]
**Next step:** [What to do with this result]
\`\`\`
`;
}

function agentOutputs(id) {
  return `# ${id} — Agent Outputs

> Raw outputs from all parallel agents.
> One section per agent. Append — never delete.

---

## Agent 1 — Canonical Component Discovery

[Output will be appended after agent runs]

---

## Agent 2 — Canonical Screen Discovery

[Output will be appended after agent runs]

---

## Agent 3 — UI/UX Critic

[Output will be appended after agent runs]

---

## Agent 4 — Integration Architect

[Output will be appended after agent runs]

---

## Agent 5 — Data/Safety Guard

[Output will be appended after agent runs]

---

## Agent 6 — Implementation Planner

[Output will be appended after agent runs]

---

## Agent 7 — QA/Screenshot Validator

[Output will be appended after agent runs]
`;
}

function sessionLog(num, id, name, purpose) {
  const numStr = String(num).padStart(3, '0');
  return `# Session ${numStr} — ${purpose}

**Date:** ${today().replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')}
**Feature Work ID:** ${id}
**Feature name:** ${name}
**Mode:** DISCOVERY

## Objective this session
Activate feature, run discovery agents, run Karpathy loop, produce Plan Lock draft.

## Pre-flight
[Paste raw output of pwd / git branch / git status / git stash list]

## Plan Lock status
NOT_WRITTEN — this is the activation session.

## Actions taken
- Feature Work ID generated: ${id}
- Feature folder created: ~/catalyst/features/${id}/
- All required feature files created
- [Pending: discovery agents, Karpathy loop, Plan Lock draft]

## Files changed
NONE — activation only. No app code touched.

## Karpathy loops run
[Pending — run after discovery agents complete]

## Validation evidence
[Pending]

## Screenshot status
NOT_REQUIRED — activation session, no UI changes.

## Handover state
Plan Lock not yet written. Next session must write Plan Lock and get Vikram approval before implementing.

## Aiden Validation Block
[Fill in at end of session]
`;
}

// ─── commands ───────────────────────────────────────────────────────────────

function cmdActivate(name) {
  if (!name || !name.trim()) {
    console.error('ERROR: feature name is required.\nUsage: node scripts/catalyst-feature.mjs activate "Feature Name"');
    process.exit(1);
  }

  const id = generateFeatureWorkId(name);
  const featureDir = path.join(BASE_DIR, id);

  ensureDir(featureDir);
  ensureDir(path.join(featureDir, 'sessions'));

  writeFile(path.join(featureDir, '00_READ_ME_FIRST.md'), readMeFirst(id));
  writeFile(path.join(featureDir, '01_OBJECTIVE.md'), objective(id, name));
  writeFile(path.join(featureDir, '02_CANONICAL_DISCOVERY.md'), canonicalDiscovery(id));
  writeFile(path.join(featureDir, '03_PLAN_LOCK.md'), planLock(id, name));
  writeFile(path.join(featureDir, '04_EXECUTION_LOG.md'), executionLog(id));
  writeFile(path.join(featureDir, '05_UI_UX_REVIEW.md'), uiUxReview(id));
  writeFile(path.join(featureDir, '06_VALIDATION_EVIDENCE.md'), validationEvidence(id));
  writeFile(path.join(featureDir, '07_HANDOVER.md'), handover(id));
  writeFile(path.join(featureDir, '08_DRIFT_LOG.md'), driftLog(id));
  writeFile(path.join(featureDir, '09_DECISIONS.md'), decisions(id));
  writeFile(path.join(featureDir, '10_SCREENSHOT_CHECKLIST.md'), screenshotChecklist(id));
  writeFile(path.join(featureDir, '11_KARPATHY_LOOP_LOG.md'), karpathyLog(id));
  writeFile(path.join(featureDir, '12_AGENT_OUTPUTS.md'), agentOutputs(id));
  writeFile(path.join(featureDir, 'sessions', '001_activate_feature.md'), sessionLog(1, id, name, 'activate_feature'));

  const dateFormatted = today().replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  CATALYST FEATURE ACTIVATED                                  ║
╚══════════════════════════════════════════════════════════════╝

Feature Work ID:    ${id}
Feature name:       ${name}
Feature folder:     ~/catalyst/features/${id}/
Date:               ${dateFormatted}

Files created:
  00_READ_ME_FIRST.md
  01_OBJECTIVE.md
  02_CANONICAL_DISCOVERY.md
  03_PLAN_LOCK.md
  04_EXECUTION_LOG.md
  05_UI_UX_REVIEW.md
  06_VALIDATION_EVIDENCE.md
  07_HANDOVER.md
  08_DRIFT_LOG.md
  09_DECISIONS.md
  10_SCREENSHOT_CHECKLIST.md
  11_KARPATHY_LOOP_LOG.md
  12_AGENT_OUTPUTS.md
  sessions/001_activate_feature.md

─────────────────────────────────────────────────────────────
Recommended Claude conversation title:
${id} — ${name}

─────────────────────────────────────────────────────────────
Next steps for Claude:
  1. Run pre-flight (pwd / git branch / git status / git stash list)
  2. Spawn 7 mandatory discovery agents in parallel
  3. Run Karpathy Discovery Loop
  4. Write Plan Lock draft to 03_PLAN_LOCK.md
  5. STOP — wait for Vikram review before implementing

To continue in a new conversation:
  node scripts/catalyst-feature.mjs continue ${id}

  or in Claude: continue feature ${id}

─────────────────────────────────────────────────────────────
`);
}

function cmdContinue(id) {
  if (!id || !id.trim()) {
    console.error('ERROR: Feature Work ID is required.\nUsage: node scripts/catalyst-feature.mjs continue CAT-<AREA>-<FEATURE>-<YYYYMMDD>-<###>');
    process.exit(1);
  }

  const featureDir = path.join(BASE_DIR, id);

  if (!fs.existsSync(featureDir)) {
    console.error(`ERROR: Feature folder not found: ${featureDir}`);
    console.error('\nAvailable features:');
    cmdList();
    process.exit(1);
  }

  const sessNum = nextSessionNumber(featureDir);
  const sessNumStr = String(sessNum).padStart(3, '0');
  const sessFile = `${sessNumStr}_continue_feature.md`;
  const sessPath = path.join(featureDir, 'sessions', sessFile);

  const sessContent = `# Session ${sessNumStr} — continue_feature

**Date:** ${today().replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')}
**Feature Work ID:** ${id}
**Mode:** [Fill in: DISCOVERY | PLANNING | EXECUTION | VALIDATION | HANDOVER]

## Objective this session
[Fill in after reading handover]

## Pre-flight
[Paste raw output of pwd / git branch / git status / git stash list]

## Plan Lock status
[Fill in after reading 03_PLAN_LOCK.md]

## Actions taken
[Fill in]

## Files changed
[Fill in]

## Karpathy loops run
[Fill in]

## Validation evidence
[Fill in]

## Screenshot status
[NOT_REQUIRED | PENDING | ACCEPTED | REJECTED]

## Handover state
[Fill in at end of session]

## Aiden Validation Block
[Fill in at end of session]
`;

  ensureDir(path.join(featureDir, 'sessions'));
  fs.writeFileSync(sessPath, sessContent, 'utf8');

  // Read key files for summary
  const readFile = (name) => {
    const p = path.join(featureDir, name);
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8').slice(0, 300) : '[NOT FOUND]';
  };

  const planLockSnippet = readFile('03_PLAN_LOCK.md');
  const handoverSnippet = readFile('07_HANDOVER.md');

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  CATALYST FEATURE CONTINUATION                               ║
╚══════════════════════════════════════════════════════════════╝

Feature Work ID:    ${id}
Feature folder:     ~/catalyst/features/${id}/
Session log:        sessions/${sessFile}

─────────────────────────────────────────────────────────────
Recommended Claude conversation title:
${id} — [describe session purpose]

─────────────────────────────────────────────────────────────
Files Claude must read (in order):
  1. ~/catalyst/features/${id}/00_READ_ME_FIRST.md
  2. ~/catalyst/features/${id}/01_OBJECTIVE.md
  3. ~/catalyst/features/${id}/03_PLAN_LOCK.md
  4. ~/catalyst/features/${id}/07_HANDOVER.md
  5. ~/catalyst/features/${id}/08_DRIFT_LOG.md
  6. ~/catalyst/features/${id}/09_DECISIONS.md
  7. ~/catalyst/features/${id}/11_KARPATHY_LOOP_LOG.md
  8. ~/catalyst/features/${id}/12_AGENT_OUTPUTS.md

─────────────────────────────────────────────────────────────
Plan Lock snippet (first 300 chars):
${planLockSnippet.slice(0, 300)}

─────────────────────────────────────────────────────────────
Handover snippet (first 300 chars):
${handoverSnippet.slice(0, 300)}

─────────────────────────────────────────────────────────────
=== REHYDRATION REPORT TEMPLATE ===

Feature Work ID:   ${id}
Session log:       sessions/${sessFile}
Branch:            [run: git branch --show-current]
HEAD:              [run: git log --oneline -1]

Objective:         [from 01_OBJECTIVE.md]
Plan Lock status:  [NOT_WRITTEN | DRAFT | APPROVED | SUPERSEDED]
Handover summary:  [from 07_HANDOVER.md]
Open decisions:    [from 09_DECISIONS.md]
Karpathy loops:    [last 3 from 11_KARPATHY_LOOP_LOG.md]

Next exact action: [one sentence]
Waiting on:        [Vikram approval | Plan Lock | NONE]

=== END REHYDRATION REPORT ===

─────────────────────────────────────────────────────────────
STOP: Do not implement until Plan Lock is APPROVED.
─────────────────────────────────────────────────────────────
`);
}

function cmdList() {
  if (!fs.existsSync(BASE_DIR)) {
    console.log('No features found. Base directory does not exist: ' + BASE_DIR);
    console.log('Run: node scripts/catalyst-feature.mjs activate "Feature Name"');
    return;
  }

  const dirs = fs.readdirSync(BASE_DIR)
    .filter(d => {
      const full = path.join(BASE_DIR, d);
      return fs.statSync(full).isDirectory() && /^CAT-/.test(d);
    })
    .sort();

  if (dirs.length === 0) {
    console.log('No features found in ' + BASE_DIR);
    return;
  }

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  CATALYST FEATURES                                           ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  for (const d of dirs) {
    const planLockPath = path.join(BASE_DIR, d, '03_PLAN_LOCK.md');
    let status = 'NO_PLAN_LOCK';
    if (fs.existsSync(planLockPath)) {
      const content = fs.readFileSync(planLockPath, 'utf8');
      if (/Status.*APPROVED/i.test(content)) status = 'APPROVED';
      else if (/Status.*SUPERSEDED/i.test(content)) status = 'SUPERSEDED';
      else if (/Status.*DRAFT/i.test(content)) status = 'DRAFT';
      else if (/Status.*NOT_WRITTEN/i.test(content)) status = 'NOT_WRITTEN';
      else status = 'EXISTS';
    }

    const sessionsDir = path.join(BASE_DIR, d, 'sessions');
    const sessCount = fs.existsSync(sessionsDir) ? fs.readdirSync(sessionsDir).length : 0;

    console.log(`  ${d}`);
    console.log(`    Plan Lock: ${status} | Sessions: ${sessCount}`);
    console.log(`    Folder: ~/catalyst/features/${d}/`);
    console.log(`    Continue: node scripts/catalyst-feature.mjs continue ${d}`);
    console.log();
  }
}

// ─── main ───────────────────────────────────────────────────────────────────

const [,, cmd, ...rest] = process.argv;

switch (cmd) {
  case 'activate':
    cmdActivate(rest.join(' '));
    break;
  case 'continue':
    cmdContinue(rest[0]);
    break;
  case 'list':
    cmdList();
    break;
  default:
    console.log(`
Catalyst Feature Script
Usage:
  node scripts/catalyst-feature.mjs activate "Feature Name"
  node scripts/catalyst-feature.mjs continue CAT-<AREA>-<FEATURE>-<YYYYMMDD>-<###>
  node scripts/catalyst-feature.mjs list
`);
    process.exit(1);
}
