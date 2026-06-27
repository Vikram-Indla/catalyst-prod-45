// Shared types for the AI Admin Console.
export type Category =
  | 'Users' | 'Roles' | 'Permissions' | 'Departments'
  | 'Module access' | 'Bulk operations' | 'Learned';

export type Risk = 'Low' | 'Medium' | 'High';

export interface Command {
  cat: Category;
  /** Plain title shown in the library/palette, e.g. "Delete a user". */
  title: string;
  /** One-line plain description (no jargon). */
  desc: string;
  /** Plain runnable example loaded into the composer on pick. */
  example: string;
  risk: Risk;
  bulk?: boolean;
  /** Lowercase verb alias used for matching, e.g. "delete user". */
  slug: string;
  /** Extra keywords for fuzzy matching. */
  keywords: string;
}

export interface LearnedCommand extends Command {
  learned: true;
}

export type RunPhase = 'thinking' | 'steps';

export interface RunState {
  phase: RunPhase;
  title: string;
  request: string;
  risk: Risk;
  bulk: boolean;
  count: number;
  labels: string[];
  cur: number;
  novel: boolean;
  cmd: Command | null;
}

export interface ConfirmState {
  risk: Risk;
  destructive: boolean;
  title: string;
  body: string;
}

export interface ConfirmationEntry {
  id: string;
  headline: string;
  request: string;
  summary: string;
  novel: boolean;
  time: string;
  auditId: string;
  bulk: boolean;
}

export interface ActivityItem {
  initials: string;
  avatarBg: string;
  name: string;
  action: string;
  meta: string;
  result: 'Done' | 'Pending' | 'Stopped';
}

export interface CommandView {
  title: string;
  desc: string;
  risk: Risk;
  bulk: boolean;
  cat: Category;
  onPick: () => void;
}
export interface CommandGroup {
  cat: Category;
  count: number;
  items: CommandView[];
}

// Edge function types (mirrors supabase/functions/ai-admin-assistant/index.ts)
export type ActionType =
  | 'invite_user' | 'assign_product_role' | 'remove_from_role'
  | 'create_role' | 'update_permissions' | 'deactivate_role'
  | 'delete_user' | 'reset_password';

export interface CommandStep {
  id: string;
  label: string;
  action_type: ActionType;
  params: Record<string, unknown>;
  rollback_label?: string;
}

export interface CommandPlan {
  summary: string;
  steps: CommandStep[];
  warnings: string[];
}

export interface StepResult {
  id: string;
  label: string;
  status: 'success' | 'failed' | 'rolled_back' | 'skipped';
  error?: string;
}
