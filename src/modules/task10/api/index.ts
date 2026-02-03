// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ API BARREL EXPORT
// ═══════════════════════════════════════════════════════════════════════════

// Lists API
export {
  fetchT10Lists,
  fetchT10List,
  createT10List,
  updateT10List,
  deleteT10List,
} from './lists.api';

// Weeks API
export {
  fetchT10Weeks,
  fetchT10CurrentWeek,
  fetchT10Week,
  checkoutT10Week,
  type CheckoutT10WeekInput,
} from './weeks.api';

// Items API
export {
  fetchT10Items,
  fetchT10Item,
  createT10Item,
  updateT10Item,
  deleteT10Item,
  reorderT10Items,
  toggleT10ItemStatus,
} from './items.api';

// Activity API
export {
  fetchT10ItemActivity,
  fetchT10ItemsActivity,
  createT10Activity,
} from './activity.api';

// Suggestions API
export {
  fetchT10Suggestions,
  addT10SuggestionToWeek,
  dismissT10Suggestion,
  createT10Suggestion,
} from './suggestions.api';

// TaskHub Integration API
export {
  fetchTaskHubTasksForSuggestion,
  generateT10SuggestionsFromTaskHub,
  clearT10Suggestions,
  type TaskHubTask,
} from './taskhub-integration.api';
