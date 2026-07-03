/**
 * CatalystRules — single authoritative rule engine for Catalyst product logic.
 *
 * SOURCE OF TRUTH: RULE_TABLE.md (this file is its TypeScript implementation).
 * If code and RULE_TABLE.md diverge, RULE_TABLE.md wins — update this file.
 *
 * Governs:
 *   1. Module ownership   — which types belong in which module (Grid A)
 *   2. Hierarchy          — canBeChildOf(child, parent) (Grid B)
 *   3. Link restrictions  — canLinkTo(source, target) (Grid C)
 *   4. Creation rights    — canCreateInModule(type, module) (Grid D)
 *   5. Route param contract — isValidRouteParam (Grid F)
 *   6. Avatar contract    — validateAvatarImport, validateAvatarSrc (Grid G)
 *   7. Row typography contract — CANONICAL_ROW_TYPOGRAPHY, containsHardcodedLineHeight (Grid H)
 *   8. Backlog/All-Work view eligibility — isEligibleForBacklogView (Grid I)
 *
 * ALL surfaces that create, link, or parent work items MUST query this engine.
 * No surface may hardcode type lists or module mappings.
 *
 * Confirmed by Vikram: 2026-07-01 (Grids A–G) · 2026-07-02 (Grid H, pending confirmation)
 * · 2026-07-03 (Grid I)
 * Council session: CRE design + opportunity analysis
 */

import {
  getAllowedChildTypes,
  isSubtaskFamily,
} from '@/components/catalyst-detail-views/shared/parent-rules';
import { isTerminalStatus } from '@/components/ads';

// ─── TYPE ALIASES ────────────────────────────────────────────────────────────

/** Canonical module codes. */
export type CREModule =
  | 'TEAM'
  | 'PRODUCT'
  | 'PROGRAM'
  | 'TESTHUB'
  | 'INCIDENT'
  | 'ENTERPRISE';

/** Canonical type names (Jira-parity Title Case). */
export type CRETypeName =
  | 'Story'
  | 'Epic'
  | 'Feature'
  | 'QA Bug'
  | 'Production Incident'
  | 'Business Request'
  | 'Business Gap'
  | 'Change Request'
  | 'Task'
  | 'Test Case'
  | 'Test Cycle'
  | 'Theme'
  | 'Objective'
  | 'Snapshot';

// ─── GRID A — MODULE OWNERSHIP ───────────────────────────────────────────────

/**
 * Canonical module → owned types mapping.
 * Subtask family is universal — not listed here, handled by isSubtaskFamily().
 * Rule A4: QA Bug → TESTHUB (migrated from TEAM 2026-07-01).
 * Rule A5: Production Incident → INCIDENT (migrated from TEAM 2026-07-01).
 */
export const MODULE_OWNED_TYPES: Record<CREModule, string[]> = {
  TEAM:       ['Story', 'Feature', 'Task', 'Change Request'],
  PRODUCT:    ['Business Request', 'Business Gap'],
  PROGRAM:    ['Epic'],
  TESTHUB:    ['QA Bug', 'Test Case', 'Test Cycle'],
  INCIDENT:   ['Production Incident'],
  ENTERPRISE: ['Theme', 'Objective', 'Snapshot'],
};

/**
 * Subtask family type names — universal child, permitted in all modules.
 * Mirrors SUBTASK_FAMILY_CANONICAL_TYPES in parent-rules.ts.
 */
const SUBTASK_FAMILY: readonly string[] = [
  'Sub-task',
  'Backend',
  'Frontend',
  'Figma',
  'Integration',
  'API Requirement',
  'BRD Task',
];

// ─── GRID C — BANNED LINK PAIRS ──────────────────────────────────────────────

/**
 * Pairs that are EXPLICITLY BANNED from ph_issue_links (order-independent).
 * Rule C1:  Business Request ↔ QA Bug — banned.
 * Rule C3:  Production Incident ↔ QA Bug — banned.
 * Rule C10: Same type ↔ Same type — banned universally (handled in canLinkTo).
 */
const BANNED_LINK_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['Business Request', 'QA Bug'],
  ['Production Incident', 'QA Bug'],
] as const;

// ─── TYPE NORMALISATION ───────────────────────────────────────────────────────

/**
 * Alias map — folds legacy / alternate names onto canonical CRETypeName.
 * Every engine query normalises its input through this before rule evaluation.
 * This is the single place where "defect", "QA Bug", "bug" converge.
 */
const TYPE_ALIAS_MAP: Record<string, string> = {
  // Defect family
  'qa bug':              'QA Bug',
  'defect':              'QA Bug',
  'bug':                 'QA Bug',
  'qabug':               'QA Bug',

  // Incident family
  'production incident': 'Production Incident',
  'incident':            'Production Incident',
  'prod incident':       'Production Incident',

  // Business Request family
  'business request':    'Business Request',
  'business_request':    'Business Request',
  'br':                  'Business Request',

  // Business Gap
  'business gap':        'Business Gap',
  'business_gap':        'Business Gap',

  // Change Request
  'change request':      'Change Request',
  'change_request':      'Change Request',

  // Standard types (case normalisation only)
  'story':               'Story',
  'epic':                'Epic',
  'feature':             'Feature',
  'new feature':         'Feature',
  'task':                'Task',
  'improvement':         'Story',
  'test case':           'Test Case',
  'test_case':           'Test Case',
  'test cycle':          'Test Cycle',
  'test_cycle':          'Test Cycle',
  'theme':               'Theme',
  'objective':           'Objective',
  'snapshot':            'Snapshot',
};

/**
 * Normalise any raw type string to its canonical CRETypeName.
 * Returns the input unchanged (trimmed) if no alias found — allows
 * subtask family types (Backend, Frontend, etc.) to pass through.
 */
export function normalizeType(raw: string | null | undefined): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  return TYPE_ALIAS_MAP[trimmed.toLowerCase()] ?? trimmed;
}

// ─── QUERY API ────────────────────────────────────────────────────────────────

/**
 * Cross-module creation rights (Grid D exceptions) — types creatable in a
 * module that does NOT own them. Grid A ownership is unchanged, so hierarchy
 * (Grid B), links (Grid C), and getOwningModule() are unaffected.
 * D7 (2026-07-03): TEAM surfaces (Backlog inline create) may create Epic.
 */
const EXTRA_CREATE_RIGHTS: Record<string, readonly string[]> = {
  TEAM: ['Epic'],
};

/**
 * Returns true if typeName may be created inside moduleCode.
 * Subtask family types are permitted in every module (Grid A10).
 * Cross-module creation rights (Grid D7+) are honoured after ownership.
 */
export function canCreateInModule(typeName: string, moduleCode: string): boolean {
  const canonical = normalizeType(typeName);
  if (isSubtaskFamily(canonical) || SUBTASK_FAMILY.includes(canonical)) return true;
  if ((EXTRA_CREATE_RIGHTS[moduleCode] ?? []).includes(canonical)) return true;
  const ownedTypes = MODULE_OWNED_TYPES[moduleCode as CREModule] ?? [];
  return ownedTypes.includes(canonical);
}

/**
 * Returns all type names permitted for creation in a given module.
 * Includes cross-module creation rights (Grid D7+) and subtask family.
 */
export function getAllowedTypesForModule(moduleCode: string): string[] {
  const owned = MODULE_OWNED_TYPES[moduleCode as CREModule] ?? [];
  return [...owned, ...(EXTRA_CREATE_RIGHTS[moduleCode] ?? []), ...SUBTASK_FAMILY];
}

/**
 * Returns true if CRE governs this type name (Grid A ownership ∪ subtask
 * family). Types outside this set are Studio-registry custom types
 * (ph_work_item_types) — the registry, not CRE, is authoritative for them
 * (ph_hierarchy_parent_rules mirrors Grid B for system types only,
 * migration 20260703130000).
 */
export function isCREGovernedType(typeName: string): boolean {
  const canonical = normalizeType(typeName);
  if (isSubtaskFamily(canonical) || SUBTASK_FAMILY.includes(canonical)) return true;
  return Object.values(MODULE_OWNED_TYPES).some(types => types.includes(canonical));
}

/**
 * Chokepoint filter for create-surface type catalogues (Grids A + D).
 * Keeps a candidate type when either:
 *   — CRE governs it and canCreateInModule() allows it in moduleCode, or
 *   — CRE does not govern it (Studio-registry custom type — the registry
 *     is authoritative for custom types, so CRE passes them through).
 * Every type picker on a create surface MUST run its catalogue through
 * this before render (enforced by scripts/cre-chokepoint-gate.cjs).
 */
export function filterCreatableTypes(
  types: readonly string[],
  moduleCode: string,
): string[] {
  return types.filter(t => !isCREGovernedType(t) || canCreateInModule(t, moduleCode));
}

/**
 * Returns the owning module for a type, or null if unrecognised.
 * Subtask family returns null (universal — no single owner).
 */
export function getOwningModule(typeName: string): CREModule | null {
  const canonical = normalizeType(typeName);
  if (isSubtaskFamily(canonical) || SUBTASK_FAMILY.includes(canonical)) return null;
  const entry = Object.entries(MODULE_OWNED_TYPES).find(([, types]) =>
    types.includes(canonical),
  );
  return entry ? (entry[0] as CREModule) : null;
}

/**
 * Returns true if childType may be a structural child (parent_key) of parentType.
 * Delegates to getAllowedChildTypes() from parent-rules.ts (Grid B canonical source).
 * Subtask family types are always valid children of story-level items.
 */
export function canBeChildOf(childType: string, parentType: string): boolean {
  const child  = normalizeType(childType);
  const parent = normalizeType(parentType);
  // Subtask family under subtask family = banned (B10 — leaf)
  if (isSubtaskFamily(parent) || SUBTASK_FAMILY.includes(parent)) return false;
  const allowed = getAllowedChildTypes(parent);
  return allowed.some(t => normalizeType(t) === child);
}

// ─── GRID B + STUDIO REGISTRY — CHILD TYPES WITH CUSTOM-TYPE FALLBACK ───────

/** Structural subset of ph_work_item_types rows (useWorkItemTypes). */
export interface RegistryWorkItemType {
  id: string;
  type_key: string;
  display_name: string;
  is_system: boolean;
  is_enabled: boolean;
}

/** Structural subset of ph_hierarchy_parent_rules rows (useParentRules). */
export interface RegistryParentRule {
  child_type_id: string;
  parent_type_id: string | null;
}

/**
 * getAllowedChildTypes with Studio-registry fallback.
 *
 * Authority split (RULE_TABLE.md Grid B + migration 20260703130000):
 *   — System (CRE-governed) parent: static Grid B list is authoritative.
 *     Registry rows for system children merely mirror Grid B, so only
 *     CUSTOM (is_system = false) registry children are appended.
 *   — Custom (non-CRE) parent: the registry is the only authority — its
 *     child rows are returned verbatim (static lookup would yield []).
 *
 * Pure function — callers pass registry rows in (useWorkItemTypes +
 * useParentRules); with no registry data it degrades to the static Grid B
 * lookup, so existing call sites are unaffected.
 */
export function getAllowedChildTypesWithRegistry(
  parentType: string | null | undefined,
  registryTypes?: readonly RegistryWorkItemType[] | null,
  parentRules?: readonly RegistryParentRule[] | null,
): string[] {
  const base = getAllowedChildTypes(parentType ?? '');
  if (!parentType || !registryTypes?.length || !parentRules?.length) return base;

  const norm = (s: string) => normalizeType(s).toLowerCase();
  const parentRow = registryTypes.find(
    t => norm(t.display_name) === norm(parentType) || t.type_key.toLowerCase() === norm(parentType),
  );
  if (!parentRow) return base;

  const childIds = new Set(
    parentRules.filter(r => r.parent_type_id === parentRow.id).map(r => r.child_type_id),
  );
  const registryChildren = registryTypes.filter(t => childIds.has(t.id) && t.is_enabled);

  if (isCREGovernedType(parentType)) {
    const customChildren = registryChildren
      .filter(t => !t.is_system)
      .map(t => t.display_name)
      .filter(name => !base.some(b => norm(b) === norm(name)));
    return [...base, ...customChildren];
  }
  return registryChildren.map(t => t.display_name);
}

/**
 * Returns true if sourceType may be linked (ph_issue_links) to targetType.
 *
 * Banned by rule:
 *   C1  — Business Request ↔ QA Bug
 *   C3  — Production Incident ↔ QA Bug
 *   C10 — Any type ↔ Same type (same canonical name)
 */
export function canLinkTo(sourceType: string, targetType: string): boolean {
  const src = normalizeType(sourceType);
  const tgt = normalizeType(targetType);

  // C10 — same-type linking universally banned
  if (src === tgt) return false;

  // Banned pairs (order-independent)
  return !BANNED_LINK_PAIRS.some(
    ([a, b]) =>
      (normalizeType(a) === src && normalizeType(b) === tgt) ||
      (normalizeType(b) === src && normalizeType(a) === tgt),
  );
}

// ─── VALIDATION HELPERS ───────────────────────────────────────────────────────

export interface CREValidationResult {
  ok: boolean;
  reason?: string;
  /** Canonical type name after alias resolution. */
  resolvedType?: string;
  /** Owning module, if deterministic. */
  owningModule?: CREModule | null;
}

/**
 * Validate a proposed creation against all rules.
 * Returns { ok: true } or { ok: false, reason } with a human-readable explanation.
 */
export function validateCreation(typeName: string, moduleCode: string): CREValidationResult {
  const canonical = normalizeType(typeName);
  const owner = getOwningModule(canonical);

  if (!canCreateInModule(canonical, moduleCode)) {
    const ownerLabel = owner ?? 'its own module';
    return {
      ok: false,
      reason: `${canonical} belongs in ${ownerLabel}, not ${moduleCode}.`,
      resolvedType: canonical,
      owningModule: owner,
    };
  }
  return { ok: true, resolvedType: canonical, owningModule: owner };
}

/**
 * Validate a proposed parent_key assignment.
 * Returns { ok: true } or { ok: false, reason }.
 */
export function validateHierarchy(childType: string, parentType: string): CREValidationResult {
  const child  = normalizeType(childType);
  const parent = normalizeType(parentType);

  if (!canBeChildOf(child, parent)) {
    return {
      ok: false,
      reason: `${child} cannot be a child of ${parent}.`,
      resolvedType: child,
    };
  }
  return { ok: true, resolvedType: child };
}

/**
 * Validate a proposed ph_issue_links entry.
 * Returns { ok: true } or { ok: false, reason }.
 */
export function validateLink(sourceType: string, targetType: string): CREValidationResult {
  const src = normalizeType(sourceType);
  const tgt = normalizeType(targetType);

  if (src === tgt) {
    return {
      ok: false,
      reason: `Cannot link a ${src} to another ${src} (same-type linking is banned).`,
      resolvedType: src,
    };
  }
  if (!canLinkTo(src, tgt)) {
    return {
      ok: false,
      reason: `Linking ${src} to ${tgt} is not permitted by Catalyst product rules.`,
      resolvedType: src,
    };
  }
  return { ok: true, resolvedType: src };
}

// ─── GRID F — SLUG & URL CONTRACT ────────────────────────────────────────────

/**
 * Route param name suffixes that signal a UUID leak.
 * Rule F1: params ending in these are banned from all Catalyst routes.
 */
const BANNED_PARAM_SUFFIXES: readonly string[] = [
  'Id',
  'ID',
  '_id',
  'uuid',
  'UUID',
];

/**
 * Literal param names that are always banned (bare :id is the worst offender).
 * Rule F1.
 */
const BANNED_PARAM_NAMES: readonly string[] = ['id', ':id'];

/**
 * Suffixes that confirm a param is slug/key-based and therefore allowed.
 * Rule F1.
 */
const ALLOWED_PARAM_SUFFIXES: readonly string[] = [
  'Slug',
  'slug',
  'Key',
  'key',
];

/**
 * Returns true if a route param name is compliant with the slug contract.
 * Rule F1: no Id/ID/_id/uuid suffix; must use Slug/slug/Key/key suffix
 * or be a recognised display-key param (issueKey, taskKey, incidentKey, cycleKey).
 *
 * @example
 * isValidRouteParam('boardSlug')      // true
 * isValidRouteParam('portfolioKey')   // true
 * isValidRouteParam('incidentKey')    // true  — display-key
 * isValidRouteParam('boardId')        // false — F1 violation
 * isValidRouteParam('id')             // false — F1 violation
 */
export function isValidRouteParam(paramName: string): boolean {
  const bare = paramName.replace(/^:/, '');

  // Hard-banned literal names
  if (BANNED_PARAM_NAMES.includes(bare)) return false;

  // Banned suffix patterns
  if (BANNED_PARAM_SUFFIXES.some(s => bare.endsWith(s))) return false;

  // Must end in an allowed suffix to pass positively
  return ALLOWED_PARAM_SUFFIXES.some(s => bare.endsWith(s));
}

/**
 * Validate a route param name against the slug contract (Grid F, rule F1).
 * Returns CREValidationResult for consistent error surface.
 */
export function validateRouteParam(paramName: string): CREValidationResult {
  if (isValidRouteParam(paramName)) {
    return { ok: true };
  }
  const bare = paramName.replace(/^:/, '');
  const isBannedLiteral = BANNED_PARAM_NAMES.includes(bare);
  const bannedSuffix = BANNED_PARAM_SUFFIXES.find(s => bare.endsWith(s));

  if (isBannedLiteral) {
    return {
      ok: false,
      reason: `Route param ":${bare}" is banned (F1). Rename to ":${bare}Slug" or ":${bare}Key".`,
    };
  }
  if (bannedSuffix) {
    const suggested = bare.replace(new RegExp(`${bannedSuffix}$`), 'Slug');
    return {
      ok: false,
      reason: `Route param ":${bare}" ends in "${bannedSuffix}" (F1 violation). Rename to ":${suggested}".`,
    };
  }
  return {
    ok: false,
    reason: `Route param ":${bare}" does not end in a slug/key suffix (F1). Use Slug, Key, or a display-key suffix.`,
  };
}

/**
 * Returns true if a navigation call site is building a URL with an entity UUID
 * (detects the pattern `${entity.id}` or `${someVar}` where var ends in Id/ID).
 *
 * This is a static-analysis helper for code review tooling.
 * Rule F3: all URL construction must use Routes.* builders, never raw .id concat.
 *
 * @param codeFragment — a snippet of TypeScript/TSX source
 */
export function containsUuidNavigation(codeFragment: string): boolean {
  // Matches: `${anything.id}` or `${thingId}` or `${thing_id}`
  return /\$\{[^}]*(?:\.id\b|[Ii][Dd])\}/.test(codeFragment);
}

/**
 * Slug contract checklist — what every new navigable table must ship.
 * Rule F2. Used in PR review and activate-feature pre-flight.
 */
export const SLUG_CONTRACT_CHECKLIST = [
  'slug TEXT NOT NULL UNIQUE column on table',
  'catalyst_slugify()-based INSERT trigger (frozen on creation)',
  'Typed builder registered in src/lib/routes.ts',
  'useXBySlug() dual-mode resolution hook (isValidUUID ? id : slug)',
] as const;

export type SlugContractItem = typeof SLUG_CONTRACT_CHECKLIST[number];

// ─── GRID G — AVATAR & PEOPLE PICKER CONTRACT ────────────────────────────────

/**
 * Import paths that are canonical for avatar rendering (Grid G).
 * Only these paths may import @atlaskit/avatar directly.
 */
export const AVATAR_CANONICAL_PATHS: readonly string[] = [
  'src/components/ads/Avatar.tsx',
  'src/components/shared/CatalystAvatar.tsx',
];

/**
 * Import paths that satisfy G1/G3 (valid avatar usage in product code).
 */
export const AVATAR_ALLOWED_IMPORTS: readonly string[] = [
  '@/components/shared/CatalystAvatar',
  '@/components/shared/UserAvatar',
];

/**
 * Banned CDN URL patterns — mirrors isBannedAvatarSrc() in CatalystAvatar.tsx.
 * Rule G2.
 */
const BANNED_AVATAR_SRC_PATTERNS: readonly RegExp[] = [
  /gravatar\.com/,
  /atl-paas\.net/,
  /googleusercontent\.com/,
  /secure\.gravatar/,
];

/**
 * Returns true if an avatar src URL is banned (external CDN).
 * Rule G2 — mirrors runtime check in CatalystAvatar.isBannedAvatarSrc().
 *
 * @example
 * isBannedAvatarSrc('https://secure.gravatar.com/avatar/abc')  // true
 * isBannedAvatarSrc('/assets/avatars/john.png')                 // false
 */
export function isBannedAvatarSrc(src: string | null | undefined): boolean {
  if (!src) return false;
  return BANNED_AVATAR_SRC_PATTERNS.some(re => re.test(src));
}

/**
 * Returns true if a file path is allowed to import @atlaskit/avatar directly.
 * All other files must use CatalystAvatar or UserAvatar.
 * Rule G1, G3.
 */
export function isAvatarCanonicalFile(filePath: string): boolean {
  return AVATAR_CANONICAL_PATHS.some(p => filePath.endsWith(p) || filePath.includes(p));
}

/**
 * Validate that an avatar usage site uses a canonical import.
 * Rule G1.
 *
 * @param importPath — the import path found in a source file
 * @param filePath   — the source file's repo-relative path
 */
export function validateAvatarImport(
  importPath: string,
  filePath: string,
): CREValidationResult {
  // Direct @atlaskit/avatar import is only allowed in canonical files
  if (
    importPath === '@atlaskit/avatar' ||
    importPath === '@atlaskit/avatar-group'
  ) {
    if (isAvatarCanonicalFile(filePath)) {
      return { ok: true };
    }
    return {
      ok: false,
      reason:
        `G1 violation: "${importPath}" is banned in product code. ` +
        `Use CatalystAvatar from '@/components/shared/CatalystAvatar' or ` +
        `UserAvatar from '@/components/shared/UserAvatar'.`,
    };
  }

  return { ok: true };
}

/**
 * Validate that an avatar src prop does not point to a banned CDN.
 * Rule G2.
 */
export function validateAvatarSrc(src: string | null | undefined): CREValidationResult {
  if (isBannedAvatarSrc(src)) {
    return {
      ok: false,
      reason:
        `G2 violation: avatar src "${src}" is a banned external CDN URL ` +
        `(Gravatar/atl-paas/googleusercontent). Pass null and let CatalystAvatar ` +
        `render ADS-palette initials instead.`,
    };
  }
  return { ok: true };
}

/**
 * Avatar contract checklist — what every new user-identity render must satisfy.
 * Rules G1–G4. Used in PR review and activate-feature pre-flight.
 */
export const AVATAR_CONTRACT_CHECKLIST = [
  'Use CatalystAvatar or UserAvatar — never @atlaskit/avatar directly',
  'Pass src={user.avatarUrl ?? undefined} — do not pass Gravatar/atl-paas URLs',
  'People pickers must render CatalystAvatar per option — no custom initials span',
  'Avatar stacks must wrap CatalystAvatar instances — not @atlaskit/avatar-group directly',
] as const;

/**
 * Returns true if an assignee/people picker should be locked for this status.
 * Rule G5: locks ONLY on a terminal status — an assignee merely being set
 * does NOT lock the field. Supersedes the prior "lock once assigned,
 * forever" behavior. Delegates to the existing canonical `isTerminalStatus`
 * (`@/components/ads`) so there is one "cannot be changed" concept
 * app-wide, not a second parallel one — covers done-category statuses
 * (done/closed/resolved/released/approved/...) plus non-done terminal
 * outcomes (rejected/declined/cancelled/won't-fix/duplicate/...).
 *
 * @example
 * isAssigneeLocked('CLOSED')      // true
 * isAssigneeLocked('canceled')    // true
 * isAssigneeLocked('IN DELIVERY') // false
 * isAssigneeLocked(null)          // false
 */
export function isAssigneeLocked(status: string | null | undefined): boolean {
  return isTerminalStatus(status);
}

// ─── GRID H — ROW TYPOGRAPHY CONTRACT ────────────────────────────────────────

/**
 * Canonical key/title token pair for every Jira/work-item row surface
 * (Board, Backlog, All Work, Sprint, and any future row surface).
 * Rule H1. Reference implementations: JiraTable/cells.tsx (makeKeyCell),
 * JiraTable/editors.tsx (SummaryOverlayEditor).
 * Confirmed by Vikram: 2026-07-02. CAT-TYPOGRAPHY-ROWSYNC-20260702-001.
 */
export const CANONICAL_ROW_TYPOGRAPHY = {
  key: {
    fontSize: 'var(--ds-font-size-300)',   // 13px
    lineHeight: 'var(--ds-line-height-body)', // 20px
  },
  title: {
    fontSize: 'var(--ds-font-size-400)',   // 14px
    lineHeight: 'var(--ds-line-height-body)', // 20px
  },
} as const;

/**
 * Matches hardcoded lineHeight literals (1, 1.4, 1.5) or Tailwind
 * leading-[...] utility classes. Rule H2.
 */
const BANNED_LINE_HEIGHT_PATTERN =
  /lineHeight:\s*['"]?(1|1\.4|1\.5)['"]?\s*[,}]|leading-\[/;

/**
 * Returns true if the given source text contains a banned hardcoded
 * line-height literal in place of var(--ds-line-height-body).
 * Rule H2. Known documented exception: JiraTable/editors.tsx ~line 861
 * (InlineEdit readView fallback — descender-clipping workaround, not
 * currently rendered by any of the four audited row surfaces).
 */
export function containsHardcodedLineHeight(source: string): boolean {
  return BANNED_LINE_HEIGHT_PATTERN.test(source);
}

/**
 * Row typography contract checklist — what every new row/table/card
 * surface rendering a work item must satisfy. Rules H1–H3.
 */
export const ROW_TYPOGRAPHY_CONTRACT_CHECKLIST = [
  'Issue key text: var(--ds-font-size-300) / var(--ds-line-height-body) — 13px/20px',
  'Issue title/summary text: var(--ds-font-size-400) / var(--ds-line-height-body) — 14px/20px',
  'No hardcoded lineHeight: 1 / 1.4 / 1.5 or Tailwind leading-[...] in row cell components',
  'Reuse JiraTable/cells.tsx or JiraTable/editors.tsx — do not hand-roll a new row renderer',
] as const;

// ─── GRID I — BACKLOG / ALL-WORK VIEW ELIGIBILITY ────────────────────────────

/**
 * Types banned from appearing as standalone rows in the Backlog and All Work
 * views. Rules I1–I2. QA Bug moved to TESTHUB and Production Incident moved
 * to INCIDENT (Grid A4/A5, 2026-07-01) — they no longer belong in the Team
 * Backlog/All-Work row list, though they remain valid children of an Epic
 * (Grid B2 unaffected — this only governs standalone row visibility, not
 * hierarchy) and are still reachable via TestHub / Incident Hub.
 * Confirmed by Vikram: 2026-07-03.
 */
const BACKLOG_VIEW_EXCLUDED_TYPES: readonly string[] = ['QA Bug', 'Production Incident'];

/**
 * Returns true if typeName may appear as a standalone row in the Backlog
 * or All Work view. Rules I1 (Backlog), I2 (All Work).
 */
export function isEligibleForBacklogView(typeName: string): boolean {
  const canonical = normalizeType(typeName);
  return !BACKLOG_VIEW_EXCLUDED_TYPES.includes(canonical);
}

export type AvatarContractItem = typeof AVATAR_CONTRACT_CHECKLIST[number];
