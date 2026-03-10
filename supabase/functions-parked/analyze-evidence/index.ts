import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Analyze Evidence Edge Function
 * TC-261 to TC-330: AI-powered defect detection with severity classification
 * Implements the DETECTION_PROMPT for comprehensive screenshot analysis
 */

const DETECTION_PROMPT = `Analyze this screenshot for software defects.

Look for:
1. ERROR_MESSAGE: Red text, error dialogs, exceptions, error toasts
2. UI_ANOMALY: Overlapping elements, cut-off text, misaligned components
3. BROKEN_LAYOUT: Missing images, broken grids, layout shifts
4. EMPTY_STATE: Blank areas where content expected, missing data
5. LOADING_ISSUE: Stuck spinners, infinite loading states
6. DATA_ISSUE: NaN, undefined, null displayed, placeholder text visible
7. CONSOLE_ERROR: Red console output, stack traces visible

For each issue found, provide:
- type: One of the categories above
- severity: CRITICAL (blocking), HIGH (major impact), MEDIUM (noticeable), LOW (minor)
- confidence: 0.0 to 1.0 how certain you are
- description: What the issue is and where it appears
- location: Approximate position as percentage (x, y, width, height)
- suggestedTitle: A concise defect title
- suggestedSteps: Array of steps to reproduce

Also assess:
- overallQuality: PASS (no issues), ISSUES_FOUND (has issues), CRITICAL_ISSUES (blocking)
- summary: Brief one-line summary`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { attachmentId, imageUrl, testCaseContext } = await req.json();
    
    if (!attachmentId || !imageUrl) {
      return new Response(
        JSON.stringify({ error: "attachmentId and imageUrl are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Initialize Supabase client for database updates
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase configuration missing");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the image and convert to base64 for better reliability
    let imageContent: any;
    try {
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status}`);
      }
      const arrayBuffer = await imageResponse.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const base64 = btoa(binary);
      
      // Detect mime type from URL or default to png
      const mimeType = imageUrl.includes('.jpg') || imageUrl.includes('.jpeg') 
        ? 'image/jpeg' 
        : 'image/png';
      
      imageContent = { 
        type: "image_url", 
        image_url: { url: `data:${mimeType};base64,${base64}` } 
      };
    } catch (fetchError) {
      console.error("Image fetch error:", fetchError);
      // Fallback to URL reference
      imageContent = { type: "image_url", image_url: { url: imageUrl } };
    }

    // Build the prompt with optional context
    const fullPrompt = testCaseContext 
      ? `${DETECTION_PROMPT}\n\nTest Case Context: ${testCaseContext}`
      : DETECTION_PROMPT;

    // Define the structured output tool
    const tools = [{
      type: "function",
      function: {
        name: "report_analysis",
        description: "Report the analysis results for the screenshot",
        parameters: {
          type: "object",
          properties: {
            issues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { 
                    type: "string", 
                    enum: ["ERROR_MESSAGE", "UI_ANOMALY", "BROKEN_LAYOUT", "EMPTY_STATE", "LOADING_ISSUE", "DATA_ISSUE", "CONSOLE_ERROR"] 
                  },
                  severity: { 
                    type: "string", 
                    enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"] 
                  },
                  confidence: { type: "number", minimum: 0, maximum: 1 },
                  description: { type: "string" },
                  location: {
                    type: "object",
                    properties: {
                      x: { type: "number" },
                      y: { type: "number" },
                      width: { type: "number" },
                      height: { type: "number" }
                    }
                  },
                  suggestedTitle: { type: "string" },
                  suggestedSteps: { 
                    type: "array", 
                    items: { type: "string" } 
                  }
                },
                required: ["type", "severity", "confidence", "description", "suggestedTitle"]
              }
            },
            overallQuality: { 
              type: "string", 
              enum: ["PASS", "ISSUES_FOUND", "CRITICAL_ISSUES"] 
            },
            summary: { type: "string" }
          },
          required: ["issues", "overallQuality", "summary"]
        }
      }
    }];

    // Call Lovable AI Gateway with vision model
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "user", 
            content: [
              { type: "text", text: fullPrompt },
              imageContent
            ]
          }
        ],
        tools,
        tool_choice: { type: "function", function: { name: "report_analysis" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI analysis failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    // Extract the analysis result from tool call
    let analysis = {
      issues: [],
      overallQuality: "PASS",
      summary: "No issues detected"
    };
    
    if (data.choices?.[0]?.message?.tool_calls?.[0]) {
      const toolCall = data.choices[0].message.tool_calls[0];
      try {
        analysis = JSON.parse(toolCall.function.arguments);
      } catch (parseError) {
        console.error("Failed to parse tool response:", parseError);
      }
    }

    // Update the attachment record in the database
    const { error: updateError } = await supabase
      .from('step_result_attachments')
      .update({
        ai_analysis: analysis,
        ai_analyzed_at: new Date().toISOString(),
        ai_has_issues: analysis.issues?.length > 0
      })
      .eq('id', attachmentId);

    if (updateError) {
      console.error("Database update error:", updateError);
      // Still return analysis even if DB update fails
    }

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Analyze evidence error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
