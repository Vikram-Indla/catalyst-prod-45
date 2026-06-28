/**
 * /admin/workflows/versions — Versioned Canonical Workflow admin.
 * Read-only view of ph_wf_* + safe create-draft + entity coverage matrix +
 * filtered audit + enforcement visibility. Canonical ADS components only.
 * Classic builder (/admin/workflows) is untouched and remains primary.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import DynamicTable from '@atlaskit/dynamic-table';
import Lozenge from '@atlaskit/lozenge';
import Button from '@atlaskit/button/new';
import Spinner from '@atlaskit/spinner';
import { AdminGuard } from '@/components/admin/AdminGuard';
import {
  useWfVersions, useWfSchemes, useWfSchemeEntries, useWfSchemeAssignments,
  useWfVersionStatuses, useWfVersionTransitions, useWfAuditFiltered,
  useWfTemplates, useCreateDraftVersion, useMigrationPreview,
  useEnforcementConfig, useReasonCodes,
  useWfVersionRolesAndGuards, useWfHealthSummary,
  type AuditFilterParams,
} from '@/hooks/workflow-v2/useWorkflowFoundation';

type LozAppearance = React.ComponentProps<typeof Lozenge>['appearance'];
const LIFECYCLE_APPEARANCE: Record<string, LozAppearance> = {
  draft: 'default', published: 'success', superseded: 'moved', archived: 'removed',
};
const CATEGORY_APPEARANCE: Record<string, LozAppearance> = {
  todo: 'default', in_progress: 'inprogress', done: 'success',
};

function fmt(ts: string | null | undefined): string {
  return ts ? ts.replace('T', ' ').slice(0, 16) : '—';
}
function Panel({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: '16px 0', width: '100%' }}>{children}</div>;
}
function Empty({ msg }: { msg: string }) {
  return <div style={{ padding: 24, color: 'var(--ds-text-subtlest)', fontSize: 13 }}>{msg}</div>;
}
function Loading() {
  return <div style={{ padding: 24 }}><Spinner size="medium" /></div>;
}
function SelectInput({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; placeholder: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      style={{ height: 30, minWidth: 140, padding: '0 8px', border: '1px solid var(--ds-border)', borderRadius: 4, background: 'var(--ds-surface)', color: 'var(--ds-text)', fontSize: 13 }}>
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ─── Static wiring knowledge (based on code audit 2026-06-29) ───────────────
// Each entry reflects what is ACTUALLY wired in the codebase today.
// Update this as runtime is wired for more entities.
interface WiringKnowledge {
  runtimeReadWired: boolean;
  runtimeReadNote: string;
  runtimeWriteWired: boolean;
  runtimeWriteNote: string;
  reasonModalWired: boolean;
  reasonModalNote: string;
}
const ENTITY_WIRING: Record<string, WiringKnowledge> = {
  story: {
    runtimeReadWired: true, runtimeReadNote: 'CatalystStatusPill + JiraTable cells + BacklogPage',
    runtimeWriteWired: true, runtimeWriteNote: 'useCatalystIssueMutations (detail+pill) + useKanbanMutations (kanban) — gateTransition',
    reasonModalWired: true, reasonModalNote: 'reason modal triggered by requires_reason on transition',
  },
  epic: {
    runtimeReadWired: true, runtimeReadNote: 'CatalystStatusPill + StatusTransitionDropdown (if version published)',
    runtimeWriteWired: false, runtimeWriteNote: 'useCatalystIssueMutations runs for any issue type — wired via entity_key map',
    reasonModalWired: false, reasonModalNote: 'not explicitly wired for Epic',
  },
  feature: {
    runtimeReadWired: true, runtimeReadNote: 'CatalystStatusPill + StatusTransitionDropdown (if version published)',
    runtimeWriteWired: false, runtimeWriteNote: 'useCatalystIssueMutations runs for any issue type — wired via entity_key map',
    reasonModalWired: false, reasonModalNote: 'not explicitly wired for Feature',
  },
  subtask: {
    runtimeReadWired: false, runtimeReadNote: 'no published version seeded — no canonical statuses to resolve',
    runtimeWriteWired: false, runtimeWriteNote: 'no version → gateTransition resolves null → noop',
    reasonModalWired: false, reasonModalNote: 'not wired',
  },
  defect: {
    runtimeReadWired: true, runtimeReadNote: 'defectsDataSource + useCanonicalIssueWorkflow(Defect)',
    runtimeWriteWired: true, runtimeWriteNote: 'useDefects.ts → recordAdvisoryStatusChange (advisory)',
    reasonModalWired: false, reasonModalNote: 'advisory only — reason not surfaced on status change UI',
  },
  incident: {
    runtimeReadWired: false, runtimeReadNote: 'no dedicated read hook wired; CatalystStatusPill if issueType=Incident',
    runtimeWriteWired: true, runtimeWriteNote: 'useIncidents.ts → recordAdvisoryStatusChange (advisory)',
    reasonModalWired: false, reasonModalNote: 'not wired',
  },
  release: {
    runtimeReadWired: true, runtimeReadNote: 'releasesDataSource + useCanonicalIssueWorkflow(Release)',
    runtimeWriteWired: true, runtimeWriteNote: 'releasesDataSource.ts + release-hub.service.ts → recordAdvisoryStatusChange (advisory)',
    reasonModalWired: false, reasonModalNote: 'not wired',
  },
  business_request: {
    runtimeReadWired: true, runtimeReadNote: 'useBusinessRequestsSource (backlogDataSource) + useCanonicalIssueWorkflow(Business Request)',
    runtimeWriteWired: true, runtimeWriteNote: 'backlogDataSource.onUpdate → canonical key → process_step (A-lite) + recordAdvisoryStatusChange',
    reasonModalWired: false, reasonModalNote: 'advisory only — reason not surfaced on status change UI',
  },
  product_milestone: {
    runtimeReadWired: false, runtimeReadNote: 'card/manager display only — no canonical read hook wired',
    runtimeWriteWired: true, runtimeWriteNote: 'productMilestoneService.updateMilestone → status (A-lite) + recordAdvisoryStatusChange',
    reasonModalWired: false, reasonModalNote: 'not wired',
  },
  task: {
    runtimeReadWired: false, runtimeReadNote: 'task_statuses.workflow_status_key added (A_projection) — read hook not yet wired',
    runtimeWriteWired: true, runtimeWriteNote: 'useUpdatePlannerTask → status_id + recordAdvisoryStatusChange (advisory)',
    reasonModalWired: false, reasonModalNote: 'not wired',
  },
  sprint: {
    runtimeReadWired: false, runtimeReadNote: 'no canonical read surface — sprint status shown as raw text',
    runtimeWriteWired: true, runtimeWriteNote: 'useCanonicalSprintUpdate (useEntities.ts) → status (A-lite) + recordAdvisoryStatusChange',
    reasonModalWired: false, reasonModalNote: 'not wired',
  },
};

const ENTITY_LABELS: Record<string, string> = {
  story: 'Story', epic: 'Epic', feature: 'Feature', subtask: 'Sub-task',
  defect: 'Defect', incident: 'Incident', release: 'Release',
  business_request: 'Business Request', product_milestone: 'Product Milestone',
  task: 'Task', sprint: 'Sprint',
};

// Guard evidence status per guard type (static knowledge)
const GUARD_EVIDENCE: Record<string, { sourceExists: boolean; note: string }> = {
  reason_required: { sourceExists: true, note: 'reason text collected in reason modal + stored in ph_wf_audit.reason_text' },
  test_coverage: { sourceExists: true, note: 'real count from tm_test_case_links.linked_item_id — evaluated in gateTransition' },
  assignee_required: { sourceExists: true, note: 'checked against issueRow.assignee_account_id' },
  acceptance_criteria_present: { sourceExists: true, note: 'checked against issueRow.description_text' },
  qa_signoff: { sourceExists: false, note: 'advisory only — no sign-off evidence table exists; passes null (not evaluated)' },
  uat_signoff: { sourceExists: false, note: 'advisory only — no UAT sign-off table exists; passes null (not evaluated)' },
  deployment_evidence: { sourceExists: false, note: 'advisory only — no deployment evidence source wired; passes null' },
  smoke_evidence: { sourceExists: false, note: 'advisory only — no smoke evidence source wired; passes null' },
  approval: { sourceExists: false, note: 'advisory only — no approval workflow table wired; passes null' },
  brd_attached: { sourceExists: false, note: 'advisory only — no BRD attachment source wired; passes null' },
};

// ─── Health / Coverage tab ───────────────────────────────────────────────────
function HealthTab() {
  const { data: healthRows, isLoading } = useWfHealthSummary();
  if (isLoading) return <Loading />;

  const ENTITIES = ['story', 'epic', 'feature', 'subtask', 'defect', 'incident', 'release', 'business_request', 'product_milestone', 'task', 'sprint'];

  const head = { cells: [
    { key: 'entity', content: 'Entity' },
    { key: 'version', content: 'Version' },
    { key: 'scheme', content: 'Scheme entry' },
    { key: 'project', content: 'Project asgmt' },
    { key: 'read', content: 'Runtime read' },
    { key: 'write', content: 'Runtime write' },
    { key: 'reason', content: 'Reason modal' },
    { key: 'audit', content: 'Audit writing' },
    { key: 'blocking', content: 'Blocking enabled' },
  ] };

  const rows = ENTITIES.map((ek) => {
    const h = (healthRows ?? []).find((r) => r.entityKey === ek);
    const wiring = ENTITY_WIRING[ek] ?? { runtimeReadWired: false, runtimeReadNote: 'unknown', runtimeWriteWired: false, runtimeWriteNote: 'unknown', reasonModalWired: false, reasonModalNote: 'unknown' };

    const versionOk = (h?.versionCount ?? 0) > 0;
    const publishedOk = !!h?.publishedVersionId;
    const schemeOk = (h?.schemeEntryCount ?? 0) > 0;
    const assignmentOk = (h?.projectAssignmentCount ?? 0) > 0;
    const auditActive = (h?.recentAuditCount ?? 0) > 0;
    const blockingOn = (h?.blockingConfigCount ?? 0) > 0;

    function tick(ok: boolean | null, note?: string) {
      if (ok == null) return <span title={note} style={{ color: 'var(--ds-text-subtlest)', cursor: note ? 'help' : undefined }}>—</span>;
      return <span title={note} style={{ cursor: note ? 'help' : undefined }}>
        <Lozenge appearance={ok ? 'success' : 'removed'}>{ok ? 'yes' : 'no'}</Lozenge>
      </span>;
    }

    return {
      key: ek,
      cells: [
        { key: 'entity', content: <strong>{ENTITY_LABELS[ek] ?? ek}</strong> },
        { key: 'version', content: versionOk
          ? <Lozenge appearance={publishedOk ? 'success' : 'moved'}>{publishedOk ? 'published' : 'draft only'}</Lozenge>
          : <Lozenge appearance="removed">none</Lozenge> },
        { key: 'scheme', content: tick(schemeOk, schemeOk ? 'Scheme entry exists' : 'No scheme entry — resolver will use default scheme') },
        { key: 'project', content: tick(assignmentOk, assignmentOk ? `${h?.projectAssignmentCount} assignment(s)` : 'No project → scheme assignment') },
        { key: 'read', content: tick(wiring.runtimeReadWired, wiring.runtimeReadNote) },
        { key: 'write', content: tick(wiring.runtimeWriteWired, wiring.runtimeWriteNote) },
        { key: 'reason', content: tick(wiring.reasonModalWired, wiring.reasonModalNote) },
        { key: 'audit', content: tick(auditActive ? true : wiring.runtimeWriteWired ? null : false,
          auditActive ? `${h?.recentAuditCount} event(s) in last 200 rows` : wiring.runtimeWriteWired ? 'write wired but no audit events yet' : 'not wired — no events expected') },
        { key: 'blocking', content: tick(blockingOn, blockingOn ? 'Blocking enforcement config exists' : 'Advisory only — no blocking config') },
      ],
    };
  });

  const honestGaps: string[] = ENTITIES.filter((ek) => {
    const wiring = ENTITY_WIRING[ek];
    const h = (healthRows ?? []).find((r) => r.entityKey === ek);
    return !wiring.runtimeWriteWired || !(h?.publishedVersionId);
  }).map((ek) => ENTITY_LABELS[ek] ?? ek);

  return (
    <Panel>
      <p style={{ fontSize: 12, color: 'var(--ds-text-subtlest)', margin: '0 0 8px' }}>
        Hover over a cell for detail. "Runtime read" = canonical options resolved from ph_wf_*. "Runtime write" = audit event written on status change.
        Guard evidence column not shown here — see Transitions tab for per-guard evidence status.
      </p>
      {honestGaps.length > 0 && (
        <div style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--ds-background-warning)', borderRadius: 4, fontSize: 12, color: 'var(--ds-text)' }}>
          <strong>Honest gaps</strong> — runtime write NOT wired or no published version:{' '}
          {honestGaps.join(', ')}. Do not claim these as complete.
        </div>
      )}
      <DynamicTable head={head} rows={rows} isFixedSize />

      <div style={{ marginTop: 24, borderTop: '1px solid var(--ds-border)', paddingTop: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text)', margin: '0 0 8px' }}>Guard evidence status</p>
        <p style={{ fontSize: 12, color: 'var(--ds-text-subtlest)', margin: '0 0 8px' }}>
          Guards with no evidence source will never pass. They are marked advisory/missing.
        </p>
        {Object.entries(GUARD_EVIDENCE).map(([guardType, ev]) => (
          <div key={guardType} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 8, fontSize: 12 }}>
            <Lozenge appearance={ev.sourceExists ? 'success' : 'moved'}>
              {ev.sourceExists ? 'evidence exists' : 'advisory / missing source'}
            </Lozenge>
            <span style={{ color: 'var(--ds-text)', fontFamily: 'monospace' }}>{guardType}</span>
            <span style={{ color: 'var(--ds-text-subtle)' }}>{ev.note}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ─── Versions tab ────────────────────────────────────────────────────────────
function VersionsTab({ onSelectVersion }: { onSelectVersion: (id: string) => void }) {
  const { data: versions, isLoading } = useWfVersions();
  const { data: templates = [] } = useWfTemplates();
  const createDraft = useCreateDraftVersion();
  const [templateId, setTemplateId] = useState('');
  const selectedTemplate = templates.find((t: any) => t.id === templateId);
  if (isLoading) return <Loading />;
  const head = { cells: [
    { key: 'entity', content: 'Entity / Template' }, { key: 'no', content: 'Version' },
    { key: 'lifecycle', content: 'Lifecycle' }, { key: 'published', content: 'Published' },
    { key: 'created', content: 'Created' }, { key: 'open', content: '' },
  ] };
  const rows = (versions ?? []).map((v) => ({ key: v.id, cells: [
    { key: 'entity', content: `${v.entity_key}${v.template_name ? ` · ${v.template_name}` : ''}` },
    { key: 'no', content: `v${v.version_no}` },
    { key: 'lifecycle', content: <Lozenge appearance={LIFECYCLE_APPEARANCE[v.lifecycle] ?? 'default'}>{v.lifecycle}</Lozenge> },
    { key: 'published', content: fmt(v.published_at) },
    { key: 'created', content: fmt(v.created_at) },
    { key: 'open', content: <Button appearance="subtle" spacing="compact" onClick={() => onSelectVersion(v.id)}>View statuses</Button> },
  ] }));
  return (
    <Panel>
      <div style={{ padding: '8px 12px', background: 'var(--ds-background-information)', borderRadius: 4, fontSize: 12, color: 'var(--ds-text)', marginBottom: 16 }}>
        <strong>Published versions are immutable.</strong> To edit, clone a published version as a new draft. Draft versions can be edited directly.
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 12, color: 'var(--ds-text-subtle)' }}>New draft from template<br />
          <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}
            style={{ marginTop: 4, height: 32, minWidth: 280, padding: '0 8px', border: '1px solid var(--ds-border)', borderRadius: 4, background: 'var(--ds-surface)', color: 'var(--ds-text)', fontSize: 13 }}>
            <option value="">Select a template…</option>
            {templates.map((t: any) => <option key={t.id} value={t.id}>{t.work_item_type} · {t.name}</option>)}
          </select>
        </label>
        <Button appearance="primary" isDisabled={!selectedTemplate || createDraft.isPending} isLoading={createDraft.isPending}
          onClick={() => selectedTemplate && createDraft.mutate({ templateId: selectedTemplate.id, entityKey: String(selectedTemplate.work_item_type ?? '').toLowerCase() })}>
          Create draft
        </Button>
      </div>
      {rows.length === 0 ? <Empty msg="No workflow versions yet. Create a draft from a template to begin." />
        : <DynamicTable head={head} rows={rows} isFixedSize rowsPerPage={15} defaultPage={1} />}
    </Panel>
  );
}

// ─── Schemes tab ─────────────────────────────────────────────────────────────
function SchemesTab() {
  const { data: schemes, isLoading } = useWfSchemes();
  const { data: entries = [] } = useWfSchemeEntries();
  if (isLoading) return <Loading />;
  const head = { cells: [
    { key: 'name', content: 'Scheme' }, { key: 'default', content: 'Default' },
    { key: 'entries', content: 'Entity → version entries' }, { key: 'created', content: 'Created' },
  ] };
  const rows = (schemes ?? []).map((s) => ({ key: s.id, cells: [
    { key: 'name', content: s.name },
    { key: 'default', content: s.is_default ? <Lozenge appearance="success">default</Lozenge> : '—' },
    { key: 'entries', content: String(entries.filter((e) => e.scheme_id === s.id).length) },
    { key: 'created', content: fmt(s.created_at) },
  ] }));
  return <Panel>{rows.length === 0 ? <Empty msg="No workflow schemes yet." /> : <DynamicTable head={head} rows={rows} isFixedSize rowsPerPage={15} defaultPage={1} />}</Panel>;
}

// ─── Assignments tab ──────────────────────────────────────────────────────────
function AssignmentsTab() {
  const { data: assignments, isLoading } = useWfSchemeAssignments();
  if (isLoading) return <Loading />;
  const head = { cells: [
    { key: 'project', content: 'Project' }, { key: 'scheme', content: 'Scheme' }, { key: 'assigned', content: 'Assigned' },
  ] };
  const rows = (assignments ?? []).map((a) => ({ key: a.id, cells: [
    { key: 'project', content: a.project_id },
    { key: 'scheme', content: a.scheme_name ?? '—' },
    { key: 'assigned', content: fmt(a.assigned_at) },
  ] }));
  return <Panel>{rows.length === 0 ? <Empty msg="No project → scheme assignments yet." /> : <DynamicTable head={head} rows={rows} isFixedSize rowsPerPage={15} defaultPage={1} />}</Panel>;
}

// ─── Statuses tab ─────────────────────────────────────────────────────────────
function StatusesList({ versionId }: { versionId: string }) {
  const { data, isLoading } = useWfVersionStatuses(versionId);
  if (isLoading) return <Loading />;
  if (!data || data.length === 0) return <Empty msg="This version has no statuses." />;
  const head = { cells: [
    { key: 'label', content: 'Status' }, { key: 'key', content: 'Key' },
    { key: 'cat', content: 'Category' }, { key: 'color', content: 'Color token' }, { key: 'flags', content: 'Flags' },
  ] };
  const rows = data.map((s) => ({ key: s.id, cells: [
    { key: 'label', content: s.display_label },
    { key: 'key', content: <code style={{ fontSize: 12 }}>{s.status_key}</code> },
    { key: 'cat', content: <Lozenge appearance={CATEGORY_APPEARANCE[s.category] ?? 'default'}>{s.category}</Lozenge> },
    { key: 'color', content: <code style={{ fontSize: 11, color: 'var(--ds-text-subtle)' }}>{s.color_token}</code> },
    { key: 'flags', content: [s.is_initial && 'initial', s.is_terminal && 'terminal', s.is_exception && 'exception', s.supports_reopen && 'reopen', s.requires_reason && 'requires_reason'].filter(Boolean).join(', ') || '—' },
  ] }));
  return <DynamicTable head={head} rows={rows} isFixedSize rowsPerPage={25} defaultPage={1} />;
}

// ─── Transitions tab — with roles + guards ────────────────────────────────────
function TransitionsList({ versionId }: { versionId: string }) {
  const { data: transitions, isLoading: tLoading } = useWfVersionTransitions(versionId);
  const { data: rolesGuards, isLoading: rgLoading } = useWfVersionRolesAndGuards(versionId);
  if (tLoading || rgLoading) return <Loading />;
  if (!transitions || transitions.length === 0) return <Empty msg="This version has no transitions." />;

  const rolesByT: Record<string, string[]> = {};
  const guardsByT: Record<string, { guard_type: string; is_blocking: boolean; waiver_allowed: boolean }[]> = {};
  (rolesGuards?.roles ?? []).forEach((r) => { (rolesByT[r.transition_id] ??= []).push(r.role_group); });
  (rolesGuards?.guards ?? []).forEach((g) => { (guardsByT[g.transition_id] ??= []).push(g); });

  const head = { cells: [
    { key: 'from', content: 'From' }, { key: 'to', content: 'To' },
    { key: 'type', content: 'Type' }, { key: 'roles', content: 'Allowed roles' },
    { key: 'guards', content: 'Guards' }, { key: 'flags', content: 'Flags' },
  ] };
  const rows = transitions.map((t) => {
    const roles = rolesByT[t.id] ?? [];
    const guards = guardsByT[t.id] ?? [];
    const guardDisplay = guards.map((g) => {
      const ev = GUARD_EVIDENCE[g.guard_type];
      return (
        <span key={g.guard_type} title={ev?.note ?? ''} style={{ display: 'inline-block', marginRight: 4, marginBottom: 4 }}>
          <Lozenge appearance={ev?.sourceExists ? (g.is_blocking ? 'removed' : 'moved') : 'default'}>
            {g.guard_type}{g.is_blocking ? ' ⛔' : ''}{!ev?.sourceExists ? ' (advisory)' : ''}
          </Lozenge>
        </span>
      );
    });
    return { key: t.id, cells: [
      { key: 'from', content: t.from_status_key ? <code style={{ fontSize: 12 }}>{t.from_status_key}</code> : <span style={{ color: 'var(--ds-text-subtlest)' }}>(any)</span> },
      { key: 'to', content: <code style={{ fontSize: 12 }}>{t.to_status_key}</code> },
      { key: 'type', content: <Lozenge appearance="default">{t.transition_type}</Lozenge> },
      { key: 'roles', content: roles.length > 0
        ? roles.map((r) => <span key={r} style={{ display: 'inline-block', marginRight: 4 }}><Lozenge appearance="inprogress">{r}</Lozenge></span>)
        : <span style={{ color: 'var(--ds-text-subtlest)', fontSize: 12 }}>any role</span> },
      { key: 'guards', content: guards.length > 0 ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>{guardDisplay}</div> : '—' },
      { key: 'flags', content: [t.requires_reason && 'reason', t.requires_comment && 'comment'].filter(Boolean).join(', ') || '—' },
    ] };
  });
  return <DynamicTable head={head} rows={rows} isFixedSize rowsPerPage={25} defaultPage={1} />;
}

function VersionScopedTab({ versionId, versions, onSelect, kind }: {
  versionId: string | null; versions: { id: string; label: string }[];
  onSelect: (id: string) => void; kind: 'statuses' | 'transitions';
}) {
  return (
    <Panel>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: 'var(--ds-text-subtle)' }}>Version:&nbsp;
          <select value={versionId ?? ''} onChange={(e) => onSelect(e.target.value)}
            style={{ height: 30, minWidth: 260, padding: '0 8px', border: '1px solid var(--ds-border)', borderRadius: 4, background: 'var(--ds-surface)', color: 'var(--ds-text)', fontSize: 13 }}>
            <option value="">Select a version…</option>
            {versions.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
        </label>
      </div>
      {!versionId ? <Empty msg="Select a version to view its statuses and transitions." />
        : kind === 'statuses' ? <StatusesList versionId={versionId} /> : <TransitionsList versionId={versionId} />}
    </Panel>
  );
}

// ─── Migration preview tab ────────────────────────────────────────────────────
const PREVIEW_ENTITIES = ['story', 'epic', 'feature', 'subtask', 'defect', 'incident', 'release', 'business_request', 'product_milestone', 'task', 'sprint'] as const;
function MigrationPreviewTab() {
  const [entity, setEntity] = useState<string>('story');
  const { data, isLoading } = useMigrationPreview(entity);
  if (isLoading) return <Loading />;
  const rows = data ?? [];
  const mappedItems = rows.filter((r) => r.mapped).reduce((a, r) => a + Number(r.item_count), 0);
  const unmappedRows = rows.filter((r) => !r.mapped);
  const unmappedItems = unmappedRows.reduce((a, r) => a + Number(r.item_count), 0);
  const canProceed = unmappedRows.length === 0;
  const head = { cells: [
    { key: 'legacy', content: 'Legacy status (ph_issues)' },
    { key: 'proposed', content: 'Proposed canonical' },
    { key: 'count', content: 'Items' },
    { key: 'flag', content: 'Status' },
  ] };
  const tableRows = rows.map((r, i) => ({ key: `${r.legacy_status}-${i}`, cells: [
    { key: 'legacy', content: r.legacy_status },
    { key: 'proposed', content: r.proposed_key ?? '—' },
    { key: 'count', content: String(r.item_count) },
    { key: 'flag', content: r.mapped
      ? <Lozenge appearance="success">mapped</Lozenge>
      : <Lozenge appearance="removed">unmapped — needs review</Lozenge> },
  ] }));
  return (
    <Panel>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: 'var(--ds-text-subtle)' }}>Entity:&nbsp;
          <select value={entity} onChange={(e) => setEntity(e.target.value)}
            style={{ height: 30, minWidth: 160, padding: '0 8px', border: '1px solid var(--ds-border)', borderRadius: 4, background: 'var(--ds-surface)', color: 'var(--ds-text)', fontSize: 13 }}>
            {PREVIEW_ENTITIES.map((en) => <option key={en} value={en}>{en}</option>)}
          </select>
        </label>
      </div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 13, color: 'var(--ds-text-subtle)', flexWrap: 'wrap' }}>
        <span>Entity: <strong style={{ color: 'var(--ds-text)' }}>{entity}</strong></span>
        <span>Mapped: <strong style={{ color: 'var(--ds-text)' }}>{mappedItems}</strong></span>
        <span>Unmapped items: <strong style={{ color: 'var(--ds-text)' }}>{unmappedItems}</strong> across {unmappedRows.length} status{unmappedRows.length === 1 ? '' : 'es'}</span>
        <span>{canProceed ? <Lozenge appearance="success">can proceed</Lozenge> : <Lozenge appearance="moved">cannot proceed — resolve unmapped first</Lozenge>}</span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--ds-text-subtlest)', margin: '0 0 12px' }}>Activation is non-destructive. Unmapped statuses are never auto-moved — flagged here for explicit review.</p>
      {rows.length === 0 ? <Empty msg="No items found to preview for this entity." /> : <DynamicTable head={head} rows={tableRows} isFixedSize rowsPerPage={25} defaultPage={1} />}
    </Panel>
  );
}

// ─── Reason codes tab ────────────────────────────────────────────────────────
function ReasonCodesTab() {
  const { data, isLoading } = useReasonCodes();
  if (isLoading) return <Loading />;
  const rows = data ?? [];
  const head = { cells: [
    { key: 'code', content: 'Code' }, { key: 'label', content: 'Label' }, { key: 'type', content: 'Transition type' },
    { key: 'ft', content: 'Free text' }, { key: 'scope', content: 'Scope' }, { key: 'active', content: 'Active' },
  ] };
  const tableRows = rows.map((r) => ({ key: r.id, cells: [
    { key: 'code', content: <code style={{ fontSize: 12 }}>{r.code}</code> },
    { key: 'label', content: r.label },
    { key: 'type', content: r.transition_type ?? '(any)' },
    { key: 'ft', content: r.requires_free_text ? 'required' : '—' },
    { key: 'scope', content: r.version_id ? 'version' : 'global' },
    { key: 'active', content: r.is_active ? <Lozenge appearance="success">active</Lozenge> : <Lozenge appearance="default">inactive</Lozenge> },
  ] }));
  return (
    <Panel>
      <p style={{ fontSize: 12, color: 'var(--ds-text-subtlest)', margin: '0 0 12px' }}>
        Reason codes surfaced in the reason-capture modal for transitions requiring a reason. Global (version_id null) apply to all versions.
      </p>
      {rows.length === 0 ? <Empty msg="No reason codes seeded." /> : <DynamicTable head={head} rows={tableRows} isFixedSize rowsPerPage={20} defaultPage={1} />}
    </Panel>
  );
}

// ─── Enforcement tab ──────────────────────────────────────────────────────────
function EnforcementTab() {
  const { data, isLoading } = useEnforcementConfig();
  if (isLoading) return <Loading />;
  const rows = data ?? [];
  const head = { cells: [
    { key: 'project', content: 'Project' }, { key: 'entity', content: 'Entity' },
    { key: 'version', content: 'Version' }, { key: 'mode', content: 'Mode' },
    { key: 'reason', content: 'Reason' }, { key: 'enabled', content: 'Enabled' },
  ] };
  const tableRows = rows.map((r, i) => ({ key: `${r.project_key}-${r.entity_key}-${i}`, cells: [
    { key: 'project', content: r.project_key ?? '—' },
    { key: 'entity', content: r.entity_key },
    { key: 'version', content: r.version_no != null ? `v${r.version_no}` : '—' },
    { key: 'mode', content: r.mode === 'blocking' ? <Lozenge appearance="removed">blocking</Lozenge> : <Lozenge appearance="default">advisory</Lozenge> },
    { key: 'reason', content: r.reason ?? '—' },
    { key: 'enabled', content: fmt(r.enabled_at) },
  ] }));
  return (
    <Panel>
      <p style={{ fontSize: 12, color: 'var(--ds-text-subtlest)', margin: '0 0 12px' }}>
        Enforcement is scoped per (project, entity). Any pair NOT listed as <strong>blocking</strong> stays <strong>advisory</strong>.
        Rollback: set mode to <code>advisory</code> or delete the row in <code>ph_wf_enforcement_config</code>.
      </p>
      {rows.length === 0
        ? <Empty msg="No blocking enforcement configured — all entities advisory." />
        : <DynamicTable head={head} rows={tableRows} isFixedSize rowsPerPage={15} defaultPage={1} />}
    </Panel>
  );
}

// ─── Audit tab — with filters ─────────────────────────────────────────────────
const ENTITY_OPTIONS = [
  { value: 'story', label: 'Story' }, { value: 'epic', label: 'Epic' }, { value: 'feature', label: 'Feature' },
  { value: 'subtask', label: 'Sub-task' }, { value: 'defect', label: 'Defect' }, { value: 'incident', label: 'Incident' },
  { value: 'release', label: 'Release' }, { value: 'business_request', label: 'Business Request' },
  { value: 'product_milestone', label: 'Product Milestone' },
];
const SURFACE_OPTIONS = [
  { value: 'catalyst_status_pill', label: 'Status pill' }, { value: 'kanban_drag', label: 'Kanban drag' },
  { value: 'backlog_status_cell', label: 'Backlog cell' }, { value: 'jira_list_status_cell', label: 'Jira list cell' },
  { value: 'defect_status_change', label: 'Defect change' }, { value: 'incident_status_change', label: 'Incident change' },
  { value: 'release_status_change', label: 'Release change' },
];
const MODE_OPTIONS = [{ value: 'advisory', label: 'Advisory' }, { value: 'blocking', label: 'Blocking' }];
const DECISION_OPTIONS = [
  { value: 'allow', label: 'Allow' }, { value: 'deny', label: 'Deny' },
  { value: 'bypass', label: 'Bypass' }, { value: 'waiver', label: 'Waiver' },
];
const WOULD_BLOCK_OPTIONS = [{ value: 'true', label: 'Would block = yes' }, { value: 'false', label: 'Would block = no' }];

function AuditTab() {
  const [entity, setEntity] = useState('');
  const [surface, setSurface] = useState('');
  const [mode, setMode] = useState('');
  const [decision, setDecision] = useState('');
  const [wouldBlock, setWouldBlock] = useState('');

  const filters: AuditFilterParams = {
    entityKey: entity || undefined,
    sourceSurface: surface || undefined,
    mode: mode || undefined,
    roleDecision: decision || undefined,
    wouldBlock: wouldBlock === '' ? undefined : wouldBlock === 'true',
    limit: 100,
  };

  const { data, isLoading } = useWfAuditFiltered(filters);

  const head = { cells: [
    { key: 'at', content: 'When' }, { key: 'entity', content: 'Entity' },
    { key: 'move', content: 'From → To' }, { key: 'surface', content: 'Surface' },
    { key: 'decision', content: 'Role decision' }, { key: 'would_block', content: 'Would block' },
    { key: 'mode', content: 'Mode' }, { key: 'reason', content: 'Reason' },
  ] };

  const rows = (data ?? []).map((a) => ({ key: a.id, cells: [
    { key: 'at', content: fmt(a.at) },
    { key: 'entity', content: <Lozenge appearance="default">{a.entity_key}</Lozenge> },
    { key: 'move', content: <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{a.from_status_key ?? '—'} → {a.to_status_key}</span> },
    { key: 'surface', content: <code style={{ fontSize: 11, color: 'var(--ds-text-subtle)' }}>{(a as any).source_surface ?? '—'}</code> },
    { key: 'decision', content: <Lozenge appearance={(a as any).role_decision === 'allow' || (a as any).role_decision === 'bypass' ? 'success' : 'removed'}>{(a as any).role_decision ?? '—'}</Lozenge> },
    { key: 'would_block', content: (a as any).would_block ? <Lozenge appearance="removed">yes</Lozenge> : <Lozenge appearance="success">no</Lozenge> },
    { key: 'mode', content: (a as any).mode ?? '—' },
    { key: 'reason', content: (a as any).reason_text ?? (a as any).reason_code ?? '—' },
  ] }));

  return (
    <Panel>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--ds-text-subtle)' }}>Filter:</span>
        <SelectInput value={entity} onChange={setEntity} options={ENTITY_OPTIONS} placeholder="All entities" />
        <SelectInput value={surface} onChange={setSurface} options={SURFACE_OPTIONS} placeholder="All surfaces" />
        <SelectInput value={mode} onChange={setMode} options={MODE_OPTIONS} placeholder="All modes" />
        <SelectInput value={decision} onChange={setDecision} options={DECISION_OPTIONS} placeholder="All decisions" />
        <SelectInput value={wouldBlock} onChange={setWouldBlock} options={WOULD_BLOCK_OPTIONS} placeholder="Would block: any" />
        {(entity || surface || mode || decision || wouldBlock) && (
          <Button appearance="subtle" spacing="compact"
            onClick={() => { setEntity(''); setSurface(''); setMode(''); setDecision(''); setWouldBlock(''); }}>
            Clear
          </Button>
        )}
      </div>
      {isLoading ? <Loading />
        : rows.length === 0 ? <Empty msg="No audit events match these filters." />
        : <DynamicTable head={head} rows={rows} isFixedSize rowsPerPage={20} defaultPage={1} />}
    </Panel>
  );
}

// ─── Page root ────────────────────────────────────────────────────────────────
export default function WorkflowVersioningPage() {
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const { data: versions = [] } = useWfVersions();
  const versionOptions = versions.map((v) => ({ id: v.id, label: `${v.entity_key} v${v.version_no} (${v.lifecycle})` }));
  return (
    <AdminGuard>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--ds-surface)' }}>
        <div style={{ padding: '24px 24px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 653, color: 'var(--ds-text)', lineHeight: '28px', fontFamily: "'Atlassian Sans', var(--ds-font-family-body)" }}>
                Versioned workflow engine
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--ds-text-subtle)' }}>
                Canonical ph_wf_* — versions, schemes, assignments, statuses, transitions, enforcement, audit.
              </p>
            </div>
            <Link to="/admin/workflows" style={{ flexShrink: 0 }}>
              <Button appearance="subtle">← Classic builder</Button>
            </Link>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px 24px' }}>
          <Tabs id="wf-versioning-tabs">
            <TabList>
              <Tab>Health</Tab>
              <Tab>Versions</Tab><Tab>Schemes</Tab><Tab>Assignments</Tab>
              <Tab>Statuses</Tab><Tab>Transitions</Tab>
              <Tab>Migration preview</Tab>
              <Tab>Enforcement</Tab><Tab>Reason codes</Tab><Tab>Audit</Tab>
            </TabList>
            <TabPanel><HealthTab /></TabPanel>
            <TabPanel><VersionsTab onSelectVersion={setSelectedVersion} /></TabPanel>
            <TabPanel><SchemesTab /></TabPanel>
            <TabPanel><AssignmentsTab /></TabPanel>
            <TabPanel><VersionScopedTab kind="statuses" versionId={selectedVersion} versions={versionOptions} onSelect={setSelectedVersion} /></TabPanel>
            <TabPanel><VersionScopedTab kind="transitions" versionId={selectedVersion} versions={versionOptions} onSelect={setSelectedVersion} /></TabPanel>
            <TabPanel><MigrationPreviewTab /></TabPanel>
            <TabPanel><EnforcementTab /></TabPanel>
            <TabPanel><ReasonCodesTab /></TabPanel>
            <TabPanel><AuditTab /></TabPanel>
          </Tabs>
        </div>
      </div>
    </AdminGuard>
  );
}
