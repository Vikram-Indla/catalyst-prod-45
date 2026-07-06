/**
 * seedYdoc — populate a Y.Doc fragment from existing BlockNote jsonb
 * content (CAT-DOCEX-DB-COEDIT-20260705-001 C3/C5).
 *
 * A page's FIRST collaborative session has no ydoc_state yet — only the
 * `content` jsonb from the pre-Yjs autosave path. Once collaboration is
 * configured, BlockNote treats the Y.Doc as the sole source of truth and
 * ignores `initialContent`, so an unseeded fragment reads as a blank page
 * and silently drops the real content on the next save (reproduced live).
 *
 * IMPORTANT (found live): a headless BlockNoteEditor created WITH a
 * `collaboration` config never actually flushes edits into the shared
 * fragment — headless mode has no EditorView, and the Y-sync plugin
 * appears to need one to commit transactions (probed: replaceBlocks
 * "succeeded" but encodeStateAsUpdate on the target doc came back as a
 * trivial 2-byte envelope — no real ops recorded). The proven path: seed
 * content into a PLAIN (non-collaborative) headless editor — replaceBlocks
 * works correctly there — then push its resulting ProseMirror JSON into
 * the target fragment directly via y-prosemirror's own
 * prosemirrorJSONToYXmlFragment (the same primitive BlockNote's
 * YSyncExtension is built on).
 */
import type { Block } from '@blocknote/core';
import { wikiSchema } from './wikiSchema';
import type * as Y from 'yjs';

async function blocksToProseMirrorJSON(content: Block[]): Promise<{ json: unknown; schema: unknown }> {
  const { BlockNoteEditor } = await import('@blocknote/core');
  const editor = BlockNoteEditor.create({ schema: wikiSchema, _headless: true } as never) as unknown as {
    document: Block[];
    replaceBlocks: (a: Block[], b: unknown) => void;
    _tiptapEditor: { getJSON: () => unknown; schema: unknown };
  };
  editor.replaceBlocks(editor.document, content as never);
  return { json: editor._tiptapEditor.getJSON(), schema: editor._tiptapEditor.schema };
}

export async function seedYdocFromContent(fragment: Y.XmlFragment, content: Block[]): Promise<void> {
  if (!content || content.length === 0) return;
  const { prosemirrorJSONToYXmlFragment } = await import('y-prosemirror');
  const { json, schema } = await blocksToProseMirrorJSON(content);
  prosemirrorJSONToYXmlFragment(schema as never, json as never, fragment);
}

/**
 * createInitialYdocState — a canonical, single-writer Yjs snapshot computed
 * ONCE at page-creation time. Without this, every page was born with
 * ydoc_state=null, and the FIRST collaborative session had to seed the
 * shared fragment lazily on open. If two-or-more clients cold-opened a
 * brand-new page at the same instant (proven live with a 5-tab load test),
 * each independently seeded its OWN "empty paragraph" into the
 * still-unsynced fragment — a genuine CRDT race where only one paragraph
 * survives the merge, silently discarding whichever peer's first
 * keystrokes landed in the paragraph that lost. Only the CREATING client
 * ever runs this — page creation is never concurrent with itself.
 */
export async function createInitialYdocState(content: Block[]): Promise<string> {
  const YjsModule = await import('yjs');
  const { u8ToPgHex } = await import('./ydocBytea');
  const doc = new YjsModule.Doc();
  // A genuinely BLANK page (the common "Blank page" button case) must still
  // produce a non-trivial Yjs snapshot, or it round-trips as
  // ydoc_state.length <= 2 and falls straight back into the per-client
  // race this function exists to prevent. One empty paragraph matches
  // what BlockNote itself creates for an empty document.
  const seed = content && content.length > 0 ? content : ([{ type: 'paragraph', content: [] }] as never);
  await seedYdocFromContent(doc.getXmlFragment('blocknote'), seed);
  const state = YjsModule.encodeStateAsUpdate(doc);
  doc.destroy();
  return u8ToPgHex(state);
}
