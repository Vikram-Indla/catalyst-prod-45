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
    const { document_id, source_doc_id } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch source BRD
    const { data: sourceBrd } = await supabase
      .from('ra_documents')
      .select('content, title')
      .eq('id', source_doc_id)
      .single();

    const brdContent = sourceBrd?.content || {};

    const steps = [
      {
        name: 'REC-CONTEXT',
        order: 0,
        execute: async () => {
          const result = await callLovableAI({
            systemPrompt: 'Extract testable requirements from this BRD. Focus on functional and non-functional requirements, acceptance criteria, and edge cases. Return valid JSON: { "functional": [...], "nonFunctional": [...], "acceptanceCriteria": [...] }',
            userPrompt: JSON.stringify(brdContent),
            jsonMode: true,
          });
          return JSON.parse(result);
        },
      },
      {
        name: 'REC-UAT-GENERATE',
        order: 1,
        execute: async (context: any) => {
          const result = await callLovableAI({
            systemPrompt: `Generate UAT test scenarios from the requirements. Each scenario must have: ID (SC-NNN), title, priority (High/Medium/Low), preconditions, test steps (numbered with action and expected result), and traceability to FR/NFR codes. Also generate a coverage matrix. Return valid JSON: { "scenarios": [{ "id": string, "title": string, "priority": "High"|"Medium"|"Low", "preconditions": string, "steps": [{"num": number, "action": string, "expected": string}], "traceability": string }], "coverage": { "functional": [{"id": string, "label": string, "covered": boolean}], "nonFunctional": [{"id": string, "label": string, "covered": boolean}] } }`,
            userPrompt: JSON.stringify(context),
            jsonMode: true,
            maxTokens: 16384,
          });
          return { context, uat: JSON.parse(result) };
        },
      },
      {
        name: 'REC-QA-VALID',
        order: 2,
        execute: async (data: any) => {
          const result = await callLovableAI({
            systemPrompt: 'Validate UAT scenario quality. Check coverage completeness, traceability accuracy, and test step clarity. Return valid JSON: { "qualityScore": number, "breakdown": { "typography": number, "dataDensity": number, "completeness": number, "traceability": number }, "ungroundedClaims": [], "verdict": "pass"|"review" }',
            userPrompt: JSON.stringify(data.uat),
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
        content: finalData.uat,
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
    console.error('ra-generate-uat error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
