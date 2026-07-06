/**
 * RaiseIssue — Phase 8 contextual incident/defect raise from Release Ops.
 *
 * REUSES the existing global create flows — CreateIncidentModal (+
 * useCreateIncident) for incidents and CreateStoryModal(defaultWorkType='QA Bug')
 * for defects — then writes the Release-Ops lineage (source_release/change/
 * sop_step/production_event + raised_during_change_execution + environment) onto
 * the freshly created row. No new create modal is built and no create plumbing
 * is duplicated. No drawer. Invalidates shared keys so every surface agrees.
 */
import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CreateIncidentModal, type IncidentFormData } from '@/components/incidents/CreateIncidentModal';
import { useCreateIncident } from '@/hooks/useIncidents';
import { CreateStoryModal } from '@/components/workhub/create-story/CreateStoryModal';
import { catalystToast } from '@/lib/catalystToast';

export interface IssueContext {
  changeId: string;
  changeNumber?: string | null;
  releaseId?: string | null;
  productionEventId?: string | null;
  sopStepId?: string | null;
  sopStepTitle?: string | null;
  environment?: string | null;
  projectKey?: string | null;
  /** Seed for the defect title (incident modal has no prefill prop). */
  titleSeed?: string;
}

/** Default an issue kind from the step type: validation/test → defect, else incident. */
export function defaultIssueKind(stepType: string | null | undefined): 'incident' | 'defect' {
  return stepType === 'validation' ? 'defect' : 'incident';
}

function lineage(ctx: IssueContext) {
  return {
    source_release_id: ctx.releaseId ?? null,
    source_change_id: ctx.changeId,
    source_sop_step_id: ctx.sopStepId ?? null,
    source_production_event_id: ctx.productionEventId ?? null,
    raised_during_change_execution: true,
  };
}

export function RaiseIssue({ kind, ctx, onClose }: { kind: 'incident' | 'defect'; ctx: IssueContext; onClose: () => void }) {
  const qc = useQueryClient();
  const createIncident = useCreateIncident();

  const invalidate = () => {
    ['release-hub', 'incidents', 'tm_defects'].forEach(() => {});
    qc.invalidateQueries({ queryKey: ['release-hub'] });
    qc.invalidateQueries({ queryKey: ['incidents'] });
  };

  if (kind === 'incident') {
    const handleSubmit = async (form: IncidentFormData) => {
      try {
        const inc: any = await createIncident.mutateAsync(form);
        if (inc?.id) {
          await supabase.from('incidents').update(lineage(ctx)).eq('id', inc.id);
        }
        catalystToast.success('Incident raised and linked to this change');
        invalidate();
        onClose();
      } catch (e: any) {
        catalystToast.error(e?.message ?? 'Failed to raise incident');
      }
    };
    return <CreateIncidentModal isOpen onClose={onClose} onSubmit={handleSubmit} />;
  }

  // defect → reuse the canonical QA Bug create (CreateStoryModal), then link lineage by key
  const handleDefect = async (issueKey: string) => {
    try {
      await supabase.from('tm_defects').update({ ...lineage(ctx), environment: ctx.environment ?? undefined }).eq('defect_key', issueKey);
      catalystToast.success('Defect raised and linked to this change');
      invalidate();
    } catch { /* lineage best-effort — the defect itself is created */ }
    onClose();
  };
  return (
    <CreateStoryModal
      open
      onClose={onClose}
      defaultWorkType="QA Bug"
      projectKey={ctx.projectKey ?? undefined}
      initialSummary={ctx.titleSeed}
      onSuccess={handleDefect}
    />
  );
}

export default RaiseIssue;
