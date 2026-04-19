/**
 * attachment-download-all — Stream all attachments for an issue into a zip.
 * Uses @zip-js/zip-js (Deno-native). RLS via user's JWT for the SELECT,
 * service role to fetch storage objects.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import {
  ZipWriter,
  Uint8ArrayWriter,
  Uint8ArrayReader,
} from 'https://esm.sh/@zip.js/zip.js@2.7.45';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const BUCKET = 'attachments';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const issueId = body?.issueId;
    if (!issueId || typeof issueId !== 'string') {
      return json({ error: 'issueId required' }, 400);
    }

    // RLS-respecting list via the user's JWT
    const { data: rows, error: listErr } = await userClient
      .from('ph_attachments')
      .select('id, file_name, storage_path')
      .eq('work_item_id', issueId);
    if (listErr) return json({ error: listErr.message }, 500);
    if (!rows || rows.length === 0) {
      return json({ error: 'No attachments to download' }, 400);
    }

    // Fetch issue_key for filename
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: issue } = await admin
      .from('ph_issues')
      .select('issue_key')
      .eq('id', issueId)
      .maybeSingle();
    const issueKey = issue?.issue_key || 'attachments';

    // Build zip
    const zipBufferWriter = new Uint8ArrayWriter();
    const zipWriter = new ZipWriter(zipBufferWriter);

    // Track filename collisions
    const used = new Set<string>();
    const uniqueName = (name: string) => {
      let candidate = name;
      let n = 1;
      while (used.has(candidate)) {
        const dot = name.lastIndexOf('.');
        if (dot > 0) candidate = `${name.slice(0, dot)} (${n})${name.slice(dot)}`;
        else candidate = `${name} (${n})`;
        n++;
      }
      used.add(candidate);
      return candidate;
    };

    for (const row of rows) {
      const { data: blob, error: dlErr } = await admin.storage
        .from(BUCKET)
        .download(row.storage_path);
      if (dlErr || !blob) continue; // skip individual failures
      const bytes = new Uint8Array(await blob.arrayBuffer());
      await zipWriter.add(uniqueName(row.file_name), new Uint8ArrayReader(bytes));
    }

    const zipBytes = await zipWriter.close();

    return new Response(zipBytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${issueKey}-attachments.zip"`,
      },
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
