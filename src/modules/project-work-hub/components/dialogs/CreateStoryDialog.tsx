/**
 * CreateStoryDialog — DEPRECATED (2026-04-20).
 *
 * Old in-tree Create Story dialog superseded by
 * `components/workhub/create-story/CreateStoryModal.tsx`. No live code
 * imports this module; the file is retained (instead of deleted)
 * because file deletions are not permitted in the current sandbox.
 *
 * The previous implementation pulled `@tiptap/*` into the module graph
 * which — if any live surface were still importing it — would re-open
 * the prosemirror-gapcursor / prosemirror-tables Selection.jsonID
 * collision with @atlaskit/editor-core. Neutralising the file removes
 * every `@tiptap/*` import from the src tree.
 */
export const CreateStoryDialog = undefined as unknown as never;
