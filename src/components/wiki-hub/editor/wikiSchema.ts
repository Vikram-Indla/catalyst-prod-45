/**
 * wikiSchema — the Catalyst Wiki's BlockNote schema: default blocks/styles
 * plus custom blocks (callout) and inline content (work-item mentions,
 * page links).
 */
import { BlockNoteSchema, defaultBlockSpecs, defaultInlineContentSpecs } from '@blocknote/core';
import { callout } from './CalloutBlock';
import { pageLink, workItemMention } from './inlineSpecs';

export const wikiSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    callout: callout(),
  },
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    workItemMention,
    pageLink,
  },
});

export type WikiBlockNoteEditor = typeof wikiSchema.BlockNoteEditor;
