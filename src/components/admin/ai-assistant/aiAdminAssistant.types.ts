export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type CommandCategory = 'users' | 'roles' | 'permissions' | 'passwords' | 'departments';

export interface CommandStep {
  id: string;
  label: string;
  action_type: string;
  params: Record<string, unknown>;
  rollback_label?: string;
}

export interface CommandPlan {
  summary: string;
  steps: CommandStep[];
  warnings: string[];
  // Extended fields — returned by server when available
  plan_id?: string;
  risk_level?: RiskLevel;
  intent?: string;
  confidence?: number;
  entities?: { label: string; value: string }[];
  current_state?: string[];
  preserve?: string[];
  impacted_tables?: string[];
  missing_info?: string[];
}

export interface StepResult {
  id: string;
  label: string;
  status: 'success' | 'failed' | 'rolled_back' | 'skipped';
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  plan?: CommandPlan;
  steps?: StepResult[];
  rolled_back?: boolean;
}

export type AssistantStatus = 'idle' | 'loading' | 'awaiting_confirm' | 'executing';

// ── Command catalogue ─────────────────────────────────────────────────────────

export interface CatalogCommand {
  id: string;
  label: string;
  category: CommandCategory;
  risk: RiskLevel;
  fillText: string;
}

export const COMMAND_CATALOG: Record<CommandCategory, { label: string; commands: CatalogCommand[] }> = {
  users: {
    label: 'Invite users',
    commands: [
      { id: 'invite-basic',   label: 'Invite a new user',              risk: 'Low',    fillText: 'Invite john@example.com as a Backend Developer', category: 'users' },
      { id: 'invite-role',    label: 'Invite with role + department',  risk: 'Low',    fillText: 'Invite sarah@example.com as a Product Owner in the Delivery department', category: 'users' },
      { id: 'lookup-user',    label: 'Look up a user profile',         risk: 'Low',    fillText: 'Show me the profile for vikram@example.com', category: 'users' },
    ],
  },
  roles: {
    label: 'Assign roles',
    commands: [
      { id: 'assign-role',    label: 'Add a role to a user',           risk: 'Medium', fillText: 'Add Vikram as a Product Owner', category: 'roles' },
      { id: 'remove-role',    label: 'Remove a role from a user',      risk: 'Medium', fillText: 'Remove the QA Tester role from Sarah', category: 'roles' },
      { id: 'create-role',    label: 'Create a new product role',      risk: 'Medium', fillText: 'Create a new role called "Tech Lead" with permissions similar to Backend Architect', category: 'roles' },
      { id: 'deact-role',     label: 'Deactivate an existing role',    risk: 'High',   fillText: 'Deactivate the DEVOPS role', category: 'roles' },
    ],
  },
  permissions: {
    label: 'Manage permissions',
    commands: [
      { id: 'view-perms',     label: 'View permissions for a role',    risk: 'Low',    fillText: 'Show me all permissions for the Product Owner role', category: 'permissions' },
      { id: 'grant-perm',     label: 'Grant a permission to a role',   risk: 'High',   fillText: 'Allow the Business Analyst role to Create Sprint', category: 'permissions' },
      { id: 'deny-perm',      label: 'Deny a permission for a role',   risk: 'High',   fillText: 'Deny the QA Tester role from deleting stories', category: 'permissions' },
      { id: 'copy-perms',     label: 'Copy permissions from a role',   risk: 'High',   fillText: 'Copy all permissions from Backend Architect to the new Tech Lead role', category: 'permissions' },
      { id: 'override-user',  label: 'Override permission for a user', risk: 'Critical', fillText: 'Override: allow vikram@example.com to Close Sprint regardless of role', category: 'permissions' },
    ],
  },
  passwords: {
    label: 'Reset passwords',
    commands: [
      { id: 'reset-pw',       label: 'Send password reset link',       risk: 'Low',    fillText: 'Send a password reset link to sarah@example.com', category: 'passwords' },
    ],
  },
  departments: {
    label: 'Manage departments',
    commands: [
      { id: 'list-depts',     label: 'List all departments',           risk: 'Low',    fillText: 'Show me all capacity departments', category: 'departments' },
      { id: 'create-dept',    label: 'Create a new department',        risk: 'Medium', fillText: 'Create a new department called "Security Engineering"', category: 'departments' },
      { id: 'move-user-dept', label: 'Move a user to a department',    risk: 'Medium', fillText: 'Move Vikram to the Technical Support department', category: 'departments' },
    ],
  },
};

// ── Execution steps (deterministic sequence) ──────────────────────────────────

export const EXECUTION_STEPS = [
  { id: 'auth',    label: 'Validating admin authority' },
  { id: 'entity',  label: 'Resolving entities' },
  { id: 'recheck', label: 'Re-checking current database state' },
  { id: 'prepare', label: 'Preparing mutation' },
  { id: 'execute', label: 'Executing safely' },
  { id: 'audit',   label: 'Writing audit event' },
  { id: 'confirm', label: 'Confirming final state' },
] as const;

// ── Token map (consistent across all components) ──────────────────────────────

export const T = {
  text:          'var(--ds-text, #172B4D)',
  subtle:        'var(--ds-text-subtle, #44546F)',
  subtlest:      'var(--ds-text-subtlest, #626F86)',
  inverse:       'var(--ds-text-inverse, #FFFFFF)',
  brand:         'var(--ds-text-brand, #0C66E4)',
  danger:        'var(--ds-text-danger, #AE2A19)',
  success:       'var(--ds-text-success, #216E4E)',
  warning:       'var(--ds-text-warning, #974F0C)',
  surface:       'var(--ds-surface, #FFFFFF)',
  raised:        'var(--ds-surface-raised, #FFFFFF)',
  sunken:        'var(--ds-surface-sunken, #F7F8F9)',
  neutral:       'var(--ds-background-neutral, #F1F2F4)',
  hover:         'var(--ds-background-neutral-hovered, #E2E4E9)',
  selected:      'var(--ds-background-selected, #E9F2FF)',
  bgBrand:       'var(--ds-background-brand-bold, #0C66E4)',
  bgDanger:      'var(--ds-background-danger, #FFECEB)',
  bgDangerBold:  'var(--ds-background-danger-bold, #CA3521)',
  bgSuccess:     'var(--ds-background-success-bold, #1F845A)',
  bgWarning:     'var(--ds-background-warning, #FFF7D6)',
  border:        'var(--ds-border, #DCDFE4)',
  borderSubtle:  'var(--ds-border-subtle, #EBECF0)',
  borderFocus:   'var(--ds-border-focused, #388BFF)',
  iconDanger:    'var(--ds-icon-danger, #CA3521)',
  iconSuccess:   'var(--ds-icon-success, #22A06B)',
  iconWarning:   'var(--ds-icon-warning, #974F0C)',
  shadow:        'var(--ds-shadow-raised, 0 1px 4px rgba(9,30,66,0.14))',
};

export const RISK_LOZENGE: Record<RiskLevel, { appearance: 'success' | 'moved' | 'removed'; isBold?: boolean }> = {
  Low:      { appearance: 'success' },
  Medium:   { appearance: 'moved' },
  High:     { appearance: 'removed' },
  Critical: { appearance: 'removed', isBold: true },
};
