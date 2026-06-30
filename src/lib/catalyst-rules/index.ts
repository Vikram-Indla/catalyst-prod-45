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
 */
export {
  MODULE_OWNED_TYPES,
  normalizeType,
  canCreateInModule,
  getAllowedTypesForModule,
  getOwningModule,
  canBeChildOf,
  canLinkTo,
  validateCreation,
  validateHierarchy,
  validateLink,
} from './CatalystRules';

export type { CREModule, CRETypeName, CREValidationResult } from './CatalystRules';
