/**
 * Catalyst icon library — public surface.
 * Code word: "RESET ICONS"
 */

export { WorkItemTypeIcon } from './WorkItemTypeIcon';
export type { WorkItemTypeIconProps } from './WorkItemTypeIcon';

export { PriorityIcon } from './PriorityIcon';
export type { PriorityIconProps } from './PriorityIcon';

export { ProjectAvatar } from './ProjectAvatar';
export type { ProjectAvatarProps, ProjectAvatarSize } from './ProjectAvatar';

export { useIconOverrides } from './useIconOverrides';
export type { IconOverride, IconCategory } from './useIconOverrides';

export {
  WORK_TYPE_REGISTRY,
  PRIORITY_REGISTRY,
  PROJECT_AVATAR_REGISTRY,
  STOCK_AVATAR_REGISTRY,
  WORK_ITEM_TYPES,
  PRIORITY_LEVELS,
  PROJECT_KEYS,
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
