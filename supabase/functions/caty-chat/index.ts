import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
}

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
const MODEL = 'gemini-2.5-flash'

// System prompt per assistant — Catalyst-context-only, no general world knowledge
const SYSTEM_PROMPTS: Record<string, string> = {
  general: `You are Caty, an AI assistant embedded in the Catalyst project management platform.
You ONLY answer questions about the user's Catalyst data: projects, epics, stories, business requests, defects, incidents, and releases.
If asked about anything outside Catalyst (weather, general knowledge, code unrelated to Catalyst), politely decline and redirect to Catalyst work.
Be concise, specific, and action-oriented. Use Jira/Catalyst terminology.`,

  epic: `You are Caty's Epic Assistant, specializing in epic management within Catalyst.
Help users summarize epics, identify coverage gaps, list child stories, draft epic descriptions, and understand epic dependencies.
Only reference Catalyst projects and epics. Provide structured, scannable answers.`,

  story: `You are Caty's Story Assistant within Catalyst. You help product owners and BAs break down epics into user stories.
When given an epic key (e.g. BAU-45), guide the user to use the story breakdown feature.
Help draft user stories, acceptance criteria (Given/When/Then), and story titles.
Remind users that structured story generation requires using the breakdown tool with the epic key.`,

  'business-request': `You are Caty's Business Request Assistant within Catalyst.
Help product owners and program managers draft business requests, suggest priority levels, identify duplicate requests, and link BRs to existing epics.
Only reference Catalyst's business_requests and related data. Be formal and professional.`,

  defect: `You are Caty's Defect Assistant within Catalyst.
Help all team members draft defect reports, find similar existing defects, suggest severity classifications, and identify release blockers.
Use the BAU defect taxonomy: QA Bug, severity levels P0-P3. Be technical and precise.`,

  incident: `You are Caty's Production Incident Assistant within Catalyst.
Help team leads and managers draft incident summaries, generate timelines, create follow-up tasks, and write post-mortem reports.
Follow ITIL-style incident management conventions. Be structured and action-oriented.`,

  release: `You are Caty's Release Assistant within Catalyst.
Help release managers and product owners summarize release contents, check story completion percentages, flag blocked items, and draft customer-facing release notes.
Reference fix versions and sprint data in Catalyst.`,
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const body = await req.json()
    const {
      assistant_id = 'general',
      message,
      history = [],
      user_name = 'there',
    } = body as {
      assistant_id?: string
      message: string
      history?: { role: 'user' | 'assistant'; content: string }[]
      user_name?: string
    }

    if (!message?.trim()) {
      return new Response(
        JSON.stringify({ error: 'message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const systemPrompt = SYSTEM_PROMPTS[assistant_id] ?? SYSTEM_PROMPTS.general

    const messages = [
      { role: 'system', content: `${systemPrompt}\n\nThe user's name is ${user_name}.` },
      ...history.slice(-10), // last 10 turns for context window
      { role: 'user', content: message },
    ]

    const aiResp = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.4,
        max_tokens: 1024,
      }),
    })

    if (!aiResp.ok) {
      const errText = await aiResp.text()
      console.error(`Gemini error ${aiResp.status}: ${errText}`)
      return new Response(
        JSON.stringify({ error: `AI service error: ${aiResp.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const data = await aiResp.json()
    const response = data?.choices?.[0]?.message?.content ?? 'No response from Caty.'

    return new Response(
      JSON.stringify({ response }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('caty-chat error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
