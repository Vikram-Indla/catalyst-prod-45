import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestCaseContext {
  title?: string;
  summary?: string;
  description?: string;
  testType?: string;
  steps?: Array<{ action: string; testData?: string; expectedResult: string }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, prompt, context } = await req.json() as {
      action: 'generate_steps' | 'improve_description' | 'suggest_edge_cases';
      prompt?: string;
      context?: TestCaseContext;
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'generate_steps':
        systemPrompt = `You are a QA expert helping to generate test steps for software testing.
Given test case context, generate detailed, actionable test steps.
Return ONLY valid JSON (no markdown), with this structure:
{
  "preconditions": ["precondition 1", "precondition 2"],
  "steps": [
    {
      "action": "What the tester does",
      "testData": "Any specific data needed (can be empty string)",
      "expectedResult": "What should happen"
    }
  ]
}
Be specific and include edge cases where relevant. Generate 3-8 steps typically.`;

        userPrompt = `Test Case Context:
- Title: ${context?.title || 'Not provided'}
- Summary: ${context?.summary || 'Not provided'}
- Test Type: ${context?.testType || 'functional'}

User Request: ${prompt || 'Generate comprehensive test steps for this test case.'}`;
        break;

      case 'improve_description':
        systemPrompt = `You are a QA expert helping to improve test case descriptions.
Create a clear, professional test case description that:
1. Clearly states the purpose of the test
2. Specifies what functionality is being verified
3. Mentions the expected behavior
4. Is concise but complete (2-4 sentences)
Return ONLY the improved description text, no JSON or markdown.`;

        userPrompt = `Title: ${context?.title || 'Not provided'}
Current Description: ${context?.description || 'Empty - please generate a new description'}

Improve this test case description to be more clear, specific, and comprehensive.`;
        break;

      case 'suggest_edge_cases':
        systemPrompt = `You are a QA expert helping to identify edge cases and negative test scenarios.
Analyze the test case and suggest additional edge cases that should be covered.
Return ONLY valid JSON (no markdown), with this structure:
{
  "edgeCases": [
    {
      "scenario": "Description of edge case",
      "action": "What to test",
      "expectedResult": "Expected behavior"
    }
  ]
}
Focus on boundary conditions, error scenarios, and unusual inputs.`;

        userPrompt = `Test Case:
- Title: ${context?.title || 'Not provided'}
- Summary: ${context?.summary || 'Not provided'}
- Existing Steps: ${JSON.stringify(context?.steps || [])}

Suggest additional edge cases and negative test scenarios that should be covered.`;
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // For improve_description, return the text directly
    if (action === 'improve_description') {
      return new Response(
        JSON.stringify({ result: content.trim() }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For other actions, parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON in AI response");
    }

    const parsedResult = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify({ result: parsedResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AI assistant error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
