// ai-generate-workflow — CAT-WORKFLOW-STUDIO-20260702-001 P4
//
// Generates a workflow definition (statuses + transitions) from a natural-
// language prompt, shaped exactly like ph_wf_version_statuses /
// ph_wf_version_transitions rows so ph_wf_import_generated() can materialise
// it as a DRAFT. The AI never publishes — an admin reviews the draft in the
// Workflow Studio editor and publishes explicitly.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
}

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
const MODEL = 'gemini-2.5-flash'
const MAX_STATUSES = 25

const WORKFLOW_GRAMMAR = `
## WORKFLOW GRAMMAR RULES (mandatory)

W1: Output strict JSON: {"name": string, "statuses": [...], "transitions": [...]}
W2: Each status: {"status_key": snake_case, "display_label": Title Case,
    "category": "todo"|"in_progress"|"done",
    "is_initial": bool, "is_terminal": bool, "supports_reopen": bool,
    "requires_reason": bool, "sort_order": int}
W3: EXACTLY ONE status has is_initial=true; it must have category "todo".
W4: At least one status has is_terminal=true with category "done".
W5: Each transition: {"from_status_key": string|null, "to_status_key": string,
    "transition_type": "forward"|"backward"|"exception"|"reopen"|"cancel"|"reject"|"defer"|"rollback",
    "requires_reason": bool}
    from_status_key null means "from any status" — use sparingly (cancel paths).
W6: Every transition endpoint must exist in statuses. No self-loops.
W7: Every status must be reachable from the initial status via transitions.
W8: Backward/reject/reopen transitions set requires_reason=true.
W9: Max ${MAX_STATUSES} statuses. Prefer the smallest workflow that satisfies
    the prompt — do not invent stages the prompt does not imply.
W10: status_key values are stable slugs: lowercase, [a-z0-9_] only.
W11: Every transition's from_status_key/to_status_key must EXACTLY equal a
     status_key defined in "statuses" (same spelling, same case).

## EXAMPLE (shape only — do not copy content)
{"name":"Simple flow",
 "statuses":[
  {"status_key":"open","display_label":"Open","category":"todo","is_initial":true,"is_terminal":false,"supports_reopen":false,"requires_reason":false,"sort_order":10},
  {"status_key":"in_progress","display_label":"In Progress","category":"in_progress","is_initial":false,"is_terminal":false,"supports_reopen":false,"requires_reason":false,"sort_order":20},
  {"status_key":"done","display_label":"Done","category":"done","is_initial":false,"is_terminal":true,"supports_reopen":true,"requires_reason":false,"sort_order":30}],
 "transitions":[
  {"from_status_key":"open","to_status_key":"in_progress","transition_type":"forward","requires_reason":false},
  {"from_status_key":"in_progress","to_status_key":"done","transition_type":"forward","requires_reason":false},
  {"from_status_key":"done","to_status_key":"in_progress","transition_type":"reopen","requires_reason":true}]}
`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { entity_key, prompt, base } = await req.json()
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 8) {
      return new Response(JSON.stringify({ error: 'prompt required (min 8 chars)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Content-hash cache (same prompt + entity + base -> same result).
    const cacheKeyInput = [MODEL, entity_key ?? '', prompt.trim(), JSON.stringify(base ?? null)].join('|')
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(cacheKeyInput))
    const promptHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    const { data: cached } = await supabase
      .from('workflow_generation_cache')
      .select('id, response')
      .eq('prompt_hash', promptHash)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()
    if (cached) {
      return new Response(
        JSON.stringify({ cache_id: cached.id, workflow: cached.response, cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const baseSection = base
      ? `\n### Current workflow (evolve it; keep status_key values stable where stages survive)\n${JSON.stringify(base)}\n`
      : ''

    const aiResp = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        max_tokens: 8192,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You design status workflows for a work management tool. Output ONLY valid JSON per the grammar.' +
              WORKFLOW_GRAMMAR,
          },
          {
            role: 'user',
            content: `Entity type: ${entity_key ?? 'work item'}\n${baseSection}\n### Request\n${prompt}`,
          },
        ],
      }),
    })

    if (!aiResp.ok) {
      const detail = await aiResp.text()
      return new Response(JSON.stringify({ error: `model call failed: ${aiResp.status}`, detail: detail.slice(0, 500) }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const aiData = await aiResp.json()
    let workflow: {
      name?: string
      statuses?: Array<Record<string, unknown>>
      transitions?: Array<Record<string, unknown>>
    }
    try {
      workflow = JSON.parse(aiData?.choices?.[0]?.message?.content ?? '{}')
    } catch {
      return new Response(JSON.stringify({ error: 'model returned invalid JSON' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Structural validation mirroring ph_wf_validate_draft.
    const statuses = Array.isArray(workflow.statuses) ? workflow.statuses : []
    const transitions = Array.isArray(workflow.transitions) ? workflow.transitions : []
    const keys = new Set(statuses.map((s) => String(s.status_key ?? '')))
    const issues: string[] = []
    if (statuses.length === 0 || statuses.length > MAX_STATUSES) issues.push(`status count ${statuses.length}`)
    if (statuses.filter((s) => s.is_initial === true).length !== 1) issues.push('exactly one initial required')
    if (!statuses.some((s) => s.is_terminal === true)) issues.push('terminal status required')
    for (const t of transitions) {
      const from = t.from_status_key
      const to = String(t.to_status_key ?? '')
      if (!keys.has(to)) issues.push(`dangling to:${to}`)
      if (from !== null && from !== undefined && !keys.has(String(from))) issues.push(`dangling from:${from}`)
      if (from === to) issues.push(`self-loop:${to}`)
    }
    if (issues.length > 0) {
      return new Response(JSON.stringify({ error: 'generated workflow failed validation', issues }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: cacheRow, error: cacheErr } = await supabase
      .from('workflow_generation_cache')
      .insert({
        prompt_hash: promptHash,
        entity_key: entity_key ?? null,
        model: MODEL,
        request: { entity_key, prompt, base: base ?? null },
        response: workflow,
      })
      .select('id')
      .single()
    if (cacheErr) throw cacheErr

    return new Response(
      JSON.stringify({ cache_id: cacheRow.id, workflow, cached: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
