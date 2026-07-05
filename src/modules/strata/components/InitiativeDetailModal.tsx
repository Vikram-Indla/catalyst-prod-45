/**
 * STRATA initiative detail modal — tabbed full-screen surface (Lane C,
 * CAT-STRATA-20260705-001 functional recovery).
 *
 * Tabs: Summary · Strategy · KPIs · Projects · Benefits · Portfolio.
 * Every write goes through server-validated RPCs (executionApi / valueApi);
 * rejections surface verbatim. Role gating is a UI affordance only — the DB
 * enforces the real rules. Zero-assumption rendering: unknown → '—'.
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import {
  Button, CatalystTag, EmptyState, Lozenge, Modal, ModalBody, ModalFooter,
  ModalHeader, ModalTitle, SectionMessage,
} from '@/components/ads';
import { executionApi, valueApi } from '../domain';
import {
  useBenefits, useInitiativeElements, useInitiativeKpis, useInitiativeProjects,
  useInvalidateStrata, useKpis, usePortfolios, useProfileNames, useProjectCards,
  useStrataContext, useStrataRoles, useStrategyElements,
} from '../hooks/useStrata';
import type { StrataInitiative, StrataRole } from '../types';
import { fmtSarCompact, labelize } from './format';
import { StrataFormModal } from './authoring';
import type { StrataFormValues } from './authoring';
import { T } from './shared';

const WRITE_ROLES: StrataRole[] = ['strategy_office', 'vmo_validator', 'data_steward', 'strata_admin'];
const ARCHIVE_ROLES: StrataRole[] = ['strategy_office', 'vmo_validator', 'strata_admin'];

const INITIATIVE_STATUS: Record<StrataInitiative['status'], React.ComponentProps<typeof Lozenge>['appearance']> = {
  active: 'inprogress', on_hold: 'moved', completed: 'success', stopped: 'removed', draft: 'default',
};

/** Form-value coercion: empty/blank → undefined so RPC COALESCE keeps existing. */
const fvStr = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;
const fvNum = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined;

/** Clear-flag detection: the modal opened with a value and the user cleared the field. */
const wasCleared = (initial: string | null | undefined, submitted: unknown): boolean =>
  initial != null && (submitted == null || (typeof submitted === 'string' && submitted.trim() === ''));

const captionStyle: React.CSSProperties = { fontSize: 'var(--ds-font-size-100)', color: T.subtlest };

// Junction rows arrive untyped from the domain layer.
interface InitiativeElementRow { initiative_id: string; element_id: string; contribution_weight?: number | null; weight?: number | null }
interface InitiativeKpiRow { initiative_id: string; kpi_id: string }
interface BenefitInitiativeRow { id: string; benefit_id: string; initiative_id: string; attribution_share: number | null }

function useBenefitInitiatives() {
  return useQuery({
    queryKey: ['strata', 'benefit-initiatives'],
    queryFn: () => valueApi.benefitInitiatives() as Promise<BenefitInitiativeRow[]>,
    staleTime: 30_000,
  });
}

// ── Row primitives ───────────────────────────────────────────────────────────
function LinkedRow({ primary, meta, onUnlink, canUnlink }: {
  primary: React.ReactNode;
  meta?: React.ReactNode;
  onUnlink?: () => void;
  canUnlink: boolean;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
      border: `1px solid ${T.border}`, borderRadius: 6, background: T.raised,
    }}>
      <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.text, overflowWrap: 'anywhere' }}>
        {primary}
      </span>
      {meta ? <span style={captionStyle}>{meta}</span> : null}
      {canUnlink && onUnlink ? (
        <Button appearance="subtle" spacing="compact" onClick={onUnlink}>Unlink</Button>
      ) : null}
    </div>
  );
}

function TabSection({ title, action, children }: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{ width: '100%', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtlest }}>{title}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

function SummaryField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtlest, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 'var(--ds-font-size-200)', color: T.text, overflowWrap: 'anywhere' }}>{children}</div>
    </div>
  );
}

const Dash = () => <span style={{ color: T.subtlest }}>—</span>;

type FormKey = 'edit' | 'archive' | 'link-element' | 'link-kpi' | 'link-project' | 'link-benefit' | 'add-portfolio' | null;

// ── Modal ────────────────────────────────────────────────────────────────────
export function InitiativeDetailModal({ initiative, onClose }: {
  initiative: StrataInitiative;
  onClose: () => void;
}) {
  const invalidate = useInvalidateStrata();
  const roles = useStrataRoles().data ?? [];
  const canWrite = roles.some((r) => WRITE_ROLES.includes(r));
  const canArchive = roles.some((r) => ARCHIVE_ROLES.includes(r));
  const { activeCycle } = useStrataContext();

  const elementsQ = useStrategyElements(activeCycle?.id);
  const kpisQ = useKpis();
  const projectCardsQ = useProjectCards();
  const initiativeElementsQ = useInitiativeElements();
  const initiativeKpisQ = useInitiativeKpis();
  const initiativeProjectsQ = useInitiativeProjects();
  const benefitsQ = useBenefits();
  const benefitInitiativesQ = useBenefitInitiatives();
  const portfoliosQ = usePortfolios();
  const profilesQ = useProfileNames();

  const [form, setForm] = useState<FormKey>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const elements = elementsQ.data ?? [];
  const kpis = kpisQ.data ?? [];
  const projectCards = projectCardsQ.data ?? [];
  const benefits = benefitsQ.data ?? [];
  const portfolios = portfoliosQ.data ?? [];

  const linkedElements = ((initiativeElementsQ.data ?? []) as InitiativeElementRow[])
    .filter((r) => r.initiative_id === initiative.id);
  const linkedKpis = ((initiativeKpisQ.data ?? []) as InitiativeKpiRow[])
    .filter((r) => r.initiative_id === initiative.id);
  const linkedProjects = (initiativeProjectsQ.data ?? []).filter((r) => r.initiative_id === initiative.id);
  const linkedBenefits = (benefitInitiativesQ.data ?? []).filter((r) => r.initiative_id === initiative.id);

  const elementName = (id: string) => elements.find((e) => e.id === id)?.name ?? null;
  const kpiName = (id: string) => kpis.find((k) => k.id === id)?.name ?? null;
  const projectName = (id: string) => projectCards.find((p) => p.id === id)?.name ?? null;
  const benefitName = (id: string) => benefits.find((b) => b.id === id)?.name ?? null;
  const profileName = (id: string | null) => (id ? profilesQ.data?.get(id)?.name ?? null : null);

  const doAction = async (fn: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await fn();
      invalidate();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    }
  };

  // ── Form modal specs (server errors render inside StrataFormModal) ────────
  const submitAndRefresh = (fn: (v: StrataFormValues) => Promise<unknown>) =>
    async (v: StrataFormValues) => { await fn(v); invalidate(); };

  const notLinked = <A extends { id: string }>(all: A[], linkedIds: Set<string>) =>
    all.filter((x) => !linkedIds.has(x.id));

  const linkTag = (label: string) => <CatalystTag text={label} />;

  return (
    <>
      <Modal isOpen onClose={onClose} width="x-large" testId="strata-initiative-detail-modal">
        <ModalHeader>
          <ModalTitle>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              {initiative.name}
              <Lozenge appearance={INITIATIVE_STATUS[initiative.status] ?? 'default'}>{labelize(initiative.status)}</Lozenge>
            </span>
          </ModalTitle>
        </ModalHeader>
        <ModalBody>
          {actionError ? (
            <div style={{ marginBottom: 12 }}>
              <SectionMessage appearance="error" title="Action rejected">
                <p style={{ whiteSpace: 'pre-wrap' }}>{actionError}</p>
              </SectionMessage>
            </div>
          ) : null}
          <Tabs id={`strata-initiative-detail-tabs-${initiative.id}`}>
            <TabList>
              <Tab>Summary</Tab>
              <Tab>Strategy</Tab>
              <Tab>KPIs</Tab>
              <Tab>Projects</Tab>
              <Tab>Benefits</Tab>
              <Tab>Portfolio</Tab>
            </TabList>

            {/* Summary */}
            <TabPanel>
              <div style={{ width: '100%', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  {canWrite ? <Button spacing="compact" onClick={() => setForm('edit')}>Edit</Button> : null}
                  {canArchive && initiative.status !== 'stopped' ? (
                    <Button spacing="compact" appearance="subtle" onClick={() => setForm('archive')}>Archive</Button>
                  ) : null}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
                  <SummaryField label="Stage">{initiative.stage ? labelize(initiative.stage) : <Dash />}</SummaryField>
                  <SummaryField label="Sponsor">{profileName(initiative.sponsor_id) ?? <Dash />}</SummaryField>
                  <SummaryField label="Owner">{profileName(initiative.owner_id) ?? <Dash />}</SummaryField>
                  <SummaryField label="Budget envelope">
                    {initiative.budget_envelope != null ? fmtSarCompact(initiative.budget_envelope) : <Dash />}
                  </SummaryField>
                  <SummaryField label="Cycle">{activeCycle && initiative.cycle_id === activeCycle.id ? activeCycle.name : <Dash />}</SummaryField>
                  <SummaryField label="Linked project cards">{linkedProjects.length}</SummaryField>
                </div>
                <SummaryField label="Description">{initiative.description ?? <Dash />}</SummaryField>
                <SummaryField label="Value hypothesis">{initiative.value_hypothesis ?? <Dash />}</SummaryField>
              </div>
            </TabPanel>

            {/* Strategy */}
            <TabPanel>
              <TabSection
                title={`Linked strategy elements (${linkedElements.length})`}
                action={canWrite ? <Button spacing="compact" onClick={() => setForm('link-element')}>Link element</Button> : undefined}
              >
                {linkedElements.length === 0 ? (
                  <EmptyState size="compact" header="No strategy elements linked" description="Link this initiative to strategy elements to trace contribution." />
                ) : linkedElements.map((row) => {
                  const w = row.contribution_weight ?? row.weight ?? null;
                  return (
                    <LinkedRow
                      key={`${row.initiative_id}-${row.element_id}`}
                      primary={elementName(row.element_id) ?? <Dash />}
                      meta={w != null ? `Weight ${w <= 1 ? (w * 100).toFixed(0) : w.toFixed(0)}%` : undefined}
                      canUnlink={canWrite}
                      onUnlink={() => doAction(() => executionApi.unlinkInitiativeElement(initiative.id, row.element_id))}
                    />
                  );
                })}
              </TabSection>
            </TabPanel>

            {/* KPIs */}
            <TabPanel>
              <TabSection
                title={`Linked KPIs (${linkedKpis.length})`}
                action={canWrite ? <Button spacing="compact" onClick={() => setForm('link-kpi')}>Link KPI</Button> : undefined}
              >
                {linkedKpis.length === 0 ? (
                  <EmptyState size="compact" header="No KPIs linked" description="Link approved KPIs to measure this initiative." />
                ) : linkedKpis.map((row) => (
                  <LinkedRow
                    key={row.kpi_id}
                    primary={kpiName(row.kpi_id) ?? <Dash />}
                    canUnlink={canWrite}
                    onUnlink={() => doAction(() => executionApi.unlinkInitiativeKpi(initiative.id, row.kpi_id))}
                  />
                ))}
              </TabSection>
            </TabPanel>

            {/* Projects */}
            <TabPanel>
              <TabSection
                title={`Linked project cards (${linkedProjects.length})`}
                action={canWrite ? <Button spacing="compact" onClick={() => setForm('link-project')}>Link project</Button> : undefined}
              >
                {linkedProjects.length === 0 ? (
                  <EmptyState size="compact" header="No project cards mapped" description="Map project cards to trace delivery against this initiative." />
                ) : linkedProjects.map((row) => (
                  <LinkedRow
                    key={row.id}
                    primary={projectName(row.project_card_id) ?? <Dash />}
                    meta={row.mapping_confidence != null ? `Confidence ${row.mapping_confidence <= 1 ? (row.mapping_confidence * 100).toFixed(0) : row.mapping_confidence.toFixed(0)}%` : undefined}
                    canUnlink={canWrite}
                    onUnlink={() => doAction(() => executionApi.unlinkInitiativeProject(initiative.id, row.project_card_id))}
                  />
                ))}
              </TabSection>
            </TabPanel>

            {/* Benefits */}
            <TabPanel>
              <TabSection
                title={`Linked benefits (${linkedBenefits.length})`}
                action={canWrite ? <Button spacing="compact" onClick={() => setForm('link-benefit')}>Link benefit</Button> : undefined}
              >
                {linkedBenefits.length === 0 ? (
                  <EmptyState size="compact" header="No benefits linked" description="Attribute benefits to this initiative with a share of realization." />
                ) : linkedBenefits.map((row) => (
                  <LinkedRow
                    key={row.id}
                    primary={benefitName(row.benefit_id) ?? <Dash />}
                    meta={row.attribution_share != null ? `Attribution ${row.attribution_share.toFixed(0)}%` : undefined}
                    canUnlink={canWrite}
                    onUnlink={() => doAction(() => valueApi.unlinkBenefitInitiative(row.benefit_id, initiative.id))}
                  />
                ))}
              </TabSection>
            </TabPanel>

            {/* Portfolio */}
            <TabPanel>
              <TabSection
                title="Portfolio membership"
                action={canWrite ? <Button spacing="compact" onClick={() => setForm('add-portfolio')}>Add to portfolio</Button> : undefined}
              >
                <p style={{ ...captionStyle, margin: 0 }}>
                  Add this initiative to a value portfolio with an allocation and priority.
                  Existing memberships are managed on the Portfolio / VMO surface.
                </p>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {portfolios.length === 0 ? <span style={captionStyle}>No portfolios available.</span>
                    : portfolios.map((p) => <React.Fragment key={p.id}>{linkTag(p.name)}</React.Fragment>)}
                </div>
              </TabSection>
            </TabPanel>
          </Tabs>
        </ModalBody>
        <ModalFooter>
          <Button appearance="subtle" onClick={onClose}>Close</Button>
        </ModalFooter>
      </Modal>

      {/* ── Authoring modals (stacked above the detail modal) ── */}
      <StrataFormModal
        open={form === 'edit'}
        onClose={() => setForm(null)}
        title="Edit initiative"
        submitLabel="Save"
        fields={[
          { key: 'name', label: 'Name', kind: 'text', required: true },
          { key: 'description', label: 'Description', kind: 'textarea' },
          { key: 'stage', label: 'Stage', kind: 'text', helper: 'Governed stage taxonomy — free text' },
          {
            key: 'status', label: 'Status', kind: 'select',
            options: ['draft', 'active', 'on_hold', 'completed', 'stopped'].map((s) => ({ value: s, label: labelize(s) })),
          },
          { key: 'sponsorId', label: 'Sponsor', kind: 'user' },
          { key: 'ownerId', label: 'Owner', kind: 'user' },
          { key: 'budgetEnvelope', label: 'Budget envelope (SAR)', kind: 'number', min: 0 },
          { key: 'businessCase', label: 'Business case', kind: 'textarea', helper: 'Leave blank to keep current' },
          { key: 'valueHypothesis', label: 'Value hypothesis', kind: 'textarea' },
        ]}
        initial={{
          name: initiative.name, description: initiative.description, stage: initiative.stage,
          status: initiative.status, sponsorId: initiative.sponsor_id, ownerId: initiative.owner_id,
          budgetEnvelope: initiative.budget_envelope, valueHypothesis: initiative.value_hypothesis,
        }}
        onSubmit={submitAndRefresh((v) => executionApi.updateInitiative(initiative.id, {
          name: fvStr(v.name), description: fvStr(v.description), stage: fvStr(v.stage),
          status: fvStr(v.status), sponsorId: fvStr(v.sponsorId), ownerId: fvStr(v.ownerId),
          budgetEnvelope: fvNum(v.budgetEnvelope), businessCase: fvStr(v.businessCase),
          valueHypothesis: fvStr(v.valueHypothesis),
          // Clear affordances: the field opened with a value and the user emptied it.
          clearSponsor: wasCleared(initiative.sponsor_id, v.sponsorId),
          clearOwner: wasCleared(initiative.owner_id, v.ownerId),
        }))}
        testId="strata-initiative-edit-modal"
      />

      <StrataFormModal
        open={form === 'archive'}
        onClose={() => setForm(null)}
        title="Archive initiative"
        description="Archiving stops the initiative. A reason is required and is written to the audit trail."
        submitLabel="Archive"
        fields={[{ key: 'reason', label: 'Reason', kind: 'textarea', required: true }]}
        onSubmit={submitAndRefresh((v) => executionApi.archiveInitiative(initiative.id, String(v.reason ?? '').trim()))}
        testId="strata-initiative-archive-modal"
      />

      <StrataFormModal
        open={form === 'link-element'}
        onClose={() => setForm(null)}
        title="Link strategy element"
        submitLabel="Link"
        fields={[
          {
            key: 'elementId', label: 'Strategy element', kind: 'select', required: true,
            options: notLinked(elements, new Set(linkedElements.map((r) => r.element_id)))
              .map((e) => ({ value: e.id, label: e.name })),
          },
          { key: 'weight', label: 'Contribution weight (%)', kind: 'number', min: 0, max: 100 },
        ]}
        onSubmit={submitAndRefresh((v) => executionApi.linkInitiativeElement(initiative.id, String(v.elementId), fvNum(v.weight)))}
        testId="strata-initiative-link-element-modal"
      />

      <StrataFormModal
        open={form === 'link-kpi'}
        onClose={() => setForm(null)}
        title="Link KPI"
        description="Only approved KPIs can be linked."
        submitLabel="Link"
        fields={[
          {
            key: 'kpiId', label: 'KPI', kind: 'select', required: true,
            options: notLinked(kpis.filter((k) => k.status === 'approved'), new Set(linkedKpis.map((r) => r.kpi_id)))
              .map((k) => ({ value: k.id, label: k.name })),
          },
        ]}
        onSubmit={submitAndRefresh((v) => executionApi.linkInitiativeKpi(initiative.id, String(v.kpiId)))}
        testId="strata-initiative-link-kpi-modal"
      />

      <StrataFormModal
        open={form === 'link-project'}
        onClose={() => setForm(null)}
        title="Link project card"
        submitLabel="Link"
        fields={[
          {
            key: 'projectId', label: 'Project card', kind: 'select', required: true,
            options: notLinked(projectCards, new Set(linkedProjects.map((r) => r.project_card_id)))
              .map((p) => ({ value: p.id, label: p.name })),
          },
          { key: 'confidence', label: 'Mapping confidence (0–1)', kind: 'number', min: 0, max: 1, step: 0.05 },
        ]}
        onSubmit={submitAndRefresh((v) => executionApi.linkInitiativeProject(initiative.id, String(v.projectId), fvNum(v.confidence)))}
        testId="strata-initiative-link-project-modal"
      />

      <StrataFormModal
        open={form === 'link-benefit'}
        onClose={() => setForm(null)}
        title="Link benefit"
        submitLabel="Link"
        fields={[
          {
            key: 'benefitId', label: 'Benefit', kind: 'select', required: true,
            options: notLinked(benefits, new Set(linkedBenefits.map((r) => r.benefit_id)))
              .map((b) => ({ value: b.id, label: b.name })),
          },
          { key: 'share', label: 'Attribution share (%)', kind: 'number', min: 0, max: 100 },
        ]}
        onSubmit={submitAndRefresh((v) => valueApi.linkBenefitInitiative(String(v.benefitId), initiative.id, fvNum(v.share)))}
        testId="strata-initiative-link-benefit-modal"
      />

      <StrataFormModal
        open={form === 'add-portfolio'}
        onClose={() => setForm(null)}
        title="Add to portfolio"
        submitLabel="Add"
        fields={[
          {
            key: 'portfolioId', label: 'Portfolio', kind: 'select', required: true,
            options: portfolios.filter((p) => p.status === 'active').map((p) => ({ value: p.id, label: p.name })),
          },
          { key: 'allocationPct', label: 'Allocation (%)', kind: 'number', min: 0, max: 100 },
          { key: 'priority', label: 'Priority', kind: 'number', min: 0, step: 1 },
        ]}
        onSubmit={submitAndRefresh((v) => valueApi.addPortfolioMember(
          String(v.portfolioId), 'initiative', initiative.id, fvNum(v.allocationPct), fvNum(v.priority),
        ))}
        testId="strata-initiative-add-portfolio-modal"
      />
    </>
  );
}
