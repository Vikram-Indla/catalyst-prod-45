/**
 * Deterministic label palette.
 *
 * Same label string ⇒ same accent color across every surface (right-rail
 * chip, dropdown option, kanban card, hover card, etc.). Matches Jira's
 * approach: djb2-style hash → modulo palette → fixed ADS accent.
 *
 * Guardrails (CLAUDE.md §5):
 *   - NO hex, rgb, hsl. Every color resolves through `--ds-*` tokens.
 *   - Border / text / bg tokens are chosen so the pill reads as one unit
 *     under both light and dark modes without extra overrides.
 */

export type LabelAccent =
  | 'blue'
  | 'green'
  | 'red'
  | 'purple'
  | 'orange'
  | 'teal'
  | 'yellow'
  | 'magenta'
  | 'lime'
  | 'gray';

const ACCENTS: LabelAccent[] = [
  'blue',
  'green',
  'red',
  'purple',
  'orange',
  'teal',
  'yellow',
  'magenta',
  'lime',
  'gray',
];

/** Deterministic hash — djb2 variant. Same string always maps to the same
 *  index; nothing here depends on runtime state. */
function hash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
  }
  return Math.abs(h);
}

/** Return the accent name for a label. Same input ⇒ same output, forever. */
export function labelAccent(name: string): LabelAccent {
  if (!name) return 'gray';
  return ACCENTS[hash(name) % ACCENTS.length];
}

/** Set of ADS CSS custom properties used to color a label. Prefer the
 *  className approach (`labelAccentClassName`) so the tokens live in one
 *  stylesheet, but inline consumers (react-select `styles` prop) can
 *  read these directly. */
export interface LabelAccentTokens {
  border: string;
  text: string;
  background: string;
}

export function labelAccentTokens(name: string): LabelAccentTokens {
  const a = labelAccent(name);
  // Jira parity (2026-07-02 Vikram): the ONLY thing colored per-label is
  // the border. Text stays neutral (--ds-text) and background stays
  // surface (--ds-surface) so the pill reads as "outlined" not "tinted".
  // Kept as a 3-token object for API stability with earlier callers.
  return {
    border: `var(--ds-border-accent-${a})`,
    text: 'var(--ds-text)',
    background: 'var(--ds-surface)',
  };
}

/** className hook — pair with the `.cat-label[data-accent="…"]` rules in
 *  index.css. Callers set `data-accent={labelAccent(name)}` on the pill. */
export function labelAccentDataAttr(name: string): { 'data-accent': LabelAccent } {
  return { 'data-accent': labelAccent(name) };
}
