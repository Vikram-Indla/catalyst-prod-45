/**
 * structureText — spoken-structure inference
 * (CAT-DICTATION-INTELLIGENCE-20260708-001 S2).
 *
 * Two mechanisms, both language-agnostic in practice: Arabic speech reaches
 * this point already translated to English by Whisper /translations, so
 * English-side parsing covers "سطر جديد" (arrives as "new line") and
 * "أول شي… ثاني شي…" (arrives as "first… second…") for free.
 *
 * 1. Spoken commands — explicit formatting words become formatting:
 *      "new line" → \n · "new paragraph" → \n\n · "bullet point"/"next point" → "\n- "
 * 2. Ordinal enumeration — "First, … Second, … Third, …" with ≥2 ordinals
 *    becomes a numbered list. Conservative: only sentence-initial ordinals.
 *
 * Pure and synchronous. Snippet expansion (S4) also runs here: "insert
 * <trigger>" swaps in the user's saved expansion.
 */

const ORDINALS = [
  'first', 'firstly', 'second', 'secondly', 'third', 'thirdly',
  'fourth', 'fourthly', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth',
];

/** "first thing"/"first of all"/"firstly," at a clause start. */
const ORDINAL_SPLIT_RE = new RegExp(
  `(?:^|(?<=[.!?;]\\s))(?:and\\s+|then\\s+)?(${ORDINALS.join('|')})(?:\\s+(?:thing|point|item|step))?(?:\\s+of\\s+all)?\\s*[,:-]?\\s+`,
  'gi',
);

// Leading comma is part of the spoken command ("item one, new line") but a
// sentence period before the command belongs to the sentence — keep it.
const COMMAND_RES: Array<[RegExp, string]> = [
  [/,?\s*\bnew\s+paragraph\b[,.]?\s*/gi, '\n\n'],
  [/,?\s*\bnew\s+line\b[,.]?\s*/gi, '\n'],
  [/,?\s*\b(?:bullet\s+point|next\s+point)\b[,:]?\s*/gi, '\n- '],
];

export interface Snippet {
  trigger: string;
  expansion: string;
}

function applyCommands(text: string): string {
  let out = text;
  for (const [re, replacement] of COMMAND_RES) {
    out = out.replace(re, replacement);
  }
  // Commands at the very start shouldn't open with blank lines.
  return out.replace(/^[\n\s]+/, '').replace(/[ \t]+\n/g, '\n');
}

function applyOrdinalList(text: string): string {
  // Never restructure text that already has explicit structure.
  if (text.includes('\n')) return text;
  const matches = [...text.matchAll(ORDINAL_SPLIT_RE)];
  if (matches.length < 2) return text;

  const pieces: Array<{ index: number; length: number }> = matches.map((m) => ({
    index: m.index ?? 0,
    length: m[0].length,
  }));
  const intro = text.slice(0, pieces[0].index).trim();
  const items: string[] = [];
  for (let i = 0; i < pieces.length; i++) {
    const start = pieces[i].index + pieces[i].length;
    const end = i + 1 < pieces.length ? pieces[i + 1].index : text.length;
    const item = text.slice(start, end).trim().replace(/[.,;]+$/, '');
    if (item) items.push(item);
  }
  if (items.length < 2) return text;
  const list = items.map((it, i) => `${i + 1}. ${it[0].toUpperCase()}${it.slice(1)}`).join('\n');
  return intro ? `${intro}\n${list}` : list;
}

function applySnippets(text: string, snippets: Snippet[]): string {
  let out = text;
  for (const s of snippets) {
    if (!s.trigger?.trim() || !s.expansion) continue;
    const re = new RegExp(`[,.]?\\s*\\binsert\\s+${s.trigger.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b[,.]?`, 'gi');
    out = out.replace(re, ` ${s.expansion} `);
  }
  return out.replace(/[ \t]{2,}/g, ' ').trim();
}

export function structureText(text: string, snippets: Snippet[] = []): string {
  if (!text) return text;
  let out = applySnippets(text, snippets);
  out = applyCommands(out);
  out = applyOrdinalList(out);
  return out;
}
