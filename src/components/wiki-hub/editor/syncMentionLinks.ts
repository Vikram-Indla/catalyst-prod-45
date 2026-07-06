/**
 * syncMentionLinks — after an autosave, upsert kb_document_links (page ↔ work
 * item, link_origin 'mention') and kb_page_links (page ↔ page) rows for every
 * chip in the document. Additive only: never deletes existing links (deletion
 * policy is a later slice). Callers fire-and-forget.
 */
import type { Block } from '@blocknote/core';
import { supabase } from '@/integrations/supabase/client';
import { extractLinks } from './extractLinks';

// kb_* tables postdate the generated Supabase types (same escape hatch as useWiki.ts).
const db = supabase as unknown as {
  from: (table: string) => any;
};

export async function syncMentionLinks(pageId: string, doc: Block[]): Promise<void> {
  const { workItems, pageIds } = extractLinks(doc);

  if (workItems.length) {
    const { error } = await db.from('kb_document_links').upsert(
      workItems.map((w) => ({
        document_id: pageId,
        entity_type: w.entityType,
        entity_id: w.entityId,
        link_origin: 'mention',
      })),
      { onConflict: 'document_id,entity_type,entity_id', ignoreDuplicates: true },
    );
    if (error) throw error;
  }

  const targets = pageIds.filter((id) => id !== pageId);
  if (targets.length) {
    const { error } = await db.from('kb_page_links').upsert(
      targets.map((target) => ({ source_page_id: pageId, target_page_id: target })),
      { onConflict: 'source_page_id,target_page_id', ignoreDuplicates: true },
    );
    if (error) throw error;
  }
}
