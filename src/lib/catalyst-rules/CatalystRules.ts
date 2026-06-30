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
 *
 * ALL surfaces that create, link, or parent work items MUST query this engine.
 * No surface may hardcode type lists or module mappings.
 *
 * Confirmed by Vikram: 2026-07-01
 * Council session: CRE design + opportunity analysis
 */

import {
  getAllowedChildTypes,
  isSubtaskFamily,
} from '@/components/catalyst-detail-views/shared/parent-rules';

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
 * Returns true if typeName may be created inside moduleCode.
 * Subtask family types are permitted in every module (Grid A10).
 */
export function canCreateInModule(typeName: string, moduleCode: string): boolean {
  const canonical = normalizeType(typeName);
  if (isSubtaskFamily(canonical) || SUBTASK_FAMILY.includes(canonical)) return true;
  const ownedTypes = MODULE_OWNED_TYPES[moduleCode as CREModule] ?? [];
  return ownedTypes.includes(canonical);
}

/**
 * Returns all type names permitted for creation in a given module.
 * Includes subtask family in the result.
 */
export function getAllowedTypesForModule(moduleCode: string): string[] {
  const owned = MODULE_OWNED_TYPES[moduleCode as CREModule] ?? [];
  return [...owned, ...SUBTASK_FAMILY];
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
