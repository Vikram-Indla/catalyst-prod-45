import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_URL = 'https://api.lovable.dev/v1/chat/completions';

interface AnalysisRequest {
  draft_id: string;
  run_id: string;
  document_text: string;
  analysis_type: 'evidence' | 'glossary' | 'functional_requirements' | 'compliance' | 'brd' | 'open_questions';
  language?: string;
}

async function computeContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function getSystemPrompt(analysisType: string, language: string): string {
  const isArabic = language === 'ar';
  
  const prompts: Record<string, string> = {
    evidence: `You are an expert business analyst. Extract evidence statements from the document.
Return a JSON object with this structure:
{
  "evidence": [
    {
      "id": "EVD-001",
      "statement": "The extracted evidence statement",
      "source_ref": "Section or page reference",
      "confidence": "high" | "medium" | "low",
      "category": "requirement" | "constraint" | "assumption" | "risk" | "objective"
    }
  ],
  "summary": "Brief summary of the document",
  "document_type": "RFP" | "BRD" | "SRS" | "Other"
}
Only return valid JSON, no markdown or extra text.`,

    glossary: `You are an expert business analyst. Extract domain-specific terms and their definitions from the document.
Return a JSON object with this structure:
{
  "terms": [
    {
      "id": "TERM-001",
      "term": "The term",
      "definition": "Clear definition of the term",
      "acronym": "If applicable",
      "domain": "business" | "technical" | "regulatory" | "general"
    }
  ]
}
Only return valid JSON, no markdown or extra text.`,

    functional_requirements: `You are an expert business analyst. Extract and structure functional requirements from the document.
Return a JSON object with this structure:
{
  "requirements": [
    {
      "id": "FR-001",
      "title": "Short requirement title",
      "description": "Detailed requirement description",
      "priority": "must" | "should" | "could" | "wont",
      "category": "functional" | "non-functional" | "interface" | "data",
      "acceptance_criteria": ["Criterion 1", "Criterion 2"],
      "source_evidence_ids": ["EVD-001"],
      "validated": false
    }
  ],
  "total_count": 0,
  "by_priority": { "must": 0, "should": 0, "could": 0, "wont": 0 }
}
Only return valid JSON, no markdown or extra text.`,

    compliance: `You are an expert compliance analyst. Analyze the requirements against DGA and NCA frameworks.
Return a JSON object with this structure:
{
  "rows": [
    {
      "id": "COMP-001",
      "framework": "DGA" | "NCA",
      "control_id": "DGA-1.1 or NCA-1-1",
      "control_name": "Name of the control",
      "coverage": "covered" | "partial" | "not_specified",
      "evidence_refs": ["EVD-001", "FR-001"],
      "notes": "Additional notes"
    }
  ],
  "summary": {
    "dga_total": 0,
    "dga_covered": 0,
    "nca_total": 0,
    "nca_covered": 0
  }
}
Only return valid JSON, no markdown or extra text.`,

    brd: `You are an expert business analyst. Generate a structured BRD (Business Requirements Document) from the analyzed requirements.
Return a JSON object with this structure:
{
  "title": "Project Title",
  "executive_summary": "Brief executive summary",
  "business_objectives": ["Objective 1", "Objective 2"],
  "scope": {
    "in_scope": ["Item 1", "Item 2"],
    "out_of_scope": ["Item 1"]
  },
  "stakeholders": [
    { "role": "Role name", "responsibility": "Description" }
  ],
  "requirements_summary": {
    "functional": ["Key FR 1", "Key FR 2"],
    "non_functional": ["Key NFR 1"]
  },
  "epics": [
    {
      "id": "EPIC-001",
      "name": "Epic name",
      "description": "Epic description",
      "features": [
        { "id": "FEAT-001", "name": "Feature name", "stories_count": 3 }
      ],
      "estimated_quarter": "Q1 2025"
    }
  ],
  "risks": [
    { "id": "RISK-001", "description": "Risk description", "impact": "high" | "medium" | "low", "mitigation": "Mitigation strategy" }
  ],
  "gaps": [
    { "code": "GAP-001", "description": "Gap description", "severity": "critical" | "high" | "medium" | "low" }
  ]
}
Only return valid JSON, no markdown or extra text.`,

    open_questions: `You are an expert business analyst. Identify ambiguities, missing information, and open questions that need clarification.
Return a JSON object with this structure:
{
  "questions": [
    {
      "id": "OQ-001",
      "question": "The question that needs clarification",
      "context": "Why this question is important",
      "category": "scope" | "requirement" | "technical" | "business" | "compliance",
      "priority": "critical" | "high" | "medium" | "low",
      "related_evidence_ids": ["EVD-001"],
      "suggested_answer": "If there's a likely answer based on context",
      "answered": false,
      "answer": null
    }
  ]
}
Only return valid JSON, no markdown or extra text.`
  };

  let prompt = prompts[analysisType] || prompts.evidence;
  
  if (isArabic) {
    prompt += '\n\nIMPORTANT: The document is in Arabic. Extract content in Arabic where appropriate, but use English for technical terms and IDs.';
  }
  
  return prompt;
}

serve(async (req) => {
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

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
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

    const body: AnalysisRequest = await req.json();
    const { draft_id, run_id, document_text, analysis_type, language = 'en' } = body;

    if (!draft_id || !run_id || !document_text || !analysis_type) {
      return new Response(JSON.stringify({ error: 'Missing required fields: draft_id, run_id, document_text, analysis_type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Starting ${analysis_type} analysis for draft ${draft_id}, run ${run_id}`);

    // Log audit event for analysis start
    await supabase.from('ai_assist_audit_events').insert({
      draft_id,
      run_id,
      event_type: 'analysis_started',
      actor_user_id: user.id,
      payload_json: { analysis_type, language },
    });

    // Call Lovable AI API
    const systemPrompt = getSystemPrompt(analysis_type, language);
    
    const aiResponse = await fetch(LOVABLE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this document:\n\n${document_text.slice(0, 50000)}` } // Limit to ~50k chars
        ],
        temperature: 0.3,
        max_tokens: 8000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      await supabase.from('ai_assist_audit_events').insert({
        draft_id,
        run_id,
        event_type: 'analysis_failed',
        actor_user_id: user.id,
        payload_json: { analysis_type, error: errorText },
      });
      
      return new Response(JSON.stringify({ error: 'AI analysis failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      console.error('No content in AI response');
      return new Response(JSON.stringify({ error: 'No response from AI' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse JSON from AI response
    let parsedContent;
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedContent = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.log('Raw response:', aiContent);
      
      return new Response(JSON.stringify({ error: 'Failed to parse AI response', raw: aiContent }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Compute content hash for determinism tracking
    const contentHash = await computeContentHash(JSON.stringify(parsedContent));

    // Get next version for this artifact type
    const { data: existingArtifacts } = await supabase
      .from('ai_assist_artifacts')
      .select('version')
      .eq('run_id', run_id)
      .eq('artifact_type', analysis_type)
      .order('version', { ascending: false })
      .limit(1);

    const nextVersion = existingArtifacts && existingArtifacts.length > 0 
      ? existingArtifacts[0].version + 1 
      : 1;

    // Store artifact
    const { data: artifact, error: artifactError } = await supabase
      .from('ai_assist_artifacts')
      .insert({
        run_id,
        artifact_type: analysis_type,
        content_json: parsedContent,
        content_hash: contentHash,
        version: nextVersion,
      })
      .select()
      .single();

    if (artifactError) {
      console.error('Failed to store artifact:', artifactError);
      return new Response(JSON.stringify({ error: 'Failed to store analysis results' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log audit event for analysis completion
    await supabase.from('ai_assist_audit_events').insert({
      draft_id,
      run_id,
      event_type: 'analysis_completed',
      actor_user_id: user.id,
      payload_json: { 
        analysis_type, 
        artifact_id: artifact.id,
        content_hash: contentHash,
        version: nextVersion,
      },
    });

    console.log(`${analysis_type} analysis completed, artifact ${artifact.id}`);

    return new Response(JSON.stringify({
      success: true,
      artifact_id: artifact.id,
      artifact_type: analysis_type,
      content: parsedContent,
      content_hash: contentHash,
      version: nextVersion,
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
