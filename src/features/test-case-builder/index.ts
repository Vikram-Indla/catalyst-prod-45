// =====================================================
// TEST CASE BUILDER FEATURE BARREL
// =====================================================

// Types
export * from './types/step-editor';
export * from './types/template';

// Components
export { DraggableStepRow } from './components/DraggableStepRow';
export { EnhancedStepEditor } from './components/EnhancedStepEditor';
export { GherkinEditor } from './components/GherkinEditor';
export { StepDefinitionManager } from './components/StepDefinitionManager';
export { AttachmentManager } from './components/AttachmentManager';
export { RichTextEditor, RichTextDisplay } from './components/RichTextEditor';
export { RequirementLinker } from './components/RequirementLinker';
export { TraceabilityMatrix } from './components/TraceabilityMatrix';
export { VersionHistoryPanel } from './components/VersionHistoryPanel';
export { CloneTestCaseDialog } from './components/CloneTestCaseDialog';

// Template Components (Module 5A-1)
export {
  TemplateCard,
  TemplateGrid,
  TemplateEditorDialog,
  TemplatePicker,
  SaveAsTemplateDialog,
} from './components/templates';

// Hooks
export * from '@/hooks/test-cases/useGherkinSteps';
export * from '@/hooks/test-cases/useTestAttachments';
export * from '@/hooks/test-cases/useRequirementLinks';
export * from '@/hooks/test-cases/useVersionHistory';

// Template Hooks (Module 5A-1)
export {
  useTemplates,
  useTemplate,
  useTemplateCategories,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useApplyTemplate,
  useCreateTemplateFromTestCase,
} from './hooks/useTemplates';
