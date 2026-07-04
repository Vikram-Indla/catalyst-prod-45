#!/usr/bin/env node
/**
 * CRE chokepoint gate — enforcement claimed by .claude/skills/cre/SKILL.md.
 *
 * Every surface that creates, links, or parents a work item must query the
 * Catalyst Rules Engine (@/lib/catalyst-rules). This gate fails the commit
 * when a known chokepoint file stops referencing its required CRE API, so
 * the wiring cannot silently regress back to hardcoded type lists.
 *
 * Run: node scripts/cre-chokepoint-gate.cjs   (also via npm run lint:cre)
 * Wired: .husky/pre-commit (blocking).
 */
const fs = require('fs');
const path = require('path');

const CHECKS = [
  {
    file: 'src/components/workhub/create-story/CreateStoryModal.tsx',
    needles: ['@/lib/catalyst-rules', 'filterCreatableTypes'],
    why: 'Create dialog catalogue must pass the CRE Grid A/D filter',
  },
  {
    file: 'src/components/kanban/InlineCreateCard.tsx',
    needles: ['@/lib/catalyst-rules', 'filterCreatableTypes'],
    why: 'Kanban inline create (live board chokepoint) must pass the CRE Grid A/D filter',
  },
  {
    file: 'src/features/kanban-board/components/InlineCreate.tsx',
    needles: ['@/lib/catalyst-rules', 'filterCreatableTypes'],
    why: 'Legacy kanban inline create must pass the CRE Grid A/D filter',
    optional: true, // dead code since 2026-06-15 — checked only while it exists
  },
  {
    file: 'src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx',
    needles: ['@/lib/catalyst-rules', 'filterCreatableTypes'],
    why: 'Backlog inline-create catalogue must pass the CRE Grid A/D filter',
  },
  {
    file: 'src/components/WorkListPanel/IssueTypeSelector.tsx',
    needles: ['@/lib/catalyst-rules', 'filterCreatableTypes'],
    why: 'WorkListPanel create-modal type picker must pass the CRE Grid A/D filter',
  },
  {
    file: 'src/modules/project-work-hub/components/SubtasksPanel/hierarchy.ts',
    needles: ['@/lib/catalyst-rules', 'getAllowedChildTypes'],
    why: 'Subtask panel child types must derive from CRE Grid B',
  },
  {
    file: 'src/modules/project-work-hub/components/linked-work-items/LinkToolbar.tsx',
    needles: ['@/lib/catalyst-rules', 'canLinkTo'],
    why: 'Link picker candidates must pass the CRE Grid C filter',
  },
  {
    file: 'src/modules/project-work-hub/adapters/testCasesDataSource.ts',
    needles: ['@/lib/catalyst-rules', 'filterCreatableTypes'],
    why: "TestHub Test Case create catalogue must pass the CRE Grid A filter (P1-S19, E4)",
  },
  {
    file: 'src/modules/project-work-hub/adapters/defectsDataSource.ts',
    needles: ['@/lib/catalyst-rules', 'filterCreatableTypes'],
    why: "TestHub QA Bug create catalogue must pass the CRE Grid A filter (P1-S19, E4)",
  },
];

let failed = false;
for (const { file, needles, why, optional } of CHECKS) {
  const abs = path.join(process.cwd(), file);
  if (!fs.existsSync(abs)) {
    if (optional) continue;
    console.error(`✖ CRE gate: chokepoint file missing: ${file}`);
    failed = true;
    continue;
  }
  const src = fs.readFileSync(abs, 'utf8');
  for (const needle of needles) {
    if (!src.includes(needle)) {
      console.error(`✖ CRE gate: ${file} no longer references "${needle}" — ${why}.`);
      failed = true;
    }
  }
}

if (failed) {
  console.error(
    '\nCRE chokepoint gate FAILED. Create/link/parent surfaces must query',
  );
  console.error(
    '@/lib/catalyst-rules (RULE_TABLE.md is locked truth — see .claude/skills/cre/SKILL.md).',
  );
  process.exit(1);
}
console.log('✓ CRE chokepoint gate passed');
