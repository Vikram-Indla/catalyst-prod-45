/**
 * Test Management Hooks - Barrel Export
 */

// Cases & Folders
export * from './useCases';

// Cycles
export * from './useCycles';

// Execution
export * from './useExecution';

// Defects
export * from './useDefects';

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
