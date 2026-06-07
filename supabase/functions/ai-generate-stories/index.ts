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
const MAX_STORIES = 25
const COVERAGE_TARGET = 0.80

// ─────────────────────────────────────────────────────────────────────
// Story Grammar — structural rules that decide story count.
// The model writes prose; STRUCTURE decides count.
// ─────────────────────────────────────────────────────────────────────
const STORY_GRAMMAR_PROMPT = `
## STORY GRAMMAR RULES (mandatory — count is a function of structure)

R1: Each use-case MAIN path → 1 story
R2: Each form (FM) → 1 "fields & validation" story (error + field-level business rules fold into acceptance criteria)
R3: Each ALT that is a distinct user action → 1 story; trivial ALT folds into parent
R4: Each back-office/reviewer action with a distinct outcome → 1 story
R5: Each multi-channel notification (MSG fan-out) → 1 story
R6: Each state machine (STATES) → 1 story
R7: Leftover business rules (BC) → fold as acceptance criteria on nearest functional story (NO own story)
R8: RBAC-MATRIX → 1 story (if applicable)
R9: Non-functional requirements → EXCLUDED

These rules are MANDATORY. The story count must be deterministic from the document structure.
Do NOT invent stories beyond what the rules produce.
Do NOT exceed ${MAX_STORIES} stories total.
Target ≥${Math.round(COVERAGE_TARGET * 100)}% coverage of all documented requirements.
`

function buildExtractionPrompt(
  epicSummary: string,
  descriptionText: string,
  pdfTexts: { fileName: string; text: string }[],
): string {
  const docSections = pdfTexts
    .map((p) => `### Document: ${p.fileName}\n${p.text}`)
    .join('\n\n')

  const descSection = descriptionText
    ? `### Epic Description\n${descriptionText}`
    : ''

  return `You are a senior business analyst at an enterprise portfolio management platform.
You must analyze the following epic documentation and generate user stories.

## Epic: ${epicSummary}

${descSection}

${docSections}

${STORY_GRAMMAR_PROMPT}

## INSTRUCTIONS

1. Read ALL documentation thoroughly, regardless of language (Arabic, English, or mixed).
2. Extract requirement units and assign structural Coverage Unit IDs (CUIDs):
   - UC{nnn}-MAIN for main use-case paths
   - UC{nnn}-FM{nnn} for forms
   - UC{nnn}-ALT{nnn} for alternative flows
   - UC{nnn}-ERR{nnn} for error handling
   - UC{nnn}-BC{nnn} for business rules
   - UC{nnn}-MSG for notifications
   - UC{nnn}-STATES for state machines
   - RBAC-MATRIX for access control
3. Apply the Story Grammar rules above to determine stories.
4. For each story produce:
   - title: specific, contextual (not generic like "User Login")
   - userStory: "As a [specific role], I want [specific action], so that [specific benefit]"
   - acceptanceCriteria: array of Given/When/Then strings
   - brdRef: which document section/page this comes from
   - covers: array of CUID strings this story covers
5. Each story must be independently implementable.
6. No two stories may have overlapping scope or duplicate details.
7. Business rules (R7) fold into acceptance criteria on the nearest story — they do NOT get their own story.

## OUTPUT FORMAT

Return ONLY valid JSON (no markdown fences):
{
  "requirementUnits": [
    { "cuid": "UC001-MAIN", "type": "main", "text": "brief description" }
  ],
  "stories": [
    {
      "title": "specific contextual title",
      "userStory": "As a ..., I want ..., so that ...",
      "acceptanceCriteria": ["Given ... When ... Then ..."],
      "brdRef": "Document: filename.pdf, Section: X",
      "covers": ["UC001-MAIN", "UC001-BC001"]
    }
  ],
  "coveragePercent": 85,
  "totalRequirements": 30,
  "coveredRequirements": 25
}`
}

// ─────────────────────────────────────────────────────────────────────
// PDF text extraction via Gemini (Gemini handles PDF bytes natively)
// ─────────────────────────────────────────────────────────────────────
async function extractPdfText(
  pdfBase64: string,
  fileName: string,
  geminiKey: string,
): Promise<string> {
  // Use Gemini's native PDF understanding via the generative API
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: pdfBase64,
                },
              },
              {
                text: `Extract ALL text content from this PDF document. Preserve the structure (headings, lists, tables). If the document contains Arabic text, transcribe it exactly as-is. Output the full text content with section markers.`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 8192,
        },
      }),
    },
  )

  if (!resp.ok) {
    console.error(`PDF extraction failed for ${fileName}: ${resp.status}`)
    return `[PDF extraction failed for ${fileName}]`
  }

  const data = await resp.json()
  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    `[No text extracted from ${fileName}]`
  )
}

// ─────────────────────────────────────────────────────────────────────
// Fetch attachment bytes via jira-attachment-proxy
// ─────────────────────────────────────────────────────────────────────
async function fetchAttachmentBase64(
  attachmentId: string,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<string | null> {
  try {
    const resp = await fetch(
      `${supabaseUrl}/functions/v1/jira-attachment-proxy?id=${attachmentId}`,
      {
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
      },
    )
    if (!resp.ok) return null
    const buf = await resp.arrayBuffer()
    // Convert to base64
    const bytes = new Uint8Array(buf)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  } catch (e) {
    console.error(`Failed to fetch attachment ${attachmentId}:`, e)
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────
// Content hash — SHA-256 of all source content for idempotency
// ─────────────────────────────────────────────────────────────────────
async function computeContentHash(parts: string[]): Promise<string> {
  const combined = parts.sort().join('|')
  const encoded = new TextEncoder().encode(combined)
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

// ─────────────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────────────
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
      epic_key,
      epic_summary = '',
      description_text = '',
      attachment_ids = [],
      selected_sources = [],
    } = body as {
      epic_key: string
      epic_summary?: string
      description_text?: string
      attachment_ids?: string[]
      selected_sources?: string[]
    }

    if (!epic_key) {
      return new Response(
        JSON.stringify({ error: 'epic_key is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── Check existing child count (hard cap) ──────────────────────
    const { count: existingCount } = await supabase
      .from('ph_issues')
      .select('id', { count: 'exact', head: true })
      .eq('parent_key', epic_key)
      .eq('issue_type', 'Story')

    if ((existingCount ?? 0) >= MAX_STORIES) {
      return new Response(
        JSON.stringify({
          error: `Maximum ${MAX_STORIES} stories already exist for this epic.`,
          existingCount,
          disabled: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const remainingSlots = MAX_STORIES - (existingCount ?? 0)

    // ── Validate sources ──────────────────────────────────────────
    const useDescription = selected_sources.includes('description')
    const useAttachments = selected_sources.includes('attachments')

    const hasDescription = !!description_text?.trim()
    const hasAttachments = attachment_ids.length > 0

    if (!hasDescription && !hasAttachments) {
      return new Response(
        JSON.stringify({
          error: 'Not enough details to generate stories. Add a description or attach documentation to this epic.',
          noContent: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── Build content hash for idempotency ────────────────────────
    const hashParts: string[] = []
    if (useDescription && hasDescription) hashParts.push(description_text)
    if (useAttachments) hashParts.push(...attachment_ids.sort())
    const contentHash = await computeContentHash(hashParts)

    // ── Generation count limit (max 2 per epic) ─────
    const { data: cacheRow } = await supabase
      .from('story_generation_cache')
      .select('*')
      .eq('epic_key', epic_key)
      .single()

    const generationCount = cacheRow?.generation_count ?? 0

    if (generationCount >= 2 && (!cacheRow || cacheRow.content_hash !== contentHash)) {
      return new Response(
        JSON.stringify({
          error: 'Maximum 2 story generations reached for this epic.',
          maxGenerationsReached: true,
          generationCount,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── Cache check (same content → return cached) ───
    if (cacheRow?.content_hash === contentHash && cacheRow?.proposed_stories) {
      console.log(`Cache hit for ${epic_key} (hash ${contentHash.slice(0, 8)})`)
      return new Response(
        JSON.stringify({
          stories: cacheRow.proposed_stories,
          requirementUnits: cacheRow.requirement_units ?? [],
          fromCache: true,
          contentHash,
          existingCount: existingCount ?? 0,
          remainingSlots,
          generationCount,
          maxGenerations: 2,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── Extract PDF text ──────────────────────────────────────────
    const pdfTexts: { fileName: string; text: string }[] = []
    if (useAttachments && hasAttachments) {
      // Fetch attachment metadata
      const { data: attachments } = await supabase
        .from('ph_attachments')
        .select('id, jira_attachment_id, file_name, mime_type')
        .in('id', attachment_ids)

      for (const att of attachments ?? []) {
        if (!att.mime_type?.includes('pdf')) continue
        const jiraId = att.jira_attachment_id ?? att.id
        const base64 = await fetchAttachmentBase64(
          jiraId,
          SUPABASE_URL,
          SERVICE_ROLE_KEY,
        )
        if (base64) {
          const text = await extractPdfText(base64, att.file_name, GEMINI_API_KEY)
          pdfTexts.push({ fileName: att.file_name, text })
        }
      }
    }

    // ── Build prompt and call Gemini ──────────────────────────────
    const descForPrompt = useDescription ? description_text : ''
    const prompt = buildExtractionPrompt(epic_summary, descForPrompt, pdfTexts)

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
              'You are a senior business analyst. Return only valid JSON. No markdown fences. Read all content including Arabic.',
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
      stories?: any[]
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

    // ── Enforce hard cap ──────────────────────────────────────────
    let stories = parsed.stories ?? []
    if (stories.length > remainingSlots) {
      stories = stories.slice(0, remainingSlots)
    }

    // ── Dedup against existing children ───────────────────────────
    const { data: existingChildren } = await supabase
      .from('ph_issues')
      .select('summary')
      .eq('parent_key', epic_key)

    const existingSummaries = (existingChildren ?? []).map((c: any) =>
      (c.summary ?? '').toLowerCase().trim(),
    )

    stories = stories.filter((s: any) => {
      const title = (s.title ?? '').toLowerCase().trim()
      // Reject if any existing child has ≥85% similarity (simple check)
      return !existingSummaries.some((existing: string) => {
        if (existing === title) return true
        // Simple word-overlap similarity
        const aWords = new Set(existing.split(/\s+/))
        const bWords = new Set(title.split(/\s+/))
        const intersection = [...aWords].filter((w) => bWords.has(w)).length
        const union = new Set([...aWords, ...bWords]).size
        return union > 0 && intersection / union > 0.85
      })
    })

    // ── Cache the result ──────────────────────────────────────────
    await supabase.from('story_generation_cache').upsert(
      {
        epic_key,
        content_hash: contentHash,
        selected_sources,
        requirement_units: parsed.requirementUnits ?? [],
        proposed_stories: stories,
        generation_count: generationCount + 1,
        generated_at: new Date().toISOString(),
      },
      { onConflict: 'epic_key' },
    )

    return new Response(
      JSON.stringify({
        stories,
        requirementUnits: parsed.requirementUnits ?? [],
        coveragePercent: parsed.coveragePercent ?? 0,
        totalRequirements: parsed.totalRequirements ?? 0,
        coveredRequirements: parsed.coveredRequirements ?? 0,
        contentHash,
        existingCount: existingCount ?? 0,
        remainingSlots: remainingSlots - stories.length,
        fromCache: false,
        generationCount: generationCount + 1,
        maxGenerations: 2,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('ai-generate-stories error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
