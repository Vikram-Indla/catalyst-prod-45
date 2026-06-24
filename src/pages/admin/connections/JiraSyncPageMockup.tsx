/**
 * Jira Integration Mockup — Production-grade admin with icon identity, mapping validation, per-project config.
 * Route: /admin/connections/jira/mockup
 *
 * Tabs: Overview · Sync Control · Projects · Type Mapping · Status Mapping · Field Mapping · Database Schema · Backup & Logs
 *
 * Key: Icons for identity (project, type, status). Mapping-first validation before sync. Per-project management screens.
 * Data: Old data preserved on re-sync; union with new date range. Refresh Data for explicit overwrite.
 * Removed: All "Hub" terminology.
 */

import { useState } from 'react';
import Button from '@atlaskit/button/new';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import Lozenge from '@atlaskit/lozenge';
import SectionMessage from '@atlaskit/section-message';
import Toggle from '@atlaskit/toggle';
import Textfield from '@atlaskit/textfield';
import Modal, { ModalTransition } from '@atlaskit/modal-dialog';
import { AdminGuard } from '@/components/admin/AdminGuard';

// ADS token colors
const C = {
  bgSurface: 'var(--ds-surface, #FFFFFF)',
  bgSurfaceOverlay: 'var(--ds-surface-overlay, #FFFFFF)',
  bgSurfaceSunken: 'var(--ds-surface-sunken, #F7F8F9)',
  bgNeutral: 'var(--ds-background-neutral, #F1F2F4)',
  bgSuccess: 'var(--ds-background-success, #DFFCF0)',
  bgDanger: 'var(--ds-background-danger, #FFECEB)',
  bgWarning: 'var(--ds-background-warning, #FFF7D6)',
  bgInfo: 'var(--ds-background-information, #DEEBFF)',
  textDefault: 'var(--ds-text, #172B4D)',
  textSubtle: 'var(--ds-text-subtle, #42526E)',
  textSubtlest: 'var(--ds-text-subtlest, #6B778C)',
  textSuccess: 'var(--ds-text-success, #216E4E)',
  textDanger: 'var(--ds-text-danger, #AE2A19)',
  textWarning: 'var(--ds-text-warning, #7F5F01)',
  textInfo: 'var(--ds-text-information, #0747A6)',
  border: 'var(--ds-border, #DFE1E6)',
} as const;

// Source badges (SVG inline)
const SOURCE_ICONS = {
  jira: '✓', // Checkmark for Jira
  catalyst: 'C', // C for Catalyst
  notion: 'N', // N for Notion
} as const;

// Helper component for source-aware title with hover icon
function SourceAwareTitle({ title, source, style = {} }: { title: string; source: 'jira' | 'catalyst' | 'notion' | null; style?: Record<string, any> }) {
  const [showSource, setShowSource] = useState(false);
  const sourceColors = {
    jira: '#0747A6',
    catalyst: '#172B4D',
    notion: '#000000',
  };

  return (
    <span
      onMouseEnter={() => setShowSource(true)}
      onMouseLeave={() => setShowSource(false)}
      style={{ position: 'relative', display: 'inline-block', ...style }}
    >
      {title}
      {source && showSource && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '1em',
            height: '1em',
            marginLeft: '4px',
            fontSize: 'inherit',
            fontWeight: 600,
            color: sourceColors[source],
            opacity: 0.7,
            transition: 'opacity 0.2s',
          }}
          title={`Source: ${source.charAt(0).toUpperCase() + source.slice(1)}`}
        >
          {SOURCE_ICONS[source]}
        </span>
      )}
    </span>
  );
}

// Icons for work item type identity
const TYPE_ICONS: Record<string, string> = {
  // Jira types
  'Epic': '🏛️',
  'Story': '📖',
  'Task': '✓',
  'Sub-task': '└─',
  'Bug': '🐛',
  'Change Request': '⚡',
  'Incident': '🔥',
  'Idea': '💡',
  // Catalyst types
  'Business Request': '📋',
  'Feature': '⭐',
  'QA Bug': '🔍',
  'Production Incident': '🚨',
  'Business Gap': '🎯',
  'Backend': '⚙️',
  'Frontend': '🎨',
  'Integration': '🔗',
};

// Icons for project identity
const PROJECT_ICONS: Record<string, string> = {
  'BAU': '📊',
  'IJ': '💰',
  'LIC': '📜',
  'MDM': '🗂️',
  'OPS': '🔧',
  'EXP': '🧪',
  'APP': '💻',
  'DATA': '📈',
};

// Sample projects with icon identity
const SAMPLE_JIRA_PROJECTS = [
  { key: 'BAU', name: 'Business Applications', accessible: true, sync_enabled: true, module_target: 'project', issues_cached: 312, icon: PROJECT_ICONS['BAU'] },
  { key: 'IJ', name: 'Investor Journey', accessible: true, sync_enabled: false, module_target: 'product', issues_cached: 0, icon: PROJECT_ICONS['IJ'] },
  { key: 'LIC', name: 'Industrial Licensing', accessible: true, sync_enabled: true, module_target: 'product', issues_cached: 89, icon: PROJECT_ICONS['LIC'] },
  { key: 'MDM', name: 'Master Data Management', accessible: true, sync_enabled: false, module_target: null, issues_cached: 0, icon: PROJECT_ICONS['MDM'] },
  { key: 'OPS', name: 'Operations Support', accessible: true, sync_enabled: true, module_target: 'product', issues_cached: 156, icon: PROJECT_ICONS['OPS'] },
];

const ISSUE_TYPES = [
  { jira: 'Epic', catalyst: 'Epic', icon: TYPE_ICONS['Epic'] },
  { jira: 'Story', catalyst: 'Story', icon: TYPE_ICONS['Story'] },
  { jira: 'Task', catalyst: 'Task', icon: TYPE_ICONS['Task'] },
  { jira: 'Bug', catalyst: 'QA Bug', icon: TYPE_ICONS['Bug'] },
  { jira: 'Change Request', catalyst: 'Change Request', icon: TYPE_ICONS['Change Request'] },
];

const DEVIATIONS = [
  { id: 1, severity: 'blocker', project: 'MDM', message: 'Project enabled but not mapped to module', action: 'Map to Products' },
  { id: 2, severity: 'warning', project: 'BAU', message: 'Jira status "Cancelled" has no Catalyst equivalent', action: 'Map or ignore' },
];

export function JiraSyncPageMockup() {
  const [selectedTab, setSelectedTab] = useState(0);
  const [projectDetailOpen, setProjectDetailOpen] = useState<string | null>(null);
  const [refreshModalOpen, setRefreshModalOpen] = useState(false);

  const enabledProjects = SAMPLE_JIRA_PROJECTS.filter(p => p.sync_enabled);
  const mappingValid = enabledProjects.every(p => p.module_target);

  return (
    <AdminGuard>
      <div style={{ padding: '24px 32px', background: C.bgSurfaceOverlay, minHeight: '100vh' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 600, color: C.textDefault, margin: 0, fontFamily: 'var(--ds-font-family-heading, sans-serif)' }}>
            Jira Integration
          </h1>
          <p style={{ fontSize: 14, color: C.textSubtle, margin: '8px 0 0 0' }}>
            Sync Jira data into Catalyst work items. Mapping-first: validate before sync. Preserve existing data; union with new ranges.
          </p>
        </div>

        {/* Connected banner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: C.bgSuccess, border: `1px solid ${C.textSuccess}`, borderRadius: 8, padding: '12px 16px', marginBottom: 24 }}>
          <span style={{ fontWeight: 600, color: C.textSuccess }}>✓ Connected</span>
          <code style={{ fontSize: 12, background: C.bgNeutral, padding: '2px 6px', borderRadius: 3 }}>https://digital-transformation.atlassian.net</code>
          <span style={{ color: C.textSubtle, marginLeft: 'auto' }}>Last tested 1 hour ago</span>
        </div>

        <Tabs id="jira-admin-mockup" selectedIndex={selectedTab} onChange={setSelectedTab}>
          <TabList>
            <Tab>Overview</Tab>
            <Tab>Sync Control</Tab>
            <Tab>Projects ({SAMPLE_JIRA_PROJECTS.length})</Tab>
            <Tab>Type Mapping</Tab>
            <Tab>Status Mapping</Tab>
            <Tab>Field Mapping</Tab>
            <Tab>Database Schema</Tab>
            <Tab>Backup & Logs</Tab>
          </TabList>

          <TabPanel>
            <OverviewTab projects={SAMPLE_JIRA_PROJECTS} mappingValid={mappingValid} deviations={DEVIATIONS} />
          </TabPanel>
          <TabPanel>
            <SyncControlTab mappingValid={mappingValid} onRefreshClick={() => setRefreshModalOpen(true)} />
          </TabPanel>
          <TabPanel>
            <ProjectsTab projects={SAMPLE_JIRA_PROJECTS} onProjectClick={setProjectDetailOpen} />
          </TabPanel>
          <TabPanel>
            <TypeMappingTab />
          </TabPanel>
          <TabPanel>
            <StatusMappingTab />
          </TabPanel>
          <TabPanel>
            <FieldMappingTab />
          </TabPanel>
          <TabPanel>
            <DatabaseSchemaTab />
          </TabPanel>
          <TabPanel>
            <BackupAndLogsTab />
          </TabPanel>
        </Tabs>

        {/* Project Detail Modal */}
        <ProjectDetailModal projectKey={projectDetailOpen} onClose={() => setProjectDetailOpen(null)} />

        {/* Refresh Data Modal */}
        <RefreshDataModal isOpen={refreshModalOpen} onClose={() => setRefreshModalOpen(false)} />
      </div>
    </AdminGuard>
  );
}

function OverviewTab({ projects, mappingValid, deviations }: any) {
  const syncedCount = projects.filter((p: any) => p.sync_enabled).length;
  const totalIssues = projects.reduce((sum: number, p: any) => sum + (p.issues_cached || 0), 0);

  return (
    <div style={{ marginTop: 20 }}>
      {/* MDT → Investor Journey Contract */}
      <div style={{ background: C.bgInfo, border: `2px solid ${C.textInfo}`, borderRadius: 8, padding: '16px', marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.textInfo, marginBottom: 4 }}>📋 Permanent Mapping Contract</div>
        <div style={{ fontSize: 12, color: C.textInfo }}>
          <strong>MDT</strong> (Master Data Management) always syncs to <strong>Investor Journey</strong> Product. Same key in both systems: <code style={{ background: 'rgba(7,71,166,0.1)', padding: '2px 6px', borderRadius: 3 }}>MDT</code>
        </div>
      </div>

      {/* Mapping Validation Status */}
      <div style={{ background: C.bgSurface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '24px', marginBottom: 32 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: C.textDefault, margin: '0 0 16px 0' }}>Mapping Validation</h3>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <div style={{ fontSize: 36, fontWeight: 600, color: C.textDefault }}>
            {mappingValid ? '✓' : '⚠'}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: mappingValid ? C.textSuccess : C.textDanger }}>
              {mappingValid ? 'All mappings complete' : 'Mapping incomplete'}
            </div>
            <div style={{ fontSize: 12, color: C.textSubtle, marginTop: 4 }}>
              {mappingValid ? 'Sync is enabled. All projects mapped to modules.' : 'Fix mapping blockers before sync is allowed.'}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Jira Projects', value: projects.length },
          { label: 'Sync Enabled', value: syncedCount },
          { label: 'Issues Cached', value: totalIssues },
          { label: 'Last Sync', value: '1 day ago' },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: C.bgSurfaceSunken, border: `1px solid ${C.border}`, borderRadius: 8, padding: '20px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 600, color: C.textDefault }}>{value}</div>
            <div style={{ fontSize: 12, color: C.textSubtle, marginTop: 8 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Sync Scope Summary */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: C.textDefault, marginBottom: 16 }}>Sync Scope Summary</h3>
        <div style={{ background: C.bgSurface, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: C.bgSurfaceSunken }}>
                {['Project', 'Catalyst Target', 'Sync', 'Webhook', 'Date Filter', 'Status'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: C.textSubtle, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map((p: any, i: number) => (
                <tr key={i} style={{ borderBottom: i < projects.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <td style={{ padding: '12px 16px', fontSize: 13 }}>
                    <span style={{ marginRight: 8 }}>{p.icon}</span>
                    <SourceAwareTitle title={p.key} source="jira" />
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: C.textSubtle }}>
                    <SourceAwareTitle title={p.module_target || '—'} source={p.module_target ? 'catalyst' : null} />
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <Lozenge appearance={p.sync_enabled ? 'success' : 'default'}>{p.sync_enabled ? 'ON' : 'OFF'}</Lozenge>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13 }}>
                    <Lozenge appearance={p.sync_enabled ? 'success' : 'default'}>{p.sync_enabled ? 'ON' : 'OFF'}</Lozenge>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: C.textSubtle }}>All time</td>
                  <td style={{ padding: '12px 16px' }}>
                    <Lozenge appearance={p.module_target ? 'success' : 'removed'}>{p.module_target ? 'Ready' : 'Incomplete'}</Lozenge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Blockers */}
      {deviations.filter(d => d.severity === 'blocker').length > 0 && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: C.textDefault, marginBottom: 16 }}>Blockers</h3>
          {deviations.filter(d => d.severity === 'blocker').map(d => (
            <div key={d.id} style={{ background: C.bgDanger, border: `1px solid ${C.textDanger}`, borderRadius: 8, padding: '16px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.textDanger }}>{d.project} — {d.message}</div>
                <div style={{ fontSize: 12, color: C.textDanger, marginTop: 4 }}>{d.action}</div>
              </div>
              <Button appearance="primary" size="small">Fix</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SyncControlTab({ mappingValid, onRefreshClick }: any) {
  return (
    <div style={{ marginTop: 20 }}>
      <SectionMessage appearance="information" title="Mapping Required">
        Complete type, status, and field mappings before sync is allowed. Validation checks all mappings against Jira and Catalyst schemas.
      </SectionMessage>

      {/* Discovery Sync */}
      <div style={{ background: C.bgSurface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '24px', marginTop: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: C.textDefault, margin: '0 0 12px 0' }}>Discover Jira Metadata</h3>
        <p style={{ fontSize: 12, color: C.textSubtle, margin: '0 0 16px 0' }}>Discover projects, issue types, statuses, fields from Jira. Always allowed, even before mappings.</p>
        <Button appearance="primary">Discover Now</Button>
      </div>

      {/* Manual Sync */}
      <div style={{ background: C.bgSurface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '24px', marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: C.textDefault, margin: '0 0 12px 0' }}>Manual Sync</h3>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <Button appearance="primary" isDisabled={!mappingValid}>Run Full Sync</Button>
          <Button isDisabled={!mappingValid}>Run Incremental</Button>
          <Button>Dry Run</Button>
        </div>
        {!mappingValid && (
          <div style={{ fontSize: 12, color: C.textDanger }}>
            ⚠ Sync disabled: Mapping incomplete. Complete type, status, field mappings to enable.
          </div>
        )}
      </div>

      {/* Refresh Data — Destructive */}
      <div style={{ background: C.bgWarning, border: `1px solid ${C.textWarning}`, borderRadius: 8, padding: '24px' }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: C.textWarning, margin: '0 0 12px 0' }}>⚠ Refresh Data</h3>
        <p style={{ fontSize: 12, color: C.textWarning, margin: '0 0 16px 0' }}>
          Delete existing Jira-origin data and reload fresh. Preserves Catalyst-native records. Cannot be undone from this screen.
        </p>
        <Button appearance="warning" onClick={onRefreshClick}>Refresh Data</Button>
      </div>
    </div>
  );
}

function ProjectsTab({ projects, onProjectClick }: any) {
  const [search, setSearch] = useState('');
  const filtered = projects.filter((p: any) => p.key.toLowerCase().includes(search.toLowerCase()) || p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ marginBottom: 20 }}>
        <Textfield placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', maxWidth: 400 }} />
      </div>

      <div style={{ background: C.bgSurface, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: C.bgSurfaceSunken }}>
              {['Key', 'Name', 'Sync', 'Catalyst Target', 'Issues', 'Filters', 'Status'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: C.textSubtle, borderBottom: `1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p: any, i: number) => (
              <tr key={i} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <td style={{ padding: '12px 16px', fontSize: 13 }}>
                  <span style={{ marginRight: 8 }}>{p.icon}</span>
                  <code style={{ fontSize: 11, background: C.bgNeutral, padding: '2px 6px', borderRadius: 3 }}>{p.key}</code>
                </td>
                <td style={{ padding: '12px 16px', fontSize: 13 }}>{p.name}</td>
                <td style={{ padding: '12px 16px' }}>
                  <Toggle isChecked={p.sync_enabled} onChange={() => {}} />
                </td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: C.textSubtle }}>{p.module_target || '—'}</td>
                <td style={{ padding: '12px 16px', fontSize: 13 }}>{p.issues_cached > 0 ? p.issues_cached : '—'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <Button appearance="subtle" size="small" onClick={() => onProjectClick(p.key)}>Manage</Button>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <Lozenge appearance={p.sync_enabled && p.module_target ? 'success' : 'removed'}>
                    {p.sync_enabled && p.module_target ? 'Ready' : 'Review'}
                  </Lozenge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TypeMappingTab() {
  return (
    <div style={{ marginTop: 20 }}>
      <SectionMessage appearance="information" title="Type Mappings">
        Map Jira issue types to Catalyst work item types. Each mapping sets target table, hierarchy rules, and field availability.
      </SectionMessage>

      <div style={{ marginTop: 20, background: C.bgSurface, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: C.bgSurfaceSunken }}>
              {['Jira Type', 'Catalyst Type', 'Target Table', 'Hierarchy', 'Status Field', 'Status'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: C.textSubtle, borderBottom: `1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ISSUE_TYPES.map((t, i) => (
              <tr key={i} style={{ borderBottom: i < ISSUE_TYPES.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <td style={{ padding: '12px 16px', fontSize: 13 }}>
                  <span style={{ marginRight: 6 }}>{t.icon}</span>
                  <SourceAwareTitle title={t.jira} source="jira" />
                </td>
                <td style={{ padding: '12px 16px', fontSize: 13 }}>
                  <span style={{ marginRight: 6 }}>{TYPE_ICONS[t.catalyst]}</span>
                  <SourceAwareTitle title={t.catalyst} source="catalyst" />
                </td>
                <td style={{ padding: '12px 16px', fontSize: 12, fontFamily: 'monospace', color: C.textSubtle }}>ph_issues</td>
                <td style={{ padding: '12px 16px', fontSize: 12 }}>Parent or Standalone</td>
                <td style={{ padding: '12px 16px', fontSize: 12, fontFamily: 'monospace', color: C.textSubtle }}>status</td>
                <td style={{ padding: '12px 16px' }}>
                  <Lozenge appearance="success">Mapped</Lozenge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusMappingTab() {
  return (
    <div style={{ marginTop: 20 }}>
      <SectionMessage appearance="information" title="Status Mappings">
        Map Jira workflow statuses to Catalyst statuses. Deviations flagged for manual resolution.
      </SectionMessage>

      <div style={{ marginTop: 20, background: C.bgSurface, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: C.bgSurfaceSunken }}>
              {['Jira Status', 'Category', 'Catalyst Status', 'Deviation', 'Terminal', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: C.textSubtle, borderBottom: `1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { jira: 'To Do', category: 'to do', catalyst: 'New', deviation: '', terminal: 'No' },
              { jira: 'In Progress', category: 'in progress', catalyst: 'In Develop', deviation: '', terminal: 'No' },
              { jira: 'In QA', category: 'in progress', catalyst: 'In UAT', deviation: 'Auto-suggested', terminal: 'No' },
              { jira: 'Done', category: 'done', catalyst: 'Closed', deviation: '', terminal: 'Yes' },
              { jira: 'Cancelled', category: 'done', catalyst: '—', deviation: 'No equivalent', terminal: 'Yes' },
            ].map((row, i) => (
              <tr key={i} style={{ borderBottom: i < 5 - 1 ? `1px solid ${C.border}` : 'none' }}>
                <td style={{ padding: '12px 16px', fontSize: 13 }}>
                  <SourceAwareTitle title={row.jira} source="jira" />
                </td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: C.textSubtle }}>{row.category}</td>
                <td style={{ padding: '12px 16px', fontSize: 13 }}>
                  <SourceAwareTitle title={row.catalyst} source={row.catalyst !== '—' ? 'catalyst' : null} />
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {row.deviation ? (
                    <Lozenge appearance="default">{row.deviation}</Lozenge>
                  ) : (
                    <Lozenge appearance="success">Exact</Lozenge>
                  )}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 13 }}>{row.terminal}</td>
                <td style={{ padding: '12px 16px' }}>
                  <Button appearance="subtle" size="small">Configure</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FieldMappingTab() {
  const [filter, setFilter] = useState<'all' | 'mapped' | 'raw'>('all');

  const fields = [
    { jira: 'Summary', catalyst: 'summary', status: 'mapped' as const },
    { jira: 'Status', catalyst: 'status', status: 'mapped' as const },
    { jira: 'Assignee', catalyst: 'assignee_account_id', status: 'mapped' as const },
    { jira: 'Priority', catalyst: 'priority', status: 'mapped' as const },
    { jira: 'Severity', catalyst: 'raw_json only', status: 'raw' as const },
  ];

  const filtered = fields.filter(f => filter === 'all' || f.status === filter);

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'All Fields', value: 'all' },
          { label: 'Mapped (9)', value: 'mapped' },
          { label: 'Raw JSON (3)', value: 'raw' },
        ].map(tab => (
          <button key={tab.value} onClick={() => setFilter(tab.value as any)} style={{ padding: '8px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', background: filter === tab.value ? C.bgInfo : C.bgNeutral, color: C.textDefault, fontSize: 13, fontWeight: 500 }}>
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ background: C.bgSurface, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: C.bgSurfaceSunken }}>
              {['Jira Field', 'Catalyst Column', 'Status'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: C.textSubtle, borderBottom: `1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((f, i) => (
              <tr key={i} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <td style={{ padding: '12px 16px', fontSize: 13 }}>{f.jira}</td>
                <td style={{ padding: '12px 16px', fontSize: 12, fontFamily: 'monospace', color: C.textSubtle }}>{f.catalyst}</td>
                <td style={{ padding: '12px 16px' }}>
                  <Lozenge appearance={f.status === 'mapped' ? 'success' : 'default'}>
                    {f.status === 'mapped' ? 'Mapped' : 'Raw JSON'}
                  </Lozenge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DatabaseSchemaTab() {
  return (
    <div style={{ marginTop: 20 }}>
      <SectionMessage appearance="information" title="Supabase Target Schema">
        Jira data stored in Catalyst Supabase. Shown for transparency and debugging.
      </SectionMessage>

      <div style={{ marginTop: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: C.textDefault, marginBottom: 16 }}>Work Item Type → Target Table</h3>
        <div style={{ background: C.bgSurface, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: C.bgSurfaceSunken }}>
                {['Catalyst Type', 'Supabase Table', 'Jira ID Column', 'Source Column', 'Status'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: C.textSubtle, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { type: 'Epic', table: 'ph_issues', jiraId: 'jira_issue_id', source: 'source_system', status: '✓' },
                { type: 'Story', table: 'ph_issues', jiraId: 'jira_issue_id', source: 'source_system', status: '✓' },
                { type: 'QA Bug', table: 'ph_issues', jiraId: 'jira_issue_id', source: 'source_system', status: '✓' },
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: i < 3 - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <td style={{ padding: '12px 16px', fontSize: 13 }}>{row.type}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, fontFamily: 'monospace', color: C.textSubtle }}>{row.table}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, fontFamily: 'monospace', color: C.textSubtle }}>{row.jiraId}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, fontFamily: 'monospace', color: C.textSubtle }}>{row.source}</td>
                  <td style={{ padding: '12px 16px', color: C.textSuccess }}>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function BackupAndLogsTab() {
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ background: C.bgSurface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '20px', marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: C.textDefault, marginBottom: 8 }}>Daily Backup</h3>
        <p style={{ fontSize: 12, color: C.textSubtle, marginBottom: 12 }}>Tables: ph_issues, ph_comments. Retention: 180 days. Schedule: 02:00 UTC daily.</p>
        <Button>Backup Now</Button>
      </div>

      <div>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: C.textDefault, marginBottom: 12 }}>Sync History</h3>
        <div style={{ background: C.bgSurface, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: C.bgSurfaceSunken }}>
                {['When', 'Type', 'Status', 'Records', 'Duration'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: C.textSubtle, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { when: '1 hour ago', type: 'Incremental', status: 'success', records: '12', duration: '2.3s' },
                { when: '1 day ago', type: 'Full', status: 'success', records: '758', duration: '18.6s' },
              ].map((log, i) => (
                <tr key={i} style={{ borderBottom: i < 2 - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <td style={{ padding: '12px 16px', fontSize: 12 }}>{log.when}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12 }}>
                    <Lozenge appearance={log.type === 'Full' ? 'default' : 'new'}>{log.type}</Lozenge>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12 }}>
                    <Lozenge appearance={log.status === 'success' ? 'success' : 'removed'}>{log.status}</Lozenge>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12 }}>{log.records}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: C.textSubtle }}>{log.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PROJECT DETAIL MODAL — Per-project configuration
// ─────────────────────────────────────────────────────────────
function ProjectDetailModal({ projectKey, onClose }: { projectKey: string | null; onClose: () => void }) {
  if (!projectKey) return null;

  const project = SAMPLE_JIRA_PROJECTS.find(p => p.key === projectKey);
  if (!project) return null;

  return (
    <ModalTransition>
      {project && (
        <Modal onClose={onClose} width="large" testId={`project-detail-${projectKey}`}>
          <div style={{ padding: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: C.textDefault, margin: '0 0 16px 0' }}>
              {project.icon} {project.key} — {project.name}
            </h2>

            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: C.textDefault, margin: '0 0 12px 0' }}>Date Filter</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, color: C.textSubtle, display: 'block', marginBottom: 4 }}>Date Mode</label>
                  <select style={{ width: '100%', padding: '8px', borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 13 }}>
                    <option>All time</option>
                    <option>Fixed date range</option>
                    <option>Last N months</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: C.textSubtle, display: 'block', marginBottom: 4 }}>Date Basis</label>
                  <select style={{ width: '100%', padding: '8px', borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 13 }}>
                    <option>Created date</option>
                    <option>Updated date</option>
                    <option>Resolved date</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: C.textDefault, margin: '0 0 12px 0' }}>Issue Type Filter</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['Epic', 'Story', 'Task', 'Bug', 'Change Request'].map(type => (
                  <label key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: C.bgNeutral, borderRadius: 4, cursor: 'pointer' }}>
                    <input type="checkbox" defaultChecked style={{ width: 16, height: 16 }} />
                    <span style={{ fontSize: 12 }}>{type}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <Button appearance="primary" onClick={onClose}>Save Filters</Button>
              <Button appearance="subtle" onClick={onClose}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}
    </ModalTransition>
  );
}

// ─────────────────────────────────────────────────────────────
// REFRESH DATA MODAL — All Projects + By Project selection
// ─────────────────────────────────────────────────────────────
function RefreshDataModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [mode, setMode] = useState<'all' | 'byProject'>('all');
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set(['BAU', 'LIC', 'OPS']));

  if (!isOpen) return null;

  const canConfirm = confirmPhrase === 'REFRESH JIRA DATA';
  const affectedProjects = mode === 'all'
    ? SAMPLE_JIRA_PROJECTS.filter(p => p.sync_enabled)
    : SAMPLE_JIRA_PROJECTS.filter(p => selectedProjects.has(p.key) && p.sync_enabled);
  const totalRecords = affectedProjects.reduce((sum, p) => sum + (p.issues_cached || 0), 0);

  const toggleProject = (key: string) => {
    setSelectedProjects(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} width="large" testId="refresh-data-modal">
          <div style={{ padding: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: C.textDanger, margin: '0 0 16px 0' }}>
              ⚠ Refresh Data
            </h2>
            <p style={{ fontSize: 14, color: C.textDefault, margin: '0 0 20px 0' }}>
              Refresh Data deletes existing Jira-imported data and reloads it from Jira using configured project mappings and filters.
            </p>

            {/* Mode Selection */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              {[
                { label: 'All Projects', value: 'all' },
                { label: 'Select Projects', value: 'byProject' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setMode(opt.value as any)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: mode === opt.value ? `2px solid ${C.textInfo}` : `1px solid ${C.border}`,
                    background: mode === opt.value ? C.bgInfo : C.bgSurface,
                    color: mode === opt.value ? C.textInfo : C.textDefault,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Project Selection (only in byProject mode) */}
            {mode === 'byProject' && (
              <div style={{ marginBottom: 24, padding: '16px', background: C.bgNeutral, borderRadius: 8 }}>
                <h3 style={{ fontSize: 12, fontWeight: 600, color: C.textDefault, margin: '0 0 12px 0' }}>Select Projects</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {SAMPLE_JIRA_PROJECTS.filter(p => p.sync_enabled).map(p => (
                    <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={selectedProjects.has(p.key)}
                        onChange={() => toggleProject(p.key)}
                        style={{ width: 16, height: 16 }}
                      />
                      <span>{p.icon}</span>
                      <span style={{ fontWeight: 500 }}>{p.key}</span>
                      <span style={{ color: C.textSubtle, fontSize: 11 }}>({p.issues_cached} issues)</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div style={{ background: C.bgDanger, border: `1px solid ${C.textDanger}`, borderRadius: 8, padding: '16px', marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: C.textDanger }}>
                <strong>⚠ WARNING:</strong> This action cannot be undone from this screen. Native Catalyst records not imported from Jira will be preserved.
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: C.textDefault, margin: '0 0 12px 0' }}>Affected Projects</h3>
              <div style={{ fontSize: 12, color: C.textSubtle }}>
                {affectedProjects.map(p => `${p.key} (${p.issues_cached} issues)`).join(', ')} — Total {totalRecords} Jira-origin records
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: C.textDefault, margin: '0 0 12px 0' }}>Active Filters</h3>
              <div style={{ fontSize: 12, color: C.textSubtle }}>
                BAU: All time | LIC: Last 2 months | OPS: Year 2026
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.textDefault, display: 'block', marginBottom: 8 }}>
                Type to confirm: "REFRESH JIRA DATA"
              </label>
              <input
                type="text"
                value={confirmPhrase}
                onChange={e => setConfirmPhrase(e.target.value)}
                placeholder="Type confirmation phrase"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: 'monospace' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <Button appearance="danger" isDisabled={!canConfirm || selectedProjects.size === 0} onClick={onClose}>
                Confirm Refresh
              </Button>
              <Button appearance="subtle" onClick={onClose}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}
    </ModalTransition>
  );
}

function calculateReadiness(projects: any[]) {
  const enabled = projects.filter(p => p.sync_enabled);
  const blockers = enabled.some(p => !p.module_target) ? 1 : 0;
  const score = Math.max(0, 100 - blockers * 50);
  return { score, status: blockers > 0 ? 'blocked' : 'ready' };
}
