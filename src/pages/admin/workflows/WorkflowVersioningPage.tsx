/**
 * /admin/workflows/versions — Versioned Canonical Workflow foundation.
 * Read-only view of ph_wf_* + safe create-draft + Story migration preview +
 * enforcement visibility. Canonical ADS components only. Classic builder
 * (/admin/workflows) is untouched and remains primary.
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
  useWfVersionStatuses, useWfVersionTransitions, useWfAudit, useWfTemplates,
  useCreateDraftVersion, useMigrationPreview, useEnforcementConfig, useReasonCodes,
} from '@/hooks/workflow-v2/useWorkflowFoundation';

type LozAppearance = React.ComponentProps<typeof Lozenge>['appearance'];
const LIFECYCLE_APPEARANCE: Record<string, LozAppearance> = { draft: 'default', published: 'success', superseded: 'moved', archived: 'removed' };
const CATEGORY_APPEARANCE: Record<string, LozAppearance> = { todo: 'default', in_progress: 'inprogress', done: 'success' };

function fmt(ts: string | null): string { return ts ? ts.replace('T', ' ').slice(0, 16) : '—'; }
function Panel({ children }: { children: React.ReactNode }) { return <div style={{ padding: '16px 0', width: '100%' }}>{children}</div>; }
function Empty({ msg }: { msg: string }) { return <div style={{ padding: 24, color: 'var(--ds-text-subtlest)', fontSize: 13 }}>{msg}</div>; }
function Loading() { return <div style={{ padding: 24 }}><Spinner size="medium" /></div>; }

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
    { key: 'created', content: 'Created' }, { key: 'open', content: '' } ] };
  const rows = (versions ?? []).map((v) => ({ key: v.id, cells: [
    { key: 'entity', content: `${v.entity_key}${v.template_name ? ` · ${v.template_name}` : ''}` },
    { key: 'no', content: `v${v.version_no}` },
    { key: 'lifecycle', content: <Lozenge appearance={LIFECYCLE_APPEARANCE[v.lifecycle] ?? 'default'}>{v.lifecycle}</Lozenge> },
    { key: 'published', content: fmt(v.published_at) }, { key: 'created', content: fmt(v.created_at) },
    { key: 'open', content: <Button appearance="subtle" spacing="compact" onClick={() => onSelectVersion(v.id)}>View statuses</Button> } ] }));
  return (
    <Panel>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 12, color: 'var(--ds-text-subtle)' }}>New draft version from template<br />
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

function SchemesTab() {
  const { data: schemes, isLoading } = useWfSchemes();
  const { data: entries = [] } = useWfSchemeEntries();
  if (isLoading) return <Loading />;
  const head = { cells: [ { key: 'name', content: 'Scheme' }, { key: 'default', content: 'Default' }, { key: 'entries', content: 'Entity → version entries' }, { key: 'created', content: 'Created' } ] };
  const rows = (schemes ?? []).map((s) => ({ key: s.id, cells: [
    { key: 'name', content: s.name },
    { key: 'default', content: s.is_default ? <Lozenge appearance="success">default</Lozenge> : '—' },
    { key: 'entries', content: String(entries.filter((e) => e.scheme_id === s.id).length) },
    { key: 'created', content: fmt(s.created_at) } ] }));
  return <Panel>{rows.length === 0 ? <Empty msg="No workflow schemes yet." /> : <DynamicTable head={head} rows={rows} isFixedSize rowsPerPage={15} defaultPage={1} />}</Panel>;
}

function AssignmentsTab() {
  const { data: assignments, isLoading } = useWfSchemeAssignments();
  if (isLoading) return <Loading />;
  const head = { cells: [ { key: 'project', content: 'Project' }, { key: 'scheme', content: 'Scheme' }, { key: 'assigned', content: 'Assigned' } ] };
  const rows = (assignments ?? []).map((a) => ({ key: a.id, cells: [
    { key: 'project', content: a.project_id }, { key: 'scheme', content: a.scheme_name ?? '—' }, { key: 'assigned', content: fmt(a.assigned_at) } ] }));
  return <Panel>{rows.length === 0 ? <Empty msg="No project → scheme assignments yet." /> : <DynamicTable head={head} rows={rows} isFixedSize rowsPerPage={15} defaultPage={1} />}</Panel>;
}

function VersionScopedTab({ versionId, versions, onSelect, kind }: { versionId: string | null; versions: { id: string; label: string }[]; onSelect: (id: string) => void; kind: 'statuses' | 'transitions'; }) {
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
function StatusesList({ versionId }: { versionId: string }) {
  const { data, isLoading } = useWfVersionStatuses(versionId);
  if (isLoading) return <Loading />;
  if (!data || data.length === 0) return <Empty msg="This version has no statuses yet." />;
  const head = { cells: [ { key: 'label', content: 'Status' }, { key: 'key', content: 'Key' }, { key: 'cat', content: 'Category' }, { key: 'flags', content: 'Flags' } ] };
  const rows = data.map((s) => ({ key: s.id, cells: [
    { key: 'label', content: s.display_label }, { key: 'key', content: s.status_key },
    { key: 'cat', content: <Lozenge appearance={CATEGORY_APPEARANCE[s.category] ?? 'default'}>{s.category}</Lozenge> },
    { key: 'flags', content: [s.is_initial && 'initial', s.is_terminal && 'terminal', s.is_exception && 'exception', s.supports_reopen && 'reopen'].filter(Boolean).join(', ') || '—' } ] }));
  return <DynamicTable head={head} rows={rows} isFixedSize rowsPerPage={20} defaultPage={1} />;
}
function TransitionsList({ versionId }: { versionId: string }) {
  const { data, isLoading } = useWfVersionTransitions(versionId);
  if (isLoading) return <Loading />;
  if (!data || data.length === 0) return <Empty msg="This version has no transitions yet." />;
  const head = { cells: [ { key: 'from', content: 'From' }, { key: 'to', content: 'To' }, { key: 'type', content: 'Type' }, { key: 'guards', content: 'Reason/Comment' } ] };
  const rows = data.map((t) => ({ key: t.id, cells: [
    { key: 'from', content: t.from_status_key ?? '(any)' }, { key: 'to', content: t.to_status_key },
    { key: 'type', content: <Lozenge appearance="default">{t.transition_type}</Lozenge> },
    { key: 'guards', content: [t.requires_reason && 'reason', t.requires_comment && 'comment'].filter(Boolean).join(', ') || '—' } ] }));
  return <DynamicTable head={head} rows={rows} isFixedSize rowsPerPage={20} defaultPage={1} />;
}

const PREVIEW_ENTITIES = ['story', 'epic', 'feature', 'subtask', 'defect', 'incident', 'release', 'business_request', 'product_milestone'] as const;
function MigrationPreviewTab() {
  const [entity, setEntity] = useState<string>('story');
  const { data, isLoading } = useMigrationPreview(entity);
  if (isLoading) return <Loading />;
  const rows = data ?? [];
  const mappedItems = rows.filter((r) => r.mapped).reduce((a, r) => a + Number(r.item_count), 0);
  const unmappedRows = rows.filter((r) => !r.mapped);
  const unmappedItems = unmappedRows.reduce((a, r) => a + Number(r.item_count), 0);
  const canProceed = unmappedRows.length === 0;
  const head = { cells: [ { key: 'legacy', content: 'Legacy status (ph_issues)' }, { key: 'proposed', content: 'Proposed canonical' }, { key: 'count', content: 'Items' }, { key: 'flag', content: 'Status' } ] };
  const tableRows = rows.map((r, i) => ({ key: `${r.legacy_status}-${i}`, cells: [
    { key: 'legacy', content: r.legacy_status }, { key: 'proposed', content: r.proposed_key ?? '—' }, { key: 'count', content: String(r.item_count) },
    { key: 'flag', content: r.mapped ? <Lozenge appearance="success">mapped</Lozenge> : <Lozenge appearance="removed">unmapped — needs review</Lozenge> } ] }));
  return (
    <Panel>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: 'var(--ds-text-subtle)' }}>Entity:&nbsp;
          <select value={entity} onChange={(e) => setEntity(e.target.value)}
            style={{ height: 30, minWidth: 140, padding: '0 8px', border: '1px solid var(--ds-border)', borderRadius: 4, background: 'var(--ds-surface)', color: 'var(--ds-text)', fontSize: 13 }}>
            {PREVIEW_ENTITIES.map((en) => <option key={en} value={en}>{en}</option>)}
          </select>
        </label>
      </div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 13, color: 'var(--ds-text-subtle)', flexWrap: 'wrap' }}>
        <span>Entity: <strong style={{ color: 'var(--ds-text)' }}>{entity}</strong></span>
        <span>Mapped items: <strong style={{ color: 'var(--ds-text)' }}>{mappedItems}</strong></span>
        <span>Unmapped items: <strong style={{ color: 'var(--ds-text)' }}>{unmappedItems}</strong> across {unmappedRows.length} status{unmappedRows.length === 1 ? '' : 'es'}</span>
        <span>{canProceed ? <Lozenge appearance="success">can proceed</Lozenge> : <Lozenge appearance="moved">cannot proceed — resolve unmapped first</Lozenge>}</span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--ds-text-subtlest)', margin: '0 0 12px' }}>Activation is non-destructive. Unmapped statuses are never auto-moved — flagged here for explicit review.</p>
      {rows.length === 0 ? <Empty msg="No Story items found to preview." /> : <DynamicTable head={head} rows={tableRows} isFixedSize rowsPerPage={25} defaultPage={1} />}
    </Panel>
  );
}

function ReasonCodesTab() {
  const { data, isLoading } = useReasonCodes();
  if (isLoading) return <Loading />;
  const rows = data ?? [];
  const head = { cells: [
    { key: 'code', content: 'Code' }, { key: 'label', content: 'Label' }, { key: 'type', content: 'Transition type' },
    { key: 'ft', content: 'Free text' }, { key: 'scope', content: 'Scope' }, { key: 'active', content: 'Active' } ] };
  const tableRows = rows.map((r) => ({ key: r.id, cells: [
    { key: 'code', content: r.code }, { key: 'label', content: r.label },
    { key: 'type', content: r.transition_type ?? '(any)' },
    { key: 'ft', content: r.requires_free_text ? 'required' : '—' },
    { key: 'scope', content: r.version_id ? 'version' : 'global' },
    { key: 'active', content: r.is_active ? <Lozenge appearance="success">active</Lozenge> : <Lozenge appearance="default">inactive</Lozenge> } ] }));
  return (
    <Panel>
      <p style={{ fontSize: 12, color: 'var(--ds-text-subtlest)', margin: '0 0 12px' }}>
        Reason codes surfaced in the reason-capture modal for transitions requiring a reason. Global (version_id null) apply to all versions. View-only for now.
      </p>
      {rows.length === 0 ? <Empty msg="No reason codes seeded." /> : <DynamicTable head={head} rows={tableRows} isFixedSize rowsPerPage={20} defaultPage={1} />}
    </Panel>
  );
}

function EnforcementTab() {
  const { data, isLoading } = useEnforcementConfig();
  if (isLoading) return <Loading />;
  const rows = data ?? [];
  const head = { cells: [ { key: 'project', content: 'Project' }, { key: 'entity', content: 'Entity' }, { key: 'version', content: 'Version' }, { key: 'mode', content: 'Mode' }, { key: 'reason', content: 'Reason' }, { key: 'enabled', content: 'Enabled' } ] };
  const tableRows = rows.map((r, i) => ({ key: `${r.project_key}-${r.entity_key}-${i}`, cells: [
    { key: 'project', content: r.project_key ?? '—' }, { key: 'entity', content: r.entity_key },
    { key: 'version', content: r.version_no != null ? `v${r.version_no}` : '—' },
    { key: 'mode', content: r.mode === 'blocking' ? <Lozenge appearance="removed">blocking</Lozenge> : <Lozenge appearance="default">advisory</Lozenge> },
    { key: 'reason', content: r.reason ?? '—' }, { key: 'enabled', content: fmt(r.enabled_at) } ] }));
  return (
    <Panel>
      <p style={{ fontSize: 12, color: 'var(--ds-text-subtlest)', margin: '0 0 12px' }}>
        Enforcement is scoped per (project, entity). Any pair NOT listed as <strong>blocking</strong> stays <strong>advisory</strong>.
        Rollback: set the row's mode to <code>advisory</code> or delete it in <code>ph_wf_enforcement_config</code>.
      </p>
      {rows.length === 0 ? <Empty msg="No blocking enforcement configured — all entities advisory." /> : <DynamicTable head={head} rows={tableRows} isFixedSize rowsPerPage={15} defaultPage={1} />}
    </Panel>
  );
}

function AuditTab() {
  const { data, isLoading } = useWfAudit(50);
  if (isLoading) return <Loading />;
  if (!data || data.length === 0) return <Panel><Empty msg="No workflow audit events yet." /></Panel>;
  const head = { cells: [ { key: 'at', content: 'When' }, { key: 'entity', content: 'Entity' }, { key: 'move', content: 'From → To' }, { key: 'decision', content: 'Role decision' }, { key: 'mode', content: 'Mode' } ] };
  const rows = data.map((a) => ({ key: a.id, cells: [
    { key: 'at', content: fmt(a.at) }, { key: 'entity', content: a.entity_key },
    { key: 'move', content: `${a.from_status_key ?? '—'} → ${a.to_status_key}` },
    { key: 'decision', content: <Lozenge appearance="default">{a.role_decision}</Lozenge> }, { key: 'mode', content: a.mode } ] }));
  return <Panel><DynamicTable head={head} rows={rows} isFixedSize rowsPerPage={20} defaultPage={1} /></Panel>;
}

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
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 653, color: 'var(--ds-text)', lineHeight: '28px', fontFamily: "'Atlassian Sans', var(--ds-font-family-body)" }}>Versioned workflow engine</h1>
              <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--ds-text-subtle)' }}>Canonical ph_wf_* — versions, schemes, assignments, statuses, transitions, enforcement, audit.</p>
            </div>
            <Link to="/admin/workflows" style={{ flexShrink: 0 }}><Button appearance="subtle">← Classic builder</Button></Link>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px 24px' }}>
          <Tabs id="wf-versioning-tabs">
            <TabList>
              <Tab>Versions</Tab><Tab>Schemes</Tab><Tab>Assignments</Tab><Tab>Statuses</Tab>
              <Tab>Transitions</Tab><Tab>Migration preview</Tab><Tab>Enforcement</Tab><Tab>Reason codes</Tab><Tab>Audit</Tab>
            </TabList>
            <TabPanel><VersionsTab onSelectVersion={setSelectedVersion} /></TabPanel>
            <TabPanel><SchemesTab /></TabPanel>
            <TabPanel><AssignmentsTab /></TabPanel>
            <TabPanel><VersionScopedTab kind="statuses" versionId={selectedVersion} versions={versionOptions} onSelect={setSelectedVersion} /></TabPanel>
            <TabPanel><VersionScopedTab kind="transitions" versionId={selectedVersion} versions={versionOptions} onSelect={setSelectedVersion} /></TabPanel>
            <TabPanel><MigrationPreviewTab /></TabPanel>
            <TabPanel><EnforcementTab /></TabPanel><TabPanel><ReasonCodesTab /></TabPanel>
            <TabPanel><AuditTab /></TabPanel>
          </Tabs>
        </div>
      </div>
    </AdminGuard>
  );
}
