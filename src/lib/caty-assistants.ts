import type { UserRole, ProductRoleCode } from '@/hooks/useUserRole';

export type AssistantId =
  | 'general'
  | 'epic'
  | 'story'
  | 'business-request'
  | 'defect'
  | 'incident'
  | 'release';

export interface CatyAssistant {
  id: AssistantId;
  name: string;
  tagline: string;
  // Matches JiraIssueTypeIcon registry; null = use Caty gradient mark
  iconType: string | null;
  // ADS token for accent colour (avatar bg, active border)
  accentToken: string;
  // ADS subtler token for clean tile background in picker (light tinted surface)
  tileBgToken: string;
  minSystemRole: UserRole;
  allowedProductRoles: ProductRoleCode[];
  lockedMessage: string;
  suggestions: [string, string, string];
  // Rotates daily — index = Math.floor(Date.now() / 86400000) % prompts.length
  prompts: string[];
}

const ROLE_LEVEL: Record<string, number> = {
  admin: 4,
  program_manager: 3,
  team_lead: 2,
  user: 1,
};

export const CATY_ASSISTANTS: CatyAssistant[] = [
  {
    id: 'general',
    name: 'Ask Caty',
    tagline: 'General Catalyst assistant — projects, epics, and work items',
    iconType: null,
    accentToken: 'var(--ds-background-brand-bold)',
    tileBgToken: 'var(--ds-background-accent-blue-subtler)',
    minSystemRole: 'user',
    allowedProductRoles: [
      'developer', 'qa_tester', 'product_owner', 'product_manager',
      'super_admin', 'enterprise_architect', 'project_manager',
    ],
    lockedMessage: 'Sign in to use Ask Caty',
    suggestions: [
      'What should I work on next?',
      'Are any of my work items overdue?',
      'Write an update about my week.',
    ],
    prompts: [
      'Summarize all open epics in this sprint',
      'Which team members have the most open items?',
      'What blockers exist across active projects?',
      'Give me a status report for BAU project',
    ],
  },
  {
    id: 'epic',
    name: 'Epic Assistant',
    tagline: 'Summarize epics, list child stories, identify gaps',
    iconType: 'Epic',
    accentToken: 'var(--ds-background-accent-purple-bolder)',
    tileBgToken: 'var(--ds-background-accent-purple-subtler)',
    minSystemRole: 'team_lead',
    allowedProductRoles: ['product_owner', 'product_manager', 'enterprise_architect', 'project_manager'],
    lockedMessage: 'Epic Assistant requires Team Lead or Product role',
    suggestions: [
      'Summarize epic BAU-45',
      'List child stories for BAU-45',
      'Find coverage gaps in BAU-45',
    ],
    prompts: [
      'Draft a description for an authentication epic',
      'Which epics are behind schedule?',
      'Show cross-epic dependencies for BAU',
    ],
  },
  {
    id: 'story',
    name: 'Story Assistant',
    tagline: 'Break down epics into stories — provide an epic key to start',
    iconType: 'Story',
    accentToken: 'var(--ds-background-accent-blue-bolder)',
    tileBgToken: 'var(--ds-background-accent-blue-subtler)',
    minSystemRole: 'program_manager',
    allowedProductRoles: ['product_owner', 'product_manager'],
    lockedMessage: 'Story breakdown requires Product Owner or Program Manager access',
    suggestions: [
      'Break down epic BAU-45 into stories',
      'Draft acceptance criteria for BAU-123',
      'Review story coverage for BAU-45',
    ],
    prompts: [
      'Break down an epic for a payment gateway feature',
      'Generate Given/When/Then ACs for a login story',
      'How many stories should an epic contain?',
    ],
  },
  {
    id: 'business-request',
    name: 'Business Request Assistant',
    tagline: 'Draft BRs, suggest priority, link to existing epics',
    iconType: 'Business Request',
    accentToken: 'var(--ds-background-accent-yellow-bolder)',
    tileBgToken: 'var(--ds-background-accent-yellow-subtler)',
    minSystemRole: 'program_manager',
    allowedProductRoles: ['product_owner', 'product_manager', 'enterprise_architect'],
    lockedMessage: 'Business Request Assistant requires Program Manager or Product Owner access',
    suggestions: [
      'Draft a business request for a new feature',
      'Which BRs are awaiting approval?',
      'Link BR-12 to existing epics',
    ],
    prompts: [
      'Draft a BR for a customer self-service portal',
      'Summarize pending BRs by requestor',
      'Which BRs have no linked epics?',
    ],
  },
  {
    id: 'defect',
    name: 'Defect Assistant',
    tagline: 'Draft defect reports, find similar bugs, suggest severity',
    iconType: 'QA Bug',
    accentToken: 'var(--ds-background-accent-red-bolder)',
    tileBgToken: 'var(--ds-background-accent-red-subtler)',
    minSystemRole: 'user',
    allowedProductRoles: [
      'developer', 'qa_tester', 'product_owner', 'product_manager',
      'super_admin', 'enterprise_architect', 'project_manager',
    ],
    lockedMessage: 'Sign in to use Defect Assistant',
    suggestions: [
      'Draft a defect for a login issue',
      'Find similar defects to BAU-789',
      'Which defects are blocking release?',
    ],
    prompts: [
      'Write a defect for a payment processing error',
      'Find duplicate defects in BAU project',
      'What is the defect escape rate this sprint?',
    ],
  },
  {
    id: 'incident',
    name: 'Production Incident Assistant',
    tagline: 'Draft incident summaries, timelines, and follow-up tasks',
    iconType: 'Production Incident',
    accentToken: 'var(--ds-background-danger-bold)',
    tileBgToken: 'var(--ds-background-accent-orange-subtler)',
    minSystemRole: 'team_lead',
    allowedProductRoles: ['product_owner', 'product_manager', 'enterprise_architect', 'project_manager'],
    lockedMessage: 'Incident Assistant requires Team Lead or above',
    suggestions: [
      'Draft incident summary for BAU-901',
      'Generate a timeline for last incident',
      'Create follow-up tasks for BAU-901',
    ],
    prompts: [
      'Write an incident report for a database outage',
      'What open incidents need a post-mortem?',
      'Draft a root cause analysis template',
    ],
  },
  {
    id: 'release',
    name: 'Release Assistant',
    tagline: 'Summarize releases, check completion, draft release notes',
    iconType: 'Feature',
    accentToken: 'var(--ds-background-accent-green-bolder)',
    tileBgToken: 'var(--ds-background-accent-green-subtler)',
    minSystemRole: 'team_lead',
    allowedProductRoles: ['product_owner', 'product_manager', 'enterprise_architect', 'project_manager'],
    lockedMessage: 'Release Assistant requires Team Lead or above',
    suggestions: [
      'Summarize Sprint 2.2 release',
      'Check completion % for next release',
      'Draft release notes for v1.4',
    ],
    prompts: [
      'What is the status of the current release?',
      'List blocked stories in Sprint 2.2',
      'Draft customer-facing release notes for v1.4',
    ],
  },
];

export function canUseAssistant(
  assistant: CatyAssistant,
  systemRole: UserRole,
  productRoles: ProductRoleCode[],
): boolean {
  const userLevel = ROLE_LEVEL[systemRole ?? 'user'] ?? 1;
  const minLevel = ROLE_LEVEL[assistant.minSystemRole ?? 'user'] ?? 1;
  if (userLevel >= minLevel) return true;
  return productRoles.some((pr) => (assistant.allowedProductRoles as string[]).includes(pr));
}

export function getDailyPrompt(assistant: CatyAssistant): string {
  const dayIndex = Math.floor(Date.now() / 86400000);
  return assistant.prompts[dayIndex % assistant.prompts.length];
}
