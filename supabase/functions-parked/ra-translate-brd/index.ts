import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callLovableAI } from '../_shared/lovable-ai.ts';
import { runPipeline } from '../_shared/ra-pipeline.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { document_id, text } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const steps = [
      {
        name: 'REC-PARSE',
        order: 0,
        execute: async () => {
          const result = await callLovableAI({
            systemPrompt: 'You are a document parser for Arabic documents. Extract and structure the Arabic text. Return valid JSON: { "text": string, "language": "ar", "wordCount": number, "sections": [{"title": string, "content": string}] }',
            userPrompt: text || 'بوابة تطبيق الرخصة الصناعية',
            jsonMode: true,
          });
          return JSON.parse(result);
        },
      },
      {
        name: 'REC-TRANSLATE',
        order: 1,
        execute: async (parsed: any) => {
          const result = await callLovableAI({
            systemPrompt: `You are an expert Arabic→English translator specializing in Saudi Ministry of Industry (MIM) domain terminology. Use the MIM glossary: "وزارة الصناعة والثروة المعدنية" = "Ministry of Industry and Mineral Resources (MIM)", "رخصة صناعية" = "Industrial License", "سجل تجاري" = "Commercial Registration (CR)", "هيئة الزكاة" = "ZATCA", "رؤية 2030" = "Vision 2030". Translate each section maintaining structure. Mark glossary terms. Return valid JSON: { "sections": [{"titleAr": string, "titleEn": string, "contentAr": string, "contentEn": string, "glossaryTerms": [string]}] }`,
            userPrompt: JSON.stringify(parsed.sections || [{ title: 'Document', content: parsed.text }]),
            jsonMode: true,
            maxTokens: 16384,
          });
          return { ...parsed, translation: JSON.parse(result) };
        },
      },
      {
        name: 'REC-QA-VALID',
        order: 2,
        execute: async (data: any) => {
          const result = await callLovableAI({
            systemPrompt: 'You are a translation QA validator. Check translation accuracy, glossary term consistency, and completeness. Score quality on 4 axes (each /25): typography (formatting preserved), dataDensity (no data lost), completeness (all sections translated), traceability (glossary terms correctly applied). Return valid JSON: { "qualityScore": number, "breakdown": { "typography": number, "dataDensity": number, "completeness": number, "traceability": number }, "ungroundedClaims": [], "verdict": "pass"|"review" }',
            userPrompt: JSON.stringify(data.translation),
            jsonMode: true,
          });
          return { ...data, qa: JSON.parse(result) };
        },
      },
    ];

    const result = await runPipeline({ documentId: document_id, steps, supabase });
    const finalData = result as any;

    await supabase
      .from('ra_documents')
      .update({
        content: { translation: finalData.translation },
        quality_score: finalData.qa.qualityScore,
        quality_breakdown: finalData.qa.breakdown,
        status: 'complete',
        verdict: finalData.qa.verdict,
      })
      .eq('id', document_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('ra-translate-brd error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
