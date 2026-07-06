/**
 * exportPage — Wiki page exports (CAT-DOCS-NOTION-20260704-001 P10).
 *
 * markdown / HTML via BlockNote's MPL-core serializers on a headless
 * editor instance (no paid xl-* packages). PDF path = the browser print
 * dialog on a print-scoped stylesheet (durable server-side pipeline is a
 * later slice).
 */
import type { Block } from '@blocknote/core';
import { wikiSchema } from './wikiSchema';

function download(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function safeFilename(title: string, ext: string): string {
  const base = (title || 'untitled')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `${base || 'untitled'}.${ext}`;
}

async function headlessEditor() {
  const { BlockNoteEditor } = await import('@blocknote/core');
  return BlockNoteEditor.create({ schema: wikiSchema, _headless: true } as never);
}

export async function exportPageMarkdown(title: string, blocks: Block[]) {
  const editor = await headlessEditor();
  const md = await (editor as never as {
    blocksToMarkdownLossy: (b: Block[]) => Promise<string>;
  }).blocksToMarkdownLossy(blocks);
  download(safeFilename(title, 'md'), 'text/markdown;charset=utf-8', `# ${title}\n\n${md}`);
}

export async function exportPageHtml(title: string, blocks: Block[]) {
  const editor = await headlessEditor();
  const html = await (editor as never as {
    blocksToFullHTML: (b: Block[]) => Promise<string>;
  }).blocksToFullHTML(blocks);
  const doc = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head><body><h1>${title}</h1>${html}</body></html>`;
  download(safeFilename(title, 'html'), 'text/html;charset=utf-8', doc);
}

/** PDF via the browser's print dialog — print styles scope to the page article. */
export function printPage() {
  window.print();
}
