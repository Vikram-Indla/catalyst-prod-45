/**
 * useSignoffGraph — Phase 7 sign-off dependency model + actions.
 *
 * Builds the release → change → gate tree from rh_release_signoffs +
 * rh_change_signoffs + rh_change_release_links + rh_emergency_overrides, plus a
 * flat queue for the table fallback. Unified approve/reject targets the right
 * table by scope; request-sign-off and emergency-override lifecycle hooks write
 * the same rows the rest of Release Ops reads (shared query-key invalidation →
 * cross-view consistency). Untyped rh_* → `as any` per repo convention.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type SignoffStatus = 'pending' | 'approved' | 'rejected' | 'skipped' | 'auto_approved' | 'bypassed' | 'overridden' | string;
export interface Gate {
  id: string; scope: 'change' | 'release'; role: string | null; stage: string | null; status: SignoffStatus;
  assignedTo: string | null; approverName: string | null; requestedBy: string | null; requestedByName: string | null;
  requestedAt: string | null; dueDate: string | null; decidedAt: string | null; comment: string | null;
  overrideId: string | null; overdue: boolean; blocking: boolean;
}
export interface OverrideRow {
  id: string; scope: string; releaseId: string | null; changeId: string | null; signoffId: string | null;
  bypassedGate: string | null; reason: string | null; status: string; requestedByName: string | null;
  approvedByName: string | null; approvedAt: string | null; rejectedByName: string | null; rejectedAt: string | null;
}
export interface ChangeNode {
  id: string; chgNumber: string; title: string; slug: string | null; risk: string | null; targetEnv: string | null;
  status: string; isEmergency: boolean; gates: Gate[]; override: OverrideRow | null;
}
export interface ReleaseNode {
  id: string; name: string; slug: string | null; targetEnv: string | null; status: string;
  gates: Gate[]; changes: ChangeNode[]; override: OverrideRow | null;
}
export interface SignoffGraph { releases: ReleaseNode[]; orphanChanges: ChangeNode[]; flat: Gate[]; }

const isOverdue = (g: any) => g.status === 'pending' && g.due_date != null && new Date(g.due_date).getTime() < Date.now();
const isBlocking = (s: string) => s === 'pending' || s === 'rejected';

export const useSignoffGraph = () =>
  useQuery({
    queryKey: ['release-hub', 'signoff-graph'],
    staleTime: 15_000,
    queryFn: async (): Promise<SignoffGraph> => {
      const [relSoRes, chSoRes, ovrRes] = await Promise.all([
        supabase.from('rh_release_signoffs' as any).select('*'),
        supabase.from('rh_change_signoffs').select('*'),
        supabase.from('rh_emergency_overrides' as any).select('*'),
      ]);
      const relSo = ((relSoRes as any).data ?? []) as any[];
      const chSo = (chSoRes.data ?? []) as any[];
      const overrides = ((ovrRes as any).data ?? []) as any[];

      const relIds = [...new Set(relSo.map((s) => s.release_id).filter(Boolean))] as string[];
      const chIds = [...new Set(chSo.map((s) => s.change_id).filter(Boolean))] as string[];

      const [relRes, chRes, linkRes] = await Promise.all([
        relIds.length ? supabase.from('rh_releases').select('id, name, slug, target_env, status').in('id', relIds) : Promise.resolve({ data: [] as any[] }),
        chIds.length ? supabase.from('rh_changes').select('id, chg_number, title, slug, risk_level, target_env, status, is_emergency_override').in('id', chIds) : Promise.resolve({ data: [] as any[] }),
        chIds.length ? supabase.from('rh_change_release_links').select('change_id, release_id').in('change_id', chIds).is('unlinked_at', null) : Promise.resolve({ data: [] as any[] }),
      ]);
      const relById: Record<string, any> = {}; ((relRes as any).data ?? []).forEach((r: any) => { relById[r.id] = r; });
      const chById: Record<string, any> = {}; ((chRes as any).data ?? []).forEach((c: any) => { chById[c.id] = c; });

      // profiles
      const pIds = [...new Set([...relSo, ...chSo].flatMap((s) => [s.assigned_to, s.requested_by]).filter(Boolean), ...overrides.flatMap((o) => [o.requested_by, o.approved_by, o.rejected_by]).filter(Boolean))] as string[];
      const nameById: Record<string, string> = {};
      if (pIds.length) { const { data } = await supabase.from('profiles').select('id, full_name, email').in('id', pIds); (data ?? []).forEach((p: any) => { nameById[p.id] = p.full_name || p.email || 'Unknown'; }); }

      const mapOverride = (o: any): OverrideRow => ({
        id: o.id, scope: o.scope, releaseId: o.release_id, changeId: o.change_id, signoffId: o.signoff_id, bypassedGate: o.bypassed_gate,
        reason: o.reason, status: o.status, requestedByName: o.requested_by ? nameById[o.requested_by] ?? null : null,
        approvedByName: o.approved_by ? nameById[o.approved_by] ?? null : null, approvedAt: o.approved_at,
        rejectedByName: o.rejected_by ? nameById[o.rejected_by] ?? null : null, rejectedAt: o.rejected_at,
      });
      const overrideForChange = (id: string) => overrides.filter((o) => o.change_id === id).map(mapOverride).sort((a, b) => (b.status === 'approved' ? 1 : 0) - (a.status === 'approved' ? 1 : 0))[0] ?? null;
      const overrideForRelease = (id: string) => overrides.filter((o) => o.release_id === id && !o.change_id).map(mapOverride)[0] ?? null;

      const toGate = (s: any, scope: 'change' | 'release'): Gate => ({
        id: s.id, scope, role: s.signoff_role, stage: s.stage, status: s.status, assignedTo: s.assigned_to,
        approverName: s.assigned_to ? nameById[s.assigned_to] ?? null : null,
        requestedBy: s.requested_by, requestedByName: s.requested_by ? nameById[s.requested_by] ?? null : null,
        requestedAt: s.requested_at, dueDate: s.due_date, decidedAt: s.decided_at ?? s.actioned_at, comment: s.comment,
        overrideId: s.emergency_override_id, overdue: isOverdue(s), blocking: isBlocking(s.status),
      });

      // change nodes
      const chGates: Record<string, Gate[]> = {};
      chSo.forEach((s) => { (chGates[s.change_id] ??= []).push(toGate(s, 'change')); });
      const changeNode = (id: string): ChangeNode | null => {
        const c = chById[id]; if (!c) return null;
        return { id, chgNumber: c.chg_number, title: c.title, slug: c.slug, risk: c.risk_level, targetEnv: c.target_env, status: c.status, isEmergency: c.is_emergency_override === true, gates: chGates[id] ?? [], override: overrideForChange(id) };
      };

      // change → release map
      const chToRel: Record<string, string[]> = {};
      ((linkRes as any).data ?? []).forEach((l: any) => { (chToRel[l.change_id] ??= []).push(l.release_id); });

      // release nodes
      const relGates: Record<string, Gate[]> = {};
      relSo.forEach((s) => { (relGates[s.release_id] ??= []).push(toGate(s, 'release')); });
      const releaseIds = [...new Set([...relIds, ...Object.values(chToRel).flat()])];
      const releases: ReleaseNode[] = releaseIds.map((id) => {
        const r = relById[id]; if (!r) return null;
        const changes = chIds.filter((cid) => (chToRel[cid] ?? []).includes(id)).map(changeNode).filter(Boolean) as ChangeNode[];
        return { id, name: r.name, slug: r.slug, targetEnv: r.target_env, status: r.status, gates: relGates[id] ?? [], changes, override: overrideForRelease(id) };
      }).filter(Boolean) as ReleaseNode[];

      const linkedChangeIds = new Set(Object.keys(chToRel).filter((cid) => (chToRel[cid] ?? []).length > 0));
      const orphanChanges = chIds.filter((id) => !linkedChangeIds.has(id)).map(changeNode).filter(Boolean) as ChangeNode[];
      const flat = [...relSo.map((s) => toGate(s, 'release')), ...chSo.map((s) => toGate(s, 'change'))];

      return { releases, orphanChanges, flat };
    },
  });

const INVALIDATE = ['release-hub'];
function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  ['signoff-graph', 'changes', 'timeline-ops', 'my-execution'].forEach((k) => qc.invalidateQueries({ queryKey: [...INVALIDATE] }));
  qc.invalidateQueries({ queryKey: ['release-hub'] });
}

/** Approve / reject a gate on the correct table by scope. Reject requires comment. */
export const useSignoffAction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ gate, action, comment }: { gate: Gate; action: 'approve' | 'reject'; comment?: string }) => {
      if (action === 'reject' && !comment?.trim()) throw new Error('A reason is required to reject a sign-off.');
      const uid = (await supabase.auth.getUser()).data.user?.id;
      const table = gate.scope === 'release' ? 'rh_release_signoffs' : 'rh_change_signoffs';
      const patch = { status: action === 'approve' ? 'approved' : 'rejected', actioned_at: new Date().toISOString(), actioned_by: uid ?? undefined, decided_at: new Date().toISOString(), comment: comment ?? undefined };
      const { error } = await supabase.from(table as any).update(patch).eq('id', gate.id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(qc),
  });
};

export const useRequestSignoff = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { scope: 'change' | 'release'; entityId: string; role: string; approverId?: string; dueDate?: string; reason?: string }) => {
      const uid = (await supabase.auth.getUser()).data.user?.id;
      const table = p.scope === 'release' ? 'rh_release_signoffs' : 'rh_change_signoffs';
      const idCol = p.scope === 'release' ? 'release_id' : 'change_id';
      // prevent duplicate pending for same scope/role/approver
      const { data: existing } = await supabase.from(table as any).select('id').eq(idCol, p.entityId).eq('signoff_role', p.role).eq('status', 'pending');
      if ((existing ?? []).length > 0) throw new Error('A pending sign-off for this role already exists.');
      const row: any = { scope: p.scope, [idCol]: p.entityId, signoff_role: p.role, stage: p.role, status: 'pending', assigned_to: p.approverId ?? null, requested_by: uid ?? null, requested_at: new Date().toISOString(), due_date: p.dueDate ?? null, comment: p.reason ?? null };
      const { error } = await supabase.from(table as any).insert(row);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(qc),
  });
};

export const useRequestOverride = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { scope: string; changeId?: string; releaseId?: string; signoffId?: string; bypassedGate: string; reason: string }) => {
      if (!p.reason.trim()) throw new Error('Emergency override requires a reason.');
      const uid = (await supabase.auth.getUser()).data.user?.id;
      const { error } = await supabase.from('rh_emergency_overrides' as any).insert({ scope: p.scope, change_id: p.changeId ?? null, release_id: p.releaseId ?? null, signoff_id: p.signoffId ?? null, bypassed_gate: p.bypassedGate, reason: p.reason.trim(), status: 'requested', requested_by: uid ?? null, requested_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(qc),
  });
};

export const useDecideOverride = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ overrideId, action, comment, changeId }: { overrideId: string; action: 'approve' | 'reject'; comment: string; changeId?: string }) => {
      if (!comment?.trim()) throw new Error('A decision comment is required.');
      const uid = (await supabase.auth.getUser()).data.user?.id;
      const now = new Date().toISOString();
      const patch = action === 'approve'
        ? { status: 'approved', approved_by: uid ?? undefined, approved_at: now, audit_payload: { comment } }
        : { status: 'rejected', rejected_by: uid ?? undefined, rejected_at: now, audit_payload: { comment } };
      const { error } = await supabase.from('rh_emergency_overrides' as any).update(patch).eq('id', overrideId);
      if (error) throw error;
      // approved change override flags the change (marker consistency)
      if (action === 'approve' && changeId) await supabase.from('rh_changes').update({ is_emergency_override: true, override_approver_id: uid ?? undefined }).eq('id', changeId);
    },
    onSuccess: () => invalidateAll(qc),
  });
};
