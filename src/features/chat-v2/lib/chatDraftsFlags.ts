/**
 * Helpers for detecting "migration not applied" errors when talking to
 * chat_message_drafts. Previously this module also held a module-level
 * "drafts table unavailable" sticky flag, but it caused a subtle UX
 * bug: if the page loaded BEFORE the migration was applied, the flag
 * went false and stayed false until a hard browser refresh — drafts
 * silently no-op'd even after the migration succeeded. We now let
 * every read/write attempt actually fire; a failed write logs once
 * and moves on. The retry cost is trivial (debounced + per-keystroke).
 */
export function isMissingTableError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = (err as { code?: unknown }).code;
  return code === '42P01' || code === 'PGRST205';
}
