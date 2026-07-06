/**
 * useGenerateProductionEvent — Phase 10 §2. Safe, explicit generate/refresh of a
 * change-level production event. Dup-prevention: one event per change (keyed on
 * change_id) — refreshes if present, inserts otherwise. Builds JSONB snapshots
 * (commits / evidence / approvers / work items) from current data so replay has
 * stored context. Never creates duplicates; never mutates other events.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useGenerateProductionEvent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ change }: { change: any }): Promise<{ eventKey: string; refreshed: boolean }> => {
      const changeId = change.id;
      const uid = (await supabase.auth.getUser()).data.user?.id;

      const [{ data: steps }, { data: cso }, { data: existing }] = await Promise.all([
        supabase.from('rh_sop_steps').select('*').eq('change_id', changeId).order('step_no'),
        supabase.from('rh_change_signoffs').select('signoff_role, status, assigned_to').eq('change_id', changeId),
        supabase.from('rh_production_events').select('id, event_key').eq('change_id', changeId).maybeSingle(),
      ]);
      const sopSteps = (steps ?? []) as any[];

      const commits_snapshot = sopSteps.flatMap((s: any) => [
        s.frontend_commit && { step: s.step_no, kind: 'frontend', commit: s.frontend_commit },
        s.backend_commit && { step: s.step_no, kind: 'backend', commit: s.backend_commit },
        s.integration_commit && { step: s.step_no, kind: 'integration', commit: s.integration_commit },
        s.database_commit && { step: s.step_no, kind: 'database', commit: s.database_commit },
        s.configuration_commit && { step: s.step_no, kind: 'configuration', commit: s.configuration_commit },
      ].filter(Boolean));
      const sop_evidence_snapshot = sopSteps.filter((s: any) => s.evidence_url || s.actual_result).map((s: any) => ({ step: s.step_no, title: s.title, evidence_url: s.evidence_url ?? null, actual_result: s.actual_result ?? null }));
      const approvers_snapshot = (cso ?? []).map((s: any) => ({ role: s.signoff_role, status: s.status, approver: s.assigned_to }));

      // deterministic result from change lifecycle
      const st = change.status;
      const result = st === 'failed' ? 'failed' : st === 'rolled_back' ? 'rollback' :
        (sopSteps.some((s: any) => s.status === 'failed') ? 'partial' :
        (st === 'implemented' || st === 'closed' || st === 'validating') ? 'success' : 'unknown');

      const actualStart = sopSteps.map((s: any) => s.actual_start_at ?? s.started_at).filter(Boolean).sort()[0] ?? change.planned_start_at ?? null;
      const actualEnds = sopSteps.map((s: any) => s.actual_end_at ?? s.completed_at).filter(Boolean).sort();
      const actualEnd = actualEnds[actualEnds.length - 1] ?? change.planned_end_at ?? null;
      const overrun = change.planned_end_at && actualEnd ? Math.max(0, Math.round((new Date(actualEnd).getTime() - new Date(change.planned_end_at).getTime()) / 60000)) : null;

      const payload: any = {
        title: `${change.chg_number} — ${change.title}`, event_type: 'deployment', event_level: 'change',
        release_id: change.release_id ?? null, change_id: changeId, target_env: change.target_env,
        deployment_result: result, deployment_status: result, deployed_at: new Date().toISOString(), deployed_by: uid ?? undefined, executed_by: uid ?? undefined,
        planned_start_at: change.planned_start_at ?? change.window_start ?? null, planned_end_at: change.planned_end_at ?? change.window_end ?? null,
        actual_start_at: actualStart, actual_end_at: actualEnd, overrun_minutes: overrun,
        commits_snapshot, sop_evidence_snapshot, approvers_snapshot,
      };

      if (existing) {
        await supabase.from('rh_production_events').update(payload).eq('id', (existing as any).id);
        return { eventKey: (existing as any).event_key ?? (existing as any).id, refreshed: true };
      }
      const eventKey = `PE-${String(change.chg_number).replace(/[^0-9A-Za-z]/g, '').slice(-6) || Date.now().toString().slice(-6)}`;
      const { data: created, error } = await supabase.from('rh_production_events').insert({ ...payload, event_key: eventKey }).select('id, event_key').single();
      if (error) throw error;
      return { eventKey: (created as any).event_key ?? eventKey, refreshed: false };
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['release-hub'] }); },
  });
};
