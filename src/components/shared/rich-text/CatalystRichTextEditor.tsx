/**
 * CatalystRichTextEditor — DEPRECATED (2026-04-20).
 *
 * Was Catalyst's TipTap-based rich-text editor. Atlaskit
 * (@atlaskit/editor-core + @atlaskit/renderer) is now the single
 * canonical rich-text surface. The TipTap implementation has been
 * removed; any code that still imports this module fails at the type
 * level, which is intentional — re-adding TipTap in the same page as
 * Atlaskit re-opens the prosemirror-gapcursor / prosemirror-tables
 * Selection.jsonID collision we just closed.
 *
 * The file is retained (instead of deleted) because file deletions are
 * not permitted in the current sandbox; no live code imports from it.
 */
export type CatalystRichTextEditorProps = never;
export const CatalystRichTextEditor = undefined as unknown as never;
