/**
 * ComponentsAdminPage — /admin/components (v1 layout, 2026-05-17).
 *
 * Read-only inventory + spec + usage map for every component currently
 * rendered in Catalyst. Powered by:
 *   - src/registry/components.registry.ts (curated source of truth)
 *   - src/registry/usage-map.generated.ts (AST scan baseline)
 *
 * Council mandate:
 *   - AdminGuard wrap (CLAUDE.md 2026-05-10)
 *   - Inside admin content area, NOT a parallel sidebar (2026-05-12 P0)
 *   - @atlaskit/* primitives only (2026-05-10)
 *   - ADS tokens only (2026-05-04)
 *
 * Subsequent steps:
 *   - Step 7: ComponentSpecCard (right pane detail)
 *   - Step 8: ComponentLivePreview (light + dark)
 *   - Step 9: ADSViolationsPanel
 *   - Step 10: BannedRegistryPanel (currently inline in this file)
 *   - Step 11: CascadeImpactPanel
 */
import { useMemo, useState } from 'react';
import Heading from '@atlaskit/heading';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import {
  SideNavigation,
  NavigationContent,
  Section,
  HeadingItem,
  ButtonItem,
} from '@atlaskit/side-navigation';
import Lozenge from '@atlaskit/lozenge';
import { token } from '@atlaskit/tokens';

import { AdminGuard } from '@/components/admin/AdminGuard';
import {
  componentsRegistry,
  registryStats,
  type ComponentRegistryEntry,
  type ComponentCategory,
} from '@/registry/components.registry';
import {
  usageMap,
  usageMapStats,
  getAllConsumersByName,
} from '@/registry/usage-map.generated';
import { adsViolationsStats } from '@/registry/ads-violations.generated';
import ComponentSpecCard from './ComponentSpecCard';
import ADSViolationsPanel from './ADSViolationsPanel';
import CascadeImpactPanel from './CascadeImpactPanel';
import PublishTab from './PublishTab';
import HistoryTab from './HistoryTab';

const CATEGORY_LABELS: Record<ComponentCategory, string> = {
  atom: 'Atoms',
  molecule: 'Molecules',
  organism: 'Organisms',
  page: 'Pages',
  pattern: 'Patterns',
};

const CATEGORY_ORDER: ComponentCategory[] = [
  'atom',
  'molecule',
  'organism',
  'page',
  'pattern',
];

// ─── Subtitle stat strip ────────────────────────────────────────────────────

function StatsStrip() {
  const items: Array<{ label: string; value: number; tone?: 'default' | 'banned' | 'observed' }> = [
    { label: 'Canonical', value: registryStats.canonical },
    { label: 'Deprecated', value: registryStats.deprecated, tone: 'observed' },
    { label: 'Banned', value: registryStats.banned, tone: 'banned' },
    { label: 'Atlaskit observed', value: usageMapStats.atlaskit, tone: 'observed' },
    { label: 'Internal observed', value: usageMapStats.internal, tone: 'observed' },
  ];
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: token('space.300', '24px'),
        marginBottom: token('space.200', '16px'),
      }}
    >
      {items.map(item => (
        <div key={item.label} style={{ display: 'flex', flexDirection: 'column', minWidth: 120 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: token('color.text.subtle', '#44546F'),
            }}
          >
            {item.label}
          </span>
          <span
            style={{
              fontSize: 22,
              fontWeight: 600,
              color:
                item.tone === 'banned'
                  ? token('color.text.danger', '#AE2A19')
                  : token('color.text', '#172B4D'),
              marginTop: token('space.050', '4px'),
            }}
          >
            {item.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── AI Intelligence pane ─────────────────────────────────────────────────────

type AiRecAction = 'replace' | 'deprecate' | 'remove' | 'rewrite';
type AiRecUrgency = 'P0' | 'P1' | 'P2';

interface AiRec {
  name: string;
  action: AiRecAction;
  urgency: AiRecUrgency;
  consumers: number;
  reason: string;
  replacement: string | null;
}

const AI_RECS: AiRec[] = [
  // ── P0 — WCAG 2.1 AA failures (hand-rolled menus) ──
  {
    name: 'HierarchyContextMenu',
    action: 'rewrite',
    urgency: 'P0',
    consumers: 1,
    reason: 'Hand-rolled dropdown state (no ARIA, no keyboard nav). WCAG 2.1 AA failure.',
    replacement: '@atlaskit/dropdown-menu',
  },
  {
    name: 'FolderPanel (context menu)',
    action: 'rewrite',
    urgency: 'P0',
    consumers: 1,
    reason: 'Hand-rolled folderContextMenu state. WCAG 2.1 AA failure.',
    replacement: '@atlaskit/dropdown-menu',
  },
  {
    name: 'TestRepositoryPage (context menu)',
    action: 'rewrite',
    urgency: 'P0',
    consumers: 1,
    reason: 'Hand-rolled contextMenu state. WCAG 2.1 AA failure.',
    replacement: '@atlaskit/dropdown-menu',
  },
  // ── P1 — dead files and ADS violations ──
  {
    name: 'dynamic-table (DynamicTable)',
    action: 'remove',
    urgency: 'P1',
    consumers: 1,
    reason: 'Deprecated in registry. Only legacy StoryBacklogPage still uses it.',
    replacement: 'JiraTable',
  },
  {
    name: 'StoryRichTextEditor',
    action: 'remove',
    urgency: 'P1',
    consumers: 0,
    reason: 'Tombstoned 2026-04-20 (exports undefined). Dead file with footgun risk.',
    replacement: 'CanonicalDescriptionField',
  },
  {
    name: 'CatalystMdtRefField',
    action: 'remove',
    urgency: 'P1',
    consumers: 0,
    reason: 'Banned (2026-05-05). File exists in repo — footgun risk for future devs.',
    replacement: null,
  },
  {
    name: 'CatalystAssessmentFeatureField',
    action: 'remove',
    urgency: 'P1',
    consumers: 0,
    reason: 'Banned (2026-05-07). File exists in repo — footgun risk for future devs.',
    replacement: null,
  },
  {
    name: '@/components/ui/button (Radix/shadcn)',
    action: 'deprecate',
    urgency: 'P1',
    consumers: 890,
    reason: 'Radix + Tailwind CSS. Highest-footprint ADS violation in the codebase.',
    replacement: '@atlaskit/button/new',
  },
  {
    name: '@/components/ui/dialog (Radix/shadcn)',
    action: 'deprecate',
    urgency: 'P1',
    consumers: 258,
    reason: 'Radix + Tailwind. ADS violation — use Atlaskit modal instead.',
    replacement: '@atlaskit/modal-dialog',
  },
  {
    name: '@/components/ui/select (Radix/shadcn)',
    action: 'deprecate',
    urgency: 'P1',
    consumers: 296,
    reason: 'Radix + Tailwind. ADS violation — use Atlaskit select instead.',
    replacement: '@atlaskit/select',
  },
  {
    name: '@/components/ui/dropdown-menu (Radix/shadcn)',
    action: 'deprecate',
    urgency: 'P1',
    consumers: 151,
    reason: 'Radix + Tailwind. ADS violation — use Atlaskit dropdown-menu instead.',
    replacement: '@atlaskit/dropdown-menu',
  },
  // ── P2 — deprecated shims ──
  {
    name: 'WorkItemIcon (shim)',
    action: 'remove',
    urgency: 'P2',
    consumers: 4,
    reason: 'Deprecated alias for JiraIssueTypeIcon. ESLint blocks new usages. 4 non-graveyard consumers remain.',
    replacement: 'JiraIssueTypeIcon',
  },
  {
    name: '@/components/ui/StatusLozenge (shim)',
    action: 'remove',
    urgency: 'P2',
    consumers: 22,
    reason: 'Legacy shim wrapping @atlaskit/lozenge. 22 files still import via the shim path.',
    replacement: '@atlaskit/lozenge',
  },
  {
    name: 'ActivityItem (lozenge import path)',
    action: 'rewrite',
    urgency: 'P2',
    consumers: 1,
    reason: "Imports from '../status/Lozenge' — a third import path for the same ADS primitive.",
    replacement: '@atlaskit/lozenge',
  },
];

const AI_ACTION_COLORS: Record<AiRecAction, { bg: string; text: string; label: string }> = {
  replace:   { bg: '#E9F2FF', text: '#0055CC', label: 'Replace' },
  deprecate: { bg: '#FFF7D6', text: '#7F5F01', label: 'Deprecate' },
  remove:    { bg: '#FFEDEB', text: '#AE2A19', label: 'Remove' },
  rewrite:   { bg: '#F3F0FF', text: '#5E4DB2', label: 'Rewrite' },
};

const AI_URGENCY_COLORS: Record<AiRecUrgency, string> = {
  P0: '#AE2A19',
  P1: '#7F5F01',
  P2: '#44546F',
};

function AiRecommendationsPane() {
  const grouped: Record<AiRecUrgency, AiRec[]> = { P0: [], P1: [], P2: [] };
  for (const rec of AI_RECS) grouped[rec.urgency].push(rec);

  const urgencyLabels: Record<AiRecUrgency, string> = {
    P0: 'P0 — Fix before next release (WCAG blockers)',
    P1: 'P1 — Fix in current sprint (ADS violations)',
    P2: 'P2 — Polish backlog (deprecated shims)',
  };

  return (
    <div
      style={{
        marginTop: token('space.200', '16px'),
        display: 'flex',
        flexDirection: 'column',
        gap: token('space.300', '24px'),
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 13,
          color: token('color.text.subtle', '#44546F'),
          lineHeight: '20px',
          maxWidth: 760,
        }}
      >
        AI-driven analysis of component usage across the codebase (AST scan + CLAUDE.md audit).
        Recommendations are classified by urgency — P0 blocks ship, P1 should land this sprint, P2 is polish.
      </p>

      {(['P0', 'P1', 'P2'] as AiRecUrgency[]).map(urgency => (
        <div key={urgency}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: AI_URGENCY_COLORS[urgency],
              marginBottom: token('space.150', '12px'),
              paddingBottom: 6,
              borderBottom: `1px solid ${token('color.border', '#DCDFE4')}`,
            }}
          >
            {urgencyLabels[urgency]} · {grouped[urgency].length} item{grouped[urgency].length === 1 ? '' : 's'}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: token('space.150', '12px'),
            }}
          >
            {grouped[urgency].map(rec => {
              const actionStyle = AI_ACTION_COLORS[rec.action];
              return (
                <div
                  key={rec.name}
                  style={{
                    border: `1px solid ${token('color.border', '#DCDFE4')}`,
                    borderRadius: 6,
                    padding: token('space.150', '12px'),
                    background: token('elevation.surface', '#FFFFFF'),
                  }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 13, flex: 1, color: token('color.text', '#172B4D') }}>
                      {rec.name}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 3,
                        background: actionStyle.bg,
                        color: actionStyle.text,
                        flexShrink: 0,
                      }}
                    >
                      {actionStyle.label}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 8px', fontSize: 12, color: token('color.text.subtle', '#44546F'), lineHeight: '17px' }}>
                    {rec.reason}
                  </p>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: token('color.text.subtlest', '#626F86') }}>
                    <span>
                      {rec.consumers} consumer{rec.consumers === 1 ? '' : 's'}
                    </span>
                    {rec.replacement && (
                      <span>
                        {'→ '}<code style={{ fontFamily: 'ui-monospace, SFMono-Regular, "Menlo", monospace', fontSize: 11 }}>{rec.replacement}</code>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Inventory tab — side-nav + main pane ────────────────────────────────────

/** Short functional context subtitle shown below each sidebar list item */
function getComponentFunctionalContext(entry: ComponentRegistryEntry): string {
  if (entry.atlaskit_package) return entry.atlaskit_package.replace('@atlaskit/', '');
  if (entry.file_path) {
    const p = entry.file_path;
    if (p.includes('/shared/JiraTable/')) return 'Shared › Table';
    if (p.includes('/catalyst-detail-views/shared/')) return 'Issue › Detail › Shared';
    if (p.includes('/catalyst-detail-views/')) return 'Issue › Detail';
    if (p.includes('/shared/')) return 'Shared';
    if (p.includes('/lib/')) return 'Lib';
    if (p.includes('/admin/')) return 'Admin';
  }
  return entry.origin;
}

function StatusBadge({ status }: { status: ComponentRegistryEntry['status'] }) {
  if (status === 'canonical') return <Lozenge appearance="success">Canonical</Lozenge>;
  if (status === 'deprecated') return <Lozenge appearance="moved">Deprecated</Lozenge>;
  if (status === 'banned') return <Lozenge appearance="removed">Banned</Lozenge>;
  return <Lozenge>Observed</Lozenge>;
}

function ComponentListItem({
  entry,
  selected,
  onSelect,
}: {
  entry: ComponentRegistryEntry;
  selected: boolean;
  onSelect: () => void;
}) {
  const consumerCount = getAllConsumersByName(entry.name).length;
  return (
    <ButtonItem
      isSelected={selected}
      onClick={onSelect}
      description={getComponentFunctionalContext(entry)}
      iconAfter={
        <span style={{ fontSize: 11, color: token('color.text.subtle', '#44546F') }}>
          {consumerCount}
        </span>
      }
    >
      {entry.name}
    </ButtonItem>
  );
}

function InventoryPane() {
  const curated = useMemo(
    () => componentsRegistry.filter(e => e.status !== 'banned'),
    [],
  );
  const byCategory = useMemo(() => {
    const map: Record<ComponentCategory, ComponentRegistryEntry[]> = {
      atom: [],
      molecule: [],
      organism: [],
      page: [],
      pattern: [],
    };
    for (const entry of curated) map[entry.category].push(entry);
    for (const cat of CATEGORY_ORDER) {
      map[cat].sort((a, b) => a.name.localeCompare(b.name));
    }
    return map;
  }, [curated]);

  const [selectedId, setSelectedId] = useState<string>(curated[0]?.id ?? '');
  const selected = curated.find(e => e.id === selectedId) ?? curated[0];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '260px 1fr',
        gap: token('space.300', '24px'),
        marginTop: token('space.200', '16px'),
        minHeight: 480,
      }}
    >
      <div
        style={{
          border: `1px solid ${token('color.border', '#DCDFE4')}`,
          borderRadius: 6,
          overflow: 'hidden',
          background: token('color.background.neutral.subtle', '#F7F8F9'),
        }}
      >
        <SideNavigation label="Component categories" testId="components-side-nav">
          <NavigationContent>
            {CATEGORY_ORDER.filter(cat => byCategory[cat].length > 0).map(cat => (
              <Section key={cat}>
                <HeadingItem>
                  {CATEGORY_LABELS[cat]} ({byCategory[cat].length})
                </HeadingItem>
                {byCategory[cat].map(entry => (
                  <ComponentListItem
                    key={entry.id}
                    entry={entry}
                    selected={entry.id === selectedId}
                    onSelect={() => setSelectedId(entry.id)}
                  />
                ))}
              </Section>
            ))}
          </NavigationContent>
        </SideNavigation>
      </div>

      <div
        style={{
          border: `1px solid ${token('color.border', '#DCDFE4')}`,
          borderRadius: 6,
          padding: token('space.300', '24px'),
          background: token('elevation.surface', '#FFFFFF'),
          color: token('color.text', '#172B4D'),
        }}
      >
        {selected ? (
          <ComponentSpecCard entry={selected} />
        ) : (
          <span style={{ color: token('color.text.subtle', '#44546F') }}>
            Select a component on the left to view its spec.
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Banned tab — minimal v1 view (Step 10 expands) ──────────────────────────

function BannedPane() {
  const banned = componentsRegistry.filter(e => e.status === 'banned');
  return (
    <div
      style={{
        marginTop: token('space.200', '16px'),
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
        gap: token('space.200', '16px'),
      }}
    >
      {banned.map(entry => {
        const refs = getAllConsumersByName(entry.name);
        return (
          <div
            key={entry.id}
            style={{
              border: `1px solid ${token('color.border.danger', '#E2483D')}`,
              borderRadius: 6,
              padding: token('space.200', '16px'),
              background: token('color.background.danger', '#FFEDEB'),
              color: token('color.text', '#172B4D'),
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: token('space.100', '8px'),
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 14 }}>{entry.name}</span>
              <Lozenge appearance="removed">Banned</Lozenge>
            </div>
            <div
              style={{
                marginTop: token('space.075', '6px'),
                fontSize: 11,
                color: token('color.text.subtle', '#44546F'),
              }}
            >
              CLAUDE.md anchor: {entry.banned_anchor}
            </div>
            <p
              style={{
                marginTop: token('space.100', '8px'),
                fontSize: 13,
                lineHeight: '18px',
                color: token('color.text', '#172B4D'),
              }}
            >
              {entry.banned_reason}
            </p>
            <div
              style={{
                marginTop: token('space.150', '12px'),
                fontSize: 12,
                color:
                  refs.length === 0
                    ? token('color.text.success', '#216E4E')
                    : token('color.text.danger', '#AE2A19'),
                fontWeight: 600,
              }}
            >
              Live references in Catalyst:{' '}
              {refs.length === 0 ? '0 ✓' : `${refs.length} ⚠ INVESTIGATE`}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ComponentsAdminPage() {
  return (
    <AdminGuard>
      <div
        style={{
          padding: '24px 32px',
          maxWidth: 1400,
          margin: '0 auto',
          color: token('color.text', '#172B4D'),
        }}
      >
        <Heading size="xlarge">Components</Heading>
        <p
          style={{
            marginTop: 0,
            marginBottom: token('space.300', '24px'),
            color: token('color.text.subtle', '#44546F'),
            fontSize: 14,
            lineHeight: '20px',
            maxWidth: 760,
          }}
        >
          Catalyst's component library, built on the Atlassian Design System.
          Browse every primitive currently rendered in Catalyst, see its consumers,
          and review cascade impact before changing a canonical component.
        </p>
        <StatsStrip />

        <Tabs id="components-admin-tabs">
          <TabList>
            <Tab>Inventory ({registryStats.canonical + registryStats.deprecated})</Tab>
            <Tab>Banned ({registryStats.banned})</Tab>
            <Tab>Violations ({adsViolationsStats.total})</Tab>
            <Tab>AI Intelligence ({AI_RECS.length})</Tab>
            <Tab>Cascade</Tab>
            <Tab>Publish</Tab>
            <Tab>History</Tab>
          </TabList>
          <TabPanel>
            <InventoryPane />
          </TabPanel>
          <TabPanel>
            <BannedPane />
          </TabPanel>
          <TabPanel>
            <ADSViolationsPanel />
          </TabPanel>
          <TabPanel>
            <AiRecommendationsPane />
          </TabPanel>
          <TabPanel>
            <CascadeImpactPanel />
          </TabPanel>
          <TabPanel>
            <PublishTab />
          </TabPanel>
          <TabPanel>
            <HistoryTab />
          </TabPanel>
        </Tabs>
      </div>
    </AdminGuard>
  );
}
