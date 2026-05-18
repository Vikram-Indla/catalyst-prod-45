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
                  : token('color.text', 'var(--cp-text-primary, #172B4D)'),
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

// ─── Inventory tab — side-nav + main pane placeholder ────────────────────────

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
          color: token('color.text', 'var(--cp-text-primary, #172B4D)'),
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
              color: token('color.text', 'var(--cp-text-primary, #172B4D)'),
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
                color: token('color.text', 'var(--cp-text-primary, #172B4D)'),
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

// ─── Placeholder panes (Steps 9 + 11) ────────────────────────────────────────

function PlaceholderPane({ step, title }: { step: number; title: string }) {
  return (
    <div
      style={{
        marginTop: token('space.200', '16px'),
        padding: token('space.300', '24px'),
        border: `1px solid ${token('color.border', '#DCDFE4')}`,
        borderRadius: 6,
        background: token('color.background.neutral.subtle', '#F7F8F9'),
        color: token('color.text.subtle', '#44546F'),
        fontSize: 13,
      }}
    >
      {title} — lands in Step {step}.
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
          color: token('color.text', 'var(--cp-text-primary, #172B4D)'),
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
