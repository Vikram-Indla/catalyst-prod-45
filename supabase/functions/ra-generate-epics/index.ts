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
            systemPrompt: 'Extract domain context from this BRD for epic decomposition. Focus on functional requirements, user types, and process flows. Return valid JSON: { "requirements": [...], "actors": [...], "flows": [...] }',
            userPrompt: JSON.stringify(brdContent),
            jsonMode: true,
          });
          return JSON.parse(result);
        },
      },
      {
        name: 'REC-EPIC-DECOMPOSE',
        order: 1,
        execute: async (context: any) => {
          const result = await callLovableAI({
            systemPrompt: `You are an Agile epic decomposer. Break down the BRD requirements into epics with user stories. Each story must have: As a/I want/So that format, Given/When/Then acceptance criteria, story points estimate, and INVEST validation (each letter: Independent, Negotiable, Valuable, Estimable, Small, Testable — mark true/false). Return valid JSON: { "epics": [{ "id": string, "title": string, "sourceRef": string, "priority": "P1"|"P2"|"P3", "stories": [{ "id": string, "name": string, "points": number, "asA": string, "iWant": string, "soThat": string, "given": string, "when": string, "then": string, "invest": { "I": boolean, "N": boolean, "V": boolean, "E": boolean, "S": boolean, "T": boolean } }] }] }`,
            userPrompt: JSON.stringify(context),
            jsonMode: true,
            maxTokens: 16384,
          });
          return { context, epics: JSON.parse(result) };
        },
      },
      {
        name: 'REC-QA-VALID',
        order: 2,
        execute: async (data: any) => {
          const result = await callLovableAI({
            systemPrompt: 'Validate epic decomposition quality. Check INVEST compliance, story coverage of requirements, and Given/When/Then completeness. Return valid JSON: { "qualityScore": number, "breakdown": { "typography": number, "dataDensity": number, "completeness": number, "traceability": number }, "ungroundedClaims": [], "verdict": "pass"|"review" }',
            userPrompt: JSON.stringify(data.epics),
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
        content: finalData.epics,
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
    console.error('ra-generate-epics error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
