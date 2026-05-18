/**
 * componentPreviewFixtures.tsx — Preview renderers for /admin/components.
 *
 * v2 (2026-05-18): Added MockAppProvider so organisms and molecules that need
 * QueryClient / Router context can render live. Network-bound hooks return
 * their empty/loading state — valid preview behaviour.
 *
 * Every fixture is wrapped in an ErrorBoundary at the call site
 * (ComponentLivePreview.tsx), so a crashing fixture shows a red error tile
 * rather than taking down the whole page.
 *
 * Adding a new fixture:
 *   1. Import the component.
 *   2. Add an entry: 'registry-id': () => <MockAppProvider><Comp /></MockAppProvider>
 *   3. Remove its id from DEFERRED_REASONS (or add a new reason if still partial).
 */
import type { ReactNode } from 'react';
import Lozenge from '@atlaskit/lozenge';
import Badge from '@atlaskit/badge';
import { token } from '@atlaskit/tokens';

import { MockAppProvider } from './MockAppProvider';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { CatalystStatusPill } from '@/components/catalyst-detail-views/shared/sections/CatalystStatusPill';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { WatchersChip } from '@/components/catalyst-detail-views/shared/WatchersChip';
import { JiraTable } from '@/components/shared/JiraTable/JiraTable';
import { CatalystKeyDetails } from '@/components/catalyst-detail-views/shared/sections/CatalystKeyDetails';
import { CatalystSidebarDetails } from '@/components/catalyst-detail-views/shared/sections/CatalystSidebarDetails';
import type { Column } from '@/components/shared/JiraTable/types';
import type { PhIssue } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/types';

// ─── Shared mock data ─────────────────────────────────────────────────────────

const MOCK_ISSUE: PhIssue = {
  id: 'preview-1',
  issue_key: 'BAU-1234',
  summary: 'Preview: implement canonical component in backlog table',
  description_adf: null,
  description_text: 'This is a preview-mode issue used to render the component in the admin inventory.',
  status: 'In Progress',
  status_category: 'indeterminate',
  priority: 'Medium',
  issue_type: 'Story',
  parent_key: 'BAU-1000',
  parent_summary: 'Design System Compliance Sprint',
  assignee_account_id: null,
  assignee_display_name: 'Vikram Indla',
  reporter_account_id: null,
  reporter_display_name: 'Amadou Ndiaye',
  project_key: 'BAU',
  fix_versions: null,
  labels: ['design-system', 'canonical'],
  jira_created_at: '2026-05-01T09:00:00Z',
  jira_updated_at: '2026-05-18T12:00:00Z',
  deleted_at: null,
  project_name: 'BAU',
};

interface MockRow {
  id: string;
  key: string;
  summary: string;
  status: string;
  statusCategory: string;
  assignee: string;
  type: string;
}

const MOCK_ROWS: MockRow[] = [
  { id: '1', key: 'BAU-101', summary: 'Add dark-mode token support to JiraTable header', status: 'In Progress', statusCategory: 'indeterminate', assignee: 'Vikram Indla', type: 'Story' },
  { id: '2', key: 'BAU-102', summary: 'Bulk-select footer bar — keyboard trap on Escape', status: 'To Do', statusCategory: 'new', assignee: 'Amadou Ndiaye', type: 'Task' },
  { id: '3', key: 'BAU-103', summary: 'Column reorder: drag handle renders at wrong z-index', status: 'Done', statusCategory: 'done', assignee: 'Sara Patel', type: 'Bug' },
  { id: '4', key: 'BAU-104', summary: 'Inline create row loses focus after first keystroke', status: 'In Review', statusCategory: 'indeterminate', assignee: 'Yazeed Daraz', type: 'Story' },
  { id: '5', key: 'BAU-105', summary: 'Status pill color mismatch in dark mode', status: 'To Do', statusCategory: 'new', assignee: 'Maria Rodriguez', type: 'Bug' },
  { id: '6', key: 'BAU-106', summary: 'Sticky group header overlaps frozen columns on scroll', status: 'Done', statusCategory: 'done', assignee: 'Hiroshi Tanaka', type: 'Task' },
];

const JIRA_TABLE_COLUMNS: Column<MockRow>[] = [
  {
    id: 'key',
    label: 'Key',
    width: 12,
    alwaysVisible: true,
    accessor: r => r.key,
    cell: ({ row }) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <JiraIssueTypeIcon type={row.type} size={14} />
        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, color: token('color.link', '#0C66E4') }}>
          {row.key}
        </span>
      </div>
    ),
  },
  {
    id: 'summary',
    label: 'Summary',
    flex: true,
    alwaysVisible: true,
    accessor: r => r.summary,
    cell: ({ row }) => (
      <span style={{ fontSize: 14, color: token('color.text', '#172B4D') }}>{row.summary}</span>
    ),
  },
  {
    id: 'status',
    label: 'Status',
    width: 14,
    accessor: r => r.status,
    cell: ({ row }) => (
      <CatalystStatusPill status={row.status} statusCategory={row.statusCategory} />
    ),
  },
  {
    id: 'assignee',
    label: 'Assignee',
    width: 14,
    accessor: r => r.assignee,
    cell: ({ row }) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <UserAvatar name={row.assignee} size="small" />
        <span style={{ fontSize: 13, color: token('color.text.subtle', '#44546F') }}>{row.assignee}</span>
      </div>
    ),
  },
];

// ─── Fixtures ─────────────────────────────────────────────────────────────────

export type PreviewFixture = () => ReactNode;

export const previewFixtures: Record<string, PreviewFixture> = {

  // ── Atoms (no context needed) ──────────────────────────────────────────────

  'catalyst-status-pill': () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <CatalystStatusPill status="To Do" statusCategory="new" />
      <CatalystStatusPill status="In Progress" statusCategory="indeterminate" />
      <CatalystStatusPill status="In Review" statusCategory="indeterminate" />
      <CatalystStatusPill status="Done" statusCategory="done" />
      <CatalystStatusPill status="Blocked" statusCategory="new" />
    </div>
  ),

  'jira-issue-type-icon': () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      {['Story', 'Task', 'Bug', 'Epic', 'Feature', 'Production Incident', 'Change Request'].map(type => (
        <div key={type} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <JiraIssueTypeIcon type={type} size={16} />
          <span style={{ fontSize: 11 }}>{type}</span>
        </div>
      ))}
    </div>
  ),

  'user-avatar': () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: token('color.text.subtle', '#44546F'), marginBottom: 8 }}>
          SIZE SCALE
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {(['xsmall', 'small', 'medium', 'large', 'xlarge', 'xxlarge'] as const).map(size => (
            <div key={size} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <UserAvatar name="Vikram Indla" size={size} />
              <span style={{ fontSize: 11, color: token('color.text.subtle', '#44546F') }}>{size}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: token('color.text.subtle', '#44546F'), marginBottom: 8 }}>
          DETERMINISTIC COLOUR INITIALS
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          {['Amadou Ndiaye', 'Vikram Indla', 'Sara Patel', 'Yazeed Daraz', 'Maria Rodriguez', 'Hiroshi Tanaka'].map(name => (
            <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <UserAvatar name={name} size="large" />
              <span style={{ fontSize: 11, color: token('color.text.subtle', '#44546F') }}>{name.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: token('color.text.subtle', '#44546F'), marginBottom: 8 }}>
          COUNTRY FLAG OVERLAY
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          {[
            { name: 'Amadou Ndiaye', country: 'Saudi Arabia' },
            { name: 'Vikram Indla', country: 'India' },
            { name: 'Sara Patel', country: 'UAE' },
            { name: 'Yazeed Daraz', country: 'Jordan' },
            { name: 'Maria Rodriguez', country: 'USA' },
          ].map(({ name, country }) => (
            <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <UserAvatar name={name} country={country} size="large" />
              <span style={{ fontSize: 11, color: token('color.text.subtle', '#44546F') }}>{country}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  ),

  // ── Molecules (need QueryClient) ───────────────────────────────────────────

  'watchers-chip': () => (
    <MockAppProvider>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: token('color.text.subtle', '#44546F') }}>
          WATCHERS CHIP — PREVIEW MODE (Supabase offline → empty watcher list)
        </div>
        <WatchersChip issueKey="BAU-1234" />
      </div>
    </MockAppProvider>
  ),

  // ── Organisms — JiraTable ──────────────────────────────────────────────────

  'jira-table': () => (
    <MockAppProvider>
      <div style={{ fontSize: 11, fontWeight: 600, color: token('color.text.subtle', '#44546F'), marginBottom: 8 }}>
        JIRA TABLE — 6 mock rows · key / summary / status / assignee
      </div>
      <JiraTable<MockRow>
        columns={JIRA_TABLE_COLUMNS}
        data={MOCK_ROWS}
        getRowId={r => r.id}
        selectable
        selection={new Set()}
        onSelectionChange={() => {}}
      />
    </MockAppProvider>
  ),

  // ── Organisms — Detail view sections ──────────────────────────────────────

  'catalyst-key-details': () => (
    <MockAppProvider>
      <div style={{ fontSize: 11, fontWeight: 600, color: token('color.text.subtle', '#44546F'), marginBottom: 8 }}>
        CATALYST KEY DETAILS — mock Story issue · read-only preview (mutations no-op)
      </div>
      <CatalystKeyDetails
        issue={MOCK_ISSUE}
        itemId="preview-1"
        itemType="story"
        projectKey="BAU"
      />
    </MockAppProvider>
  ),

  'catalyst-sidebar-details': () => (
    <MockAppProvider>
      <div style={{ fontSize: 11, fontWeight: 600, color: token('color.text.subtle', '#44546F'), marginBottom: 8 }}>
        CATALYST SIDEBAR DETAILS — mock Story · right-rail fields in read-only preview
      </div>
      <CatalystSidebarDetails
        issue={MOCK_ISSUE}
        itemId="preview-1"
        projectKey="BAU"
        parentSource="story"
        onStatusChange={() => {}}
        onClose={() => {}}
        onDelete={() => {}}
        statusPill={<CatalystStatusPill status="In Progress" statusCategory="indeterminate" />}
      />
    </MockAppProvider>
  ),

  // ── Organisms — CatalystViewBase shell ────────────────────────────────────

  'catalyst-view-base': () => (
    <MockAppProvider>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: token('color.text.subtle', '#44546F') }}>
          CATALYST VIEW BASE — shell layout preview (modal mode, no Supabase)
        </div>
        <div
          style={{
            border: `1px solid ${token('color.border', '#DCDFE4')}`,
            borderRadius: 8,
            overflow: 'hidden',
            background: token('elevation.surface', '#FFFFFF'),
            minHeight: 280,
          }}
        >
          {/* Header bar mock */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: `1px solid ${token('color.border', '#DCDFE4')}`,
              background: token('elevation.surface', '#FFFFFF'),
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <JiraIssueTypeIcon type="Story" size={16} />
              <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, color: token('color.link', '#0C66E4') }}>BAU-1234</span>
              <CatalystStatusPill status="In Progress" statusCategory="indeterminate" />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <WatchersChip issueKey="BAU-1234" />
              <span style={{ fontSize: 12, color: token('color.text.subtle', '#44546F') }}>⋯</span>
            </div>
          </div>
          {/* Body mock — two-column layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 0 }}>
            {/* Left: key details + description */}
            <div style={{ padding: '16px', borderRight: `1px solid ${token('color.border', '#DCDFE4')}` }}>
              <CatalystKeyDetails issue={MOCK_ISSUE} itemId="preview-1" itemType="story" projectKey="BAU" />
            </div>
            {/* Right: sidebar */}
            <div style={{ padding: '16px' }}>
              <CatalystSidebarDetails
                issue={MOCK_ISSUE}
                itemId="preview-1"
                projectKey="BAU"
                parentSource="story"
                onStatusChange={() => {}}
                onClose={() => {}}
                onDelete={() => {}}
                statusPill={<CatalystStatusPill status="In Progress" statusCategory="indeterminate" />}
              />
            </div>
          </div>
        </div>
      </div>
    </MockAppProvider>
  ),
};

/**
 * Per-id explanation for why no fixture ships. Surfaced in the
 * "Preview deferred to v2" placeholder.
 */
export const DEFERRED_REASONS: Record<string, string> = {
  'canonical-description-field': 'Needs Atlaskit ADF Editor context + supabase mock. Deferred — embed via Storybook iframe in v3.',
  'rich-text-editor': 'Heavy Atlaskit Editor bundle (~1.2 MB). Deferred — Storybook iframe in v3.',
  'dynamic-table': 'Deprecated — migrate to JiraTable. No preview planned.',
};

export function hasFixture(id: string): boolean {
  return id in previewFixtures;
}

export function getDeferredReason(id: string): string | undefined {
  return DEFERRED_REASONS[id];
}
