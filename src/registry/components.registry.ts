/**
 * components.registry.ts — Single source of truth for Catalyst's component library.
 *
 * Authored: 2026-05-17 (preflight council mandate).
 *
 * Structure:
 *   - CANONICAL entries: hand-curated components Catalyst owns or wraps,
 *     with version, JSDoc excerpt, feature flags, deprecation status.
 *   - BANNED entries: components Vikram has permanently banned from
 *     Catalyst (CLAUDE.md anchors). They appear in /admin/components with
 *     a red badge so future engineers can't accidentally re-introduce them.
 *   - OBSERVED entries: auto-populated at build time by usage-scanner.ts
 *     (Step 5). Every @atlaskit/* import + every Catalyst-authored
 *     component the scanner finds lands here with status='observed' and
 *     a generated id. This file holds only the manually-curated baseline.
 *
 * The usage map (which file consumes which component) lives separately in
 * src/registry/usage-map.generated.ts and is merged at runtime in the
 * /admin/components UI.
 *
 * Versioning policy: semver. Patch bumps for non-breaking refactors,
 * minor for new feature-flag props, major for prop renames / removals.
 *
 * Cascade-change protocol (Q3 from preflight):
 *   When you bump a component's version, the /admin/components UI
 *   surfaces an "impacted consumers" list derived from usage-map.generated.ts.
 *   Engineers run targeted regression on every listed file BEFORE the PR
 *   merges. v1 = audit list only; v2 may add codegen.
 */

export type ComponentCategory = 'atom' | 'molecule' | 'organism' | 'page' | 'pattern';
export type ComponentStatus = 'canonical' | 'deprecated' | 'banned' | 'observed';
export type ComponentOrigin = 'atlaskit' | 'catalyst-ds' | 'shared' | 'feature' | 'page';

export interface ComponentFeatureFlag {
  name: string;
  default: boolean | string | number;
  description: string;
}

export interface ComponentRegistryEntry {
  /** Stable identifier — kebab-case. Never rename. */
  id: string;
  /** Display name shown in the admin UI. */
  name: string;
  category: ComponentCategory;
  origin: ComponentOrigin;
  status: ComponentStatus;
  /** Semver — see versioning policy above. */
  version: string;

  /** Absolute repo-relative path (e.g. src/components/shared/JiraTable/JiraTable.tsx). */
  file_path?: string;
  /** For Atlaskit primitives, the npm package id (e.g. @atlaskit/button). */
  atlaskit_package?: string;
  /** Deep link to atlassian.design where applicable. */
  ads_origin_url?: string;

  /** Short markdown excerpt — appears on the spec card. */
  jsdoc_excerpt?: string;
  /** Does the component render correctly under data-color-mode='dark'? */
  dark_light_supported?: boolean;

  /** Feature-flag props the component exposes (CANONICAL_COMPONENTS.md Rule 1). */
  feature_flags?: ComponentFeatureFlag[];

  /** Banned-only: human-readable reason (1 sentence). */
  banned_reason?: string;
  /** Banned-only: CLAUDE.md lesson date the ban traces back to (YYYY-MM-DD). */
  banned_anchor?: string;

  /** Deprecated-only: id of the canonical replacement. */
  deprecation_target?: string;

  /** Free-form tags for filtering. */
  tags?: string[];
}

// ──────────────────────────────────────────────────────────────────────────────
// CANONICAL — Catalyst-owned components with explicit contracts.
// ──────────────────────────────────────────────────────────────────────────────

const CANONICAL: ComponentRegistryEntry[] = [
  {
    id: 'jira-table',
    name: 'JiraTable',
    category: 'organism',
    origin: 'shared',
    status: 'canonical',
    version: '1.4.0',
    file_path: 'src/components/shared/JiraTable/JiraTable.tsx',
    jsdoc_excerpt:
      'Jira-parity list table. Sort, group, bulk-select, inline edit, column reorder/resize, sticky footer create. All cross-cutting behaviour controlled via feature-flag props (Rule 1).',
    dark_light_supported: true,
    feature_flags: [
      { name: 'enableGroupCreateButton', default: false, description: 'Render + button in group headers; pair with renderGroupInlineRow.' },
      { name: 'enableStickyCreateFooter', default: false, description: 'Sticky inline-create row pinned to the table bottom.' },
      { name: 'enableBulkSelect', default: true, description: 'Multi-row checkbox + BulkFooterBar.' },
      { name: 'enableColumnReorder', default: true, description: 'Drag-drop column ordering with localStorage persistence.' },
    ],
    tags: ['table', 'list', 'backlog', 'crud'],
  },
  {
    id: 'canonical-description-field',
    name: 'CanonicalDescriptionField',
    category: 'molecule',
    origin: 'shared',
    status: 'canonical',
    version: '1.1.0',
    file_path: 'src/components/shared/CanonicalDescriptionField/index.tsx',
    jsdoc_excerpt:
      'Description editor + renderer with Atlaskit ADF persistence, validator guard, and optimistic update.',
    dark_light_supported: true,
    tags: ['form', 'editor', 'description'],
  },
  {
    id: 'rich-text-editor',
    name: 'rich-text (AtlaskitEditor wrapper)',
    category: 'organism',
    origin: 'shared',
    status: 'canonical',
    version: '1.0.0',
    file_path: 'src/components/shared/rich-text/',
    jsdoc_excerpt:
      'Atlaskit Editor wrapper with Catalyst defaults (toolbar config, markdown adapter, Confluence sync).',
    dark_light_supported: true,
    tags: ['editor', 'markdown'],
  },
  {
    id: 'dynamic-table',
    name: 'dynamic-table (deprecated)',
    category: 'organism',
    origin: 'shared',
    status: 'deprecated',
    version: '0.9.0',
    file_path: 'src/components/shared/dynamic-table/',
    deprecation_target: 'jira-table',
    jsdoc_excerpt: 'Legacy. Only StoryBacklogPage still uses it. Migrate to JiraTable.',
    tags: ['table', 'legacy'],
  },
  {
    id: 'catalyst-view-base',
    name: 'CatalystViewBase',
    category: 'organism',
    origin: 'shared',
    status: 'canonical',
    version: '2.1.0',
    file_path: 'src/components/catalyst-detail-views/shared/CatalystViewBase.tsx',
    jsdoc_excerpt:
      'Detail view shell for all work item types. Supports modal mode (kanban card open) and fullPageMode (route-mounted). Owns sticky sidebar contract (CLAUDE.md 2026-05-12).',
    dark_light_supported: true,
    feature_flags: [
      { name: 'fullPageMode', default: false, description: 'Mount inside a route, not a modal. Body becomes scroll container.' },
      { name: 'panelMode', default: false, description: 'Mount inside the allwork right panel rather than a modal.' },
    ],
    tags: ['detail', 'shell', 'modal'],
  },
  {
    id: 'catalyst-key-details',
    name: 'CatalystKeyDetails',
    category: 'molecule',
    origin: 'shared',
    status: 'canonical',
    version: '1.3.0',
    file_path: 'src/components/catalyst-detail-views/shared/CatalystKeyDetails.tsx',
    jsdoc_excerpt:
      'Left-block "Key details" inside detail views. Owns canonical FieldRow primitive. Per-type extras via extraRows.',
    dark_light_supported: true,
    feature_flags: [
      { name: 'showPriority', default: true, description: 'Hide for Epic (Priority lives in right rail).' },
    ],
    tags: ['detail', 'fields'],
  },
  {
    id: 'catalyst-sidebar-details',
    name: 'CatalystSidebarDetails',
    category: 'organism',
    origin: 'shared',
    status: 'canonical',
    version: '2.0.0',
    file_path: 'src/components/catalyst-detail-views/shared/CatalystSidebarDetails.tsx',
    jsdoc_excerpt:
      'Right rail of every detail view. Renders Assignee, Reporter, Priority (Epic only), Labels (Task+Story only), Fix versions (all except Feature), Due date (Backend/Incident/CR). Schema-gated per Jira screen scheme.',
    dark_light_supported: true,
    tags: ['detail', 'rail', 'schema-gated'],
  },
  {
    id: 'catalyst-status-pill',
    name: 'CatalystStatusPill',
    category: 'atom',
    origin: 'catalyst-ds',
    status: 'canonical',
    version: '1.2.0',
    file_path: 'src/components/catalyst-ds/status/CatalystStatusPill.tsx',
    jsdoc_excerpt:
      'Header-rendered status button. data-testid="catalyst-status-pill-trigger". Exact-hex DOM-probed values (Jira parity overrides ADS tokens here per CLAUDE.md 2026-05-05).',
    dark_light_supported: true,
    tags: ['status', 'pill'],
  },
  {
    id: 'jira-issue-type-icon',
    name: 'JiraIssueTypeIcon',
    category: 'atom',
    origin: 'shared',
    status: 'canonical',
    version: '1.0.0',
    file_path: 'src/lib/jira-issue-type-icons.tsx',
    jsdoc_excerpt:
      'Canonical work-item-type icon. NEVER use coloured dots/squares for type (CLAUDE.md 2026-05-09). 14px for compact rails, 16px for rows.',
    dark_light_supported: true,
    tags: ['icon', 'type'],
  },
  {
    id: 'watchers-chip',
    name: 'WatchersChip',
    category: 'molecule',
    origin: 'shared',
    status: 'canonical',
    version: '1.1.0',
    file_path: 'src/components/catalyst-detail-views/shared/WatchersChip.tsx',
    jsdoc_excerpt:
      'Eye-glyph trigger + self-rolled manage-popover (Atlaskit Popup v4.16 empty-portal bug). Capture-phase Escape handler prevents parent-modal close (CLAUDE.md 2026-05-08).',
    dark_light_supported: true,
    tags: ['watchers', 'popover'],
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// BANNED — permanently out-of-scope per Vikram + CLAUDE.md.
// Surface in /admin/components with red badge so they cannot be re-introduced.
// ──────────────────────────────────────────────────────────────────────────────

const BANNED: ComponentRegistryEntry[] = [
  {
    id: 'mdt-ref',
    name: 'MDT Ref field',
    category: 'molecule',
    origin: 'feature',
    status: 'banned',
    version: '0.0.0',
    banned_anchor: '2026-05-05',
    banned_reason:
      'Permanently banned from ALL Catalyst views and sidebars, for every issue type, forever. Custom field with no Catalyst data model backing. Orphan file may exist as CatalystMdtRefField.tsx — never render it.',
    tags: ['banned', 'custom-field'],
  },
  {
    id: 'service-now-number',
    name: 'Service Now# field',
    category: 'molecule',
    origin: 'feature',
    status: 'banned',
    version: '0.0.0',
    banned_anchor: '2026-05-07',
    banned_reason:
      'Jira customfield_10130. No Catalyst data model backing. CatalystServiceNowDisplay file may remain for legacy reasons but must never be rendered.',
    tags: ['banned', 'custom-field'],
  },
  {
    id: 'assessment-feature',
    name: 'Assessment Feature field',
    category: 'molecule',
    origin: 'feature',
    status: 'banned',
    version: '0.0.0',
    banned_anchor: '2026-05-07',
    banned_reason:
      'Jira customfield_10126. No Catalyst data model backing. CatalystAssessmentFeatureField file may remain for legacy reasons but must never be rendered.',
    tags: ['banned', 'custom-field'],
  },
  {
    id: 'story-points',
    name: 'Story Points field',
    category: 'molecule',
    origin: 'feature',
    status: 'banned',
    version: '0.0.0',
    banned_anchor: '2026-04-16',
    banned_reason:
      'BANNED platform-wide. Catalyst does not estimate in story points. Inline comment in CatalystSidebarDetails.tsx line 422 enforces this. Do NOT re-add even if a handover lists it.',
    tags: ['banned', 'estimation'],
  },
  {
    id: 'development-section',
    name: 'Development section (Jira branches/PRs/commits)',
    category: 'organism',
    origin: 'feature',
    status: 'banned',
    version: '0.0.0',
    banned_anchor: '2026-05-06',
    banned_reason:
      'NEVER implement under any circumstances, for any issue type, in any view. Permanently out of scope. Do not ask for permission — the answer is always no.',
    tags: ['banned', 'jira-only'],
  },
  {
    id: 'automation-section',
    name: 'Automation section + ⚡ Automate button',
    category: 'organism',
    origin: 'feature',
    status: 'banned',
    version: '0.0.0',
    banned_anchor: '2026-05-06',
    banned_reason:
      'NEVER implement. Same permanent-out-of-scope ruling as Development section.',
    tags: ['banned', 'jira-only'],
  },
  {
    id: 'ai-sparkles-inline',
    name: 'AI Sparkles inline button (Catalyst Intelligence)',
    category: 'molecule',
    origin: 'feature',
    status: 'banned',
    version: '0.0.0',
    banned_anchor: '2026-05-07',
    banned_reason:
      'Permanently banned from CatalystQuickActions and ALL detail view surfaces. The ONLY AI improve entry point is ImproveIssueDropdown in the right rail. Do NOT re-add onAiImprove / SparklesIcon / showAiMenu / any inline AI button.',
    tags: ['banned', 'ai'],
  },
  {
    id: 'notion-integration',
    name: 'Notion integration (Projects module)',
    category: 'pattern',
    origin: 'feature',
    status: 'banned',
    version: '0.0.0',
    banned_anchor: '2026-05-09',
    banned_reason:
      'Permanently out of scope for the Projects module. Do NOT add a Notion column, Notion sync stats, or any Notion data to AllProjectsTable, AllProjectsPage, or any Projects-related component. No exceptions, no re-asks.',
    tags: ['banned', 'integration'],
  },
];

export const componentsRegistry: ComponentRegistryEntry[] = [
  ...CANONICAL,
  ...BANNED,
];

/** Quick lookup by id. */
export function getComponentById(id: string): ComponentRegistryEntry | undefined {
  return componentsRegistry.find(e => e.id === id);
}

/** Filter helpers used by /admin/components UI. */
export const registryStats = {
  total: componentsRegistry.length,
  canonical: componentsRegistry.filter(e => e.status === 'canonical').length,
  deprecated: componentsRegistry.filter(e => e.status === 'deprecated').length,
  banned: componentsRegistry.filter(e => e.status === 'banned').length,
};
