/**
 * seedYdoc — populate a fresh Y.Doc fragment from existing BlockNote jsonb
 * content (CAT-DOCEX-DB-COEDIT-20260705-001 C3).
 *
 * A page's FIRST collaborative session has no ydoc_state yet — only the
 * `content` jsonb from the pre-Yjs autosave path. Once collaboration is
 * configured, BlockNote treats the Y.Doc as the sole source of truth and
 * ignores `initialContent`, so an unseeded fragment reads as a blank page
 * and silently drops the real content on the next save (reproduced live).
 * A throwaway headless editor bound to the SAME fragment (the pattern this
 * codebase already uses for exports — see exportPage.ts) applies the
 * existing blocks as real Yjs ops before the visible editor ever attaches.
 */
import type { Block } from '@blocknote/core';
import { wikiSchema } from './wikiSchema';
import type * as Y from 'yjs';

export async function seedYdocFromContent(fragment: Y.XmlFragment, content: Block[]): Promise<void> {
  if (!content || content.length === 0) return;
  const { BlockNoteEditor } = await import('@blocknote/core');
  const seeder = BlockNoteEditor.create({
    schema: wikiSchema,
    _headless: true,
    // ads-scanner:ignore-next-line — headless seed-only editor, never rendered; color is required by the API but invisible
    collaboration: { fragment, user: { name: 'seed', color: '#000000' } },
  } as never) as unknown as { document: Block[]; replaceBlocks: (a: Block[], b: unknown) => void };
  seeder.replaceBlocks(seeder.document, content as never);
}
