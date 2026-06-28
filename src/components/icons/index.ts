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

export { ProductAvatar } from './ProductAvatar';
export type { ProductAvatarProps } from './ProductAvatar';

export { CatalystIconWrapper } from './CatalystIconWrapper';
export type { CatalystIconWrapperProps, IconSize, IconColor } from './CatalystIconWrapper';

export { useIconOverrides } from './useIconOverrides';
export type { IconOverride, IconCategory } from './useIconOverrides';

export { useIconCategories } from './useIconCategories';
export type { IconCategoryRow } from './useIconCategories';

export {
  WORK_TYPE_REGISTRY,
  PRIORITY_REGISTRY,
  PROJECT_AVATAR_REGISTRY,
  STOCK_AVATAR_REGISTRY,
  STOCK_AVATAR_IDS,
  HUB_ICON_REGISTRY,
  HUB_ICON_OUTLINE_REGISTRY,
  STOCK_PLACE_REGISTRY,
  STOCK_PLACE_IDS,
  KNOWN_PRODUCT_PLACES,
  WORK_ITEM_TYPES,
  PRIORITY_LEVELS,
  PROJECT_KEYS,
  normalizeWorkItemType,
  normalizePriority,
  pickStockAvatarForKey,
  getProductAvatarUrl,
} from './icons.registry';

export type {
  WorkItemType,
  PriorityLevel,
  ProjectKey,
  StockAvatarId,
  HubKey,
  PlaceId,
  WorkTypeMeta,
  PriorityMeta,
  ProjectAvatarMeta,
} from './icons.registry';
