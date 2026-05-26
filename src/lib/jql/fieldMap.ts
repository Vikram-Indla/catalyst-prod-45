export type FieldType = 'string' | 'user' | 'date' | 'array' | 'number';

export interface FieldDef {
  /** Supabase column name in ph_issues */
  column: string;
  type: FieldType;
  operators: string[];
  /** Human-readable label shown in autocomplete */
  label?: string;
}

const STRING_OPS  = ['=', '!=', 'in', 'not in', 'is', 'is not'] as const;
const DATE_OPS    = ['=', '!=', '<', '>', '<=', '>='] as const;
const ARRAY_OPS   = ['=', '!=', 'in', 'not in', 'is', 'is not'] as const;
const COMPARE_OPS = ['=', '!=', '<', '>', '<=', '>=', 'in', 'not in'] as const;

export const JQL_FIELD_MAP: Record<string, FieldDef> = {
  project:     { column: 'project_key',           type: 'string', operators: [...STRING_OPS],  label: 'Project' },
  issuetype:   { column: 'issue_type',             type: 'string', operators: [...STRING_OPS],  label: 'Issue type' },
  status:      { column: 'status',                 type: 'string', operators: [...STRING_OPS],  label: 'Status' },
  assignee:    { column: 'assignee_display_name',  type: 'user',   operators: [...STRING_OPS],  label: 'Assignee' },
  reporter:    { column: 'reporter_display_name',  type: 'user',   operators: [...STRING_OPS],  label: 'Reporter' },
  priority:    { column: 'priority',               type: 'string', operators: [...COMPARE_OPS], label: 'Priority' },
  created:     { column: 'jira_created_at',        type: 'date',   operators: [...DATE_OPS],    label: 'Created' },
  updated:     { column: 'jira_updated_at',        type: 'date',   operators: [...DATE_OPS],    label: 'Updated' },
  duedate:     { column: 'due_date',               type: 'date',   operators: [...DATE_OPS],    label: 'Due date' },
  labels:      { column: 'labels',                 type: 'array',  operators: [...ARRAY_OPS],   label: 'Labels' },
  fixVersion:  { column: 'fix_versions',           type: 'array',  operators: [...ARRAY_OPS],   label: 'Fix version' },
  sprint:      { column: 'sprint_name',            type: 'string', operators: [...STRING_OPS],  label: 'Sprint' },
  resolution:  { column: 'resolution',             type: 'string', operators: [...STRING_OPS],  label: 'Resolution' },
};

/** JQL functions and what they resolve to at query time */
export const JQL_FUNCTIONS = [
  // User functions
  { value: 'currentUser()',                description: 'Current signed-in user'                  },
  { value: 'membersOf("group")',           description: 'All members of a named group'             },

  // Date functions
  { value: 'startOfWeek()',               description: 'Start of the current week'                },
  { value: 'endOfWeek()',                 description: 'End of the current week'                  },
  { value: 'startOfMonth()',              description: 'Start of the current month'               },
  { value: 'endOfMonth()',               description: 'End of the current month'                 },
  { value: 'startOfYear()',              description: 'Start of the current year'                },
  { value: 'endOfYear()',               description: 'End of the current year'                  },

  // Sprint functions
  { value: 'openSprints()',              description: 'All currently open sprints'               },
  { value: 'closedSprints()',            description: 'All closed sprints'                       },
  { value: 'futureSprints()',            description: 'All future (not yet started) sprints'     },

  // Version functions
  { value: 'latestReleasedVersion()',    description: 'The most recently released version'       },
  { value: 'earliestUnreleasedVersion()', description: 'The earliest version not yet released'  },
  { value: 'releasedVersions()',         description: 'All released versions'                    },
  { value: 'unreleasedVersions()',       description: 'All unreleased versions'                  },
];

/** Relative date shorthand: -7d, -30d, -1w, -4w */
export const DATE_SHORTHAND_RE = /^-(\d+)(d|w)$/;

export function resolveDateShorthand(value: string): string | null {
  const m = value.match(DATE_SHORTHAND_RE);
  if (!m) return null;
  const amount = parseInt(m[1], 10);
  const unit   = m[2];
  const ms     = unit === 'w' ? amount * 7 * 86_400_000 : amount * 86_400_000;
  return new Date(Date.now() - ms).toISOString();
}
