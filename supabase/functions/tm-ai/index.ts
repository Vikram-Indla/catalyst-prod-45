import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: req.headers.get('Authorization')! } }
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: tmUser } = await supabase
      .from('tm_users')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const action = pathParts[1] || '';

    // POST /tm-ai/generate-cases - Generate test cases from requirements
    if (req.method === 'POST' && action === 'generate-cases') {
      const { requirement, context, format, count = 5 } = await req.json();

      if (!requirement) {
        return new Response(
          JSON.stringify({ error: 'Requirement text is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Build prompt for test case generation
      const prompt = `Generate ${count} comprehensive test cases for the following requirement:

REQUIREMENT:
${requirement}

${context ? `ADDITIONAL CONTEXT:\n${context}\n` : ''}

Generate test cases in the following JSON format:
{
  "testCases": [
    {
      "title": "Descriptive test case title",
      "objective": "What this test validates",
      "preconditions": "Setup required before testing",
      "priority": "high|medium|low",
      "type": "functional|integration|edge_case|negative",
      "steps": [
        { "action": "What to do", "expectedResult": "What should happen" }
      ]
    }
  ]
}

Include:
- Positive test cases (happy path)
- Negative test cases (error handling)
- Edge cases (boundary conditions)
- Integration scenarios if applicable

Be specific and actionable in step descriptions.`;

      // Call AI service (using Lovable AI proxy)
      const aiResponse = await fetch('https://api.lovable.dev/v1/ai/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.get('Authorization')!
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are a QA expert that generates comprehensive test cases. Always respond with valid JSON.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7
        })
      });

      if (!aiResponse.ok) {
        throw new Error('AI service unavailable');
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || '';
      
      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const testCases = jsonMatch ? JSON.parse(jsonMatch[0]) : { testCases: [] };

      // Log AI usage
      await supabase.from('tm_ai_usage_log').insert({
        user_id: tmUser?.id,
        feature: 'generate_cases',
        input_tokens: prompt.length,
        output_tokens: content.length,
        model: 'gemini-2.5-flash'
      });

      return new Response(
        JSON.stringify(testCases),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /tm-ai/suggest-steps - Suggest test steps
    if (req.method === 'POST' && action === 'suggest-steps') {
      const { title, objective, existing_steps = [] } = await req.json();

      const prompt = `Suggest detailed test steps for the following test case:

TITLE: ${title}
OBJECTIVE: ${objective}

${existing_steps.length > 0 ? `EXISTING STEPS:\n${existing_steps.map((s: { action: string; expectedResult: string }, i: number) => `${i + 1}. ${s.action} → ${s.expectedResult}`).join('\n')}\n` : ''}

Generate additional or improved test steps in JSON format:
{
  "steps": [
    { "action": "Specific action to perform", "expectedResult": "Expected outcome" }
  ],
  "suggestions": ["Optional improvement suggestions"]
}

Steps should be:
- Atomic (one action per step)
- Clear and specific
- Include verification points
- Cover setup, execution, and validation`;

      const aiResponse = await fetch('https://api.lovable.dev/v1/ai/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.get('Authorization')!
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are a QA expert. Respond with valid JSON only.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.6
        })
      });

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { steps: [], suggestions: [] };

      await supabase.from('tm_ai_usage_log').insert({
        user_id: tmUser?.id,
        feature: 'suggest_steps',
        input_tokens: prompt.length,
        output_tokens: content.length,
        model: 'gemini-2.5-flash'
      });

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /tm-ai/analyze-failure - Analyze test failure
    if (req.method === 'POST' && action === 'analyze-failure') {
      const { test_case, step_results, error_message, logs } = await req.json();

      const prompt = `Analyze this test failure and suggest root causes:

TEST CASE: ${test_case.title}
OBJECTIVE: ${test_case.objective}

STEP RESULTS:
${step_results.map((s: { action: string; status: string; actual_result?: string }, i: number) => 
  `${i + 1}. ${s.action} - ${s.status}${s.actual_result ? `: ${s.actual_result}` : ''}`
).join('\n')}

${error_message ? `ERROR MESSAGE: ${error_message}` : ''}
${logs ? `LOGS:\n${logs}` : ''}

Provide analysis in JSON format:
{
  "likelyRootCause": "Primary suspected cause",
  "possibleCauses": ["List of possible causes"],
  "suggestedActions": ["Recommended investigation steps"],
  "severity": "critical|high|medium|low",
  "category": "bug|environment|data|flaky|requirement"
}`;

      const aiResponse = await fetch('https://api.lovable.dev/v1/ai/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.get('Authorization')!
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-pro',
          messages: [
            { role: 'system', content: 'You are a senior QA engineer analyzing test failures. Respond with valid JSON.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.5
        })
      });

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      await supabase.from('tm_ai_usage_log').insert({
        user_id: tmUser?.id,
        feature: 'analyze_failure',
        input_tokens: prompt.length,
        output_tokens: content.length,
        model: 'gemini-2.5-pro'
      });

      return new Response(
        JSON.stringify(analysis),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /tm-ai/find-duplicates - Find duplicate test cases
    if (req.method === 'POST' && action === 'find-duplicates') {
      const { project_id, case_id } = await req.json();

      // Get the target case
      const { data: targetCase } = await supabase
        .from('tm_test_cases')
        .select('id, title, objective, preconditions, tm_test_steps(action, expected_result)')
        .eq('id', case_id)
        .single();

      if (!targetCase) {
        return new Response(
          JSON.stringify({ error: 'Test case not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get other cases in project
      const { data: otherCases } = await supabase
        .from('tm_test_cases')
        .select('id, case_key, title, objective, preconditions, tm_test_steps(action, expected_result)')
        .eq('project_id', project_id)
        .neq('id', case_id)
        .limit(100);

      if (!otherCases?.length) {
        return new Response(
          JSON.stringify({ duplicates: [], similar: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Build comparison prompt
      const targetDesc = `TITLE: ${targetCase.title}\nOBJECTIVE: ${targetCase.objective}\nSTEPS: ${targetCase.tm_test_steps?.map((s: { action: string }) => s.action).join(', ')}`;
      
      const casesDesc = otherCases.map((c, i) => 
        `[${i}] ${c.case_key}: ${c.title}\nOBJECTIVE: ${c.objective}\nSTEPS: ${c.tm_test_steps?.map((s: { action: string }) => s.action).join(', ')}`
      ).join('\n\n');

      const prompt = `Compare this test case with others and identify duplicates/similar cases:

TARGET CASE:
${targetDesc}

OTHER CASES:
${casesDesc}

Respond in JSON format:
{
  "duplicates": [{"index": 0, "similarity": 95, "reason": "Why it's a duplicate"}],
  "similar": [{"index": 0, "similarity": 70, "reason": "Why it's similar"}]
}

Consider:
- Title and objective similarity
- Step overlap
- Coverage redundancy
- Only include cases with >60% similarity`;

      const aiResponse = await fetch('https://api.lovable.dev/v1/ai/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.get('Authorization')!
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are a QA expert identifying duplicate test cases. Respond with valid JSON.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3
        })
      });

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { duplicates: [], similar: [] };

      // Map indices back to actual cases
      const mappedResult = {
        duplicates: result.duplicates?.map((d: { index: number; similarity: number; reason: string }) => ({
          ...otherCases[d.index],
          similarity: d.similarity,
          reason: d.reason
        })) || [],
        similar: result.similar?.map((s: { index: number; similarity: number; reason: string }) => ({
          ...otherCases[s.index],
          similarity: s.similarity,
          reason: s.reason
        })) || []
      };

      await supabase.from('tm_ai_usage_log').insert({
        user_id: tmUser?.id,
        feature: 'find_duplicates',
        input_tokens: prompt.length,
        output_tokens: content.length,
        model: 'gemini-2.5-flash'
      });

      return new Response(
        JSON.stringify(mappedResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /tm-ai/usage - Get AI usage stats
    if (req.method === 'GET' && action === 'usage') {
      const days = parseInt(url.searchParams.get('days') || '30');
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('tm_ai_usage_log')
        .select('feature, input_tokens, output_tokens, created_at')
        .eq('user_id', tmUser?.id)
        .gte('created_at', startDate)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Aggregate stats
      const stats = {
        totalRequests: data?.length || 0,
        totalInputTokens: data?.reduce((sum, r) => sum + (r.input_tokens || 0), 0) || 0,
        totalOutputTokens: data?.reduce((sum, r) => sum + (r.output_tokens || 0), 0) || 0,
        byFeature: {} as Record<string, number>
      };

      data?.forEach(r => {
        stats.byFeature[r.feature] = (stats.byFeature[r.feature] || 0) + 1;
      });

      return new Response(
        JSON.stringify(stats),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('AI error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
