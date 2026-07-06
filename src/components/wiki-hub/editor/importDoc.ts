/**
 * importDoc — Word/PDF → Docex page content (CAT-DOCEX-DB-COEDIT-20260705-001
 * V5, Vikram 2026-07-06).
 *
 * Two lanes:
 *  - PDF  → docex-import edge function: Gemini reads the PDF natively and
 *    returns structured blocks, translating non-English (Arabic) documents
 *    into professional English.
 *  - DOCX → mammoth converts to semantic HTML locally, then BlockNote's own
 *    HTML parser produces blocks — no AI round-trip needed.
 */
import type { PartialBlock } from '@blocknote/core';
import { supabase } from '@/integrations/supabase/client';
import { wikiSchema } from './wikiSchema';

export interface ImportedDoc {
  title: string;
  sourceLang: string;
  blocks: PartialBlock[];
}

interface EdgeBlock {
  type: 'heading1' | 'heading2' | 'heading3' | 'paragraph' | 'bullet' | 'numbered' | 'quote';
  text: string;
}

function edgeBlocksToPartial(blocks: EdgeBlock[]): PartialBlock[] {
  return blocks
    .filter((b) => b.text && b.text.trim())
    .map((b): PartialBlock => {
      switch (b.type) {
        case 'heading1':
          return { type: 'heading', props: { level: 1 }, content: b.text } as PartialBlock;
        case 'heading2':
          return { type: 'heading', props: { level: 2 }, content: b.text } as PartialBlock;
        case 'heading3':
          return { type: 'heading', props: { level: 3 }, content: b.text } as PartialBlock;
        case 'bullet':
          return { type: 'bulletListItem', content: b.text } as PartialBlock;
        case 'numbered':
          return { type: 'numberedListItem', content: b.text } as PartialBlock;
        // No quote block in BlockNote 0.51 defaults — italic paragraph.
        case 'quote':
          return {
            type: 'paragraph',
            content: [{ type: 'text', text: b.text, styles: { italic: true } }],
          } as PartialBlock;
        default:
          return { type: 'paragraph', content: b.text } as PartialBlock;
      }
    });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string; // data:<mime>;base64,<data>
      resolve(url.slice(url.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function importPdf(file: File): Promise<ImportedDoc> {
  const fileBase64 = await fileToBase64(file);
  const { data, error } = await supabase.functions.invoke('docex-import', {
    body: { fileBase64, mimeType: 'application/pdf', filename: file.name },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(String(data.error));
  return {
    title: data.title || file.name.replace(/\.pdf$/i, ''),
    sourceLang: data.sourceLang || 'en',
    blocks: edgeBlocksToPartial((data.blocks ?? []) as EdgeBlock[]),
  };
}

async function importDocx(file: File): Promise<ImportedDoc> {
  const [{ default: mammoth }, { BlockNoteEditor }] = await Promise.all([
    import('mammoth/mammoth.browser'),
    import('@blocknote/core'),
  ]);
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
  // Same plain-headless pattern as seedYdoc.ts — parses without an EditorView.
  const editor = BlockNoteEditor.create({ schema: wikiSchema, _headless: true } as never) as unknown as {
    tryParseHTMLToBlocks: (html: string) => Promise<PartialBlock[]>;
  };
  const blocks = await editor.tryParseHTMLToBlocks(html);
  if (!blocks || blocks.length === 0) throw new Error('No content found in the document');
  return { title: file.name.replace(/\.docx?$/i, ''), sourceLang: 'en', blocks };
}

/** Route by file type. Throws with a user-readable message on failure. */
export async function importDocumentFile(file: File): Promise<ImportedDoc> {
  const name = file.name.toLowerCase();
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) return importPdf(file);
  if (name.endsWith('.docx') || name.endsWith('.doc')) return importDocx(file);
  throw new Error('Unsupported file type — upload a PDF or Word (.docx) file');
}
