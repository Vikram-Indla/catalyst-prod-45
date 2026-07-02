/**
 * @/lib/catalyst-rules — public barrel for the Catalyst Rules Engine.
 *
 * Every surface that creates, links, or parents a work item imports from here.
 * Never import directly from CatalystRules.ts — use this barrel so the backing
 * can evolve (static → DB-backed) without changing call sites.
 *
 * Quick reference:
 *   canCreateInModule(type, module)        — Grid D: creation rights
 *   canBeChildOf(childType, parentType)    — Grid B: hierarchy
 *   canLinkTo(sourceType, targetType)      — Grid C: link restrictions
 *   validateCreation(type, module)         — creation with human reason
 *   validateHierarchy(child, parent)       — hierarchy with human reason
 *   validateLink(source, target)           — link with human reason
 *   normalizeType(raw)                     — alias → canonical name
 *   getOwningModule(type)                  — which module owns this type
 *   getAllowedTypesForModule(module)        — all types creatable in module
 *   MODULE_OWNED_TYPES                     — full ownership map (Grid A)
 *
 * Grid G — Avatar & People Picker:
 *   validateAvatarImport(importPath, file)  — G1: ban @atlaskit/avatar in product code
 *   validateAvatarSrc(src)                  — G2: ban Gravatar/atl-paas CDN URLs
 *   isBannedAvatarSrc(src)                  — G2: runtime CDN check (mirrors CatalystAvatar)
 *   isAvatarCanonicalFile(filePath)         — G1: true for canonical wrapper files
 *   AVATAR_CONTRACT_CHECKLIST               — G1–G4 PR checklist items
 *   isAssigneeLocked(status)                — G5: assignee picker lock (terminal status only)
 *
 * Grid I — Backlog/All-Work View Eligibility:
 *   isEligibleForBacklogView(type)          — I1/I2: banned as standalone Backlog/All-Work rows
 */
export {
  MODULE_OWNED_TYPES,
  normalizeType,
  canCreateInModule,
  getAllowedTypesForModule,
  isCREGovernedType,
  filterCreatableTypes,
  getAllowedChildTypesWithRegistry,
  getOwningModule,
  canBeChildOf,
  canLinkTo,
  validateCreation,
  validateHierarchy,
  validateLink,
  // Grid G — Avatar & People Picker Contract
  AVATAR_CANONICAL_PATHS,
  AVATAR_ALLOWED_IMPORTS,
  AVATAR_CONTRACT_CHECKLIST,
  isBannedAvatarSrc,
  isAvatarCanonicalFile,
  validateAvatarImport,
  validateAvatarSrc,
  isAssigneeLocked,
  // Grid I — Backlog/All-Work View Eligibility
  isEligibleForBacklogView,
} from './CatalystRules';

// Grid B canonical child-type lookup (re-exported so chokepoints can import
// everything CRE-related from this one barrel, per .claude/skills/cre/SKILL.md).
export { getAllowedChildTypes } from '@/components/catalyst-detail-views/shared/parent-rules';

export type {
  CREModule,
  CRETypeName,
  CREValidationResult,
  AvatarContractItem,
  RegistryWorkItemType,
  RegistryParentRule,
} from './CatalystRules';
