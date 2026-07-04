/**
 * wikiSchema — the Catalyst Wiki's BlockNote schema: default blocks/styles
 * plus custom inline content (work-item mentions, page links).
 */
import { BlockNoteSchema, defaultInlineContentSpecs } from '@blocknote/core';
import { pageLink, workItemMention } from './inlineSpecs';

export const wikiSchema = BlockNoteSchema.create({
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    workItemMention,
    pageLink,
  },
});

export type WikiBlockNoteEditor = typeof wikiSchema.BlockNoteEditor;
