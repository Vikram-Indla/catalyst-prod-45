// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS INDEX
// Re-export all Task¹⁰ hooks for convenient importing
// ═══════════════════════════════════════════════════════════════════════════════

// Lists
export {
  useT10Lists,
  useT10List,
  useT10ListById,
  useT10CreateList,
  useCreateT10List,
  useT10UpdateList,
  useRenameT10List,
  useT10DeleteList,
  useDeleteT10List,
  t10ListKeys,
} from './useT10Lists';

// Weeks
export {
  useT10Weeks,
  useT10CurrentWeek,
  useT10WeekHistory,
  useT10CreateWeek,
  useCreateT10Week,
  useT10UpdateWeek,
  useCheckoutT10Week,
  getCurrentWeekRange,
  t10WeekKeys,
} from './useT10Weeks';

// Items
export {
  useT10Items,
  useT10BufferItems,
  useT10Item,
  useT10CreateItem,
  useCreateT10Item,
  useT10UpdateItem,
  useUpdateT10Item,
  useT10ToggleItemStatus,
  useT10ReorderItems,
  useT10DeleteItem,
  useDeleteT10Item,
  useBulkUpdateT10Items,
  useCarryoverT10Items,
  useT10UpdateItemLabels,
  t10ItemKeys,
} from './useT10Items';

// Labels
export {
  useT10Labels,
  useT10CreateLabel,
  useCreateT10Label,
  useT10DeleteLabel,
  t10LabelKeys,
} from './useT10Labels';

// Users
export {
  useT10Users,
  useT10User,
  t10UserKeys,
} from './useT10Users';

// Filters
export {
  useT10Filters,
  getDateRangeFromPreset,
} from './useT10Filters';

// Activity (existing)
export { useT10AISuggestions, useAddSuggestionToT10 } from './useT10AISuggestions';
export { useT10Activity, useLogT10Activity, useT10ActivityLogger } from './useT10Activity';
export { useProfiles, type T10Profile } from './useProfiles';

// Completed View
export {
  useT10CompletedSummary,
  useT10CompletedWeeks,
  useT10CompletedItems,
  useT10ListPerformance,
  useT10Checkout,
  useT10ExportCSV,
} from './useT10Completed';
