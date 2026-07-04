/**
 * /admin/test-ops — Testing Workflow Control Center.
 *
 * Read-only, enterprise admin surface for the canonical test workflow:
 *  A. Coverage Gate Overview      — real tm_test_case_links counts, no fake pass
 *  B. Failed-Test → Defect status — current implementation + canonical initial
 *  C. Defect Workflow Summary     — published Defect v1 statuses/transitions
 *  D. Test Execution Guard Summary— honest guard sourcing (advisory where no data)
 *
 * Canonical ADS components + tokens only. Mirrors WorkflowVersioningPage style.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import DynamicTable from '@atlaskit/dynamic-table';
import Lozenge from '@atlaskit/lozenge';
import SectionMessage from '@atlaskit/section-message';
import Spinner from '@atlaskit/spinner';
import Select from '@atlaskit/select';
import Button from '@atlaskit/button/new';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { supabase } from '@/integrations/supabase/client';
import {
  useWfVersions, useWfVersionStatuses, useWfVersionTransitions, useMigrationPreview,
} from '@/hooks/workflow-v2/useWorkflowFoundation';
import { DOMAIN_ADAPTER_CONFIGS } from '@/lib/workflow/canonical/adapters';
import { useProjects } from '@/hooks/test-management/useProjects';
import {
  useTmRoles, useTmUserRoles, useAssignTmUserRole, useRemoveTmUserRole,
} from '@/hooks/test-management/useTmUserRoles';

type LozAppearance = React.ComponentProps<typeof Lozenge>['appearance'];
const CATEGORY_APPEARANCE: Record<string, LozAppearance> = { todo: 'default', in_progress: 'inprogress', done: 'success' };

function Panel({ children }: { children: React.ReactNode }) { return <div style={{ padding: '16px 0', width: '100%' }}>{children}</div>; }
function Loading() { return <div style={{ padding: 24 }}><Spinner size="medium" /></div>; }
function H({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-text)', margin: '0 0 8px' }}>{children}</h3>;
}
function Note({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 12, color: 'var(--ds-text-subtle)', margin: '4px 0 16px', maxWidth: 760, lineHeight: 1.5 }}>{children}</p>;
}

// ── A. Coverage Gate ────────────────────────────────────────────────────────
// Real counts from tm_test_case_links (the same source the test_coverage guard
// evaluates). "Covered" = item id appears as a linked_item_id for its type.
function useCoverageStats() {
  return useQuery({
    queryKey: ['testops-coverage-stats'],
    staleTime: 30_000,
    queryFn: async () => {
      const out: Record<string, { total: number; covered: number }> = {
        story: { total: 0, covered: 0 }, feature: { total: 0, covered: 0 },
      };
      for (const t of ['story', 'feature'] as const) {
        const { count: total } = await supabase
          .from('ph_issues').select('id', { count: 'exact', head: true })
          .ilike('issue_type', t).is('deleted_at', null);
        out[t].total = total ?? 0;
        const { data: links } = await supabase
          .from('tm_test_case_links').select('linked_item_id').eq('linked_item_type', t);
        out[t].covered = new Set((links ?? []).map((l: any) => l.linked_item_id)).size;
      }
      return out;
    },
  });
}

function CoverageTab() {
  const { data, isLoading } = useCoverageStats();
  if (isLoading) return <Loading />;
  const head = { cells: [
    { key: 'e', content: 'Entity' }, { key: 't', content: 'Total' },
    { key: 'c', content: 'With linked test cases' }, { key: 'm', content: 'Missing coverage' },
    { key: 'g', content: 'Guard' } ] };
  const rows = (['story', 'feature'] as const).map((t) => {
    const s = data?.[t] ?? { total: 0, covered: 0 };
    const missing = Math.max(0, s.total - s.covered);
    return { key: t, cells: [
      { key: 'e', content: <span style={{ textTransform: 'capitalize' }}>{t}</span> },
      { key: 't', content: s.total },
      { key: 'c', content: <Lozenge appearance={s.covered > 0 ? 'success' : 'default'}>{s.covered}</Lozenge> },
      { key: 'm', content: <Lozenge appearance={missing > 0 ? 'moved' : 'success'}>{missing}</Lozenge> },
      { key: 'g', content: <Lozenge appearance="inprogress">test_coverage</Lozenge> } ] };
  });
  return (
    <Panel>
      <H>Coverage Gate Overview</H>
      <Note>
        The <code>test_coverage</code> guard counts rows in <code>tm_test_case_links</code>
        {' '}for each Story / Feature (matched by <code>linked_item_type</code> + <code>linked_item_id</code>).
        It passes only when ≥1 test case is linked, fails honestly at 0, and stays advisory when no
        coverage data exists for an item. It never fakes a pass. Enforcement (advisory vs blocking) is
        configured per project/entity under{' '}
        <Link to="/admin/workflows/versions" style={{ color: 'var(--ds-text-brand)' }}>Workflows → Enforcement</Link>.
      </Note>
      <DynamicTable head={head} rows={rows} isFixedSize />
    </Panel>
  );
}

// ── B. Failed-Test → Defect ─────────────────────────────────────────────────
function FailedTestDefectTab() {
  const compat = DOMAIN_ADAPTER_CONFIGS.defect.enumCompatMap ?? {};
  const rows = [
    ['Failed test can create / link a Defect', 'Active', 'success', 'TestHub cycle run → "Log defect" creates a tm_defects row.'],
    ['Created Defect uses canonical Defect workflow', 'Active', 'success', 'useCreateDefect seeds workflow_status_key.'],
    ['Initial canonical Defect status', 'new', 'inprogress', 'workflow_status_key = "new" on creation.'],
    ['Enum compatibility value', compat['new'] ?? 'open', 'default', 'tm_defects.status enum (compat only, never widened).'],
    ['Links to source test run / test case', 'Active', 'success', 'source_test_run_id + source_test_case_id + tm_defect_links.'],
    ['Auto-create vs manual prompt', 'Manual (prompt)', 'moved', 'Created via explicit "Log defect" action; auto-create is a future opt-in.'],
  ];
  const head = { cells: [
    { key: 'k', content: 'Capability' }, { key: 'v', content: 'Status' }, { key: 'd', content: 'Detail' } ] };
  return (
    <Panel>
      <H>Failed Test → Defect</H>
      <Note>
        Defects raised from a failed test run start on the canonical Defect workflow track while the
        legacy enum stays as a safe compatibility value. Story/Feature linkage is polymorphic / text in
        the current schema and is preserved as-is (a dedicated FK is flagged as a future migration, not invented).
      </Note>
      <DynamicTable head={head} rows={rows.map((r, i) => ({ key: String(i), cells: [
        { key: 'k', content: r[0] },
        { key: 'v', content: <Lozenge appearance={r[2] as LozAppearance}>{r[1]}</Lozenge> },
        { key: 'd', content: <span style={{ color: 'var(--ds-text-subtle)', fontSize: 12 }}>{r[3]}</span> } ] }))} />
    </Panel>
  );
}

// ── C. Defect Workflow Summary ──────────────────────────────────────────────
function DefectWorkflowTab() {
  const { data: versions } = useWfVersions();
  const ver = (versions ?? []).find((v: any) => v.entity_key === 'defect' && v.lifecycle === 'published');
  const { data: statuses } = useWfVersionStatuses(ver?.id ?? null);
  const { data: transitions } = useWfVersionTransitions(ver?.id ?? null);
  const { data: preview } = useMigrationPreview('defect');
  if (!ver) return <Panel><Loading /></Panel>;
  const reasonReq = (transitions ?? []).filter((t: any) => t.requires_reason);
  const stHead = { cells: [
    { key: 'l', content: 'Status' }, { key: 'k', content: 'Key' }, { key: 'c', content: 'Category' } ] };
  const stRows = (statuses ?? []).map((s: any) => ({ key: s.id, cells: [
    { key: 'l', content: s.display_label }, { key: 'k', content: <code>{s.status_key}</code> },
    { key: 'c', content: <Lozenge appearance={CATEGORY_APPEARANCE[s.category] ?? 'default'}>{s.category}</Lozenge> } ] }));
  return (
    <Panel>
      <H>Defect Workflow — v{ver.version_no} (published)</H>
      <Note>
        {(statuses ?? []).length} canonical statuses · {(transitions ?? []).length} transitions ·
        {' '}{reasonReq.length} reason-required transitions. Bridged Option A: <code>workflow_status_key</code>
        {' '}is the source of truth; the <code>tm_defect_status</code> enum is a preserved compatibility field
        (never widened). Remap preview below shows how existing enum values fold onto canonical keys.
      </Note>
      <DynamicTable head={stHead} rows={stRows} isFixedSize />
      <div style={{ marginTop: 16 }}>
        <H>Remap preview (existing defects → canonical)</H>
        <DynamicTable
          head={{ cells: [{ key: 'o', content: 'Enum status' }, { key: 'n', content: 'Canonical key' }, { key: 'c', content: 'Count' }, { key: 'm', content: 'Mapped' }] }}
          rows={(preview ?? []).map((p: any, i: number) => ({ key: String(i), cells: [
            { key: 'o', content: <code>{p.legacy_status}</code> },
            { key: 'n', content: <code>{p.proposed_key ?? '—'}</code> },
            { key: 'c', content: p.item_count },
            { key: 'm', content: <Lozenge appearance={p.mapped ? 'success' : 'removed'}>{p.mapped ? 'mapped' : 'unmapped'}</Lozenge> } ] }))}
        />
      </div>
    </Panel>
  );
}

// ── D. Guard Summary ────────────────────────────────────────────────────────
function GuardSummaryTab() {
  const guards = [
    ['test_coverage', 'Real', 'success', 'Counts linked test cases in tm_test_case_links. Pass ≥1, fail at 0, advisory if no data.'],
    ['qa_signoff', 'Advisory', 'moved', 'No real QA sign-off evidence source yet — logs missing evidence, never fakes pass.'],
    ['uat_signoff', 'Advisory', 'moved', 'No real UAT sign-off evidence source yet — logs missing evidence, never fakes pass.'],
    ['test run pass requirement', 'Future', 'default', 'Activates when test-run→story/feature pass linkage is sufficient.'],
  ];
  return (
    <Panel>
      <H>Test Execution Guard Summary</H>
      <SectionMessage appearance="information">
        <p style={{ fontSize: 13, margin: 0 }}>
          Guards only enforce when a real evaluator + data source exist. Everything else is advisory and
          logs missing evidence to the workflow audit. No QA / UAT / test-execution guard ever fakes a pass.
        </p>
      </SectionMessage>
      <div style={{ marginTop: 12 }}>
        <DynamicTable
          head={{ cells: [{ key: 'g', content: 'Guard' }, { key: 's', content: 'Mode' }, { key: 'd', content: 'Evidence source' }] }}
          rows={guards.map((g, i) => ({ key: String(i), cells: [
            { key: 'g', content: <code>{g[0]}</code> },
            { key: 's', content: <Lozenge appearance={g[2] as LozAppearance}>{g[1]}</Lozenge> },
            { key: 'd', content: <span style={{ color: 'var(--ds-text-subtle)', fontSize: 12 }}>{g[3]}</span> } ] }))}
        />
      </div>
    </Panel>
  );
}

// ── E. Team & roles ─────────────────────────────────────────────────────────
// P2-S19: tm_user_roles had zero live consumers (0 rows on staging) while the
// RLS layer that reads it falls back permissively when no rows exist for a
// project — this tab is the first real assignment surface, and
// tm_approve_release_readiness (fixed in this same slice) is the first
// consumer path that actually checks it.
function useApprovedProfiles() {
  return useQuery({
    queryKey: ['approved-profiles-for-role-assign'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles').select('id, full_name, email')
        .eq('approval_status', 'APPROVED').order('full_name');
      if (error) throw error;
      return data ?? [];
    },
  });
}

function TeamRolesTab() {
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const [projectId, setProjectId] = useState<string | null>(null);
  const activeProjectId = projectId ?? projects[0]?.id ?? null;

  const { data: roles = [] } = useTmRoles();
  const { data: profiles = [] } = useApprovedProfiles();
  const { data: assignments = [], isLoading: assignmentsLoading, isError } = useTmUserRoles(activeProjectId ?? undefined);
  const assign = useAssignTmUserRole();
  const remove = useRemoveTmUserRole();

  const [pendingUser, setPendingUser] = useState<{ label: string; value: string } | null>(null);
  const [pendingRole, setPendingRole] = useState<{ label: string; value: string } | null>(null);

  if (projectsLoading) return <Loading />;

  const head = { cells: [
    { key: 'u', content: 'User' }, { key: 'r', content: 'Role' },
    { key: 'a', content: 'Assigned' }, { key: 'x', content: '' } ] };
  const rows = assignments.map((a) => ({ key: a.id, cells: [
    { key: 'u', content: a.user?.full_name ?? a.user?.email ?? '—' },
    { key: 'r', content: <Lozenge appearance="inprogress">{a.role?.name ?? '—'}</Lozenge> },
    { key: 'a', content: new Date(a.assigned_at).toLocaleDateString() },
    { key: 'x', content: (
      <Button appearance="subtle" spacing="compact" onClick={() => remove.mutate({ id: a.id, projectId: activeProjectId! })}>
        Remove
      </Button>
    ) } ] }));

  return (
    <Panel>
      <H>Team &amp; roles</H>
      <Note>
        Assigns rows in <code>tm_user_roles</code> — the table every TestHub RLS policy consults
        first. Release-readiness approval (Release Hub) is the first action that actually enforces
        one of these roles (admin / test_lead); everything else in the RLS layer still falls back
        permissively when a project has no assignments yet (see ADM-007 note).
      </Note>
      <div style={{ maxWidth: 320, marginBottom: 16 }}>
        <Select
          inputId="testops-role-project-select"
          options={projects.map((p: any) => ({ label: p.name, value: p.id }))}
          value={activeProjectId ? { label: projects.find((p: any) => p.id === activeProjectId)?.name, value: activeProjectId } : null}
          onChange={(opt: any) => setProjectId(opt?.value ?? null)}
          placeholder="Select project"
        />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <div style={{ width: 240 }}>
          <Select
            inputId="testops-role-user-select"
            options={profiles.map((p: any) => ({ label: p.full_name ?? p.email, value: p.id }))}
            value={pendingUser}
            onChange={(opt: any) => setPendingUser(opt)}
            placeholder="User"
          />
        </div>
        <div style={{ width: 160 }}>
          <Select
            inputId="testops-role-select"
            options={roles.map((r) => ({ label: r.name, value: r.id }))}
            value={pendingRole}
            onChange={(opt: any) => setPendingRole(opt)}
            placeholder="Role"
          />
        </div>
        <Button
          appearance="primary"
          isDisabled={!pendingUser || !pendingRole || !activeProjectId || assign.isPending}
          onClick={() => {
            if (!pendingUser || !pendingRole || !activeProjectId) return;
            assign.mutate(
              { projectId: activeProjectId, userId: pendingUser.value, roleId: pendingRole.value },
              { onSuccess: () => { setPendingUser(null); setPendingRole(null); } },
            );
          }}
        >
          Assign
        </Button>
      </div>

      {assignmentsLoading ? <Loading /> : isError ? (
        <SectionMessage appearance="error"><p>Couldn't load role assignments.</p></SectionMessage>
      ) : assignments.length === 0 ? (
        <Note>No roles assigned for this project yet.</Note>
      ) : (
        <DynamicTable head={head} rows={rows} isFixedSize />
      )}
    </Panel>
  );
}

export default function TestOpsPage() {
  return (
    <AdminGuard>
      <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--ds-text)', margin: '0 0 4px' }}>Test Ops</h1>
        <p style={{ fontSize: 13, color: 'var(--ds-text-subtle)', margin: '0 0 16px' }}>
          Testing workflow control center — coverage gate, failed-test-to-defect, and Defect workflow governance.
        </p>
        <Tabs id="test-ops-tabs">
          <TabList>
            <Tab>Coverage gate</Tab>
            <Tab>Failed test → Defect</Tab>
            <Tab>Defect workflow</Tab>
            <Tab>Guard summary</Tab>
            <Tab>Team &amp; roles</Tab>
          </TabList>
          <TabPanel><CoverageTab /></TabPanel>
          <TabPanel><FailedTestDefectTab /></TabPanel>
          <TabPanel><DefectWorkflowTab /></TabPanel>
          <TabPanel><GuardSummaryTab /></TabPanel>
          <TabPanel><TeamRolesTab /></TabPanel>
        </Tabs>
      </div>
    </AdminGuard>
  );
}
