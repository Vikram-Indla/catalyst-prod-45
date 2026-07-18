/**
 * STRATA Admin — Configuration Engine (governed control plane, not CRUD).
 * Routes: /strata/admin and /strata/admin/:section.
 * Every governed record shows its governance envelope (version, status,
 * effective date, approval, change reason). Lifecycle transitions are
 * RPC-only — the DB enforces roles + segregation of duties; DB error text
 * is surfaced verbatim.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button, CatalystInlineCode, CatalystTag, EmptyState, Lozenge, Modal, ModalBody, ModalFooter,
  ModalHeader, ModalTitle, SectionMessage, Select, Spinner, Textfield,
} from '@/components/ads';
import type { SelectOption } from '@/components/ads';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { StatusLozenge } from '@/components/shared/StatusLozenge';
import type { LozengeAppearance } from '@/components/shared/StatusLozenge';
import { Routes } from '@/lib/routes';
import {
  BarChart3, Bell, Calendar, CheckCircle2, Clock, Gem, GitBranch, Layers, ListChecks,
  MoveRight, Rocket, Scale, ShieldCheck, Upload, Users,
} from '@/lib/atlaskit-icons';
import Toggle from '@atlaskit/toggle';
import { configApi, governanceApi, scorecardApi } from '@/modules/strata/domain';
import {
  useAllModelMeasures, useAllModelPerspectives, useChangeRequests, useGateModels, useInvalidateStrata, useKpiTypes, useKpis, useModelPerspectives,
  usePerspectives, useProfileNames, useProjectCardFieldConfigs, useProjectCardPicklists,
  useProjectCardSectionConfigs, useProjectCardTabConfigs, useRoleAssignments, useScorecardModels,
  useBenefits, useGateInstances, usePortfolios, useProjectCards, useStrataAudit, useStrataContext,
  useStrataNotificationRules, useStrataRoles, useStrataUserId, useStrategyElements, useThresholdSchemes,
  useUploadRuns, useUploadTemplates, useValueCategories, useWorkflowConfigs,
} from '@/modules/strata/hooks/useStrata';
import { StrataPageShell, StrataPanel, T } from '@/modules/strata/components/shared';
import { StrataAuditHistory } from '@/modules/strata/components/StrataAuditHistory';
import { StrataNotFound } from '@/modules/strata/components/StrataSystemStates';
import { StrataFormModal, str } from '@/modules/strata/components/authoring';
import { fmtDate, fmtDateTime, labelize } from '@/modules/strata/components/format';
import { computeModelIntegrity, coverageState, draftSubmitBlockedReason } from '@/modules/strata/lib/modelIntegrity';
import { auditChangedFields } from '@/modules/strata/lib/auditDiff';
import {
  gateModelDependents, modelVersionImpact, perspectiveDependents, thresholdSchemeDependents,
  valueCategoryDependents, workflowEntityDependents,
} from '@/modules/strata/lib/dependents';
import { deriveEffectiveAdminRows } from '@/modules/strata/lib/effectiveRoles';
import type {
  GovernedEnvelope, GovernedStatus, StrataApproverCandidate, StrataChangeRequest, StrataCycle, StrataNotificationRule, StrataPeriod, StrataPerspective,
  StrataModelMeasure, StrataProjectCardFieldConfig, StrataProjectCardPicklist, StrataRole, StrataScorecardModel,
  StrataScorecardValidation, StrataThresholdPreview, StrataThresholdPreviewMove, StrataThresholdScheme, ThresholdBand,
} from '@/modules/strata/types';

type OnError = (msg: string | null) => void;

// ── Shared bits ──────────────────────────────────────────────────────────────
const captionStyle: React.CSSProperties = { fontSize: 'var(--ds-font-size-100)', color: T.subtlest, margin: '0 0 12px' };
const metaStyle: React.CSSProperties = { fontSize: 'var(--ds-font-size-100)', color: T.subtle };
const bodyStyle: React.CSSProperties = { fontSize: 'var(--ds-font-size-200)', color: T.text };
const codeStyle: React.CSSProperties = {
  fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 'var(--ds-font-size-100)', color: T.subtlest,
};

const GOV_LOZENGE: Record<GovernedStatus, LozengeAppearance> = {
  approved: 'success', draft: 'default', pending_approval: 'moved', changes_requested: 'inprogress',
  retired: 'removed', superseded: 'removed', rejected: 'removed',
};

/** Governed directionality → executive-readable label (not naive labelize). */
const DIRECTIONALITY_LABEL: Record<string, string> = {
  higher_better: 'Higher is better',
  lower_better: 'Lower is better',
  band: 'Band',
  manual: 'Manual',
};

export function GovStatusLozenge({ status }: { status: GovernedStatus }) {
  return <StatusLozenge status={status} label={labelize(status)} appearance={GOV_LOZENGE[status] ?? 'default'} />;
}

/** The governance envelope — shown prominently on every governed record. */
export function GovEnvelope({ r }: { r: GovernedEnvelope }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <CatalystTag text={`v${r.version}`} />
      <GovStatusLozenge status={r.status} />
      <span style={metaStyle}>Effective {fmtDate(r.effective_from)}</span>
      {r.approved_at ? <span style={metaStyle}>Approved {fmtDate(r.approved_at)}</span> : null}
      {r.change_reason ? (
        <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>{r.change_reason}</span>
      ) : null}
    </div>
  );
}

/**
 * D-2: which governed tables can be REVISED, and by which dedicated RPC.
 * Deliberately a lookup rather than a boolean prop: the "Create new version" CTA must appear only
 * where a revision RPC actually exists, so a table cannot be offered a verb the server has no way
 * to perform. `strata_kpis` is absent on purpose — A3b is blocked on F-9 (a KPI revision has
 * relationship and measurement children, so it is not the same shape as these two).
 */
const REVISION_RPC: Record<string, ((id: string, reason: string) => Promise<unknown>) | undefined> = {
  strata_scorecard_models: (id, reason) => configApi.createModelDraftVersion(id, reason),
  strata_threshold_schemes: (id, reason) => configApi.createThresholdDraftVersion(id, reason),
};

/** Governance lifecycle actions — RPC-only; DB errors surface verbatim. */
export function GovActions({ table, record, isScorecardModel, onError, submitBlockedReason, approveBlockedReasons, impact, copiedContents }: {
  table: string;
  record: { id: string; status: GovernedStatus };
  isScorecardModel?: boolean;
  onError: OnError;
  /** When set, the draft "Submit for approval" action is disabled and the
   * reason is shown inline (never a silent disable — anchor 05 states rule). */
  submitBlockedReason?: string | null;
  /** CFG-006 (Cycle 4): when non-empty, Approve is disabled and every reason
   * is shown — the full integrity gate applies to approval, not just submit. */
  approveBlockedReasons?: string[];
  /** CFG-004: downstream dependents shown in the Retire / Create-new-version
   * dialogs. undefined = unknown (render nothing); [] = checked, none. */
  impact?: string[];
  /** CFG-004 (Cycle 4): what a new draft version COPIES — distinct from
   * downstream impact; shown only in the Create-new-version dialog. */
  copiedContents?: string[];
}) {
  const invalidate = useInvalidateStrata();
  const [busy, setBusy] = useState(false);
  const [retireOpen, setRetireOpen] = useState(false);
  const [retireReason, setRetireReason] = useState('');
  const [versionOpen, setVersionOpen] = useState(false);
  const [versionReason, setVersionReason] = useState('');
  const createVersion = REVISION_RPC[table];
  // CFG-004: blast-radius block for the lifecycle dialogs. undefined = the
  // caller could not compute dependents — say nothing rather than guess.
  const impactBlock = impact === undefined ? null : (
    <div
      data-testid="strata-lifecycle-impact"
      style={{
        margin: '0 0 12px', padding: '8px 12px', border: `1px solid ${T.border}`,
        borderRadius: 6, background: T.sunken, display: 'flex', flexDirection: 'column', gap: 4,
      }}
    >
      <span style={{ fontWeight: 700, letterSpacing: '0.04em', fontSize: 'var(--ds-font-size-075)', color: T.subtlest }}>
        DOWNSTREAM IMPACT
      </span>
      {impact.length === 0 ? (
        <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>
          No downstream records reference this version.
        </span>
      ) : impact.map((line) => (
        <span key={line} style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>• {line}</span>
      ))}
    </div>
  );
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    onError(null);
    try {
      await fn();
      invalidate();
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  // SC-GOVAPPROVAL: scorecard models carry a richer workflow (assigned approver,
  // approval task, withdraw / request-changes / reject, resubmission of the SAME
  // version). The generic submit/approve verbs now REFUSE this table server-side,
  // so the pre-approval states route to the dedicated actions component.
  if (isScorecardModel && ['draft', 'changes_requested', 'pending_approval'].includes(record.status)) {
    return (
      <ScorecardLifecycleActions
        model={record as StrataScorecardModel}
        onError={onError}
        submitBlockedReason={submitBlockedReason}
        approveBlockedReasons={approveBlockedReasons}
      />
    );
  }
  if (record.status === 'draft') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Button
          spacing="compact"
          isDisabled={busy || !!submitBlockedReason}
          onClick={() => void act(() => configApi.submitRecord(table, record.id))}
        >
          Submit for approval
        </Button>
        {submitBlockedReason ? (
          <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-danger)' }}>{submitBlockedReason}</span>
        ) : null}
      </span>
    );
  }
  if (record.status === 'pending_approval') {
    // CFG-006 (Cycle 4): the integrity gate applies to APPROVAL too. A model
    // that reached pending while failing integrity must not be approvable —
    // blocked with every visible reason, never a silent disable.
    const approveBlocked = (approveBlockedReasons ?? []).length > 0;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <Button
          spacing="compact"
          appearance="default"
        iconBefore={<CheckCircle2 size={14} />}
          isDisabled={busy || approveBlocked}
          testId={`strata-approve-${record.id}`}
          onClick={() => void act(() =>
            isScorecardModel ? configApi.approveScorecardModel(record.id) : configApi.approveRecord(table, record.id))}
        >
          Approve
        </Button>
        {approveBlocked ? (
          <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-danger)', textAlign: 'right' }} data-testid={`strata-approve-blocked-${record.id}`}>
            Cannot approve: {(approveBlockedReasons ?? []).join('; ')}
          </span>
        ) : null}
      </span>
    );
  }
  if (record.status === 'approved') {
    return (
      <>
        {/* D-2/D-3: an approved definition is immutable, so changing it means a new draft version.
            The CTA is driven by REVISION_RPC, so it appears only for tables that actually have one
            (models A3a, threshold schemes A3c). Offering it for a table with no RPC behind it would
            promise a verb the server cannot perform. KPIs join when A3b lands (blocked on F-9). */}
        {createVersion ? (
          <Button
            spacing="compact"
            isDisabled={busy}
            testId={`strata-model-new-version-${record.id}`}
            onClick={() => { setVersionReason(''); setVersionOpen(true); }}
          >
            Create new version
          </Button>
        ) : null}
        <Button spacing="compact" isDisabled={busy} onClick={() => { setRetireReason(''); setRetireOpen(true); }}>
          Retire
        </Button>
        <Modal isOpen={versionOpen} onClose={() => setVersionOpen(false)} width="small">
          <ModalHeader>
            <ModalTitle>Create new version</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <p style={{ margin: '0 0 12px', fontSize: 'var(--ds-font-size-200)', color: T.subtle }}>
              This copies the approved model — its perspectives, weights, measures, aggregation and
              threshold scheme — into a new draft at version {(record.version ?? 1) + 1}. The approved
              version stays unchanged and keeps producing results until the draft is approved.
            </p>
            {/* CFG-004 (Cycle 4): copied definition contents are NOT downstream
                impact — label each honestly, and state the draft's live effect. */}
            {copiedContents !== undefined ? (
              <div
                data-testid="strata-version-copied-contents"
                style={{
                  margin: '0 0 12px', padding: '8px 12px', border: `1px solid ${T.border}`,
                  borderRadius: 6, background: T.sunken, display: 'flex', flexDirection: 'column', gap: 4,
                }}
              >
                <span style={{ fontWeight: 700, letterSpacing: '0.04em', fontSize: 'var(--ds-font-size-075)', color: T.subtlest }}>
                  COPIED DEFINITION CONTENTS
                </span>
                {copiedContents.length === 0 ? (
                  <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>Nothing is defined on this version yet.</span>
                ) : copiedContents.map((line) => (
                  <span key={line} style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>• {line}</span>
                ))}
              </div>
            ) : null}
            {impactBlock}
            <p style={{ margin: '0 0 12px', fontSize: 'var(--ds-font-size-100)', color: T.subtle }} data-testid="strata-version-no-live-effect">
              Downstream impact: creating a draft has no live downstream effect — consumers keep using the
              approved version until the new draft is itself approved.
            </p>
            <Textfield
              value={versionReason}
              onChange={(e) => setVersionReason(e.target.value)}
              placeholder="Reason for the new version"
              aria-label="Reason for the new version"
              autoFocus
            />
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={() => setVersionOpen(false)}>Cancel</Button>
            <Button
              appearance="primary"
              // The RPC requires a reason; disabling here states that rule before the round trip
              // rather than surfacing it as a server error.
              isDisabled={busy || versionReason.trim() === ''}
              onClick={() => {
                setVersionOpen(false);
                void act(() => createVersion(record.id, versionReason.trim()));
              }}
            >
              Create draft version
            </Button>
          </ModalFooter>
        </Modal>
        <Modal isOpen={retireOpen} onClose={() => setRetireOpen(false)} width="small">
          <ModalHeader>
            <ModalTitle>Retire record</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <p style={{ margin: '0 0 12px', fontSize: 'var(--ds-font-size-200)', color: T.subtle }}>
              Retiring is a governed lifecycle change — the reason is recorded in the audit trail.
            </p>
            {impactBlock}
            <Textfield
              value={retireReason}
              onChange={(e) => setRetireReason(e.target.value)}
              placeholder="Retirement reason"
              aria-label="Retirement reason"
              autoFocus
            />
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={() => setRetireOpen(false)}>Cancel</Button>
            <Button
              appearance="warning"
              isDisabled={busy}
              onClick={() => {
                setRetireOpen(false);
                void act(() => configApi.retireRecord(table, record.id, retireReason || undefined));
              }}
            >
              Retire record
            </Button>
          </ModalFooter>
        </Modal>
      </>
    );
  }
  return null;
}

/**
 * SC-GOVAPPROVAL — governed scorecard approval workflow actions.
 *
 * Every rule shown here is enforced server-side by the dedicated RPCs
 * (assigned-approver-only decisions, maker-checker both ways, shared validator
 * rerun at approve, one open task, optimistic concurrency). The UI's job is to
 * expose the right verb to the right person and explain refusals up front —
 * it is the explanation, never the boundary.
 */
function ScorecardLifecycleActions({ model, onError, submitBlockedReason, approveBlockedReasons }: {
  model: StrataScorecardModel;
  onError: OnError;
  submitBlockedReason?: string | null;
  approveBlockedReasons?: string[];
}) {
  const invalidate = useInvalidateStrata();
  const userIdQ = useStrataUserId();
  const rolesQ = useStrataRoles();
  const namesQ = useProfileNames();
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<
    null | 'submit' | 'withdraw' | 'approve' | 'request_changes' | 'reject' | 'assign'
  >(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  // Submit/assign dialog data — fetched on open, never while closed, so the
  // always-mounted tree stays cheap and the chooser reflects the server's
  // CURRENT eligibility (it is revalidated again at submission).
  const [candidates, setCandidates] = useState<StrataApproverCandidate[] | null>(null);
  const [validation, setValidation] = useState<StrataScorecardValidation | null>(null);
  const [approverId, setApproverId] = useState<string | null>(null);

  const userId = userIdQ.data ?? null;
  const isAdmin = (rolesQ.data ?? []).includes('strata_admin');
  const nameOf = (id: string | null): string | null => {
    if (!id) return null;
    const p = namesQ.data?.get(id);
    return p?.name ?? p?.email ?? `${id.slice(0, 8)}…`;
  };

  const openDialog = (which: NonNullable<typeof dialog>) => {
    setComment('');
    setApproverId(null);
    setDialogError(null);
    setDialog(which);
    if (which === 'submit' || which === 'assign' || which === 'approve') {
      setCandidates(null);
      setValidation(null);
      void configApi.validateScorecardModel(model.id)
        .then(setValidation)
        .catch((e) => setDialogError(e instanceof Error ? e.message : String(e)));
      if (which !== 'approve') {
        void configApi.scorecardApproverCandidates(model.id)
          .then(setCandidates)
          .catch((e) => setDialogError(e instanceof Error ? e.message : String(e)));
      }
    }
  };
  const close = () => { setDialog(null); setDialogError(null); };
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setDialogError(null);
    onError(null);
    try {
      await fn();
      invalidate();
      setDialog(null);
    } catch (e) {
      // Server refusal text is the contract — surfaced verbatim inside the dialog.
      setDialogError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const isSubmitter = userId != null && model.submitted_by === userId;
  const isAssignee = userId != null && model.assigned_approver_id === userId;
  const serverBlockers = validation?.blockers ?? [];
  const candidateOptions: SelectOption[] = (candidates ?? []).map((c) => ({
    value: c.user_id,
    label: c.display_name ? `${c.display_name}${c.email ? ` (${c.email})` : ''}` : (c.email ?? c.user_id),
  }));

  /** Blockers/warnings/passed — the server checklist, never a single boolean. */
  const checklist = validation === null ? (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 8 }}><Spinner size="small" /></div>
  ) : (
    <div
      data-testid={`strata-sc-validation-${model.id}`}
      style={{
        margin: '0 0 12px', padding: '8px 12px', border: `1px solid ${T.border}`,
        borderRadius: 6, background: T.sunken, display: 'flex', flexDirection: 'column', gap: 4,
        fontSize: 'var(--ds-font-size-100)',
      }}
    >
      <span style={{ fontWeight: 700, letterSpacing: '0.04em', fontSize: 'var(--ds-font-size-075)', color: T.subtlest }}>
        VALIDATION CHECKLIST
      </span>
      {validation.blockers.map((b) => (
        <span key={b} style={{ color: 'var(--ds-text-danger)', fontWeight: 600 }}>✕ {b}</span>
      ))}
      {validation.warnings.map((w) => (
        <span key={w} style={{ color: 'var(--ds-text-warning)', fontWeight: 600 }}>△ {w}</span>
      ))}
      {validation.passed.map((p) => (
        <span key={p} style={{ color: 'var(--ds-text-success)' }}>✓ {p}</span>
      ))}
    </div>
  );

  const dialogErrorBlock = dialogError ? (
    <SectionMessage appearance="error" title="Action rejected">
      <p style={{ whiteSpace: 'pre-wrap' }}>{dialogError}</p>
    </SectionMessage>
  ) : null;

  // ── Draft / changes requested: submit or resubmit the SAME version ─────────
  if (model.status === 'draft' || model.status === 'changes_requested') {
    const resubmit = model.status === 'changes_requested' || (model.submission_attempt ?? 0) > 0;
    // Mirror of the server rule: only the version author (or an admin) submits.
    const canSubmit = isAdmin || (userId != null && model.created_by === userId);
    if (!canSubmit) {
      return (
        <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle }} data-testid={`strata-sc-not-author-${model.id}`}>
          Only the version author{nameOf(model.created_by) ? ` (${nameOf(model.created_by)})` : ''} or an admin can submit it for approval.
        </span>
      );
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <Button
          spacing="compact"
          isDisabled={busy || !!submitBlockedReason}
          testId={`strata-model-submit-${model.id}`}
          onClick={() => openDialog('submit')}
        >
          {resubmit ? 'Resubmit for approval' : 'Submit for approval'}
        </Button>
        {submitBlockedReason ? (
          <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-danger)' }}>{submitBlockedReason}</span>
        ) : null}
        <Modal isOpen={dialog === 'submit'} onClose={close} width="medium">
          <ModalHeader>
            <ModalTitle>{resubmit ? `Resubmit version ${model.version} for approval` : `Submit version ${model.version} for approval`}</ModalTitle>
          </ModalHeader>
          <ModalBody>
            {checklist}
            <p style={{ margin: '0 0 12px', fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>
              {resubmit
                ? `Resubmission keeps version ${model.version} — this will be submission attempt ${(model.submission_attempt ?? 0) + 1}. `
                : ''}
              The version becomes effective immediately when the approver approves it
              {model.supersedes_id ? '; the currently active version is superseded at that moment' : ''}.
              While pending, the definition is locked.
            </p>
            <div style={{ margin: '0 0 12px' }}>
              <label style={{ display: 'block', fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.text, marginBottom: 4 }} htmlFor={`sc-approver-${model.id}`}>
                Approver <span aria-hidden style={{ color: 'var(--ds-text-danger)' }}>*</span>
              </label>
              <Select
                inputId={`sc-approver-${model.id}`}
                options={candidateOptions}
                value={candidateOptions.find((o) => o.value === approverId) ?? null}
                onChange={(o) => setApproverId(o?.value ?? null)}
                isLoading={candidates === null}
                isDisabled={busy}
                usePortal
                placeholder={candidates !== null && candidateOptions.length === 0
                  ? 'No eligible approver available'
                  : 'Select an eligible approver…'}
                aria-label="Approver"
                testId={`strata-sc-approver-select-${model.id}`}
              />
              <span style={{ display: 'block', marginTop: 4, fontSize: 'var(--ds-font-size-075)', color: T.subtlest }}>
                Only active approval-role holders are listed; you and the version creator are excluded
                (the submitter can never approve their own submission).
              </span>
              {approverId ? (
                <span style={{ display: 'block', marginTop: 4, fontSize: 'var(--ds-font-size-100)', color: T.subtle }} data-testid={`strata-sc-resolved-approver-${model.id}`}>
                  Approval will be assigned to <strong style={{ color: T.text }}>{nameOf(approverId)}</strong>.
                </span>
              ) : null}
            </div>
            <Textfield
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Submission note (optional)"
              aria-label="Submission note"
            />
            {dialogErrorBlock}
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={close} isDisabled={busy}>Cancel</Button>
            <Button
              appearance="primary"
              isDisabled={busy || !approverId || validation === null || serverBlockers.length > 0}
              testId={`strata-sc-submit-confirm-${model.id}`}
              onClick={() => void act(() => configApi.submitScorecardModel(
                model.id, approverId!, comment.trim() || undefined, model.updated_at))}
            >
              {resubmit ? 'Resubmit' : 'Submit'}
            </Button>
          </ModalFooter>
        </Modal>
      </span>
    );
  }

  // ── Pending approval ────────────────────────────────────────────────────────
  const clientApproveBlocked = (approveBlockedReasons ?? []).length > 0;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      {isAssignee ? (
        <>
          <Button
            spacing="compact"
            appearance="primary"
            iconBefore={<CheckCircle2 size={14} />}
            isDisabled={busy || clientApproveBlocked}
            testId={`strata-approve-${model.id}`}
            onClick={() => openDialog('approve')}
          >
            Approve
          </Button>
          <Button
            spacing="compact"
            isDisabled={busy}
            testId={`strata-sc-request-changes-${model.id}`}
            onClick={() => openDialog('request_changes')}
          >
            Request changes
          </Button>
          <Button
            spacing="compact"
            appearance="danger"
            isDisabled={busy}
            testId={`strata-sc-reject-${model.id}`}
            onClick={() => openDialog('reject')}
          >
            Reject
          </Button>
        </>
      ) : null}
      {clientApproveBlocked && isAssignee ? (
        <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-danger)', textAlign: 'right' }} data-testid={`strata-approve-blocked-${model.id}`}>
          Cannot approve: {(approveBlockedReasons ?? []).join('; ')}
        </span>
      ) : null}
      {isSubmitter || isAdmin ? (
        <Button
          spacing="compact"
          isDisabled={busy}
          testId={`strata-sc-withdraw-${model.id}`}
          onClick={() => openDialog('withdraw')}
        >
          Withdraw submission
        </Button>
      ) : null}
      {isAdmin ? (
        <Button
          spacing="compact"
          appearance="subtle"
          isDisabled={busy}
          testId={`strata-sc-assign-${model.id}`}
          onClick={() => openDialog('assign')}
        >
          {model.assigned_approver_id ? 'Reassign approver' : 'Assign approver'}
        </Button>
      ) : null}
      {!isAssignee && !isSubmitter && !isAdmin ? (
        <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle }} data-testid={`strata-sc-readonly-${model.id}`}>
          Awaiting {nameOf(model.assigned_approver_id) ?? 'approver assignment'} — only the assigned approver can decide.
        </span>
      ) : null}

      <Modal isOpen={dialog === 'approve'} onClose={close} width="medium">
        <ModalHeader>
          <ModalTitle>Approve version {model.version}</ModalTitle>
        </ModalHeader>
        <ModalBody>
          {checklist}
          <p style={{ margin: '0 0 12px', fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>
            Approving makes version {model.version} the active version immediately
            {model.supersedes_id ? ' and supersedes the currently active version in the same transaction' : ''}.
            Validation is run again on the server before the decision lands.
          </p>
          <Textfield
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Approval note (optional)"
            aria-label="Approval note"
          />
          {dialogErrorBlock}
        </ModalBody>
        <ModalFooter>
          <Button appearance="subtle" onClick={close} isDisabled={busy}>Cancel</Button>
          <Button
            appearance="primary"
            isDisabled={busy || validation === null || serverBlockers.length > 0}
            testId={`strata-sc-approve-confirm-${model.id}`}
            onClick={() => void act(() => configApi.approveScorecardModel(
              model.id, comment.trim() || undefined, model.updated_at))}
          >
            Approve and activate
          </Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={dialog === 'request_changes'} onClose={close} width="medium">
        <ModalHeader>
          <ModalTitle>Request changes on version {model.version}</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <p style={{ margin: '0 0 12px', fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>
            Version {model.version} returns to the author for editing — the version number does not
            change, and the full history of this submission is kept. Your comment is shown to the
            author and recorded in the audit trail.
          </p>
          <Textfield
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What needs to change (required)"
            aria-label="What needs to change (required)"
            aria-required="true"
            autoFocus
          />
          {dialogErrorBlock}
        </ModalBody>
        <ModalFooter>
          <Button appearance="subtle" onClick={close} isDisabled={busy}>Cancel</Button>
          <Button
            appearance="primary"
            isDisabled={busy || comment.trim() === ''}
            testId={`strata-sc-request-changes-confirm-${model.id}`}
            onClick={() => void act(() => configApi.requestScorecardChanges(model.id, comment.trim()))}
          >
            Request changes
          </Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={dialog === 'reject'} onClose={close} width="medium">
        <ModalHeader>
          <ModalTitle>Reject version {model.version}</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <p style={{ margin: '0 0 12px', fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>
            Rejection is final for this version — it can never be edited, resubmitted or activated.
            Revising means creating a new version from the approved one. If you want the author to
            fix and resubmit this version, use Request changes instead.
          </p>
          <Textfield
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Rejection reason (required)"
            aria-label="Rejection reason (required)"
            aria-required="true"
            autoFocus
          />
          {dialogErrorBlock}
        </ModalBody>
        <ModalFooter>
          <Button appearance="subtle" onClick={close} isDisabled={busy}>Cancel</Button>
          <Button
            appearance="danger"
            isDisabled={busy || comment.trim() === ''}
            testId={`strata-sc-reject-confirm-${model.id}`}
            onClick={() => void act(() => configApi.rejectScorecardModel(model.id, comment.trim()))}
          >
            Reject submission
          </Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={dialog === 'withdraw'} onClose={close} width="medium">
        <ModalHeader>
          <ModalTitle>Withdraw submission</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <p style={{ margin: '0 0 12px', fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>
            Version {model.version} returns to draft and becomes editable again. The open approval
            task is cancelled and {nameOf(model.assigned_approver_id) ?? 'the approver'} is notified.
          </p>
          <Textfield
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Withdrawal reason (optional)"
            aria-label="Withdrawal reason"
            autoFocus
          />
          {dialogErrorBlock}
        </ModalBody>
        <ModalFooter>
          <Button appearance="subtle" onClick={close} isDisabled={busy}>Cancel</Button>
          <Button
            appearance="warning"
            isDisabled={busy}
            testId={`strata-sc-withdraw-confirm-${model.id}`}
            onClick={() => void act(() => configApi.withdrawScorecardModel(model.id, comment.trim() || undefined))}
          >
            Withdraw submission
          </Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={dialog === 'assign'} onClose={close} width="medium">
        <ModalHeader>
          <ModalTitle>{model.assigned_approver_id ? 'Reassign approver' : 'Assign approver'}</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <p style={{ margin: '0 0 12px', fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>
            {model.assigned_approver_id
              ? `Currently assigned to ${nameOf(model.assigned_approver_id)}. The original assignment stays in the task history; both parties are notified.`
              : 'This submission predates approver assignment and cannot be decided until an approver is assigned.'}
            {' '}Assigning is an administrative act — it never decides the submission.
          </p>
          <div style={{ margin: '0 0 12px' }}>
            <Select
              options={candidateOptions.filter((o) => o.value !== model.assigned_approver_id)}
              value={candidateOptions.find((o) => o.value === approverId) ?? null}
              onChange={(o) => setApproverId(o?.value ?? null)}
              isLoading={candidates === null}
              isDisabled={busy}
              usePortal
              placeholder="Select an eligible approver…"
              aria-label="Approver"
              testId={`strata-sc-assign-select-${model.id}`}
            />
          </div>
          <Textfield
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Assignment reason (optional)"
            aria-label="Assignment reason"
          />
          {dialogErrorBlock}
        </ModalBody>
        <ModalFooter>
          <Button appearance="subtle" onClick={close} isDisabled={busy}>Cancel</Button>
          <Button
            appearance="primary"
            isDisabled={busy || !approverId}
            testId={`strata-sc-assign-confirm-${model.id}`}
            onClick={() => void act(() => configApi.assignScorecardApprover(
              model.id, approverId!, comment.trim() || undefined))}
          >
            Assign approver
          </Button>
        </ModalFooter>
      </Modal>
    </span>
  );
}

/** Card wrapper for one governed record: name + envelope + lifecycle actions. */
function GovRecordCard({ name, table, record, isScorecardModel, onError, headerActions, submitBlockedReason, approveBlockedReasons, impact, copiedContents, children }: {
  name: string;
  table: string;
  record: GovernedEnvelope & { id: string };
  isScorecardModel?: boolean;
  onError: OnError;
  /** Extra header controls (e.g. Edit) shown alongside the lifecycle actions. */
  headerActions?: React.ReactNode;
  /** Forwarded to GovActions — blocks Submit with a visible reason. */
  submitBlockedReason?: string | null;
  /** Forwarded to GovActions — CFG-006 blocks Approve with visible reasons. */
  approveBlockedReasons?: string[];
  /** Forwarded to GovActions — CFG-004 downstream impact in lifecycle dialogs. */
  impact?: string[];
  /** Forwarded to GovActions — CFG-004 copied contents in the version dialog. */
  copiedContents?: string[];
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: `1px solid ${T.border}`, borderRadius: 8, padding: 12,
        background: T.raised, boxShadow: 'var(--ds-shadow-raised)',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 'var(--ds-font-size-200)', color: T.text }}>{name}</strong>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {headerActions}
          <GovActions table={table} record={record} isScorecardModel={isScorecardModel} onError={onError} submitBlockedReason={submitBlockedReason} approveBlockedReasons={approveBlockedReasons} impact={impact} copiedContents={copiedContents} />
        </div>
      </div>
      <GovEnvelope r={record} />
      {children}
    </div>
  );
}

function SectionState({ query, empty, emptyLabel, children }: {
  query: { isLoading: boolean; isError: boolean; error: unknown };
  empty: boolean;
  emptyLabel?: string;
  children: React.ReactNode;
}) {
  if (query.isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner size="medium" /></div>;
  }
  if (query.isError) {
    return (
      <SectionMessage appearance="error" title="Failed to load">
        <p>{query.error instanceof Error ? query.error.message : 'Unknown error'}</p>
      </SectionMessage>
    );
  }
  if (empty) {
    return <EmptyState size="compact" header={emptyLabel ?? 'No governed records yet'} description="Nothing has been configured in this section." />;
  }
  return <>{children}</>;
}

// ── Sections ─────────────────────────────────────────────────────────────────
/** Create/edit fields for a perspective. color_token is intentionally omitted:
 * it is nullable/unused and the DB requires an ADS token NAME string — with no
 * curated token list to source from, we render nothing rather than invent one. */
function perspectiveFields(list: StrataPerspective[], excludeId?: string): React.ComponentProps<typeof StrataFormModal>['fields'] {
  return [
    { key: 'name', label: 'Name', kind: 'text', required: true },
    { key: 'description', label: 'Description', kind: 'textarea' },
    { key: 'orderIndex', label: 'Order index', kind: 'number', min: 0 },
    { key: 'defaultWeight', label: 'Default weight', kind: 'number', min: 0 },
    {
      key: 'parentId', label: 'Parent perspective', kind: 'select',
      options: list.filter((p) => p.id !== excludeId).map((p) => ({ value: p.id, label: p.name })),
    },
  ];
}

const numOrUndef = (v: string | number | boolean | null): number | undefined =>
  v == null || v === '' ? undefined : Number(v);

function PerspectivesSection({ onError }: { onError: OnError }) {
  const q = usePerspectives();
  const roles = useStrataRoles();
  const invalidate = useInvalidateStrata();
  // CFG-004: models referencing each perspective — same cached queries the
  // Scorecard models section uses, so no extra network beyond first paint.
  const modelsQ = useScorecardModels();
  const allMPQ = useAllModelPerspectives();
  const list = q.data ?? [];
  const nameById = new Map(list.map((p) => [p.id, p.name]));
  // Same gate the DB enforces for INSERT/UPDATE on strata_perspectives.
  const canConfigure = (roles.data ?? []).some((r) => r === 'strata_admin' || r === 'strategy_office');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StrataPerspective | null>(null);

  return (
    <StrataPanel
      title="Perspectives"
      icon={<Layers size={16} />}
      count={list.length}
      testId="strata-admin-perspectives"
      actions={canConfigure ? (
        <Button spacing="compact" onClick={() => setCreateOpen(true)} testId="strata-perspective-new">
          New perspective
        </Button>
      ) : undefined}
    >
      <p style={captionStyle}>
        Perspectives are versioned, approved records. New perspectives start as a draft; only drafts can be
        edited — submit a draft for approval from its lifecycle actions.
      </p>
      <SectionState query={q} empty={list.length === 0}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((p) => (
            <GovRecordCard
              key={p.id}
              name={p.name}
              table="strata_perspectives"
              record={p}
              onError={onError}
              impact={modelsQ.data && allMPQ.data
                ? perspectiveDependents(p.id, modelsQ.data, allMPQ.data)
                : undefined}
              headerActions={canConfigure && p.status === 'draft' ? (
                <Button
                  spacing="compact"
                  appearance="subtle"
                  onClick={() => setEditTarget(p)}
                  testId={`strata-perspective-edit-${p.id}`}
                >
                  Edit
                </Button>
              ) : undefined}
            >
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span style={metaStyle}>Order {p.order_index}</span>
                <span style={metaStyle}>Default weight {p.default_weight ?? '—'}</span>
                {p.parent_id ? <span style={metaStyle}>Parent {nameById.get(p.parent_id) ?? '—'}</span> : null}
              </div>
            </GovRecordCard>
          ))}
        </div>
      </SectionState>

      <StrataFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New perspective"
        description="Created as a draft. Submit it for approval from the record's lifecycle actions once ready."
        fields={perspectiveFields(list)}
        submitLabel="Create perspective"
        testId="strata-perspective-create-modal"
        onSubmit={async (v) => {
          await configApi.createPerspective({
            name: String(v.name ?? '').trim(),
            description: str(v.description),
            orderIndex: numOrUndef(v.orderIndex),
            defaultWeight: numOrUndef(v.defaultWeight),
            parentId: str(v.parentId),
          });
          invalidate();
        }}
      />

      {editTarget ? (
        <StrataFormModal
          open
          onClose={() => setEditTarget(null)}
          title="Edit perspective"
          description="Only draft perspectives can be edited. Approved records use the lifecycle actions."
          fields={perspectiveFields(list, editTarget.id)}
          initial={{
            name: editTarget.name,
            description: editTarget.description,
            orderIndex: editTarget.order_index,
            defaultWeight: editTarget.default_weight,
            parentId: editTarget.parent_id,
          }}
          submitLabel="Save"
          testId="strata-perspective-edit-modal"
          onSubmit={async (v) => {
            await configApi.updatePerspective(editTarget.id, {
              name: String(v.name ?? '').trim(),
              description: str(v.description),
              orderIndex: numOrUndef(v.orderIndex),
              defaultWeight: numOrUndef(v.defaultWeight),
              parentId: str(v.parentId),
            });
            invalidate();
          }}
        />
      ) : null}
    </StrataPanel>
  );
}

/** Categorical segment tones — semantic token cycle, index-stable per model. */
const SEGMENT_TONES = [
  'var(--ds-text-brand)',
  'var(--ds-text-success)',
  'var(--ds-text-information)',
  'var(--ds-text-warning)',
  'var(--ds-text-danger)',
  'var(--ds-text-subtlest)',
];

function ModelWeights({ model, canEditWeights }: { model: StrataScorecardModel; canEditWeights: boolean }) {
  const mp = useModelPerspectives(model.id);
  const perspectives = usePerspectives();
  const invalidate = useInvalidateStrata();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (mp.isLoading) return <Spinner size="small" />;
  if (mp.isError) {
    return <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-danger)' }}>Failed to load weights</span>;
  }
  const rows = mp.data ?? [];
  const nameById = new Map((perspectives.data ?? []).map((p) => [p.id, p.name]));
  // SC-GOVAPPROVAL: attach/detach perspectives on an editable model. RLS is the
  // gate (strategy_office AND parent draft/changes_requested); ops are immediate
  // server writes with the zero-rows-means-refused guard.
  const attached = new Set(rows.map((r) => r.perspective_id));
  const addOptions: SelectOption[] = (perspectives.data ?? [])
    .filter((p) => !attached.has(p.id) && p.status === 'approved')
    .map((p) => ({ value: p.id, label: p.name }));
  const addPerspective = async (perspectiveId: string) => {
    setSaving(true);
    setError(null);
    try {
      await configApi.addModelPerspective(model.id, perspectiveId, 0, rows.length);
      invalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };
  const removePerspective = async (perspectiveId: string) => {
    setSaving(true);
    setError(null);
    try {
      await configApi.removeModelPerspective(model.id, perspectiveId);
      setDraft((prev) => {
        const next = { ...prev };
        delete next[perspectiveId];
        return next;
      });
      invalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };
  const addSelect = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span style={metaStyle}>+ Add perspective</span>
      <div style={{ minWidth: 220 }}>
        <Select
          options={addOptions}
          value={null}
          onChange={(o) => o && void addPerspective(o.value)}
          isDisabled={saving || addOptions.length === 0}
          isLoading={perspectives.isLoading}
          usePortal
          placeholder={addOptions.length === 0 ? 'Every approved perspective is attached' : 'Select a perspective…'}
          aria-label="Add perspective to model"
          testId={`strata-model-perspective-add-${model.id}`}
        />
      </div>
    </div>
  );

  if (rows.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={metaStyle}>No perspective weights configured.</span>
        {canEditWeights ? addSelect : null}
        {error ? (
          <SectionMessage appearance="error" title="Action rejected">
            <p style={{ whiteSpace: 'pre-wrap' }}>{error}</p>
          </SectionMessage>
        ) : null}
      </div>
    );
  }
  // Display of config integrity (sum shown to the admin) — not business logic.
  const sum = rows.reduce((acc, r) => acc + r.weight, 0);

  const startEdit = () => {
    setDraft(Object.fromEntries(rows.map((r) => [r.perspective_id, String(r.weight)])));
    setError(null);
    setEditing(true);
  };
  // Cancel restores the displayed (persisted) values by dropping the draft.
  const cancel = () => { setEditing(false); setError(null); };
  const draftTotal = rows.reduce((acc, r) => acc + (Number(draft[r.perspective_id]) || 0), 0);
  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await configApi.setModelPerspectiveWeights(model.id, rows.map((r) => ({
        perspectiveId: r.perspective_id,
        weight: Number(draft[r.perspective_id]) || 0,
      })));
      invalidate();
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((r) => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ ...metaStyle, minWidth: 160 }}>{nameById.get(r.perspective_id) ?? '—'}</span>
            <div style={{ width: 120 }}>
              <Textfield
                type="number"
                spacing="compact"
                value={draft[r.perspective_id] ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setDraft((prev) => ({ ...prev, [r.perspective_id]: val }));
                }}
                aria-label={`Weight for ${nameById.get(r.perspective_id) ?? 'perspective'}`}
                elemAfterInput={<span style={{ paddingRight: 'var(--ds-space-050)', color: T.subtlest }}>%</span>}
                testId={`strata-model-weight-input-${r.perspective_id}`}
              />
            </div>
            <Button
              spacing="compact"
              appearance="subtle"
              isDisabled={saving}
              onClick={() => void removePerspective(r.perspective_id)}
              testId={`strata-model-perspective-remove-${r.perspective_id}`}
            >
              Remove
            </Button>
          </div>
        ))}
        {addSelect}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={metaStyle}>
            Total <strong style={{ color: T.text, fontVariantNumeric: 'tabular-nums' }}>{draftTotal}%</strong>
          </span>
          {draftTotal === 100
            ? <StatusLozenge status="valid" label="Weights valid" appearance="success" />
            : <StatusLozenge status="invalid" label="Weights must total 100" appearance="removed" />}
          <Button
            spacing="compact"
            appearance="primary"
            isDisabled={saving || draftTotal !== 100}
            onClick={() => void save()}
            testId={`strata-model-weights-save-${model.id}`}
          >
            {saving ? 'Saving…' : 'Save weights'}
          </Button>
          <Button spacing="compact" appearance="subtle" isDisabled={saving} onClick={cancel}>Cancel</Button>
        </div>
        {error ? (
          <SectionMessage appearance="error" title="Action rejected">
            <p style={{ whiteSpace: 'pre-wrap' }}>{error}</p>
          </SectionMessage>
        ) : null}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Proportional stacked weight bar */}
      <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: T.neutral, maxWidth: 420 }} aria-hidden>
        {rows.map((r, i) => (
          <span key={r.id} style={{ flex: r.weight, background: SEGMENT_TONES[i % SEGMENT_TONES.length] }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {rows.map((r, i) => (
          <span key={r.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>
            <span aria-hidden style={{ width: 8, height: 8, borderRadius: 2, background: SEGMENT_TONES[i % SEGMENT_TONES.length], flexShrink: 0 }} />
            {nameById.get(r.perspective_id) ?? '—'}
            <strong style={{ color: T.text, fontVariantNumeric: 'tabular-nums' }}>{r.weight}%</strong>
          </span>
        ))}
        {sum === 100
          ? <StatusLozenge status="valid" label="Weights valid" appearance="success" />
          : <StatusLozenge status="invalid" label="Weights must total 100" appearance="removed" />}
        {canEditWeights ? (
          <Button
            spacing="compact"
            appearance="subtle"
            onClick={startEdit}
            testId={`strata-model-weights-edit-${model.id}`}
          >
            Edit weights
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/** Tri-state model integrity band (anchor 05) — perspective weights must total
 * 100 before a draft model can be submitted. Glyph + word carry state (never
 * color alone). Measure-level checks are a later feature (no measures table). */
function ModelIntegrityBand({ sum, count, measureIssues, isDraft, unsaved }: {
  sum: number; count: number;
  /** Per-perspective measure-weight failures, e.g. "Customer measure weights total 90 — assign the remaining 10". */
  measureIssues?: string[];
  /** CFG-006: the "Cannot submit" hint only makes sense on a draft — pending/approved records show the failures without it. */
  isDraft?: boolean;
  /** SC live validation: totals reflect the open measures editor, not yet persisted. */
  unsaved?: boolean;
}) {
  const ok = count > 0 && sum === 100;
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        padding: '8px 12px', border: `1px solid ${T.border}`, borderRadius: 6,
        background: T.sunken, fontSize: 'var(--ds-font-size-100)',
      }}
    >
      <span style={{ fontWeight: 700, letterSpacing: '0.04em', color: T.subtlest }}>MODEL INTEGRITY</span>
      {unsaved ? (
        <span style={{ color: 'var(--ds-text-warning)', fontWeight: 600 }}>
          △ Live — includes unsaved measure edits
        </span>
      ) : null}
      {count === 0 ? (
        <span style={{ color: 'var(--ds-text-warning)', fontWeight: 600 }}>△ No perspective weights configured yet</span>
      ) : ok ? (
        <span style={{ color: 'var(--ds-text-success)', fontWeight: 600 }}>✓ Perspective weights total 100</span>
      ) : (
        <span style={{ color: 'var(--ds-text-danger)', fontWeight: 600 }}>
          ✕ Perspective weights total {sum} — {sum < 100 ? `assign the remaining ${100 - sum}` : `remove ${sum - 100}`}
        </span>
      )}
      {(measureIssues ?? []).map((m) => (
        <span key={m} style={{ color: 'var(--ds-text-danger)', fontWeight: 600 }}>✕ {m}</span>
      ))}
      {isDraft && (!ok || (measureIssues ?? []).length > 0)
        ? <span style={{ marginLeft: 'auto', color: T.subtlest }}>Cannot submit until integrity passes</span>
        : null}
    </div>
  );
}

/** M-D1 — the ONE aggregation vocabulary, byte-identical to
 * strata_scorecard_models.rollup_method's CHECK. Never mint a fifth value here:
 * a second dictionary one level down is the exact failure M-D0/M-D1 prevent. */
const AGGREGATION_METHODS: StrataModelMeasure['aggregation_method'][] = [
  'weighted_average', 'sum', 'min', 'custom',
];
const AGGREGATION_OPTIONS: SelectOption[] = AGGREGATION_METHODS.map((v) => ({ value: v, label: labelize(v) }));

/** One editable measure ASSIGNMENT. Carries only the assignment's own facts —
 * name/direction/unit/scheme are read from the KPI and are never drafted here. */
interface MeasureDraft {
  perspectiveId: string;
  kpiId: string;
  /** String while editing: an emptied number field must stay empty, not snap to 0. */
  weight: string;
  required: boolean;
  aggregationMethod: StrataModelMeasure['aggregation_method'];
  targetPolicy: StrataModelMeasure['target_policy'];
}

/** Live editing state one MeasureGroups reports to the section (SC live validation). */
interface LiveMeasureDraft {
  /** Structural superset of modelIntegrity's MeasureRow — feeds computeModelIntegrity directly. */
  rows: Array<{ perspective_id: string; kpi_id: string; weight: number }>;
  /** True when the draft differs from the persisted assignment set in ANY field. */
  dirty: boolean;
}

/** Field-exact equality between the editing draft and the persisted assignments. */
function draftMatchesPersisted(draft: MeasureDraft[], persisted: StrataModelMeasure[]): boolean {
  if (draft.length !== persisted.length) return false;
  const key = (p: string, k: string, w: number, req: boolean, agg: string, pol: string) =>
    `${p}|${k}|${w}|${req}|${agg}|${pol}`;
  const a = draft
    .map((d) => key(d.perspectiveId, d.kpiId, Number(d.weight) || 0, d.required, d.aggregationMethod, d.targetPolicy))
    .sort();
  const b = persisted
    .map((m) => key(m.perspective_id, m.kpi_id, Number(m.weight) || 0, m.required, m.aggregation_method, m.target_policy))
    .sort();
  return a.every((v, i) => v === b[i]);
}

/**
 * Anchor-05 measures builder — perspective groups, each listing its measure
 * ASSIGNMENTS (M-D0). Every identity column (Measure / Direction / Threshold
 * scheme / Unit) is READ from the KPI dictionary via kpi_id and is never
 * re-entered here — storing them on the assignment would be the
 * two-competing-dictionaries bug M-D0 exists to prevent. Only the assignment's
 * own facts (weight, required, aggregation) belong to the measure row.
 *
 * Authoring (part 2b) mirrors ModelWeights: local draft, editing flag,
 * Save/Cancel, DB error surfaced verbatim. Save is a REPLACE-SET — it sends the
 * full set across every group, so the draft is held flat and `order_index` is
 * re-derived from position within each group.
 *
 * Incomplete totals do NOT block save: the 100-per-group rule gates *submit*,
 * never *save* (the RPC deliberately does not enforce it either). While the
 * editor is open, the live draft rows are reported to the parent via
 * `onDraftChange` so the MODEL INTEGRITY band validates the current editing
 * state instead of stale persisted rows; `null` means "not editing — use
 * persisted rows".
 */
function MeasureGroups({ modelId, measures, canEdit, onDraftChange, concurrencyToken }: {
  modelId: string; measures: StrataModelMeasure[]; canEdit: boolean;
  onDraftChange?: (state: LiveMeasureDraft | null) => void;
  /** The model's updated_at — required by the save RPC; a stale token conflicts
   * with zero mutation and the editor keeps the dirty values (gap-5 behavior). */
  concurrencyToken: string;
}) {
  const perspectives = usePerspectives();
  const mp = useModelPerspectives(modelId);
  const kpis = useKpis();
  const kpiTypes = useKpiTypes();
  const invalidate = useInvalidateStrata();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<MeasureDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pName = new Map((perspectives.data ?? []).map((p) => [p.id, p.name]));
  const kpiById = new Map((kpis.data ?? []).map((k) => [k.id, k]));
  const typeById = new Map((kpiTypes.data ?? []).map((t) => [t.id, t]));
  const groups = (mp.data ?? []);

  // Report the live draft upward. Refs hold the callback AND the persisted
  // rows: both get a fresh identity on every parent render (the parent stores
  // this report in state, and `measures` is a per-render .filter() result), so
  // depending on either would re-fire the effect each render and loop. Only
  // the child-owned [editing, draft] may drive it. Unmount clears the report.
  const onDraftChangeRef = useRef(onDraftChange);
  onDraftChangeRef.current = onDraftChange;
  const measuresRef = useRef(measures);
  measuresRef.current = measures;
  useEffect(() => {
    if (!editing) { onDraftChangeRef.current?.(null); return; }
    onDraftChangeRef.current?.({
      rows: draft.map((d) => ({
        perspective_id: d.perspectiveId, kpi_id: d.kpiId, weight: Number(d.weight) || 0,
      })),
      dirty: !draftMatchesPersisted(draft, measuresRef.current),
    });
  }, [editing, draft]);
  useEffect(() => () => { onDraftChangeRef.current?.(null); }, []);

  if (groups.length === 0) return null;

  const startEdit = () => {
    setDraft([...measures]
      .sort((a, b) => a.order_index - b.order_index)
      .map((m) => ({
        perspectiveId: m.perspective_id,
        kpiId: m.kpi_id,
        weight: String(m.weight),
        required: m.required,
        aggregationMethod: m.aggregation_method,
        targetPolicy: m.target_policy,
      })));
    setError(null);
    setEditing(true);
  };
  // Cancel restores the persisted values by dropping the draft.
  const cancel = () => { setEditing(false); setError(null); };

  const patchRow = (kpiId: string, patch: Partial<MeasureDraft>) =>
    setDraft((prev) => prev.map((d) => (d.kpiId === kpiId ? { ...d, ...patch } : d)));
  const removeRow = (kpiId: string) => setDraft((prev) => prev.filter((d) => d.kpiId !== kpiId));
  const addRow = (perspectiveId: string, kpiId: string) => setDraft((prev) => [...prev, {
    perspectiveId, kpiId, weight: '0', required: false,
    aggregationMethod: 'weighted_average', targetPolicy: 'default',
  }]);

  const draftRowsFor = (pid: string) => draft.filter((d) => d.perspectiveId === pid);
  const draftTotalFor = (pid: string) =>
    Math.round(draftRowsFor(pid).reduce((a, d) => a + (Number(d.weight) || 0), 0) * 100) / 100;
  // Incomplete totals never block SAVE (the contract gates submit/approve only);
  // this list feeds the informational note under the Save button.
  const incompleteGroups = groups
    .filter((g) => coverageState(draftRowsFor(g.perspective_id).length, draftTotalFor(g.perspective_id)) !== 'valid')
    .map((g) => pName.get(g.perspective_id) ?? '—');
  // A KPI is assigned at most once per MODEL, so the picker offers the rest.
  const assigned = new Set(draft.map((d) => d.kpiId));
  const kpiOptions: SelectOption[] = (kpis.data ?? [])
    .filter((k) => !assigned.has(k.id))
    .map((k) => ({ value: k.id, label: k.name }));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const seen = new Map<string, number>();
      await scorecardApi.setModelMeasures(modelId, draft.map((d) => {
        const idx = seen.get(d.perspectiveId) ?? 0;
        seen.set(d.perspectiveId, idx + 1);
        return {
          perspectiveId: d.perspectiveId,
          kpiId: d.kpiId,
          weight: Number(d.weight) || 0,
          orderIndex: idx,
          required: d.required,
          aggregationMethod: d.aggregationMethod,
          targetPolicy: d.targetPolicy,
        };
      }), concurrencyToken);
      invalidate();
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {groups.map((g) => {
        const rows = measures.filter((m) => m.perspective_id === g.perspective_id)
          .sort((a, b) => a.order_index - b.order_index);
        const drows = draftRowsFor(g.perspective_id);
        const total = editing
          ? draftTotalFor(g.perspective_id)
          : Math.round(rows.reduce((a, m) => a + Number(m.weight ?? 0), 0) * 100) / 100;
        const count = editing ? drows.length : rows.length;
        // Four distinct states — zero measures / underweight / overweight / valid.
        const cov = coverageState(count, total);
        return (
          <div key={g.id} style={{ border: `1px solid ${T.border}`, borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '8px 12px', background: T.sunken }}>
              <strong style={{ fontSize: 'var(--ds-font-size-200)', color: T.text }}>{pName.get(g.perspective_id) ?? '—'}</strong>
              <span style={metaStyle}>perspective weight <strong style={{ color: T.text }}>{g.weight}</strong></span>
              {cov === 'no_measures' ? (
                <span style={{ ...metaStyle, marginLeft: 'auto' }}>No measures assigned</span>
              ) : (
                <span style={{ marginLeft: 'auto', fontSize: 'var(--ds-font-size-100)', fontWeight: 600,
                  color: cov === 'valid' ? 'var(--ds-text-success)' : 'var(--ds-text-danger)' }}>
                  {cov === 'valid' ? '✓ measure weights total 100'
                    : cov === 'underweight'
                      ? `✕ measure weights total ${total} — assign the remaining ${Math.round((100 - total) * 100) / 100}`
                      : `✕ measure weights total ${total} — remove ${Math.round((total - 100) * 100) / 100}`}
                </span>
              )}
            </div>
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {drows.map((d) => {
                  const k = kpiById.get(d.kpiId);
                  const dir = k?.kpi_type_id ? typeById.get(k.kpi_type_id)?.directionality : undefined;
                  const kName = k?.name ?? '—';
                  return (
                    <div key={d.kpiId} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                      padding: '8px 12px', borderTop: `1px solid ${T.border}`, fontSize: 'var(--ds-font-size-100)' }}>
                      <span style={{ ...bodyStyle, fontWeight: 600, flex: '1 1 180px', minWidth: 0 }}>{kName}</span>
                      <div style={{ width: 96 }}>
                        <Textfield
                          type="number"
                          spacing="compact"
                          value={d.weight}
                          onChange={(e) => patchRow(d.kpiId, { weight: e.target.value })}
                          aria-label={`Weight for ${kName}`}
                          elemAfterInput={<span style={{ paddingRight: 'var(--ds-space-050)', color: T.subtlest }}>%</span>}
                          testId={`strata-measure-weight-${d.kpiId}`}
                        />
                      </div>
                      {/* Direction is READ from the KPI (M-D0) — never an input. */}
                      <span style={metaStyle}>{dir ? (DIRECTIONALITY_LABEL[dir] ?? labelize(dir)) : '—'}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Toggle
                          isChecked={d.required}
                          isDisabled={saving}
                          onChange={() => patchRow(d.kpiId, { required: !d.required })}
                          label={`Required — ${kName}`}
                          testId={`strata-measure-required-${d.kpiId}`}
                        />
                        <span style={metaStyle}>Required</span>
                      </span>
                      <div style={{ width: 180 }}>
                        <Select
                          options={AGGREGATION_OPTIONS}
                          value={AGGREGATION_OPTIONS.find((o) => o.value === d.aggregationMethod) ?? null}
                          onChange={(o) => o && patchRow(d.kpiId, {
                            aggregationMethod: o.value as StrataModelMeasure['aggregation_method'],
                          })}
                          isDisabled={saving}
                          isSearchable={false}
                          usePortal
                          aria-label={`Aggregation for ${kName}`}
                          testId={`strata-measure-aggregation-${d.kpiId}`}
                        />
                      </div>
                      <Button
                        spacing="compact"
                        appearance="subtle"
                        isDisabled={saving}
                        onClick={() => removeRow(d.kpiId)}
                        testId={`strata-measure-remove-${d.kpiId}`}
                      >
                        Remove
                      </Button>
                    </div>
                  );
                })}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                  padding: '8px 12px', borderTop: `1px solid ${T.border}` }}>
                  <span style={metaStyle}>+ Add measure</span>
                  <div style={{ minWidth: 240 }}>
                    <Select
                      options={kpiOptions}
                      value={null}
                      onChange={(o) => o && addRow(g.perspective_id, o.value)}
                      isDisabled={saving || kpiOptions.length === 0}
                      isLoading={kpis.isLoading}
                      usePortal
                      placeholder={kpiOptions.length === 0 ? 'Every KPI is already assigned' : 'Select a KPI…'}
                      aria-label={`Add measure to ${pName.get(g.perspective_id) ?? 'perspective'}`}
                      testId={`strata-measure-add-${g.perspective_id}`}
                    />
                  </div>
                </div>
              </div>
            ) : rows.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {rows.map((m) => {
                  const k = kpiById.get(m.kpi_id);
                  const dir = k?.kpi_type_id ? typeById.get(k.kpi_type_id)?.directionality : undefined;
                  return (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                      padding: '8px 12px', borderTop: `1px solid ${T.border}`, fontSize: 'var(--ds-font-size-100)' }}>
                      <span style={{ ...bodyStyle, fontWeight: 600, flex: '1 1 180px', minWidth: 0 }}>{k?.name ?? '—'}</span>
                      <span style={{ ...metaStyle, fontVariantNumeric: 'tabular-nums' }}>{m.weight}%</span>
                      <span style={metaStyle}>{dir ? (DIRECTIONALITY_LABEL[dir] ?? labelize(dir)) : '—'}</span>
                      {m.required ? <CatalystTag text="Required" /> : null}
                      <span style={metaStyle}>{labelize(m.aggregation_method)}</span>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
      {editing ? (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            spacing="compact"
            appearance="primary"
            isDisabled={saving}
            onClick={() => void save()}
            testId={`strata-model-measures-save-${modelId}`}
          >
            {saving ? 'Saving…' : 'Save measures'}
          </Button>
          <Button spacing="compact" appearance="subtle" isDisabled={saving} onClick={cancel}>Cancel</Button>
          {/* Incomplete drafts SAVE freely; only submit/approve are gated on totals. */}
          {incompleteGroups.length > 0 ? (
            <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-warning)' }}>
              △ {incompleteGroups.join(', ')} incomplete — the draft can be saved, but submission stays blocked until every perspective totals 100
            </span>
          ) : null}
        </div>
      ) : canEdit ? (
        <div>
          <Button
            spacing="compact"
            appearance="subtle"
            onClick={startEdit}
            testId={`strata-model-measures-edit-${modelId}`}
          >
            Edit measures
          </Button>
        </div>
      ) : null}
      {error ? (
        <SectionMessage appearance="error" title="Action rejected">
          <p style={{ whiteSpace: 'pre-wrap' }}>{error}</p>
        </SectionMessage>
      ) : null}
    </div>
  );
}

/** Model identity/scope/granularity/rollup — mirrors the strata_scorecard_models CHECKs exactly. */
const OWNER_SCOPE_OPTIONS = ['enterprise', 'sector', 'function', 'portfolio', 'initiative', 'custom']
  .map((v) => ({ value: v, label: labelize(v) }));
const ROLLUP_OPTIONS = ['weighted_average', 'sum', 'min', 'custom']
  .map((v) => ({ value: v, label: labelize(v) }));
const GRANULARITY_OPTIONS = ['month', 'quarter', 'half', 'year']
  .map((v) => ({ value: v, label: labelize(v) }));

export function ScorecardModelsSection({ onError }: { onError: OnError }) {
  const q = useScorecardModels();
  const allMP = useAllModelPerspectives();
  const allMeasures = useAllModelMeasures();
  const roles = useStrataRoles();
  const schemes = useThresholdSchemes();
  const names = useProfileNames();
  const invalidateModels = useInvalidateStrata();
  // SC-GOVAPPROVAL: per-model expanded approval-history panels (lazy — the
  // audit query runs only once a history is opened).
  const [historyOpen, setHistoryOpen] = useState<Record<string, boolean>>({});
  const nameOf = (id: string | null): string | null => {
    if (!id) return null;
    const p = names.data?.get(id);
    return p?.name ?? p?.email ?? `${id.slice(0, 8)}…`;
  };
  // SC-DEF-001: net-new model creation. Previously unreachable — the only writer of
  // strata_scorecard_models was the clone-based revision RPC, which needs a model to already
  // exist, so a first model could not be authored from any surface.
  const [newModelOpen, setNewModelOpen] = useState(false);
  // SC live validation: while a model's measures editor is open, its current
  // draft lives here (keyed by model id). null/absent = editor closed = the
  // persisted rows are the (authoritative-mirror) validation input. Never mix:
  // the band shows live totals labeled as unsaved; submit gates on persisted.
  const [liveMeasures, setLiveMeasures] = useState<Record<string, LiveMeasureDraft | null>>({});
  const onLiveMeasures = useCallback((modelId: string, state: LiveMeasureDraft | null) => {
    setLiveMeasures((prev) => {
      const cur = prev[modelId] ?? null;
      // Structural no-op guard — an identical report must not re-render (loop risk).
      if (state === null && cur === null) return prev;
      if (state !== null && cur !== null && cur.dirty === state.dirty
        && JSON.stringify(cur.rows) === JSON.stringify(state.rows)) return prev;
      return { ...prev, [modelId]: state };
    });
  }, []);
  const list = q.data ?? [];
  // strata_scorecard_model_perspectives write is strategy_office (matches RLS).
  // Role is necessary but NOT sufficient: RLS + the set_model_measures RPC also require the parent
  // model to be status='draft' (P0-A, D-1). Authoring is gated per-model below, not here.
  const hasAuthorRole = (roles.data ?? []).includes('strategy_office');

  const perspectivesForNames = usePerspectives();
  const perspectiveNameById = new Map((perspectivesForNames.data ?? []).map((p) => [p.id, p.name]));

  // Per-model perspective-weight sum + count (config integrity), client-derived.
  const weightByModel = new Map<string, number>();
  const countByModel = new Map<string, number>();
  for (const mp of allMP.data ?? []) {
    weightByModel.set(mp.model_id, (weightByModel.get(mp.model_id) ?? 0) + mp.weight);
    countByModel.set(mp.model_id, (countByModel.get(mp.model_id) ?? 0) + 1);
  }

  return (
    <StrataPanel
      title="Scorecard models"
      icon={<Scale size={16} />}
      count={list.length}
      testId="strata-admin-scorecard-models"
      actions={hasAuthorRole ? (
        <Button spacing="compact" onClick={() => setNewModelOpen(true)} testId="strata-new-model-button">
          New model
        </Button>
      ) : undefined}
    >
      <p style={captionStyle}>
        The builder governs perspective weights, measures, integrity and lifecycle. Perspective weights must total 100,
        and each perspective's measure weights must total 100, before a model can be submitted for approval. A measure is
        an assignment of an existing KPI — its name, direction and threshold scheme are read from the KPI, never re-entered
        here. Preview-with-data and version diff are later slices.
      </p>
      <SectionState query={q} empty={list.length === 0}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((m) => {
            const myMeasures = (allMeasures.data ?? []).filter((x) => x.model_id === m.id);
            const myPerspectives = (allMP.data ?? []).filter((x) => x.model_id === m.id);
            // CFG-006: full integrity (perspective weights AND per-perspective
            // measure coverage) in one tested helper — empty perspectives are
            // failures, not skips, and drafts cannot submit past them.
            const integrity = computeModelIntegrity(myPerspectives, myMeasures, perspectiveNameById);
            // SC live validation: while the measures editor is open the band
            // validates the CURRENT draft rows (an unsaved measure must never
            // read as "no measures assigned"); persisted integrity keeps
            // gating submit, and the server revalidates at submit/approve.
            const live = liveMeasures[m.id] ?? null;
            const liveIntegrity = live
              ? computeModelIntegrity(myPerspectives, live.rows, perspectiveNameById)
              : integrity;
            const measuresDirty = live?.dirty ?? false;
            // SC-GOVAPPROVAL: DRAFT and CHANGES_REQUESTED are the two editable
            // states — requesting changes reopens the SAME version for editing.
            const editable = m.status === 'draft' || m.status === 'changes_requested';
            const submitBlockedReason = editable
              ? (measuresDirty
                ? 'Unsaved measure edits — save or cancel the measures editor before submitting'
                : draftSubmitBlockedReason(integrity))
              : undefined;
            // D-1: only an editable model's aggregate may be authored. Enforced at RLS and in the
            // set_model_measures RPC; mirrored here so the reason is visible up front rather than
            // discovered as a failed save. The UI is not the boundary — it is the explanation.
            const canAuthor = hasAuthorRole && editable;
            // The active predecessor this version proposes to replace (for honest pending copy).
            const activePredecessor = m.supersedes_id
              ? list.find((x) => x.id === m.supersedes_id && x.status === 'approved')
              : undefined;
            return (
              <GovRecordCard
                key={m.id}
                name={m.name}
                table="strata_scorecard_models"
                record={m}
                isScorecardModel
                onError={onError}
                submitBlockedReason={submitBlockedReason}
                approveBlockedReasons={m.status === 'pending_approval' && !integrity.ok
                  ? (integrity.perspectiveWeightsOk
                    ? integrity.measureIssues
                    : [`Perspective weights total ${integrity.weightSum} — must total 100`, ...integrity.measureIssues])
                  : undefined}
                copiedContents={modelVersionImpact(m.id, allMP.data ?? [], allMeasures.data ?? [])}
              >
                <ModelIntegrityBand
                  sum={liveIntegrity.weightSum}
                  count={liveIntegrity.weightCount}
                  measureIssues={liveIntegrity.measureIssues}
                  isDraft={editable}
                  unsaved={measuresDirty}
                />
                {m.status === 'pending_approval' ? (
                  <div data-testid={`strata-sc-pending-banner-${m.id}`}>
                    <SectionMessage
                      appearance="information"
                      title={`Awaiting ${nameOf(m.assigned_approver_id) ?? 'approver assignment'}`}
                    >
                      <p style={{ margin: 0 }}>
                        Version {m.version} is pending approval and cannot be edited.
                        {activePredecessor
                          ? ` Version ${activePredecessor.version} remains active and continues producing results until the proposed version is approved and becomes effective.`
                          : ''}
                        {' '}Withdraw the submission or request changes to edit version {m.version}.
                        {m.assigned_approver_id ? '' : ' A STRATA admin must assign an approver before this submission can be decided.'}
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: 'var(--ds-font-size-100)' }}>
                        {m.submitted_by ? `Submitted by ${nameOf(m.submitted_by)}` : 'Submitted before the governed workflow (submitter unrecorded)'}
                        {m.submitted_at ? ` on ${fmtDateTime(m.submitted_at)}` : ''}
                        {(m.submission_attempt ?? 0) > 0 ? ` · submission attempt ${m.submission_attempt}` : ''}
                        {' · effective immediately on approval'}
                      </p>
                    </SectionMessage>
                  </div>
                ) : null}
                {m.status === 'changes_requested' ? (
                  <div data-testid={`strata-sc-changes-banner-${m.id}`}>
                    <SectionMessage appearance="warning" title={`Changes requested by ${nameOf(m.assigned_approver_id) ?? 'the approver'}`}>
                      <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{m.review_comment ?? '—'}</p>
                      <p style={{ margin: '4px 0 0', fontSize: 'var(--ds-font-size-100)' }}>
                        Version {m.version} is editable again — fix the definition and resubmit.
                        Resubmission keeps the same version number.
                      </p>
                    </SectionMessage>
                  </div>
                ) : null}
                {m.status === 'rejected' ? (
                  <div data-testid={`strata-sc-rejected-banner-${m.id}`}>
                    <SectionMessage appearance="error" title={`Rejected by ${nameOf(m.rejected_by) ?? 'the approver'}`}>
                      <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{m.review_comment ?? '—'}</p>
                      <p style={{ margin: '4px 0 0', fontSize: 'var(--ds-font-size-100)' }}>
                        A rejected version is final — it can never be edited, resubmitted or activated.
                        To try again, create a new version from the approved model.
                      </p>
                    </SectionMessage>
                  </div>
                ) : null}
                {hasAuthorRole && !editable && m.status !== 'pending_approval' && m.status !== 'rejected' ? (
                  <span style={metaStyle} data-testid="strata-model-immutable-note">
                    {labelize(m.status)} definitions are immutable — to change this model&apos;s perspective
                    weights or measures, use Create new version. Version {m.version} keeps producing results
                    until the new draft is approved.
                  </span>
                ) : null}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span style={metaStyle}>Scope {labelize(m.owner_scope_type)}</span>
                  <span style={metaStyle}>Rollup {labelize(m.rollup_method)}</span>
                  <span style={metaStyle}>Granularity {labelize(m.period_granularity)}</span>
                </div>
                <ModelWeights model={m} canEditWeights={canAuthor} />
                <MeasureGroups
                  modelId={m.id}
                  measures={myMeasures}
                  canEdit={canAuthor}
                  onDraftChange={(state) => onLiveMeasures(m.id, state)}
                  concurrencyToken={m.updated_at}
                />
                <div>
                  <Button
                    spacing="compact"
                    appearance="subtle"
                    testId={`strata-sc-history-toggle-${m.id}`}
                    onClick={() => setHistoryOpen((prev) => ({ ...prev, [m.id]: !prev[m.id] }))}
                  >
                    {historyOpen[m.id] ? 'Hide approval history' : 'Show approval history'}
                  </Button>
                </div>
                {historyOpen[m.id] ? (
                  <StrataAuditHistory entityTable="strata_scorecard_models" entityId={m.id} title="Approval history" />
                ) : null}
              </GovRecordCard>
            );
          })}
        </div>
      </SectionState>

      {/* SC-DEF-001 — net-new model Draft. Identity/scope/rollup/granularity are the model's
          four required governed fields; threshold scheme is optional at create and can be set
          before approval. Perspectives and KPI measures are then authored on the resulting
          draft via the existing weights/measures editors below each card — which is why this
          creates a DRAFT and never an approved definition. */}
      {newModelOpen ? (
        <StrataFormModal
          open
          onClose={() => setNewModelOpen(false)}
          title="New scorecard model"
          description="Creates a draft at version 1. Add perspective weights and KPI measures next, then submit for approval."
          fields={[
            { key: 'name', label: 'Name', kind: 'text', required: true },
            { key: 'ownerScopeType', label: 'Owner scope', kind: 'select', required: true, options: OWNER_SCOPE_OPTIONS },
            { key: 'periodGranularity', label: 'Period granularity', kind: 'select', required: true, options: GRANULARITY_OPTIONS },
            { key: 'rollupMethod', label: 'Rollup method', kind: 'select', required: true, options: ROLLUP_OPTIONS },
            {
              key: 'thresholdSchemeId', label: 'Threshold scheme', kind: 'select',
              options: (schemes.data ?? []).map((s) => ({ value: s.id, label: s.name })),
              helper: 'Optional — required before approval',
            },
            { key: 'description', label: 'Description', kind: 'textarea' },
          ]}
          initial={{ ownerScopeType: 'enterprise', periodGranularity: 'quarter', rollupMethod: 'weighted_average' }}
          submitLabel="Create draft"
          testId="strata-new-model-modal"
          onSubmit={async (v) => {
            await scorecardApi.createModel({
              name: String(v.name),
              ownerScopeType: String(v.ownerScopeType),
              rollupMethod: String(v.rollupMethod),
              periodGranularity: String(v.periodGranularity),
              description: str(v.description),
              thresholdSchemeId: str(v.thresholdSchemeId),
            });
            invalidateModels();
          }}
        />
      ) : null}
    </StrataPanel>
  );
}

/** A band's readable range: From ≥ its own min_score, To < the next-higher
 * band's min_score (open top). Anchor 25 — the boundary is the design object. */
interface BandRow { key: string; label: string; appearance?: string; from: number; to: number | null }

const THRESHOLD_BAND_COLUMNS: Column<BandRow>[] = [
  {
    id: 'band', label: 'Band', flex: true,
    cell: ({ row }) => <StatusLozenge status={row.key} label={row.label} appearance={(row.appearance as LozengeAppearance) ?? 'default'} />,
  },
  {
    id: 'from', label: 'From ≥', width: 18,
    cell: ({ row }) => <span style={{ ...bodyStyle, fontVariantNumeric: 'tabular-nums' }}>{row.from}</span>,
  },
  {
    id: 'to', label: 'To <', width: 18,
    cell: ({ row }) => <span style={{ ...bodyStyle, fontVariantNumeric: 'tabular-nums' }}>{row.to ?? '—'}</span>,
  },
];

/** Exported for regression tests — the range derivation is the anchor-25 object. */
export function bandRows(bands: ThresholdBand[]): BandRow[] {
  const sorted = [...bands].sort((a, b) => b.min_score - a.min_score);
  return sorted.map((b, i) => ({
    key: b.key, label: b.label, appearance: b.appearance,
    from: b.min_score, to: i === 0 ? null : sorted[i - 1].min_score,
  }));
}

/**
 * R5 — band editor.
 *
 * Every rule below is sourced from the DB, not invented (probed on staging 2026-07-17):
 *
 *  - SHAPE: bands is `[{key,label,min_score,appearance?}, …]`. There is NO `max`/upper bound on a
 *    band — a band is a FLOOR only. The "To <" shown is derived, never stored.
 *  - RESOLUTION: strata_band_from_score() picks `min_score <= score ORDER BY min_score DESC LIMIT 1`,
 *    falling back to the LOWEST min_score band when the score is under every floor. So array order
 *    is irrelevant (the resolver sorts), and there is no gap or overlap to police — floors alone
 *    cannot overlap, and the bottom is covered by that fallback.
 *  - CONSTRAINT: the ONLY DB check on the column is `jsonb_typeof(bands) = 'array'`. The database
 *    does NOT enforce ordering, coverage, non-overlap, unique keys or unique floors.
 *
 * Because of that last point the editor blocks ONLY what is needed to construct a band at all
 * (a key, a label, a numeric floor — form-level requirements). It does NOT invent a governance
 * rule the server would happily accept. Where a saveable configuration is nonetheless ambiguous
 * (two bands sharing a floor => the resolver's LIMIT 1 picks between them non-deterministically),
 * the editor says so as an ADVISORY and still lets it save — the server is the authority on what
 * is legal, and pretending otherwise would be a rule we made up.
 */
const BAND_APPEARANCES: LozengeAppearance[] = ['default', 'inprogress', 'success', 'removed', 'moved', 'new'];
/** Options are the ADS lozenge appearance NAMES — the component owns the colour, we never map one.
 * The preview renders a real StatusLozenge so the author sees the colour ADS will actually use. */
const APPEARANCE_OPTIONS: SelectOption[] = BAND_APPEARANCES.map((a) => ({
  value: a, label: <StatusLozenge status={a} label={a} appearance={a} />,
}));

/** One editable band. min_score is held as a string while typing (an empty field is not 0). */
interface BandDraft { rowId: string; key: string; label: string; minScore: string; appearance: string | null }

const toDraft = (bands: ThresholdBand[]): BandDraft[] =>
  [...bands]
    .sort((a, b) => b.min_score - a.min_score)
    .map((b, i) => ({
      rowId: `${b.key}-${i}`, key: b.key, label: b.label,
      minScore: String(b.min_score), appearance: b.appearance ?? null,
    }));

/** Exported for tests: the draft→payload mapping and the blocking rules, in one place.
 * `blocked` is the list of things that make a band unconstructable — NOT a policy opinion. */
export function bandDraftToPayload(draft: BandDraft[]): { bands: ThresholdBand[]; blocked: string[]; advisories: string[] } {
  const blocked: string[] = [];
  const advisories: string[] = [];
  if (draft.length === 0) blocked.push('A scheme with no bands can never rate anything — add at least one band.');
  draft.forEach((d, i) => {
    const where = d.label.trim() || d.key.trim() || `Band ${i + 1}`;
    if (d.key.trim() === '') blocked.push(`${where}: a band key is required — it is the value stored against every rated KPI.`);
    if (d.label.trim() === '') blocked.push(`${where}: a band label is required.`);
    if (d.minScore.trim() === '' || !Number.isFinite(Number(d.minScore))) {
      blocked.push(`${where}: the floor must be a number — the rating query casts it to numeric.`);
    }
  });
  const keys = draft.map((d) => d.key.trim()).filter((k) => k !== '');
  const dupKeys = keys.filter((k, i) => keys.indexOf(k) !== i);
  for (const k of [...new Set(dupKeys)]) {
    blocked.push(`Two bands share the key “${k}” — a rated KPI stores only the key, so the two would be indistinguishable.`);
  }
  const floors = draft.map((d) => Number(d.minScore)).filter((n) => Number.isFinite(n));
  const dupFloors = floors.filter((n, i) => floors.indexOf(n) !== i);
  for (const f of [...new Set(dupFloors)]) {
    // Advisory, not blocked: the database accepts this. It is the resolver's ORDER BY … LIMIT 1
    // that becomes arbitrary between the tied bands, and that is worth saying out loud.
    advisories.push(`Two bands start at ${f}. The database accepts this, but the rating query takes the highest floor at or below a score and stops at the first match — with a tie, which of the two wins is not determined.`);
  }
  const bands: ThresholdBand[] = draft.map((d) => ({
    key: d.key.trim(),
    label: d.label.trim(),
    min_score: Number(d.minScore),
    // Zero-assumption: an unset appearance stays unset. We do not default it to a colour.
    ...(d.appearance ? { appearance: d.appearance } : {}),
  }));
  return { bands, blocked, advisories };
}

/** A band key rendered as the lozenge ADS will actually use — the component owns the colour, we
 * never map one. Zero-assumption: no key => a dash, not a fabricated band. A key with no matching
 * band definition keeps the key as its own label rather than inventing one. */
function bandCell(bands: ThresholdBand[], key: string | null) {
  if (!key) return <span style={bodyStyle}>—</span>;
  const b = bands.find((x) => x.key === key);
  return <StatusLozenge status={key} label={b?.label ?? key} appearance={(b?.appearance as LozengeAppearance) ?? 'default'} />;
}

const num = (n: number | null, dp = 2) =>
  // Zero-assumption: a missing number is a dash. Never 0 — 0 is a real score.
  n === null || n === undefined ? '—' : n.toFixed(dp);

/** Built per render from both band sets (each lozenge needs its own set's label+appearance).
 * Deliberately a plain function, not a useMemo: a memo dep here buys nothing and TDZ-risks the
 * const it would depend on. */
function previewMoveColumns(current: ThresholdBand[], candidate: ThresholdBand[]): Column<StrataThresholdPreviewMove>[] {
  return [
    {
      id: 'entity', label: 'Value', flex: true,
      cell: ({ row }) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Zero-assumption: an entity we cannot name shows a dash, never a made-up label. */}
          <span style={bodyStyle}>{row.entity_name ?? '—'}</span>
          <span style={captionStyle}>{labelize(row.entity_type)}{row.metric_key ? ` · ${row.metric_key}` : ''}</span>
        </div>
      ),
    },
    { id: 'period', label: 'Period', width: 22, cell: ({ row }) => <span style={bodyStyle}>{row.period_name ?? '—'}</span> },
    {
      id: 'score', label: 'Score', width: 14,
      cell: ({ row }) => <span style={{ ...bodyStyle, fontVariantNumeric: 'tabular-nums' }}>{num(row.score)}</span>,
    },
    { id: 'today', label: 'Rated today', width: 18, cell: ({ row }) => bandCell(current, row.band_today) },
    { id: 'candidate', label: 'Candidate would rate', width: 24, cell: ({ row }) => bandCell(candidate, row.band_candidate) },
  ];
}

interface DistRow { key: string; count_today: number; count_candidate: number }

function previewDistColumns(current: ThresholdBand[], candidate: ThresholdBand[]): Column<DistRow>[] {
  return [
    { id: 'band', label: 'Band', flex: true, cell: ({ row }) => bandCell(candidate.some((b) => b.key === row.key) ? candidate : current, row.key) },
    {
      id: 'today', label: 'Now', width: 14,
      cell: ({ row }) => <span style={{ ...bodyStyle, fontVariantNumeric: 'tabular-nums' }}>{row.count_today}</span>,
    },
    {
      id: 'candidate', label: 'Under candidate', width: 20,
      cell: ({ row }) => <span style={{ ...bodyStyle, fontVariantNumeric: 'tabular-nums' }}>{row.count_candidate}</span>,
    },
    {
      id: 'delta', label: 'Change', width: 14,
      cell: ({ row }) => {
        const d = row.count_candidate - row.count_today;
        // Sign carries the meaning; colour would have to invent a judgement about whether a band
        // growing is good or bad, and nothing in the config says which.
        return <span style={{ ...bodyStyle, fontVariantNumeric: 'tabular-nums' }}>{d === 0 ? '—' : d > 0 ? `+${d}` : String(d)}</span>;
      },
    },
  ];
}

/**
 * R5 capability 3 — preview-with-data, for threshold schemes.
 *
 * Exported as its own section so it can be tested directly rather than through the page.
 *
 * ⚠️ THE WORDING HERE IS LOAD-BEARING. This panel must never say the listed values "will change".
 * Saving bands does NOT re-rate a single stored row: a rating is written once, at calculation time,
 * so new bands govern FUTURE calculations only, and locked snapshots never re-rate at all (D-1).
 * The honest claim — and the useful one — is "the candidate policy would rate these differently".
 *
 * The panel renders `coverage_note` VERBATIM. It is a lower bound: values whose provenance carries
 * no threshold_scheme_id, or that have no score, are invisible to the preview. Absence from the
 * list is not evidence, and re-wording the server's own statement of its limits would soften it.
 */
export function ThresholdPreviewPanel({
  scheme, bands, isDisabled,
}: { scheme: StrataThresholdScheme; bands: ThresholdBand[]; isDisabled?: boolean }) {
  const [preview, setPreview] = useState<StrataThresholdPreview | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      setPreview(await configApi.previewThresholdScheme(scheme.id, bands));
    } catch (e) {
      // Verbatim — the server's refusal is the message.
      setError(e instanceof Error ? e.message : String(e));
      setPreview(null);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-100)' }} data-testid={`strata-threshold-preview-${scheme.id}`}>
      <div>
        <Button
          spacing="compact" isDisabled={isDisabled || running}
          onClick={() => void run()} testId={`strata-preview-run-${scheme.id}`}
        >
          {running ? 'Previewing…' : 'Preview against data'}
        </Button>
      </div>

      {error ? (
        <SectionMessage appearance="error" title="Preview rejected">
          <p style={{ whiteSpace: 'pre-wrap' }}>{error}</p>
        </SectionMessage>
      ) : null}

      {preview ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-100)' }} data-testid="strata-preview-result">
          <p style={captionStyle} data-testid="strata-preview-summary">
            {preview.moved_count === 0
              ? `No change: all ${preview.evaluated} rated value${preview.evaluated === 1 ? '' : 's'} keep the same band under these bands.`
              : `${preview.moved_count} of ${preview.evaluated} rated values would be rated differently by these bands.`}
            {' '}These values are not re-rated by saving — a rating is written when a value is calculated, so
            new bands apply to future calculations only, and locked snapshots are never re-rated.
          </p>

          {preview.band_distribution.length > 0 ? (
            <JiraTable<DistRow>
              columns={previewDistColumns(preview.current_bands, preview.candidate_bands)}
              data={preview.band_distribution}
              getRowId={(d) => d.key}
              showRowCount={false}
              ariaLabel={`Band populations now and under the candidate bands for ${scheme.name}`}
            />
          ) : null}

          {preview.moves.length > 0 ? (
            <JiraTable<StrataThresholdPreviewMove>
              columns={previewMoveColumns(preview.current_bands, preview.candidate_bands)}
              data={preview.moves}
              getRowId={(m) => `${m.entity_id}-${m.period_id}-${m.metric_key}`}
              showRowCount={false}
              ariaLabel={`Values the candidate bands would rate differently for ${scheme.name}`}
            />
          ) : null}

          {/* The cap declares its own overflow rather than truncating in silence. */}
          {preview.moves_not_named > 0 ? (
            <SectionMessage appearance="warning" title="Not every mover is listed">
              <p>
                {`${preview.moves_named} of ${preview.moved_count} are listed above. The remaining ${preview.moves_not_named} are counted but not named here.`}
              </p>
            </SectionMessage>
          ) : null}

          {preview.moves_in_locked_snapshots > 0 ? (
            <SectionMessage appearance="information" title="Some are in locked snapshots">
              <p>
                {`${preview.moves_in_locked_snapshots} of these values sit in locked snapshots. Those are reported so the decision is informed — they are never re-rated, and published history does not move.`}
              </p>
            </SectionMessage>
          ) : null}

          {preview.stored_status_drift > 0 ? (
            <SectionMessage appearance="warning" title="Stored ratings already disagree with the current bands">
              <p>
                {`${preview.stored_status_drift} stored value${preview.stored_status_drift === 1 ? '' : 's'} already carry a rating that the scheme's CURRENT bands would not give them — they were rated under an earlier version. "Rated today" above is the current bands' answer, not what is stored.`}
              </p>
            </SectionMessage>
          ) : null}

          {/* VERBATIM. The server states the limits of its own analysis; re-wording it softens it. */}
          <SectionMessage appearance="information" title="What this preview cannot see">
            <p style={{ whiteSpace: 'pre-wrap' }} data-testid="strata-preview-coverage">{preview.coverage_note}</p>
          </SectionMessage>
        </div>
      ) : null}
    </div>
  );
}

/** The band editor for a DRAFT scheme. Rendered only where RLS would permit the write. */
export function ThresholdBandEditor({ scheme, onDone }: { scheme: StrataThresholdScheme; onDone: () => void }) {
  const invalidate = useInvalidateStrata();
  const [draft, setDraft] = useState<BandDraft[]>(() => toDraft(scheme.bands ?? []));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { bands, blocked, advisories } = bandDraftToPayload(draft);
  const patch = (rowId: string, p: Partial<BandDraft>) =>
    setDraft((prev) => prev.map((d) => (d.rowId === rowId ? { ...d, ...p } : d)));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await configApi.updateThresholdBands(scheme.id, bands);
      invalidate();
      onDone();
    } catch (e) {
      // Verbatim — never re-worded.
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-100)' }} data-testid={`strata-band-editor-${scheme.id}`}>
      {draft.map((d, i) => (
        <div key={d.rowId} style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-100)', flexWrap: 'wrap' }}>
          <div style={{ width: 120 }}>
            <Textfield
              spacing="compact" value={d.key} isDisabled={saving}
              onChange={(e) => patch(d.rowId, { key: e.target.value })}
              aria-label={`Key for band ${i + 1}`} placeholder="Key"
              testId={`strata-band-key-${i}`}
            />
          </div>
          <div style={{ width: 160 }}>
            <Textfield
              spacing="compact" value={d.label} isDisabled={saving}
              onChange={(e) => patch(d.rowId, { label: e.target.value })}
              aria-label={`Label for band ${i + 1}`} placeholder="Label"
              testId={`strata-band-label-${i}`}
            />
          </div>
          <div style={{ width: 120 }}>
            <Textfield
              type="number" spacing="compact" value={d.minScore} isDisabled={saving}
              onChange={(e) => patch(d.rowId, { minScore: e.target.value })}
              aria-label={`Floor score for band ${i + 1}`} placeholder="From ≥"
              testId={`strata-band-min-${i}`}
            />
          </div>
          <div style={{ width: 170 }}>
            <Select
              options={APPEARANCE_OPTIONS}
              value={APPEARANCE_OPTIONS.find((o) => o.value === d.appearance) ?? null}
              onChange={(o) => patch(d.rowId, { appearance: o ? String(o.value) : null })}
              isDisabled={saving} isSearchable={false} usePortal isClearable
              placeholder="Appearance"
              aria-label={`Appearance for band ${i + 1}`}
            />
          </div>
          <Button
            spacing="compact" appearance="subtle" isDisabled={saving}
            onClick={() => setDraft((prev) => prev.filter((x) => x.rowId !== d.rowId))}
            testId={`strata-band-remove-${i}`}
          >
            Remove
          </Button>
        </div>
      ))}
      <div>
        <Button
          spacing="compact" isDisabled={saving}
          onClick={() => setDraft((prev) => [...prev, {
            rowId: `new-${prev.length}-${Date.now()}`, key: '', label: '', minScore: '', appearance: null,
          }])}
          testId={`strata-band-add-${scheme.id}`}
        >
          Add band
        </Button>
      </div>
      {/* The resolver's semantics, made visible: the same derivation the read-only table uses. */}
      {blocked.length === 0 && bands.length > 0 ? (
        <JiraTable<BandRow>
          columns={THRESHOLD_BAND_COLUMNS}
          data={bandRows(bands)}
          getRowId={(b) => b.key}
          showRowCount={false}
          ariaLabel={`Resulting bands for ${scheme.name}`}
        />
      ) : null}
      {blocked.length > 0 ? (
        <SectionMessage appearance="error" title="Cannot save yet">
          <ul style={{ margin: 0, paddingLeft: 'var(--ds-space-200)' }}>
            {blocked.map((b) => <li key={b}>{b}</li>)}
          </ul>
        </SectionMessage>
      ) : null}
      {/* R5 cap.3 — preview the CANDIDATE bands against real data before saving. Offered only when
          the draft is actually well-formed: previewing bands that cannot be constructed would ask
          the server a question about a configuration that does not exist. */}
      {blocked.length === 0 && bands.length > 0 ? (
        <ThresholdPreviewPanel scheme={scheme} bands={bands} isDisabled={saving} />
      ) : null}
      {advisories.length > 0 ? (
        <SectionMessage appearance="warning" title="Saveable, but ambiguous">
          <ul style={{ margin: 0, paddingLeft: 'var(--ds-space-200)' }}>
            {advisories.map((a) => <li key={a}>{a}</li>)}
          </ul>
        </SectionMessage>
      ) : null}
      <div style={{ display: 'flex', gap: 'var(--ds-space-100)', flexWrap: 'wrap' }}>
        <Button
          spacing="compact" appearance="primary" isDisabled={saving || blocked.length > 0}
          onClick={() => void save()} testId={`strata-band-save-${scheme.id}`}
        >
          {saving ? 'Saving…' : 'Save bands'}
        </Button>
        <Button spacing="compact" appearance="subtle" isDisabled={saving} onClick={onDone}>Cancel</Button>
      </div>
      {error ? (
        <SectionMessage appearance="error" title="Action rejected">
          <p style={{ whiteSpace: 'pre-wrap' }}>{error}</p>
        </SectionMessage>
      ) : null}
    </div>
  );
}

export function ThresholdsSection({ onError }: { onError: OnError }) {
  const q = useThresholdSchemes();
  const roles = useStrataRoles();
  const userId = useStrataUserId();
  // CFG-004: KPIs rated by each scheme, for the lifecycle dialogs.
  const kpisQ = useKpis();
  const [editingId, setEditingId] = useState<string | null>(null);
  const list = q.data ?? [];
  // Mirrors strata_is_admin() — useStrataRoles already folds the platform-admin RPC into the
  // role list, so this is the server's own predicate, not an approximation of it.
  const isStrataAdmin = (roles.data ?? []).includes('strata_admin');
  const pending = list.filter((s) => s.status === 'pending_approval');
  // Sibling-version count per name → surfaces "compare versions" affordance honestly.
  const versionsByName = new Map<string, number>();
  for (const s of list) versionsByName.set(s.name, (versionsByName.get(s.name) ?? 0) + 1);

  return (
    <StrataPanel title="Threshold schemes" icon={<BarChart3 size={16} />} count={list.length} testId="strata-admin-thresholds">
      <p style={captionStyle}>
        A threshold scheme turns an achievement score into a rating — the bands below are governed policy, effective-dated so
        past periods keep their scheme version. A band is a floor: a score is rated by the highest floor at or below it, so
        bands need no upper bound. Draft bands are editable; an approved scheme is immutable and changing it means a new
        version. The server-calculated impact preview is a later feature.
      </p>
      {pending.length > 0 ? (
        <div style={{ marginBottom: 12 }}>
          <SectionMessage appearance="warning" title={`${pending.length} scheme change${pending.length === 1 ? '' : 's'} pending approval`}>
            <p>
              {pending.map((p) => `${p.name} v${p.version}`).join(', ')} — a different strata_admin than the author must
              approve. Self-approval is blocked in the database.
            </p>
          </SectionMessage>
        </div>
      ) : null}
      <SectionState query={q} empty={list.length === 0}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((s) => {
            // The RLS UPDATE predicate, mirrored exactly: status='draft' AND (created_by = auth.uid()
            // OR strata_is_admin()). Deliberately NOT the revision RPC's strategy_office gate — that
            // rule governs cloning an approved scheme, not editing a draft's bands.
            const isAuthor = s.created_by != null && userId.data != null && s.created_by === userId.data;
            const canEditBands = s.status === 'draft' && (isAuthor || isStrataAdmin);
            // Why the control is absent — never a silent hide (anchor 05 states rules).
            const noEditReason = s.status !== 'draft'
              ? `${labelize(s.status)} definitions are immutable — to change these bands, use Create new version. Version ${s.version} keeps producing ratings until the new draft is approved.`
              : (roles.isLoading || userId.isLoading
                ? null
                : 'Only this draft’s author or a strata_admin can edit its bands — the database refuses anyone else.');
            return (
            <GovRecordCard key={s.id} name={s.name} table="strata_threshold_schemes" record={s} onError={onError}
              impact={kpisQ.data ? thresholdSchemeDependents(s.id, kpisQ.data) : undefined}
              headerActions={canEditBands && editingId !== s.id ? (
                <Button spacing="compact" onClick={() => setEditingId(s.id)} testId={`strata-band-edit-${s.id}`}>
                  Edit bands
                </Button>
              ) : null}
            >
              {s.description ? <span style={metaStyle}>{s.description}</span> : null}
              {(versionsByName.get(s.name) ?? 0) > 1 ? (
                <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>
                  Multiple versions of “{s.name}” exist — compare the bands across the cards to see what a version changes.
                </span>
              ) : null}
              {!canEditBands && noEditReason ? (
                <span style={metaStyle} data-testid={`strata-band-noedit-${s.id}`}>{noEditReason}</span>
              ) : null}
              {editingId === s.id ? (
                <ThresholdBandEditor scheme={s} onDone={() => setEditingId(null)} />
              ) : (s.bands ?? []).length > 0 ? (
                <JiraTable<BandRow>
                  columns={THRESHOLD_BAND_COLUMNS}
                  data={bandRows(s.bands)}
                  getRowId={(b) => b.key}
                  showRowCount={false}
                  ariaLabel={`Bands for ${s.name} v${s.version}`}
                />
              ) : <span style={metaStyle}>No bands configured.</span>}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span style={metaStyle}>Tolerance {s.tolerance ?? '—'}</span>
                <span style={metaStyle}>Confidence threshold {s.confidence_threshold ?? '—'}</span>
              </div>
            </GovRecordCard>
            );
          })}
        </div>
      </SectionState>
    </StrataPanel>
  );
}

function ValueTaxonomySection({ onError }: { onError: OnError }) {
  const q = useValueCategories();
  // CFG-004 (C6): portfolios/benefits classified under each category are its
  // real consumers — both unfiltered queries existed, they were never wired.
  const portfoliosQ = usePortfolios();
  const benefitsQ = useBenefits();
  const list = q.data ?? [];
  return (
    <StrataPanel title="Value taxonomy" icon={<Gem size={16} />} count={list.length} testId="strata-admin-value-taxonomy">
      <SectionState query={q} empty={list.length === 0}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((c) => (
            <GovRecordCard
              key={c.id}
              name={c.name}
              table="strata_value_categories"
              record={c}
              onError={onError}
              impact={portfoliosQ.data && benefitsQ.data
                ? valueCategoryDependents(c.id, portfoliosQ.data, benefitsQ.data)
                : undefined}
            >
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={metaStyle}>Unit {c.measurement_unit ?? '—'}</span>
                {c.validator_role ? <CatalystTag text={labelize(c.validator_role)} /> : null}
                <span style={metaStyle}>Cadence {c.realization_cadence ? labelize(c.realization_cadence) : '—'}</span>
              </div>
            </GovRecordCard>
          ))}
        </div>
      </SectionState>
    </StrataPanel>
  );
}

function GatesSection({ onError }: { onError: OnError }) {
  const q = useGateModels();
  // CFG-004 (C6): gate instances recorded under each model are its consumers.
  const instancesQ = useGateInstances();
  const list = q.data ?? [];
  return (
    <StrataPanel title="Gate models" icon={<ShieldCheck size={16} />} count={list.length} testId="strata-admin-gates">
      <SectionState query={q} empty={list.length === 0}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((g) => (
            <GovRecordCard
              key={g.id}
              name={g.name}
              table="strata_gate_models"
              record={g}
              onError={onError}
              impact={instancesQ.data ? gateModelDependents(g.id, instancesQ.data) : undefined}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(g.stages ?? []).map((st) => (
                  <div key={st.id} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.text }}>
                      {st.order_index}. {st.name}
                    </span>
                    <span style={metaStyle}>{(st.criteria ?? []).length} criteria</span>
                    {(st.decision_options ?? []).map((d) => <CatalystTag key={d} text={labelize(d)} />)}
                    {(st.approval_roles ?? []).map((r) => <CatalystTag key={r} text={labelize(r)} color="grey" />)}
                  </div>
                ))}
                {(g.stages ?? []).length === 0 ? <span style={metaStyle}>No stages configured</span> : null}
              </div>
            </GovRecordCard>
          ))}
        </div>
      </SectionState>
    </StrataPanel>
  );
}

export function KpiTypesSection({ onError }: { onError: OnError }) {
  const q = useKpiTypes();
  // CFG-004: KPIs referencing each type — the lifecycle dialogs show them.
  const kpisQ = useKpis();
  const list = q.data ?? [];
  return (
    <StrataPanel title="KPI types" icon={<ListChecks size={16} />} count={list.length} testId="strata-admin-kpi-types">
      <SectionState query={q} empty={list.length === 0}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((k) => (
            <GovRecordCard
              key={k.id}
              name={k.name}
              table="strata_kpi_type_configs"
              record={k}
              onError={onError}
              impact={kpisQ.data
                ? kpisQ.data.filter((x) => x.kpi_type_id === k.id).map((x) => `KPI ${x.name}${x.status ? ` · ${labelize(x.status)}` : ''}`)
                : undefined}
            >
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <CatalystInlineCode>{k.formula_template}</CatalystInlineCode>
                <span style={metaStyle}>{DIRECTIONALITY_LABEL[k.directionality] ?? labelize(k.directionality)}</span>
              </div>
            </GovRecordCard>
          ))}
        </div>
      </SectionState>
    </StrataPanel>
  );
}

interface TemplateColumnRow { column: string; label: string; type: string; required?: boolean }

const TEMPLATE_COLUMNS: Column<TemplateColumnRow>[] = [
  {
    id: 'column', label: 'Column', width: 24,
    cell: ({ row }) => <span style={{ ...codeStyle, color: T.text }}>{row.column}</span>,
  },
  {
    id: 'label', label: 'Label', flex: true,
    cell: ({ row }) => <span style={bodyStyle}>{row.label}</span>,
  },
  {
    id: 'type', label: 'Type', width: 16,
    cell: ({ row }) => <CatalystTag text={labelize(row.type)} />,
  },
  {
    id: 'required', label: 'Required', width: 14,
    cell: ({ row }) => (
      <span style={row.required ? { ...bodyStyle, fontWeight: 600 } : { fontSize: 'var(--ds-font-size-200)', color: T.subtlest }}>
        {row.required ? 'Required' : 'Optional'}
      </span>
    ),
  },
];

export function UploadTemplatesSection({ onError }: { onError: OnError }) {
  const q = useUploadTemplates();
  // CFG-004: upload runs validated under each template are its consumers.
  const runsQ = useUploadRuns();
  const list = q.data ?? [];
  return (
    <StrataPanel title="Upload templates" icon={<Upload size={16} />} count={list.length} testId="strata-admin-upload-templates">
      <SectionState query={q} empty={list.length === 0}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((t) => (
            <GovRecordCard
              key={t.id}
              name={t.name}
              table="strata_upload_templates"
              record={t}
              onError={onError}
              impact={runsQ.data
                ? (() => {
                  const n = runsQ.data.filter((r) => r.template_id === t.id).length;
                  return n > 0 ? [`${n} upload run${n === 1 ? ' was' : 's were'} validated under this template — promoted history keeps this version`] : [];
                })()
                : undefined}
            >
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span style={metaStyle}>Target entity {labelize(t.target_entity)}</span>
                <span style={metaStyle}>{(t.validation_rules ?? []).length} validation rules</span>
              </div>
              {(t.column_schema ?? []).length > 0 ? (
                <JiraTable<TemplateColumnRow>
                  columns={TEMPLATE_COLUMNS}
                  data={t.column_schema ?? []}
                  getRowId={(c) => c.column}
                  showRowCount={false}
                  ariaLabel={`Column schema for ${t.name}`}
                />
              ) : null}
            </GovRecordCard>
          ))}
        </div>
      </SectionState>
    </StrataPanel>
  );
}

export function WorkflowsSection({ onError }: { onError: OnError }) {
  const q = useWorkflowConfigs();
  // CFG-004 (C6): a workflow's consumers are the records of its entity_type.
  // Enumerable types are counted from real queries; an unmapped type yields
  // undefined and the dialog stays silent — never an invented count.
  const kpisQ = useKpis();
  const modelsQ = useScorecardModels();
  const cardsQ = useProjectCards();
  const { activeCycle } = useStrataContext();
  const elementsQ = useStrategyElements(activeCycle?.id);
  const tallyFor = (entityType: string) => {
    switch (entityType) {
      case 'kpi': return kpisQ.data ? { label: 'KPI', count: kpisQ.data.length } : undefined;
      case 'scorecard_model': return modelsQ.data ? { label: 'scorecard model', count: modelsQ.data.length } : undefined;
      case 'project_card': return cardsQ.data ? { label: 'Project Card', count: cardsQ.data.length } : undefined;
      case 'strategy_element': return elementsQ.data && activeCycle
        ? { label: 'strategy element', count: elementsQ.data.length, qualifier: `in ${activeCycle.name}` }
        : undefined;
      default: return undefined;
    }
  };
  const list = q.data ?? [];
  return (
    <StrataPanel title="Workflows" icon={<GitBranch size={16} />} count={list.length} testId="strata-admin-workflows">
      <SectionState query={q} empty={list.length === 0}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((w) => (
            <GovRecordCard
              key={w.id}
              name={w.name}
              table="strata_workflow_configs"
              record={w}
              onError={onError}
              impact={workflowEntityDependents(w.entity_type, tallyFor(w.entity_type))}
            >
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={metaStyle}>Entity {labelize(w.entity_type)}</span>
                {(w.states ?? []).map((s) => <CatalystTag key={s.key} text={s.label} />)}
              </div>
              {(w.transitions ?? []).length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {(w.transitions ?? []).map((t, i) => (
                    <div key={`${t.from}-${t.to}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: `1px solid ${T.border}` }}>
                      <span style={bodyStyle}>{labelize(t.from)}</span>
                      <span aria-hidden style={{ display: 'inline-flex', color: T.subtlest }}><MoveRight size={14} /></span>
                      <span style={bodyStyle}>{labelize(t.to)}</span>
                      {(t.roles ?? []).map((r) => <CatalystTag key={r} text={labelize(r)} color="grey" />)}
                    </div>
                  ))}
                </div>
              ) : (
                <span style={metaStyle}>No transitions configured</span>
              )}
            </GovRecordCard>
          ))}
        </div>
      </SectionState>
    </StrataPanel>
  );
}

export const ROLE_DOCS: Array<{ role: StrataRole; purpose: string }> = [
  { role: 'strata_admin', purpose: 'Owns the configuration engine — creates and maintains governed config records.' },
  { role: 'strategy_office', purpose: 'Curates strategy elements, scorecard models and the review cadence.' },
  { role: 'executive_viewer', purpose: 'Read-only consumption of scorecards, reviews and board packs.' },
  { role: 'kpi_owner', purpose: 'Accountable for KPI definitions, targets and submitted actuals.' },
  { role: 'vmo_validator', purpose: 'Validates benefit values and attests actuals — never their own submissions.' },
  { role: 'data_steward', purpose: 'Registers data sources, runs uploads, owns data quality and lineage.' },
];

interface RoleRow { role: StrataRole; purpose: string; assigned: boolean }

const ROLE_COLUMNS: Column<RoleRow>[] = [
  {
    id: 'role', label: 'Role', width: 24,
    cell: ({ row }) => (
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span style={{ ...bodyStyle, fontWeight: 500, fontSize: 'var(--ds-font-size-400)', lineHeight: 'var(--ds-line-height-body)' }}>{labelize(row.role)}</span>
        <span style={codeStyle}>{row.role}</span>
      </span>
    ),
  },
  {
    id: 'purpose', label: 'Purpose', flex: true,
    cell: ({ row }) => <span style={bodyStyle}>{row.purpose}</span>,
  },
  {
    id: 'assigned', label: 'Assigned to you', width: 16,
    cell: ({ row }) => (row.assigned
      ? <StatusLozenge status="yes" label="Yes" appearance="success" />
      : <span style={{ color: T.subtlest }}>—</span>),
  },
];

/** strata_role_assignments row (domain returns untyped rows). */
interface RoleAssignmentRow {
  id: string;
  user_id: string;
  role: StrataRole;
  scope_type: string;
  scope_entity_id: string | null;
  granted_by: string | null;
  /** null on CFG-005 derived rows — a bypass role has no grant event. */
  granted_at: string | null;
  /** CFG-005: true when derived from the platform-admin bypass, not a grant. */
  derived?: boolean;
}

const ASSIGNABLE_ROLES: Array<{ value: string; label: string }> =
  ROLE_DOCS.map((r) => ({ value: r.role, label: labelize(r.role) }));

function RolesSection({ onError }: { onError: OnError }) {
  const roles = useStrataRoles();
  const mine = roles.data ?? [];
  const assignmentsQ = useRoleAssignments();
  const profilesQ = useProfileNames();
  const invalidate = useInvalidateStrata();
  const [assignOpen, setAssignOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // UI affordance gating only — the RPCs also authorise platform admins
  // server-side, even without a strata_admin assignment row.
  const isStrataAdmin = mine.includes('strata_admin');
  const assignments = (assignmentsQ.data ?? []) as RoleAssignmentRow[];
  // CFG-005 (Cycle 4): this section — /strata/admin/roles — is a second roles
  // surface; the derived platform-admin row previously landed only on
  // /strata/admin/access. Same helper, same labelling, no Revoke for derived.
  const userIdQ = useStrataUserId();
  const derivedRows = deriveEffectiveAdminRows(userIdQ.data, roles.data, assignments) as unknown as RoleAssignmentRow[];
  const displayRows = [...assignments, ...derivedRows];
  const profileName = (id: string | null): string | null =>
    id ? profilesQ.data?.get(id)?.name ?? null : null;

  const revoke = async (assignmentId: string) => {
    setBusyId(assignmentId);
    onError(null);
    try {
      await governanceApi.revokeRole(assignmentId);
      invalidate();
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  };

  const assignmentColumns: Column<RoleAssignmentRow>[] = [
    {
      id: 'user', label: 'User', flex: true,
      cell: ({ row }) => {
        const name = profileName(row.user_id);
        return name ? <span style={bodyStyle}>{name}</span> : <span style={{ color: T.subtlest }}>—</span>;
      },
    },
    {
      id: 'role', label: 'Role', width: 18,
      cell: ({ row }) => (
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start' }}>
          <StatusLozenge status={row.role} label={labelize(row.role)} appearance="default" />
          {row.derived ? (
            // CFG-008 (C6): the caption must WRAP inside the fixed-width Role
            // column — it was ellipsizing at ≤1204px.
            <span
              style={{ ...metaStyle, fontSize: 'var(--ds-font-size-075)', whiteSpace: 'normal', overflowWrap: 'anywhere', lineHeight: 1.3 }}
              data-testid="strata-admin-derived-role"
            >
              via platform admin — no explicit grant
            </span>
          ) : null}
        </span>
      ),
    },
    {
      id: 'scope', label: 'Scope', width: 12,
      cell: ({ row }) => <span style={metaStyle}>{labelize(row.scope_type)}</span>,
    },
    {
      id: 'granted', label: 'Granted', width: 13,
      cell: ({ row }) => (row.granted_at
        ? <span style={{ ...bodyStyle, fontVariantNumeric: 'tabular-nums' }}>{fmtDate(row.granted_at)}</span>
        : <span style={{ color: T.subtlest }}>—</span>),
    },
    {
      id: 'granted-by', label: 'Granted by', width: 15,
      cell: ({ row }) => {
        const name = profileName(row.granted_by);
        return name ? <span style={metaStyle}>{name}</span> : <span style={{ color: T.subtlest }}>—</span>;
      },
    },
    ...(isStrataAdmin ? [{
      id: 'revoke', label: '', width: 10, align: 'end' as const,
      // CFG-005: derived access has no assignment row to revoke — offering the
      // verb would promise an action the server cannot perform.
      cell: ({ row }: { row: RoleAssignmentRow }) => (row.derived ? null : (
        <Button
          spacing="compact"
          appearance="subtle"
          isDisabled={busyId === row.id}
          onClick={() => void revoke(row.id)}
          testId={`strata-admin-revoke-${row.id}`}
        >
          Revoke
        </Button>
      )),
    }] : []),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <StrataPanel
        title="Role assignments"
        icon={<Users size={16} />}
        count={displayRows.length}
        noPadding
        testId="strata-admin-role-assignments"
        actions={isStrataAdmin ? (
          <Button
            appearance="primary"
            spacing="compact"
            onClick={() => setAssignOpen(true)}
            testId="strata-admin-assign-role"
          >
            Assign role
          </Button>
        ) : undefined}
      >
        <SectionState query={assignmentsQ} empty={displayRows.length === 0} emptyLabel="No role assignments">
          <div style={{ padding: '8px 16px 0' }}>
            <p style={captionStyle}>
              {assignments.length} explicit grant{assignments.length === 1 ? '' : 's'}
              {derivedRows.length > 0 ? ` · ${derivedRows.length} derived from platform admin` : ''}
            </p>
          </div>
          {/* CFG-008: six columns clip at 1024 — the table scrolls inside its
              own container instead of truncating cells. */}
          <div style={{ overflowX: 'auto', minWidth: 0 }}>
            <JiraTable<RoleAssignmentRow>
              columns={assignmentColumns}
              data={displayRows}
              getRowId={(r) => r.id}
              showRowCount={false}
              ariaLabel="STRATA role assignments"
            />
          </div>
        </SectionState>
      </StrataPanel>

      <StrataPanel title="Roles" icon={<Users size={16} />} count={ROLE_DOCS.length} noPadding testId="strata-admin-roles">
        <div style={{ padding: '12px 16px 0' }}>
          <p style={captionStyle}>
            Segregation of duties: creators cannot approve their own records; submitters cannot validate
            their own actuals — enforced in the database.
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
            <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtle }}>Your roles:</span>
            {roles.isLoading
              ? <Spinner size="small" />
              : mine.length > 0
                ? mine.map((r) => <CatalystTag key={r} text={labelize(r)} />)
                : <span style={metaStyle}>—</span>}
          </div>
        </div>
        <JiraTable<RoleRow>
          columns={ROLE_COLUMNS}
          data={roleRows(mine)}
          getRowId={(r) => r.role}
          showRowCount={false}
          ariaLabel="STRATA roles"
        />
      </StrataPanel>

      {isStrataAdmin ? (
        <StrataFormModal
          open={assignOpen}
          onClose={() => setAssignOpen(false)}
          title="Assign role"
          description="Grants a STRATA persona role at global scope. Segregation of duties is enforced in the database."
          fields={[
            { key: 'user_id', label: 'User', kind: 'user', required: true },
            { key: 'role', label: 'Role', kind: 'select', required: true, options: ASSIGNABLE_ROLES },
            { key: 'scope', label: 'Scope', kind: 'text', isDisabled: true, helper: 'Fixed for this release' },
          ]}
          initial={{ scope: 'global' }}
          submitLabel="Assign role"
          onSubmit={async (v) => {
            await governanceApi.assignRole(v.user_id as string, v.role as StrataRole, 'global');
            invalidate();
          }}
          testId="strata-admin-assign-role-modal"
        />
      ) : null}
    </div>
  );
}

const roleRows = (mine: StrataRole[]): RoleRow[] =>
  ROLE_DOCS.map((r) => ({ ...r, assigned: mine.includes(r.role) }));

const CR_STATUS: Record<StrataChangeRequest['status'], LozengeAppearance> = {
  approved: 'success', rejected: 'removed', pending: 'moved', withdrawn: 'default',
};

interface AuditEventRow {
  id: string;
  entity_table: string | null;
  action: string | null;
  actor_id: string | null;
  created_at: string;
  // CFG-001: the ledger has always stored these — the UI was dropping them.
  before: unknown;
  after: unknown;
  note: string | null;
}

const CR_COLUMNS: Column<StrataChangeRequest>[] = [
  {
    id: 'entity', label: 'Entity', width: 22,
    cell: ({ row }) => <span style={{ ...codeStyle, color: T.text }}>{row.entity_table}</span>,
  },
  {
    id: 'change', label: 'Change', width: 14,
    cell: ({ row }) => <CatalystTag text={labelize(row.change_type)} />,
  },
  {
    id: 'requested', label: 'Requested', width: 15,
    cell: ({ row }) => <span style={{ ...bodyStyle, fontVariantNumeric: 'tabular-nums' }}>{fmtDate(row.requested_at)}</span>,
  },
  {
    id: 'status', label: 'Status', width: 13,
    cell: ({ row }) => <StatusLozenge status={row.status} label={labelize(row.status)} appearance={CR_STATUS[row.status] ?? 'default'} />,
  },
  {
    id: 'decided', label: 'Decided', flex: true,
    cell: ({ row }) => (row.decided_at
      ? <span style={{ ...bodyStyle, fontVariantNumeric: 'tabular-nums' }}>{fmtDate(row.decided_at)}</span>
      : <span style={{ color: T.subtlest }}>—</span>),
  },
];

function ChangeLogSection() {
  const crs = useChangeRequests();
  const audit = useStrataAudit();
  const profilesQ = useProfileNames();
  const crList = crs.data ?? [];
  const auditList = ((audit.data ?? []) as AuditEventRow[]).slice(0, 20);

  // Actor column resolves actor_id → profile name (dash when null/unknown).
  const auditColumns: Column<AuditEventRow>[] = [
    {
      id: 'entity', label: 'Entity', width: 24,
      cell: ({ row }) => (row.entity_table
        ? <span style={{ ...codeStyle, color: T.text }}>{row.entity_table}</span>
        : <span style={{ color: T.subtlest }}>—</span>),
    },
    {
      id: 'action', label: 'Action', width: 12,
      cell: ({ row }) => (row.action
        ? <span style={bodyStyle}>{labelize(row.action)}</span>
        : <span style={{ color: T.subtlest }}>—</span>),
    },
    {
      // CFG-001: exact before → after values per changed field, plus rationale.
      id: 'change', label: 'Change', flex: true,
      cell: ({ row }) => {
        const { changes, truncated } = auditChangedFields(row.before, row.after);
        if (changes.length === 0 && !row.note) return <span style={{ color: T.subtlest }}>—</span>;
        // CFG-001 (Cycle 4): trigger-fed rows (INSERT/UPDATE/DELETE) carry no
        // note — say so honestly instead of leaving rationale ambiguous.
        const isTriggerFed = !!row.action && !row.action.startsWith('RPC:');
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '2px 0' }}>
            {changes.map((c) => (
              <span key={c.field} style={{ ...codeStyle, fontSize: 'var(--ds-font-size-075)', color: T.subtle, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
                {c.field}: {c.from ?? '—'} → {c.to ?? '—'}
              </span>
            ))}
            {truncated > 0 ? (
              <span style={{ color: T.subtlest, fontSize: 'var(--ds-font-size-075)' }}>+{truncated} more field{truncated === 1 ? '' : 's'}</span>
            ) : null}
            {row.note ? (
              <span style={{ color: T.subtle, fontSize: 'var(--ds-font-size-075)' }}>Rationale: {row.note}</span>
            ) : isTriggerFed ? (
              <span style={{ color: T.subtlest, fontSize: 'var(--ds-font-size-075)' }}>System/trigger event — rationale not supplied</span>
            ) : null}
          </div>
        );
      },
    },
    {
      id: 'actor', label: 'Actor', width: 14,
      cell: ({ row }) => {
        const name = row.actor_id ? profilesQ.data?.get(row.actor_id)?.name ?? null : null;
        return name ? <span style={metaStyle}>{name}</span> : <span style={{ color: T.subtlest }}>—</span>;
      },
    },
    {
      id: 'at', label: 'At', width: 18,
      cell: ({ row }) => <span style={{ ...bodyStyle, fontVariantNumeric: 'tabular-nums' }}>{fmtDateTime(row.created_at)}</span>,
    },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <StrataPanel title="Change requests" icon={<GitBranch size={16} />} count={crList.length} noPadding testId="strata-admin-change-requests">
        <SectionState query={crs} empty={crList.length === 0} emptyLabel="No change requests">
          <JiraTable<StrataChangeRequest>
            columns={CR_COLUMNS}
            data={crList}
            getRowId={(cr) => cr.id}
            ariaLabel="Change requests"
          />
        </SectionState>
      </StrataPanel>
      <StrataPanel title="Audit trail" icon={<Clock size={16} />} count={auditList.length} noPadding testId="strata-admin-audit">
        <SectionState query={audit} empty={auditList.length === 0} emptyLabel="No audit events">
          <JiraTable<AuditEventRow>
            columns={auditColumns}
            data={auditList}
            getRowId={(ev) => ev.id}
            showRowCount={false}
            ariaLabel="Audit trail — last 20 events"
          />
        </SectionState>
      </StrataPanel>
    </div>
  );
}

// ── Project Card configuration (Execution Reconciliation §G/§N) ─────────────
// Lightweight config engine — no governed envelope (matches the Demand
// module's tab/section-config prior art, not the version/approval workflow
// used by the config-engine tables above). Writes go direct under RLS
// (strategy_office | strata_admin), same as strata_workflow_configs reads.
type PcFormKey = 'new-field' | 'edit-field' | 'new-picklist' | null;

const FIELD_TYPE_OPTIONS = ['text', 'longtext', 'number', 'currency', 'date', 'user', 'reference', 'picklist', 'picklist_multi', 'calculated', 'list'];

function ProjectCardConfigSection({ onError }: { onError: OnError }) {
  const invalidate = useInvalidateStrata();
  const tabsQ = useProjectCardTabConfigs();
  const sectionsQ = useProjectCardSectionConfigs();
  const fieldsQ = useProjectCardFieldConfigs();
  const picklistsQ = useProjectCardPicklists();
  const [form, setForm] = useState<PcFormKey>(null);
  const [editField, setEditField] = useState<StrataProjectCardFieldConfig | null>(null);
  const [picklistKeyFilter, setPicklistKeyFilter] = useState<string | null>(null);

  const tabs = tabsQ.data ?? [];
  const sections = sectionsQ.data ?? [];
  const fields = fieldsQ.data ?? [];
  // Canonical governed picklist keys. The filter lists ALL of them — including
  // lead_business_unit — even when a key has zero values yet, so a strata_admin can
  // select it and add the first value. Previously the filter only listed keys that
  // already had rows, which hid Lead Business Unit entirely and made Team/LBU value
  // maintenance look absent (STRATA-E2E Team/LBU blocker).
  const GOVERNED_PICKLIST_KEYS: string[] = [
    'lead_business_unit', 'delivery_team', 'serving_department', 'delivery_status',
    'strategic_impact', 'aop_mapping', 'benefit_category', 'enabling_team',
    'support_function', 'dependency_status', 'milestone_status',
  ];
  const effectivePicklistKey = picklistKeyFilter && GOVERNED_PICKLIST_KEYS.includes(picklistKeyFilter)
    ? picklistKeyFilter
    : GOVERNED_PICKLIST_KEYS[0];
  const picklists = (picklistsQ.data ?? []).filter((p) => p.picklist_key === effectivePicklistKey);

  const toggleFieldVisible = async (f: StrataProjectCardFieldConfig) => {
    onError(null);
    try {
      await configApi.upsertFieldConfig({ ...f, is_visible: !f.is_visible });
      invalidate();
    } catch (e) { onError(e instanceof Error ? e.message : String(e)); }
  };
  const togglePicklistActive = async (p: StrataProjectCardPicklist) => {
    onError(null);
    try {
      await configApi.upsertPicklistValue({ ...p, is_active: !p.is_active });
      invalidate();
    } catch (e) { onError(e instanceof Error ? e.message : String(e)); }
  };

  const fieldColumns: Column<StrataProjectCardFieldConfig>[] = [
    { id: 'display_name', label: 'Field', width: 22, cell: ({ row }) => <span style={{ ...bodyStyle, fontWeight: 600 }}>{row.display_name}</span> },
    { id: 'tab_key', label: 'Tab', width: 14, cell: ({ row }) => <CatalystTag text={labelize(row.tab_key)} /> },
    { id: 'field_type', label: 'Type', width: 12, cell: ({ row }) => <span style={metaStyle}>{labelize(row.field_type)}</span> },
    {
      id: 'visible', label: 'Visible', width: 12,
      cell: ({ row }) => (
        <Button spacing="compact" appearance={row.is_visible ? 'default' : 'subtle'} onClick={() => void toggleFieldVisible(row)} testId={`strata-pc-field-toggle-${row.field_key}`}>
          {row.is_visible ? 'Visible' : 'Hidden'}
        </Button>
      ),
    },
    { id: 'required', label: 'Required', width: 12, cell: ({ row }) => (row.is_required ? <StatusLozenge status="required" label="Required" appearance="moved" /> : <span style={metaStyle}>Optional</span>) },
    { id: 'readonly', label: 'Editable', width: 12, cell: ({ row }) => <span style={metaStyle}>{row.is_readonly ? 'Read-only' : 'Editable'}</span> },
    { id: 'jira', label: 'Jira sync', width: 12, cell: ({ row }) => <span style={metaStyle}>{row.syncs_from_jira ? (row.editable_when_synced ? 'Synced · editable' : 'Synced · locked') : 'Manual only'}</span> },
    {
      id: 'actions', label: '', flex: true, align: 'end',
      cell: ({ row }) => <Button appearance="subtle" spacing="compact" onClick={() => { setEditField(row); setForm('edit-field'); }}>Edit</Button>,
    },
  ];

  const picklistColumns: Column<StrataProjectCardPicklist>[] = [
    { id: 'label', label: 'Label', flex: true, cell: ({ row }) => <span style={{ ...bodyStyle, fontWeight: 600 }}>{row.label}</span> },
    { id: 'value', label: 'Value', width: 20, cell: ({ row }) => <CatalystInlineCode>{row.value}</CatalystInlineCode> },
    {
      id: 'active', label: 'Status', width: 16,
      cell: ({ row }) => (
        <Button spacing="compact" appearance={row.is_active ? 'default' : 'subtle'} onClick={() => void togglePicklistActive(row)} testId={`strata-pc-picklist-toggle-${row.picklist_key}-${row.value}`}>
          {row.is_active ? 'Active' : 'Inactive'}
        </Button>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={captionStyle}>
        Controls which tabs, sections, fields and dropdown values appear on every Project Card (Execution Reconciliation §G).
        Default template applies when Card Type is left blank.
      </p>

      <StrataPanel title="Tabs" icon={<Layers size={16} />} count={tabs.length} testId="strata-admin-pc-tabs">
        <SectionState query={tabsQ} empty={tabs.length === 0}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {tabs.map((t) => (
              <CatalystTag key={t.id} text={`${t.display_name}${t.is_required ? ' · required' : ''}`} />
            ))}
          </div>
        </SectionState>
      </StrataPanel>

      <StrataPanel title="Sections" icon={<Layers size={16} />} count={sections.length} testId="strata-admin-pc-sections">
        <SectionState query={sectionsQ} empty={sections.length === 0}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tabs.map((t) => {
              const rows = sections.filter((s) => s.tab_key === t.tab_key);
              if (rows.length === 0) return null;
              return (
                <div key={t.tab_key} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ ...metaStyle, fontWeight: 600, minWidth: 120 }}>{t.display_name}</span>
                  {rows.map((s) => <CatalystTag key={s.id} text={s.name} />)}
                </div>
              );
            })}
          </div>
        </SectionState>
      </StrataPanel>

      <StrataPanel
        title="Fields"
        icon={<Rocket size={16} />}
        count={fields.length}
        noPadding
        actions={<Button spacing="compact" onClick={() => { setEditField(null); setForm('new-field'); }} testId="strata-pc-new-field">New field</Button>}
        testId="strata-admin-pc-fields"
      >
        <SectionState query={fieldsQ} empty={fields.length === 0}>
          <JiraTable<StrataProjectCardFieldConfig> columns={fieldColumns} data={fields} getRowId={(f) => f.id} density="compact" showRowCount={false} rowsPerPage={100} ariaLabel="Project Card field configuration" />
        </SectionState>
      </StrataPanel>

      <StrataPanel
        title="Picklists"
        icon={<ListChecks size={16} />}
        count={picklists.length}
        noPadding
        actions={(
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              value={effectivePicklistKey}
              onChange={(e) => setPicklistKeyFilter(e.target.value)}
              aria-label="Picklist"
              style={{ padding: '4px 8px', borderRadius: 4, border: `1px solid ${T.border}`, background: T.raised, color: T.text }}
            >
              {GOVERNED_PICKLIST_KEYS.map((k) => <option key={k} value={k}>{labelize(k)}</option>)}
            </select>
            <Button spacing="compact" onClick={() => setForm('new-picklist')} testId="strata-pc-new-picklist-value">New value</Button>
          </div>
        )}
        testId="strata-admin-pc-picklists"
      >
        <SectionState query={picklistsQ} empty={picklists.length === 0}>
          <JiraTable<StrataProjectCardPicklist> columns={picklistColumns} data={picklists} getRowId={(p) => p.id} density="compact" showRowCount={false} rowsPerPage={100} ariaLabel={`${labelize(effectivePicklistKey)} picklist values`} />
        </SectionState>
      </StrataPanel>

      <StrataFormModal
        open={form === 'new-field' || (form === 'edit-field' && editField != null)}
        onClose={() => { setForm(null); setEditField(null); }}
        title={editField ? 'Edit field' : 'New field'}
        submitLabel="Save"
        fields={[
          { key: 'displayName', label: 'Display name', kind: 'text', required: true },
          { key: 'fieldKey', label: 'Field key', kind: 'text', required: true, helper: 'Matches the Project Card column or optional_fields key' },
          { key: 'tabKey', label: 'Tab', kind: 'select', required: true, options: tabs.map((t) => ({ value: t.tab_key, label: t.display_name })) },
          { key: 'sectionKey', label: 'Section', kind: 'select', options: sections.map((s) => ({ value: s.section_key, label: s.name })) },
          { key: 'fieldType', label: 'Field type', kind: 'select', options: FIELD_TYPE_OPTIONS.map((t) => ({ value: t, label: labelize(t) })) },
          { key: 'isVisible', label: 'Visible', kind: 'checkbox', placeholder: 'Shown on the Project Card by default' },
          { key: 'isRequired', label: 'Required', kind: 'checkbox' },
          { key: 'isReadonly', label: 'Read-only', kind: 'checkbox' },
          { key: 'syncsFromJira', label: 'Syncs from Jira', kind: 'checkbox' },
        ]}
        initial={editField ? {
          displayName: editField.display_name, fieldKey: editField.field_key, tabKey: editField.tab_key,
          sectionKey: editField.section_key, fieldType: editField.field_type, isVisible: editField.is_visible,
          isRequired: editField.is_required, isReadonly: editField.is_readonly, syncsFromJira: editField.syncs_from_jira,
        } : { fieldType: 'text', isVisible: true }}
        onSubmit={async (v) => {
          await configApi.upsertFieldConfig({
            id: editField?.id, card_type: null,
            field_key: String(v.fieldKey ?? editField?.field_key ?? '').trim(),
            tab_key: String(v.tabKey ?? '').trim(),
            section_key: (v.sectionKey as string) || null,
            display_name: String(v.displayName ?? '').trim(),
            field_type: (v.fieldType as string) || 'text',
            is_visible: Boolean(v.isVisible),
            is_required: Boolean(v.isRequired),
            is_readonly: Boolean(v.isReadonly),
            syncs_from_jira: Boolean(v.syncsFromJira),
          });
          invalidate();
        }}
        testId="strata-pc-field-form-modal"
      />

      <StrataFormModal
        open={form === 'new-picklist'}
        onClose={() => setForm(null)}
        title="New picklist value"
        submitLabel="Create"
        fields={[
          {
            key: 'picklistKey', label: 'Picklist', kind: 'select', required: true,
            options: GOVERNED_PICKLIST_KEYS.map((k) => ({ value: k, label: labelize(k) })),
          },
          { key: 'value', label: 'Value (stored)', kind: 'text', required: true },
          { key: 'label', label: 'Label (displayed)', kind: 'text', required: true },
        ]}
        initial={{ picklistKey: effectivePicklistKey }}
        onSubmit={async (v) => {
          await configApi.upsertPicklistValue({
            picklist_key: String(v.picklistKey ?? '').trim(),
            value: String(v.value ?? '').trim(),
            label: String(v.label ?? '').trim(),
            is_active: true,
          });
          invalidate();
        }}
        testId="strata-pc-picklist-form-modal"
      />
    </div>
  );
}

// ── Section registry + page ──────────────────────────────────────────────────
// ── Notifications (CAT-STRATA-CLOSEOUT-20260710-001 W3) ───────────────────────
function NotificationsSection({ onError }: { onError: OnError }) {
  const rulesQ = useStrataNotificationRules();
  const roles = useStrataRoles();
  const invalidate = useInvalidateStrata();
  const [busyEvent, setBusyEvent] = useState<string | null>(null);
  // UI gating only — strata_set_notification_rule also authorises platform admins server-side.
  const isStrataAdmin = (roles.data ?? []).includes('strata_admin');
  const rules = (rulesQ.data ?? []) as StrataNotificationRule[];

  const toggle = async (rule: StrataNotificationRule) => {
    setBusyEvent(rule.event_type);
    onError(null);
    try {
      await governanceApi.setNotificationRule(rule.event_type, !rule.enabled);
      invalidate();
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyEvent(null);
    }
  };

  return (
    <StrataPanel title="Notifications" icon={<Bell size={16} />} count={rules.length} testId="strata-admin-notifications">
      <p style={captionStyle}>
        In-app alerts for pending approvals, assignments, blockers and validation requests.
        Toggling a rule takes effect immediately and is written to the audit trail (admin only).
      </p>
      {rulesQ.isLoading ? (
        <div style={{ padding: 16 }}><Spinner size="small" /></div>
      ) : rules.length === 0 ? (
        <EmptyState size="compact" header="No notification rules" description="Nothing has been configured in this section." />
      ) : (
        rules.map((r) => (
          <div
            key={r.event_type}
            data-testid={`strata-admin-notif-rule-${r.event_type}`}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 'var(--ds-space-100) var(--ds-space-050)', borderBottom: `1px solid ${T.border}` }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 600, color: T.text }}>{r.label}</span>
                <CatalystTag text={labelize(r.audience.replace('role:', ''))} />
              </div>
              {r.description ? <div style={{ ...metaStyle, marginTop: 'var(--ds-space-025)' }}>{r.description}</div> : null}
            </div>
            <Toggle
              isChecked={r.enabled}
              isDisabled={!isStrataAdmin || busyEvent === r.event_type}
              onChange={() => void toggle(r)}
              label={`Toggle ${r.label}`}
            />
          </div>
        ))
      )}
    </StrataPanel>
  );
}

// ── Cycles & periods (CFG-003) ───────────────────────────────────────────────
// The calendar every scorecard, review and snapshot anchors to was previously
// unreachable from Configuration: creation lives in Strategy Room authoring and
// nothing linked to it. This is the administration VIEW — governed authoring
// stays where it is (one authoring surface, no duplicate create/edit modal).
const CYCLE_STATUS: Record<StrataCycle['status'], LozengeAppearance> = {
  draft: 'default', active: 'success', locked: 'moved', closed: 'removed',
};
const PERIOD_CLOSE: Record<StrataPeriod['close_status'], LozengeAppearance> = {
  open: 'success', pending_close: 'moved', closed: 'default',
};

function CyclesSection() {
  const navigate = useNavigate();
  const { cycles, periods, activeCycle } = useStrataContext();

  const cycleColumns: Column<StrataCycle>[] = [
    {
      id: 'name', label: 'Cycle', flex: true,
      cell: ({ row }) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ ...bodyStyle, fontWeight: 600 }}>{row.name}</span>
          {activeCycle?.id === row.id ? <CatalystTag text="Viewing" /> : null}
        </span>
      ),
    },
    {
      id: 'granularity', label: 'Granularity', width: 14,
      cell: ({ row }) => <span style={metaStyle}>{labelize(row.period_granularity)}</span>,
    },
    {
      id: 'status', label: 'Status', width: 13,
      cell: ({ row }) => <StatusLozenge status={row.status} label={labelize(row.status)} appearance={CYCLE_STATUS[row.status] ?? 'default'} />,
    },
    {
      id: 'starts', label: 'Starts', width: 14,
      cell: ({ row }) => <span style={{ ...bodyStyle, fontVariantNumeric: 'tabular-nums' }}>{fmtDate(row.starts_on)}</span>,
    },
    {
      id: 'ends', label: 'Ends', width: 14,
      cell: ({ row }) => <span style={{ ...bodyStyle, fontVariantNumeric: 'tabular-nums' }}>{fmtDate(row.ends_on)}</span>,
    },
  ];

  const periodColumns: Column<StrataPeriod>[] = [
    { id: 'name', label: 'Period', flex: true, cell: ({ row }) => <span style={{ ...bodyStyle, fontWeight: 600 }}>{row.name}</span> },
    { id: 'type', label: 'Type', width: 14, cell: ({ row }) => <span style={metaStyle}>{labelize(row.period_type)}</span> },
    {
      id: 'close', label: 'Close status', width: 16,
      cell: ({ row }) => <StatusLozenge status={row.close_status} label={labelize(row.close_status)} appearance={PERIOD_CLOSE[row.close_status] ?? 'default'} />,
    },
    {
      id: 'starts', label: 'Starts', width: 14,
      cell: ({ row }) => <span style={{ ...bodyStyle, fontVariantNumeric: 'tabular-nums' }}>{fmtDate(row.starts_on)}</span>,
    },
    {
      id: 'ends', label: 'Ends', width: 14,
      cell: ({ row }) => <span style={{ ...bodyStyle, fontVariantNumeric: 'tabular-nums' }}>{fmtDate(row.ends_on)}</span>,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <StrataPanel
        title="Cycles"
        icon={<Calendar size={16} />}
        count={cycles.length}
        noPadding
        testId="strata-admin-cycles"
        actions={
          <Button spacing="compact" onClick={() => navigate(Routes.strata.strategy())} testId="strata-admin-cycles-authoring">
            Open Strategy Room authoring
          </Button>
        }
      >
        <p style={{ ...captionStyle, padding: '12px 16px 0' }}>
          Cycles are governed records — creating a cycle and generating its periods happens in Strategy
          Room authoring, which this button opens. Use the page-header Cycle picker to change which
          cycle&apos;s periods are shown below.
        </p>
        {cycles.length === 0 ? (
          <EmptyState size="compact" header="No cycles yet" description="Create the first cycle from Strategy Room authoring." />
        ) : (
          <JiraTable<StrataCycle>
            columns={cycleColumns}
            data={cycles}
            getRowId={(c) => c.id}
            showRowCount={false}
            ariaLabel="Reporting cycles"
          />
        )}
      </StrataPanel>
      <StrataPanel
        title={activeCycle ? `Periods — ${activeCycle.name}` : 'Periods'}
        icon={<Clock size={16} />}
        count={periods.length}
        noPadding
        testId="strata-admin-periods"
      >
        {!activeCycle ? (
          <p style={{ ...captionStyle, padding: '12px 16px' }}>Select a cycle to see its periods.</p>
        ) : periods.length === 0 ? (
          <EmptyState size="compact" header="No periods generated" description="Periods are generated when the cycle is created in Strategy Room authoring." />
        ) : (
          <JiraTable<StrataPeriod>
            columns={periodColumns}
            data={periods}
            getRowId={(p) => p.id}
            showRowCount={false}
            ariaLabel={`Periods for ${activeCycle.name}`}
          />
        )}
      </StrataPanel>
    </div>
  );
}

// ── Organization & scopes (CFG-003) ──────────────────────────────────────────
// The smallest HONEST surface over the data model that actually exists. There
// is no org-structure schema: no hierarchy, no effective dating, no lifecycle
// — this section states that plainly and shows the scope vocabulary STRATA
// really uses (the scorecard-model owner-scope enum) with live usage counts.
// See docs/ways-of-working/STRATA_ORG_STRUCTURE_DECISION.md for the schema
// decision this surface deliberately does not pre-empt.
function OrgScopesSection() {
  const models = useScorecardModels();
  const usage = new Map<string, number>();
  for (const m of models.data ?? []) {
    usage.set(m.owner_scope_type, (usage.get(m.owner_scope_type) ?? 0) + 1);
  }
  interface ScopeRow { scope: string; count: number }
  const rows: ScopeRow[] = ['enterprise', 'sector', 'function', 'portfolio', 'initiative', 'custom']
    .map((s) => ({ scope: s, count: usage.get(s) ?? 0 }));
  const scopeColumns: Column<ScopeRow>[] = [
    { id: 'scope', label: 'Scope', flex: true, cell: ({ row }) => <span style={{ ...bodyStyle, fontWeight: 600 }}>{labelize(row.scope)}</span> },
    {
      id: 'usage', label: 'Used by', width: 30,
      cell: ({ row }) => (row.count > 0
        ? <span style={metaStyle}>{row.count} scorecard model{row.count === 1 ? '' : 's'}</span>
        : <span style={{ color: T.subtlest }}>—</span>),
    },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionMessage appearance="information" title="No organization-structure schema exists">
        <p>
          Organizational structures are not configured — there is no org-unit table, hierarchy,
          effective dating or lifecycle in the schema. Nothing here can create one; that is a
          product/schema decision recorded in STRATA_ORG_STRUCTURE_DECISION.md (owner: Vikram).
          What follows is the scope vocabulary STRATA actually uses today.
        </p>
      </SectionMessage>
      <StrataPanel title="Organizational scopes in use" icon={<Users size={16} />} count={rows.length} noPadding testId="strata-admin-org-scopes">
        <p style={{ ...captionStyle, padding: '12px 16px 0' }}>
          The fixed owner-scope vocabulary on scorecard models — a flat enum, not an org hierarchy.
          Free-text Project Card fields (sector, lead business unit) are governed under
          Reference &amp; display → Project Card picklists.
        </p>
        <JiraTable<ScopeRow>
          columns={scopeColumns}
          data={rows}
          getRowId={(r) => r.scope}
          showRowCount={false}
          ariaLabel="Organizational scopes in use"
        />
      </StrataPanel>
    </div>
  );
}

export const SECTIONS: Array<{
  key: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  render: (onError: OnError) => React.ReactNode;
}> = [
  { key: 'perspectives', label: 'Perspectives', icon: Layers, render: (e) => <PerspectivesSection onError={e} /> },
  { key: 'scorecard-models', label: 'Scorecard models', icon: Scale, render: (e) => <ScorecardModelsSection onError={e} /> },
  { key: 'thresholds', label: 'Thresholds', icon: BarChart3, render: (e) => <ThresholdsSection onError={e} /> },
  { key: 'value-taxonomy', label: 'Value taxonomy', icon: Gem, render: (e) => <ValueTaxonomySection onError={e} /> },
  { key: 'gates', label: 'Gates', icon: ShieldCheck, render: (e) => <GatesSection onError={e} /> },
  { key: 'kpi-types', label: 'KPI types', icon: ListChecks, render: (e) => <KpiTypesSection onError={e} /> },
  { key: 'upload-templates', label: 'Upload templates', icon: Upload, render: (e) => <UploadTemplatesSection onError={e} /> },
  { key: 'workflows', label: 'Workflows', icon: GitBranch, render: (e) => <WorkflowsSection onError={e} /> },
  { key: 'cycles', label: 'Cycles & periods', icon: Calendar, render: () => <CyclesSection /> },
  { key: 'org-scopes', label: 'Organization & scopes', icon: Users, render: () => <OrgScopesSection /> },
  { key: 'project-card', label: 'Project Card', icon: Rocket, render: (e) => <ProjectCardConfigSection onError={e} /> },
  { key: 'roles', label: 'Roles', icon: Users, render: (e) => <RolesSection onError={e} /> },
  { key: 'notifications', label: 'Notifications', icon: Bell, render: (e) => <NotificationsSection onError={e} /> },
  { key: 'change-log', label: 'Change log', icon: Clock, render: () => <ChangeLogSection /> },
];

// ── Config landing (anchor 03) — governed control plane, bare /strata/admin ──
// Reorganises the 12 config sections by CONSEQUENCE. Each domain card routes to
// its primary section today (:section); measurement/data/access repoint to their
// own domain pages as those slices land. Pending counts + change log are the
// governance signal — nothing is fabricated.
export const DOMAINS: Array<{
  key: string;
  name: string;
  icon: React.ComponentType<{ size?: number }>;
  governs: string;
  to: string;
  sectionLabels: string[];
}> = [
  {
    key: 'strategy-framework', name: 'Strategy framework', icon: Layers,
    governs: 'Perspectives — the scoring lens every scorecard rolls up through.',
    to: Routes.strata.adminSection('perspectives'), sectionLabels: ['Perspectives'],
  },
  {
    key: 'measurement', name: 'Measurement', icon: Scale,
    governs: 'Scorecard models, threshold bands and KPI formulas — how performance is calculated and rated.',
    to: Routes.strata.adminMeasurement(), sectionLabels: ['Perspectives', 'Scorecard models', 'Thresholds', 'KPI types'],
  },
  {
    key: 'value-governance', name: 'Value & governance', icon: Gem,
    governs: 'Benefit taxonomy and stage-gate models — how value is classified and approved.',
    to: Routes.strata.adminSection('value-taxonomy'), sectionLabels: ['Value taxonomy', 'Gates'],
  },
  {
    key: 'data-integration', name: 'Data & integration', icon: Upload,
    governs: 'Registered sources and the upload templates/contracts that feed actuals into STRATA.',
    to: Routes.strata.adminData(), sectionLabels: ['Sources', 'Upload templates'],
  },
  {
    key: 'workflow-access', name: 'Workflow & access', icon: Users,
    governs: 'Lifecycle workflows and the role assignments that decide who can act.',
    to: Routes.strata.adminAccess(), sectionLabels: ['Role assignments', 'Workflow transitions'],
  },
  {
    // CFG-003: previously unreachable from Configuration — authoring lives in
    // Strategy Room; this card makes the administration view navigable.
    key: 'cycles-periods', name: 'Cycles & periods', icon: Calendar,
    governs: 'Reporting cycles and their periods — the calendar every scorecard, review and snapshot anchors to.',
    to: Routes.strata.adminSection('cycles'), sectionLabels: ['Cycles', 'Periods'],
  },
  {
    // CFG-003: honest read surface — states that no org-structure schema
    // exists and shows the scope vocabulary actually in use. Implies nothing.
    key: 'org-scopes', name: 'Organization & scopes', icon: Users,
    governs: 'The organizational scope vocabulary STRATA uses today — no org-structure schema exists yet.',
    to: Routes.strata.adminSection('org-scopes'), sectionLabels: ['Scopes in use'],
  },
  {
    key: 'reference-display', name: 'Reference & display', icon: Rocket,
    governs: 'Project Card layout and notification rules — how configuration surfaces to end users.',
    to: Routes.strata.adminSection('project-card'), sectionLabels: ['Project Card', 'Notifications'],
  },
];

const countPending = (rows?: ReadonlyArray<{ status: GovernedStatus }>): number =>
  (rows ?? []).filter((r) => r.status === 'pending_approval').length;

function DomainCard({ domain, pending, onOpen }: {
  domain: (typeof DOMAINS)[number];
  pending: number;
  onOpen: () => void;
}) {
  const Icon = domain.icon;
  return (
    <button
      type="button"
      className="strata-domain-card"
      onClick={onOpen}
      data-testid={`strata-admin-domain-${domain.key}`}
      style={{
        display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left', width: '100%',
        border: `1px solid ${T.border}`, borderRadius: 8, padding: 16, cursor: 'pointer',
        background: T.raised, color: T.text, font: 'inherit',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span aria-hidden style={{ display: 'inline-flex', color: T.subtle }}><Icon size={18} /></span>
          <strong style={{ fontSize: 'var(--ds-font-size-200)', color: T.text }}>{domain.name}</strong>
        </span>
        {pending > 0 ? (
          <Lozenge appearance="moved">{pending} pending</Lozenge>
        ) : null}
      </span>
      <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle, lineHeight: 'var(--ds-line-height-body)' }}>
        {domain.governs}
      </span>
      <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
        {domain.sectionLabels.map((l) => <CatalystTag key={l} text={l} />)}
      </span>
    </button>
  );
}

function AdminLanding() {
  const navigate = useNavigate();
  const perspectives = usePerspectives();
  const models = useScorecardModels();
  const thresholds = useThresholdSchemes();
  const valueCats = useValueCategories();
  const gates = useGateModels();
  const kpiTypes = useKpiTypes();
  const templates = useUploadTemplates();
  const workflows = useWorkflowConfigs();
  const roles = useStrataRoles();

  const pendingByDomain: Record<string, number> = {
    'strategy-framework': countPending(perspectives.data),
    measurement: countPending(models.data) + countPending(thresholds.data) + countPending(kpiTypes.data),
    'value-governance': countPending(valueCats.data) + countPending(gates.data),
    'data-integration': countPending(templates.data),
    'workflow-access': countPending(workflows.data),
    'reference-display': 0,
  };
  const totalPending = Object.values(pendingByDomain).reduce((a, b) => a + b, 0);
  const isStrataAdmin = (roles.data ?? []).includes('strata_admin');
  const pendingDomains = DOMAINS.filter((d) => pendingByDomain[d.key] > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
      <style>{
        '.strata-domain-card:hover{background:var(--ds-surface-raised-hovered);border-color:var(--ds-border-bold);}'
        + '.strata-domain-card:focus-visible{outline:2px solid var(--ds-border-focused);outline-offset:2px;}'
      }</style>

      {/* Governance context line */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Lozenge appearance="new" isBold>Governed control plane</Lozenge>
        <span style={{ fontSize: 'var(--ds-font-size-200)', color: T.subtle }}>
          {isStrataAdmin
            ? 'You are strata_admin — every change here is versioned, approved and audited.'
            : 'Every change here is versioned, approved and audited.'}
        </span>
      </div>

      {/* Approval band — real pending_approval counts, routed to where they're actioned */}
      <div
        data-testid="strata-admin-approval-band"
        style={{
          display: 'flex', flexDirection: 'column', gap: 8,
          border: `1px solid ${T.border}`, borderRadius: 8, padding: 16, background: T.sunken,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {totalPending > 0
            ? <Lozenge appearance="moved" isBold>Awaiting approval</Lozenge>
            : <Lozenge appearance="success" isBold>All approved</Lozenge>}
          <strong style={{ fontSize: 'var(--ds-font-size-200)', color: T.text }}>
            {totalPending > 0
              ? `${totalPending} governed change${totalPending === 1 ? '' : 's'} need an independent approver`
              : 'Nothing is awaiting review'}
          </strong>
        </div>
        <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>
          Segregation of duties is enforced in the database — the person who drafted a change cannot approve it.
        </span>
        {pendingDomains.length > 0 ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            {pendingDomains.map((d) => (
              <Button
                key={d.key}
                spacing="compact"
                onClick={() => navigate(d.to)}
                testId={`strata-admin-approval-jump-${d.key}`}
              >
                {d.name} · {pendingByDomain[d.key]}
              </Button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Consequence-domain cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {DOMAINS.map((d) => (
          <DomainCard key={d.key} domain={d} pending={pendingByDomain[d.key]} onOpen={() => navigate(d.to)} />
        ))}
      </div>

      {/* Change log + audit trail (reused canonical) */}
      <ChangeLogSection />
    </div>
  );
}

export default function StrataAdminConfigPage() {
  const { section } = useParams<{ section?: string }>();
  const navigate = useNavigate();
  const [actionError, setActionError] = useState<string | null>(null);

  const idx = SECTIONS.findIndex((s) => s.key === section);
  const selected = idx >= 0 ? idx : 0;
  // Deep-linked section (/strata/admin/:section) is a detail sub-view — the
  // breadcrumb carries "Administration / <Section>"; bare /strata/admin is index.
  const sectionEntry = section && idx >= 0 ? SECTIONS[idx] : null;

  // Bare /strata/admin → governed control-plane landing (anchor 03, P5-D0).
  if (!section) {
    return (
      <StrataPageShell title="Configuration" docTitle="Configuration" testId="strata-admin-chrome">
        <AdminLanding />
      </StrataPageShell>
    );
  }

  // Unknown /strata/admin/:section used to fall silently to tab 0 (Perspectives),
  // making a stale link look like a real page. Surface it (anchor 28, P5-D5).
  if (idx < 0) {
    return (
      <StrataPageShell
        trail={[{ text: 'Administration', href: Routes.strata.admin() }]}
        title="Not found"
        docTitle="Not found · Administration"
        testId="strata-admin-chrome"
      >
        <StrataNotFound cause="No configuration section by that name. It may have been renamed, or moved to a domain page." />
      </StrataPageShell>
    );
  }

  return (
    <StrataPageShell
      trail={sectionEntry ? [
        { text: 'Administration', href: Routes.strata.admin() },
        { text: sectionEntry.label },
      ] : undefined}
      docTitle={sectionEntry ? `${sectionEntry.label} · Administration` : undefined}
      testId="strata-admin-chrome"
    >
      {/* CFG-008: the 13-item horizontal tab strip clipped labels to fragments
        * ("Persp", "Scoreca") and hid destinations at 1024×768. Replaced with a
        * WRAPPING nav of full-label buttons — every destination identifiable and
        * reachable with no horizontal scrolling; keyboard/focus/aria preserved
        * via real <button aria-current>. */}
      <nav aria-label="Configuration sections" style={{ display: 'flex', flexWrap: 'wrap', gap: 4, borderBottom: `2px solid ${T.border}`, paddingBottom: 8 }}>
        {SECTIONS.map((s, i) => {
          const Icon = s.icon;
          const active = i === selected;
          return (
            <button
              key={s.key}
              type="button"
              aria-current={active ? 'page' : undefined}
              data-testid={`strata-admin-nav-${s.key}`}
              onClick={() => { setActionError(null); navigate(Routes.strata.adminSection(s.key)); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                padding: '6px 10px', borderRadius: 6, cursor: 'pointer', font: 'inherit',
                fontSize: 'var(--ds-font-size-100)', fontWeight: active ? 700 : 400,
                border: '1px solid transparent',
                background: active ? 'var(--ds-background-selected)' : 'transparent',
                color: active ? 'var(--ds-text-brand)' : T.subtle,
              }}
            >
              <Icon size={14} />
              {s.label}
            </button>
          );
        })}
      </nav>
      <div style={{ width: '100%', paddingTop: 16 }}>
        {actionError ? (
          <div style={{ marginBottom: 16 }}>
            <SectionMessage appearance="error" title="Governance action rejected by the database">
              <p>{actionError}</p>
            </SectionMessage>
          </div>
        ) : null}
        {SECTIONS[selected]?.render(setActionError)}
      </div>
    </StrataPageShell>
  );
}
