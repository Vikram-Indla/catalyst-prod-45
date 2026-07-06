/**
 * TestCaseAiCluster — case-view AI assist cluster (CAT-TESTHUB-V2 slice D6).
 *
 * The only sanctioned AI control (CatyIconCTA) drives Complete / Improve /
 * Correct / Convert-to-UAT (case-edit ops) and Coverage (analysis). Every
 * result is a DRAFT PROPOSAL rendered in a review strip; nothing touches the
 * DB until the human clicks Accept. Case edits replace title/objective/
 * preconditions + steps atomically; coverage is read-only insight.
 */
import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';
import SectionMessage from '@atlaskit/section-message';
import { CatyIconCTA } from '@/components/ui/CatyIconCTA';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import {
  useTmAssist,
  type TmAssistOp,
  type TmAssistCaseEdit,
  type TmAssistAnalysis,
} from '@/hooks/test-management/useTmAssist';

const CASE_OPS: Array<{ op: TmAssistOp; label: string }> = [
  { op: 'complete', label: 'Complete' },
  { op: 'improve', label: 'Improve' },
  { op: 'correct', label: 'Correct' },
  { op: 'convert_uat', label: 'To UAT' },
  { op: 'coverage', label: 'Coverage' },
];

const CASE_EDIT_OPS = new Set<TmAssistOp>(['complete', 'improve', 'correct', 'convert_uat']);

export function TestCaseAiCluster({
  caseKey,
  caseId,
  projectId,
  status,
}: {
  caseKey: string;
  caseId: string;
  projectId: string | null;
  status?: string;
}) {
  const qc = useQueryClient();
  const assist = useTmAssist<TmAssistCaseEdit | TmAssistAnalysis>();
  const [activeOp, setActiveOp] = useState<TmAssistOp | null>(null);
  const [proposal, setProposal] = useState<{ op: TmAssistOp; result: TmAssistCaseEdit | TmAssistAnalysis } | null>(null);
  const [applying, setApplying] = useState(false);

  // Published/approved cases are immutable — AI edits only make sense on a
  // draft (repository master before publish). Coverage analysis is always fine.
  const isDraft = (status ?? '').toLowerCase() === 'draft';

  const run = (op: TmAssistOp, language: 'en' | 'ar' = 'en') => {
    setActiveOp(op);
    setProposal(null);
    assist.mutate(
      { op, language, project_id: projectId, case_key: caseKey },
      {
        onSuccess: (res) => setProposal({ op, result: res.result }),
        onError: (e) => catalystToast.error('AI request failed', e.message),
        onSettled: () => setActiveOp(null),
      },
    );
  };

  const acceptCaseEdit = async (edit: TmAssistCaseEdit) => {
    setApplying(true);
    try {
      // Case fields
      const { error: updErr } = await supabase
        .from('tm_test_cases')
        .update({
          title: edit.updated_case.title,
          description: edit.updated_case.objective,
          preconditions: edit.updated_case.preconditions,
          // A case touched by AI becomes hybrid origin (D-002 taxonomy)
          origin: 'hybrid',
        } as never)
        .eq('id', caseId);
      if (updErr) throw updErr;

      // Steps: replace wholesale (soft-delete existing, insert proposed)
      await supabase.from('tm_test_steps').update({ deleted_at: new Date().toISOString() } as never).eq('test_case_id', caseId).is('deleted_at', null);
      if (edit.updated_case.steps.length > 0) {
        const { error: insErr } = await supabase.from('tm_test_steps').insert(
          edit.updated_case.steps.map((s, i) => ({
            test_case_id: caseId,
            step_number: i + 1,
            action: s.action,
            expected_result: s.expected_result,
            test_data: s.test_data || null,
          })) as never,
        );
        if (insErr) throw insErr;
      }

      qc.invalidateQueries({ queryKey: ['tm-case', caseId] });
      qc.invalidateQueries({ queryKey: ['tm-case-steps', caseId] });
      catalystToast.success('AI draft applied — review and publish when ready');
      setProposal(null);
    } catch (e) {
      catalystToast.error('Failed to apply AI draft', (e as Error).message);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div style={{ border: '1px solid var(--ds-border)', borderRadius: 8, padding: 12, marginBottom: 12, background: 'var(--ds-surface-sunken)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <CatyIconCTA tooltip="Caty test assist" onClick={() => run('improve')} isLoading={assist.isPending && activeOp === 'improve'} />
        <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)', fontWeight: 600 }}>Caty assist</span>
        <span style={{ flex: 1 }} />
        {CASE_OPS.map(({ op, label }) => {
          const disabled = CASE_EDIT_OPS.has(op) && !isDraft;
          return (
            <Button
              key={op}
              appearance="subtle"
              spacing="compact"
              isDisabled={disabled || assist.isPending}
              isLoading={assist.isPending && activeOp === op}
              onClick={() => run(op)}
            >
              {label}
            </Button>
          );
        })}
      </div>

      {!isDraft && (
        <div style={{ marginTop: 6, fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)' }}>
          This case is published — edits are locked. Coverage analysis is still available.
        </div>
      )}

      {assist.isPending && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, color: 'var(--ds-text-subtle)', fontSize: 'var(--ds-font-size-300)' }}>
          <Spinner size="small" /> Caty is thinking…
        </div>
      )}

      {proposal && !assist.isPending && (
        <div style={{ marginTop: 10, border: '1px solid var(--ds-border)', borderRadius: 6, padding: 12, background: 'var(--ds-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Lozenge appearance="new">AI draft — {proposal.op}</Lozenge>
            <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)' }}>Nothing is saved until you accept.</span>
          </div>

          {CASE_EDIT_OPS.has(proposal.op) ? (
            <CaseEditPreview edit={proposal.result as TmAssistCaseEdit} />
          ) : (
            <AnalysisPreview analysis={proposal.result as TmAssistAnalysis} />
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {CASE_EDIT_OPS.has(proposal.op) && (
              <Button
                appearance="primary"
                spacing="compact"
                isLoading={applying}
                isDisabled={!isDraft}
                onClick={() => acceptCaseEdit(proposal.result as TmAssistCaseEdit)}
              >
                Accept draft
              </Button>
            )}
            <Button appearance="subtle" spacing="compact" onClick={() => setProposal(null)}>
              {CASE_EDIT_OPS.has(proposal.op) ? 'Reject' : 'Dismiss'}
            </Button>
          </div>
        </div>
      )}

      {assist.isError && !assist.isPending && !proposal && (
        <div style={{ marginTop: 10 }}>
          <SectionMessage appearance="warning" title="AI unavailable">
            <p style={{ margin: 0 }}>{(assist.error as Error)?.message}</p>
          </SectionMessage>
        </div>
      )}
    </div>
  );
}

function CaseEditPreview({ edit }: { edit: TmAssistCaseEdit }) {
  return (
    <div style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)' }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{edit.updated_case.title}</div>
      {edit.updated_case.objective && (
        <div style={{ color: 'var(--ds-text-subtle)', marginBottom: 8 }}>{edit.updated_case.objective}</div>
      )}
      {edit.changes.length > 0 && (
        <ul style={{ margin: '0 0 8px', paddingLeft: 18, color: 'var(--ds-text-subtle)', fontSize: 'var(--ds-font-size-200)' }}>
          {edit.changes.map((c, i) => <li key={i}>{c}</li>)}
        </ul>
      )}
      <div style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)', marginBottom: 6 }}>
        {edit.updated_case.steps.length} step{edit.updated_case.steps.length === 1 ? '' : 's'} proposed
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
        {edit.updated_case.steps.map((s) => (
          <div key={s.step_number} style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)' }}>
            <strong>{s.step_number}.</strong> {s.action} → <em>{s.expected_result}</em>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalysisPreview({ analysis }: { analysis: TmAssistAnalysis }) {
  const Section = ({ title, items, color }: { title: string; items: string[]; color: string }) => (
    items.length > 0 ? (
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 2 }}>{title}</div>
        <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--ds-text-subtle)', fontSize: 'var(--ds-font-size-200)' }}>
          {items.map((it, i) => <li key={i}>{it}</li>)}
        </ul>
      </div>
    ) : null
  );
  return (
    <div>
      <Section title="Covered" items={analysis.covered} color="var(--ds-text-success)" />
      <Section title="Gaps" items={analysis.gaps} color="var(--ds-text-danger)" />
      <Section title="Suggested cases" items={analysis.suggestions} color="var(--ds-text-information)" />
    </div>
  );
}
