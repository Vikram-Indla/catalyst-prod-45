/**
 * Catalyst icon library — public surface.
 * Code word: "RESET ICONS"
 *
 * Consumers import from this barrel:
 *   import { WorkItemTypeIcon, PriorityIcon, ProjectAvatar } from '@/components/icons';
 *
 * Direct imports of `src/assets/icons/**` are forbidden — enforced via
 * ESLint `no-restricted-imports` (see eslint config). Add new icons by
 * extending the registry, not by deep-importing assets.
 */

export { WorkItemTypeIcon } from './WorkItemTypeIcon';
export type { WorkItemTypeIconProps } from './WorkItemTypeIcon';

export { PriorityIcon } from './PriorityIcon';
export type { PriorityIconProps } from './PriorityIcon';

export { ProjectAvatar } from './ProjectAvatar';
export type { ProjectAvatarProps, ProjectAvatarSize } from './ProjectAvatar';

export {
  WORK_TYPE_REGISTRY,
  PRIORITY_REGISTRY,
  PROJECT_AVATAR_REGISTRY,
  STOCK_AVATAR_REGISTRY,
  normalizeWorkItemType,
  normalizePriority,
} from './icons.registry';

export type {
  WorkItemType,
  PriorityLevel,
  ProjectKey,
  StockAvatarId,
  WorkTypeMeta,
  PriorityMeta,
  ProjectAvatarMeta,
} from './icons.registry';
