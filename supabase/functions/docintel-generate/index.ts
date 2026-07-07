/**
 * docintel-generate — grounded RAG generation worker (USER-facing).
 *
 * Turns extracted+embedded documents into a SOURCE-CITED artifact
 * (summary_ar | summary_en | epic | story | brd | gap_analysis | open_questions).
 *
 * HARD RULE — no hallucinated content. Every substantive claim MUST carry an
 * inline [E<n>] evidence marker referencing a retrieved chunk; the model is
 * instructed to write "Not found in source" rather than invent. The inline
 * marker coverage IS the grounding critic (no second LLM critic call in v1 —
 * latency budget). grounding_score = substantive units with ≥1 valid marker /
 * substantive units. Citations are extracted deterministically from the markers
 * and resolved back to (document_id, page, block, quoted evidence).
 *
 *   POST { projectId, documentIds: string[], artifactType, stream?, title? }
 *     stream=false → json { artifactId, artifactType, groundingScore, citationCount, status, content_md }
 *     stream=true  → text/event-stream: markdown deltas as `data: {"delta": "..."}`
 *                    then a terminal `data: {"done":true, artifactId, groundingScore, citationCount, status}`
 *
 * Flow: requireMember → validate → hybrid RAG retrieve (E1..En) → grounded
 * generation (per-artifact prompt) → deterministic citation parse + grounding
 * score → persist agent_run + artifact + citations → respond.
 *
 * Any failure records ai_agent_runs status 'error' + logUsage, returns 500.
 * Never persists a partial artifact without its run row.
 */
import {
  corsHeaders,
  getServiceClient,
  json,
  requireMember,
} from "../_shared/docintel.ts";
import {
  embed,
  generateStream,
  generateText,
  logUsage,
  type LlmMessage,
  type LlmResult,
} from "../_shared/llm.ts";
import { type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// ─────────────────────────────────────────────────────────────────────
// Artifact catalogue: valid types + the per-type retrieval query and the
// per-type structure instructions appended to the grounding system prompt.
// ─────────────────────────────────────────────────────────────────────
type ArtifactType =
  | "summary_ar"
  | "summary_en"
  | "epic"
  | "story"
  | "brd"
  | "gap_analysis"
  | "open_questions"
  | "business_process"
  | "acceptance_criteria"
  | "test_cases"
  | "release_notes"
  | "traceability";

const ARTIFACT_TYPES: ArtifactType[] = [
  "summary_ar",
  "summary_en",
  "epic",
  "story",
  "brd",
  "gap_analysis",
  "open_questions",
  "business_process",
  "acceptance_criteria",
  "test_cases",
  "release_notes",
  "traceability",
];

// 'requirement_facts' is NOT a markdown artifact — it writes structured facts to
// ai_requirement_facts via a dedicated path (no artifact + citations persistence).
// Kept out of ArtifactType so the artifact catalogue maps stay total.
const REQUIREMENT_FACTS_TYPE = "requirement_facts" as const;
type GenerateType = ArtifactType | typeof REQUIREMENT_FACTS_TYPE;

/** Retrieval query strings — bias the hybrid search toward the right evidence. */
const RETRIEVAL_QUERY: Record<ArtifactType, string> = {
  brd:
    "business context scope functional requirements non-functional requirements " +
    "integrations data risks assumptions dependencies acceptance criteria actors workflows",
  epic: "business capability goal outcome epic",
  story: "user story actor action acceptance criteria",
  summary_en: "purpose overview key points",
  summary_ar: "purpose overview key points",
  gap_analysis: "missing unclear undefined open question ambiguity",
  open_questions: "open question clarification unknown TBD",
  business_process:
    "process workflow steps actor role input output decision approval handoff sequence",
  acceptance_criteria:
    "acceptance criteria requirement condition given when then validation rule expected behaviour",
  test_cases:
    "test case scenario precondition steps expected result validation verification requirement",
  release_notes:
    "feature capability change improvement user benefit functionality delivered scope",
  traceability:
    "requirement source section page reference mapping coverage scope",
};

/** Default artifact title per type when the caller supplies none. */
const DEFAULT_TITLE: Record<ArtifactType, string> = {
  brd: "Business Requirements Document",
  epic: "Epic",
  story: "User Stories",
  summary_en: "Document Summary",
  summary_ar: "ملخص المستند",
  gap_analysis: "Gap Analysis",
  open_questions: "Open Questions",
  business_process: "Business Process",
  acceptance_criteria: "Acceptance Criteria",
  test_cases: "Test Cases",
  release_notes: "Release Notes",
  traceability: "Traceability Matrix",
};

/** Per-artifact structure instructions appended to the grounding system prompt. */
const STRUCTURE_INSTRUCTIONS: Record<ArtifactType, string> = {
  brd: [
    "Write a Business Requirements Document with these numbered sections, using GitHub-flavoured Markdown headings:",
    "1. Business Context",
    "2. Scope (with '### In Scope' and '### Out of Scope' subsections)",
    "3. Functional Requirements — a numbered list; each requirement on its own line ending with its evidence marker(s).",
    "4. Non-Functional Requirements",
    "5. Integrations",
    "6. Data Needs",
    "7. Risks",
    "8. Assumptions",
    "9. Dependencies",
    "10. Acceptance Criteria",
    "For any section the evidence does not cover, write a single line 'Not found in source' under that heading.",
  ].join("\n"),
  epic: [
    "Write a SINGLE epic.",
    "First line: an epic statement of the form 'As a <actor>, we need <capability> so that <outcome>.' cited to the evidence.",
    "Then a '## Description' paragraph, cited.",
    "Then a '## In Scope' bulleted list; each bullet ends with its evidence marker(s).",
    "If the actor, capability, or outcome is not supported by the evidence, write 'Not found in source' in that slot.",
  ].join("\n"),
  story: [
    "Write a list of user stories. For EACH story:",
    "- A '### Story N' heading.",
    "- One line: 'As a <actor>, I want <action>, so that <benefit>.' cited to the evidence.",
    "- An '#### Acceptance Criteria' block written as Given/When/Then bullets, each cited.",
    "- A '#### Dependencies' block (write 'Not found in source' if none in the evidence).",
    "Only create stories the evidence supports. Do not invent actors, actions, or criteria.",
  ].join("\n"),
  summary_en: [
    "Write a document summary in English with three short cited paragraphs under these headings:",
    "'## Executive Summary', '## Functional Summary', '## Technical Summary'.",
    "Every factual sentence must carry its evidence marker(s).",
  ].join("\n"),
  summary_ar: [
    "اكتب ملخصًا للمستند باللغة العربية بثلاث فقرات قصيرة موثّقة تحت العناوين التالية:",
    "'## الملخص التنفيذي'، '## الملخص الوظيفي'، '## الملخص التقني'.",
    "يجب أن تحمل كل جملة واقعية علامة الدليل الخاصة بها مثل [E1] أو [E2][E3].",
    "إذا لم يدعم الدليل نقطة مطلوبة فاكتب 'غير موجود في المصدر' بدلًا من التأليف.",
    "اكتب الفقرات بالعربية لكن أبقِ علامات الأدلة بالصيغة اللاتينية [E<n>].",
  ].join("\n"),
  gap_analysis: [
    "Write a Gap Analysis as a bulleted list.",
    "Each bullet names a gap, ambiguity, or missing/undefined piece of information found in the evidence,",
    "and points at the evidence item that reveals it (e.g. '[E4]') or explicitly notes the ABSENCE of coverage.",
    "Do not invent gaps that the evidence does not substantiate.",
  ].join("\n"),
  open_questions: [
    "Write a bulleted list of Open Questions raised by the document.",
    "Each question must be traceable to the evidence item that prompts it, cited inline (e.g. '[E2]').",
    "Only raise questions grounded in something actually present (or conspicuously absent) in the evidence.",
  ].join("\n"),
  business_process: [
    "Write a Business Process description with these sections, using GitHub-flavoured Markdown headings:",
    "'## Actors' — a bulleted list of the roles/systems involved; each bullet ends with its evidence marker(s).",
    "'## Process Steps' — an ordered (numbered) list of the process steps in sequence; each step names who acts, what happens, and its inputs/outputs, cited to the evidence.",
    "'## Decision Points' — a bulleted list of branch/approval points and their outcomes, each cited.",
    "'## Inputs and Outputs' — a bulleted list of the overall process inputs and outputs, each cited.",
    "Describe ONLY steps, actors, and decisions the evidence supports. For any section the evidence does not cover, write a single line 'Not found in source' under that heading.",
  ].join("\n"),
  acceptance_criteria: [
    "Write Acceptance Criteria grouped by requirement.",
    "For EACH requirement found in the evidence:",
    "- A '### <requirement>' heading naming the requirement, cited to the evidence.",
    "- A bulleted list of Given/When/Then criteria for that requirement; each criterion on its own line ending with its evidence marker(s).",
    "Only write criteria the evidence supports. If a requirement has no verifiable criteria in the evidence, write 'Not found in source' under its heading. Do not invent requirements or criteria.",
  ].join("\n"),
  test_cases: [
    "Write a Test Cases table in GitHub-flavoured Markdown with EXACTLY these columns:",
    "| ID | Title | Preconditions | Steps | Expected Result | Source Requirement |",
    "One row per test case. ID = TC-1, TC-2, … in order. Steps = a numbered sequence inside the cell separated by '<br>'.",
    "The Source Requirement cell MUST carry the evidence marker(s) (e.g. '[E3]') that ground the case; every row must cite at least one evidence item.",
    "Only derive test cases from requirements and behaviours present in the evidence. Where a precondition or expected result is not supported by the evidence, write 'Not found in source' in that cell.",
  ].join("\n"),
  release_notes: [
    "Write user-facing Release Notes summarising the capabilities and changes described in the documents.",
    "Start with a one-paragraph '## Overview', cited to the evidence.",
    "Then a '## What's New' bulleted list — each bullet names one capability or change in plain user-facing language and ends with its evidence marker(s).",
    "Then a '## Known Limitations' bulleted list for constraints/exclusions in the evidence (write 'Not found in source' if none).",
    "Describe ONLY capabilities and changes the evidence supports. Do not invent features, dates, or version numbers not present in the evidence.",
  ].join("\n"),
  traceability: [
    "Write a Traceability Matrix as a GitHub-flavoured Markdown table with EXACTLY these columns:",
    "| Requirement | Evidence | Suggested Artifact |",
    "One row per requirement found in the evidence.",
    "Requirement = a one-line statement of the requirement, cited with its evidence marker(s).",
    "Evidence = the supporting evidence marker(s) plus their page/section reference as given in the EVIDENCE (e.g. '[E4] page 12').",
    "Suggested Artifact = the most fitting downstream artifact for that requirement: one of epic, story, test case, or BRD section.",
    "Only include requirements the evidence supports; do not invent requirements or references. Where a mapping cannot be determined from the evidence, write 'Not found in source' in that cell.",
  ].join("\n"),
};

// ─────────────────────────────────────────────────────────────────────
// Retrieval params. Arabic summary retrieves Arabic evidence; everything
// else retrieves the English extraction (en_text + table/image summaries).
// ─────────────────────────────────────────────────────────────────────
const MATCH_COUNT = 24;
const CHUNK_CAP = 1200; // per-evidence content cap (chars) to bound tokens
const QUOTE_CAP = 400; // per-citation quoted_text cap (chars)
const CLAIM_CAP = 500; // per-citation claim_text cap (chars)
const SUBSTANTIVE_MIN = 40; // a claim unit must exceed this length to count

const EVIDENCE_MARKER = /\[E(\d+)\]/g;

type EvidenceItem = {
  index: number; // 1-based En
  content: string;
  document_id: string;
  page_number: number | null;
  block_id: string | null;
  rrf_score: number | null;
};

type HybridRow = {
  id: string;
  document_id: string;
  content: string;
  lang: string | null;
  page_numbers: number[] | null;
  block_ids: string[] | null;
  rrf_score: number | null;
  vector_sim: number | null;
  keyword_rank: number | null;
  document_updated_at: string | null;
};

// ─────────────────────────────────────────────────────────────────────
// Grounding system prompt (shared) + per-type structure appended.
// ─────────────────────────────────────────────────────────────────────
function systemPrompt(artifactType: ArtifactType): string {
  return [
    "You are a senior business analyst.",
    `Write a ${artifactType.replace(/_/g, " ")} STRICTLY grounded in the numbered EVIDENCE supplied by the user.`,
    "After EVERY factual sentence, cite the evidence item(s) that support it using inline markers like [E3] or [E1][E4].",
    "If the evidence does not support a needed point, write 'Not found in source' rather than inventing.",
    "Do NOT use any knowledge beyond the evidence. Do not add facts, numbers, names, or requirements not present in the EVIDENCE.",
    "Output GitHub-flavoured Markdown.",
    "",
    STRUCTURE_INSTRUCTIONS[artifactType],
  ].join("\n");
}

/** Build the numbered EVIDENCE user message. Each chunk capped to CHUNK_CAP. */
function evidenceMessage(evidence: EvidenceItem[]): string {
  const lines = evidence.map((e) => {
    const shortId = e.document_id.slice(0, 8);
    const page = e.page_number != null ? `page ${e.page_number}` : "page ?";
    const body = e.content.length > CHUNK_CAP ? e.content.slice(0, CHUNK_CAP) : e.content;
    return `E${e.index} (doc ${shortId}, ${page}): ${body}`;
  });
  return [
    "EVIDENCE (cite these with inline [E<n>] markers; do not use any other source):",
    "",
    lines.join("\n\n"),
  ].join("\n");
}

// ─────────────────────────────────────────────────────────────────────
// Deterministic citation parse + grounding score.
// Splits markdown into claim units (lines), finds [E<n>] markers, and scores
// marker coverage over substantive (non-heading, >SUBSTANTIVE_MIN char) units.
// ─────────────────────────────────────────────────────────────────────
type CitationRow = {
  artifact_id: string;
  claim_path: string | null;
  claim_text: string;
  document_id: string;
  page_number: number | null;
  block_id: string | null;
  quoted_text: string | null;
  confidence: number | null;
};

/** A markdown line that is a heading / list-bullet marker with no prose is not a claim. */
function isHeadingOnly(line: string): boolean {
  const t = line.trim();
  if (t.length === 0) return true;
  // ATX headings, horizontal rules, and empty bullets/quotes carry no claim.
  if (/^#{1,6}\s/.test(t)) return true;
  if (/^([-*_])\1{2,}$/.test(t)) return true; // --- *** ___
  if (/^[-*+]\s*$/.test(t)) return true; // empty bullet
  if (/^>\s*$/.test(t)) return true;
  return false;
}

/** Strip leading markdown scaffolding so claim_text reads as prose. */
function claimText(line: string): string {
  return line
    .trim()
    .replace(/^#{1,6}\s+/, "")
    .replace(/^[-*+]\s+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .replace(/^>\s+/, "")
    .trim();
}

function computeGrounding(markdown: string): {
  groundingScore: number;
  markerHits: Array<{ claim: string; indices: number[] }>;
} {
  const lines = markdown.split(/\r?\n/);
  let substantive = 0;
  let grounded = 0;
  const markerHits: Array<{ claim: string; indices: number[] }> = [];

  for (const raw of lines) {
    if (isHeadingOnly(raw)) continue;
    const text = claimText(raw);
    if (text.length <= SUBSTANTIVE_MIN) continue;
    substantive++;

    const indices: number[] = [];
    EVIDENCE_MARKER.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = EVIDENCE_MARKER.exec(raw)) !== null) {
      const n = Number(m[1]);
      if (Number.isInteger(n) && n > 0) indices.push(n);
    }
    if (indices.length > 0) {
      grounded++;
      markerHits.push({ claim: text, indices });
    }
  }

  const groundingScore = substantive === 0 ? 0 : Number((grounded / substantive).toFixed(2));
  return { groundingScore, markerHits };
}

/**
 * Build de-duped citation rows from marker hits. Markers whose index exceeds
 * the evidence length are ignored safely (guard c).
 */
function buildCitations(
  artifactId: string,
  markerHits: Array<{ claim: string; indices: number[] }>,
  evidence: EvidenceItem[],
): CitationRow[] {
  const byIndex = new Map<number, EvidenceItem>();
  for (const e of evidence) byIndex.set(e.index, e);

  // RRF scores are tiny by construction (≈ weight/(rrf_k + rank), max ~0.016) —
  // stored raw they made confidence read as ~0.01 on a 0..1 column while the
  // artifact's grounding_score sat at 1.0. Store rank-relative confidence
  // instead: rrf_score / max(rrf_score) over this retrieval, so the strongest
  // retrieved evidence = 1.0 and the rest are proportional to how strongly
  // retrieval ranked them (a retrieval-strength signal, not a probability).
  const maxRrf = evidence.reduce((m, e) => Math.max(m, e.rrf_score ?? 0), 0);

  const rows: CitationRow[] = [];
  const seen = new Set<string>();

  for (const hit of markerHits) {
    const claim = hit.claim.length > CLAIM_CAP ? hit.claim.slice(0, CLAIM_CAP) : hit.claim;
    for (const idx of hit.indices) {
      const e = byIndex.get(idx);
      if (!e) continue; // marker points past the evidence list — ignore safely.
      const dedupeKey = `${claim} ${e.document_id} ${e.page_number ?? ""} ${e.block_id ?? ""}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      rows.push({
        artifact_id: artifactId,
        claim_path: null,
        claim_text: claim,
        document_id: e.document_id,
        page_number: e.page_number,
        block_id: e.block_id,
        quoted_text: e.content.length > QUOTE_CAP ? e.content.slice(0, QUOTE_CAP) : e.content,
        confidence: e.rrf_score != null && maxRrf > 0
          ? Number((e.rrf_score / maxRrf).toFixed(4))
          : null,
      });
    }
  }
  return rows;
}

// ─────────────────────────────────────────────────────────────────────
// Structured item extraction. Deterministic parse of OUR OWN controlled
// markdown (epic / story) into promotable work items — so the frontend can
// promote artifacts into real work items without re-parsing markdown at
// promotion time. No extra LLM call. Pure, resilient, never throws.
// ─────────────────────────────────────────────────────────────────────
type ArtifactItem = {
  title: string;
  description_md: string;
  kind: "epic" | "story";
  acceptance_criteria?: string[];
};

const TITLE_CAP = 200;
/** Inline evidence citation markers — stripped from promoted titles/descriptions. */
const CITATION_MARKER = /\s*\[E\d+\]/g;
/** "As a … so that …" statement line (epic/story canonical first line). */
const AS_A_LINE = /^\s*As a\b.*\bso that\b.*$/im;

/** Remove [E<n>] citation markers; a promoted work item carries no evidence markers. */
function stripMarkers(s: string): string {
  return s.replace(CITATION_MARKER, "");
}

/** Trim trailing punctuation/whitespace and cap a title to TITLE_CAP chars. */
function toTitle(s: string): string {
  const t = stripMarkers(s).trim().replace(/[.\s]+$/, "").trim();
  return t.length > TITLE_CAP ? t.slice(0, TITLE_CAP) : t;
}

/**
 * Deterministically parse promotable items from our own controlled markdown.
 * - epic → exactly ONE item (title = the "As a … so that …" statement line).
 * - story → ONE item per '### … Story N …' block (title = the block's first
 *   "As a … so that …" line, else the ### heading text); acceptance_criteria
 *   pulled from the '#### Acceptance Criteria' sub-section when present.
 * On any parse difficulty, falls back to a single item wrapping the whole
 * markdown. Never throws.
 */
function parseItemsFromMarkdown(
  artifactType: "epic" | "story",
  markdown: string,
): ArtifactItem[] {
  const fullClean = stripMarkers(markdown).trim();
  try {
    if (artifactType === "epic") {
      const m = markdown.match(AS_A_LINE);
      const title = m ? toTitle(m[0]) : "";
      return [{
        title: title.length > 0 ? title : "Epic",
        description_md: fullClean,
        kind: "epic",
      }];
    }

    // story — split into blocks on '### … Story N …' headings; fall back to
    // plain '### ' headings if the labelled form yields nothing.
    let blocks = splitBlocks(markdown, /^###\s+.*Story\s*\d*.*$/im);
    if (blocks.length === 0) blocks = splitBlocks(markdown, /^###\s+.*$/m);

    if (blocks.length === 0) {
      // No story blocks — single fallback item wrapping the whole markdown.
      return [{ title: "User Stories", description_md: fullClean, kind: "story" }];
    }

    const items: ArtifactItem[] = [];
    for (const block of blocks) {
      const asA = block.match(AS_A_LINE);
      let title: string;
      if (asA) {
        title = toTitle(asA[0]);
      } else {
        // Use the ### heading text of this block.
        const heading = block.match(/^###\s+(.*)$/m);
        title = heading ? toTitle(heading[1]) : "";
      }
      if (title.length === 0) title = "User Story";

      const acceptance = parseAcceptanceCriteria(block);
      const item: ArtifactItem = {
        title,
        description_md: stripMarkers(block).trim(),
        kind: "story",
      };
      if (acceptance.length > 0) item.acceptance_criteria = acceptance;
      items.push(item);
    }
    return items;
  } catch {
    // Any parse difficulty → single item wrapping the whole markdown.
    return [{
      title: artifactType === "epic" ? "Epic" : "User Stories",
      description_md: fullClean,
      kind: artifactType,
    }];
  }
}

/**
 * Split markdown into blocks, each starting at a line matching `headingRe`.
 * Content before the first match is discarded. Returns [] if no heading matches.
 */
function splitBlocks(markdown: string, headingRe: RegExp): string[] {
  const lines = markdown.split(/\r?\n/);
  const re = new RegExp(headingRe.source, headingRe.flags.replace(/[gm]/g, ""));
  const blocks: string[] = [];
  let current: string[] | null = null;
  for (const line of lines) {
    if (re.test(line)) {
      if (current) blocks.push(current.join("\n"));
      current = [line];
    } else if (current) {
      current.push(line);
    }
  }
  if (current) blocks.push(current.join("\n"));
  return blocks;
}

/**
 * Pull the lines under a '#### Acceptance Criteria' sub-section of a block.
 * Each Given/When/Then line or bullet becomes one entry (markers stripped).
 * The sub-section ends at the next '####'/'###' heading or end of block.
 */
function parseAcceptanceCriteria(block: string): string[] {
  const lines = block.split(/\r?\n/);
  const out: string[] = [];
  let inAc = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (/^#{3,4}\s+.*acceptance\s+criteria/i.test(line)) {
      inAc = true;
      continue;
    }
    if (!inAc) continue;
    if (/^#{1,6}\s/.test(line)) break; // next heading closes the sub-section.
    if (line.length === 0) continue;
    const cleaned = stripMarkers(line)
      .replace(/^[-*+]\s+/, "")
      .replace(/^\d+[.)]\s+/, "")
      .trim();
    if (cleaned.length > 0) out.push(cleaned);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────
// Persist: agent_run → artifact → citations. Shared by stream + non-stream.
// Returns the artifact id + derived status/counts, or throws.
// ─────────────────────────────────────────────────────────────────────
async function persistArtifact(
  admin: SupabaseClient,
  params: {
    projectId: string;
    documentIds: string[];
    artifactType: ArtifactType;
    title: string;
    markdown: string;
    retrievalQuery: string;
    evidence: EvidenceItem[];
    userId: string;
    provider: string | null;
    model: string | null;
    inputTokens: number | null;
    outputTokens: number | null;
    durationMs: number;
  },
): Promise<{ artifactId: string; groundingScore: number; citationCount: number; status: string }> {
  const { groundingScore, markerHits } = computeGrounding(params.markdown);

  // agent_run first — an artifact is never persisted without its run row.
  const { data: runRow, error: runErr } = await admin
    .from("ai_agent_runs")
    .insert({
      project_id: params.projectId,
      document_id: params.documentIds.length === 1 ? params.documentIds[0] : null,
      agent: params.artifactType,
      intent: "generate",
      provider: params.provider,
      model: params.model,
      input_tokens: params.inputTokens,
      output_tokens: params.outputTokens,
      duration_ms: params.durationMs,
      status: "ok",
    })
    .select("id")
    .single();
  if (runErr || !runRow) throw new Error(`agent_run insert failed: ${runErr?.message ?? "no row"}`);
  const agentRunId = runRow.id as string;

  // status: 'verified' when well-grounded AND at least one citation; else 'draft'.
  // (never auto-'rejected' — the UI critic can reject.)
  const citationCountEstimate = markerHits.reduce((n, h) => n + h.indices.length, 0);
  const status = groundingScore >= 0.6 && citationCountEstimate > 0 ? "verified" : "draft";

  // Only epic/story carry a structured items[] for frontend promotion; all other
  // artifact types keep the original content shape (no items key).
  const content: Record<string, unknown> = {
    markdown: params.markdown,
    evidence_count: params.evidence.length,
    retrieval_query: params.retrievalQuery,
  };
  if (params.artifactType === "epic" || params.artifactType === "story") {
    content.items = parseItemsFromMarkdown(params.artifactType, params.markdown);
  }

  const { data: artifactRow, error: artErr } = await admin
    .from("ai_generated_artifacts")
    .insert({
      project_id: params.projectId,
      document_ids: params.documentIds,
      artifact_type: params.artifactType,
      title: params.title,
      content,
      content_md: params.markdown,
      grounding_score: groundingScore,
      status,
      agent_run_id: agentRunId,
      created_by: params.userId,
    })
    .select("id")
    .single();
  if (artErr || !artifactRow) throw new Error(`artifact insert failed: ${artErr?.message ?? "no row"}`);
  const artifactId = artifactRow.id as string;

  const citationRows = buildCitations(artifactId, markerHits, params.evidence);
  let citationCount = 0;
  if (citationRows.length > 0) {
    const { error: citErr } = await admin.from("ai_artifact_citations").insert(citationRows);
    if (citErr) throw new Error(`citation insert failed: ${citErr.message}`);
    citationCount = citationRows.length;
  }

  return { artifactId, groundingScore, citationCount, status };
}

// ─────────────────────────────────────────────────────────────────────
// Requirement Structuring Agent — extracts atomic requirement facts and
// persists them to ai_requirement_facts (NOT ai_generated_artifacts).
// Own retrieval query, strict jsonSchema, evidence-index → block/page union,
// idempotent dedupe against existing statement_en. Never streams.
// ─────────────────────────────────────────────────────────────────────
const FACTS_RETRIEVAL_QUERY =
  "business capabilities actors workflows requirements constraints risks assumptions open questions";

const FACT_KINDS = [
  "capability",
  "actor",
  "workflow",
  "requirement",
  "constraint",
  "risk",
  "assumption",
  "open_question",
] as const;
type FactKind = (typeof FACT_KINDS)[number];
const FACT_KINDS_SET = new Set<string>(FACT_KINDS);

/** Strict JSON schema for the facts extraction (Gemini native responseSchema shape). */
const FACTS_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    facts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          kind: { type: "string", enum: [...FACT_KINDS] },
          statement_en: { type: "string" },
          statement_ar: { type: "string" },
          confidence: { type: "number" },
          evidence: { type: "array", items: { type: "integer" } },
        },
        required: ["kind", "statement_en", "confidence", "evidence"],
      },
    },
  },
  required: ["facts"],
};

const FACTS_SYSTEM_PROMPT = [
  "You are a requirements analyst. From the numbered EVIDENCE, extract atomic, non-overlapping requirement facts.",
  "Classify each as one of: capability, actor, workflow, requirement, constraint, risk, assumption, open_question.",
  "statement_en = a clear one-sentence English statement of the fact.",
  "statement_ar = the Arabic form if directly supported by Arabic evidence, else empty.",
  "For each fact list the evidence indices that support it.",
  "Extract ONLY facts grounded in the evidence — never invent. If nothing is found, return an empty facts array.",
].join("\n");

type RawFact = {
  kind?: unknown;
  statement_en?: unknown;
  statement_ar?: unknown;
  confidence?: unknown;
  evidence?: unknown;
};

/** Collapse whitespace + lowercase for idempotent statement_en dedupe. */
function normalizeStatement(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/**
 * Resolve source_block_ids + source_page_numbers by unioning the block_ids /
 * page_numbers of every cited evidence item. E-index → evidence[idx-1];
 * out-of-range and non-integer indices are ignored safely; both lists deduped.
 * NOTE: EvidenceItem carries a single block_id/page_number per row (the first of
 * each array from the hybrid row); we union those across the cited items.
 */
function resolveFactSources(
  evidenceIndices: unknown,
  evidence: EvidenceItem[],
): { blockIds: string[]; pageNumbers: number[] } {
  const blockSet = new Set<string>();
  const pageSet = new Set<number>();
  if (Array.isArray(evidenceIndices)) {
    for (const rawIdx of evidenceIndices) {
      const idx = Number(rawIdx);
      if (!Number.isInteger(idx) || idx < 1 || idx > evidence.length) continue;
      const e = evidence[idx - 1];
      if (e.block_id) blockSet.add(e.block_id);
      if (e.page_number != null) pageSet.add(e.page_number);
    }
  }
  return { blockIds: [...blockSet], pageNumbers: [...pageSet].sort((a, b) => a - b) };
}

async function handleRequirementFacts(
  admin: SupabaseClient,
  params: {
    projectId: string;
    documentIds: string[];
    userId: string;
    t0: number;
  },
): Promise<Response> {
  const { projectId, documentIds, userId, t0 } = params;
  const primaryDocId = documentIds[0];

  // 1) Retrieve evidence via hybrid RAG (English extraction surfaces).
  const { embeddings } = await embed([FACTS_RETRIEVAL_QUERY]);
  const queryEmbedding = embeddings[0];

  const { data: rows, error: rpcErr } = await admin.rpc("docintel_hybrid_search", {
    query_text: FACTS_RETRIEVAL_QUERY,
    query_embedding: queryEmbedding as unknown as string,
    p_project_id: projectId,
    p_document_ids: documentIds,
    p_content_kinds: ["en_text", "table_summary", "image_caption"],
    p_langs: null,
    match_count: MATCH_COUNT,
  });
  if (rpcErr) throw new Error(`hybrid_search failed: ${rpcErr.message}`);

  const evidence: EvidenceItem[] = ((rows ?? []) as HybridRow[]).map((r, i) => ({
    index: i + 1,
    content: r.content ?? "",
    document_id: r.document_id,
    page_number: Array.isArray(r.page_numbers) && r.page_numbers.length > 0 ? r.page_numbers[0] : null,
    block_id: Array.isArray(r.block_ids) && r.block_ids.length > 0 ? r.block_ids[0] : null,
    rrf_score: typeof r.rrf_score === "number" ? r.rrf_score : null,
  })).filter((e) => e.content.trim().length > 0);

  // 1b) Zero evidence → no LLM spend, no facts. Record run + return empty result.
  if (evidence.length === 0) {
    await admin
      .from("ai_agent_runs")
      .insert({
        project_id: projectId,
        document_id: primaryDocId,
        agent: "structuring",
        intent: "extract_facts",
        provider: null,
        model: null,
        input_tokens: null,
        output_tokens: null,
        duration_ms: Date.now() - t0,
        status: "ok",
      })
      .then(() => {}, () => {});
    await logUsage(admin, {
      source: "docintel-generate",
      action: "extract_facts",
      status: "ok",
      payload: { projectId, artifactType: REQUIREMENT_FACTS_TYPE, documentIds, evidence_count: 0, factCount: 0 },
    });
    return json({ artifactType: REQUIREMENT_FACTS_TYPE, factCount: 0, skipped: 0, byKind: {} });
  }

  // 2) Strict-JSON generation.
  const messages: LlmMessage[] = [
    { role: "system", parts: [{ text: FACTS_SYSTEM_PROMPT }] },
    { role: "user", parts: [{ text: evidenceMessage(evidence) }] },
  ];

  const result: LlmResult = await generateText({
    messages,
    temperature: 0.2,
    maxOutputTokens: 8192,
    jsonSchema: FACTS_JSON_SCHEMA,
    timeoutMs: 45_000,
  });

  // 2b) parsed===undefined → error path (agent_run 'error' + logUsage + 500).
  if (result.parsed === undefined) {
    const msg = "facts extraction produced no parseable JSON";
    await admin
      .from("ai_agent_runs")
      .insert({
        project_id: projectId,
        document_id: primaryDocId,
        agent: "structuring",
        intent: "extract_facts",
        provider: result.provider,
        model: result.model,
        input_tokens: result.inputTokens ?? null,
        output_tokens: result.outputTokens ?? null,
        duration_ms: result.durationMs,
        status: "error",
        error_message: msg,
      })
      .then(() => {}, () => {});
    await logUsage(admin, {
      source: "docintel-generate",
      action: "extract_facts",
      status: "error",
      error: msg,
      payload: { projectId, artifactType: REQUIREMENT_FACTS_TYPE, documentIds, provider: result.provider, model: result.model },
    });
    return json({ error: msg }, 500);
  }

  const parsedFacts = Array.isArray((result.parsed as { facts?: unknown })?.facts)
    ? ((result.parsed as { facts: RawFact[] }).facts)
    : [];

  // 3) Dedupe against existing facts for these documents (idempotent re-extraction).
  const { data: existingRows, error: existErr } = await admin
    .from("ai_requirement_facts")
    .select("statement_en")
    .in("document_id", documentIds);
  if (existErr) throw new Error(`existing facts lookup failed: ${existErr.message}`);
  const seenStatements = new Set<string>(
    ((existingRows ?? []) as Array<{ statement_en: string | null }>)
      .map((r) => (r.statement_en ? normalizeStatement(r.statement_en) : ""))
      .filter((s) => s.length > 0),
  );

  // 4) Build insert rows: valid kind, non-empty statement_en, resolved sources,
  //    clamped confidence, dedupe (also within this batch).
  type FactRow = {
    document_id: string;
    project_id: string;
    kind: FactKind;
    statement_ar: string | null;
    statement_en: string;
    confidence: number;
    source_block_ids: string[];
    source_page_numbers: number[];
    review_status: string;
  };
  const toInsert: FactRow[] = [];
  let skipped = 0;

  for (const f of parsedFacts) {
    const kind = typeof f.kind === "string" ? f.kind : "";
    const statementEn = typeof f.statement_en === "string" ? f.statement_en.trim() : "";
    if (!FACT_KINDS_SET.has(kind) || statementEn.length === 0) {
      skipped++;
      continue;
    }
    const norm = normalizeStatement(statementEn);
    if (seenStatements.has(norm)) {
      skipped++;
      continue;
    }
    seenStatements.add(norm);

    const statementArRaw = typeof f.statement_ar === "string" ? f.statement_ar.trim() : "";
    const { blockIds, pageNumbers } = resolveFactSources(f.evidence, evidence);

    toInsert.push({
      document_id: primaryDocId,
      project_id: projectId,
      kind: kind as FactKind,
      statement_ar: statementArRaw.length > 0 ? statementArRaw : null,
      statement_en: statementEn,
      confidence: clamp01(Number(f.confidence)),
      source_block_ids: blockIds,
      source_page_numbers: pageNumbers,
      review_status: "unreviewed",
    });
  }

  // 5) Insert.
  let inserted = 0;
  if (toInsert.length > 0) {
    const { error: insErr } = await admin.from("ai_requirement_facts").insert(toInsert);
    if (insErr) throw new Error(`requirement_facts insert failed: ${insErr.message}`);
    inserted = toInsert.length;
  }

  // 5b) Embed fact statements as scope='fact' chunks + content_kind
  //     'requirement_fact' embeddings — docintel_match_facts retrieves through
  //     these rows. Driven from DB state (facts lacking a fact chunk) rather
  //     than from toInsert, so a run that persisted facts but failed before
  //     embedding self-heals on the next extraction instead of being skipped
  //     forever by the statement_en dedupe above.
  const { data: allFacts, error: allFactsErr } = await admin
    .from("ai_requirement_facts")
    .select("document_id, statement_en, statement_ar, source_block_ids, source_page_numbers")
    .in("document_id", documentIds);
  if (allFactsErr) throw new Error(`facts re-read failed: ${allFactsErr.message}`);

  const { data: factChunkRows, error: factChunkReadErr } = await admin
    .from("ai_document_chunks")
    .select("content")
    .eq("scope", "fact")
    .in("document_id", documentIds);
  if (factChunkReadErr) throw new Error(`fact chunks lookup failed: ${factChunkReadErr.message}`);
  const embeddedStatements = new Set<string>(
    ((factChunkRows ?? []) as Array<{ content: string }>).map((r) => r.content),
  );

  type FactChunkDraft = {
    document_id: string;
    lang: "ar" | "en";
    content: string;
    block_ids: string[];
    page_numbers: number[];
  };
  const factDrafts: FactChunkDraft[] = [];
  for (
    const f of (allFacts ?? []) as Array<{
      document_id: string;
      statement_en: string | null;
      statement_ar: string | null;
      source_block_ids: string[] | null;
      source_page_numbers: number[] | null;
    }>
  ) {
    const statements: Array<{ text: string; lang: "ar" | "en" }> = [];
    const en = (f.statement_en ?? "").trim();
    const ar = (f.statement_ar ?? "").trim();
    if (en.length > 0) statements.push({ text: en, lang: "en" });
    if (ar.length > 0) statements.push({ text: ar, lang: "ar" });
    for (const s of statements) {
      if (embeddedStatements.has(s.text)) continue;
      embeddedStatements.add(s.text);
      factDrafts.push({
        document_id: f.document_id,
        lang: s.lang,
        content: s.text,
        block_ids: f.source_block_ids ?? [],
        page_numbers: f.source_page_numbers ?? [],
      });
    }
  }

  let factEmbeddings = 0;
  if (factDrafts.length > 0) {
    const factEmbed = await embed(factDrafts.map((d) => d.content));
    if (factEmbed.embeddings.length !== factDrafts.length) {
      throw new Error(`fact embedding count mismatch: ${factEmbed.embeddings.length} vs ${factDrafts.length}`);
    }
    const { data: insertedFactChunks, error: factChunkErr } = await admin
      .from("ai_document_chunks")
      .insert(factDrafts.map((d) => ({
        document_id: d.document_id,
        scope: "fact",
        lang: d.lang,
        content: d.content,
        block_ids: d.block_ids,
        page_numbers: d.page_numbers,
        section_path: null,
        char_count: d.content.length,
      })))
      .select("id");
    if (factChunkErr || !insertedFactChunks) {
      throw new Error(`fact chunk insert failed: ${factChunkErr?.message ?? "no rows"}`);
    }
    const { error: factEmbErr } = await admin.from("ai_document_embeddings").insert(
      factDrafts.map((d, i) => ({
        chunk_id: insertedFactChunks[i].id as string,
        document_id: d.document_id,
        project_id: projectId,
        content_kind: "requirement_fact",
        embedding: factEmbed.embeddings[i] as unknown as string,
        embedding_model: factEmbed.model,
      })),
    );
    if (factEmbErr) throw new Error(`fact embedding insert failed: ${factEmbErr.message}`);
    factEmbeddings = factDrafts.length;
  }

  // 6) byKind tally over inserted rows.
  const byKind: Record<string, number> = {};
  for (const row of toInsert) byKind[row.kind] = (byKind[row.kind] ?? 0) + 1;

  // 7) Record agent_run + logUsage.
  await admin
    .from("ai_agent_runs")
    .insert({
      project_id: projectId,
      document_id: primaryDocId,
      agent: "structuring",
      intent: "extract_facts",
      provider: result.provider,
      model: result.model,
      input_tokens: result.inputTokens ?? null,
      output_tokens: result.outputTokens ?? null,
      duration_ms: result.durationMs,
      status: "ok",
    })
    .then(() => {}, () => {});
  await logUsage(admin, {
    source: "docintel-generate",
    action: "extract_facts",
    status: "ok",
    payload: {
      projectId,
      artifactType: REQUIREMENT_FACTS_TYPE,
      documentIds,
      provider: result.provider,
      model: result.model,
      evidence_count: evidence.length,
      factCount: inserted,
      skipped,
      factEmbeddings,
    },
  });

  return json({ artifactType: REQUIREMENT_FACTS_TYPE, factCount: inserted, skipped, byKind });
}

// ─────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const admin = getServiceClient();
  const body = (await req.json().catch(() => null)) as
    | {
        projectId?: string;
        documentIds?: string[];
        artifactType?: string;
        stream?: boolean;
        title?: string;
      }
    | null;

  const projectId = body?.projectId;
  const documentIds = Array.isArray(body?.documentIds) ? body!.documentIds : [];
  const requestedType = body?.artifactType as GenerateType | undefined;
  const isFacts = requestedType === REQUIREMENT_FACTS_TYPE;
  const artifactType = (isFacts ? undefined : requestedType) as ArtifactType | undefined;
  const wantStream = body?.stream === true;
  const explicitTitle = typeof body?.title === "string" ? body!.title : undefined;

  // 1) Basic shape validation (before any auth / spend).
  if (!projectId || typeof projectId !== "string") {
    return json({ error: "projectId is required" }, 400);
  }
  if (!isFacts && (!artifactType || !ARTIFACT_TYPES.includes(artifactType))) {
    return json(
      { error: `artifactType must be one of ${ARTIFACT_TYPES.join(", ")}, ${REQUIREMENT_FACTS_TYPE}` },
      400,
    );
  }
  if (documentIds.length === 0 || !documentIds.every((d) => typeof d === "string")) {
    return json({ error: "documentIds must be a non-empty string array" }, 400);
  }

  // 2) Membership gate — no LLM spend before this passes.
  const userId = await requireMember(req, projectId, admin);
  if (!userId) {
    return json({ error: "FORBIDDEN" }, 403);
  }

  const t0 = Date.now();

  try {
    // 3) Validate every document belongs to the project.
    const { data: docs, error: docErr } = await admin
      .from("ai_documents")
      .select("id, title, project_id")
      .in("id", documentIds)
      .eq("project_id", projectId);
    if (docErr) throw new Error(`document lookup failed: ${docErr.message}`);
    const foundIds = new Set((docs ?? []).map((d) => d.id as string));
    const missing = documentIds.filter((d) => !foundIds.has(d));
    if (missing.length > 0) {
      return json({ error: `documents not in project ${projectId}: ${missing.join(", ")}` }, 400);
    }

    // 3b) Requirement Structuring Agent — dedicated facts path (never streams,
    //     writes ai_requirement_facts, no markdown artifact + citations).
    if (isFacts) {
      return await handleRequirementFacts(admin, { projectId, documentIds, userId, t0 });
    }

    // Past this point the request is a markdown artifact type; narrow once.
    const artifactTypeK = artifactType as ArtifactType;
    const retrievalQuery = RETRIEVAL_QUERY[artifactTypeK];
    const title = explicitTitle ?? DEFAULT_TITLE[artifactTypeK];
    const isArabic = artifactTypeK === "summary_ar";

    // 4) Retrieve evidence via hybrid RAG.
    const { embeddings } = await embed([retrievalQuery]);
    const queryEmbedding = embeddings[0];

    const { data: rows, error: rpcErr } = await admin.rpc("docintel_hybrid_search", {
      query_text: retrievalQuery,
      query_embedding: queryEmbedding as unknown as string,
      p_project_id: projectId,
      p_document_ids: documentIds,
      p_content_kinds: isArabic ? ["ar_text"] : ["en_text", "table_summary", "image_caption"],
      p_langs: isArabic ? ["ar"] : null,
      match_count: MATCH_COUNT,
    });
    if (rpcErr) throw new Error(`hybrid_search failed: ${rpcErr.message}`);

    const evidence: EvidenceItem[] = ((rows ?? []) as HybridRow[]).map((r, i) => ({
      index: i + 1,
      content: r.content ?? "",
      document_id: r.document_id,
      page_number: Array.isArray(r.page_numbers) && r.page_numbers.length > 0 ? r.page_numbers[0] : null,
      block_id: Array.isArray(r.block_ids) && r.block_ids.length > 0 ? r.block_ids[0] : null,
      rrf_score: typeof r.rrf_score === "number" ? r.rrf_score : null,
    })).filter((e) => e.content.trim().length > 0);

    // 4b) Zero evidence → a truthful, un-fabricated artifact. No citations.
    if (evidence.length === 0) {
      const emptyMd = isArabic
        ? "لم يتم العثور على أي دليل مصدري في المستندات المحددة."
        : "No source evidence found in the selected documents.";

      // Persist run + artifact (no LLM was called → provider/model null, 0 tokens).
      const { data: runRow, error: runErr } = await admin
        .from("ai_agent_runs")
        .insert({
          project_id: projectId,
          document_id: documentIds.length === 1 ? documentIds[0] : null,
          agent: artifactTypeK,
          intent: "generate",
          provider: null,
          model: null,
          input_tokens: null,
          output_tokens: null,
          duration_ms: Date.now() - t0,
          status: "ok",
        })
        .select("id")
        .single();
      if (runErr || !runRow) throw new Error(`agent_run insert failed: ${runErr?.message ?? "no row"}`);

      const { data: artRow, error: artErr } = await admin
        .from("ai_generated_artifacts")
        .insert({
          project_id: projectId,
          document_ids: documentIds,
          artifact_type: artifactTypeK,
          title,
          content: { markdown: emptyMd, evidence_count: 0, retrieval_query: retrievalQuery },
          content_md: emptyMd,
          grounding_score: 0,
          status: "draft",
          agent_run_id: runRow.id as string,
          created_by: userId,
        })
        .select("id")
        .single();
      if (artErr || !artRow) throw new Error(`artifact insert failed: ${artErr?.message ?? "no row"}`);

      await logUsage(admin, {
        source: "docintel-generate",
        action: "generate",
        status: "ok",
        payload: { projectId, artifactType: artifactTypeK, documentIds, evidence_count: 0, groundingScore: 0 },
      });

      if (wantStream) {
        return streamEmptyResponse(emptyMd, {
          artifactId: artRow.id as string,
          groundingScore: 0,
          citationCount: 0,
          status: "draft",
        });
      }
      return json({
        artifactId: artRow.id as string,
        artifactType: artifactTypeK,
        groundingScore: 0,
        citationCount: 0,
        status: "draft",
        content_md: emptyMd,
      });
    }

    // 5) Build the grounded prompt.
    const messages: LlmMessage[] = [
      { role: "system", parts: [{ text: systemPrompt(artifactTypeK) }] },
      { role: "user", parts: [{ text: evidenceMessage(evidence) }] },
    ];

    // 6) Generate — streamed or single-shot.
    if (wantStream) {
      return await handleStream(admin, {
        messages,
        projectId,
        documentIds,
        artifactType: artifactTypeK,
        title,
        retrievalQuery,
        evidence,
        userId,
      });
    }

    const result: LlmResult = await generateText({
      messages,
      temperature: 0.3,
      maxOutputTokens: 8192,
      timeoutMs: 50_000,
    });
    const markdown = result.text ?? "";

    const persisted = await persistArtifact(admin, {
      projectId,
      documentIds,
      artifactType: artifactTypeK,
      title,
      markdown,
      retrievalQuery,
      evidence,
      userId,
      provider: result.provider,
      model: result.model,
      inputTokens: result.inputTokens ?? null,
      outputTokens: result.outputTokens ?? null,
      durationMs: result.durationMs,
    });

    await logUsage(admin, {
      source: "docintel-generate",
      action: "generate",
      status: "ok",
      payload: {
        projectId,
        artifactType: artifactTypeK,
        documentIds,
        provider: result.provider,
        model: result.model,
        evidence_count: evidence.length,
        groundingScore: persisted.groundingScore,
        citationCount: persisted.citationCount,
      },
    });

    return json({
      artifactId: persisted.artifactId,
      artifactType: artifactTypeK,
      groundingScore: persisted.groundingScore,
      citationCount: persisted.citationCount,
      status: persisted.status,
      content_md: markdown,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const errAgent = isFacts ? "structuring" : artifactType;
    const errIntent = isFacts ? "extract_facts" : "generate";
    const errAction = isFacts ? "extract_facts" : "generate";
    await admin
      .from("ai_agent_runs")
      .insert({
        project_id: projectId,
        document_id: documentIds.length === 1 ? documentIds[0] : null,
        agent: errAgent,
        intent: errIntent,
        provider: null,
        model: null,
        duration_ms: Date.now() - t0,
        status: "error",
        error_message: msg,
      })
      .then(() => {}, () => {});
    await logUsage(admin, {
      source: "docintel-generate",
      action: errAction,
      status: "error",
      error: msg,
      payload: { projectId, artifactType: requestedType, documentIds },
    });
    return json({ error: msg }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────
// Streaming path. Pipe LLM text deltas to the client as SSE `data:` frames,
// accumulate the full markdown, then persist (agent_run + artifact +
// citations) and emit a terminal `data: {"done":true, ...}` frame.
// ─────────────────────────────────────────────────────────────────────
async function handleStream(
  admin: SupabaseClient,
  params: {
    messages: LlmMessage[];
    projectId: string;
    documentIds: string[];
    artifactType: ArtifactType;
    title: string;
    retrievalQuery: string;
    evidence: EvidenceItem[];
    userId: string;
  },
): Promise<Response> {
  const enc = new TextEncoder();
  const sse = (obj: unknown) => enc.encode(`data: ${JSON.stringify(obj)}\n\n`);

  const { stream, meta } = generateStream({
    messages: params.messages,
    temperature: 0.3,
    maxOutputTokens: 8192,
    timeoutMs: 50_000,
  });

  const outBody = new ReadableStream<Uint8Array>({
    async start(controller) {
      let markdown = "";
      try {
        const reader = stream.getReader();
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) {
            markdown += value;
            controller.enqueue(sse({ delta: value }));
          }
        }

        // Stream finished — resolve meta (provider/model/tokens) and persist.
        const m = await meta.catch(() => null);
        const persisted = await persistArtifact(admin, {
          projectId: params.projectId,
          documentIds: params.documentIds,
          artifactType: params.artifactType,
          title: params.title,
          markdown,
          retrievalQuery: params.retrievalQuery,
          evidence: params.evidence,
          userId: params.userId,
          provider: m?.provider ?? null,
          model: m?.model ?? null,
          inputTokens: m?.inputTokens ?? null,
          outputTokens: m?.outputTokens ?? null,
          durationMs: m?.durationMs ?? 0,
        });

        await logUsage(admin, {
          source: "docintel-generate",
          action: "generate",
          status: "ok",
          payload: {
            projectId: params.projectId,
            artifactType: params.artifactType,
            documentIds: params.documentIds,
            provider: m?.provider ?? null,
            model: m?.model ?? null,
            evidence_count: params.evidence.length,
            groundingScore: persisted.groundingScore,
            citationCount: persisted.citationCount,
            streamed: true,
          },
        });

        controller.enqueue(
          sse({
            done: true,
            artifactId: persisted.artifactId,
            groundingScore: persisted.groundingScore,
            citationCount: persisted.citationCount,
            status: persisted.status,
          }),
        );
        controller.close();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // Best-effort error run row + terminal error frame. The stream body has
        // already carried whatever markdown arrived, but no artifact persisted.
        await admin
          .from("ai_agent_runs")
          .insert({
            project_id: params.projectId,
            document_id: params.documentIds.length === 1 ? params.documentIds[0] : null,
            agent: params.artifactType,
            intent: "generate",
            provider: null,
            model: null,
            status: "error",
            error_message: msg,
          })
          .then(() => {}, () => {});
        await logUsage(admin, {
          source: "docintel-generate",
          action: "generate",
          status: "error",
          error: msg,
          payload: {
            projectId: params.projectId,
            artifactType: params.artifactType,
            documentIds: params.documentIds,
            streamed: true,
          },
        });
        try {
          controller.enqueue(sse({ done: true, error: msg }));
          controller.close();
        } catch {
          controller.error(e);
        }
      }
    },
  });

  return new Response(outBody, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

/** Stream path for the zero-evidence case: one delta frame + terminal done. */
function streamEmptyResponse(
  markdown: string,
  done: { artifactId: string; groundingScore: number; citationCount: number; status: string },
): Response {
  const enc = new TextEncoder();
  const sse = (obj: unknown) => enc.encode(`data: ${JSON.stringify(obj)}\n\n`);
  const outBody = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(sse({ delta: markdown }));
      controller.enqueue(sse({ done: true, ...done }));
      controller.close();
    },
  });
  return new Response(outBody, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
