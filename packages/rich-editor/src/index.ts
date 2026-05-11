export { RichEditor } from "./Editor";
export type { RichEditorProps } from "./Editor";
export { Toolbar } from "./Toolbar";
export type { ToolbarProps } from "./Toolbar";
export type {
  EditorContent,
  InsertElement,
  InsertElementCategory,
  SavePayload,
  ToolbarConfig,
  ToolbarItemKey,
  ToolbarPreset,
  UploadFn,
  UploadResult,
} from "./types";

// extensions / hooks for advanced use
export {
  Video,
  Attachment,
  formatFileSize,
  pickKind,
  pickTileLabel,
  Panel,
  PANEL_VARIANTS,
  DragHandleExtension,
  DragHandlePluginKey,
  HighlightedCodeBlock,
  createMentionExtension,
  createSlashMenuExtension,
} from "./extensions";
export type {
  PanelVariant,
  VideoOptions,
  AttachmentOptions,
  AttachmentKind,
  MentionUser,
  MentionSuggestionsFn,
  SlashCommand,
} from "./extensions";
export { buildDefaultInsertElements } from "./extensions/insertItems";
export type { SuggestionItem } from "./components/SuggestionList";
