/**
 * Runtime flag for chat_message_drafts availability.
 *
 * Set false on the first PostgREST 42P01 ("relation does not exist") so
 * the UI silently no-ops draft reads/writes when the migration has not
 * been applied yet. Mirrors the scheduleColumnsAvailable pattern.
 */
let draftsTableAvailable: boolean | undefined;

export function isDraftsTableAvailable(): boolean {
  return draftsTableAvailable !== false;
}

export function markDraftsTableMissing(): void {
  if (draftsTableAvailable === false) return;
  draftsTableAvailable = false;
  if (typeof console !== 'undefined') {
    console.warn(
      '[chat-v2] chat_message_drafts table is unavailable — drafts will not persist. Apply migration 20260618000300_chat_message_drafts.sql.',
    );
  }
}

export function isMissingTableError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = (err as { code?: unknown }).code;
  return code === '42P01' || code === 'PGRST205';
}
