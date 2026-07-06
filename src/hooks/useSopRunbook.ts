/**
 * useSopRunbook — Phase 4 SOP execution + template hooks.
 *
 * Execution-focused read model + lifecycle mutations for the Change Detail SOP
 * runbook, plus template detail and timing-aware apply. Validation (commit /
 * evidence / mandatory-skip reason) is enforced at mutation time. Every step
 * lifecycle change writes an audit line to rh_change_activity_log (best-effort).
 * Untyped rh_* tables use the repo `as any` convention.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const TECHNICAL_STEP_TYPES = ['frontend', 'backend', 'integration', 'database', 'configuration'];

export interface SopStepFull {
  id: string; stepNo: number; title: string; description: string | null; stepType: string | null;
  ownerId: string | null; ownerName: string | null; externalOwnerName: string | null; assignedRole: string | null;
  environment: string | null; repoName: string | null; repoUrl: string | null; branch: string | null;
  frontendCommit: string | null; backendCommit: string | null; integrationCommit: string | null;
  databaseCommit: string | null; configurationCommit: string | null;
  scriptReference: string | null; commandText: string | null; expectedResult: string | null; actualResult: string | null;
  evidenceUrl: string | null; status: string; blockerReason: string | null;
  isMandatory: boolean; isTechnical: boolean; commitRequired: boolean; evidenceRequired: boolean; isRollback: boolean;
  plannedStartAt: string | null; plannedEndAt: string | null; plannedDurationMinutes: number | null;
  actualStartAt: string | null; actualEndAt: string | null; timerState: string | null;
  incidentId: string | null; defectId: string | null; productionEventId: string | null;
}

const stepCommitValue = (s: SopStepFull): string | null =>
  s.frontendCommit || s.backendCommit || s.integrationCommit || s.databaseCommit || s.configurationCommit || null;

export const mapSopStep = (s: any, ownerName: string | null): SopStepFull => ({
  id: s.id, stepNo: s.step_no, title: s.title, description: s.description, stepType: s.step_type,
  ownerId: s.owner_id, ownerName, externalOwnerName: s.external_owner_name, assignedRole: s.assigned_role,
  environment: s.environment, repoName: s.repo_name, repoUrl: s.repo_url, branch: s.branch,
  frontendCommit: s.frontend_commit, backendCommit: s.backend_commit, integrationCommit: s.integration_commit,
  databaseCommit: s.database_commit, configurationCommit: s.configuration_commit,
  scriptReference: s.script_reference, commandText: s.command_text, expectedResult: s.expected_result, actualResult: s.actual_result,
  evidenceUrl: s.evidence_url, status: s.status, blockerReason: s.blocker_reason,
  isMandatory: s.is_mandatory !== false,
  isTechnical: s.is_technical_step === true || TECHNICAL_STEP_TYPES.includes(s.step_type ?? ''),
  commitRequired: s.commit_required === true, evidenceRequired: s.evidence_required === true,
  isRollback: s.step_type === 'rollback',
  plannedStartAt: s.planned_start_at, plannedEndAt: s.planned_end_at, plannedDurationMinutes: s.planned_duration_minutes,
  actualStartAt: s.actual_start_at ?? s.started_at, actualEndAt: s.actual_end_at ?? s.completed_at, timerState: s.timer_state,
  incidentId: s.incident_id, defectId: s.defect_id, productionEventId: s.production_event_id,
});

export const useSopRunbook = (changeId: string) =>
  useQuery({
    queryKey: ['release-hub', 'changes', changeId, 'sop-runbook'],
    enabled: !!changeId,
    queryFn: async (): Promise<SopStepFull[]> => {
      const { data, error } = await supabase.from('rh_sop_steps').select('*').eq('change_id', changeId).order('step_no');
      if (error) throw error;
      const rows = (data ?? []) as any[];
      const ownerIds = [...new Set(rows.map((r) => r.owner_id).filter(Boolean))] as string[];
      const nameById: Record<string, string> = {};
      if (ownerIds.length) {
        const { data: profs } = await supabase.from('profiles').select('id, full_name, email').in('id', ownerIds);
        (profs ?? []).forEach((p: any) => { nameById[p.id] = p.full_name || p.email || 'Unknown'; });
      }
      return rows.map((r) => mapSopStep(r, r.owner_id ? (nameById[r.owner_id] ?? null) : null));
    },
  });

async function logSopEvent(changeId: string, action: string, detail: string) {
  try {
    const { data: u } = await supabase.auth.getUser();
    const { data: prof } = u.user ? await supabase.from('profiles').select('full_name').eq('id', u.user.id).maybeSingle() : { data: null };
    const name = (prof as any)?.full_name ?? 'System';
    const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
    await supabase.from('rh_change_activity_log').insert({ change_id: changeId, actor_name: name, actor_initials: initials, action, detail });
  } catch { /* audit is best-effort — never blocks execution */ }
}

export interface SopStepActionInput {
  step: SopStepFull; changeId: string;
  status?: string;
  blockerReason?: string; actualResult?: string; evidenceUrl?: string; reason?: string;
  commits?: Partial<Record<'frontend' | 'backend' | 'integration' | 'database' | 'configuration', string>>;
}

/** Validation-aware step action. Throws (message) on invalid transitions. */
export const useSopStepAction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SopStepActionInput) => {
      const { step, changeId, status } = input;
      const patch: Record<string, unknown> = {};
      const nowIso = new Date().toISOString();

      // commits patch (merge onto the step's existing values for validation)
      const merged = { ...step };
      if (input.commits) {
        const c = input.commits;
        if (c.frontend !== undefined) { patch.frontend_commit = c.frontend; merged.frontendCommit = c.frontend; }
        if (c.backend !== undefined) { patch.backend_commit = c.backend; merged.backendCommit = c.backend; }
        if (c.integration !== undefined) { patch.integration_commit = c.integration; merged.integrationCommit = c.integration; }
        if (c.database !== undefined) { patch.database_commit = c.database; merged.databaseCommit = c.database; }
        if (c.configuration !== undefined) { patch.configuration_commit = c.configuration; merged.configurationCommit = c.configuration; }
      }
      if (input.evidenceUrl !== undefined) { patch.evidence_url = input.evidenceUrl; merged.evidenceUrl = input.evidenceUrl; }
      if (input.actualResult !== undefined) { patch.actual_result = input.actualResult; merged.actualResult = input.actualResult; }
      if (input.blockerReason !== undefined) patch.blocker_reason = input.blockerReason;

      if (status !== undefined) {
        // ── validation gates ──
        if ((status === 'blocked' || status === 'failed') && !(input.blockerReason ?? step.blockerReason)) {
          throw new Error(`A reason is required to mark a step ${status}.`);
        }
        if (status === 'skipped' && step.isMandatory && !(input.reason ?? input.blockerReason)) {
          throw new Error('A mandatory step cannot be skipped without a reason.');
        }
        if (status === 'done') {
          if (merged.commitRequired && !stepCommitValue(merged)) {
            throw new Error('This step requires a commit ID before it can be marked done.');
          }
          if (merged.evidenceRequired && !merged.evidenceUrl) {
            throw new Error('This step requires evidence before it can be marked done.');
          }
          if (merged.stepType === 'validation' && !merged.actualResult) {
            throw new Error('A validation step requires an actual result before it can be marked done.');
          }
        }
        patch.status = status;
        if (status === 'in_progress') {
          patch.started_at = nowIso; patch.actual_start_at = nowIso; patch.timer_state = 'running';
        }
        if (status === 'done' || status === 'failed' || status === 'skipped') {
          patch.completed_at = nowIso; patch.actual_end_at = nowIso; patch.timer_state = 'stopped';
        }
        if (status === 'blocked') patch.timer_state = 'paused';
        if (status === 'skipped' && input.reason) patch.blocker_reason = input.reason;
      }

      const { error } = await supabase.from('rh_sop_steps').update(patch).eq('id', step.id);
      if (error) throw error;

      if (status !== undefined) {
        await logSopEvent(changeId, `SOP step ${status.replace('_', ' ')}`, `#${step.stepNo} ${step.title}`);
      } else if (input.commits) {
        await logSopEvent(changeId, 'SOP commit updated', `#${step.stepNo} ${step.title}`);
      } else if (input.evidenceUrl !== undefined) {
        await logSopEvent(changeId, 'SOP evidence updated', `#${step.stepNo} ${step.title}`);
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['release-hub', 'changes', v.changeId, 'sop-runbook'] });
      qc.invalidateQueries({ queryKey: ['release-hub', 'changes', v.changeId, 'sop-steps'] });
      qc.invalidateQueries({ queryKey: ['release-hub', 'changes'] });
    },
  });
};

export const useAssignSopStep = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ stepId, changeId, ownerId, ownerName, stepNo, title }: { stepId: string; changeId: string; ownerId: string | null; ownerName?: string; stepNo?: number; title?: string }) => {
      const { error } = await supabase.from('rh_sop_steps').update({ owner_id: ownerId }).eq('id', stepId);
      if (error) throw error;
      await logSopEvent(changeId, 'SOP step assigned', `#${stepNo} ${title} → ${ownerName ?? 'unassigned'}`);
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['release-hub', 'changes', v.changeId, 'sop-runbook'] }),
  });
};

/** Move a step up/down by swapping step_no with its neighbour. */
export const useReorderSopStep = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ changeId, stepId, stepNo, dir, steps }: { changeId: string; stepId: string; stepNo: number; dir: 'up' | 'down'; steps: SopStepFull[] }) => {
      const sorted = [...steps].sort((a, b) => a.stepNo - b.stepNo);
      const idx = sorted.findIndex((s) => s.id === stepId);
      const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return;
      const other = sorted[swapIdx];
      // temp step_no to avoid unique(change_id, step_no) collision
      await supabase.from('rh_sop_steps').update({ step_no: -1 }).eq('id', stepId);
      await supabase.from('rh_sop_steps').update({ step_no: stepNo }).eq('id', other.id);
      await supabase.from('rh_sop_steps').update({ step_no: other.stepNo }).eq('id', stepId);
      await logSopEvent(changeId, 'SOP step reordered', `#${stepNo} ↔ #${other.stepNo}`);
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['release-hub', 'changes', v.changeId, 'sop-runbook'] }),
  });
};

export interface TemplateStepPreview {
  stepNo: number; title: string; stepType: string | null; isMandatory: boolean; isRollback: boolean;
  commitRequired: boolean; evidenceRequired: boolean; defaultOwnerId: string | null; assignedRole: string | null;
  plannedStartAt: string | null; plannedEndAt: string | null; durationMinutes: number | null;
}

/** Compute the executable steps a template would generate for a change window. */
export function previewTemplateSteps(templateSteps: any[], plannedStartAt: string | null): TemplateStepPreview[] {
  const baseMs = plannedStartAt ? new Date(plannedStartAt).getTime() : null;
  return templateSteps.map((s) => {
    const offset = s.default_planned_offset_minutes ?? 0;
    const dur = s.default_duration_minutes ?? 0;
    const start = baseMs != null ? new Date(baseMs + offset * 60000) : null;
    const end = start ? new Date(start.getTime() + dur * 60000) : null;
    return {
      stepNo: s.step_no, title: s.title, stepType: s.step_type, isMandatory: s.is_mandatory !== false,
      isRollback: s.step_type === 'rollback' || s.rollback_step_flag === true,
      commitRequired: s.commit_required === true, evidenceRequired: s.evidence_required === true,
      defaultOwnerId: s.default_owner_id, assignedRole: s.default_assigned_role,
      plannedStartAt: start ? start.toISOString() : null, plannedEndAt: end ? end.toISOString() : null,
      durationMinutes: dur || null,
    };
  });
}

/** Apply a template to a change: mode 'replace' clears non-started steps first,
 *  'append' adds after existing. Copies all fields + computes planned times. */
export const useApplyTemplateWithTiming = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ templateId, changeId, mode, plannedStartAt, templateName }: { templateId: string; changeId: string; mode: 'replace' | 'append'; plannedStartAt: string | null; templateName?: string }) => {
      const { data: tSteps, error } = await supabase.from('rh_sop_template_steps').select('*').eq('template_id', templateId).order('step_no');
      if (error) throw error;

      let base = 0;
      if (mode === 'replace') {
        // remove steps that have not started (preserve history of executed steps)
        await supabase.from('rh_sop_steps').delete().eq('change_id', changeId).is('started_at', null);
        const { count } = await supabase.from('rh_sop_steps').select('*', { count: 'exact', head: true }).eq('change_id', changeId);
        base = count ?? 0;
      } else {
        const { count } = await supabase.from('rh_sop_steps').select('*', { count: 'exact', head: true }).eq('change_id', changeId);
        base = count ?? 0;
      }

      const baseMs = plannedStartAt ? new Date(plannedStartAt).getTime() : null;
      const rows = (tSteps ?? []).map((s: any, i: number) => {
        const offset = s.default_planned_offset_minutes ?? 0;
        const dur = s.default_duration_minutes ?? 0;
        const pStart = baseMs != null ? new Date(baseMs + offset * 60000).toISOString() : null;
        const pEnd = baseMs != null ? new Date(baseMs + (offset + dur) * 60000).toISOString() : null;
        return {
          change_id: changeId, template_id: templateId, step_no: base + i + 1, title: s.title,
          description: s.description ?? undefined, step_type: s.step_type ?? undefined,
          owner_id: s.default_owner_id ?? undefined, assigned_role: s.default_assigned_role ?? undefined,
          external_owner_name: s.external_owner_name ?? undefined, environment: s.environment ?? undefined,
          repo_name: s.repo_name ?? undefined, repo_url: s.repo_url ?? undefined, branch: s.branch ?? undefined,
          script_reference: s.script_reference ?? undefined, command_text: s.command_text ?? undefined,
          expected_result: s.expected_result ?? undefined,
          is_mandatory: s.is_mandatory ?? true, is_technical_step: TECHNICAL_STEP_TYPES.includes(s.step_type ?? ''),
          commit_required: s.commit_required ?? false, evidence_required: s.evidence_required ?? false,
          planned_start_at: pStart, planned_end_at: pEnd, planned_duration_minutes: dur || undefined,
          status: 'pending', timer_state: 'idle',
        };
      });
      if (rows.length > 0) {
        const { error: insErr } = await supabase.from('rh_sop_steps').insert(rows);
        if (insErr) throw insErr;
      }
      await logSopEvent(changeId, 'SOP template applied', `${templateName ?? 'template'} — ${rows.length} steps (${mode})`);
      return rows.length;
    },
    onSuccess: (_n, v) => {
      qc.invalidateQueries({ queryKey: ['release-hub', 'changes', v.changeId, 'sop-runbook'] });
      qc.invalidateQueries({ queryKey: ['release-hub', 'changes', v.changeId, 'sop-steps'] });
    },
  });
};

// ── Template list (rich) + detail ────────────────────────────────────
export interface SopTemplateFull {
  id: string; name: string; description: string | null; deploymentCategory: string | null; targetEnv: string | null;
  ownerId: string | null; estimatedDurationMinutes: number | null; riskApplicability: string | null; isActive: boolean;
  updatedAt: string | null; stepCount: number; mandatoryCount: number; technicalCount: number; evidenceCount: number; rollbackCount: number;
}

export const useSopTemplatesFull = () =>
  useQuery({
    queryKey: ['release-hub', 'sop-templates-full'],
    staleTime: 15_000,
    queryFn: async (): Promise<SopTemplateFull[]> => {
      const { data: tmpls, error } = await supabase.from('rh_sop_templates').select('*').order('name');
      if (error) throw error;
      const templates = (tmpls ?? []) as any[];
      const ids = templates.map((t) => t.id);
      const agg: Record<string, { step: number; mand: number; tech: number; ev: number; rb: number }> = {};
      if (ids.length) {
        const { data: steps } = await supabase.from('rh_sop_template_steps').select('template_id, step_type, is_mandatory, evidence_required, rollback_step_flag').in('template_id', ids);
        (steps ?? []).forEach((s: any) => {
          const e = (agg[s.template_id] ??= { step: 0, mand: 0, tech: 0, ev: 0, rb: 0 });
          e.step += 1;
          if (s.is_mandatory !== false) e.mand += 1;
          if (TECHNICAL_STEP_TYPES.includes(s.step_type ?? '')) e.tech += 1;
          if (s.evidence_required) e.ev += 1;
          if (s.rollback_step_flag || s.step_type === 'rollback') e.rb += 1;
        });
      }
      return templates.map((t) => ({
        id: t.id, name: t.name, description: t.description, deploymentCategory: t.deployment_category, targetEnv: t.target_env,
        ownerId: t.owner_id, estimatedDurationMinutes: t.estimated_duration_minutes, riskApplicability: t.risk_applicability,
        isActive: t.is_active !== false, updatedAt: t.updated_at,
        stepCount: agg[t.id]?.step ?? 0, mandatoryCount: agg[t.id]?.mand ?? 0, technicalCount: agg[t.id]?.tech ?? 0,
        evidenceCount: agg[t.id]?.ev ?? 0, rollbackCount: agg[t.id]?.rb ?? 0,
      }));
    },
  });

export interface TemplateStepDraft {
  title: string; stepType: string; defaultAssignedRole: string; environment: string;
  commitRequired: boolean; evidenceRequired: boolean; isMandatory: boolean; rollback: boolean;
  offsetMinutes: number | null; durationMinutes: number | null;
}
export interface TemplateDetail {
  id: string; name: string; description: string | null; deploymentCategory: string | null; targetEnv: string | null;
  estimatedDurationMinutes: number | null; riskApplicability: string | null; isActive: boolean; steps: TemplateStepDraft[];
}

export const useTemplateDetail = (templateId: string | null) =>
  useQuery({
    queryKey: ['release-hub', 'sop-template-detail', templateId],
    enabled: !!templateId,
    queryFn: async (): Promise<TemplateDetail | null> => {
      const { data: t } = await supabase.from('rh_sop_templates').select('*').eq('id', templateId).maybeSingle();
      if (!t) return null;
      const { data: steps } = await supabase.from('rh_sop_template_steps').select('*').eq('template_id', templateId).order('step_no');
      return {
        id: (t as any).id, name: (t as any).name, description: (t as any).description, deploymentCategory: (t as any).deployment_category,
        targetEnv: (t as any).target_env, estimatedDurationMinutes: (t as any).estimated_duration_minutes,
        riskApplicability: (t as any).risk_applicability, isActive: (t as any).is_active !== false,
        steps: (steps ?? []).map((s: any) => ({
          title: s.title, stepType: s.step_type ?? '', defaultAssignedRole: s.default_assigned_role ?? '', environment: s.environment ?? '',
          commitRequired: s.commit_required === true, evidenceRequired: s.evidence_required === true, isMandatory: s.is_mandatory !== false,
          rollback: s.rollback_step_flag === true || s.step_type === 'rollback',
          offsetMinutes: s.default_planned_offset_minutes, durationMinutes: s.default_duration_minutes,
        })),
      };
    },
  });

export const useUpsertSopTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id?: string; name: string; description?: string; deploymentCategory?: string; targetEnv?: string; estimatedDurationMinutes?: number | null; riskApplicability?: string; isActive: boolean; steps: TemplateStepDraft[] }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const tRow = {
        name: p.name, description: p.description ?? null, deployment_category: p.deploymentCategory ?? null, target_env: p.targetEnv ?? null,
        estimated_duration_minutes: p.estimatedDurationMinutes ?? null, risk_applicability: p.riskApplicability ?? null, is_active: p.isActive,
      };
      let templateId = p.id;
      if (templateId) {
        const { error } = await supabase.from('rh_sop_templates').update(tRow).eq('id', templateId);
        if (error) throw error;
        await supabase.from('rh_sop_template_steps').delete().eq('template_id', templateId);
      } else {
        const { data, error } = await supabase.from('rh_sop_templates').insert({ ...tRow, owner_id: userId ?? undefined }).select().single();
        if (error) throw error;
        templateId = (data as any).id;
      }
      const rows = p.steps.filter((s) => s.title.trim()).map((s, i) => ({
        template_id: templateId, step_no: i + 1, title: s.title.trim(),
        step_type: s.rollback ? 'rollback' : (s.stepType || null), default_assigned_role: s.defaultAssignedRole || null,
        environment: s.environment || null, commit_required: s.commitRequired, evidence_required: s.evidenceRequired,
        is_mandatory: s.isMandatory, rollback_step_flag: s.rollback,
        default_planned_offset_minutes: s.offsetMinutes ?? null, default_duration_minutes: s.durationMinutes ?? null,
      }));
      if (rows.length) {
        const { error } = await supabase.from('rh_sop_template_steps').insert(rows);
        if (error) throw error;
      }
      return templateId;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['release-hub', 'sop-templates-full'] }); qc.invalidateQueries({ queryKey: ['release-hub', 'sop-template-detail'] }); },
  });
};

export const useSetTemplateActive = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase.from('rh_sop_templates').update({ is_active: isActive }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['release-hub', 'sop-templates-full'] }),
  });
};
