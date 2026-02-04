// ═══════════════════════════════════════════════════════════════════════════════
// TASK¹⁰ MODULE INDEX
// Main entry point for the Task¹⁰ module
// Prompt 9 of 9 Complete Rebuild
// ═══════════════════════════════════════════════════════════════════════════════

// Pages
export { T10LandingPage } from './pages/T10LandingPage';
export { T10LandingPageNew } from './pages/T10LandingPageNew';
export { T10LandingPageV3 } from './components/landing/T10LandingPageV3';
export { T10CompletedPage } from './pages/T10CompletedPage';
export { T10WeekPage } from './pages/T10WeekPage';
export { T10WeekView } from './components/week/T10WeekView';
export { T10WeekViewNew } from './components/week/T10WeekViewNew';

// Components - Landing
export * from './components/landing';

// Components - Week
export * from './components/week';

// Components - Modals
export * from './components/modals';

// Components - Panel
export * from './components/panel';

// Components - Completed (only export components, not types to avoid collision)
export { T10CompletedSummaryCards, T10CompletedWeeksTable, T10CompletedItemsList, T10CompletedFilters } from './components/completed';

// Constants
export * from './constants';

// Types
export * from './types';

// Utils
export * from './utils';

// Hooks
export * from './hooks';
