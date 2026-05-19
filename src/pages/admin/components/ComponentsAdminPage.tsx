/**
 * ComponentsAdminPage — /admin/components (v2 layout, 2026-05-18).
 *
 * Redesigned to surface ALL 3,800+ components from usage-map.generated.ts:
 *   - Grouped by functional module (Issue Detail, Backlog & Tables, Kanban…)
 *     instead of ADS category (Atoms/Molecules/Organisms)
 *   - 3-column layout: module nav | component list | detail + action buttons
 *   - Actionable Deprecate / Ban / Mark canonical / Restore buttons with
 *     copy-to-clipboard registry snippets
 *   - AI Intelligence tab has actionable "Apply →" flow per recommendation
 *
 * Council mandate:
 *   - AdminGuard wrap (CLAUDE.md 2026-05-10)
 *   - Inside admin content area, NOT a parallel sidebar (2026-05-12 P0)
 *   - @atlaskit/* primitives only (2026-05-10)
 *   - ADS tokens only (2026-05-04)
 *   - Modals use isOpen guard pattern (no ModalTransition — portal renders empty)
 */
import React, { createContext, useContext, useMemo, useState } from 'react';
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
import Badge from '@atlaskit/badge';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import { token } from '@atlaskit/tokens';

import { AdminGuard } from '@/components/admin/AdminGuard';
import {
  componentsRegistry,
  registryStats,
  type ComponentRegistryEntry,
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
import EpicDescriptionEditorPreview from './previews/EpicDescriptionEditorPreview';
import HistoryTab from './HistoryTab';

// ─── Publish context — lets HubBreakdownPanel switch to Publish tab + pre-fill ─

interface PublishContextValue {
  /** Switch to the Publish tab and pre-fill with this component + route. */
  activatePublish: (componentId: string, route: string) => void;
}
const PublishContext = createContext<PublishContextValue>({ activatePublish: () => {} });

/** Publish tab index (0-indexed). Must stay in sync with TabList order below. */
const PUBLISH_TAB_IDX = 5;

// ─── Types ────────────────────────────────────────────────────────────────────

type ComponentModule =
  | 'All'
  | 'Issue Detail'
  | 'Backlog & Tables'
  | 'Kanban'
  | 'Projects'
  | 'Incidents'
  | 'Resources'
  | 'Admin'
  | 'Shell'
  | 'Shared'
  | 'Atlaskit'
  | 'Other';

type StatusFilter = 'all' | 'canonical' | 'banned' | 'observed';
type ActiveModal = null | 'deprecate' | 'ban' | 'mark-canonical' | 'restore';

interface UnifiedEntry {
  id: string;
  name: string;
  source: string;
  origin: 'atlaskit' | 'internal';
  consumers: string[];
  status: ComponentRegistryEntry['status'] | 'observed';
  module: ComponentModule;
  version?: string;
  file_path?: string;
  jsdoc_excerpt?: string;
  banned_reason?: string;
  banned_anchor?: string;
  deprecation_target?: string;
  feature_flags?: ComponentRegistryEntry['feature_flags'];
  atlaskit_package?: string;
  ads_origin_url?: string;
  tags?: string[];
  dark_light_supported?: boolean;
  registryEntry?: ComponentRegistryEntry;
}

interface AiRec {
  id: string;
  type: 'ban-violation' | 'deprecation-pending' | 'promote-observed';
  severity: 'urgent' | 'high' | 'medium';
  title: string;
  detail: string;
  entry: UnifiedEntry;
  suggestedAction: string;
}

// ─── Module mapping ───────────────────────────────────────────────────────────

const MODULES: ComponentModule[] = [
  'All', 'Issue Detail', 'Backlog & Tables', 'Kanban', 'Projects',
  'Incidents', 'Resources', 'Admin', 'Shell', 'Shared', 'Atlaskit', 'Other',
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'canonical', label: 'Canonical' },
  { value: 'banned', label: 'Banned' },
  { value: 'observed', label: 'Observed' },
];

const OBSERVER_CAP = 60;

// ─── Hub filter types & utilities ─────────────────────────────────────────────

type HubFilter = 'All' | 'Projects' | 'Products' | 'Home' | 'Incidents' | 'Admin';

const HUB_COLORS: Record<string, string> = {
  Projects:  '#0C66E4',
  Products:  '#6E5DC6',
  Home:      '#1F845A',
  Incidents: '#AE2A19',
  Admin:     '#626F86',
  Shared:    '#758195',
  Other:     '#9FADBC',
  Deferred:  '#C7D1DB',
};

const HUB_ORDER = ['Projects', 'Products', 'Home', 'Incidents', 'Admin', 'Shared', 'Other', 'Deferred'];
const ACTIVE_HUBS: HubFilter[] = ['Projects', 'Products', 'Home', 'Incidents', 'Admin'];
const HUB_ROUTES: Record<string, string> = {
  Projects:  '/project-hub',
  Products:  '/products',
  Home:      '/home',
  Incidents: '/incidents',
  Admin:     '/admin',
  Shared:    '/project-hub',
  Other:     '/',
  Deferred:  '/',
};
const REPO_ROOT_ABS = '/Users/vikramindla/Documents/GitHub/catalyst-prod-45';

/** Abbreviates large integers — 3275 → "3.3k" to prevent truncation in 220px nav column. */
function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

/** Map an absolute file path to its Catalyst hub. */
function getHubForFile(filePath: string): string {
  const p = filePath.toLowerCase().replace(/\\/g, '/');
  if (
    p.includes('/project-hub') || p.includes('project-work-hub') ||
    p.includes('/backlog') || p.includes('/allwork') ||
    p.includes('kanbanboard') || p.includes('jiratable') ||
    p.includes('backlogpage') || p.includes('pragmaticboard') ||
    p.includes('uwvtable') || p.includes('inlinecreate')
  ) return 'Projects';
  if (p.includes('/product') || p.includes('producthub') || p.includes('/products/')) return 'Products';
  if (
    p.includes('/home') || p.includes('/dashboard') ||
    p.includes('homepage') || p.includes('for-you') || p.includes('foryou') ||
    p.includes('myr360') || p.includes('r360panel')
  ) return 'Home';
  if (p.includes('/incident') || p.includes('incidenthub') || p.includes('incident-hub')) return 'Incidents';
  if (p.includes('/admin')) return 'Admin';
  if (p.includes('/releases') || p.includes('/test') || p.includes('/wiki')) return 'Deferred';
  if (p.includes('/shared/') || p.includes('shared/')) return 'Shared';
  return 'Other';
}

/** Group a consumer list by hub name. */
function getConsumersByHub(consumers: string[]): Record<string, string[]> {
  const byHub: Record<string, string[]> = {};
  for (const c of consumers) {
    const hub = getHubForFile(c);
    if (!byHub[hub]) byHub[hub] = [];
    byHub[hub].push(c);
  }
  return byHub;
}

function getModule(source: string, filePath?: string): ComponentModule {
  const p = (source + ' ' + (filePath ?? '')).toLowerCase();
  if (source.startsWith('@atlaskit/')) return 'Atlaskit';
  if (
    p.includes('catalyst-detail-view') || p.includes('catalystview') ||
    p.includes('detail-view') || p.includes('detailview') ||
    p.includes('/idea/') || p.includes('/defect/') || p.includes('/epic/') ||
    p.includes('/story/') || p.includes('/task/') || p.includes('/incident/') ||
    p.includes('/change-request/') || p.includes('/business-request/') ||
    p.includes('catalystkeydetails') || p.includes('catalystsidebardetails') ||
    p.includes('catalystviewbase') || p.includes('activitypanel') ||
    p.includes('subtaskspanel') || p.includes('linkedworkitems')
  ) return 'Issue Detail';
  if (
    p.includes('jiratable') || p.includes('/backlog') ||
    p.includes('backlogpage') || p.includes('cells.tsx') ||
    p.includes('editors.tsx') || p.includes('inlinecreate')
  ) return 'Backlog & Tables';
  if (
    p.includes('/kanban') || p.includes('kanbanboard') ||
    p.includes('pragmaticboard') || p.includes('swimlane')
  ) return 'Kanban';
  if (
    p.includes('/projects') || p.includes('allprojects') ||
    p.includes('project-hub') || p.includes('producthub')
  ) return 'Projects';
  if (
    p.includes('incident') || p.includes('incidenthub') ||
    p.includes('incidentlist')
  ) return 'Incidents';
  if (
    p.includes('resource') || p.includes('r360') ||
    p.includes('myr360') || p.includes('capacity')
  ) return 'Resources';
  if (
    p.includes('/admin/') || p.includes('adminpage') ||
    p.includes('adminlayout') || p.includes('adminguard')
  ) return 'Admin';
  if (
    p.includes('shell') || p.includes('navigation') ||
    p.includes('sidebar') || p.includes('globalsearch') ||
    p.includes('layout')
  ) return 'Shell';
  if (
    p.includes('/shared/') || p.includes('shared/') ||
    p.includes('useravatar') || p.includes('catalyst-ds')
  ) return 'Shared';
  return 'Other';
}

// ─── Data builders ────────────────────────────────────────────────────────────

function buildUnifiedEntries(): UnifiedEntry[] {
  const entries: UnifiedEntry[] = [];
  const seenNames = new Map<string, number>(); // name → index in entries

  // 1. Seed with registry entries (canonical authority)
  for (const reg of componentsRegistry) {
    const consumers = getAllConsumersByName(reg.name);
    const module = getModule(reg.file_path ?? reg.atlaskit_package ?? '', reg.file_path);
    entries.push({
      id: reg.id,
      name: reg.name,
      source: reg.atlaskit_package ?? reg.file_path ?? reg.name,
      origin: reg.origin === 'atlaskit' ? 'atlaskit' : 'internal',
      consumers,
      status: reg.status,
      module,
      version: reg.version,
      file_path: reg.file_path,
      jsdoc_excerpt: reg.jsdoc_excerpt,
      banned_reason: reg.banned_reason,
      banned_anchor: reg.banned_anchor,
      deprecation_target: reg.deprecation_target,
      feature_flags: reg.feature_flags,
      atlaskit_package: reg.atlaskit_package,
      ads_origin_url: reg.ads_origin_url,
      tags: reg.tags,
      dark_light_supported: reg.dark_light_supported,
      registryEntry: reg,
    });
    seenNames.set(reg.name, entries.length - 1);
  }

  // 2. Add observed entries from usage-map (dedup by name)
  for (const [name, usageData] of Object.entries(usageMap)) {
    if (seenNames.has(name)) {
      // Already in registry — update consumer list if usage-map has more
      const idx = seenNames.get(name)!;
      if ((usageData as { consumers: string[] }).consumers?.length > entries[idx].consumers.length) {
        entries[idx].consumers = (usageData as { consumers: string[] }).consumers;
      }
      continue;
    }
    const ud = usageData as { source: string; consumers: string[]; filePath?: string };
    const consumers = ud.consumers ?? [];
    const source = ud.source ?? name;
    const module = getModule(source, ud.filePath);
    entries.push({
      id: `observed::${name}`,
      name,
      source,
      origin: source.startsWith('@atlaskit/') ? 'atlaskit' : 'internal',
      consumers,
      status: 'observed',
      module,
    });
    seenNames.set(name, entries.length - 1);
  }

  // Sort: registry first (canonical/deprecated/banned), then observed by consumer count desc
  return entries.sort((a, b) => {
    const aIsRegistry = !!a.registryEntry;
    const bIsRegistry = !!b.registryEntry;
    if (aIsRegistry && !bIsRegistry) return -1;
    if (!aIsRegistry && bIsRegistry) return 1;
    return b.consumers.length - a.consumers.length;
  });
}

function buildAiRecs(entries: UnifiedEntry[]): AiRec[] {
  const recs: AiRec[] = [];

  for (const entry of entries) {
    if (entry.status === 'banned' && entry.consumers.length > 0) {
      recs.push({
        id: `ban-violation::${entry.id}`,
        type: 'ban-violation',
        severity: 'urgent',
        title: `${entry.name} is BANNED but has ${entry.consumers.length} live reference${entry.consumers.length === 1 ? '' : 's'}`,
        detail: entry.banned_reason ?? 'Permanently banned from Catalyst.',
        entry,
        suggestedAction: 'Remove all live references then verify with grep.',
      });
    } else if (entry.status === 'deprecated' && entry.consumers.length >= 3) {
      recs.push({
        id: `deprecation-pending::${entry.id}`,
        type: 'deprecation-pending',
        severity: 'high',
        title: `${entry.name} is deprecated with ${entry.consumers.length} active consumers`,
        detail: entry.deprecation_target
          ? `Migrate all consumers to ${entry.deprecation_target}.`
          : 'No replacement specified — specify a deprecation_target in the registry.',
        entry,
        suggestedAction: entry.deprecation_target
          ? `Replace all ${entry.consumers.length} usages with ${entry.deprecation_target}.`
          : 'Add deprecation_target to the registry entry.',
      });
    } else if (entry.status === 'observed' && entry.consumers.length >= 10) {
      recs.push({
        id: `promote-observed::${entry.id}`,
        type: 'promote-observed',
        severity: 'medium',
        title: `${entry.name} has ${entry.consumers.length} consumers but no registry entry`,
        detail: 'High-usage component not in the curated registry. Consider adding it as canonical or banning it.',
        entry,
        suggestedAction: 'Add to CANONICAL array in components.registry.ts with version, jsdoc_excerpt, and tags.',
      });
    }
  }

  return recs.sort((a, b) => {
    const sev = { urgent: 0, high: 1, medium: 2 };
    return sev[a.severity] - sev[b.severity];
  });
}

// ─── Module-level constants (computed once) ───────────────────────────────────

const ALL_ENTRIES = buildUnifiedEntries();
/** Deprecated entries are permanently hidden — all counts and views use this. */
const ACTIVE_ENTRIES_STATIC = ALL_ENTRIES.filter((e) => e.status !== 'deprecated');
const TOTAL_UNIFIED = ACTIVE_ENTRIES_STATIC.length;
const AI_RECS = buildAiRecs(ACTIVE_ENTRIES_STATIC);

// ─── Status chip ──────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: UnifiedEntry['status'] }) {
  if (status === 'canonical') return <Lozenge appearance="success">Canonical</Lozenge>;
  if (status === 'deprecated') return <Lozenge appearance="moved">Deprecated</Lozenge>;
  if (status === 'banned') return <Lozenge appearance="removed">Banned</Lozenge>;
  return <Lozenge>Observed</Lozenge>;
}

// ─── Inline action panels (replaces ModalDialog — portal system broken in admin context) ───

const PANEL_BASE: React.CSSProperties = {
  marginTop: token('space.200', '16px'),
  borderRadius: 6,
  padding: token('space.200', '16px'),
  fontSize: 13,
};

const SNIPPET_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  background: token('color.background.neutral.subtle', '#F7F8F9'),
  border: `1px solid ${token('color.border', '#DCDFE4')}`,
  borderRadius: 4,
  padding: token('space.150', '12px'),
  overflowX: 'auto',
  fontFamily: 'ui-monospace, "Roboto Mono", monospace',
  marginTop: token('space.150', '12px'),
  whiteSpace: 'pre',
};

// ─── ActionBar ────────────────────────────────────────────────────────────────

function ActionBar({ entry }: { entry: UnifiedEntry }) {
  const [panel, setPanel] = useState<ActiveModal>(null);
  const [banReason, setBanReason] = useState('');
  const [deprecateTarget, setDeprecateTarget] = useState(entry.deprecation_target ?? '');
  const { status } = entry;

  const today = new Date().toISOString().slice(0, 10);

  const banSnippet = `{
  id: '${entry.id.replace('observed::', '')}',
  name: '${entry.name}',
  category: 'molecule', // ← update
  origin: 'feature',
  status: 'banned',
  version: '0.0.0',
  banned_anchor: '${today}',
  banned_reason: '${banReason || 'Permanently banned from Catalyst. Do not re-introduce.'}',
  tags: ['banned'],
},`;

  const deprecateSnippet = `// Find or add id: '${entry.id.replace('observed::', '')}' in CANONICAL array:
  status: 'deprecated',
  deprecation_target: '${deprecateTarget || '<replacement-id>'}',`;

  const canonicalSnippet = `{
  id: '${entry.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}',
  name: '${entry.name}',
  category: 'molecule', // ← update: atom | molecule | organism | page | pattern
  origin: 'shared',     // ← update: atlaskit | catalyst-ds | shared | feature | page
  status: 'canonical',
  version: '1.0.0',
  file_path: '${entry.file_path ?? 'src/components/...'}',
  jsdoc_excerpt: 'Short description.',
  dark_light_supported: true,
  tags: ['add-tags'],
},`;

  const restoreSnippet = `// Find id: '${entry.id}' in components.registry.ts and set:
  status: 'canonical',
  // Remove banned_reason, banned_anchor, deprecation_target.`;

  return (
    <div>
      {/* Button row — native <button> to guarantee onClick fires (Atlaskit Button/new swallows clicks in TabPanel context) */}
      <div
        style={{
          display: 'flex',
          gap: token('space.100', '8px'),
          flexWrap: 'wrap',
          paddingBottom: token('space.150', '12px'),
          borderBottom: `1px solid ${token('color.border', '#DCDFE4')}`,
        }}
      >
        {status === 'observed' && (
          <button
            type="button"
            style={{ padding: '4px 12px', borderRadius: 3, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, background: token('color.background.brand.bold', '#0C66E4'), color: '#fff' }}
            onClick={() => setPanel(panel === 'mark-canonical' ? null : 'mark-canonical')}
          >
            Mark canonical
          </button>
        )}
        {(status === 'canonical' || status === 'observed') && (
          <button
            type="button"
            style={{ padding: '4px 12px', borderRadius: 3, border: `1px solid ${token('color.border', '#DCDFE4')}`, cursor: 'pointer', fontSize: 14, fontWeight: 500, background: token('elevation.surface', '#FFFFFF'), color: token('color.text', '#172B4D') }}
            onClick={() => setPanel(panel === 'deprecate' ? null : 'deprecate')}
          >
            Deprecate →
          </button>
        )}
        {(status === 'deprecated' || status === 'banned') && (
          <button
            type="button"
            style={{ padding: '4px 12px', borderRadius: 3, border: `1px solid ${token('color.border', '#DCDFE4')}`, cursor: 'pointer', fontSize: 14, fontWeight: 500, background: token('elevation.surface', '#FFFFFF'), color: token('color.text', '#172B4D') }}
            onClick={() => setPanel(panel === 'restore' ? null : 'restore')}
          >
            Restore ↑
          </button>
        )}
        {status !== 'banned' && (
          <button
            type="button"
            style={{ padding: '4px 12px', borderRadius: 3, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, background: token('color.background.danger.bold', '#AE2A19'), color: '#fff' }}
            onClick={() => setPanel(panel === 'ban' ? null : 'ban')}
          >
            Ban ✕
          </button>
        )}
      </div>

      {/* Inline action panels — expand below buttons, no portal needed */}

      {panel === 'ban' && (
        <div style={{ ...PANEL_BASE, background: token('color.background.danger', '#FFEDEB'), border: `1px solid ${token('color.border.danger', '#FF8F73')}` }}>
          <div style={{ fontWeight: 600, color: token('color.text.danger', '#AE2A19'), marginBottom: 8 }}>
            Ban {entry.name}
          </div>
          <p style={{ color: token('color.text', '#172B4D'), marginBottom: 12 }}>
            Permanently bans this component. It will appear with a red BANNED badge so future engineers
            cannot re-introduce it.
            {entry.consumers.length > 0 && (
              <span style={{ color: token('color.text.danger', '#AE2A19'), display: 'block', marginTop: 6, fontWeight: 600 }}>
                ⚠ {entry.consumers.length} live reference{entry.consumers.length === 1 ? '' : 's'} must be removed first.
              </span>
            )}
          </p>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: token('color.text', '#172B4D'), marginBottom: 4 }}>
            Ban reason (banned_reason)
          </label>
          <Textfield
            value={banReason}
            onChange={(e) => setBanReason((e.target as HTMLInputElement).value)}
            placeholder="One sentence — why this component must never be used"
          />
          <div style={{ fontSize: 11, fontWeight: 600, color: token('color.text.subtle', '#44546F'), marginTop: 12, marginBottom: 4 }}>
            Add to BANNED array in <code>src/registry/components.registry.ts</code>:
          </div>
          <code style={SNIPPET_STYLE}>{banSnippet}</code>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Button appearance="danger" spacing="compact" onClick={() => { navigator.clipboard.writeText(banSnippet); }}>
              Copy snippet
            </Button>
            <button type="button" style={{ padding: "4px 10px", borderRadius: 3, border: "none", cursor: "pointer", fontSize: 13, background: "transparent", color: "var(--ds-text-subtle, #44546F)" }} onClick={() => setPanel(null)}>Dismiss</button>
          </div>
        </div>
      )}

      {panel === 'deprecate' && (
        <div style={{ ...PANEL_BASE, background: token('color.background.warning', '#FFF7D6'), border: `1px solid ${token('color.border.warning', '#F5CD47')}` }}>
          <div style={{ fontWeight: 600, color: token('color.text.warning', '#7F5F01'), marginBottom: 8 }}>
            Deprecate {entry.name}
          </div>
          <p style={{ color: token('color.text', '#172B4D'), marginBottom: 12 }}>
            Engineers will see a yellow DEPRECATED badge and a migration pointer.
            {entry.consumers.length > 0 && (
              <span style={{ color: token('color.text.warning', '#7F5F01'), display: 'block', marginTop: 6, fontWeight: 600 }}>
                ⚠ {entry.consumers.length} consumer{entry.consumers.length === 1 ? '' : 's'} will need migration.
              </span>
            )}
          </p>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: token('color.text', '#172B4D'), marginBottom: 4 }}>
            Replacement component id (deprecation_target)
          </label>
          <Textfield
            value={deprecateTarget}
            onChange={(e) => setDeprecateTarget((e.target as HTMLInputElement).value)}
            placeholder="e.g. jira-table"
          />
          <code style={SNIPPET_STYLE}>{deprecateSnippet}</code>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Button appearance="warning" spacing="compact" onClick={() => { navigator.clipboard.writeText(deprecateSnippet); }}>
              Copy snippet
            </Button>
            <button type="button" style={{ padding: "4px 10px", borderRadius: 3, border: "none", cursor: "pointer", fontSize: 13, background: "transparent", color: "var(--ds-text-subtle, #44546F)" }} onClick={() => setPanel(null)}>Dismiss</button>
          </div>
        </div>
      )}

      {panel === 'mark-canonical' && (
        <div style={{ ...PANEL_BASE, background: token('color.background.success', '#DFFCF0'), border: `1px solid ${token('color.border.success', '#4BCE97')}` }}>
          <div style={{ fontWeight: 600, color: token('color.text.success', '#216E4E'), marginBottom: 8 }}>
            Mark {entry.name} as canonical
          </div>
          <p style={{ color: token('color.text', '#172B4D'), marginBottom: 12 }}>
            Promotes this component to canonical status — green badge, standard for its use case.
            Copy the snippet below and add it to the CANONICAL array, updating the fields marked ← update.
          </p>
          <code style={SNIPPET_STYLE}>{canonicalSnippet}</code>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Button appearance="primary" spacing="compact" onClick={() => { navigator.clipboard.writeText(canonicalSnippet); }}>
              Copy snippet
            </Button>
            <button type="button" style={{ padding: "4px 10px", borderRadius: 3, border: "none", cursor: "pointer", fontSize: 13, background: "transparent", color: "var(--ds-text-subtle, #44546F)" }} onClick={() => setPanel(null)}>Dismiss</button>
          </div>
        </div>
      )}

      {panel === 'restore' && (
        <div style={{ ...PANEL_BASE, background: token('color.background.neutral.subtle', '#F7F8F9'), border: `1px solid ${token('color.border', '#DCDFE4')}` }}>
          <div style={{ fontWeight: 600, color: token('color.text', '#172B4D'), marginBottom: 8 }}>
            Restore {entry.name}
          </div>
          <p style={{ color: token('color.text', '#172B4D'), marginBottom: 12 }}>
            Restore from <strong>{entry.status}</strong> to canonical status.
            {entry.status === 'banned' && (
              <span style={{ color: token('color.text.danger', '#AE2A19'), display: 'block', marginTop: 6, fontWeight: 600 }}>
                ⚠ Restoring a banned component requires Vikram's explicit approval.
              </span>
            )}
          </p>
          <code style={SNIPPET_STYLE}>{restoreSnippet}</code>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Button appearance="default" spacing="compact" onClick={() => { navigator.clipboard.writeText(restoreSnippet); }}>
              Copy snippet
            </Button>
            <button type="button" style={{ padding: "4px 10px", borderRadius: 3, border: "none", cursor: "pointer", fontSize: 13, background: "transparent", color: "var(--ds-text-subtle, #44546F)" }} onClick={() => setPanel(null)}>Dismiss</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── HubBreakdownPanel ────────────────────────────────────────────────────────
// Renders per-hub publish panels with VSCode file links, test plan snippet,
// copy button, and direct "Open [Hub] ↗" link. Zero static text — every row
// has a "Publish to X →" action.

function HubBreakdownPanel({ entry }: { entry: UnifiedEntry }) {
  const { activatePublish } = useContext(PublishContext);
  const [openHub, setOpenHub] = useState<string | null>(null);
  const byHub = useMemo(() => getConsumersByHub(entry.consumers), [entry.consumers]);

  const hubEntries = Object.entries(byHub)
    .filter(([, files]) => files.length > 0)
    .sort(([a], [b]) => HUB_ORDER.indexOf(a) - HUB_ORDER.indexOf(b));

  if (hubEntries.length === 0) return null;

  return (
    <div style={{ marginBottom: token('space.300', '24px') }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: token('space.100', '8px'),
          marginBottom: token('space.100', '8px'),
        }}
      >
        <Heading size="xsmall">Hub breakdown</Heading>
        <span style={{ fontSize: 11, color: token('color.text.subtlest', '#626F86') }}>
          {hubEntries.length} hub{hubEntries.length === 1 ? '' : 's'} · tap to publish targeted
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: token('space.075', '6px') }}>
        {hubEntries.map(([hub, files]) => {
          const isOpen = openHub === hub;
          const color = HUB_COLORS[hub] ?? '#9FADBC';
          const route = HUB_ROUTES[hub] ?? '/';
          const isDeferred = hub === 'Deferred';

          const testPlan = [
            `# ${entry.name} — ${hub} Hub Test Plan`,
            `# Generated: ${new Date().toISOString().slice(0, 10)}`,
            `# Source: ${entry.source}`,
            `# Consumers in ${hub}: ${files.length}`,
            '',
            '## Open each consumer in VSCode',
            ...files.map((f) => `# vscode://file/${REPO_ROOT_ABS}/${f}`),
            '',
            '## Grep to verify usage',
            `grep -r "${entry.name}" src/ --include="*.tsx" --include="*.ts" -l`,
            '',
            '## Navigate to hub for visual verification',
            `# http://localhost:8080${route}`,
          ].join('\n');

          return (
            <div
              key={hub}
              style={{
                border: `1px solid ${isOpen ? color : token('color.border', '#DCDFE4')}`,
                borderRadius: 6,
                overflow: 'hidden',
              }}
            >
              {/* Hub row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: token('space.100', '8px'),
                  padding: `${token('space.075', '6px')} ${token('space.150', '12px')}`,
                  background: isOpen ? `${color}18` : 'transparent',
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: color,
                    flexShrink: 0,
                    display: 'inline-block',
                  }}
                />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: token('color.text', '#172B4D'),
                    flex: 1,
                  }}
                >
                  {hub}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: token('color.text.subtlest', '#626F86'),
                    marginRight: token('space.075', '6px'),
                  }}
                >
                  {files.length} file{files.length === 1 ? '' : 's'}
                </span>
                {isDeferred ? (
                  <span
                    style={{
                      fontSize: 11,
                      color: token('color.text.disabled', '#8590A2'),
                      fontStyle: 'italic',
                    }}
                  >
                    Deferred
                  </span>
                ) : (
                  <button
                    type="button"
                    style={{
                      padding: '3px 10px',
                      borderRadius: 3,
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                      background: isOpen ? color : `${color}22`,
                      color: isOpen ? '#fff' : color,
                    }}
                    onClick={() => setOpenHub(isOpen ? null : hub)}
                  >
                    {isOpen ? 'Close ✕' : `Publish to ${hub} →`}
                  </button>
                )}
              </div>

              {/* Expanded publish panel */}
              {isOpen && (
                <div
                  style={{
                    padding: token('space.150', '12px'),
                    borderTop: `1px solid ${token('color.border', '#DCDFE4')}`,
                    background: token('color.background.neutral.subtle', '#F7F8F9'),
                  }}
                >
                  {/* File list with hub dots */}
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: token('color.text.subtlest', '#626F86'),
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      marginBottom: token('space.075', '6px'),
                    }}
                  >
                    {files.length} consumer{files.length === 1 ? '' : 's'} in {hub}
                  </div>
                  <ul
                    style={{
                      margin: 0,
                      padding: 0,
                      listStyle: 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 3,
                      marginBottom: token('space.150', '12px'),
                    }}
                  >
                    {files.map((f) => (
                      <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: color,
                            flexShrink: 0,
                            display: 'inline-block',
                          }}
                        />
                        <a
                          href={`vscode://file/${REPO_ROOT_ABS}/${f}`}
                          style={{
                            color: token('color.link', '#0C66E4'),
                            textDecoration: 'none',
                            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                            fontSize: 11,
                          }}
                        >
                          {f}
                        </a>
                      </li>
                    ))}
                  </ul>

                  {/* Test plan snippet */}
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: token('color.text.subtlest', '#626F86'),
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      marginBottom: 4,
                    }}
                  >
                    Test plan
                  </div>
                  <code style={{ ...SNIPPET_STYLE, fontSize: 11 }}>{testPlan}</code>

                  {/* Actions — no static text, all are clickable */}
                  <div
                    style={{
                      display: 'flex',
                      gap: token('space.100', '8px'),
                      marginTop: token('space.150', '12px'),
                      flexWrap: 'wrap',
                      alignItems: 'center',
                    }}
                  >
                    <button
                      type="button"
                      style={{
                        padding: '4px 12px',
                        borderRadius: 3,
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                        background: color,
                        color: '#fff',
                      }}
                      onClick={() => navigator.clipboard.writeText(testPlan)}
                    >
                      Copy test plan
                    </button>
                    {entry.registryEntry && (
                      <button
                        type="button"
                        style={{
                          padding: '4px 12px',
                          borderRadius: 3,
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 600,
                          background: `${color}22`,
                          color,
                        }}
                        onClick={() => {
                          activatePublish(entry.id, route);
                          setOpenHub(null);
                        }}
                      >
                        Publish to {hub} tab →
                      </button>
                    )}
                    <a
                      href={`http://localhost:8080${route}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: '4px 12px',
                        borderRadius: 3,
                        border: `1px solid ${color}`,
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                        background: 'transparent',
                        color,
                        textDecoration: 'none',
                        display: 'inline-block',
                      }}
                    >
                      Open {hub} ↗
                    </a>
                    <button
                      type="button"
                      style={{
                        padding: '4px 10px',
                        borderRadius: 3,
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 12,
                        background: 'transparent',
                        color: token('color.text.subtle', '#44546F'),
                      }}
                      onClick={() => setOpenHub(null)}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── ObservedEntryDetail ──────────────────────────────────────────────────────

function ObservedEntryDetail({ entry }: { entry: UnifiedEntry }) {
  const [expanded, setExpanded] = useState(false);
  const LIMIT = 10;
  const visible = expanded ? entry.consumers : entry.consumers.slice(0, LIMIT);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: token('space.300', '24px') }}>
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: token('space.150', '12px'),
            flexWrap: 'wrap',
          }}
        >
          <Heading size="large">{entry.name}</Heading>
          <StatusChip status={entry.status} />
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 3,
              background: token('color.background.neutral', '#091E420F'),
              color: token('color.text.subtle', '#44546F'),
            }}
          >
            {entry.origin === 'atlaskit' ? 'Atlaskit' : 'Internal'}
          </span>
        </div>
        <div
          style={{
            marginTop: token('space.100', '8px'),
            fontSize: 12,
            fontFamily: 'ui-monospace, SFMono-Regular, "Menlo", monospace',
            color: token('color.text.subtle', '#44546F'),
          }}
        >
          {entry.source}
        </div>
        <p
          style={{
            marginTop: token('space.150', '12px'),
            fontSize: 13,
            color: token('color.text.subtle', '#44546F'),
            fontStyle: 'italic',
          }}
        >
          AST-observed component — no curated spec yet. Use "Mark canonical" or "Ban ✕" above to add it to the registry.
        </p>
      </div>

      {entry.consumers.length > 0 && (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: token('space.100', '8px'),
              marginBottom: token('space.100', '8px'),
            }}
          >
            <Heading size="xsmall">Consumers</Heading>
            <Badge>{entry.consumers.length}</Badge>
          </div>
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: token('space.050', '4px'),
            }}
          >
            {visible.map((path) => {
              const hub = getHubForFile(path);
              const hubColor = HUB_COLORS[hub] ?? '#9FADBC';
              return (
                <li key={path} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    title={hub}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: hubColor,
                      flexShrink: 0,
                      display: 'inline-block',
                    }}
                  />
                  <a
                    href={`vscode://file/${path}`}
                    style={{
                      color: token('color.link', '#0C66E4'),
                      textDecoration: 'none',
                      fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                      fontSize: 12,
                    }}
                  >
                    {path}
                  </a>
                </li>
              );
            })}
          </ul>
          {entry.consumers.length > LIMIT && (
            <div style={{ marginTop: token('space.150', '12px') }}>
              <Button appearance="subtle" spacing="compact" onClick={() => setExpanded((p) => !p)}>
                {expanded ? `Collapse to top ${LIMIT}` : `Show all ${entry.consumers.length} consumers`}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Stats strip ──────────────────────────────────────────────────────────────

function StatsStrip() {
  return (
    <div
      style={{
        display: 'flex',
        gap: token('space.400', '32px'),
        marginBottom: token('space.300', '24px'),
        flexWrap: 'wrap',
      }}
    >
      {[
        { label: 'Total components', value: TOTAL_UNIFIED },
        { label: 'Canonical', value: registryStats.canonical },
        { label: 'Banned', value: registryStats.banned, danger: true },
        { label: 'Atlaskit observed', value: usageMapStats?.atlaskit ?? 0 },
        { label: 'Internal observed', value: usageMapStats?.internal ?? 0 },
      ].map((item) => (
        <div key={item.label}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: token('color.text.subtlest', '#626F86'),
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: 4,
            }}
          >
            {item.label}
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: (item as { danger?: boolean }).danger
                ? token('color.text.danger', '#AE2A19')
                : token('color.text', '#172B4D'),
              lineHeight: 1,
            }}
          >
            {item.value.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Inventory pane ───────────────────────────────────────────────────────────

function InventoryPane() {
  const [activeModule, setActiveModule] = useState<ComponentModule>('All');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [hubFilter, setHubFilter] = useState<HubFilter>('All');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string>(ACTIVE_ENTRIES_STATIC[0]?.id ?? '');

  /** Module counts (static — never changes at runtime). */
  const moduleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of MODULES) {
      counts[m] = m === 'All' ? ACTIVE_ENTRIES_STATIC.length : ACTIVE_ENTRIES_STATIC.filter((e) => e.module === m).length;
    }
    return counts;
  }, []);

  /** Per-hub counts: how many entries have ≥1 consumer in each hub. */
  const hubCounts = useMemo(() => {
    const counts: Record<string, number> = { All: ACTIVE_ENTRIES_STATIC.length };
    for (const hub of ACTIVE_HUBS) {
      counts[hub] = ACTIVE_ENTRIES_STATIC.filter((e) =>
        e.consumers.some((c) => getHubForFile(c) === hub),
      ).length;
    }
    return counts;
  }, []);

  const filtered = useMemo(() => {
    const isSearching = search.trim().length > 0;
    // Deprecated components are permanently hidden — no visibility anywhere
    let pool = [...ACTIVE_ENTRIES_STATIC];

    if (activeModule !== 'All') {
      pool = pool.filter((e) => e.module === activeModule);
    }
    if (statusFilter !== 'all') {
      pool = pool.filter((e) => e.status === statusFilter);
    }
    if (hubFilter !== 'All') {
      // Keep entries that have at least one consumer in the selected hub
      pool = pool.filter((e) =>
        e.consumers.some((c) => getHubForFile(c) === hubFilter),
      );
    }
    if (isSearching) {
      const q = search.toLowerCase();
      pool = pool.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.source.toLowerCase().includes(q) ||
          (e.tags ?? []).some((t) => t.toLowerCase().includes(q)),
      );
    } else {
      // Cap observed to avoid rendering 3,000+ rows without search
      const registry = pool.filter((e) => e.status !== 'observed');
      const observed = pool.filter((e) => e.status === 'observed').slice(0, OBSERVER_CAP);
      pool = [...registry, ...observed];
    }

    return pool;
  }, [activeModule, statusFilter, hubFilter, search]);

  const selectedEntry = useMemo(
    () => filtered.find((e) => e.id === selectedId) ?? filtered[0],
    [filtered, selectedId],
  );

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '240px 300px 1fr',
        gap: 0,
        border: `1px solid ${token('color.border', '#DCDFE4')}`,
        borderRadius: 8,
        overflow: 'hidden',
        minHeight: 600,
        background: token('elevation.surface', '#FFFFFF'),
      }}
    >
      {/* Column 1 — Module + Status + Hub nav (240px — k-notation avoids truncation) */}
      <div
        style={{
          borderRight: `1px solid ${token('color.border', '#DCDFE4')}`,
          background: token('color.background.neutral.subtle', '#F7F8F9'),
          overflowY: 'auto',
        }}
      >
        <SideNavigation label="Component filters" testId="components-module-nav">
          <NavigationContent>
            {/* ── Module section ── */}
            <Section>
              <HeadingItem>Module</HeadingItem>
              {MODULES.map((m) => (
                <ButtonItem
                  key={m}
                  isSelected={activeModule === m}
                  onClick={() => {
                    setActiveModule(m);
                    setSelectedId('');
                  }}
                  iconAfter={
                    <span style={{ fontSize: 11, color: token('color.text.subtlest', '#626F86') }}>
                      {formatCount(moduleCounts[m])}
                    </span>
                  }
                >
                  {m}
                </ButtonItem>
              ))}
            </Section>

            {/* ── Status section ── */}
            <Section>
              <HeadingItem>Status</HeadingItem>
              {STATUS_OPTIONS.map((opt) => (
                <ButtonItem
                  key={opt.value}
                  isSelected={statusFilter === opt.value}
                  onClick={() => {
                    setStatusFilter(opt.value);
                    setSelectedId('');
                  }}
                >
                  {opt.label}
                </ButtonItem>
              ))}
            </Section>

            {/* ── Hub section — active hubs are clickable; deferred are labeled ── */}
            <Section>
              <HeadingItem>Hub</HeadingItem>
              <ButtonItem
                isSelected={hubFilter === 'All'}
                onClick={() => { setHubFilter('All'); setSelectedId(''); }}
                iconAfter={
                  <span style={{ fontSize: 11, color: token('color.text.subtlest', '#626F86') }}>
                    {formatCount(ACTIVE_ENTRIES_STATIC.length)}
                  </span>
                }
              >
                All hubs
              </ButtonItem>
              {ACTIVE_HUBS.map((hub) => (
                <ButtonItem
                  key={hub}
                  isSelected={hubFilter === hub}
                  onClick={() => {
                    setHubFilter(hubFilter === hub ? 'All' : hub);
                    setSelectedId('');
                  }}
                  iconAfter={
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: HUB_COLORS[hub],
                          display: 'inline-block',
                        }}
                      />
                      <span style={{ fontSize: 11, color: token('color.text.subtlest', '#626F86') }}>
                        {formatCount(hubCounts[hub] ?? 0)}
                      </span>
                    </span>
                  }
                >
                  {hub}
                </ButtonItem>
              ))}
              {/* Deferred hubs — visible but disabled */}
              <ButtonItem
                isDisabled
                iconAfter={
                  <span style={{ fontSize: 10, color: token('color.text.disabled', '#8590A2'), fontStyle: 'italic' }}>
                    soon
                  </span>
                }
              >
                Releases / Test / Wiki
              </ButtonItem>
            </Section>
          </NavigationContent>
        </SideNavigation>
      </div>

      {/* Column 2 — Component list */}
      <div
        style={{
          borderRight: `1px solid ${token('color.border', '#DCDFE4')}`,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            padding: token('space.100', '8px'),
            borderBottom: `1px solid ${token('color.border', '#DCDFE4')}`,
          }}
        >
          <Textfield
            value={search}
            onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
            placeholder={`Search ${TOTAL_UNIFIED.toLocaleString()} components...`}
            aria-label="Search components"
          />
        </div>
        {/* Active filters summary — actionable clear buttons */}
        {(activeModule !== 'All' || statusFilter !== 'all' || hubFilter !== 'All') && (
          <div
            style={{
              padding: `${token('space.075', '6px')} ${token('space.100', '8px')}`,
              borderBottom: `1px solid ${token('color.border', '#DCDFE4')}`,
              display: 'flex',
              gap: 4,
              flexWrap: 'wrap',
              background: token('color.background.neutral.subtle', '#F7F8F9'),
            }}
          >
            {activeModule !== 'All' && (
              <button
                type="button"
                style={{
                  padding: '2px 8px',
                  borderRadius: 12,
                  border: `1px solid ${token('color.border', '#DCDFE4')}`,
                  background: token('color.background.neutral', '#091E420F'),
                  fontSize: 11,
                  cursor: 'pointer',
                  color: token('color.text', '#172B4D'),
                }}
                onClick={() => { setActiveModule('All'); setSelectedId(''); }}
              >
                {activeModule} ✕
              </button>
            )}
            {statusFilter !== 'all' && (
              <button
                type="button"
                style={{
                  padding: '2px 8px',
                  borderRadius: 12,
                  border: `1px solid ${token('color.border', '#DCDFE4')}`,
                  background: token('color.background.neutral', '#091E420F'),
                  fontSize: 11,
                  cursor: 'pointer',
                  color: token('color.text', '#172B4D'),
                }}
                onClick={() => { setStatusFilter('all'); setSelectedId(''); }}
              >
                {statusFilter} ✕
              </button>
            )}
            {hubFilter !== 'All' && (
              <button
                type="button"
                style={{
                  padding: '2px 8px',
                  borderRadius: 12,
                  border: `1px solid ${HUB_COLORS[hubFilter] ?? token('color.border', '#DCDFE4')}`,
                  background: `${HUB_COLORS[hubFilter] ?? '#0C66E4'}18`,
                  fontSize: 11,
                  cursor: 'pointer',
                  color: HUB_COLORS[hubFilter] ?? token('color.text', '#172B4D'),
                  fontWeight: 600,
                }}
                onClick={() => { setHubFilter('All'); setSelectedId(''); }}
              >
                {hubFilter} ✕
              </button>
            )}
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div
              style={{
                padding: token('space.300', '24px'),
                color: token('color.text.subtle', '#44546F'),
                fontSize: 13,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 8 }}>No components match your filters.</div>
              <button
                type="button"
                style={{
                  padding: '4px 12px',
                  borderRadius: 3,
                  border: `1px solid ${token('color.border', '#DCDFE4')}`,
                  background: token('elevation.surface', '#FFFFFF'),
                  cursor: 'pointer',
                  fontSize: 12,
                  color: token('color.text', '#172B4D'),
                }}
                onClick={() => {
                  setActiveModule('All');
                  setStatusFilter('all');
                  setHubFilter('All');
                  setSearch('');
                }}
              >
                Clear all filters
              </button>
            </div>
          ) : (
            filtered.map((entry) => {
              const topHub = Object.entries(getConsumersByHub(entry.consumers))
                .sort(([a], [b]) => HUB_ORDER.indexOf(a) - HUB_ORDER.indexOf(b))[0]?.[0];
              return (
                <button
                  key={entry.id}
                  onClick={() => setSelectedId(entry.id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: `${token('space.100', '8px')} ${token('space.150', '12px')}`,
                    border: 'none',
                    borderBottom: `1px solid ${token('color.border.subtle', '#F1F2F4')}`,
                    background:
                      selectedId === entry.id
                        ? token('color.background.selected', '#E9F2FF')
                        : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: selectedId === entry.id ? 600 : 400,
                        color: token('color.text', '#172B4D'),
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                      }}
                    >
                      {entry.name}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      {topHub && (
                        <span
                          title={topHub}
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: HUB_COLORS[topHub] ?? '#9FADBC',
                            display: 'inline-block',
                          }}
                        />
                      )}
                      {entry.consumers.length > 0 && (
                        <span style={{ fontSize: 11, color: token('color.text.subtlest', '#626F86') }}>
                          {formatCount(entry.consumers.length)}×
                        </span>
                      )}
                    </span>
                  </div>
                  <StatusChip status={entry.status} />
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Column 3 — Detail + hub breakdown + actions */}
      <div style={{ overflowY: 'auto', padding: token('space.300', '24px') }}>
        {selectedEntry ? (
          <>
            <ActionBar entry={selectedEntry} />
            <HubBreakdownPanel entry={selectedEntry} />
            {selectedEntry.registryEntry?.name === 'EpicDescriptionEditor' ? (
              <EpicDescriptionEditorPreview />
            ) : selectedEntry.registryEntry ? (
              <ComponentSpecCard entry={selectedEntry.registryEntry} />
            ) : (
              <ObservedEntryDetail entry={selectedEntry} />
            )}
          </>
        ) : (
          <div
            style={{
              color: token('color.text.subtle', '#44546F'),
              fontSize: 13,
              paddingTop: token('space.200', '16px'),
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 8 }}>No component selected.</div>
            <button
              type="button"
              style={{
                padding: '4px 12px',
                borderRadius: 3,
                border: `1px solid ${token('color.border', '#DCDFE4')}`,
                background: token('elevation.surface', '#FFFFFF'),
                cursor: 'pointer',
                fontSize: 12,
                color: token('color.text', '#172B4D'),
              }}
              onClick={() => setSelectedId(ACTIVE_ENTRIES_STATIC[0]?.id ?? '')}
            >
              Select first component
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Banned registry panel ────────────────────────────────────────────────────

function BannedRegistryPanel() {
  const banned = componentsRegistry.filter((e) => e.status === 'banned');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: token('space.200', '16px') }}>
      {banned.map((entry) => (
        <div
          key={entry.id}
          style={{
            padding: token('space.200', '16px'),
            border: `1px solid ${token('color.border.danger', '#FF8F73')}`,
            borderRadius: 6,
            background: token('color.background.danger', '#FFEDEB'),
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: token('space.100', '8px'),
              marginBottom: token('space.100', '8px'),
            }}
          >
            <strong style={{ fontSize: 14, color: token('color.text.danger', '#AE2A19') }}>
              {entry.name}
            </strong>
            <Lozenge appearance="removed">Banned</Lozenge>
            {entry.banned_anchor && (
              <span style={{ fontSize: 11, color: token('color.text.subtle', '#44546F') }}>
                {entry.banned_anchor}
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: 13, color: token('color.text', '#172B4D') }}>
            {entry.banned_reason}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── AI Recommendations pane ─────────────────────────────────────────────────

// ApplyPanel — inline (no portal, replaces ModalDialog)
function ApplyPanel({ rec, onClose }: { rec: AiRec; onClose: () => void }) {
  const snippet =
    rec.type === 'ban-violation'
      ? `// Remove all references to "${rec.entry.name}" from:\n${rec.entry.consumers.map((c) => `//   ${c}`).join('\n')}\n// Then: grep -r "${rec.entry.name}" src/ should return 0 results.`
      : rec.type === 'deprecation-pending' && rec.entry.deprecation_target
      ? `// Replace all usages of ${rec.entry.name} with ${rec.entry.deprecation_target}:\n${rec.entry.consumers.map((c) => `//   ${c}`).join('\n')}`
      : `// Add to CANONICAL array in src/registry/components.registry.ts:\n{\n  id: '${rec.entry.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}',\n  name: '${rec.entry.name}',\n  status: 'canonical',\n  version: '1.0.0',\n}`;

  const bg = rec.severity === 'urgent'
    ? token('color.background.danger', '#FFEDEB')
    : rec.severity === 'high'
    ? token('color.background.warning', '#FFF7D6')
    : token('color.background.neutral.subtle', '#F7F8F9');

  const border = rec.severity === 'urgent'
    ? `1px solid ${token('color.border.danger', '#FF8F73')}`
    : rec.severity === 'high'
    ? `1px solid ${token('color.border.warning', '#F5CD47')}`
    : `1px solid ${token('color.border', '#DCDFE4')}`;

  return (
    <div style={{ ...PANEL_BASE, background: bg, border, marginBottom: token('space.200', '16px') }}>
      <div style={{ fontWeight: 600, color: token('color.text', '#172B4D'), marginBottom: 6 }}>
        Apply: {rec.title}
      </div>
      <p style={{ color: token('color.text', '#172B4D'), marginBottom: 8 }}>{rec.detail}</p>
      <div style={{ fontSize: 12, fontWeight: 600, color: token('color.text.subtle', '#44546F'), marginBottom: 4 }}>
        Action: {rec.suggestedAction}
      </div>
      <code style={SNIPPET_STYLE}>{snippet}</code>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <Button appearance="primary" spacing="compact" onClick={() => { navigator.clipboard.writeText(snippet); }}>
          Copy steps
        </Button>
        <Button appearance="subtle" spacing="compact" onClick={onClose}>Dismiss</Button>
      </div>
    </div>
  );
}

function AiRecommendationsPane() {
  const [applyRec, setApplyRec] = useState<AiRec | null>(null);
  const [expandedRec, setExpandedRec] = useState<string | null>(null);
  const [appliedRecs, setAppliedRecs] = useState<Set<string>>(new Set());

  const severityColor = {
    urgent: token('color.text.danger', '#AE2A19'),
    high: token('color.text.warning', '#7F5F01'),
    medium: token('color.text', '#172B4D'),
  };

  const severityBg = {
    urgent: token('color.background.danger', '#FFEDEB'),
    high: token('color.background.warning', '#FFF7D6'),
    medium: token('color.background.neutral.subtle', '#F7F8F9'),
  };

  const severityBorder = {
    urgent: token('color.border.danger', '#FF8F73'),
    high: token('color.border.warning', '#F5CD47'),
    medium: token('color.border', '#DCDFE4'),
  };

  if (AI_RECS.length === 0) {
    return (
      <div
        style={{
          padding: token('space.400', '32px'),
          textAlign: 'center',
          color: token('color.text.subtle', '#44546F'),
        }}
      >
        <div style={{ fontSize: 32, marginBottom: token('space.200', '16px') }}>✅</div>
        <Heading size="medium">No recommendations</Heading>
        <p style={{ marginTop: token('space.100', '8px'), fontSize: 14 }}>
          No banned components with live references, no high-consumer deprecated components.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: token('space.200', '16px') }}>
      {AI_RECS.map((rec) => {
        const isApplied = appliedRecs.has(rec.id);
        const isExpanded = expandedRec === rec.id;

        return (
          <div
            key={rec.id}
            style={{
              border: `1px solid ${isApplied ? token('color.border.success', '#4BCE97') : severityBorder[rec.severity]}`,
              borderRadius: 6,
              background: isApplied ? token('color.background.success', '#DFFCF0') : severityBg[rec.severity],
              opacity: isApplied ? 0.7 : 1,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                padding: token('space.200', '16px'),
                gap: token('space.200', '16px'),
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: token('space.100', '8px'),
                    marginBottom: token('space.075', '6px'),
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: isApplied ? token('color.text.success', '#216E4E') : severityColor[rec.severity],
                      letterSpacing: '0.05em',
                    }}
                  >
                    {isApplied ? '✅ Applied' : rec.severity}
                  </span>
                  <Lozenge appearance={rec.type === 'ban-violation' ? 'removed' : rec.type === 'deprecation-pending' ? 'moved' : 'inprogress'}>
                    {rec.type === 'ban-violation' ? 'Ban violation' : rec.type === 'deprecation-pending' ? 'Deprecation' : 'Promote'}
                  </Lozenge>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: token('color.text', '#172B4D') }}>
                  {rec.title}
                </div>
                {isExpanded && (
                  <p style={{ fontSize: 13, color: token('color.text.subtle', '#44546F'), marginTop: 8, marginBottom: 0 }}>
                    {rec.detail}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: token('space.075', '6px'), flexShrink: 0 }}>
                {!isApplied && (
                  <button
                    type="button"
                    style={{ padding: '4px 12px', borderRadius: 3, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, background: token('color.background.brand.bold', '#0C66E4'), color: '#fff' }}
                    onClick={() => setApplyRec(rec)}
                  >
                    Apply →
                  </button>
                )}
                <button
                  type="button"
                  style={{ padding: '4px 10px', borderRadius: 3, border: `1px solid ${token('color.border', '#DCDFE4')}`, cursor: 'pointer', fontSize: 13, background: token('elevation.surface', '#FFFFFF'), color: token('color.text', '#172B4D') }}
                  onClick={() => setExpandedRec(isExpanded ? null : rec.id)}
                >
                  {isExpanded ? 'Less' : 'Details'}
                </button>
                {!isApplied && (
                  <button
                    type="button"
                    style={{ padding: '4px 10px', borderRadius: 3, border: `1px solid ${token('color.border', '#DCDFE4')}`, cursor: 'pointer', fontSize: 13, background: token('elevation.surface', '#FFFFFF'), color: token('color.text', '#172B4D') }}
                    onClick={() => setAppliedRecs((prev) => new Set([...prev, rec.id]))}
                  >
                    Mark done
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {applyRec && (
        <ApplyPanel rec={applyRec} onClose={() => setApplyRec(null)} />
      )}
    </div>
  );
}

// ─── Root page ────────────────────────────────────────────────────────────────

export default function ComponentsAdminPage() {
  // ── Controlled tab state ──────────────────────────────────────────────────
  const [selectedTab, setSelectedTab] = useState(0);

  // ── Publish draft — set by HubBreakdownPanel "Publish to [Hub] tab →" ────
  const [publishDraft, setPublishDraft] = useState<{ componentId: string; route: string } | null>(null);

  const activatePublish = React.useCallback((componentId: string, route: string) => {
    setPublishDraft({ componentId, route });
    setSelectedTab(PUBLISH_TAB_IDX);
  }, []);

  return (
    <PublishContext.Provider value={{ activatePublish }}>
    <AdminGuard>
      <div style={{ padding: `${token('space.300', '24px')} ${token('space.400', '32px')}` }}>
        <Heading size="xlarge">Components</Heading>
        <p
          style={{
            fontSize: 14,
            color: token('color.text.subtle', '#44546F'),
            marginTop: token('space.100', '8px'),
            marginBottom: token('space.300', '24px'),
          }}
        >
          Catalyst's complete component inventory — {TOTAL_UNIFIED.toLocaleString()} components spanning{' '}
          {registryStats.canonical} canonical, {registryStats.banned} banned,
          and {(usageMapStats?.total ?? 0) - componentsRegistry.length} AST-observed. Grouped by functional module.
          Use the action buttons to ban or promote any component.
        </p>

        <StatsStrip />

        <Tabs
          id="components-admin-tabs"
          selected={selectedTab}
          onChange={(idx) => setSelectedTab(idx)}
        >
          <TabList>
            <Tab>Inventory ({TOTAL_UNIFIED.toLocaleString()})</Tab>
            <Tab>Banned ({registryStats.banned})</Tab>
            <Tab>Violations ({adsViolationsStats?.total ?? 6})</Tab>
            <Tab>Cascade</Tab>
            <Tab>AI Intelligence ({AI_RECS.length})</Tab>
            <Tab>Publish</Tab>
            <Tab>History</Tab>
          </TabList>

          <TabPanel>
            <div style={{ paddingTop: token('space.200', '16px') }}>
              <InventoryPane />
            </div>
          </TabPanel>

          <TabPanel>
            <div style={{ paddingTop: token('space.200', '16px') }}>
              <BannedRegistryPanel />
            </div>
          </TabPanel>

          <TabPanel>
            <div style={{ paddingTop: token('space.200', '16px') }}>
              <ADSViolationsPanel />
            </div>
          </TabPanel>

          <TabPanel>
            <div style={{ paddingTop: token('space.200', '16px') }}>
              <CascadeImpactPanel />
            </div>
          </TabPanel>

          <TabPanel>
            <div style={{ paddingTop: token('space.200', '16px') }}>
              <AiRecommendationsPane />
            </div>
          </TabPanel>

          {/* Tab index 5 — PUBLISH_TAB_IDX */}
          <TabPanel>
            <PublishTab
              initialDraft={publishDraft}
              onDraftConsumed={() => setPublishDraft(null)}
            />
          </TabPanel>

          {/* Tab index 6 */}
          <TabPanel>
            <HistoryTab />
          </TabPanel>
        </Tabs>
      </div>
    </AdminGuard>
    </PublishContext.Provider>
  );
}
