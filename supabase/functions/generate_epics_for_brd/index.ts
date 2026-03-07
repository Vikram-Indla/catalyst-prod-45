import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callLovableAI } from '../_shared/lovable-ai.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { brd_id } = await req.json();
    if (!brd_id) throw new Error('brd_id is required');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Read raw_text from brd_documents — NEVER "content"
    const { data: brdDoc, error: fetchErr } = await supabase
      .from('brd_documents')
      .select('id, title, raw_text, domain_tag, methodology')
      .eq('id', brd_id)
      .single();

    if (fetchErr || !brdDoc) throw new Error(fetchErr?.message || 'BRD document not found');
    if (!brdDoc.raw_text) throw new Error('BRD document has no raw_text content to process');

    // Step 1: Extract context
    const contextResult = await callLovableAI({
      systemPrompt: 'Extract domain context from this BRD for epic decomposition. Focus on functional requirements, user types, and process flows. Return valid JSON: { "requirements": [...], "actors": [...], "flows": [...] }',
      userPrompt: brdDoc.raw_text,
      jsonMode: true,
    });
    const context = JSON.parse(contextResult);

    // Step 2: Generate epics
    const epicsResult = await callLovableAI({
      systemPrompt: `You are an Agile epic decomposer. Break down the BRD requirements into epics with user stories. Each story must have: As a/I want/So that format, Given/When/Then acceptance criteria, story points estimate, and INVEST validation. Return valid JSON: { "epics": [{ "id": string, "title": string, "sourceRef": string, "priority": "P1"|"P2"|"P3", "description": string, "stories": [{ "id": string, "name": string, "points": number, "asA": string, "iWant": string, "soThat": string, "given": string, "when": string, "then": string, "invest": { "I": boolean, "N": boolean, "V": boolean, "E": boolean, "S": boolean, "T": boolean } }] }] }`,
      userPrompt: JSON.stringify({ title: brdDoc.title, context }),
      jsonMode: true,
      maxTokens: 16384,
    });
    const epicsData = JSON.parse(epicsResult);

    // Step 3: Validate
    const qaResult = await callLovableAI({
      systemPrompt: 'Validate epic decomposition quality. Check INVEST compliance, story coverage of requirements, and Given/When/Then completeness. Return valid JSON: { "qualityScore": number, "breakdown": { "completeness": number, "traceability": number, "investCompliance": number }, "verdict": "pass"|"review" }',
      userPrompt: JSON.stringify(epicsData),
      jsonMode: true,
    });
    const qa = JSON.parse(qaResult);

    // Step 4: Write epics to brd_epics table
    const epicsToInsert = (epicsData.epics || []).map((epic: any, idx: number) => ({
      brd_id: brd_id,
      epic_key: epic.id || `EPIC-${idx + 1}`,
      title: epic.title,
      description: epic.description || '',
      complexity: mapPriorityToComplexity(epic.priority),
      stories: epic.stories || [],
      invest_score: epic.stories?.[0]?.invest || {},
      acceptance_criteria: epic.stories?.map((s: any) => ({
        given: s.given, when: s.when, then: s.then,
      })) || [],
      brd_sections: [epic.sourceRef].filter(Boolean),
    }));

    if (epicsToInsert.length > 0) {
      // Delete existing epics for this BRD first
      await supabase.from('brd_epics').delete().eq('brd_id', brd_id);

      const { error: insertErr } = await supabase
        .from('brd_epics')
        .insert(epicsToInsert);

      if (insertErr) throw new Error('Failed to save epics: ' + insertErr.message);
    }

    // Update brd_documents quality
    await supabase
      .from('brd_documents')
      .update({
        quality_score: qa.qualityScore,
        pipeline_stage: 'complete',
      })
      .eq('id', brd_id);

    return new Response(JSON.stringify({
      success: true,
      epic_count: epicsToInsert.length,
      quality_score: qa.qualityScore,
      verdict: qa.verdict,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('generate_epics_for_brd error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function mapPriorityToComplexity(priority: string): string {
  switch (priority) {
    case 'P1': return 'XL';
    case 'P2': return 'M';
    default: return 'S';
  }
}
