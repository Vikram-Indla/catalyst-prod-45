// deno-lint-ignore-file no-explicit-any
/**
 * jira-title-case-pass — Edge Function
 *
 * Purpose
 * -------
 * One-shot (or idempotently re-runnable) sweep that populates
 * `ph_issues.summary_display` with a cleanly Title-Cased version of
 * `summary` for tickets that arrived in SHOUTING ALL-CAPS or all-lower
 * from Jira. Catalyst's UI is designed to read
 * `COALESCE(summary_display, summary)` — NULL `summary_display` means
 * "no normalization applied; show raw Jira title".
 *
 * Never overwrites `summary` itself. A subsequent `wh-jira-sync` run
 * re-reads Jira's verbatim title into `summary` without touching
 * `summary_display`, so this pass survives future syncs.
 *
 * Modes
 * -----
 *   mode: 'dry-run' (default) — scan + report candidates, no writes.
 *   mode: 'apply'             — write `summary_display` for candidates.
 *
 * Request body (all optional)
 * ---------------------------
 *   {
 *     mode?:       'dry-run' | 'apply'        // default 'dry-run'
 *     limit?:      number                     // default 500, max 5000
 *     offset?:     number                     // default 0
 *     projectKey?: string                     // filter by ph_issues.project_key
 *     force?:      boolean                    // re-normalize even when summary_display already set
 *     sampleSize?: number                     // how many sample changes to echo (default 20, max 200)
 *   }
 *
 * Response
 * --------
 *   {
 *     mode, scanned, candidates, applied, skipped,
 *     sample_changes: [{ issue_key, before, after, reason }],
 *     skip_breakdown: { already_normalized, mixed_case, arabic, too_short, all_acronym, already_title_case },
 *     elapsed_ms
 *   }
 *
 * Auth
 * ----
 * Default verify_jwt=true. Call with SUPABASE_SERVICE_ROLE_KEY as Bearer
 * (mirrors jira-avatar-sync pattern).
 *
 * Algorithm (short version)
 * -------------------------
 * For each summary:
 *   1. Skip if length < 3 or primarily non-Latin (Arabic etc.)
 *   2. Skip if already mixed-case (has both upper + lower) UNLESS string
 *      is ≥80% uppercase (heuristic for "MOSTLY SHOUTING with [proper]
 *      noun mix") — still normalized.
 *   3. Skip if all tokens look like acronyms (e.g., "API SLA UX").
 *   4. Otherwise: token-wise title case, with preservation rules:
 *        * Issue keys (`[A-Z]+-\d+`)       — left untouched
 *        * Bracket/paren contents          — recursed independently
 *        * Pure-digit tokens               — left untouched
 *        * Known acronym whitelist         — left UPPER
 *        * First letter of each word       — UPPER
 *        * Small-words (a, an, the, of, …) — lowered unless first/last
 *        * Everything else (incl. numbers + suffix like `v2`, `10x`)
 *          retained in its original casing shape
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── Shared CORS (matches every other function in supabase/functions/*) ──
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

/* ── Acronyms that stay ALL CAPS ───────────────────────────────────────
   Kept conservative — add domain abbreviations as they appear. The
   pass treats "unknown acronym ≥3 chars, all upper" heuristically via
   the mostly-uppercase branch anyway, so this list is only the final
   word-level whitelist. */
const ACRONYMS = new Set<string>([
  // Generic tech
  'API', 'APIS', 'URL', 'URI', 'URN', 'HTTP', 'HTTPS', 'HTML', 'CSS', 'JSON',
  'XML', 'YAML', 'CSV', 'PDF', 'PNG', 'JPG', 'JPEG', 'GIF', 'SVG',
  'SQL', 'DB', 'ID', 'UID', 'UUID', 'IP', 'DNS', 'SSH', 'SSL', 'TLS',
  'JWT', 'SDK', 'CLI', 'GUI', 'UI', 'UX', 'OS', 'VM', 'CI', 'CD',
  'AI', 'ML', 'LLM', 'NLP', 'RAG', 'GPT',
  // Product / delivery
  'BRD', 'PRD', 'FRD', 'SRS', 'MVP', 'POC', 'KPI', 'OKR', 'SLA', 'NDA',
  'QA', 'UAT', 'SIT', 'SRE', 'DR', 'CR', 'PR', 'MR',
  // Business / gov
  // NOTE: "IT" intentionally omitted — collides with the English pronoun
  // "it" far more often than the "Information Technology" abbreviation
  // appears in Jira summaries. If you later need IT-department tickets
  // normalized, add a project-specific override rather than re-adding
  // here.
  'CEO', 'CFO', 'CTO', 'CIO', 'COO', 'VP', 'PM', 'HR', 'PR',
  'MOIM', 'MOI', 'FZCO', 'LLC', 'PLC', 'LTD', 'INC',
  // Money / time
  'USD', 'SAR', 'AED', 'EUR', 'GBP', 'UTC', 'GMT', 'AM', 'PM',
  // Acronyms with internal punctuation that survive tokenization intact
  'USA', 'UAE', 'UK', 'EU',
])

/* Small-words that stay lowercase unless at position 0 or last. */
const SMALL_WORDS = new Set<string>([
  'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'if', 'in', 'of',
  'on', 'or', 'the', 'to', 'v', 'vs', 'via', 'with',
])

/* Issue-key regex: e.g. "BAU-123", "CAT-5047". Case-insensitive to
   catch any that arrived lowercased; normalized upper in output. */
const ISSUE_KEY_RE = /^([A-Za-z]+)-(\d+)$/

/* Pure-digit OR digit-with-suffix like "v2", "10x", "1st". */
const DIGIT_TOKEN_RE = /^\d[\d./-]*[a-zA-Z]*$|^[a-zA-Z]?\d[\d./-]*$/

/* Arabic-first detection: if ≥50% of letters are in the Arabic
   Unicode block, skip. Catalyst is English-primary; Arabic summaries
   arrive from RTL writers and shouldn't be touched by the English
   title-case pass. */
function isPrimarilyArabic(s: string): boolean {
  const letters = s.match(/\p{L}/gu) ?? []
  if (letters.length === 0) return false
  let arabic = 0
  for (const ch of letters) {
    const code = ch.codePointAt(0)!
    if ((code >= 0x0600 && code <= 0x06FF) || (code >= 0x0750 && code <= 0x077F)) arabic++
  }
  return arabic / letters.length >= 0.5
}

/* Does the string have both upper and lower Latin letters? */
function isMixedCase(s: string): boolean {
  let hasUpper = false
  let hasLower = false
  for (const ch of s) {
    if (/[A-Z]/.test(ch)) hasUpper = true
    else if (/[a-z]/.test(ch)) hasLower = true
    if (hasUpper && hasLower) return true
  }
  return false
}

/* Fraction of Latin letters that are uppercase (0..1). */
function uppercaseRatio(s: string): number {
  const letters = s.match(/[A-Za-z]/g) ?? []
  if (letters.length === 0) return 0
  let upper = 0
  for (const ch of letters) if (/[A-Z]/.test(ch)) upper++
  return upper / letters.length
}

/* Title-case a single word, respecting acronyms + small-words. */
function titleCaseWord(
  word: string,
  opts: { isFirst: boolean; isLast: boolean; preserveMixedCase: boolean },
): string {
  // Issue keys — uppercase the prefix, keep number suffix.
  const mKey = word.match(ISSUE_KEY_RE)
  if (mKey) return `${mKey[1].toUpperCase()}-${mKey[2]}`

  // Pure-digit / versioning tokens — leave as-is (but normalize "V2" etc.)
  if (DIGIT_TOKEN_RE.test(word)) {
    return word
  }

  // Acronym whitelist check is case-insensitive — catches "api" in
  // all-lower input and rewrites to "API".
  const upper = word.toUpperCase()
  if (ACRONYMS.has(upper)) return upper

  // If the caller is preserving mixed-case within an already-formatted
  // string, don't touch words that mix cases internally (e.g. "iPhone").
  if (opts.preserveMixedCase && isMixedCase(word) && !/^[A-Z]/.test(word)) {
    return word
  }

  // Small words — lowercase unless at position 0 or last.
  const lower = word.toLowerCase()
  if (!opts.isFirst && !opts.isLast && SMALL_WORDS.has(lower)) {
    return lower
  }

  // Hyphenated word (e.g. "co-worker", "well-being") — title-case each part.
  if (word.includes('-') && !mKey) {
    return word
      .split('-')
      .map((part, idx, arr) => titleCaseWord(part, {
        isFirst: opts.isFirst && idx === 0,
        isLast: opts.isLast && idx === arr.length - 1,
        preserveMixedCase: opts.preserveMixedCase,
      }))
      .join('-')
  }

  // Slash-joined (e.g. "frontend/backend").
  if (word.includes('/')) {
    return word
      .split('/')
      .map((part) => titleCaseWord(part, { isFirst: true, isLast: true, preserveMixedCase: opts.preserveMixedCase }))
      .join('/')
  }

  if (!/[A-Za-z]/.test(word)) return word
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

/* Tokenize a string while preserving bracket groups and punctuation so
   we can title-case bracket-contents recursively. Returns a flat array
   of `{ token, kind }` where kind drives whether to transform. */
interface Segment { text: string; transform: boolean }

function tokenize(s: string): Segment[] {
  const out: Segment[] = []
  // Split keeping delimiters: spaces, brackets, parens, quotes, colons.
  const re = /(\s+|[\[\](){}"':;,.])/
  const parts = s.split(re)
  for (const p of parts) {
    if (p === undefined || p === '') continue
    if (/^\s+$/.test(p) || /^[\[\](){}"':;,.]$/.test(p)) {
      out.push({ text: p, transform: false })
    } else {
      out.push({ text: p, transform: true })
    }
  }
  return out
}

/* Main title-caser for an entire summary string. */
function titleCaseSummary(raw: string, opts: { preserveMixedCase: boolean }): string {
  const segs = tokenize(raw)
  // Collect indexes of transformable segments to know first/last positions.
  const transformIdx: number[] = []
  segs.forEach((s, i) => { if (s.transform) transformIdx.push(i) })
  if (transformIdx.length === 0) return raw

  const firstI = transformIdx[0]
  const lastI = transformIdx[transformIdx.length - 1]

  return segs
    .map((seg, i) => {
      if (!seg.transform) return seg.text
      return titleCaseWord(seg.text, {
        isFirst: i === firstI,
        isLast: i === lastI,
        preserveMixedCase: opts.preserveMixedCase,
      })
    })
    .join('')
}

/* ── Row-level decision: should we normalize this summary? ──────────── */
type SkipReason =
  | 'already_normalized'    // summary_display already set (and !force)
  | 'mixed_case'            // already has mixed casing — assume human-formatted
  | 'arabic'                // primarily non-Latin script
  | 'too_short'             // <3 chars of letters
  | 'all_acronym'           // all tokens are acronyms
  | 'already_title_case'    // normalization produces no change
  | 'empty'                 // null/empty summary

interface Decision {
  action: 'normalize' | 'skip'
  reason?: SkipReason
  normalized?: string
}

function decide(summary: string | null, summaryDisplay: string | null, force: boolean): Decision {
  if (!summary || summary.trim().length === 0) return { action: 'skip', reason: 'empty' }
  if (summaryDisplay && !force) return { action: 'skip', reason: 'already_normalized' }

  const letters = summary.match(/\p{L}/gu) ?? []
  // Skip very short summaries (<4 letters). A 3-letter all-caps input
  // like "FIX" is almost always a throwaway placeholder and normalizing
  // it to "Fix" adds noise without meaningfully improving readability.
  if (letters.length < 4) return { action: 'skip', reason: 'too_short' }
  if (isPrimarilyArabic(summary)) return { action: 'skip', reason: 'arabic' }

  const upperRatio = uppercaseRatio(summary)
  const mixed = isMixedCase(summary)

  // Heuristic: a summary that is already mixed-case AND not dominated by
  // uppercase is probably human-formatted — skip to avoid wrecking things
  // like "iPhone" / "macOS" or quoted brand names.
  if (mixed && upperRatio < 0.7) {
    // Still check: if it's all Title Case already, don't rewrite — but if
    // there are small-words that should be lowered ("Fix The Bug" → "Fix
    // the Bug"), we want the pass. Compute the normalized form and see if
    // it differs.
    const candidate = titleCaseSummary(summary, { preserveMixedCase: true })
    if (candidate === summary) return { action: 'skip', reason: 'already_title_case' }
    return { action: 'normalize', normalized: candidate }
  }

  // All-upper or mostly-upper OR all-lower paths — full normalize.
  const candidate = titleCaseSummary(summary, { preserveMixedCase: false })

  // Check all_acronym BEFORE the "candidate === summary" early-return.
  // "API SLA UX" round-trips to "API SLA UX" unchanged (each token is in
  // the acronym whitelist and stays ALL CAPS), which would otherwise
  // classify it as already_title_case. The clearer reason is that it's
  // a legitimate all-acronym title — surface that so dashboards can
  // distinguish "nothing to do" from "Jira summary is pure acronyms".
  const words = candidate.split(/\s+/).filter(Boolean)
  const acronymRatio = words.length > 0
    ? words.filter((w) => w === w.toUpperCase() && /[A-Z]/.test(w)).length / words.length
    : 0
  if (acronymRatio === 1 && words.length >= 2) {
    return { action: 'skip', reason: 'all_acronym' }
  }

  if (candidate === summary) return { action: 'skip', reason: 'already_title_case' }

  return { action: 'normalize', normalized: candidate }
}

/* ── Handler ──────────────────────────────────────────────────────── */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startedAt = Date.now()

  try {
    const body = await req.json().catch(() => ({} as any))
    const mode: 'dry-run' | 'apply' = body?.mode === 'apply' ? 'apply' : 'dry-run'
    const limit: number = Math.max(1, Math.min(5000, Number(body?.limit ?? 500)))
    const offset: number = Math.max(0, Number(body?.offset ?? 0))
    const projectKey: string | null = typeof body?.projectKey === 'string' ? body.projectKey : null
    const force: boolean = body?.force === true
    const sampleSize: number = Math.max(0, Math.min(200, Number(body?.sampleSize ?? 20)))

    // Fetch a window of ph_issues. Order by jira_created_at for
    // deterministic pagination across runs.
    let q = supabase
      .from('ph_issues')
      .select('issue_key, summary, summary_display, project_key')
      .order('jira_created_at', { ascending: true })
      .range(offset, offset + limit - 1)
    if (projectKey) q = q.eq('project_key', projectKey)
    const { data: rows, error: rowsErr } = await q
    if (rowsErr) {
      return new Response(
        JSON.stringify({ error: 'ph_issues query failed', details: rowsErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const samples: Array<{ issue_key: string; before: string; after: string; reason: string }> = []
    const skipBreakdown: Record<SkipReason, number> = {
      already_normalized: 0,
      mixed_case: 0,
      arabic: 0,
      too_short: 0,
      all_acronym: 0,
      already_title_case: 0,
      empty: 0,
    }

    const toApply: Array<{ issue_key: string; summary_display: string }> = []
    let scanned = 0
    let candidates = 0
    let skipped = 0

    for (const row of rows ?? []) {
      scanned++
      const decision = decide(row.summary ?? null, row.summary_display ?? null, force)
      if (decision.action === 'skip') {
        skipped++
        if (decision.reason) skipBreakdown[decision.reason]++
        continue
      }
      candidates++
      if (samples.length < sampleSize) {
        samples.push({
          issue_key: row.issue_key,
          before: row.summary!,
          after: decision.normalized!,
          reason: 'normalize',
        })
      }
      toApply.push({ issue_key: row.issue_key, summary_display: decision.normalized! })
    }

    let applied = 0
    let writeError: string | null = null

    if (mode === 'apply' && toApply.length > 0) {
      // Chunked UPDATE — we can't use a single upsert with 500+ rows
      // without writing over columns we don't own. Loop in batches of 100.
      const BATCH = 100
      for (let i = 0; i < toApply.length; i += BATCH) {
        const batch = toApply.slice(i, i + BATCH)
        // Per-row update — UPDATEs are safer than upserts here because
        // issue_key is a unique key but not the PK and an upsert would
        // require every NOT NULL column in the insert path.
        const results = await Promise.all(
          batch.map((r) =>
            supabase
              .from('ph_issues')
              .update({ summary_display: r.summary_display })
              .eq('issue_key', r.issue_key),
          ),
        )
        for (const res of results) {
          if (res.error) {
            writeError = res.error.message
            break
          }
          applied++
        }
        if (writeError) break
      }
    }

    return new Response(
      JSON.stringify({
        mode,
        scanned,
        candidates,
        applied,
        skipped,
        sample_changes: samples,
        skip_breakdown: skipBreakdown,
        write_error: writeError,
        offset,
        limit,
        project_key: projectKey,
        force,
        elapsed_ms: Date.now() - startedAt,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
        elapsed_ms: Date.now() - startedAt,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
