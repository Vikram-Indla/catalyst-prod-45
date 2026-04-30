/**
 * useAdminMutation — single mutation wrapper for the /admin/v2 surface.
 *
 * Phase 0 of the admin overhaul. Every write that lands in admin v2 routes
 * through this hook so we get:
 *
 *   1. A canonical `before_state` snapshot (read against RLS-enforced policies)
 *   2. A consistent audit trail in `admin_action_audit`
 *   3. Reliable cache invalidation including the audit feed itself
 *
 * The audit insert is observability, not gating: if it fails (transient
 * network, missing table during a Lovable migration window) we log to the
 * console and continue. Mutation success/failure is owned by the supplied
 * `mutationFn`.
 *
 * Usage:
 *
 *   const updateField = useAdminMutation(
 *     {
 *       action: 'update',
 *       table: 'custom_field_defs',
 *       rowId: row.id,
 *       reason: form.reason,
 *       invalidate: [['admin', 'custom-field-defs', 'ALL']],
 *     },
 *     async (vars: UpdateVars) => {
 *       const { data, error } = await typedQuery('custom_field_defs')
 *         .update(vars.patch)
 *         .eq('id', row.id)
 *         .select('*')
 *         .single();
 *       if (error) throw error;
 *       return data;
 *     },
 *   );
 *
 *   updateField.mutate({ patch: { name: 'New name' } });
 */
import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';

export type AdminMutationAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'toggle'
  | 'restore'
  | 'archive';

export interface AdminMutationContext {
  /** Logical action — surfaced in the audit log Lozenge appearance map. */
  action: AdminMutationAction;
  /** DB table name as it appears in admin_action_audit.table_name. */
  table: string;
  /** Primary key of the affected row, when known. Pass null for creates. */
  rowId?: string | null;
  /** Optional free-text justification captured from the form. Max 500 chars. */
  reason?: string;
  /** Extra react-query keys to invalidate after success. */
  invalidate?: ReadonlyArray<readonly unknown[]>;
  /**
   * Skip the before-snapshot read. Use for creates (no row yet) or when the
   * caller already has the row in hand and you want to avoid an RLS round trip.
   */
  skipBeforeSnapshot?: boolean;
}

interface AuditEnvelope {
  actor_id: string | null;
  action: AdminMutationAction;
  table_name: string;
  row_id: string | null;
  before_state: unknown | null;
  after_state: unknown | null;
  reason: string | null;
  user_agent: string | null;
}

async function readBeforeSnapshot(
  context: AdminMutationContext,
): Promise<unknown | null> {
  if (context.skipBeforeSnapshot || !context.rowId) return null;
  try {
    const { data, error } = await typedQuery(context.table)
      .select('*')
      .eq('id', context.rowId)
      .maybeSingle();
    if (error) {
      // RLS may legitimately block this; observability only, never gates the mutation.
      console.warn('[useAdminMutation] before-snapshot read failed:', error);
      return null;
    }
    return data ?? null;
  } catch (err) {
    console.warn('[useAdminMutation] before-snapshot threw:', err);
    return null;
  }
}

async function writeAuditRow(
  context: AdminMutationContext,
  before: unknown | null,
  after: unknown | null,
): Promise<void> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const envelope: AuditEnvelope = {
      actor_id: authData?.user?.id ?? null,
      action: context.action,
      table_name: context.table,
      row_id: context.rowId ?? null,
      before_state: before,
      after_state: after,
      reason: context.reason?.slice(0, 500) ?? null,
      user_agent:
        typeof navigator !== 'undefined' && navigator.userAgent
          ? navigator.userAgent.slice(0, 500)
          : null,
    };
    const { error } = await typedQuery('admin_action_audit').insert(envelope);
    if (error) {
      // Observability only.
      console.warn('[useAdminMutation] audit insert failed:', error);
    }
  } catch (err) {
    console.warn('[useAdminMutation] audit insert threw:', err);
  }
}

/**
 * The canonical admin v2 mutation hook. Wraps `useMutation` so call sites
 * still get the familiar `.mutate` / `.mutateAsync` / `isPending` ergonomics.
 */
export function useAdminMutation<TVariables, TResult>(
  context: AdminMutationContext,
  mutationFn: (variables: TVariables) => Promise<TResult>,
  options?: Omit<
    UseMutationOptions<TResult, Error, TVariables, { before: unknown | null }>,
    'mutationFn'
  >,
) {
  const queryClient = useQueryClient();

  return useMutation<TResult, Error, TVariables, { before: unknown | null }>({
    ...options,
    mutationFn: async (variables: TVariables) => {
      // Capture before-state, run mutation, audit. Audit is best-effort.
      const before = await readBeforeSnapshot(context);
      const after = await mutationFn(variables);
      await writeAuditRow(context, before, after);
      return after;
    },
    onSuccess: async (data, variables, ctx) => {
      const keys: ReadonlyArray<readonly unknown[]> = [
        ['admin', 'audit'],
        ...(context.invalidate ?? []),
      ];
      await Promise.all(
        keys.map((key) => queryClient.invalidateQueries({ queryKey: [...key] })),
      );
      if (options?.onSuccess) {
        await options.onSuccess(data, variables, ctx);
      }
    },
  });
}
