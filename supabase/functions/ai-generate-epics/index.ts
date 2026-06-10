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
const MAX_EPICS = 10
const MAX_GENERATIONS = 2
const COVERAGE_TARGET = 0.80

// ─────────────────────────────────────────────────────────────────────
// Epic Grammar — structural rules that decide epic count.
// Epics are LARGER than stories — fewer per BR.
// ─────────────────────────────────────────────────────────────────────
const EPIC_GRAMMAR_PROMPT = `
## EPIC GRAMMAR RULES (mandatory — count is a function of structure)

E1: Each MAJOR capability or product area → 1 epic (e.g. "Onboarding", "Payment", "Reporting")
E2: Each user-facing module with multiple use cases → 1 epic
E3: Each back-office / admin sub-system → 1 epic
E4: Each integration target (external system / API consumer) → 1 epic
E5: Each migration/deprecation effort with cutover → 1 epic
E6: Cross-cutting concerns (auth, audit, RBAC) → fold into nearest functional epic if scope < 5 stories; else own epic
E7: Non-functional requirements → EXCLUDED unless they require dedicated capability work

Epics are PARENTS of stories. One epic = one delivery theme with 3-15 stories underneath.
Do NOT split a single capability into multiple epics.
Do NOT exceed ${MAX_EPICS} epics total.
Target ≥${Math.round(COVERAGE_TARGET * 100)}% coverage of all documented capabilities.
`

function buildExtractionPrompt(
  brTitle: string,
  descriptionText: string,
): string {
  const descSection = descriptionText
    ? `### Business Request Description\n${descriptionText}`
    : ''

  return `You are a senior product strategist at an enterprise portfolio management platform.
You must analyze the following business request and decompose it into epics.

## Business Request: ${brTitle}

${descSection}

${EPIC_GRAMMAR_PROMPT}

## INSTRUCTIONS

1. Read the business request thoroughly, regardless of language (Arabic, English, or mixed).
2. Identify capability units and assign Coverage Unit IDs (CUIDs):
   - CAP{nnn} for major capabilities
   - MOD{nnn} for user-facing modules
   - ADM{nnn} for admin/back-office
   - INT{nnn} for integrations
   - MIG{nnn} for migrations
3. Apply the Epic Grammar rules above to determine epics.
4. For each epic produce:
   - title: specific capability name (not generic like "Backend Work")
   - summary: 2-3 sentence epic summary (the "what" and "why")
   - acceptanceCriteria: array of epic-level success criteria
   - brdRef: which BR section this comes from
   - covers: array of CUID strings this epic covers
5. Each epic must be independently deliverable.
6. No two epics may have overlapping scope.

## OUTPUT FORMAT

Return ONLY valid JSON (no markdown fences):
{
  "requirementUnits": [
    { "cuid": "CAP001", "type": "capability", "text": "brief description" }
  ],
  "epics": [
    {
      "title": "specific capability name",
      "summary": "2-3 sentence epic summary",
      "acceptanceCriteria": ["Criterion 1", "Criterion 2"],
      "brdRef": "BR section reference",
      "covers": ["CAP001", "MOD001"]
    }
  ],
  "coveragePercent": 85,
  "totalRequirements": 12,
  "coveredRequirements": 10
}`
}

async function computeContentHash(parts: string[]): Promise<string> {
  const combined = parts.sort().join('|')
  const encoded = new TextEncoder().encode(combined)
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
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

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const body = await req.json()
    const {
      br_id,
      br_title = '',
      description_text = '',
      attachment_ids = [],
      selected_sources = [],
    } = body as {
      br_id: string
      br_title?: string
      description_text?: string
      attachment_ids?: string[]
      selected_sources?: string[]
    }

    if (!br_id) {
      return new Response(
        JSON.stringify({ error: 'br_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── Existing epic cap ─────────────────────────────────────────
    const { count: existingCount } = await supabase
      .from('ph_issues')
      .select('id', { count: 'exact', head: true })
      .eq('parent_key', br_id)
      .eq('issue_type', 'Epic')

    if ((existingCount ?? 0) >= MAX_EPICS) {
      return new Response(
        JSON.stringify({
          error: `Maximum ${MAX_EPICS} epics already exist for this business request.`,
          existingCount,
          disabled: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const remainingSlots = MAX_EPICS - (existingCount ?? 0)

    const useDescription = selected_sources.includes('description')
    const hasDescription = !!description_text?.trim()

    if (!hasDescription) {
      return new Response(
        JSON.stringify({
          error: 'Not enough details to generate epics. Add a description to this business request.',
          noContent: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── Content hash for idempotency ──────────────────────────────
    const hashParts: string[] = []
    if (useDescription && hasDescription) hashParts.push(description_text)
    if (attachment_ids.length > 0) hashParts.push(...attachment_ids.sort())
    const contentHash = await computeContentHash(hashParts)

    // ── Generation count limit ────────────────────────────────────
    const { data: cacheRow } = await supabase
      .from('epic_generation_cache')
      .select('*')
      .eq('br_id', br_id)
      .maybeSingle()

    const generationCount = cacheRow?.generation_count ?? 0

    if (generationCount >= MAX_GENERATIONS && (!cacheRow || cacheRow.content_hash !== contentHash)) {
      return new Response(
        JSON.stringify({
          error: `Maximum ${MAX_GENERATIONS} epic generations reached for this business request.`,
          maxGenerationsReached: true,
          generationCount,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── Cache hit ─────────────────────────────────────────────────
    if (cacheRow?.content_hash === contentHash && cacheRow?.proposed_epics) {
      console.log(`Cache hit for BR ${br_id} (hash ${contentHash.slice(0, 8)})`)
      return new Response(
        JSON.stringify({
          epics: cacheRow.proposed_epics,
          requirementUnits: cacheRow.requirement_units ?? [],
          fromCache: true,
          contentHash,
          existingCount: existingCount ?? 0,
          remainingSlots,
          generationCount,
          maxGenerations: MAX_GENERATIONS,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── Build prompt + Gemini call ────────────────────────────────
    const descForPrompt = useDescription ? description_text : ''
    const prompt = buildExtractionPrompt(br_title, descForPrompt)

    const aiResp = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are a senior product strategist. Return only valid JSON. No markdown fences. Read all content including Arabic.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0,
        max_tokens: 8192,
        response_format: { type: 'json_object' },
      }),
    })

    if (!aiResp.ok) {
      const errText = await aiResp.text()
      console.error(`Gemini error: ${aiResp.status} ${errText}`)
      return new Response(
        JSON.stringify({ error: `AI service error: ${aiResp.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const aiData = await aiResp.json()
    const rawContent = aiData?.choices?.[0]?.message?.content ?? '{}'
    let parsed: {
      epics?: any[]
      requirementUnits?: any[]
      coveragePercent?: number
      totalRequirements?: number
      coveredRequirements?: number
    }

    try {
      parsed = JSON.parse(rawContent)
    } catch {
      console.error('Failed to parse AI response:', rawContent.slice(0, 500))
      return new Response(
        JSON.stringify({ error: 'AI returned invalid JSON' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    let epics = parsed.epics ?? []
    if (epics.length > remainingSlots) {
      epics = epics.slice(0, remainingSlots)
    }

    // ── Dedup against existing epics ──────────────────────────────
    const { data: existingChildren } = await supabase
      .from('ph_issues')
      .select('summary')
      .eq('parent_key', br_id)
      .eq('issue_type', 'Epic')

    const existingSummaries = (existingChildren ?? []).map((c: any) =>
      (c.summary ?? '').toLowerCase().trim(),
    )

    epics = epics.filter((e: any) => {
      const title = (e.title ?? '').toLowerCase().trim()
      return !existingSummaries.some((existing: string) => {
        if (existing === title) return true
        const aWords = new Set(existing.split(/\s+/))
        const bWords = new Set(title.split(/\s+/))
        const intersection = [...aWords].filter((w) => bWords.has(w)).length
        const union = new Set([...aWords, ...bWords]).size
        return union > 0 && intersection / union > 0.85
      })
    })

    // ── Upsert cache ──────────────────────────────────────────────
    await supabase.from('epic_generation_cache').upsert(
      {
        br_id,
        content_hash: contentHash,
        selected_sources,
        requirement_units: parsed.requirementUnits ?? [],
        proposed_epics: epics,
        generation_count: generationCount + 1,
        generated_at: new Date().toISOString(),
      },
      { onConflict: 'br_id' },
    )

    return new Response(
      JSON.stringify({
        epics,
        requirementUnits: parsed.requirementUnits ?? [],
        coveragePercent: parsed.coveragePercent ?? 0,
        totalRequirements: parsed.totalRequirements ?? 0,
        coveredRequirements: parsed.coveredRequirements ?? 0,
        contentHash,
        existingCount: existingCount ?? 0,
        remainingSlots: remainingSlots - epics.length,
        fromCache: false,
        generationCount: generationCount + 1,
        maxGenerations: MAX_GENERATIONS,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('ai-generate-epics error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
