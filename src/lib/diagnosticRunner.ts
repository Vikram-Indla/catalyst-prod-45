import { supabase } from '@/integrations/supabase/client';

export interface InvokeResult {
  ok: boolean;
  status: string;
  elapsed: number;
  data: any;
  error: string | null;
}

export interface QueryResult {
  data: any[] | null;
  error: string | null;
}

export interface ColumnGuard {
  table: string;
  forbidden: string | null;
  required: string;
  label: string;
}

export const COLUMN_GUARDS: ColumnGuard[] = [
  { table: 'brd_documents',        forbidden: 'content',     required: 'raw_text',  label: 'brd_documents.raw_text' },
  { table: 'brd_processing_queue', forbidden: 'document_id', required: 'brd_id',    label: 'brd_processing_queue.brd_id' },
  { table: 'brd_documents',        forbidden: null,          required: 'kb_synced', label: 'brd_documents.kb_synced' },
  { table: 'tm_test_cases',        forbidden: null,          required: 'case_key',  label: 'tm_test_cases.case_key' },
];

export const EDGE_FUNCTION_PRESETS: { name: string; body: object }[] = [
  { name: 'generate_epics_for_brd',  body: { brd_id: '' } },
  { name: 'sync_brd_document_to_kb', body: { brd_id: '' } },
  { name: 'qualify_brd_text',        body: { text: '' } },
  { name: 'generate_brd_from_text',  body: { text: '' } },
  { name: 'kb-query',               body: { query: '', filter_source: 'brd' } },
];

export async function invokeEdgeFunction(fnName: string, body: object): Promise<InvokeResult> {
  const start = Date.now();
  try {
    const { data, error } = await supabase.functions.invoke(fnName, { body });
    const elapsed = Date.now() - start;
    if (error) {
      return { ok: false, status: 'error', elapsed, data: null, error: error.message || JSON.stringify(error) };
    }
    return { ok: true, status: 'ok', elapsed, data, error: null };
  } catch (err: any) {
    return { ok: false, status: 'error', elapsed: Date.now() - start, data: null, error: err?.message || String(err) };
  }
}

export async function queryTable(table: string, cols = '*', limit = 10): Promise<QueryResult> {
  try {
    const { data, error } = await (supabase.from(table as any) as any).select(cols).limit(limit);
    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || String(err) };
  }
}

export async function checkColumnGuard(guard: ColumnGuard): Promise<{ passed: boolean; detail: string }> {
  try {
    // Try selecting the required column — if it exists the query returns (even if empty)
    const { error } = await (supabase.from(guard.table as any) as any).select(guard.required).limit(1);
    if (error) {
      return { passed: false, detail: `Column "${guard.required}" not found: ${error.message}` };
    }
    // If there's a forbidden column, check it doesn't exist
    if (guard.forbidden) {
      const { error: forbErr } = await (supabase.from(guard.table as any) as any).select(guard.forbidden).limit(1);
      if (!forbErr) {
        // Column exists — that's a warning, not necessarily a fail for the guard
        return { passed: true, detail: `Required "${guard.required}" ✓ | Warning: forbidden "${guard.forbidden}" also exists` };
      }
    }
    return { passed: true, detail: `Column "${guard.required}" exists ✓` };
  } catch (err: any) {
    return { passed: false, detail: err?.message || String(err) };
  }
}

export function generateFixPrompt(fnName: string, errorMsg: string, httpStatus?: number): string {
  const statusHint = httpStatus === 404
    ? 'Likely cause: Function not deployed. Deploy with supabase functions deploy.'
    : httpStatus === 500
    ? 'Likely cause: Check raw_text column exists (NOT "content") + verify API secrets are configured.'
    : httpStatus === 401
    ? 'Likely cause: Check anon key permissions and verify_jwt setting in config.toml.'
    : 'Unknown status — check Edge Function logs for details.';

  return `CATALYST Fix Prompt — Edge Function Error
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Function: ${fnName}
Error: ${errorMsg}
HTTP Status: ${httpStatus || 'N/A'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${statusHint}

COLUMN GUARDS (always verify):
  brd_documents text field → raw_text   ❌ NEVER "content"
  brd_processing_queue FK  → brd_id     ❌ NEVER "document_id"
  brd_documents            → kb_synced  (required)
  tm_test_cases            → case_key   (required)
`;
}
