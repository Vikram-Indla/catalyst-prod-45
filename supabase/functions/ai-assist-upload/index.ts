import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function computeSHA256(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const draftId = formData.get('draft_id') as string;

    if (!file || !draftId) {
      return new Response(JSON.stringify({ error: 'Missing file or draft_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];
    if (!allowedTypes.includes(file.type)) {
      return new Response(JSON.stringify({ error: 'Invalid file type. Only PDF and DOCX allowed.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Read file and compute SHA-256
    const arrayBuffer = await file.arrayBuffer();
    const fileSha256 = await computeSHA256(arrayBuffer);

    // Check for existing document with same hash for this draft (content_changed detection)
    const { data: existingDocs } = await supabase
      .from('ai_assist_documents')
      .select('id, file_sha256')
      .eq('draft_id', draftId)
      .order('created_at', { ascending: false })
      .limit(1);

    const previousHash = existingDocs?.[0]?.file_sha256;
    const contentChanged = previousHash && previousHash !== fileSha256;

    // Generate unique file path
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${draftId}/${timestamp}_${sanitizedFileName}`;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('ai-assist')
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(JSON.stringify({ error: 'Failed to upload file: ' + uploadError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate retention date (2 years)
    const retentionDate = new Date();
    retentionDate.setFullYear(retentionDate.getFullYear() + 2);

    // Create document record
    const { data: docData, error: docError } = await supabase
      .from('ai_assist_documents')
      .insert({
        draft_id: draftId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        storage_bucket: 'ai-assist',
        file_sha256: fileSha256,
        uploaded_by: user.id,
        extraction_status: 'pending',
        retention_until: retentionDate.toISOString(),
        page_hashes: [],
      })
      .select()
      .single();

    if (docError) {
      console.error('Document insert error:', docError);
      return new Response(JSON.stringify({ error: 'Failed to create document record: ' + docError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log upload audit event
    await supabase.from('ai_assist_audit_events').insert({
      draft_id: draftId,
      event_type: 'upload',
      actor_user_id: user.id,
      payload_json: {
        storage_path: filePath,
        file_sha256: fileSha256,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
      },
    });

    // Log content_changed event if applicable
    if (contentChanged) {
      await supabase.from('ai_assist_audit_events').insert({
        draft_id: draftId,
        event_type: 'content_changed',
        actor_user_id: user.id,
        payload_json: {
          previous_hash: previousHash,
          new_hash: fileSha256,
          document_id: docData.id,
        },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      document: docData,
      content_changed: contentChanged,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
