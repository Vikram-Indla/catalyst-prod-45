import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

function getAttachmentType(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  return 'document';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Use service role for storage operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify user with anon key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // Parse path: /upload-attachment/test-cases/:testCaseId/attachments or
    // /upload-attachment/test-cases/:testCaseId/steps/:stepId/attachments
    const testCasesIndex = pathParts.indexOf('test-cases');
    const testCaseId = testCasesIndex >= 0 ? pathParts[testCasesIndex + 1] : null;
    const stepsIndex = pathParts.indexOf('steps');
    const stepId = stepsIndex >= 0 ? pathParts[stepsIndex + 1] : null;

    if (!testCaseId) {
      return new Response(
        JSON.stringify({ error: { code: 'BAD_REQUEST', message: 'Test case ID required' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return new Response(
        JSON.stringify({ error: { code: 'BAD_REQUEST', message: 'File required' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: { code: 'FILE_TOO_LARGE', message: 'File exceeds 5MB limit' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: { code: 'INVALID_FILE_TYPE', message: 'File type not allowed' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate storage path
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${user.id}/${testCaseId}/${timestamp}-${sanitizedName}`;

    // Upload to storage
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabaseAdmin.storage
      .from('test-attachments')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('test-attachments')
      .getPublicUrl(storagePath);

    // Create attachment record
    const attachmentType = stepId ? 'test_step' : 'test_case';
    const attachmentId = stepId || testCaseId;

    const { data: attachment, error: insertError } = await supabase
      .from('attachments')
      .insert({
        entity_type: attachmentType,
        entity_id: attachmentId,
        file_name: file.name,
        file_path: storagePath,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Log activity
    await supabase.rpc('log_test_case_activity', {
      p_test_case_id: testCaseId,
      p_action: 'attachment_added',
      p_description: `Added attachment: ${file.name}`,
      p_metadata: { 
        attachmentId: attachment.id, 
        fileName: file.name,
        stepId: stepId || null,
      },
    });

    return new Response(
      JSON.stringify({
        data: {
          id: attachment.id,
          name: file.name,
          storagePath,
          url: urlData.publicUrl,
          type: getAttachmentType(file.type),
          mimeType: file.type,
          size: file.size,
          uploadedAt: attachment.created_at,
          uploadedById: user.id,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: (error as Error).message } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
