import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    
    // Parse path: /delete-attachment/test-cases/:testCaseId/attachments/:attachmentId
    const testCasesIndex = pathParts.indexOf('test-cases');
    const testCaseId = testCasesIndex >= 0 ? pathParts[testCasesIndex + 1] : null;
    const attachmentsIndex = pathParts.indexOf('attachments');
    const attachmentId = attachmentsIndex >= 0 ? pathParts[attachmentsIndex + 1] : null;

    if (!testCaseId || !attachmentId) {
      return new Response(
        JSON.stringify({ error: { code: 'BAD_REQUEST', message: 'Test case ID and attachment ID required' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get attachment record
    const { data: attachment, error: fetchError } = await supabase
      .from('attachments')
      .select('*')
      .eq('id', attachmentId)
      .single();

    if (fetchError || !attachment) {
      return new Response(
        JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Attachment not found' } }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check ownership
    if (attachment.uploaded_by !== user.id) {
      return new Response(
        JSON.stringify({ error: { code: 'FORBIDDEN', message: 'Not authorized to delete this attachment' } }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete from storage
    const { error: storageError } = await supabaseAdmin.storage
      .from('test-attachments')
      .remove([attachment.file_path]);

    if (storageError) {
      console.error('Storage delete error:', storageError);
      // Continue with record deletion even if storage fails
    }

    // Delete record
    const { error: deleteError } = await supabase
      .from('attachments')
      .delete()
      .eq('id', attachmentId);

    if (deleteError) throw deleteError;

    // Log activity
    await supabase.rpc('log_test_case_activity', {
      p_test_case_id: testCaseId,
      p_action: 'attachment_removed',
      p_description: `Removed attachment: ${attachment.file_name}`,
      p_metadata: { attachmentId, fileName: attachment.file_name },
    });

    return new Response(
      JSON.stringify({ data: { success: true } }),
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
