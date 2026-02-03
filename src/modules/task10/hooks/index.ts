// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ HOOKS BARREL EXPORT
// ═══════════════════════════════════════════════════════════════════════════

// Lists hooks
export {
  t10ListsKeys,
  useT10Lists,
  useT10List,
  useCreateT10List,
  useUpdateT10List,
  useDeleteT10List,
  useDuplicateT10List,
} from './useLists';

// Weeks hooks
export {
  t10WeeksKeys,
  useT10Weeks,
  useT10CurrentWeek,
  useT10Week,
  useCheckoutT10Week,
} from './useWeeks';

// Items hooks
export {
  t10ItemsKeys,
  useT10Items,
  useT10Item,
  useCreateT10Item,
  useUpdateT10Item,
  useDeleteT10Item,
  useReorderT10Items,
  useToggleT10ItemStatus,
} from './useItems';

// Activity hooks
export {
  t10ActivityKeys,
  useT10ItemActivity,
  useT10ItemsActivity,
  useCreateT10Activity,
} from './useActivity';

// Suggestions hooks
export {
  t10SuggestionsKeys,
  useT10Suggestions,
  useAddT10SuggestionToWeek,
  useDismissT10Suggestion,
  useCreateT10Suggestion,
} from './useSuggestions';

// Profiles hooks
export {
  profilesKeys,
  useProfiles,
  type ProfileOption,
} from './useProfiles';

// TaskHub Integration hooks
export {
  taskHubIntegrationKeys,
  useTaskHubCandidates,
  useGenerateT10Suggestions,
  useClearT10Suggestions,
  type TaskHubTask,
} from './useTaskHubIntegration';
