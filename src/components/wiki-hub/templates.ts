/**
 * Wiki page templates (CAT-DOCS-NOTION-20260704-001 P9).
 * BlockNote block JSON — BRD, technical spec, meeting notes.
 * Partial blocks (no ids) — BlockNote assigns ids on insert.
 */

export interface WikiTemplate {
  key: string;
  name: string;
  description: string;
  icon: string;
  blocks: unknown[];
}

const h = (level: 1 | 2 | 3, text: string) => ({
  type: 'heading',
  props: { level },
  content: text,
});
const p = (text = '') => ({ type: 'paragraph', content: text });
const bullet = (text: string) => ({ type: 'bulletListItem', content: text });
const todo = (text: string) => ({ type: 'checkListItem', content: text });

export const WIKI_TEMPLATES: WikiTemplate[] = [
  {
    key: 'brd',
    name: 'Business requirements document',
    description: 'Problem, scope, requirements, acceptance criteria',
    icon: '📋',
    blocks: [
      h(1, 'Business requirements document'),
      p('One-paragraph summary of what this initiative delivers and why it matters.'),
      h(2, 'Problem statement'),
      p(''),
      h(2, 'Goals and success metrics'),
      bullet('Goal 1 — measurable outcome'),
      bullet('Goal 2 — measurable outcome'),
      h(2, 'Scope'),
      h(3, 'In scope'),
      bullet(''),
      h(3, 'Out of scope'),
      bullet(''),
      h(2, 'Requirements'),
      p('Number each requirement (BR-1, BR-2, …) and link the work items that implement it with @.'),
      h(3, 'BR-1 —'),
      p(''),
      h(2, 'Assumptions and constraints'),
      bullet(''),
      h(2, 'Acceptance criteria'),
      todo(''),
      h(2, 'Stakeholders'),
      bullet('Sponsor —'),
      bullet('Product owner —'),
      bullet('Engineering lead —'),
    ],
  },
  {
    key: 'tech-spec',
    name: 'Technical specification',
    description: 'Architecture, data model, rollout, risks',
    icon: '⚙️',
    blocks: [
      h(1, 'Technical specification'),
      p('What is being built, in one paragraph. Link the epic with @.'),
      h(2, 'Context and current state'),
      p(''),
      h(2, 'Proposed design'),
      p(''),
      h(2, 'Data model changes'),
      p(''),
      h(2, 'API and integration contracts'),
      p(''),
      h(2, 'Rollout plan'),
      bullet('Phase 1 —'),
      bullet('Phase 2 —'),
      h(2, 'Risks and mitigations'),
      bullet(''),
      h(2, 'Open questions'),
      todo(''),
    ],
  },
  {
    key: 'meeting-notes',
    name: 'Meeting notes',
    description: 'Attendees, discussion, decisions, actions',
    icon: '🗓️',
    blocks: [
      h(1, 'Meeting notes'),
      p('Date, time, and purpose.'),
      h(2, 'Attendees'),
      bullet(''),
      h(2, 'Discussion'),
      p(''),
      h(2, 'Decisions'),
      bullet(''),
      h(2, 'Action items'),
      todo('Owner — action — due date'),
    ],
  },
];
