// supabase/functions/generate-requirements/index.ts
// Supabase Edge Function for Requirement Assist AI Generation
// Uses Anthropic Claude API for intelligent requirements analysis

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.52.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerationRequest {
  generationId: string;
  inputText: string;
  outputTypes: {
    prd: boolean;
    epics: boolean;
    features: boolean;
    stories: boolean;
    testCases: boolean;
    acceptanceCriteria: boolean;
  };
  compliance: {
    dga: boolean;
    nca: boolean;
    babok: boolean;
  };
  settings: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  };
}

interface GeneratedItem {
  item_type: 'prd' | 'epic' | 'feature' | 'story';
  title: string;
  description: string;
  acceptance_criteria?: string;
  parent_index?: number;
  confidence_score: number;
  confidence_breakdown: {
    clarity: number;
    completeness: number;
    testability: number;
    feasibility: number;
  };
}

interface AIResponse {
  prd?: {
    title: string;
    description: string;
    sections: Record<string, string>;
  };
  epics: GeneratedItem[];
  features: GeneratedItem[];
  stories: GeneratedItem[];
  analysis: {
    actors: string[];
    functions: string[];
    complexity: 'Low' | 'Medium' | 'High';
    estimatedEffort: string;
  };
  compliance: {
    dga: { passed: number; total: number; details: string[] };
    nca: { passed: number; total: number; details: string[] };
    babok: { passed: number; total: number; details: string[] };
  };
}

const SYSTEM_PROMPT = `You are CATY (Catalyst AI Technology), an expert SAFe (Scaled Agile Framework) business analyst AI specialized in analyzing requirements documents and generating structured work items for enterprise government projects.

Your task is to analyze business requirement documents and generate structured outputs following these standards:
- SAFe (Scaled Agile Framework) methodology
- DGA (Digital Government Authority) compliance standards
- NCA (National Cybersecurity Authority) ECC-2:2018 controls
- BABOK (Business Analysis Body of Knowledge) v3 guidelines

CRITICAL RULES:
1. Every title MUST be unique and derived from the actual requirements text
2. NEVER use generic text like "System capability" or "Supporting capability"
3. Extract actual business concepts, user roles, and processes from the input
4. Generate 3-5 Epics maximum
5. Each Epic should have 2-4 Features
6. Each Feature should have 2-5 User Stories
7. Stories MUST follow the format: "As a [specific role], I want [specific goal], so that [specific benefit]"
8. Acceptance criteria MUST use Given/When/Then format
9. Confidence scores: 95-100 for clear requirements, 80-94 for inferred, 60-79 for assumed

For each generated item, provide a confidence score (0-100) based on:
- Clarity: How clear and unambiguous is the requirement
- Completeness: Does it have all necessary details
- Testability: Can it be verified through testing
- Feasibility: Is it technically achievable

Always maintain professional language appropriate for government documentation.
Use domain-specific terminology from the input requirements.
Extract ACTUAL concepts (license types, user roles, business processes) - do NOT invent features not supported by the requirements.`;

const GENERATION_PROMPT = `Analyze the following business requirements document and generate structured SAFe artifacts.

INPUT DOCUMENT:
---
{INPUT_TEXT}
---

REQUESTED OUTPUTS: {OUTPUT_TYPES}
COMPLIANCE FRAMEWORKS: {COMPLIANCE_FRAMEWORKS}

Return a SINGLE JSON object with this exact structure (no markdown, just raw JSON).
IMPORTANT: All string values must be valid JSON strings (escape newlines as \\n).

{
  "analysis": {
    "actors": ["list of identified actors/personas from the document"],
    "functions": ["list of key functions/capabilities mentioned"],
    "complexity": "Low|Medium|High",
    "estimatedEffort": "rough estimate in sprints"
  },
  "prd": {
    "title": "Product Requirements Document title derived from input",
    "description": "Executive summary of the requirements",
    "sections": {
      "overview": "Brief overview",
      "objectives": "Key business objectives",
      "scope": "In-scope and out-of-scope items",
      "requirements": "Summary of functional requirements",
      "compliance": "Compliance considerations",
      "appendix": "Additional notes"
    }
  },
  "epics": [
    {
      "item_type": "epic",
      "title": "Specific epic title from requirements (max 10 words)",
      "description": "Epic description with clear business outcome",
      "confidence_score": 92,
      "confidence_breakdown": {
        "clarity": 95,
        "completeness": 90,
        "testability": 88,
        "feasibility": 94
      }
    }
  ],
  "features": [
    {
      "item_type": "feature",
      "title": "Specific feature title (max 10 words)",
      "description": "Feature description with benefit hypothesis",
      "acceptance_criteria": "Given [context]\\nWhen [action]\\nThen [expected result]",
      "parent_index": 0,
      "confidence_score": 89,
      "confidence_breakdown": {
        "clarity": 92,
        "completeness": 87,
        "testability": 90,
        "feasibility": 88
      }
    }
  ],
  "stories": [
    {
      "item_type": "story",
      "title": "As a [specific role from requirements], I want [specific goal], so that [specific benefit]",
      "description": "Detailed story description with context",
      "acceptance_criteria": "Given [context]\\nWhen [action]\\nThen [expected outcome]\\n\\nGiven [another context]\\nWhen [another action]\\nThen [another outcome]",
      "parent_index": 0,
      "confidence_score": 95,
      "confidence_breakdown": {
        "clarity": 98,
        "completeness": 93,
        "testability": 96,
        "feasibility": 94
      }
    }
  ],
  "compliance": {
    "dga": {
      "passed": 12,
      "total": 12,
      "details": ["Data classification: PASS", "Access control: PASS", "Audit logging: PASS"]
    },
    "nca": {
      "passed": 8,
      "total": 8,
      "details": ["Security classification: PASS", "Data protection: PASS"]
    },
    "babok": {
      "passed": 6,
      "total": 6,
      "details": ["Requirement structure: PASS", "Traceability: PASS"]
    }
  }
}

QUALITY CONSTRAINTS:
- Generate 3-5 Epics based on major themes in the requirements
- Generate 2-4 Features per Epic
- Generate 2-5 Stories per Feature
- All titles must be UNIQUE and derived from actual input text
- Use actual role names mentioned in requirements (e.g., "Applicant", "BO Officer", "License Holder", "Admin")
- Be specific: "Gold License Application" not "License Application"

Generate realistic, high-quality requirements appropriate for a government ministry.`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    
    // Get Anthropic API key
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: anthropicApiKey,
    });

    // Parse request
    const request: GenerationRequest = await req.json();
    const { generationId, inputText, outputTypes, compliance, settings } = request;

    if (!generationId || !inputText) {
      throw new Error("Missing required fields: generationId, inputText");
    }

    // Build output types string
    const outputTypesStr = Object.entries(outputTypes)
      .filter(([_, enabled]) => enabled)
      .map(([type]) => type)
      .join(", ");

    // Build compliance frameworks string
    const complianceStr = Object.entries(compliance)
      .filter(([_, enabled]) => enabled)
      .map(([framework]) => framework.toUpperCase())
      .join(", ");

    // Prepare the prompt
    const userPrompt = GENERATION_PROMPT
      .replace("{INPUT_TEXT}", inputText)
      .replace("{OUTPUT_TYPES}", outputTypesStr || "prd, epics, features, stories")
      .replace("{COMPLIANCE_FRAMEWORKS}", complianceStr || "DGA, NCA, BABOK");

    console.log("Calling Claude API for generation:", generationId);
    console.log("Input text length:", inputText.length, "words:", inputText.split(/\s+/).length);

    // Call Claude API
    const response = await anthropic.messages.create({
      model: settings?.model || "claude-sonnet-4-20250514",
      max_tokens: settings?.maxTokens || 8000,
      system: settings?.systemPrompt || SYSTEM_PROMPT,
      messages: [
        { role: "user", content: userPrompt }
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    console.log("Claude response received, parsing JSON...");

    // Parse and normalize the JSON response
    const normalizeAIJson = (raw: string) => {
      let s = raw.trim();

      // Remove markdown code fences if present
      if (s.startsWith("```")) {
        const endIndex = s.lastIndexOf("```");
        const firstNewline = s.indexOf("\n");
        if (firstNewline !== -1) {
          s = (endIndex > firstNewline ? s.slice(firstNewline + 1, endIndex) : s.slice(firstNewline + 1)).trim();
        }
      }

      // Handle case where it starts with "json"
      if (s.toLowerCase().startsWith("json")) {
        s = s.slice(4).trim();
      }

      // Extract the outermost JSON object
      const firstBrace = s.indexOf("{");
      const lastBrace = s.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        s = s.slice(firstBrace, lastBrace + 1);
      }

      return s;
    };

    // Repair common JSON issues
    const escapeControlCharsInStrings = (input: string) => {
      let out = "";
      let inString = false;
      let escaped = false;

      for (let i = 0; i < input.length; i++) {
        const ch = input[i];

        if (inString) {
          if (escaped) {
            out += ch;
            escaped = false;
            continue;
          }

          if (ch === "\\") {
            out += ch;
            escaped = true;
            continue;
          }

          if (ch === '"') {
            out += ch;
            inString = false;
            continue;
          }

          if (ch === "\n") {
            out += "\\n";
            continue;
          }
          if (ch === "\r") {
            out += "\\r";
            continue;
          }
          if (ch === "\t") {
            out += "\\t";
            continue;
          }

          const code = ch.charCodeAt(0);
          if (code < 0x20) {
            out += `\\u${code.toString(16).padStart(4, "0")}`;
            continue;
          }

          out += ch;
        } else {
          if (ch === '"') {
            out += ch;
            inString = true;
            continue;
          }
          out += ch;
        }
      }

      return out;
    };

    const removeTrailingCommas = (input: string) => input.replace(/,\s*([}\]])/g, "$1");

    // Try to parse the response
    let aiResponse: AIResponse;
    const normalized = normalizeAIJson(content.text);
    
    try {
      aiResponse = JSON.parse(normalized) as AIResponse;
    } catch (e1) {
      console.warn("First parse attempt failed, trying repair...");
      const repaired = removeTrailingCommas(escapeControlCharsInStrings(normalized));
      try {
        aiResponse = JSON.parse(repaired) as AIResponse;
        console.log("JSON parse succeeded after repair");
      } catch (e2) {
        console.error("JSON parse failed:", e1, e2);
        console.error("Raw response (first 2000 chars):", content.text.slice(0, 2000));
        throw new Error("Failed to parse Claude response as JSON. Please try again.");
      }
    }

    const processingTime = Date.now() - startTime;
    const tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

    console.log("Parsed successfully. Tokens used:", tokensUsed);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update generation record with processing metadata
    await supabase
      .from("ra_generations")
      .update({
        status: "draft",
        tokens_used: tokensUsed,
        processing_time_ms: processingTime,
        updated_at: new Date().toISOString(),
      })
      .eq("id", generationId);

    // Insert generated items
    const itemsToInsert: any[] = [];

    // Insert PRD if generated
    if (aiResponse.prd && outputTypes.prd) {
      const prdDescription = aiResponse.prd.description + "\n\n" + 
        Object.entries(aiResponse.prd.sections || {})
          .map(([key, value]) => `## ${key.charAt(0).toUpperCase() + key.slice(1)}\n${value}`)
          .join("\n\n");
          
      itemsToInsert.push({
        generation_id: generationId,
        item_type: "prd",
        title: aiResponse.prd.title,
        description: prdDescription,
        confidence_score: 95,
        confidence_breakdown: { clarity: 95, completeness: 95, testability: 90, feasibility: 98 },
        compliance_results: aiResponse.compliance,
        sort_order: 0,
      });
    }

    // Insert Epics
    if (outputTypes.epics && aiResponse.epics) {
      for (let i = 0; i < aiResponse.epics.length; i++) {
        const epic = aiResponse.epics[i];
        itemsToInsert.push({
          generation_id: generationId,
          item_type: "epic",
          title: epic.title,
          description: epic.description,
          confidence_score: epic.confidence_score || 85,
          confidence_breakdown: epic.confidence_breakdown || { clarity: 85, completeness: 85, testability: 85, feasibility: 85 },
          sort_order: i + 1,
        });
      }
    }

    // First batch insert to get IDs for epics
    let epicRecords: any[] = [];
    if (itemsToInsert.length > 0) {
      const { data: insertedItems, error: insertError } = await supabase
        .from("ra_generated_items")
        .insert(itemsToInsert)
        .select();

      if (insertError) {
        console.error("Insert error:", insertError);
        throw new Error(`Failed to insert items: ${insertError.message}`);
      }

      epicRecords = insertedItems?.filter(item => item.item_type === "epic") || [];
    }

    // Insert Features with parent links
    const featuresToInsert: any[] = [];
    if (outputTypes.features && aiResponse.features) {
      for (let i = 0; i < aiResponse.features.length; i++) {
        const feature = aiResponse.features[i];
        const parentEpic = epicRecords[feature.parent_index || Math.floor(i / 3)];
        
        featuresToInsert.push({
          generation_id: generationId,
          item_type: "feature",
          title: feature.title,
          description: feature.description,
          acceptance_criteria: feature.acceptance_criteria,
          parent_id: parentEpic?.id || null,
          confidence_score: feature.confidence_score || 85,
          confidence_breakdown: feature.confidence_breakdown || { clarity: 85, completeness: 85, testability: 85, feasibility: 85 },
          sort_order: i,
        });
      }
    }

    let featureRecords: any[] = [];
    if (featuresToInsert.length > 0) {
      const { data: insertedFeatures, error: featureError } = await supabase
        .from("ra_generated_items")
        .insert(featuresToInsert)
        .select();

      if (featureError) {
        console.error("Feature insert error:", featureError);
      }
      featureRecords = insertedFeatures || [];
    }

    // Insert Stories with parent links
    const storiesToInsert: any[] = [];
    if (outputTypes.stories && aiResponse.stories) {
      for (let i = 0; i < aiResponse.stories.length; i++) {
        const story = aiResponse.stories[i];
        // Distribute stories across features more evenly
        const parentFeature = featureRecords[story.parent_index ?? Math.floor(i / Math.max(1, Math.ceil(aiResponse.stories.length / featureRecords.length)))];
        
        storiesToInsert.push({
          generation_id: generationId,
          item_type: "story",
          title: story.title,
          description: story.description,
          acceptance_criteria: story.acceptance_criteria,
          parent_id: parentFeature?.id || null,
          confidence_score: story.confidence_score || 85,
          confidence_breakdown: story.confidence_breakdown || { clarity: 85, completeness: 85, testability: 85, feasibility: 85 },
          sort_order: i,
        });
      }
    }

    if (storiesToInsert.length > 0) {
      const { error: storyError } = await supabase
        .from("ra_generated_items")
        .insert(storiesToInsert);

      if (storyError) {
        console.error("Story insert error:", storyError);
      }
    }

    console.log("Generation complete:", {
      generationId,
      epics: aiResponse.epics?.length || 0,
      features: aiResponse.features?.length || 0,
      stories: aiResponse.stories?.length || 0,
      tokensUsed,
      processingTimeMs: processingTime,
    });

    // Return response
    return new Response(
      JSON.stringify({
        success: true,
        generationId,
        analysis: aiResponse.analysis,
        compliance: aiResponse.compliance,
        itemCounts: {
          prd: aiResponse.prd ? 1 : 0,
          epics: aiResponse.epics?.length || 0,
          features: aiResponse.features?.length || 0,
          stories: aiResponse.stories?.length || 0,
        },
        tokensUsed,
        processingTimeMs: processingTime,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Generation error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
