/**
 * Test Management Hooks - Barrel Export
 */

// Cases & Folders
export * from './useCases';

// Cycles
export * from './useCycles';

// Execution
export * from './useExecution';

// Defects (API-based)
export * from './useDefects';

// Defects (Supabase direct - new)
export {
  defectQueryKeys,
  useDefectsList,
  useDefectDetail,
  useDefectByKey,
  useDefectStats,
  useDefectComments,
  useDefectAttachments,
  useDefectAuditLog,
  useDefectWorkItemLinks,
  useDefectColumnPreferences as useDefectColumnPrefsSupabase,
  useBulkUpdateDefects,
  useCreateDefectComment,
  useUpdateDefectComment,
  useDeleteDefectComment,
  useDeleteDefectAttachment,
  useCreateDefectWorkItemLink,
  useDeleteDefectWorkItemLink,
  useSaveDefectColumnPreferences,
} from './useDefectsSupabase';

// Column Preferences (standalone hook)
export { useDefectColumnPreferences } from './useDefectColumnPreferences';

// My Work
export * from './useMyWork';

// Templates (rename to avoid conflict with useCases.useTemplates)
export {
  templateKeys,
  useTemplates as useTemplatesList,
  useCreateFromTemplate,
  useConvertToTemplate,
} from './useTemplates';

// AI
export * from './useAI';

// Auth
export * from './useAuth';

// Command Center
export {
  useCommandCenterKPIs,
  useActiveCycles,
  useActivityFeed,
  commandCenterKeys,
  type CommandCenterKPIs,
  type ActiveCycleSummary,
  type ActivityFeedItem,
} from './useCommandCenter';

// Settings
export * from './useSettings';

// Folder Panel State
export { useFolderPanelState } from './useFolderPanelState';

// Screenshot & Attachments
export { useScreenshotCapture } from './useScreenshotCapture';
export { useExecutionAttachments, type ExecutionAttachment } from './useExecutionAttachments';

// Bulk Operations
export * from './useBulkOperations';

// Realtime
export * from './useRealtimeExecution';

// Reports
export * from './useReports';

// Keyboard Shortcuts
export * from './useKeyboardShortcuts';
