/**
 * extractLinks — walk a BlockNote document and collect the workItemMention /
 * pageLink inline chips (see inlineSpecs.tsx). Feeds syncMentionLinks so
 * kb_document_links / kb_page_links mirror the page content on autosave.
 */
import type { Block } from '@blocknote/core';

export interface ExtractedLinks {
  workItems: Array<{ entityType: string; entityId: string }>;
  pageIds: string[];
}

interface InlineLike {
  type?: string;
  props?: Record<string, unknown>;
  content?: InlineLike[] | string;
}

interface BlockLike {
  content?: InlineLike[] | string | { rows?: Array<{ cells?: Array<InlineLike[] | { content?: InlineLike[] }> }> };
  children?: BlockLike[];
}

export function extractLinks(doc: Block[]): ExtractedLinks {
  const workItems = new Map<string, { entityType: string; entityId: string }>();
  const pageIds = new Set<string>();

  const walkInline = (content: unknown) => {
    if (!Array.isArray(content)) return;
    content.forEach((item: InlineLike) => {
      if (!item) return;
      if (item.type === 'workItemMention' && item.props) {
        const entityType = String(item.props.entityType ?? '');
        const entityId = String(item.props.entityId ?? '');
        if (entityType && entityId) {
          workItems.set(`${entityType}:${entityId}`, { entityType, entityId });
        }
      } else if (item.type === 'pageLink' && item.props) {
        const pageId = String(item.props.pageId ?? '');
        if (pageId) pageIds.add(pageId);
      }
      if (Array.isArray(item.content)) walkInline(item.content);
    });
  };

  const walkBlock = (block: BlockLike) => {
    if (!block) return;
    const c = block.content;
    if (c && typeof c === 'object' && !Array.isArray(c) && 'rows' in c && Array.isArray(c.rows)) {
      // Table content: rows → cells
      c.rows.forEach((row) => {
        (row.cells ?? []).forEach((cell) => {
          walkInline(Array.isArray(cell) ? cell : cell?.content);
        });
      });
    } else {
      walkInline(c);
    }
    (block.children ?? []).forEach(walkBlock);
  };

  (doc as BlockLike[]).forEach(walkBlock);

  return { workItems: [...workItems.values()], pageIds: [...pageIds] };
}
