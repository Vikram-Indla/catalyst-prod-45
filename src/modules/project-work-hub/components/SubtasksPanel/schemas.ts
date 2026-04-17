/**
 * Zod schemas for subtask create/update payloads.
 *
 * Purpose: a system-boundary validator that runs BEFORE any Supabase mutation
 * fires. Catches two real failure modes observed in production:
 *   1. Empty / whitespace-only summaries slipping through the UI.
 *   2. Wrong shape on ad-hoc callers that bypass the typed mutation hook
 *      (e.g. rapid-fire rename from keyboard shortcuts).
 *
 * These schemas validate shape only — domain rules (hierarchy, permissions)
 * still belong in hierarchy.ts and Supabase RLS respectively.
 */
import { z } from 'zod';

/** Canonical status categories used across ph_issues. */
export const statusCategorySchema = z.enum(['todo', 'in_progress', 'done']);

/** Priority canon used by the priority cell + bulk edit bar. */
export const prioritySchema = z.enum(['Critical', 'High', 'Medium', 'Low']);

/**
 * Create payload — what the inline-create flow (and AI create) sends.
 * issue_key is generated at mutation time; we only validate the user input.
 */
export const subtaskCreateInputSchema = z.object({
  summary: z.string().trim().min(1, 'Summary is required').max(255),
  issue_type: z.string().min(1),
  parent_key: z.string().min(1),
  project_key: z.string().min(1),
  priority: prioritySchema.default('Medium'),
});

export type SubtaskCreateInput = z.infer<typeof subtaskCreateInputSchema>;

/**
 * Update patch — what a row-scope mutation sends.
 * Every field optional; at least one must be present to be a meaningful patch.
 * UUID-typed columns (id) are validated at the call site, not here.
 */
export const subtaskUpdatePatchSchema = z
  .object({
    summary: z.string().trim().min(1).max(255).optional(),
    status: z.string().min(1).optional(),
    status_category: statusCategorySchema.optional(),
    priority: prioritySchema.optional(),
    assignee_account_id: z.string().nullable().optional(),
    assignee_display_name: z.string().nullable().optional(),
    issue_type: z.string().min(1).optional(),
    position: z.number().finite().optional(),
  })
  .refine((patch) => Object.keys(patch).length > 0, {
    message: 'Update patch must contain at least one field',
  });

export type SubtaskUpdatePatch = z.infer<typeof subtaskUpdatePatchSchema>;

/**
 * Convenience: safe-parse a create input and return a flat error string
 * suitable for a toast description. Returns `null` on success.
 */
export function describeCreateError(input: unknown): string | null {
  const parsed = subtaskCreateInputSchema.safeParse(input);
  if (parsed.success) return null;
  return parsed.error.issues.map((i) => i.message).join('; ');
}
