import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Evidence AI Analysis Edge Function
 * TC-261 to TC-330: OCR extraction, defect detection, smart suggestions
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, imageUrl, imageBase64, context } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Prepare image content for vision model
    const imageContent = imageBase64 
      ? { type: "image_url", image_url: { url: `data:image/png;base64,${imageBase64}` } }
      : { type: "image_url", image_url: { url: imageUrl } };

    let systemPrompt = "";
    let userPrompt = "";
    let tools: any[] = [];
    let toolChoice: any = undefined;

    switch (action) {
      case "ocr":
        // TC-261 to TC-280: OCR text extraction
        systemPrompt = `You are an OCR specialist. Extract ALL text visible in the image with high accuracy.
Maintain the original layout and structure as much as possible.
Include UI elements text, error messages, labels, and any visible content.
If no text is found, respond with "No text detected."`;
        userPrompt = "Extract all text from this image. Preserve formatting and structure.";
        break;

      case "detect_defects":
        // TC-281 to TC-310: AI defect detection
        systemPrompt = `You are a QA expert analyzing screenshots for software defects.
Identify visual issues, UI problems, accessibility concerns, and potential bugs.
Be specific about locations and provide severity ratings.`;
        userPrompt = context 
          ? `Analyze this screenshot for defects. Context: ${context}`
          : "Analyze this screenshot for potential defects, bugs, or visual issues.";
        tools = [{
          type: "function",
          function: {
            name: "report_defects",
            description: "Report detected defects in the image",
            parameters: {
              type: "object",
              properties: {
                defects: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { 
                        type: "string", 
                        enum: ["visual", "functional", "accessibility", "performance", "content", "layout"] 
                      },
                      severity: { 
                        type: "string", 
                        enum: ["critical", "major", "minor", "trivial"] 
                      },
                      title: { type: "string" },
                      description: { type: "string" },
                      location: { type: "string" },
                      suggestion: { type: "string" }
                    },
                    required: ["type", "severity", "title", "description"]
                  }
                },
                summary: { type: "string" },
                overallQuality: { 
                  type: "string", 
                  enum: ["excellent", "good", "fair", "poor"] 
                }
              },
              required: ["defects", "summary", "overallQuality"]
            }
          }
        }];
        toolChoice = { type: "function", function: { name: "report_defects" } };
        break;

      case "suggest_test_steps":
        // TC-311 to TC-330: Smart suggestions
        systemPrompt = `You are a test automation expert. Analyze the screenshot and suggest test steps.
Focus on what actions can be performed and what should be verified.`;
        userPrompt = context
          ? `Based on this screenshot and context: "${context}", suggest test steps.`
          : "Analyze this screenshot and suggest potential test steps.";
        tools = [{
          type: "function",
          function: {
            name: "suggest_steps",
            description: "Suggest test steps based on the screenshot",
            parameters: {
              type: "object",
              properties: {
                steps: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      action: { type: "string" },
                      target: { type: "string" },
                      expectedResult: { type: "string" },
                      priority: { 
                        type: "string", 
                        enum: ["high", "medium", "low"] 
                      }
                    },
                    required: ["action", "expectedResult"]
                  }
                },
                pageType: { type: "string" },
                mainFeatures: { type: "array", items: { type: "string" } }
              },
              required: ["steps", "pageType"]
            }
          }
        }];
        toolChoice = { type: "function", function: { name: "suggest_steps" } };
        break;

      case "compare_images":
        // Compare two images for differences
        systemPrompt = `You are a visual comparison expert. Compare two images and identify differences.
Focus on visual changes, missing elements, and any discrepancies.`;
        userPrompt = "Compare these two images and describe any differences.";
        break;

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action. Use: ocr, detect_defects, suggest_test_steps, or compare_images" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Build request body
    const requestBody: any = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: [
            { type: "text", text: userPrompt },
            imageContent
          ]
        }
      ],
    };

    if (tools.length > 0) {
      requestBody.tools = tools;
      requestBody.tool_choice = toolChoice;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
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
    
    // Extract result based on action type
    let result: any;
    
    if (tools.length > 0 && data.choices?.[0]?.message?.tool_calls?.[0]) {
      // Parse tool call result
      const toolCall = data.choices[0].message.tool_calls[0];
      try {
        result = JSON.parse(toolCall.function.arguments);
      } catch {
        result = { raw: toolCall.function.arguments };
      }
    } else {
      // Plain text response (OCR, compare)
      result = {
        text: data.choices?.[0]?.message?.content || "",
      };
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        action,
        result,
        usage: data.usage 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Evidence AI error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
