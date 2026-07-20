/**
 * STRATA KPI Governance — /strata/kpi-governance (CAT-STRATA-KPI-OPMODEL-20260720-001).
 * CRUD + lifecycle surface for the governed measurement spine:
 *   - Strategic / Project KPI Assignments (create -> submit -> approve/reject -> retire),
 *   - scoped observations (submit + maker-checker validate),
 *   - the authoritative contribution roll-up (numerator / denominator / weights / exclusions / overlaps).
 * All governance is server-enforced (RPCs); this surface explains the same rules.
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Inline, Stack, Text, xcss } from '@atlaskit/primitives';
import { Button, Lozenge, Select, Textfield, Checkbox, EmptyState, Spinner, SectionMessage, DynamicTable, CatalystInlineCode } from '@/components/ads';
import { kpiApi } from '@/modules/strata/domain';
import { useStrataRoles } from '@/modules/strata/hooks/useStrata';
import { StrataPageShell, StrataPanel } from '@/modules/strata/components/shared';
import { labelize } from '@/modules/strata/components/format';

const STATUS_LOZENGE: Record<string, { label: string; appearance: React.ComponentProps<typeof Lozenge>['appearance'] }> = {
  draft: { label: 'Draft', appearance: 'default' },
  submitted: { label: 'Submitted', appearance: 'inprogress' },
  approved: { label: 'Approved', appearance: 'success' },
  rejected: { label: 'Rejected', appearance: 'removed' },
  retired: { label: 'Retired', appearance: 'moved' },
};

const WRITE_ROLES = ['strategy_office', 'kpi_owner', 'okr_owner', 'strata_admin'];
const APPROVE_ROLES = ['strategy_office', 'kpi_approver', 'strata_admin'];

type Assignment = { id: string; assignment_key?: string | null; kpi_id: string; scope_type: string; status: string; target?: number | null; lock_version?: number; kr_eligible?: boolean };

// ── Local ADS field/layout helpers (composed from @atlaskit/primitives only —
//    no shared-component edits). ADS Text owns label typography (12px), so the
//    labels no longer depend on a manual font-size token. ─────────────────────
const fieldXcss = xcss({ minWidth: '180px', flexGrow: 1 });
const noteXcss = xcss({ marginTop: 'space.100' });
const formRowXcss = xcss({ marginBottom: 'space.150' });
const sectionGapXcss = xcss({ marginTop: 'space.300' });
const captionXcss = xcss({ marginBottom: 'space.100' });
const rollupXcss = xcss({ marginTop: 'space.150', padding: 'space.150', backgroundColor: 'elevation.surface.sunken', borderRadius: 'border.radius' });

function LField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Stack space="space.050" xcss={fieldXcss}>
      <Text size="small" weight="medium" color="color.text.subtle">{label}</Text>
      {children}
    </Stack>
  );
}

export default function StrataKpiGovernancePage() {
  const roles = useStrataRoles();
  const roleList = roles.data ?? [];
  const canWrite = roleList.some((r) => WRITE_ROLES.includes(r));
  const canApprove = roleList.some((r) => APPROVE_ROLES.includes(r));

  const assignQ = useQuery({ queryKey: ['strata', 'kpi-assignments'], queryFn: () => kpiApi.kpiAssignments(), staleTime: 0 });
  const kpiQ = useQuery({ queryKey: ['strata', 'approved-kpis'], queryFn: () => kpiApi.approvedKpis(), staleTime: 30_000 });
  const assignments = (assignQ.data ?? []) as unknown as Assignment[];
  const kpis = kpiQ.data ?? [];

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Assignment | null>(null);
  const [rollup, setRollup] = useState<Record<string, unknown> | null>(null);

  // create-form state
  const [kpiId, setKpiId] = useState<string | null>(null);
  const [scopeType, setScopeType] = useState<'strategic' | 'project'>('strategic');
  const [target, setTarget] = useState('');
  const [krEligible, setKrEligible] = useState(false);
  // scope target (STRATA-KPI-025): strategic -> a strategy element; project -> card + project objective
  const [elementId, setElementId] = useState<string | null>(null);
  const [projectCardId, setProjectCardId] = useState<string | null>(null);
  const [projectObjectiveId, setProjectObjectiveId] = useState<string | null>(null);
  const elemQ = useQuery({ queryKey: ['strata', 'elements'], queryFn: () => kpiApi.strategyElements(), staleTime: 30_000 });
  const cardQ = useQuery({ queryKey: ['strata', 'project-cards'], queryFn: () => kpiApi.projectCards(), staleTime: 30_000 });
  const strategicElements = (elemQ.data ?? []).filter((e) => e.context === 'theme');
  const projectObjectives = (elemQ.data ?? []).filter((e) => e.context === 'project');
  const projectCards = cardQ.data ?? [];
  const scopeReady = scopeType === 'strategic' ? !!elementId : (!!projectCardId && !!projectObjectiveId);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true); setError(null);
    try { await fn(); await assignQ.refetch(); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const rows = assignments.map((a) => {
    const loz = STATUS_LOZENGE[a.status] ?? STATUS_LOZENGE.draft;
    return {
      key: a.id,
      cells: [
        { key: 'k', content: <CatalystInlineCode>{a.assignment_key ?? a.id.slice(0, 8)}</CatalystInlineCode> },
        { key: 's', content: <Text color="color.text.subtle">{labelize(a.scope_type)}</Text> },
        { key: 't', content: <Text>{a.target ?? '—'}</Text> },
        { key: 'st', content: <Lozenge appearance={loz.appearance}>{loz.label}</Lozenge> },
        {
          key: 'a',
          content: (
            <Inline space="space.100" shouldWrap>
              {canWrite && (a.status === 'draft' || a.status === 'rejected') ? (
                <Button spacing="compact" appearance="primary" isDisabled={busy} testId={`assign-submit-${a.id}`}
                  onClick={() => run(() => kpiApi.submitKpiAssignment(a.id, a.lock_version))}>Submit</Button>
              ) : null}
              {canApprove && a.status === 'submitted' ? (
                <>
                  <Button spacing="compact" appearance="primary" isDisabled={busy} testId={`assign-approve-${a.id}`}
                    onClick={() => run(() => kpiApi.approveKpiAssignment(a.id, a.lock_version))}>Approve</Button>
                  <Button spacing="compact" appearance="warning" isDisabled={busy} testId={`assign-reject-${a.id}`}
                    onClick={() => run(() => kpiApi.rejectKpiAssignment(a.id, 'sent back'))}>Reject</Button>
                </>
              ) : null}
              {a.status === 'approved' ? (
                <Button spacing="compact" isDisabled={busy} testId={`assign-observe-${a.id}`}
                  onClick={() => { setSelected(a); setRollup(null); }}>Observe / roll-up</Button>
              ) : null}
              {canWrite && a.status !== 'retired' ? (
                <Button spacing="compact" appearance="subtle" isDisabled={busy} testId={`assign-retire-${a.id}`}
                  onClick={() => run(() => kpiApi.retireKpiAssignment(a.id))}>Retire</Button>
              ) : null}
            </Inline>
          ),
        },
      ],
    };
  });

  const head = { cells: [
    { key: 'k', content: 'Assignment' }, { key: 's', content: 'Scope' },
    { key: 't', content: 'Target' }, { key: 'st', content: 'Status' }, { key: 'a', content: 'Actions' },
  ] };

  return (
    <StrataPageShell title="KPI Governance" docTitle="KPI Governance" testId="strata-kpi-governance">
      {error ? <SectionMessage appearance="error" title="Action failed"><p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{error}</p></SectionMessage> : null}

      {canWrite ? (
        <StrataPanel title="New KPI Assignment" testId="assign-create">
          <Inline space="space.100" alignBlock="end" shouldWrap>
            <LField label="Approved KPI">
              <Select options={kpis.map((k) => ({ value: k.id, label: k.name }))}
                value={kpiId ? { value: kpiId, label: kpis.find((k) => k.id === kpiId)?.name ?? kpiId } : null}
                onChange={(o) => setKpiId((o as { value?: string } | null)?.value ?? null)} usePortal aria-label="Approved KPI" />
            </LField>
            <LField label="Scope">
              <Select options={[{ value: 'strategic', label: 'Strategic' }, { value: 'project', label: 'Project' }]}
                value={{ value: scopeType, label: labelize(scopeType) }}
                onChange={(o) => { setScopeType(((o as { value?: string } | null)?.value as 'strategic' | 'project') ?? 'strategic'); setElementId(null); setProjectCardId(null); setProjectObjectiveId(null); }} usePortal aria-label="Scope" />
            </LField>
            {scopeType === 'strategic' ? (
              <LField label="Strategy element">
                <Select options={strategicElements.map((e) => ({ value: e.id, label: e.name }))}
                  value={elementId ? { value: elementId, label: strategicElements.find((e) => e.id === elementId)?.name ?? elementId } : null}
                  onChange={(o) => setElementId((o as { value?: string } | null)?.value ?? null)} usePortal aria-label="Strategy element" />
              </LField>
            ) : (
              <>
                <LField label="Project card">
                  <Select options={projectCards.map((c) => ({ value: c.id, label: c.name }))}
                    value={projectCardId ? { value: projectCardId, label: projectCards.find((c) => c.id === projectCardId)?.name ?? projectCardId } : null}
                    onChange={(o) => setProjectCardId((o as { value?: string } | null)?.value ?? null)} usePortal aria-label="Project card" />
                </LField>
                <LField label="Project objective">
                  <Select options={projectObjectives.map((e) => ({ value: e.id, label: e.name }))}
                    value={projectObjectiveId ? { value: projectObjectiveId, label: projectObjectives.find((e) => e.id === projectObjectiveId)?.name ?? projectObjectiveId } : null}
                    onChange={(o) => setProjectObjectiveId((o as { value?: string } | null)?.value ?? null)} usePortal aria-label="Project objective" />
                </LField>
              </>
            )}
            <LField label="Target">
              <Textfield value={target} onChange={(e) => setTarget((e.target as HTMLInputElement).value)} type="number" aria-label="Target" />
            </LField>
            <Checkbox isChecked={krEligible} onChange={(e) => setKrEligible((e.target as HTMLInputElement).checked)} label="KR-eligible" />
            <Button appearance="primary" isDisabled={busy || !kpiId || !scopeReady} testId="assign-create-btn"
              onClick={() => run(async () => {
                await kpiApi.createKpiAssignment({
                  kpiId: kpiId!, scopeType, target: target ? Number(target) : undefined, krEligible,
                  elementId: scopeType === 'strategic' ? elementId! : undefined,
                  projectCardId: scopeType === 'project' ? projectCardId! : undefined,
                  projectObjectiveId: scopeType === 'project' ? projectObjectiveId! : undefined,
                });
                setKpiId(null); setTarget(''); setKrEligible(false); setElementId(null); setProjectCardId(null); setProjectObjectiveId(null);
              })}>Create draft</Button>
          </Inline>
          <Box xcss={noteXcss}>
            <Text size="small" color="color.text.subtlest">
              Only an approved KPI Definition can be assigned. Approval is maker-checker: the submitter cannot approve their own assignment.
            </Text>
          </Box>
        </StrataPanel>
      ) : null}

      <StrataPanel title="KPI Assignments" count={assignments.length} testId="assign-list">
        {assignQ.isLoading ? <Spinner size="medium" aria-label="Loading assignments" />
          : assignments.length === 0
            ? <EmptyState header="No KPI assignments yet" description="Assign an approved KPI to a strategic element or a project to give it a scoped target and observations." />
            : <DynamicTable head={head} rows={rows} isFixedSize />}
      </StrataPanel>

      {canWrite ? <ClassificationPanel /> : null}
      <AlignmentPanel canWrite={canWrite} canApprove={canApprove} />

      {selected ? (
        <AssignmentDetail assignment={selected} canWrite={canWrite} canApprove={canApprove}
          allAssignments={assignments.filter((a) => a.status === 'approved' && a.id !== selected.id)}
          rollup={rollup} onRollup={async () => { setRollup(await kpiApi.assignmentRollup(selected.id) as Record<string, unknown>); }}
          onClose={() => { setSelected(null); setRollup(null); }} />
      ) : null}
    </StrataPageShell>
  );
}

function AssignmentDetail({ assignment, canWrite, canApprove, allAssignments, rollup, onRollup, onClose }: {
  assignment: { id: string; assignment_key?: string | null };
  canWrite: boolean; canApprove: boolean;
  allAssignments: Assignment[];
  rollup: Record<string, unknown> | null; onRollup: () => Promise<void>; onClose: () => void;
}) {
  const obsQ = useQuery({ queryKey: ['strata', 'assign-obs', assignment.id], queryFn: () => kpiApi.assignmentObservations(assignment.id), staleTime: 0 });
  const mapQ = useQuery({ queryKey: ['strata', 'assign-maps', assignment.id], queryFn: () => kpiApi.contributionMappings(assignment.id), staleTime: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asOf, setAsOf] = useState('');
  const [value, setValue] = useState('');
  const [childId, setChildId] = useState<string | null>(null);
  const [relType, setRelType] = useState<'direct_component' | 'driver' | 'supporting_evidence'>('direct_component');
  const [weight, setWeight] = useState('');

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true); setError(null);
    try { await fn(); await obsQ.refetch(); await mapQ.refetch(); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };
  const mappings = (mapQ.data ?? []) as Array<{ id: string; child_assignment_id: string; relationship_type: string; status: string; weight: number | null; lock_version?: number }>;
  const observations = (obsQ.data ?? []) as Array<{ id: string; as_of_date: string; value: number | null; status: string }>;

  return (
    <StrataPanel title={`Observations — ${assignment.assignment_key ?? assignment.id.slice(0, 8)}`} testId="assign-detail"
      actions={<Button spacing="compact" appearance="subtle" onClick={onClose}>Close</Button>}>
      {error ? <SectionMessage appearance="error" title="Failed"><p style={{ margin: 0 }}>{error}</p></SectionMessage> : null}
      {canWrite ? (
        <Box xcss={formRowXcss}>
          <Inline space="space.100" alignBlock="end" shouldWrap>
            <LField label="As-of date">
              <Textfield value={asOf} onChange={(e) => setAsOf((e.target as HTMLInputElement).value)} type="date" aria-label="As-of date" />
            </LField>
            <LField label="Value">
              <Textfield value={value} onChange={(e) => setValue((e.target as HTMLInputElement).value)} type="number" aria-label="Observation value" />
            </LField>
            <Button appearance="primary" isDisabled={busy || !asOf || value === ''} testId="obs-submit"
              onClick={() => run(async () => { await kpiApi.submitAssignmentObservation({ assignmentId: assignment.id, asOf, value: Number(value) }); setValue(''); })}>Submit observation</Button>
            <Button isDisabled={busy} testId="rollup-btn" onClick={() => run(onRollup)}>Compute roll-up</Button>
          </Inline>
        </Box>
      ) : null}

      <DynamicTable
        head={{ cells: [
          { key: 'd', content: 'As-of date' }, { key: 'v', content: 'Value' },
          { key: 's', content: 'Status' }, { key: 'a', content: '' },
        ] }}
        rows={observations.map((o) => ({
          key: o.id, testId: `obs-${o.id}`,
          cells: [
            { key: 'd', content: <Text color="color.text.subtle">{o.as_of_date}</Text> },
            { key: 'v', content: <Text>{o.value ?? '—'}</Text> },
            { key: 's', content: <Lozenge appearance={o.status === 'validated' ? 'success' : o.status === 'rejected' ? 'removed' : o.status === 'accepted_with_exception' ? 'moved' : 'inprogress'}>{labelize(o.status)}</Lozenge> },
            { key: 'a', content: canApprove && o.status === 'pending' ? (
              <Inline space="space.100">
                <Button spacing="compact" appearance="primary" isDisabled={busy} testId={`obs-validate-${o.id}`}
                  onClick={() => run(() => kpiApi.validateAssignmentObservation(o.id, 'validated'))}>Validate</Button>
                <Button spacing="compact" appearance="warning" isDisabled={busy} testId={`obs-reject-${o.id}`}
                  onClick={() => run(() => kpiApi.validateAssignmentObservation(o.id, 'rejected'))}>Reject</Button>
              </Inline>
            ) : <Text color="color.text.subtlest">—</Text> },
          ],
        }))}
        emptyView={<Text color="color.text.subtlest">No observations yet.</Text>}
      />

      <Box xcss={sectionGapXcss} testId="assign-contributions">
        <Box xcss={captionXcss}>
          <Text size="small" color="color.text.subtle">
            Contributions to this assignment (only approved <Text as="span" weight="bold">direct_component</Text> children enter the roll-up)
          </Text>
        </Box>
        {canWrite ? (
          <Box xcss={formRowXcss}>
            <Inline space="space.100" alignBlock="end" shouldWrap>
              <LField label="Child assignment">
                <Select options={allAssignments.map((a) => ({ value: a.id, label: a.assignment_key ?? a.id.slice(0, 8) }))}
                  value={childId ? { value: childId, label: allAssignments.find((a) => a.id === childId)?.assignment_key ?? childId } : null}
                  onChange={(o) => setChildId((o as { value?: string } | null)?.value ?? null)} usePortal aria-label="Child assignment" />
              </LField>
              <LField label="Relationship">
                <Select options={[{ value: 'direct_component', label: 'Direct component' }, { value: 'driver', label: 'Driver' }, { value: 'supporting_evidence', label: 'Supporting evidence' }]}
                  value={{ value: relType, label: labelize(relType) }}
                  onChange={(o) => setRelType(((o as { value?: string } | null)?.value as typeof relType) ?? 'direct_component')} usePortal aria-label="Relationship type" />
              </LField>
              <LField label="Weight">
                <Textfield value={weight} onChange={(e) => setWeight((e.target as HTMLInputElement).value)} type="number" aria-label="Weight" />
              </LField>
              <Button appearance="primary" isDisabled={busy || !childId} testId="map-create"
                onClick={() => run(async () => { await kpiApi.createContributionMapping({ parentAssignmentId: assignment.id, childAssignmentId: childId!, relationshipType: relType, weight: weight ? Number(weight) : undefined }); setChildId(null); setWeight(''); })}>Add contribution</Button>
            </Inline>
          </Box>
        ) : null}
        <DynamicTable
          head={{ cells: [
            { key: 'c', content: 'Child' }, { key: 'r', content: 'Relationship' }, { key: 'w', content: 'Weight' },
            { key: 's', content: 'Status' }, { key: 'a', content: '' },
          ] }}
          rows={mappings.map((m) => ({
            key: m.id, testId: `map-${m.id}`,
            cells: [
              { key: 'c', content: <Text>{allAssignments.find((a) => a.id === m.child_assignment_id)?.assignment_key ?? m.child_assignment_id.slice(0, 8)}</Text> },
              { key: 'r', content: <Lozenge appearance={m.relationship_type === 'direct_component' ? 'inprogress' : 'default'}>{labelize(m.relationship_type)}</Lozenge> },
              { key: 'w', content: <Text color="color.text.subtle">{m.weight ?? '—'}</Text> },
              { key: 's', content: <Lozenge appearance={m.status === 'approved' ? 'success' : m.status === 'retired' ? 'moved' : m.status === 'rejected' ? 'removed' : 'default'}>{labelize(m.status)}</Lozenge> },
              { key: 'a', content: (
                <Inline space="space.100">
                  {canWrite && (m.status === 'draft' || m.status === 'rejected') ? (
                    <Button spacing="compact" isDisabled={busy} testId={`map-submit-${m.id}`}
                      onClick={() => run(() => kpiApi.submitContributionMapping(m.id, m.lock_version))}>Submit</Button>
                  ) : null}
                  {canApprove && m.status === 'submitted' ? (
                    <Button spacing="compact" appearance="primary" isDisabled={busy} testId={`map-approve-${m.id}`}
                      onClick={() => run(() => kpiApi.approveContributionMapping(m.id, m.lock_version))}>Approve</Button>
                  ) : null}
                </Inline>
              ) },
            ],
          }))}
          emptyView={<Text color="color.text.subtlest">No contributions mapped.</Text>}
        />
      </Box>

      {rollup ? (
        <Box xcss={rollupXcss} testId="rollup-result">
          <Box xcss={captionXcss}><Text size="small" color="color.text.subtle">Authoritative roll-up (direct_component only)</Text></Box>
          <Text>
            Result: <Text as="span" weight="bold">{String(rollup.result ?? '—')}</Text> · method {String(rollup.method)} · included {String(rollup.included_count)}
            {rollup.has_overlap ? <Text as="span" color="color.text.warning"> · overlap detected</Text> : null}
          </Text>
        </Box>
      ) : null}
    </StrataPanel>
  );
}

// ── STRATA-KPI-004/005/022: KPI classification (draft KPIs only) ──────────────
const USAGE_CLASSES = ['strategic', 'operational', 'project_outcome', 'project_delivery', 'risk_compliance'];
const AGG_POLICIES = ['none', 'sum', 'average', 'weighted_average'];

type ClassifyDraft = { id: string; name: string; usage_class?: string | null; kr_eligible?: boolean; aggregation_policy?: string | null };
type ClassifyEdit = { usage: string | null; kr: boolean; agg: string };

function ClassificationPanel() {
  const draftQ = useQuery({ queryKey: ['strata', 'draft-kpis'], queryFn: () => kpiApi.draftKpis(), staleTime: 0 });
  const drafts = (draftQ.data ?? []) as ClassifyDraft[];
  const [edits, setEdits] = useState<Record<string, ClassifyEdit>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<{ id: string; msg: string } | null>(null);

  const stateOf = (k: ClassifyDraft): ClassifyEdit =>
    edits[k.id] ?? { usage: k.usage_class ?? null, kr: !!k.kr_eligible, agg: k.aggregation_policy ?? 'none' };
  const patch = (k: ClassifyDraft, p: Partial<ClassifyEdit>) =>
    setEdits((s) => ({ ...s, [k.id]: { ...stateOf(k), ...p } }));

  const classify = async (k: ClassifyDraft) => {
    const st = stateOf(k);
    setBusyId(k.id); setErr(null);
    try {
      await kpiApi.classifyKpi(k.id, { usageClass: st.usage as never, krEligible: st.kr, aggregationPolicy: st.agg as never });
      await draftQ.refetch();
    } catch (e) { setErr({ id: k.id, msg: e instanceof Error ? e.message : String(e) }); }
    finally { setBusyId(null); }
  };

  const head = { cells: [
    { key: 'n', content: 'KPI' }, { key: 'u', content: 'Usage class' }, { key: 'a', content: 'Aggregation' },
    { key: 'kr', content: 'KR-eligible' }, { key: 'act', content: '' },
  ] };
  const rows = drafts.map((k) => {
    const st = stateOf(k);
    return {
      key: k.id, testId: `classify-${k.id}`,
      cells: [
        { key: 'n', content: <Text>{k.name}</Text> },
        { key: 'u', content: (
          <Select options={USAGE_CLASSES.map((u) => ({ value: u, label: labelize(u) }))}
            value={st.usage ? { value: st.usage, label: labelize(st.usage) } : null}
            onChange={(o) => patch(k, { usage: (o as { value?: string } | null)?.value ?? null })}
            usePortal aria-label={`Usage class for ${k.name}`} />
        ) },
        { key: 'a', content: (
          <Select options={AGG_POLICIES.map((a) => ({ value: a, label: labelize(a) }))}
            value={{ value: st.agg, label: labelize(st.agg) }}
            onChange={(o) => patch(k, { agg: (o as { value?: string } | null)?.value ?? 'none' })}
            usePortal aria-label={`Aggregation policy for ${k.name}`} />
        ) },
        { key: 'kr', content: (
          <Checkbox isChecked={st.kr} onChange={(e) => patch(k, { kr: (e.target as HTMLInputElement).checked })}
            label="" aria-label={`KR-eligible for ${k.name}`} />
        ) },
        { key: 'act', content: (
          <Inline space="space.100" alignBlock="center">
            <Button appearance="primary" spacing="compact" isDisabled={busyId === k.id || !st.usage}
              testId={`classify-save-${k.id}`} onClick={() => classify(k)}>Classify</Button>
            {err && err.id === k.id ? <Text size="small" color="color.text.danger">{err.msg}</Text> : null}
          </Inline>
        ) },
      ],
    };
  });

  return (
    <StrataPanel title="Classify KPIs" count={drafts.length} testId="kpi-classify">
      {draftQ.isLoading
        ? <Spinner size="medium" aria-label="Loading draft KPIs" />
        : <DynamicTable head={head} rows={rows}
            emptyView={<Text color="color.text.subtlest">No draft/pending KPIs to classify.</Text>} />}
      <Box xcss={noteXcss}>
        <Text size="small" color="color.text.subtlest">
          Usage class is required before a KPI can be submitted. KR-eligibility is valid only for strategic or project-outcome classes.
        </Text>
      </Box>
    </StrataPanel>
  );
}

// ── STRATA-KPI-034/036/037/038: Project Objective Alignment ───────────────────
function AlignmentPanel({ canWrite, canApprove }: { canWrite: boolean; canApprove: boolean }) {
  const elemQ = useQuery({ queryKey: ['strata', 'elements'], queryFn: () => kpiApi.strategyElements(), staleTime: 30_000 });
  const elements = elemQ.data ?? [];
  const projectObjs = elements.filter((e) => e.context === 'project');
  const strategicObjs = elements.filter((e) => e.context === 'theme');
  const [projId, setProjId] = useState<string | null>(null);
  const [stratId, setStratId] = useState<string | null>(null);
  const [alignType, setAlignType] = useState<'primary' | 'secondary'>('primary');
  const [attr, setAttr] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alignQ = useQuery({ queryKey: ['strata', 'obj-alignments', projId], queryFn: () => kpiApi.objectiveAlignments(projId!), enabled: !!projId, staleTime: 0 });
  const alignments = (alignQ.data ?? []) as Array<{ id: string; strategic_objective_id: string; alignment_type: string; status: string; lock_version?: number; exception_approved_by?: string | null }>;

  const run = async (fn: () => Promise<unknown>) => { setBusy(true); setError(null); try { await fn(); await alignQ.refetch(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); } };

  return (
    <StrataPanel title="Project Objective Alignment" testId="obj-alignment">
      {error ? <SectionMessage appearance="error" title="Failed"><p style={{ margin: 0 }}>{error}</p></SectionMessage> : null}
      {canWrite ? (
        <Box xcss={formRowXcss}>
          <Inline space="space.100" alignBlock="end" shouldWrap>
            <LField label="Project objective">
              <Select options={projectObjs.map((e) => ({ value: e.id, label: e.name }))} value={projId ? { value: projId, label: projectObjs.find((e) => e.id === projId)?.name ?? projId } : null}
                onChange={(o) => setProjId((o as { value?: string } | null)?.value ?? null)} usePortal aria-label="Project objective" />
            </LField>
            <LField label="Strategic objective">
              <Select options={strategicObjs.map((e) => ({ value: e.id, label: e.name }))} value={stratId ? { value: stratId, label: strategicObjs.find((e) => e.id === stratId)?.name ?? stratId } : null}
                onChange={(o) => setStratId((o as { value?: string } | null)?.value ?? null)} usePortal aria-label="Strategic objective" />
            </LField>
            <LField label="Type">
              <Select options={[{ value: 'primary', label: 'Primary' }, { value: 'secondary', label: 'Secondary' }]} value={{ value: alignType, label: labelize(alignType) }}
                onChange={(o) => setAlignType(((o as { value?: string } | null)?.value as typeof alignType) ?? 'primary')} usePortal aria-label="Alignment type" />
            </LField>
            {alignType === 'secondary' ? (
              <LField label="Attribution (0-1)">
                <Textfield value={attr} onChange={(e) => setAttr((e.target as HTMLInputElement).value)} type="number" aria-label="Attribution share" />
              </LField>
            ) : null}
            <Button appearance="primary" isDisabled={busy || !projId || !stratId} testId="align-create"
              onClick={() => run(async () => { await kpiApi.createObjectiveAlignment({ projectObjectiveId: projId!, strategicObjectiveId: stratId!, alignmentType: alignType, attributionShare: attr ? Number(attr) : undefined }); setStratId(null); setAttr(''); })}>Create alignment</Button>
          </Inline>
        </Box>
      ) : null}
      {!projId ? <Text color="color.text.subtlest">Select a project objective to see and manage its alignments.</Text>
        : (
          <DynamicTable
            head={{ cells: [
              { key: 'o', content: 'Strategic objective' }, { key: 't', content: 'Type' },
              { key: 's', content: 'Status' }, { key: 'a', content: '' },
            ] }}
            rows={alignments.map((al) => ({
              key: al.id, testId: `align-${al.id}`,
              cells: [
                { key: 'o', content: <Text>{strategicObjs.find((e) => e.id === al.strategic_objective_id)?.name ?? al.strategic_objective_id.slice(0, 8)}</Text> },
                { key: 't', content: <Lozenge appearance={al.alignment_type === 'primary' ? 'inprogress' : 'default'}>{labelize(al.alignment_type)}</Lozenge> },
                { key: 's', content: (
                  <Inline space="space.050" alignBlock="center">
                    <Lozenge appearance={al.status === 'approved' ? 'success' : al.status === 'retired' ? 'moved' : al.status === 'rejected' ? 'removed' : 'default'}>{labelize(al.status)}</Lozenge>
                    {al.exception_approved_by ? <Lozenge appearance="moved">Exception</Lozenge> : null}
                  </Inline>
                ) },
                { key: 'a', content: (
                  <Inline space="space.100">
                    {canWrite && (al.status === 'draft' || al.status === 'rejected') ? (
                      <Button spacing="compact" isDisabled={busy} testId={`align-submit-${al.id}`} onClick={() => run(() => kpiApi.submitObjectiveAlignment(al.id, al.lock_version))}>Submit</Button>
                    ) : null}
                    {canApprove && al.status === 'submitted' ? (
                      <Button spacing="compact" appearance="primary" isDisabled={busy} testId={`align-approve-${al.id}`} onClick={() => run(() => kpiApi.approveObjectiveAlignment(al.id, al.lock_version))}>Approve</Button>
                    ) : null}
                    {canApprove && !al.exception_approved_by ? (
                      <Button spacing="compact" appearance="subtle" isDisabled={busy} testId={`align-exception-${al.id}`} onClick={() => run(() => kpiApi.grantAlignmentException(al.id, 'governed exception'))}>Grant exception</Button>
                    ) : null}
                  </Inline>
                ) },
              ],
            }))}
            emptyView={<Text color="color.text.subtlest">No alignments for this project objective.</Text>}
          />
        )}
    </StrataPanel>
  );
}
