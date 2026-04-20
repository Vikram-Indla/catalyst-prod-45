/**
 * MacroExtensions — DEPRECATED (2026-04-20).
 *
 * Previously exported a set of TipTap `Node.create({...})` extensions
 * that shimmed Confluence-style macros (info / warning / note panels
 * plus an expand block) into the knowledge-hub TipTap editor.
 *
 * The knowledge-hub editor now runs on @atlaskit/editor-core, which
 * ships `panel` and `expand` as first-class ADF node types — so these
 * shims are no longer needed and have been removed to get rid of every
 * `@tiptap/*` import in the source tree. The file is retained (instead
 * of deleted) because file deletions are not permitted in the current
 * sandbox; nothing imports from it.
 *
 * If any future code reaches for the old symbols, the imports will fail
 * at the type level — which is intentional: re-introducing TipTap-based
 * macros would re-open the prosemirror-gapcursor / prosemirror-tables
 * Selection.jsonID collision we just closed.
 */
export {};
