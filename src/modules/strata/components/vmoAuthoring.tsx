/**
 * STRATA VMO authoring surfaces (CAT-STRATA-20260705-001, Lane E).
 * Portfolio membership editing + gate scheduling — the two authoring flows
 * whose fields depend on another field's value (member type → entity list,
 * gate model → stage list), which the generic StrataFormModal cannot express.
 *
 * Same contract as authoring.tsx: ADS wrappers + @atlaskit primitives only,
 * no drawers, server RPCs are the source of truth — every rejection surfaces
 * verbatim via SectionMessage.
 */
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Button, CatalystTag, EmptyState, Modal, ModalBody, ModalFooter, ModalHeader,
  ModalTitle, SectionMessage, Select, Spinner, Textfield,
} from '@/components/ads';
import type { SelectOption } from '@/components/ads';
import { DatePicker } from '@atlaskit/datetime-picker';
import { Layers } from '@/lib/atlaskit-icons';
import { valueApi } from '../domain';
import { useGateModels, useInitiatives, useInvalidateStrata, useProjectCards } from '../hooks/useStrata';
import { fmtPct, labelize } from './format';
import { StrataPanel, T } from './shared';

// ── Role gates (UI affordance only — DB enforces the real rules) ─────────────
export const VMO_AUTHOR_ROLES = ['strategy_office', 'vmo_validator', 'strata_admin'] as const;
export const VMO_VALUE_ROLES = [...VMO_AUTHOR_ROLES, 'kpi_owner', 'data_steward'] as const;

const fieldLabelStyle: React.CSSProperties = {
  fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtle,
};

function FieldBlock({ label, required, helper, children }: {
  label: string; required?: boolean; helper?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div style={{ marginBottom: 4 }}>
        <span style={fieldLabelStyle}>
          {label}
          {required ? <span style={{ color: 'var(--ds-text-danger)' }}> *</span> : null}
        </span>
        {helper ? (
          <span style={{ marginLeft: 8, fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>{helper}</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

// ── Gate scheduling (subject prefilled; stage options follow the model) ──────
export interface StrataGateSubject {
  type: 'initiative' | 'project_card' | 'benefit' | 'element';
  id: string;
  label: string;
}

export function StrataScheduleGateModal({
  open, subject, onClose, onScheduled,
}: {
  open: boolean;
  subject: StrataGateSubject | null;
  onClose: () => void;
  /** Called after the RPC succeeds (invalidate lives with the caller). */
  onScheduled: () => void;
}) {
  const gateModelsQ = useGateModels();
  const [modelId, setModelId] = useState<string | null>(null);
  const [stageId, setStageId] = useState<string | null>(null);
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setModelId(null); setStageId(null); setScheduledFor(null); setError(null); setBusy(false); }
  }, [open]);

  if (!open || !subject) return null;

  const models = (gateModelsQ.data ?? []).filter((m) => m.status === 'approved');
  const model = models.find((m) => m.id === modelId) ?? null;
  const stages = model?.stages ?? [];

  const modelOptions: SelectOption<string>[] = models.map((m) => ({ value: m.id, label: m.name }));
  const stageOptions: SelectOption<string>[] = stages.map((s) => ({ value: s.id, label: s.name }));

  const submit = async () => {
    if (!modelId || !stageId) {
      setError('Required: Gate model, Stage');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await valueApi.scheduleGate({
        gateModelId: modelId,
        stageId,
        subjectType: subject.type,
        subjectId: subject.id,
        scheduledFor: scheduledFor ?? undefined,
      });
      onScheduled();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={busy ? () => {} : onClose} width="medium" testId="strata-schedule-gate-modal">
      <ModalHeader><ModalTitle>Schedule gate</ModalTitle></ModalHeader>
      <ModalBody>
        <p style={{ margin: '0 0 12px', fontSize: 'var(--ds-font-size-200)', color: T.subtle }}>
          Gate models and their stages are governed configuration — only approved models can be scheduled.
        </p>
        <div style={{ display: 'grid', gap: 12 }}>
          <FieldBlock label="Subject">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <CatalystTag text={labelize(subject.type)} />
              <span style={{ fontSize: 'var(--ds-font-size-200)', color: T.text }}>{subject.label}</span>
            </span>
          </FieldBlock>
          <FieldBlock label="Gate model" required>
            <Select
              options={modelOptions}
              value={modelOptions.find((o) => o.value === modelId) ?? null}
              onChange={(next) => { setModelId(next?.value ?? null); setStageId(null); }}
              placeholder={gateModelsQ.isLoading ? 'Loading…' : 'Select gate model…'}
              isSearchable
              usePortal
              aria-label="Gate model"
            />
          </FieldBlock>
          <FieldBlock label="Stage" required helper={model ? undefined : 'Choose a gate model first'}>
            <Select
              options={stageOptions}
              value={stageOptions.find((o) => o.value === stageId) ?? null}
              onChange={(next) => setStageId(next?.value ?? null)}
              placeholder="Select stage…"
              isDisabled={!model}
              isSearchable
              usePortal
              aria-label="Stage"
            />
          </FieldBlock>
          <FieldBlock label="Scheduled for">
            <DatePicker
              value={scheduledFor ?? ''}
              onChange={(iso) => setScheduledFor(iso || null)}
              shouldShowCalendarButton
              clearControlLabel="Clear scheduled date"
              label="Scheduled for"
            />
          </FieldBlock>
        </div>
        {error ? (
          <div style={{ marginTop: 12 }}>
            <SectionMessage appearance="error" title="Action rejected">
              <p style={{ whiteSpace: 'pre-wrap' }}>{error}</p>
            </SectionMessage>
          </div>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose} isDisabled={busy}>Cancel</Button>
        <Button appearance="primary" onClick={submit} isDisabled={busy}>
          {busy ? 'Working…' : 'Schedule'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// ── Portfolio membership editor ───────────────────────────────────────────────
/** Row shape of strata_portfolio_memberships (domain returns untyped rows). */
interface PortfolioMemberRow {
  id: string;
  portfolio_id: string;
  member_type: 'initiative' | 'project_card';
  member_id: string;
  allocation_pct: number | null;
  priority: number | null;
}

// Project Card first and default (REQ-019: memberships favor project_card
// paths; Initiative remains selectable only for legacy rows).
const MEMBER_TYPE_OPTIONS: SelectOption<'initiative' | 'project_card'>[] = [
  { value: 'project_card', label: 'Project card' },
  { value: 'initiative', label: 'Initiative (legacy)' },
];

function AddMemberModal({
  portfolioId, open, onClose, onAdded,
}: {
  portfolioId: string;
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const initiativesQ = useInitiatives();
  const projectCardsQ = useProjectCards();
  const [memberType, setMemberType] = useState<'initiative' | 'project_card'>('project_card');
  const [memberId, setMemberId] = useState<string | null>(null);
  const [allocation, setAllocation] = useState<number | null>(null);
  const [priority, setPriority] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMemberType('project_card'); setMemberId(null); setAllocation(null); setPriority(null);
      setError(null); setBusy(false);
    }
  }, [open]);

  if (!open) return null;

  const entityOptions: SelectOption<string>[] = memberType === 'initiative'
    ? (initiativesQ.data ?? []).map((i) => ({ value: i.id, label: i.name }))
    : (projectCardsQ.data ?? []).map((p) => ({ value: p.id, label: p.name }));

  const submit = async () => {
    if (!memberId) {
      setError(`Required: ${memberType === 'initiative' ? 'Initiative' : 'Project card'}`);
      return;
    }
    if (allocation != null && (allocation < 0 || allocation > 100)) {
      setError('Allocation must be between 0 and 100.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await valueApi.addPortfolioMember(
        portfolioId, memberType, memberId, allocation ?? undefined, priority ?? undefined,
      );
      onAdded();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={busy ? () => {} : onClose} width="medium" testId="strata-add-member-modal">
      <ModalHeader><ModalTitle>Add portfolio member</ModalTitle></ModalHeader>
      <ModalBody>
        <div style={{ display: 'grid', gap: 12 }}>
          <FieldBlock label="Member type" required>
            <Select
              options={MEMBER_TYPE_OPTIONS}
              value={MEMBER_TYPE_OPTIONS.find((o) => o.value === memberType) ?? null}
              onChange={(next) => { if (next) { setMemberType(next.value); setMemberId(null); } }}
              usePortal
              aria-label="Member type"
            />
          </FieldBlock>
          <FieldBlock label={memberType === 'initiative' ? 'Initiative' : 'Project card'} required>
            <Select
              options={entityOptions}
              value={entityOptions.find((o) => o.value === memberId) ?? null}
              onChange={(next) => setMemberId(next?.value ?? null)}
              placeholder="Select…"
              isSearchable
              usePortal
              aria-label={memberType === 'initiative' ? 'Initiative' : 'Project card'}
            />
          </FieldBlock>
          <FieldBlock label="Allocation %" helper="0–100 · share of this member committed to the portfolio">
            <Textfield
              type="number"
              value={allocation == null ? '' : String(allocation)}
              onChange={(e) => {
                const raw = (e.target as HTMLInputElement).value;
                setAllocation(raw === '' ? null : Number(raw));
              }}
              aria-label="Allocation %"
            />
          </FieldBlock>
          <FieldBlock label="Priority">
            <Textfield
              type="number"
              value={priority == null ? '' : String(priority)}
              onChange={(e) => {
                const raw = (e.target as HTMLInputElement).value;
                setPriority(raw === '' ? null : Number(raw));
              }}
              aria-label="Priority"
            />
          </FieldBlock>
        </div>
        {error ? (
          <div style={{ marginTop: 12 }}>
            <SectionMessage appearance="error" title="Action rejected">
              <p style={{ whiteSpace: 'pre-wrap' }}>{error}</p>
            </SectionMessage>
          </div>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose} isDisabled={busy}>Cancel</Button>
        <Button appearance="primary" onClick={submit} isDisabled={busy}>
          {busy ? 'Working…' : 'Add member'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export function StrataPortfolioMembersPanel({
  portfolioId, canAuthor, onScheduleGate,
}: {
  portfolioId: string;
  canAuthor: boolean;
  onScheduleGate: (subject: StrataGateSubject) => void;
}) {
  const invalidate = useInvalidateStrata();
  const membersQ = useQuery({
    queryKey: ['strata', 'portfolio-members', portfolioId],
    queryFn: () => valueApi.memberships(portfolioId),
    staleTime: 30_000,
  });
  const initiativesQ = useInitiatives();
  const projectCardsQ = useProjectCards();
  const [addOpen, setAddOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const members = (membersQ.data ?? []) as PortfolioMemberRow[];

  const memberName = (m: PortfolioMemberRow): string | null => {
    if (m.member_type === 'initiative') {
      return (initiativesQ.data ?? []).find((i) => i.id === m.member_id)?.name ?? null;
    }
    return (projectCardsQ.data ?? []).find((p) => p.id === m.member_id)?.name ?? null;
  };

  const remove = async (m: PortfolioMemberRow) => {
    setRemovingId(m.id);
    setRowError(null);
    try {
      await valueApi.removePortfolioMember(portfolioId, m.member_type, m.member_id);
      invalidate();
    } catch (e) {
      setRowError(e instanceof Error ? e.message : String(e));
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <StrataPanel
      title="Members"
      icon={<Layers size={16} />}
      count={members.length}
      testId="strata-portfolio-members"
      actions={canAuthor ? (
        <Button appearance="default" spacing="compact" onClick={() => setAddOpen(true)} testId="strata-add-member">
          Add member
        </Button>
      ) : undefined}
    >
      {membersQ.isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner /></div>
      ) : membersQ.isError ? (
        <SectionMessage appearance="error" title="Could not load members">
          <p>{(membersQ.error as Error | null)?.message ?? 'Unknown error'}</p>
        </SectionMessage>
      ) : members.length === 0 ? (
        <EmptyState size="compact" header="No members" description="Initiatives and project cards allocated to this portfolio appear here." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {members.map((m) => {
            const name = memberName(m);
            return (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
                <CatalystTag text={labelize(m.member_type)} />
                <span style={{ fontSize: 'var(--ds-font-size-200)', color: T.text, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {name ?? '—'}
                </span>
                <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                  {m.allocation_pct != null ? `Allocation ${fmtPct(m.allocation_pct)}` : null}
                </span>
                <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                  {m.priority != null ? `Priority ${m.priority}` : null}
                </span>
                {canAuthor ? (
                  <span style={{ display: 'inline-flex', gap: 4, flexShrink: 0 }}>
                    <Button
                      appearance="subtle"
                      spacing="compact"
                      onClick={() => onScheduleGate({ type: m.member_type, id: m.member_id, label: name ?? labelize(m.member_type) })}
                      testId={`strata-member-gate-${m.id}`}
                    >
                      Schedule gate
                    </Button>
                    <Button
                      appearance="subtle"
                      spacing="compact"
                      isDisabled={removingId === m.id}
                      onClick={() => remove(m)}
                      testId={`strata-member-remove-${m.id}`}
                    >
                      {removingId === m.id ? 'Removing…' : 'Remove'}
                    </Button>
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
      {rowError ? (
        <div style={{ marginTop: 12 }}>
          <SectionMessage appearance="error" title="Action rejected">
            <p style={{ whiteSpace: 'pre-wrap' }}>{rowError}</p>
          </SectionMessage>
        </div>
      ) : null}
      <AddMemberModal
        portfolioId={portfolioId}
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={invalidate}
      />
    </StrataPanel>
  );
}
