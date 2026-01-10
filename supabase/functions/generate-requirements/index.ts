// supabase/functions/generate-requirements/index.ts
// Supabase Edge Function for Requirement Assist AI Generation
// Uses Lovable AI Gateway (no external API key required)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

const SYSTEM_PROMPT = `You are CATY (Catalyst AI Technology), an expert business analyst AI specialized in analyzing requirements documents and generating SAFe-compliant artifacts for the Saudi Ministry of Industry.

Your task is to analyze business requirement documents and generate structured outputs following these standards:
- SAFe (Scaled Agile Framework) methodology
- DGA (Digital Government Authority) compliance standards
- NCA (National Cybersecurity Authority) ECC-2:2018 controls
- BABOK (Business Analysis Body of Knowledge) v3 guidelines

For each generated item, provide a confidence score (0-100) based on:
- Clarity: How clear and unambiguous is the requirement
- Completeness: Does it have all necessary details
- Testability: Can it be verified through testing
- Feasibility: Is it technically achievable

Always maintain professional language appropriate for government documentation.
Generate outputs in English with Arabic translation support where relevant.

CRITICAL JSON RULES:
- Return ONLY valid JSON (no markdown/code fences, no commentary)
- Use double quotes for all keys/strings
- Do NOT include literal newlines inside JSON strings; use \\n (and \\t) escape sequences
- Do NOT include unescaped double quotes inside strings
- Keep text concise to avoid truncation`;


const GENERATION_PROMPT = `Analyze the following business requirements document and generate structured SAFe artifacts.

INPUT DOCUMENT:
---
{INPUT_TEXT}
---

REQUESTED OUTPUTS: {OUTPUT_TYPES}
COMPLIANCE FRAMEWORKS: {COMPLIANCE_FRAMEWORKS}

Return a SINGLE JSON object with this exact structure (no markdown, just raw JSON).
IMPORTANT: All string values must be valid JSON strings (escape newlines as \\n; do not include literal line breaks inside quotes).
Keep content concise (avoid multi-page outputs) to prevent truncation.

{
  "analysis": {
    "actors": ["list of identified actors/personas"],
    "functions": ["list of key functions/capabilities"],
    "complexity": "Low|Medium|High",
    "estimatedEffort": "rough estimate in sprints"
  },
  "prd": {
    "title": "Product Requirements Document title",
    "description": "Executive summary",
    "sections": {
      "overview": "...",
      "objectives": "...",
      "scope": "...",
      "requirements": "...",
      "compliance": "...",
      "appendix": "..."
    }
  },
  "epics": [
    {
      "item_type": "epic",
      "title": "Epic title",
      "description": "Epic description with business outcome",
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
      "title": "Feature title",
      "description": "Feature description with benefit hypothesis",
      "acceptance_criteria": "Given/When/Then format (use \\n for line breaks)",
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
      "title": "As a [user], I want [goal], so that [benefit]",
      "description": "Detailed story description",
      "acceptance_criteria": "Given [context]\\nWhen [action]\\nThen [outcome]",
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
      "details": ["Data classification: PASS", "Access control: PASS"]
    },
    "nca": {
      "passed": 8,
      "total": 8,
      "details": ["Security classification: PASS"]
    },
    "babok": {
      "passed": 6,
      "total": 6,
      "details": ["Requirement structure: PASS"]
    }
  }
}

Quality + size constraints:
- Prefer up to 3 epics.
- Prefer 2-3 features per epic.
- Prefer 2-3 stories per feature.
- Keep PRD section text brief.

Generate realistic, high-quality requirements appropriate for a government ministry. Ensure all items have meaningful confidence scores based on the quality of the input.`;


serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    
    // Get Lovable AI Gateway API key (auto-provisioned)
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

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

    console.log("Calling Lovable AI Gateway for generation:", generationId);

    const DEFAULT_MODEL = "google/gemini-3-flash-preview";

    const normalizeModel = (requested?: string) => {
      const m = (requested || "").trim();
      if (!m) return DEFAULT_MODEL;

      // Only allow models supported by Lovable AI Gateway in this project.
      // If user UI sends an unsupported model (e.g. Claude), we fall back gracefully.
      if (m.startsWith("google/") || m.startsWith("openai/")) return m;

      console.warn("Unsupported model requested; falling back to default:", m);
      return DEFAULT_MODEL;
    };

    const callAIGateway = async (args: {
      model: string;
      maxTokens: number;
      temperature: number;
      systemPrompt: string;
      userPrompt: string;
    }) => {
      const model = normalizeModel(args.model);

      const body: Record<string, unknown> = {
        model,
        messages: [
          { role: "system", content: args.systemPrompt },
          { role: "user", content: args.userPrompt },
        ],
      };

      // Some OpenAI models only support the default temperature.
      // To avoid 400s, we omit temperature for openai/* and only set it for google/*.
      if (!model.startsWith("openai/")) {
        body.temperature = args.temperature;
      }


      // Different providers use different token parameter names.
      // For OpenAI-family models on this gateway, use max_completion_tokens.
      if (model.startsWith("openai/")) {
        body.max_completion_tokens = args.maxTokens;
        body.response_format = { type: "json_object" };
      } else {
        body.max_tokens = args.maxTokens;
      }

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${lovableApiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = (await response.text()).slice(0, 1500);
        console.error("Lovable AI Gateway error:", response.status, errorText);

        if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please try again in a moment.");
        }
        if (response.status === 402) {
          throw new Error("AI credits exhausted. Please add credits to continue.");
        }
        throw new Error(`AI Gateway error ${response.status}: ${errorText || "Unknown error"}`);
      }

      const aiGatewayResponse = await response.json();

      const choice = aiGatewayResponse.choices?.[0];
      const message = choice?.message;

      const extractText = (value: unknown): string => {
        if (typeof value === "string") return value;
        if (Array.isArray(value)) {
          // Some providers return structured parts: [{ type: 'text', text: '...' }, ...]
          return value
            .map((part) => {
              if (typeof part === "string") return part;
              if (part && typeof part === "object") {
                const t = (part as any).text;
                return typeof t === "string" ? t : "";
              }
              return "";
            })
            .join("");
        }
        return "";
      };

      const content = extractText(message?.content ?? (choice as any)?.text ?? (aiGatewayResponse as any)?.output_text);

      if (!content || !content.trim()) {
        // Log a small diagnostic (avoid dumping huge payloads)
        console.error(
          "AI response missing content:",
          JSON.stringify(
            {
              hasChoices: Array.isArray(aiGatewayResponse.choices),
              firstChoiceKeys: choice ? Object.keys(choice) : null,
              messageKeys: message ? Object.keys(message) : null,
            },
            null,
            2
          )
        );
        throw new Error("No content in AI response");
      }

      const tokensUsed =
        (aiGatewayResponse.usage?.prompt_tokens || 0) +
        (aiGatewayResponse.usage?.completion_tokens || 0);

      return { content: content.trim(), tokensUsed };
    };

    console.log("AI response received, parsing JSON...");

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

      // Handle case where it starts with "json" (sometimes models emit "json{...")
      if (s.toLowerCase().startsWith("json")) {
        s = s.slice(4).trim();
      }

      // If there's any leading/trailing chatter, extract the outermost JSON object
      const firstBrace = s.indexOf("{");
      const lastBrace = s.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        s = s.slice(firstBrace, lastBrace + 1);
      }

      return s;
    };

    // Repair common JSON issues produced by LLMs (unescaped newlines/control chars in strings, trailing commas)
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

    const tryParseAIResponse = (raw: string) => {
      const normalized = normalizeAIJson(raw);
      try {
        return {
          parsed: JSON.parse(normalized) as AIResponse,
          usedRepair: false,
          normalized,
          repaired: null as string | null,
        };
      } catch (e1) {
        const repaired = removeTrailingCommas(escapeControlCharsInStrings(normalized));
        try {
          return {
            parsed: JSON.parse(repaired) as AIResponse,
            usedRepair: true,
            normalized,
            repaired,
          };
        } catch (e2) {
          const err = new Error("AI response JSON parse failed");
          (err as any).details = { e1, e2, normalized, repaired };
          throw err;
        }
      }
    };

    const buildParseDebug = (rawJson: string, parseErr: unknown) => {
      const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      const match = msg.match(/position\s+(\d+)/i);
      const pos = match ? Number(match[1]) : null;
      if (pos === null || Number.isNaN(pos)) return { msg };
      const start = Math.max(0, pos - 160);
      const end = Math.min(rawJson.length, pos + 160);
      return { msg, pos, snippet: rawJson.slice(start, end) };
    };

    // Attempt 1: Primary model (validated). If parsing fails, retry once with a stricter JSON mode model.
    const requestedMax = settings?.maxTokens ?? 4000;
    const cappedMax = Math.max(256, Math.min(requestedMax, 4000));

    const attempts = [
      {
        name: "primary",
        model: settings?.model || DEFAULT_MODEL,
        maxTokens: cappedMax,
        temperature: settings?.temperature ?? 0.7,
        systemPrompt: settings?.systemPrompt || SYSTEM_PROMPT,
        userPrompt,
      },
      {
        name: "retry_strict_json",
        model: "openai/gpt-5-mini",
        maxTokens: cappedMax,
        // Some OpenAI models only support the default temperature.
        temperature: 1,
        systemPrompt:
          (settings?.systemPrompt || SYSTEM_PROMPT) +
          "\n\nRETRY MODE: Output MUST be a single valid JSON object. No line breaks inside strings; escape as \\n. Output should be compact/minified.",
        userPrompt: userPrompt + "\n\nRETRY MODE: Return compact JSON only.",
      },
    ];

    let aiResponse: AIResponse | null = null;
    let tokensUsed = 0;
    let lastError: Error | null = null;

    for (const attempt of attempts) {
      try {
        console.log("AI attempt:", attempt.name, attempt.model);
        const { content, tokensUsed: attemptTokens } = await callAIGateway(attempt);

        // keep last token count for observability
        tokensUsed = attemptTokens;

        const parsed = tryParseAIResponse(content);
        aiResponse = parsed.parsed;

        if (parsed.usedRepair) {
          console.warn("AI JSON required repair:", attempt.name);
        }

        break; // success
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        lastError = e;
        console.error("AI attempt failed:", attempt.name, e);

        // If it was a parse failure, log precise context to help future debugging.
        if ((e as any).details) {
          const details = (e as any).details;
          console.error("Parse failure (normalized) context:", buildParseDebug(details.normalized, details.e1));
          console.error("Parse failure (repaired) context:", buildParseDebug(details.repaired, details.e2));
        }

        // try next attempt
      }
    }

    const processingTime = Date.now() - startTime;

    if (!aiResponse) {
      throw (lastError ?? new Error("Failed to parse AI response as JSON. Please try again."));
    }
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
        const parentEpic = epicRecords[feature.parent_index || 0];
        
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
        const parentFeature = featureRecords[story.parent_index || Math.floor(i / 3)];
        
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
