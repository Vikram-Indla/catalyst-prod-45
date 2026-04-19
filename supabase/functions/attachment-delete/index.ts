/**
 * attachment-delete — Delete a ph_attachments row + its storage object.
 * Permission: uploader OR project admin/owner (RLS enforces, we double-check).
 * Order: storage delete FIRST, then DB row (orphaned row is recoverable; orphaned file is bloat).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

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
    if (!authHeader) {
      return json({ error: 'Missing Authorization header' }, 401);
    }

    // 1. Verify caller
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: 'Unauthorized' }, 401);
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const attachmentId = body?.attachmentId;
    if (!attachmentId || typeof attachmentId !== 'string') {
      return json({ error: 'attachmentId required' }, 400);
    }

    // 2. Read row with service role to know the storage_path even if RLS would hide it later.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: row, error: readErr } = await admin
      .from('ph_attachments')
      .select('id, work_item_id, storage_path, uploaded_by')
      .eq('id', attachmentId)
      .maybeSingle();
    if (readErr || !row) {
      return json({ error: 'Attachment not found' }, 404);
    }

    // 3. Permission check: uploader OR project admin/owner
    let permitted = row.uploaded_by === userId;
    if (!permitted) {
      const { data: issue } = await admin
        .from('ph_issues')
        .select('project_key')
        .eq('id', row.work_item_id)
        .maybeSingle();
      if (issue?.project_key) {
        const { data: project } = await admin
          .from('ph_projects')
          .select('id')
          .eq('key', issue.project_key)
          .maybeSingle();
        if (project?.id) {
          const { data: member } = await admin
            .from('ph_project_members')
            .select('role')
            .eq('project_id', project.id)
            .eq('user_id', userId)
            .maybeSingle();
          if (member && (member.role === 'admin' || member.role === 'owner')) {
            permitted = true;
          }
        }
      }
    }
    if (!permitted) {
      return json({ error: 'Forbidden' }, 403);
    }

    // 4. Storage delete first
    const { error: storageErr } = await admin.storage.from(BUCKET).remove([row.storage_path]);
    if (storageErr) {
      // If file already gone (404), continue; otherwise abort.
      const msg = (storageErr.message || '').toLowerCase();
      if (!msg.includes('not found')) {
        return json({ error: `Storage delete failed: ${storageErr.message}` }, 500);
      }
    }

    // 5. DB delete
    const { error: dbErr } = await admin.from('ph_attachments').delete().eq('id', attachmentId);
    if (dbErr) {
      return json({ error: `DB delete failed: ${dbErr.message}` }, 500);
    }

    return json({ success: true }, 200);
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
