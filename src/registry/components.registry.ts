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

// ─── Engineering Spec (deep-dive card for high-stake components) ──────────────

export interface ComponentPropSpec {
  /** Prop name as it appears in the TypeScript interface. */
  name: string;
  /** TypeScript type string (e.g. `string`, `(adfJson: string) => void`). */
  type: string;
  required: boolean;
  /** Default value string, if optional. */
  default?: string;
  /** One-sentence description of the prop's purpose and constraints. */
  description: string;
}

export interface ComponentEditorSpec {
  /** Full props list derived from the component's TypeScript interface. */
  props: ComponentPropSpec[];
  /** What data shape goes in and what comes out (plain text, ADF JSON, etc.). */
  data_contract?: string;
  /** Architectural notes: bundle cost, provider requirements, rendering path. */
  architecture?: string;
  /** Hard constraints — things engineers MUST NOT violate when using this component. */
  constraints?: string[];
  /** External Storybook or Atlassian Design docs URL. */
  storybook_url?: string;
  /** npm package (for Atlaskit-wrapping components). */
  atlaskit_package?: string;
  /** Copy-pasteable canonical usage snippet. */
  usage_snippet?: string;
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

  /**
   * Deep engineering spec for high-stake components.
   * Rendered by EditorSpecPanel in ComponentSpecCard when present.
   */
  editor_spec?: ComponentEditorSpec;
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
      { name: 'enableGroupCreateButton', default: false, description: 'Render + button in group headers; pair with renderGroupInlineRow. Publishable via /admin/components.' },
      { name: 'enableStickyCreateFooter', default: false, description: 'Sticky inline-create row pinned to the table bottom. Publishable via /admin/components.' },
      { name: 'enableColumnReorder', default: false, description: 'Drag-drop column ordering with localStorage persistence. Publishable via /admin/components.' },
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
    file_path: 'src/components/shared/CanonicalDescriptionField/CanonicalDescriptionField.tsx',
    jsdoc_excerpt:
      'Plain-text description editor + renderer. Owns view/edit mode toggle, char-count bar, @mention parsing, and client-side validation. Use for every work item type that does NOT require ADF rich text. For rich-text (ADF) descriptions, use AdfDescriptionField instead.',
    dark_light_supported: true,
    tags: ['form', 'editor', 'description', 'plain-text'],
    editor_spec: {
      props: [
        { name: 'workItemId', type: 'string', required: true, description: 'Work item row ID — scopes validation and optimistic-update keys. Never pass a Jira key here; always the Supabase row UUID.' },
        { name: 'workItemType', type: 'WorkItemType', required: true, description: 'Used to vary placeholder text and validation rules. See description.types.ts for the union.' },
        { name: 'value', type: 'string', required: true, description: 'Current text value. Parent owns state; update via onChange.' },
        { name: 'onChange', type: '(value: string) => void', required: true, description: 'Called on every keystroke. Update parent state here; do NOT save to the DB on every call.' },
        { name: 'onSave', type: '(value: string) => void', required: true, description: 'Called when the user clicks Save. Persist to DB here. The component validates before calling.' },
        { name: 'onCancel', type: '() => void', required: true, description: 'Called when the user clicks Cancel. Restore value to the last saved state.' },
        { name: 'isEditing', type: 'boolean', required: false, default: 'false', description: 'Controlled edit mode. Toggle this in response to onEditToggle.' },
        { name: 'onEditToggle', type: '() => void', required: false, description: 'Called when the user clicks the view-mode area to start editing. If omitted, the field is not clickable to edit.' },
        { name: 'placeholder', type: 'string', required: false, default: '"Add a description..."', description: 'Empty-state placeholder shown in both view and edit modes.' },
        { name: 'error', type: 'string', required: false, description: 'External validation error message. Displayed below the field. The component also runs internal validation via validateDescription().' },
        { name: 'isLoading', type: 'boolean', required: false, default: 'false', description: 'Shows a spinner inside the Save button while the mutation is in flight.' },
        { name: 'isRequired', type: 'boolean', required: false, default: 'false', description: 'When true, empty string fails validation and Save is blocked.' },
        { name: 'minLength', type: 'number', required: false, default: '0', description: 'Minimum character count. Validation fires on save, not on every keystroke.' },
        { name: 'maxLength', type: 'number', required: false, default: '10000', description: 'Maximum character count. A char-count bar appears when usage exceeds 80% of this limit.' },
        { name: 'validator', type: '(v: string) => string | undefined', required: false, description: 'Custom validation function. Overrides the default validateDescription() call if provided. Return an error string or undefined.' },
        { name: 'readOnly', type: 'boolean', required: false, default: 'false', description: 'Hides the edit affordance entirely. Renders value in view mode with no click target.' },
      ],
      data_contract:
        'Input → plain UTF-8 string (may contain @mention tokens in the format `@[Display Name](uuid)` — the component parses these into a DescriptionMention[] array for highlight rendering). ' +
        'Output → same plain string passed to onSave. NOT ADF — do not pass an ADF JSON string to this component. For ADF round-trips, use AdfDescriptionField.',
      architecture:
        'Three sub-components: DescriptionViewMode (render + click-to-edit), DescriptionEditMode (@atlaskit/textfield + Save/Cancel), DescriptionValidation (pure validator). ' +
        'The parent component (CanonicalDescriptionField.tsx) orchestrates them and owns char-count state. ' +
        'Mention parsing runs in a useMemo on every value change — O(n) regex pass, not a separate network call.',
      constraints: [
        'Do NOT pass ADF JSON as value — the component renders it as raw text, not as rich content.',
        'Always pair isEditing (controlled prop) with onEditToggle — uncontrolled mode is not supported.',
        'onSave is NOT called on every keystroke — it fires only on the explicit Save button click after validation passes.',
        'The char-count bar only appears above 80% of maxLength — do not rely on it for live UX feedback below that threshold.',
        'Do NOT use this for Epic, Business Request, or any surface that requires ADF formatting. Use AdfDescriptionField instead.',
      ],
      usage_snippet: `import { CanonicalDescriptionField } from '@/components/shared/CanonicalDescriptionField';

function MyDetailView() {
  const [description, setDescription] = useState(issue.description_text ?? '');
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(description);
  const mutation = useUpdateDescription();

  return (
    <CanonicalDescriptionField
      workItemId={issue.id}
      workItemType="story"
      value={description}
      isEditing={isEditing}
      onChange={setDescription}
      onEditToggle={() => setIsEditing(true)}
      onSave={(v) => {
        mutation.mutate({ id: issue.id, description_text: v });
        setSaved(v);
        setIsEditing(false);
      }}
      onCancel={() => { setDescription(saved); setIsEditing(false); }}
      maxLength={10000}
      placeholder="Add a description…"
    />
  );
}`,
    },
  },
  {
    id: 'adf-description-field',
    name: 'AdfDescriptionField',
    category: 'molecule',
    origin: 'shared',
    status: 'canonical',
    version: '1.0.0',
    file_path: 'src/components/shared/rich-text/atlaskit/AdfDescriptionField.tsx',
    jsdoc_excerpt:
      'Atlaskit Editor Core (ProseMirror) based ADF rich-text description editor. Canonical rich-text surface for Epic detail views. Supports inline image paste/drag-drop with Supabase upload pipeline, upload progress banners, race-condition guards (save blocked during upload), and idle/pointer-down prefetch of ~2 MB editor chunk.',
    dark_light_supported: true,
    tags: ['form', 'editor', 'description', 'adf', 'rich-text'],
  },
  {
    id: 'rich-text-editor',
    name: 'AdfDescriptionField (Atlaskit Editor)',
    category: 'organism',
    origin: 'shared',
    status: 'canonical',
    version: '2.1.0',
    file_path: 'src/components/shared/rich-text/atlaskit/AdfDescriptionField.tsx',
    atlaskit_package: '@atlaskit/editor-core',
    ads_origin_url: 'https://atlassian.design/components/editor/examples',
    jsdoc_excerpt:
      'ADF rich-text description editor. Wraps @atlaskit/editor-core (ProseMirror) with Catalyst defaults. ' +
      'Handles inline image paste → Supabase upload pipeline with upload-progress banner. ' +
      'Race-condition guard blocks Save while an upload is in flight. ' +
      'Public alias: AdfDescriptionField — callers must never import EpicDescriptionEditor directly.',
    dark_light_supported: true,
    tags: ['editor', 'adf', 'rich-text', 'prosemirror'],
    editor_spec: {
      atlaskit_package: '@atlaskit/editor-core',
      storybook_url: 'https://atlassian.design/components/editor/examples',
      props: [
        { name: 'initialContent', type: 'unknown', required: true, description: 'Stored description: accepts ADF JSON object, ADF JSON string, or null. Normalised internally via parseStoredDescriptionToAdf() before being passed to the editor.' },
        { name: 'onSave', type: '(adfJson: string) => void', required: true, description: 'Called when the user clicks Save. Receives serialised ADF JSON string. Persist to ph_issues.description_adf. Blocked while an image upload is in flight.' },
        { name: 'onCancel', type: '() => void', required: true, description: 'Called when the user clicks Cancel. Restore the parent state to the last saved value.' },
        { name: 'workItemId', type: 'string', required: true, description: 'Scopes uploaded image paths inside the description-images Supabase bucket. Use the Supabase row UUID — not the Jira key.' },
        { name: 'placeholder', type: 'string', required: false, default: 'undefined', description: 'Placeholder text shown when the editor is empty. Rendered as inline ProseMirror placeholder decoration.' },
        { name: 'onChange', type: '(adfJson: string) => void', required: false, description: 'Fired on every editor change with serialised ADF JSON. Use in Create modals to sync the description before the entity is persisted.' },
        { name: 'appearance', type: '"comment" | "chromeless" | "full-page"', required: false, default: '"comment"', description: 'Editor chrome mode. Use "comment" for detail views (shows Save/Cancel buttons). Use "chromeless" in Create modals where the modal footer owns the submit button.' },
        { name: 'onAttachmentUploaded', type: '(meta: AttachmentUploadMeta) => void', required: false, description: 'Fired after an inline image uploads successfully. Insert the meta into ph_attachments so the attachments rail reflects the new file. Required for Jira-parity body↔rail binding.' },
      ],
      data_contract:
        'Input → ph_issues.description_adf (ADF JSON object/string or null). ' +
        'The component normalises via parseStoredDescriptionToAdf() and passes canonical ADF to the Atlaskit editor. ' +
        'Output → onSave receives a serialised ADF JSON string. Persist this directly to description_adf. ' +
        'Do NOT store plain text in description_adf when using this component — the column expects ADF shape.',
      architecture:
        'Wraps @atlaskit/editor-core <Editor appearance="comment|chromeless|full-page">. ' +
        'IntlProvider (react-intl-next) is self-contained — callers do NOT need to provide their own. ' +
        'Image handling: Atlassian Media Services is not available in Catalyst. ' +
        'Paste/drop of image files is intercepted at wrapper level → uploads to Supabase description-images bucket → inserted as ADF mediaSingle > media[type=external, url=...] (renders via AtlaskitRenderer without a MediaProvider). ' +
        'An "Image" toolbar button opens a file picker for the same path. ' +
        'Upload-in-flight state blocks Save and shows a progress banner. ' +
        'Bundle cost: ~2 MB (ProseMirror + Atlaskit editor-core). Loads eagerly — no lazy split.',
      constraints: [
        'NEVER import EpicDescriptionEditor directly. Always import AdfDescriptionField from the public alias file.',
        'Do NOT provide your own IntlProvider — the editor wraps one internally. Nesting IntlProvider breaks message resolution.',
        'Atlassian Media Services is NOT available — never pass a MediaProvider to the editor. Inline images use the Supabase pipeline.',
        'Save is race-condition-guarded: the button is disabled while an image upload is in flight. Do NOT add a separate upload-blocking mechanism.',
        'For plain-text descriptions (non-ADF storage), use CanonicalDescriptionField instead — this component always outputs ADF.',
        'Do NOT use in surfaces that need TipTap — TipTap was removed 2026-04-20. This is the only supported rich-text editor.',
        'The ~2 MB bundle loads on every mount. Avoid mounting in tabs/panels that are unlikely to be visited — defer with lazy() if needed.',
      ],
      usage_snippet: `import { AdfDescriptionField } from '@/components/shared/rich-text/atlaskit/AdfDescriptionField';
import type { AttachmentUploadMeta } from '@/components/shared/rich-text/atlaskit/AdfDescriptionField';

function EpicDescriptionSection({ issue }: { issue: PhIssue }) {
  const mutation = useUpdateDescriptionAdf();
  const qc = useQueryClient();

  const handleAttachmentUploaded = useCallback((meta: AttachmentUploadMeta) => {
    // Insert into ph_attachments so the attachments rail reflects the new file
    qc.invalidateQueries({ queryKey: ['attachments', issue.id] });
  }, [issue.id, qc]);

  return (
    <AdfDescriptionField
      workItemId={issue.id}
      initialContent={issue.description_adf}
      appearance="comment"
      onSave={(adfJson) => mutation.mutate({ id: issue.id, description_adf: adfJson })}
      onCancel={() => {}}
      onAttachmentUploaded={handleAttachmentUploaded}
      placeholder="Add a description…"
    />
  );
}`,
    },
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
    file_path: 'src/components/catalyst-detail-views/shared/sections/CatalystStatusPill.tsx',
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
    id: 'user-avatar',
    name: 'UserAvatar',
    category: 'molecule',
    origin: 'shared',
    status: 'canonical',
    version: '2.0.0',
    file_path: 'src/components/shared/UserAvatar.tsx',
    jsdoc_excerpt:
      'Canonical user face. Composes CatalystAvatar (photo / deterministic-colour initials / silhouette fallback) and adds an optional country flag overlay. ADS-canonical size scale (xsmall → xxlarge). Use everywhere a user identity is shown — tables, rails, sidebars, comment threads, notification rows.',
    dark_light_supported: true,
    tags: ['avatar', 'user', 'face', 'flag'],
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
  {
    id: 'epic-description-editor',
    name: 'EpicDescriptionEditor',
    category: 'organism',
    origin: 'shared',
    status: 'canonical',
    version: '1.0.0',
    file_path: 'src/components/shared/rich-text/atlaskit/EpicDescriptionEditor.tsx',
    jsdoc_excerpt:
      'Atlaskit Editor Core integration for ADF rich-text descriptions. Handles image upload, @mention provider, inline mark + block formatting, read-only mode, and three appearance modes (comment/chromeless/full-page).',
    dark_light_supported: true,
    tags: ['editor', 'adf', 'rich-text', 'description', 'atlaskit'],
    editor_spec: {
      props: [
        { name: 'initialContent', type: 'unknown', required: false, description: 'Initial ADF document (null, object, or JSON string). Automatically normalized to valid ADF on mount.' },
        { name: 'workItemId', type: 'string', required: true, description: 'Work item row ID — scopes image upload paths and optimistic-update keys.' },
        { name: 'placeholder', type: 'string', required: false, default: '"Add a description..."', description: 'Empty-state placeholder shown in the editor.' },
        { name: 'onChange', type: '(adfJson: string) => void', required: false, description: 'Called on every keystroke with the current ADF JSON stringified. Update parent state here; do NOT save to DB on every call.' },
        { name: 'onSave', type: '(adfJson: string) => void', required: true, description: 'Called when the user clicks Save. Persist the ADF JSON string to DB here.' },
        { name: 'onCancel', type: '() => void', required: true, description: 'Called when the user clicks Cancel. Restore ADF to the last saved state.' },
        { name: 'appearance', type: '"comment" | "chromeless" | "full-page"', required: false, default: '"comment"', description: 'Editor appearance mode. Affects toolbar visibility and editor height behavior.' },
        { name: 'onAttachmentUploaded', type: '(info: UploadedImage) => void', required: false, description: 'Called when an image is successfully uploaded to Supabase. Receives { url, filename, storagePath, width?, height? }.' },
        { name: 'readOnly', type: 'boolean', required: false, default: 'false', description: 'Disables editing. Component renders as view-only. Editor toolbar is hidden.' },
      ],
      data_contract:
        'Input → ADF document (JSON object or string) with version:1 and type:"doc" root. Automatically normalized via normalizeAdfForAtlaskit(). ' +
        'Output → stringified ADF JSON passed to onSave. The component handles serialization; parent receives a string, not an object.',
      architecture:
        'Wraps @atlaskit/editor-core Editor with ProseMirror-based ADF document model. ' +
        'Integrates Supabase image upload, @mention provider via createMentionProvider(), and adfNormalizer for schema coercion. ' +
        'Two separate callbacks: onChange (live capture) and onSave (explicit Save button). Handles IntlProvider wrapping for i18n support.',
      constraints: [
        'Always pass initialContent through parseStoredDescriptionToAdf() or normalizeAdfForAtlaskit() before mounting — do not pass raw Jira ADF without normalization.',
        'onSave is NOT called on every keystroke — it fires only on explicit Save button click.',
        'onChange fires on every keystroke — do NOT trigger DB mutations inside onChange; use it for client-state capture only.',
        'Image uploads are scoped to workItemId — changing workItemId mid-session may orphan uploads from previous IDs.',
        'readOnly mode hides the editor toolbar entirely. There is no partial read-only state.',
        'Mention provider must be initialized before the editor mounts. The component handles this internally via useMemo.',
      ],
      usage_snippet: `import EpicDescriptionEditor from '@/components/shared/rich-text/atlaskit/EpicDescriptionEditor';
import { parseStoredDescriptionToAdf } from '@/components/shared/rich-text/atlaskit/adfNormalizer';

function MyDescriptionPanel() {
  const [adf, setAdf] = useState(() =>
    parseStoredDescriptionToAdf(issue.description)
  );
  const mutation = useUpdateDescription();

  return (
    <EpicDescriptionEditor
      initialContent={adf}
      workItemId={issue.id}
      appearance="comment"
      onChange={(json) => setAdf(json)}
      onSave={(json) => mutation.mutate(json)}
      onCancel={() => setAdf(parseStoredDescriptionToAdf(issue.description))}
    />
  );
}`,
    },
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
