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
import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Button, CatalystTag, EmptyState, Modal, ModalBody, ModalFooter, ModalHeader,
  ModalTitle, SectionMessage, Select, Spinner, Textfield,
} from '@/components/ads';
import type { SelectOption } from '@/components/ads';
import { DatePicker } from '@atlaskit/datetime-picker';
import { Layers } from '@/lib/atlaskit-icons';
import { valueApi } from '../domain';
import type { StrataProjectCard } from '../types';
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

/**
 * Parse a day-first typed date (DD/MM/YYYY, tolerant of `-` or `.` separators and 1-digit
 * day/month) into a Date. Returns an Invalid Date for anything that doesn't fully parse, so
 * @atlaskit leaves the field unset rather than committing a wrong date. PB-DEF-005: the
 * established STRATA day-first behavior; a valid 31/12/2026 must never be silently dropped.
 */
export function parseDayFirstDate(input: string): Date {
  const m = input.trim().match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (!m) return new Date(NaN);
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const d = new Date(year, month - 1, day);
  // Reject overflow (e.g. 31/02/2026 rolling into March) — the round-trip must be exact.
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return new Date(NaN);
  }
  return d;
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
              // PB-DEF-005: @atlaskit's default parser reads typed input US-first, so a valid
              // day-first date like 31/12/2026 was silently discarded (new Date('31/12/2026') is
              // Invalid). Parse day-first explicitly so typed text commits on blur/submit.
              dateFormat="DD/MM/YYYY"
              parseInputValue={parseDayFirstDate}
              shouldShowCalendarButton
              clearControlLabel="Clear scheduled date"
              label="Scheduled for"
              // Supply a placeholder so an empty date never shows @atlaskit's
              // built-in 1993 fallback (STRATA-E2E-007).
              placeholder="DD/MM/YYYY"
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

// Project Card is the only selectable new-member type (V3-OPEN-014, REQ-019
// revised 2026-07-12): Initiative is legacy and read-only. Existing initiative
// memberships still render read-only in the panel (memberName), but no NEW
// initiative membership can be authored.
const MEMBER_TYPE_OPTIONS: SelectOption<'initiative' | 'project_card'>[] = [
  { value: 'project_card', label: 'Project card' },
];

// Project Card selector options (STRATA-E2E-013). Cards carry no cycle/tenant
// scoping column (organization_id is unset), so eligibility here means: not
// already a member of this portfolio. Same-named cards (e.g. a manual card and
// its Jira-synced twin) are disambiguated by their source so the picker never
// shows two indistinguishable rows — we never de-dupe by name, which would drop
// a genuinely distinct card and bind membership to the wrong one.
function buildProjectCardOptions(
  cards: StrataProjectCard[],
  excludeIds: Set<string>,
): SelectOption<string>[] {
  // PB-DEF-004: the same card row can arrive twice from the query, producing two
  // indistinguishable options (`ZZTEST-STRATA-E2E-Project-B · Manual` ×2). De-dupe by
  // id — safe, never drops a distinct card (unlike name de-duping, which must not happen).
  const seenIds = new Set<string>();
  const eligible = cards.filter((c) => {
    if (excludeIds.has(c.id) || seenIds.has(c.id)) return false;
    seenIds.add(c.id);
    return true;
  });
  const nameCounts = new Map<string, number>();
  for (const c of eligible) nameCounts.set(c.name, (nameCounts.get(c.name) ?? 0) + 1);
  const labelCounts = new Map<string, number>();
  const options = eligible.map((c) => {
    const ambiguous = (nameCounts.get(c.name) ?? 0) > 1;
    const hint = c.source_key
      ? `${labelize(c.source_system)}: ${c.source_key}`
      : labelize(c.source_system);
    const label = ambiguous ? `${c.name} · ${hint}` : c.name;
    labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
    return { value: c.id, label };
  });
  // Two DISTINCT cards can still collide on name+source (e.g. both Manual, no source_key).
  // Suffix a short id so the picker never presents two indistinguishable rows.
  const collided = new Set(Array.from(labelCounts).filter(([, n]) => n > 1).map(([l]) => l));
  return options.map((o) =>
    collided.has(o.label) ? { ...o, label: `${o.label} · #${o.value.slice(0, 6)}` } : o,
  );
}

function AddMemberModal({
  portfolioId, open, onClose, onAdded, members,
}: {
  portfolioId: string;
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
  members: PortfolioMemberRow[];
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

  const existingMemberIds = new Set(
    members.filter((m) => m.member_type === memberType).map((m) => m.member_id),
  );
  const entityOptions: SelectOption<string>[] = memberType === 'initiative'
    ? (initiativesQ.data ?? [])
        .filter((i) => !existingMemberIds.has(i.id))
        .map((i) => ({ value: i.id, label: i.name }))
    : buildProjectCardOptions(projectCardsQ.data ?? [], existingMemberIds);

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

// ── Attribution rule authoring (governed Project Card splits) ────────────────
// V3-OPEN-019: attribution rules attribute realized value to governed Project
// Cards via structured percentage splits — never free-form JSON. Each split
// targets one Project Card; percentages must be positive and sum to exactly
// 100. Calculated amounts, cross-benefit double-count prevention, duplicate-rule
// rejection and SoD are the RPC's responsibility (strata_create_attribution_rule)
// — this modal only builds and validates the structured payload.
export type StrataAttributionRuleType = 'shared_benefit' | 'counterfactual' | 'double_counting';

interface AttributionSplitDraft { key: number; cardId: string | null; pct: number | null }

export function StrataAttributionRuleModal({
  benefitId, benefitName, open, onClose, onChanged, projectCards, ruleTypeOptions,
}: {
  benefitId: string;
  benefitName?: string;
  open: boolean;
  onClose: () => void;
  /** Called after the RPC succeeds (invalidate lives with the caller). */
  onChanged: () => void;
  projectCards: StrataProjectCard[];
  ruleTypeOptions: SelectOption<StrataAttributionRuleType>[];
}) {
  const [ruleType, setRuleType] = useState<StrataAttributionRuleType | null>(null);
  const [splits, setSplits] = useState<AttributionSplitDraft[]>([{ key: 0, cardId: null, pct: null }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextKey = useRef(1);

  useEffect(() => {
    if (open) {
      setRuleType(null);
      setSplits([{ key: 0, cardId: null, pct: null }]);
      nextKey.current = 1;
      setError(null);
      setBusy(false);
    }
  }, [open]);

  if (!open) return null;

  // Every card is an eligible target (no cross-portfolio scoping — parked as
  // STRATA-E2E-013); duplicate targets are caught by client validation below.
  const cardOptions = buildProjectCardOptions(projectCards, new Set());

  const addSplit = () =>
    setSplits((prev) => [...prev, { key: nextKey.current++, cardId: null, pct: null }]);
  const removeSplit = (key: number) =>
    setSplits((prev) => (prev.length > 1 ? prev.filter((s) => s.key !== key) : prev));
  const setSplitCard = (key: number, cardId: string | null) =>
    setSplits((prev) => prev.map((s) => (s.key === key ? { ...s, cardId } : s)));
  const setSplitPct = (key: number, pct: number | null) =>
    setSplits((prev) => prev.map((s) => (s.key === key ? { ...s, pct } : s)));

  const submit = async () => {
    if (!ruleType) { setError('Select a rule type.'); return; }
    if (splits.some((s) => !s.cardId)) {
      setError('Every split must target a project card.'); return;
    }
    if (splits.some((s) => s.pct == null || !Number.isFinite(s.pct) || s.pct <= 0)) {
      setError('Every split percentage must be a number greater than 0.'); return;
    }
    const ids = splits.map((s) => s.cardId);
    if (new Set(ids).size !== ids.length) {
      setError('A project card can appear in only one split.'); return;
    }
    const sum = splits.reduce((acc, s) => acc + (s.pct ?? 0), 0);
    if (sum !== 100) {
      setError(`Split percentages must add up to 100 (currently ${sum}).`); return;
    }
    setBusy(true);
    setError(null);
    try {
      await valueApi.createAttributionRule(benefitId, ruleType, {
        splits: splits.map((s) => ({ project_card_id: s.cardId, pct: s.pct })),
      });
      onChanged();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={busy ? () => {} : onClose} width="medium" testId="strata-attribution-rule-modal">
      <ModalHeader>
        <ModalTitle>{benefitName ? `Add attribution rule · ${benefitName}` : 'Add attribution rule'}</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <p style={{ margin: '0 0 12px', fontSize: 'var(--ds-font-size-200)', color: T.subtle }}>
          Attribute realized value to governed Project Cards. Percentages must be positive and add up to 100 —
          calculated amounts and double-count prevention are enforced server-side.
        </p>
        <div style={{ display: 'grid', gap: 12 }}>
          <FieldBlock label="Rule type" required>
            <Select
              options={ruleTypeOptions}
              value={ruleTypeOptions.find((o) => o.value === ruleType) ?? null}
              onChange={(next) => setRuleType(next?.value ?? null)}
              placeholder="Select rule type…"
              usePortal
              aria-label="Rule type"
            />
          </FieldBlock>
          <FieldBlock label="Splits" required helper="Each split attributes a share to one Project Card">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {splits.map((s, i) => {
                const selected = cardOptions.find((o) => o.value === s.cardId) ?? null;
                return (
                  <div key={s.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <Select
                        options={cardOptions}
                        value={selected}
                        onChange={(next) => setSplitCard(s.key, next?.value ?? null)}
                        placeholder="Select project card…"
                        isSearchable
                        usePortal
                        aria-label={`Project card for split ${i + 1}`}
                      />
                    </span>
                    <span style={{ width: 96, flexShrink: 0 }}>
                      <Textfield
                        type="number"
                        value={s.pct == null ? '' : String(s.pct)}
                        onChange={(e) => {
                          const raw = (e.target as HTMLInputElement).value;
                          setSplitPct(s.key, raw === '' ? null : Number(raw));
                        }}
                        placeholder="%"
                        aria-label={`Percentage for split ${i + 1}`}
                      />
                    </span>
                    <Button
                      appearance="subtle"
                      spacing="compact"
                      onClick={() => removeSplit(s.key)}
                      isDisabled={splits.length <= 1}
                      aria-label={`Remove split ${i + 1}`}
                    >
                      Remove
                    </Button>
                  </div>
                );
              })}
              <span style={{ alignSelf: 'flex-start' }}>
                <Button appearance="subtle" spacing="compact" onClick={addSplit}>Add split</Button>
              </span>
            </div>
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
          {busy ? 'Working…' : 'Add rule'}
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
        members={members}
      />
    </StrataPanel>
  );
}
