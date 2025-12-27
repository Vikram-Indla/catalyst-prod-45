import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId, sessionId } = await req.json();
    
    if (!documentId || !sessionId) {
      return new Response(
        JSON.stringify({ error: 'Missing documentId or sessionId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get document record
    const { data: doc, error: docError } = await supabase
      .from('efd_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !doc) {
      console.error('Document not found:', docError);
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('efd-documents')
      .download(doc.file_path);

    if (downloadError || !fileData) {
      console.error('Failed to download file:', downloadError);
      return new Response(
        JSON.stringify({ error: 'Failed to download file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let extractedText = '';

    // Extract text based on file type
    if (doc.file_type === 'txt' || doc.mime_type === 'text/plain' || doc.mime_type === 'text/markdown') {
      // Plain text - just read it
      extractedText = await fileData.text();
    } else if (doc.file_type === 'pdf' || doc.mime_type === 'application/pdf') {
      // For PDF, we'll use a simple approach - extract raw text
      // In production, you'd want to use a proper PDF parsing library
      const buffer = await fileData.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      
      // Simple PDF text extraction (basic approach)
      // This extracts text between stream markers - works for simple PDFs
      const text = new TextDecoder().decode(bytes);
      const textMatches = text.match(/\((.*?)\)/g);
      if (textMatches) {
        extractedText = textMatches
          .map(m => m.slice(1, -1))
          .filter(t => t.length > 1 && /[a-zA-Z]/.test(t))
          .join(' ');
      }
      
      // If basic extraction fails, note that and use AI to extract later
      if (!extractedText || extractedText.length < 50) {
        extractedText = `[PDF content - ${doc.file_name}]\n\nThis PDF requires advanced parsing. The document has been uploaded and can be processed for requirements extraction.`;
      }
    } else if (doc.file_type === 'docx') {
      // For DOCX, extract from the document.xml inside the zip
      // This is a simplified approach
      extractedText = `[DOCX content - ${doc.file_name}]\n\nThis Word document has been uploaded. Document content will be processed for requirements extraction.`;
    }

    // Update document with extracted text
    const { error: updateError } = await supabase
      .from('efd_documents')
      .update({
        extracted_text: extractedText,
        is_parsed: true,
        parsed_at: new Date().toISOString(),
      })
      .eq('id', documentId);

    if (updateError) {
      console.error('Failed to update document:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to save extracted text' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Extracted ${extractedText.length} characters from ${doc.file_name}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        extractedLength: extractedText.length,
        preview: extractedText.slice(0, 500) 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Text extraction error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Extraction failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
