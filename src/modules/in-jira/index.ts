// In-Jira Module - Barrel exports
export { InJiraLayout } from './components/InJiraLayout';
export { IssueDrawer } from './components/IssueDrawer';
export { CreateIssueModal } from './components/CreateIssueModal';
export { InJiraProvider, useInJira } from './context/InJiraContext';

// Pages
export { SummaryPage } from './pages/SummaryPage';
export { KanbanBoardPage } from './pages/KanbanBoardPage';
export { ScrumBoardPage } from './pages/ScrumBoardPage';
export { ListPage } from './pages/ListPage';
export { AllWorkPage } from './pages/AllWorkPage';
export { ReleasesPage } from './pages/ReleasesPage';
export { ReleaseManagementPage } from './pages/ReleaseManagementPage';
export { SettingsPage as InJiraSettingsPage } from './pages/SettingsPage';

// Board Components
export { KanbanBoard, ScrumBoard, IssueCard, BoardColumn } from './components/board';

// Import Components
export { ImportWizard, AISuggestionBanner } from './components/import';

// Hooks
export { useBoardData, useBoardColumns, useSprintManagement, useAISuggestions } from './hooks';

// Utils
export { generateRankBetween, compareRanks } from './utils';

// Types
export * from './types';
