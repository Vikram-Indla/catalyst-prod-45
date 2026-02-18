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
    const { document_id, text, methodology, language } = await req.json();

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
            systemPrompt: 'You are a document parser. Extract structured text from raw input. Detect the language (en/ar/mixed). Return valid JSON only: { "text": string, "language": "en"|"ar"|"mixed", "wordCount": number }',
            userPrompt: text || 'No input text provided — generate a sample BRD for an Industrial License Application Portal for the Saudi Ministry of Industry.',
            jsonMode: true,
          });
          return JSON.parse(result);
        },
      },
      {
        name: 'REC-CONTEXT',
        order: 1,
        execute: async (parsed: any) => {
          const result = await callLovableAI({
            systemPrompt: 'You are a domain context analyzer for Saudi Ministry of Industry (MIM). Extract entities, stakeholders, processes, KPIs. Each item MUST include a "sourceQuote" field with the exact original text that supports it. Return valid JSON only: { "entities": [{"name": string, "type": string, "sourceQuote": string}], "stakeholders": [{"name": string, "role": string, "sourceQuote": string}], "processes": [{"name": string, "description": string, "sourceQuote": string}], "kpis": [{"name": string, "current": string, "target": string, "sourceQuote": string}] }',
            userPrompt: parsed.text,
            jsonMode: true,
          });
          return { ...parsed, context: JSON.parse(result) };
        },
      },
      {
        name: 'REC-BRD-ARCH',
        order: 2,
        execute: async (data: any) => {
          const methodologyUpper = (methodology || 'kpmg').toUpperCase();
          const result = await callLovableAI({
            systemPrompt: `You are a BRD architect. Generate a comprehensive Business Requirements Document following the ${methodologyUpper} framework. Use the provided context data. Every claim MUST be traceable to the sourceQuotes from context. Return valid JSON: { "sections": [{ "sectionNumber": string, "title": string, "content": string, "requirements": [{"id": string, "description": string, "priority": string}] }] }`,
            userPrompt: JSON.stringify(data.context),
            jsonMode: true,
            maxTokens: 16384,
          });
          return { ...data, brd: JSON.parse(result) };
        },
      },
      {
        name: 'REC-EXTRACT',
        order: 3,
        execute: async (data: any) => {
          const result = await callLovableAI({
            systemPrompt: 'Extract all functional (FR-NNN) and non-functional (NFR-NNN) requirements from this BRD. Return valid JSON: { "functional": [{"id": string, "description": string, "priority": string, "section": string}], "nonFunctional": [{"id": string, "description": string, "priority": string, "section": string}] }',
            userPrompt: JSON.stringify(data.brd),
            jsonMode: true,
          });
          return { ...data, requirements: JSON.parse(result) };
        },
      },
      {
        name: 'REC-QA-VALID',
        order: 4,
        execute: async (data: any) => {
          const result = await callLovableAI({
            systemPrompt: 'You are a QA validator. Compare BRD content against context sourceQuotes. Identify claims NOT supported by source data (ungrounded claims). Score quality on 4 axes (each /25): typography (structure), dataDensity (tables, metrics), completeness (all sections filled), traceability (claims linked to sources). Return valid JSON: { "qualityScore": number, "breakdown": { "typography": number, "dataDensity": number, "completeness": number, "traceability": number }, "ungroundedClaims": [{ "claim": string, "section": string, "reason": string }], "verdict": "pass"|"review" }',
            userPrompt: JSON.stringify({ brd: data.brd, context: data.context }),
            jsonMode: true,
          });
          return { ...data, qa: JSON.parse(result) };
        },
      },
    ];

    const result = await runPipeline({ documentId: document_id, steps, supabase });
    const finalData = result as any;

    // Anti-hallucination retry loop
    let qa = finalData.qa;
    let retries = 0;
    while (qa.ungroundedClaims?.length > 0 && retries < 2) {
      retries++;
      const correctedBrd = await callLovableAI({
        systemPrompt: `You are a BRD architect performing corrections. Remove or rewrite ungrounded claims to be traceable. Ungrounded claims: ${JSON.stringify(qa.ungroundedClaims)}. Return corrected sections in same JSON format.`,
        userPrompt: JSON.stringify(finalData.brd),
        jsonMode: true,
        maxTokens: 16384,
      });
      finalData.brd = JSON.parse(correctedBrd);

      const reQa = await callLovableAI({
        systemPrompt: 'QA validation: check for ungrounded claims. Return JSON: { "qualityScore": number, "breakdown": {...}, "ungroundedClaims": [...], "verdict": "pass"|"review" }',
        userPrompt: JSON.stringify({ brd: finalData.brd, context: finalData.context }),
        jsonMode: true,
      });
      qa = JSON.parse(reQa);
    }

    if (qa.ungroundedClaims?.length > 0) qa.verdict = 'review';

    // Update document
    await supabase
      .from('ra_documents')
      .update({
        content: { sections: finalData.brd.sections, requirements: finalData.requirements },
        quality_score: qa.qualityScore,
        quality_breakdown: qa.breakdown,
        status: 'complete',
        verdict: qa.verdict,
      })
      .eq('id', document_id);

    if (retries > 0) {
      await supabase
        .from('ra_agent_runs')
        .update({ retry_count: retries })
        .eq('document_id', document_id)
        .eq('agent_name', 'REC-QA-VALID');
    }

    return new Response(JSON.stringify({ success: true, quality_score: qa.qualityScore }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('ra-generate-brd error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
