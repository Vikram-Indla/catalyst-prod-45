import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { callLovableAI } from '../_shared/lovable-ai.ts';
import { requireAuth } from "../_shared/auth-guard.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Auth check
    const { requireAuth } = await import("../_shared/auth-guard.ts");
    const auth = await requireAuth(req);
    if (auth.error) return auth.error;

    const { text } = await req.json();

    if (!text || typeof text !== 'string' || text.trim().length < 50) {
      return new Response(JSON.stringify({ error: 'Insufficient text provided.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Detect language first
    const langResult = await callLovableAI({
      systemPrompt: 'Detect the primary language of the provided text. Return JSON: { "language": "en"|"ar"|"mixed", "wordCount": number }',
      userPrompt: text.slice(0, 2000),
      jsonMode: true,
    });
    const langData = JSON.parse(langResult);

    // Generate the full BRD
    const brdResult = await callLovableAI({
      systemPrompt: `You are a senior business analyst. Generate a comprehensive Business Requirements Document (BRD) from the provided requirements text.

CRITICAL RULES:
- Every section MUST be derived from the actual input text — do NOT invent requirements not present in the source.
- Include direct quotes or paraphrases from the input where possible.
- If the input lacks detail for a section, state what is missing rather than fabricating content.

Generate sections appropriate to the content. Typical sections include:
- Executive Summary
- Business Objectives
- Stakeholders & Users
- Functional Requirements
- Non-Functional Requirements
- Business Rules
- Data Requirements
- Integration Requirements
- Assumptions & Constraints
- Acceptance Criteria
- Risks & Mitigations
- Glossary

Only include sections that are relevant to the input. Do not pad with empty sections.

Return valid JSON:
{
  "sections": [
    {
      "sectionNumber": "1",
      "title": "string",
      "content": "string (markdown-formatted, 2-6 paragraphs with bullet points where appropriate)"
    }
  ],
  "totalRequirements": number,
  "domain": "string"
}`,
      userPrompt: text,
      jsonMode: true,
      maxTokens: 16384,
      model: 'google/gemini-2.5-flash',
    });

    const brdData = JSON.parse(brdResult);

    return new Response(JSON.stringify({
      sections: brdData.sections || [],
      section_count: brdData.sections?.length || 0,
      language: langData.language || 'en',
      domain: brdData.domain || 'General',
      total_requirements: brdData.totalRequirements || 0,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('generate-brd-from-text error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
