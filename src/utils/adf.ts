/**
 * ADF Utility Functions — Shared across all Atlaskit-powered features
 * Converts between ADF JSON and plain text for AI prompts,
 * and provides helpers for building/manipulating ADF documents.
 */
import { traverse } from '@atlaskit/adf-utils/traverse';
import type { ADFEntity } from '@atlaskit/adf-utils/types';

// ─── ADF → Plain Text (for AI prompts) ─────────────────────
export function adfToPlainText(adf: ADFEntity): string {
  let text = '';
  traverse(adf, {
    text: (node) => {
      text += node.text ?? '';
    },
    hardBreak: () => {
      text += '\n';
    },
    paragraph: (_node) => {
      text += '\n';
    },
    heading: (_node) => {
      text += '\n';
    },
    bulletList: () => {},
    orderedList: () => {},
    listItem: () => {
      text += '• ';
    },
  });
  return text.trim();
}

// ─── Plain Text → ADF (from AI responses) ──────────────────
export function plainTextToADF(text: string): ADFEntity {
  const paragraphs = text.split('\n\n').filter(Boolean);
  return {
    version: 1,
    type: 'doc',
    content: paragraphs.map((para) => ({
      type: 'paragraph',
      content: [{ type: 'text', text: para.trim() }],
    })),
  };
}

// ─── Append bullet list to existing ADF ─────────────────────
export function appendBulletList(adf: ADFEntity, items: string[]): ADFEntity {
  if (!items.length) return adf;
  return {
    ...adf,
    content: [
      ...(adf.content ?? []),
      {
        type: 'bulletList',
        content: items.map((item) => ({
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: item }],
            },
          ],
        })),
      },
    ],
  };
}

// ─── Check if ADF is empty ──────────────────────────────────
export function isADFEmpty(adf: ADFEntity | null | undefined): boolean {
  if (!adf) return true;
  return adfToPlainText(adf).trim().length === 0;
}

// ─── Create empty ADF doc ───────────────────────────────────
export function createEmptyADF(): ADFEntity {
  return {
    version: 1,
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [],
      },
    ],
  };
}

// ─── Safe parse ADF from string ─────────────────────────────
export function parseADF(raw: string | null | undefined): ADFEntity | null {
  if (!raw || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw.trim());
    if (parsed && parsed.type === 'doc') return parsed as ADFEntity;
  } catch {
    // Not valid JSON / ADF
  }
  return null;
}
