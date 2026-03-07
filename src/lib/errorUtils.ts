/**
 * Error sanitiser — prevents internal system names from reaching users.
 * COLUMN GUARDS: brd_documents → raw_text | brd_processing_queue → brd_id
 */

const INTERNAL_TERMS = [
  'generate_epics_for_brd', 'kb-sync', 'kb-query',
  'qualify-brd-text', 'generate-brd-from-text',
  'brd_documents', 'brd_epics', 'brd_processing_queue',
  'ra_documents', 'kb_embeddings', 'supabase',
  'postgresql', 'edge function', 'deno',
  'ra_jira_tickets', 'ra_jira_connections',
  'ra_artifacts', 'ra_processing_jobs',
  'execute_sql_query', 'service_role',
];

const SAFE_PATTERNS = [
  /document has no content/i,
  /not yet processed/i,
  /already exists/i,
  /invalid/i,
  /required/i,
  /not found/i,
  /no content to index/i,
  /could not resolve/i,
  /qualification failed/i,
  /generation failed/i,
];

export function sanitiseError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? '');

  const hasInternal = INTERNAL_TERMS.some(term =>
    raw.toLowerCase().includes(term.toLowerCase())
  );

  if (hasInternal) {
    return 'An unexpected error occurred. Please try again or contact your administrator.';
  }

  if (SAFE_PATTERNS.some(p => p.test(raw))) {
    return raw;
  }

  return 'An unexpected error occurred. Please try again.';
}
