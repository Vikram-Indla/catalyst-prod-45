/**
 * Slash-command registry for the chat composer.
 *
 * Two kinds:
 *  - 'insert' commands replace the typed "/cmd" with a text glyph (Slack
 *    classics — /shrug etc). Fully composer-local, no wiring.
 *  - 'action' commands are injected by the host (MessagePanel) and map to a
 *    real, already-wired handler (e.g. /huddle → onStartHuddle). The registry
 *    never invents an action with no handler (zero-assumption law).
 */

export interface SlashInsertCommand {
  id: string;
  kind: 'insert';
  label: string;
  hint: string;
  /** Text inserted in place of the "/cmd" token. */
  text: string;
}

export interface SlashActionCommand {
  id: string;
  kind: 'action';
  label: string;
  hint: string;
  run: () => void;
}

export type SlashCommand = SlashInsertCommand | SlashActionCommand;

/** Built-in text commands — always available, no host wiring required. */
export const BUILTIN_SLASH_COMMANDS: SlashInsertCommand[] = [
  { id: 'shrug', kind: 'insert', label: '/shrug', hint: 'Append ¯\\_(ツ)_/¯', text: '¯\\_(ツ)_/¯' },
  { id: 'tableflip', kind: 'insert', label: '/tableflip', hint: 'Append (╯°□°)╯︵ ┻━┻', text: '(╯°□°)╯︵ ┻━┻' },
  { id: 'unflip', kind: 'insert', label: '/unflip', hint: 'Append ┬─┬ ノ( ゜-゜ノ)', text: '┬─┬ ノ( ゜-゜ノ)' },
  { id: 'lenny', kind: 'insert', label: '/lenny', hint: 'Append ( ͡° ͜ʖ ͡°)', text: '( ͡° ͜ʖ ͡°)' },
];

/**
 * Read a slash-command trigger from the caret context. Slack semantics: the
 * "/" must be the FIRST character of the message and no space may follow yet
 * (the palette filters the command NAME only). Returns the query (text after
 * "/") or null when no trigger is active.
 *
 * `fullText` is the composer's entire text content; `caretOffset` is the caret
 * position within it. Keeping this pure makes it unit-testable without a DOM.
 */
export function readSlashQuery(fullText: string, caretOffset: number): string | null {
  if (caretOffset < 1) return null;
  const upToCaret = fullText.slice(0, caretOffset);
  // Must start at absolute position 0 with "/", and be "/word" (no space).
  const m = /^\/(\S*)$/.exec(upToCaret);
  if (!m) return null;
  // A space anywhere kills the palette (args have begun).
  if (/\s/.test(m[1])) return null;
  return m[1];
}

/** Filter + rank commands for a query (case-insensitive prefix, then substring). */
export function filterSlashCommands(commands: SlashCommand[], query: string): SlashCommand[] {
  const q = query.trim().toLowerCase();
  if (q === '') return commands;
  const prefix: SlashCommand[] = [];
  const contains: SlashCommand[] = [];
  for (const c of commands) {
    const name = c.id.toLowerCase();
    if (name.startsWith(q)) prefix.push(c);
    else if (name.includes(q)) contains.push(c);
  }
  return [...prefix, ...contains];
}
