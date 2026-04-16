/**
 * Atlaskit-powered Epic description molecule — pilot scope.
 *
 * Exposed via lazy import only (see CatalystDescriptionSection). All other
 * issue types continue to render the existing CatalystRichTextEditor +
 * AdfDescriptionRenderer until this pilot is validated and rolled out.
 */
export { default as EpicDescriptionEditor } from './EpicDescriptionEditor';
export type { EpicDescriptionEditorProps } from './EpicDescriptionEditor';
export { default as EpicDescriptionRenderer } from './EpicDescriptionRenderer';
export { normalizeAdfForAtlaskit, parseStoredDescriptionToAdf } from './adfNormalizer';
export { uploadDescriptionImage } from './supabaseImageUpload';
