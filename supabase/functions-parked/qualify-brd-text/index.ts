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
    const auth = await requireAuth(req);
    if (auth.error) return auth.error;

    const { text } = await req.json();

    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ qualified: false, reasons: ['No text provided.'] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (text.trim().length < 100) {
      return new Response(JSON.stringify({
        qualified: false,
        reasons: ['Text is too short (minimum 100 characters).', 'Paste requirements, briefs, or scope documents with enough detail for BRD generation.'],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await callLovableAI({
      systemPrompt: `You are a requirements qualification engine. Analyze the provided text and determine if it contains enough structured information to generate a Business Requirements Document (BRD).

Evaluate on these criteria:
1. Contains identifiable requirements or "the system shall" statements
2. Mentions stakeholders, users, or roles
3. Describes a system, process, or business domain
4. Has enough detail (not just a single sentence or vague idea)

Return valid JSON only:
{
  "qualified": boolean,
  "score": number (0-100),
  "language": "en" | "ar" | "mixed",
  "reasons": string[] (2-4 bullet points explaining the decision),
  "domain_detected": string (e.g. "Industrial Licensing", "HR Management"),
  "requirement_count_estimate": number
}`,
      userPrompt: text,
      jsonMode: true,
    });

    const parsed = JSON.parse(result);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('qualify-brd-text error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
