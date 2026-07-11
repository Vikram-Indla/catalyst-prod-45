/**
 * docintel-sync — Background Knowledge Sync Engine v1 (S5).
 *
 * Unattended 15-minute sweep (pg_cron → net.http_post, see migration
 * 20260707130000_docintel_sync.sql) that keeps the DocIntel reservoir healthy:
 *
 *   a. STUCK DOCS   — ai_documents sitting in ingesting/extracting/chunking/
 *                     embedding for > STUCK_THRESHOLD_MS are re-driven:
 *                     pages still pending → re-fan-out docintel-analyze batches
 *                     (mirrors docintel-ingest's fan-out shape); all pages
 *                     terminal but content embeddings missing → rebuild the
 *                     embed stage (derived chunks are deleted and re-derived by
 *                     runEmbedStage — scope='fact' chunks are NEVER touched,
 *                     they belong to requirement facts, not the embed stage);
 *                     content embeddings present → CAS the document to ready.
 *   b. FAILED RETRY — status='failed' documents with retry budget left
 *                     (max MAX_RETRY_ATTEMPTS, tracked via this function's own
 *                     stage='sync' job rows) get the same re-drive, with their
 *                     failed pages reset to pending first.
 *   c. FACT BACKFILL — ai_requirement_facts lacking a scope='fact' chunk get
 *                     their statements embedded (same persistence contract as
 *                     docintel-generate's handleRequirementFacts step 5b).
 *   d. CONFLICT SCAN — unreviewed facts are matched (docintel_match_facts,
 *                     threshold CONFLICT_MATCH_THRESHOLD) against their own
 *                     project; a match from a DIFFERENT document is judged by
 *                     one cheap structured LLM call; contradictions insert
 *                     ai_extraction_issues kind='fact_conflict' with detail
 *                     JSON {fact_id, other_fact_id, reason}. Pairs already
 *                     flagged are never re-judged (idempotent).
 *   e. ACCOUNTING   — one ai_sync_runs summary row per project touched plus
 *                     one global row (project_id NULL) per run.
 *
 * Ledger: every per-document repair/retry is recorded as an ai_document_jobs
 * row with stage='sync'; the jobs table has no metadata column, so the step
 * detail is carried as compact JSON in error_message. Fact-level steps (c/d)
 * are document-agnostic and are accounted in ai_sync_runs counts instead
 * (ai_document_jobs.document_id is NOT NULL — no global rows possible).
 *
 * Auth: service-role bearer (requireServiceRole) OR the DOCINTEL_SYNC_SECRET
 * shared secret (pg_cron path) — same dual pattern as kb-ingest's cron guard.
 *
 * Bounded work per run (MAX_* caps), idempotent, never throws unhandled: any
 * top-level failure records an error ai_sync_runs row and returns JSON 500.
 *
 *   POST {}   → 200 { ok: true, ...summary }
 */
import {
  advanceStatus,
  corsHeaders,
  getAuthedUserId,
  getServiceClient,
  json,
  markDocumentFailed,
  requireMember,
  requireServiceRole,
} from "../_shared/docintel.ts";
import { embed, generateText, logUsage, type LlmMessage } from "../_shared/llm.ts";
import { runEmbedStage } from "../_shared/embed_stage.ts";
import { type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// ── Sweep tuning (bounded work per run) ─────────────────────────────────────
const STUCK_THRESHOLD_MS = 15 * 60 * 1000; // in-flight longer than this = stuck
const MAX_STUCK_DOCS = 10; // stuck documents re-driven per run
const MAX_RETRY_DOCS = 5; // failed documents retried per run
const MAX_RETRY_ATTEMPTS = 3; // lifetime retry budget per document
const FACT_BACKFILL_CAP = 100; // fact statements embedded per run
const FACT_SCAN_WINDOW = 500; // facts inspected for a missing chunk per run
const MAX_CONFLICT_FACTS = 10; // pending-review facts scanned per run
const MAX_VERDICT_PAIRS = 10; // LLM verdict calls per run (hard cap)
const CONFLICT_MATCH_THRESHOLD = 0.85;
const CONFLICT_MATCH_COUNT = 5; // candidates fetched per scanned fact
const VERDICT_TIMEOUT_MS = 20_000;
const VERDICT_MAX_OUTPUT_TOKENS = 512;
// Mirrors docintel-ingest's fan-out: pages per docintel-analyze call.
const BATCH_SIZE = 8;

// Terminal page states — mirrors docintel-analyze's chainToEmbed gate.
const TERMINAL_PAGE_STATUSES = new Set(["extracted", "described", "failed"]);
const STUCK_DOC_STATUSES = ["ingesting", "extracting", "chunking", "embedding"];

// ── Conflict verdict agent (strict JSON, one cheap call per candidate pair) ──
const CONFLICT_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    contradicts: { type: "boolean" },
    reason: { type: "string" },
  },
  required: ["contradicts", "reason"],
};

const CONFLICT_SYSTEM_PROMPT = [
  "You compare two requirement statements extracted from different business",
  "documents in the same project. Decide whether they CONTRADICT each other —",
  "i.e. both cannot be true at the same time (conflicting rules, limits,",
  "actors, workflows, or constraints).",
  "Overlapping, duplicated, or complementary statements are NOT contradictions.",
  "Return strict JSON matching the schema: { contradicts, reason }.",
  "reason = one short sentence naming the specific contradiction (or why not).",
  "NEVER invent details beyond the two statements.",
].join("\n");

type SyncStep = "stuck_repair" | "failed_retry";

type DocRow = {
  id: string;
  project_id: string | null;
  status: string;
};

type PageRow = {
  id: string;
  page_number: number;
  status: string | null;
};

type FactRow = {
  id: string;
  document_id: string | null;
  project_id: string | null;
  kind: string | null;
  statement_en: string | null;
  statement_ar: string | null;
  source_block_ids: string[] | null;
  source_page_numbers: number[] | null;
};

/** Per-project activity counters accumulated across the sweep. */
type ProjectCounts = {
  stuck_repaired: number;
  retried: number;
  facts_backfilled: number;
  conflicts_found: number;
};

const emptyCounts = (): ProjectCounts => ({
  stuck_repaired: 0,
  retried: 0,
  facts_backfilled: 0,
  conflicts_found: 0,
});

// ── Jira → RAG ingestion (Slice 6) ───────────────────────────────────────────
const JIRA_DEFAULT_LIMIT = 100;
const JIRA_MAX_LIMIT = 300;
const JIRA_CONTENT_CAP = 4000;

type JiraIssueRow = {
  id: string;
  issue_key: string | null;
  summary: string | null;
  description_text: string | null;
  issue_type: string | null;
  status: string | null;
};

function jiraIssueContent(i: JiraIssueRow): string {
  const head = `${i.issue_key ?? ""} — ${i.summary ?? ""}`.trim();
  const meta = [i.issue_type && `Type: ${i.issue_type}`, i.status && `Status: ${i.status}`]
    .filter(Boolean)
    .join(" · ");
  const body = (i.description_text ?? "").trim();
  const text = [head, meta, body].filter(Boolean).join("\n\n");
  return text.length > JIRA_CONTENT_CAP ? text.slice(0, JIRA_CONTENT_CAP) : text;
}

async function ingestJiraIssues(
  admin: SupabaseClient,
  projectId: string,
  userId: string,
  rawLimit?: number,
): Promise<{ ingested: number; total_issues: number; capped: boolean }> {
  const limit = Math.min(
    typeof rawLimit === "number" && rawLimit > 0 ? rawLimit : JIRA_DEFAULT_LIMIT,
    JIRA_MAX_LIMIT,
  );

  const { data: proj, error: projErr } = await admin
    .from("ph_projects")
    .select("key")
    .eq("id", projectId)
    .maybeSingle();
  if (projErr) throw new Error(`project lookup failed: ${projErr.message}`);
  const projectKey = (proj as { key: string } | null)?.key;
  if (!projectKey) throw new Error("project has no Jira key");

  const { count: totalIssues } = await admin
    .from("ph_issues")
    .select("id", { count: "exact", head: true })
    .eq("project_key", projectKey)
    .is("deleted_at", null);

  const { data: issues, error: issErr } = await admin
    .from("ph_issues")
    .select("id, issue_key, summary, description_text, issue_type, status")
    .eq("project_key", projectKey)
    .is("deleted_at", null)
    .order("jira_updated_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (issErr) throw new Error(`issue fetch failed: ${issErr.message}`);

  const rows = ((issues ?? []) as JiraIssueRow[]).filter((i) => jiraIssueContent(i).length > 0);
  if (rows.length === 0) return { ingested: 0, total_issues: totalIssues ?? 0, capped: false };

  // Clean rebuild: drop existing Jira docs for the project (cascade drops chunks/embeddings).
  const { error: delErr } = await admin
    .from("ai_documents")
    .delete()
    .eq("project_id", projectId)
    .eq("source_type", "jira");
  if (delErr) throw new Error(`cleanup failed: ${delErr.message}`);

  const contents = rows.map(jiraIssueContent);
  const embedded = await embed(contents);
  if (embedded.embeddings.length !== rows.length) {
    throw new Error(`embedding count mismatch: ${embedded.embeddings.length} vs ${rows.length}`);
  }

  let ingested = 0;
  for (let i = 0; i < rows.length; i++) {
    const issue = rows[i];
    const title = `${issue.issue_key ?? "Issue"} — ${issue.summary ?? ""}`.slice(0, 300);

    const { data: docRow, error: docErr } = await admin
      .from("ai_documents")
      .insert({
        project_id: projectId,
        title,
        status: "ready",
        source_type: "jira",
        source_language: "en",
        created_by: userId,
      })
      .select("id")
      .single();
    if (docErr) throw new Error(`doc insert failed (${issue.issue_key}): ${docErr.message}`);
    const documentId = (docRow as { id: string }).id;

    const { data: chunkRow, error: chunkErr } = await admin
      .from("ai_document_chunks")
      .insert({
        document_id: documentId,
        scope: "page",
        lang: "en",
        content: contents[i],
        char_count: contents[i].length,
        section_path: issue.issue_key,
      })
      .select("id")
      .single();
    if (chunkErr) throw new Error(`chunk insert failed (${issue.issue_key}): ${chunkErr.message}`);
    const chunkId = (chunkRow as { id: string }).id;

    const { error: embErr } = await admin.from("ai_document_embeddings").insert({
      chunk_id: chunkId,
      document_id: documentId,
      project_id: projectId,
      content_kind: "en_text",
      embedding: embedded.embeddings[i] as unknown as string,
      embedding_model: embedded.model,
    });
    if (embErr) throw new Error(`embedding insert failed (${issue.issue_key}): ${embErr.message}`);

    ingested++;
  }

  return { ingested, total_issues: totalIssues ?? rows.length, capped: (totalIssues ?? 0) > ingested };
}

// ── Git / markdown → RAG ingestion (Slice 6) ─────────────────────────────────
// Ingest repo files (markdown/docs/code) supplied by the caller as {path, content} into the SAME
// RAG substrate (ai_documents source_type='git' + chunk + embedding) so Ask/hybrid_search answers
// over repo knowledge with citations. The git PROVIDER fetch (GitHub API / clone) is a separate
// integration that feeds this adapter; the adapter is source-agnostic about how content arrives.
const GIT_MAX_DOCS = 300;
const GIT_CONTENT_CAP = 8000;

async function ingestGitDocs(
  admin: SupabaseClient,
  projectId: string,
  userId: string,
  docs: Array<{ path?: string; content?: string }>,
): Promise<{ ingested: number; received: number; capped: boolean }> {
  const clean = docs
    .filter((d) => (d.content ?? "").trim().length > 0)
    .slice(0, GIT_MAX_DOCS)
    .map((d) => ({
      path: (d.path ?? "file").slice(0, 300),
      content: (d.content ?? "").trim().slice(0, GIT_CONTENT_CAP),
    }));
  if (clean.length === 0) return { ingested: 0, received: docs.length, capped: false };

  // Clean rebuild: drop existing git docs for the project (cascade drops chunks/embeddings).
  const { error: delErr } = await admin
    .from("ai_documents")
    .delete()
    .eq("project_id", projectId)
    .eq("source_type", "git");
  if (delErr) throw new Error(`cleanup failed: ${delErr.message}`);

  const embedded = await embed(clean.map((d) => d.content));
  if (embedded.embeddings.length !== clean.length) {
    throw new Error(`embedding count mismatch: ${embedded.embeddings.length} vs ${clean.length}`);
  }

  let ingested = 0;
  for (let i = 0; i < clean.length; i++) {
    const d = clean[i];
    const { data: docRow, error: docErr } = await admin
      .from("ai_documents")
      .insert({
        project_id: projectId,
        title: d.path,
        status: "ready",
        source_type: "git",
        source_language: "en",
        created_by: userId,
      })
      .select("id")
      .single();
    if (docErr) throw new Error(`doc insert failed (${d.path}): ${docErr.message}`);
    const documentId = (docRow as { id: string }).id;

    const { data: chunkRow, error: chunkErr } = await admin
      .from("ai_document_chunks")
      .insert({
        document_id: documentId,
        scope: "page",
        lang: "en",
        content: d.content,
        char_count: d.content.length,
        section_path: d.path,
      })
      .select("id")
      .single();
    if (chunkErr) throw new Error(`chunk insert failed (${d.path}): ${chunkErr.message}`);
    const chunkId = (chunkRow as { id: string }).id;

    const { error: embErr } = await admin.from("ai_document_embeddings").insert({
      chunk_id: chunkId,
      document_id: documentId,
      project_id: projectId,
      content_kind: "en_text",
      embedding: embedded.embeddings[i] as unknown as string,
      embedding_model: embedded.model,
    });
    if (embErr) throw new Error(`embedding insert failed (${d.path}): ${embErr.message}`);

    ingested++;
  }
  return { ingested, received: docs.length, capped: docs.length > ingested };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Auth: service-role bearer OR the cron shared secret (kb-ingest pattern) OR an
  // authenticated user (manual "Re-sync now" trigger from Knowledge Health). The sweep is
  // internally budget-bounded (MAX_STUCK_DOCS / MAX_RETRY_DOCS / FACT_BACKFILL_CAP), so a
  // member-triggered run cannot run away.
  const syncSecret = Deno.env.get("DOCINTEL_SYNC_SECRET");
  const authHeader = req.headers.get("authorization") ?? "";
  const isCron = !!syncSecret && authHeader === `Bearer ${syncSecret}`;
  const isPrivileged = isCron || requireServiceRole(req);
  if (!isPrivileged) {
    const userId = await getAuthedUserId(req);
    if (!userId) {
      return json({ error: "UNAUTHORIZED" }, 401);
    }
  }

  const admin = getServiceClient();

  // ── Jira-ingest mode (CAT-DOCINTEL-V2 Slice 6) ─────────────────────────────
  // Folded into docintel-sync (rather than a new function) because the project is at
  // its edge-function count cap. `{ mode: 'jira', projectId, limit? }` brings a project's
  // Jira issues into the SAME RAG substrate (ai_documents source_type='jira' + chunk +
  // embedding) so Ask/hybrid_search can answer over them. Member-gated per project.
  const reqBody = (await req.clone().json().catch(() => null)) as
    | {
        mode?: string;
        projectId?: string;
        limit?: number;
        docs?: Array<{ path?: string; content?: string }>;
      }
    | null;
  if (reqBody?.mode === "jira") {
    const projectId = reqBody.projectId;
    if (!projectId) return json({ error: "projectId is required" }, 400);
    const memberId = await requireMember(req, projectId, admin);
    if (!memberId) return json({ error: "FORBIDDEN" }, 403);
    try {
      const result = await ingestJiraIssues(admin, projectId, memberId, reqBody.limit);
      return json(result);
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : String(e) }, 500);
    }
  }
  if (reqBody?.mode === "git") {
    const projectId = reqBody.projectId;
    if (!projectId) return json({ error: "projectId is required" }, 400);
    const memberId = await requireMember(req, projectId, admin);
    if (!memberId) return json({ error: "FORBIDDEN" }, 403);
    try {
      const result = await ingestGitDocs(admin, projectId, memberId, reqBody.docs ?? []);
      return json(result);
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : String(e) }, 500);
    }
  }

  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  // project id (or "global" for unattributable work) → counters.
  const byProject = new Map<string, ProjectCounts>();
  const bump = (projectId: string | null, key: keyof ProjectCounts, n = 1) => {
    const k = projectId ?? "global";
    const c = byProject.get(k) ?? emptyCounts();
    c[key] += n;
    byProject.set(k, c);
  };

  // Analyze fan-out + embed re-runs settle in the background after the
  // response returns (mirrors docintel-ingest).
  const background: Promise<unknown>[] = [];

  try {
    // ── a. STUCK DOCS ──────────────────────────────────────────────────────
    const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MS).toISOString();
    const { data: stuckDocs, error: stuckErr } = await admin
      .from("ai_documents")
      .select("id, project_id, status")
      .in("status", STUCK_DOC_STATUSES)
      .lt("updated_at", cutoff)
      .order("updated_at", { ascending: true })
      .limit(MAX_STUCK_DOCS);
    if (stuckErr) throw new Error(`stuck-doc scan failed: ${stuckErr.message}`);

    let stuckRepaired = 0;
    for (const doc of (stuckDocs ?? []) as DocRow[]) {
      const outcome = await redriveDocument(admin, doc, "stuck_repair", 0, background);
      await recordSyncJob(admin, doc.id, "stuck_repair", outcome.ok ? "done" : "failed", 0, outcome);
      if (outcome.ok) {
        stuckRepaired++;
        bump(doc.project_id, "stuck_repaired");
      }
    }

    // ── b. FAILED RETRY ────────────────────────────────────────────────────
    const { data: failedDocs, error: failedErr } = await admin
      .from("ai_documents")
      .select("id, project_id, status")
      .eq("status", "failed")
      .order("updated_at", { ascending: true })
      .limit(MAX_RETRY_DOCS * 3); // headroom: some will be over budget
    if (failedErr) throw new Error(`failed-doc scan failed: ${failedErr.message}`);

    let retried = 0;
    for (const doc of (failedDocs ?? []) as DocRow[]) {
      if (retried >= MAX_RETRY_DOCS) break;
      const attempts = await countRetryAttempts(admin, doc.id);
      if (attempts >= MAX_RETRY_ATTEMPTS) continue; // budget exhausted — leave for review
      const outcome = await redriveDocument(admin, doc, "failed_retry", attempts + 1, background);
      await recordSyncJob(
        admin,
        doc.id,
        "failed_retry",
        outcome.ok ? "done" : "failed",
        attempts + 1,
        outcome,
      );
      if (outcome.ok) {
        retried++;
        bump(doc.project_id, "retried");
      }
    }

    // ── c. FACT EMBEDDING BACKFILL ─────────────────────────────────────────
    const backfilledByProject = await backfillFactEmbeddings(admin);
    let factsBackfilled = 0;
    for (const [projectId, n] of backfilledByProject) {
      factsBackfilled += n;
      bump(projectId === "global" ? null : projectId, "facts_backfilled", n);
    }

    // ── d. FACT CONFLICT SCAN ──────────────────────────────────────────────
    const conflicts = await scanFactConflicts(admin);
    let conflictsFound = 0;
    for (const [projectId, n] of conflicts.byProject) {
      conflictsFound += n;
      bump(projectId === "global" ? null : projectId, "conflicts_found", n);
    }

    // ── e. ACCOUNTING — ai_sync_runs summary rows ──────────────────────────
    const finishedAt = new Date().toISOString();
    await writeSyncRuns(admin, byProject, startedAt, finishedAt, null);

    // Let the analyze fan-out / embed re-runs settle in the background.
    if (background.length > 0) {
      // @ts-ignore EdgeRuntime is available in the Supabase Edge runtime.
      EdgeRuntime.waitUntil(Promise.allSettled(background));
    }

    const summary = {
      ok: true,
      stuckRepaired,
      retried,
      factsBackfilled,
      conflictsFound,
      verdictCalls: conflicts.verdictCalls,
      durationMs: Date.now() - t0,
    };
    await logUsage(admin, {
      source: "docintel-sync",
      action: "sync",
      status: "ok",
      payload: summary,
    });
    return json(summary);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Best-effort error accounting — the run itself must never throw unhandled.
    await writeSyncRuns(admin, byProject, startedAt, new Date().toISOString(), msg)
      .catch(() => {});
    await logUsage(admin, {
      source: "docintel-sync",
      action: "sync",
      status: "error",
      error: msg,
      payload: {},
    });
    if (background.length > 0) {
      // @ts-ignore EdgeRuntime is available in the Supabase Edge runtime.
      EdgeRuntime.waitUntil(Promise.allSettled(background));
    }
    return json({ error: msg }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────
// Re-drive: shared by stuck-repair and failed-retry.
// ─────────────────────────────────────────────────────────────────────

type RedriveOutcome = { ok: boolean; action: string; detail?: string };

/**
 * Re-drive one document toward 'ready'. Decision tree:
 *   1. no page rows            → mark failed (ingest died before page fan-out;
 *                                zero-assumption: surface it, don't guess).
 *   2. pages to (re)extract    → reset them to pending, set the document to
 *                                'extracting' and re-fan-out docintel-analyze
 *                                batches (docintel-ingest's shape). The last
 *                                batch's CAS winner chains to the embed stage.
 *   3. content embeddings done → CAS the document straight to 'ready'.
 *   4. otherwise               → rebuild the embed stage: delete the document's
 *                                DERIVED chunks (scope != 'fact' — fact chunks
 *                                belong to requirement facts and are preserved),
 *                                set status 'chunking', run runEmbedStage in the
 *                                background (failure marks the document failed).
 *
 * For failed_retry, failed pages are also re-driven (that is what failed);
 * for stuck_repair only non-terminal pages are, mirroring chainToEmbed's gate.
 */
async function redriveDocument(
  admin: SupabaseClient,
  doc: DocRow,
  step: SyncStep,
  _attempt: number,
  background: Promise<unknown>[],
): Promise<RedriveOutcome> {
  try {
    const { data: pages, error: pgErr } = await admin
      .from("ai_document_pages")
      .select("id, page_number, status")
      .eq("document_id", doc.id)
      .order("page_number", { ascending: true });
    if (pgErr) return { ok: false, action: "page_load_failed", detail: pgErr.message };

    const pageRows = (pages ?? []) as PageRow[];

    // 1) No pages at all — ingest never fanned out. Nothing to re-drive.
    if (pageRows.length === 0) {
      await markDocumentFailed(
        admin,
        doc.id,
        "sync: no page rows exist — ingest incomplete, re-upload required",
      );
      return { ok: true, action: "marked_failed_no_pages" };
    }

    const redrivable = pageRows.filter((p) =>
      step === "failed_retry"
        ? !TERMINAL_PAGE_STATUSES.has(p.status ?? "") || p.status === "failed"
        : !TERMINAL_PAGE_STATUSES.has(p.status ?? "")
    );

    // 2) Pages still need extraction → reset + re-fan-out analyze batches.
    if (redrivable.length > 0) {
      const pageIds = redrivable.map((p) => p.id);
      const { error: resetErr } = await admin
        .from("ai_document_pages")
        .update({ status: "pending", error_message: null })
        .in("id", pageIds);
      if (resetErr) return { ok: false, action: "page_reset_failed", detail: resetErr.message };

      const { error: docErr } = await admin
        .from("ai_documents")
        .update({
          status: "extracting",
          status_detail: `Re-driven by sync (${step})`,
          error_message: null,
        })
        .eq("id", doc.id);
      if (docErr) return { ok: false, action: "doc_reset_failed", detail: docErr.message };

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const batches = toBatches(redrivable.map((p) => p.page_number));
      for (const b of batches) {
        background.push(
          fetch(`${supabaseUrl}/functions/v1/docintel-analyze`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({ documentId: doc.id, pageFrom: b.from, pageTo: b.to }),
          }),
        );
      }
      return {
        ok: true,
        action: "redrove_analyze",
        detail: `${redrivable.length} pages in ${batches.length} batches`,
      };
    }

    // All pages terminal. Content embeddings = everything EXCEPT the
    // requirement_fact rows (those belong to facts, not the embed stage).
    const { count: contentEmbeddings, error: embCountErr } = await admin
      .from("ai_document_embeddings")
      .select("id", { count: "exact", head: true })
      .eq("document_id", doc.id)
      .neq("content_kind", "requirement_fact");
    if (embCountErr) {
      return { ok: false, action: "embedding_count_failed", detail: embCountErr.message };
    }

    // 3) Embeddings complete → CAS straight to ready (single winner).
    if ((contentEmbeddings ?? 0) > 0) {
      const won = await advanceStatus(admin, doc.id, doc.status, "ready", null);
      return won
        ? { ok: true, action: "advanced_to_ready" }
        : { ok: false, action: "cas_lost", detail: `status moved off '${doc.status}'` };
    }

    // 4) Rebuild the embed stage. Derived chunks (scope != 'fact') are deleted
    //    and re-derived from blocks by runEmbedStage — deleting avoids the
    //    duplicate-chunk trap of re-running the stage over existing rows.
    //    Fact chunks + their embeddings are preserved.
    const { error: delErr } = await admin
      .from("ai_document_chunks")
      .delete()
      .eq("document_id", doc.id)
      .neq("scope", "fact");
    if (delErr) return { ok: false, action: "chunk_reset_failed", detail: delErr.message };

    const { error: statusErr } = await admin
      .from("ai_documents")
      .update({ status: "chunking", status_detail: `Embed stage re-run by sync (${step})` })
      .eq("id", doc.id);
    if (statusErr) return { ok: false, action: "doc_reset_failed", detail: statusErr.message };

    background.push(
      runEmbedStage(admin, doc.id).catch(async (e) => {
        const msg = e instanceof Error ? e.message : String(e);
        await markDocumentFailed(admin, doc.id, `sync: embed stage re-run failed: ${msg}`);
      }),
    );
    return { ok: true, action: "reran_embed_stage" };
  } catch (e) {
    return {
      ok: false,
      action: "redrive_threw",
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Group sorted page numbers into contiguous spans of ≤ BATCH_SIZE pages. */
function toBatches(pageNumbers: number[]): Array<{ from: number; to: number }> {
  const sorted = [...pageNumbers].sort((a, b) => a - b);
  const batches: Array<{ from: number; to: number }> = [];
  for (const n of sorted) {
    const last = batches[batches.length - 1];
    if (last && n === last.to + 1 && last.to - last.from + 1 < BATCH_SIZE) {
      last.to = n;
    } else {
      batches.push({ from: n, to: n });
    }
  }
  return batches;
}

/** Prior failed_retry attempts for a document (this function's own job rows). */
async function countRetryAttempts(admin: SupabaseClient, documentId: string): Promise<number> {
  const { count } = await admin
    .from("ai_document_jobs")
    .select("id", { count: "exact", head: true })
    .eq("document_id", documentId)
    .eq("stage", "sync")
    .like("error_message", '%"step":"failed_retry"%');
  return count ?? 0;
}

/**
 * Ledger row for one per-document sync step. ai_document_jobs has no metadata
 * column, so the step detail rides in error_message as compact JSON.
 */
async function recordSyncJob(
  admin: SupabaseClient,
  documentId: string,
  step: SyncStep,
  status: "done" | "failed",
  attempts: number,
  outcome: RedriveOutcome,
): Promise<void> {
  const now = new Date().toISOString();
  await admin
    .from("ai_document_jobs")
    .insert({
      document_id: documentId,
      stage: "sync",
      status,
      attempts,
      error_message: JSON.stringify({
        step,
        action: outcome.action,
        ...(outcome.detail ? { detail: outcome.detail.slice(0, 500) } : {}),
      }),
      started_at: now,
      finished_at: now,
    })
    .then(() => {}, () => {}); // ledger is best-effort — never block the sweep
}

// ─────────────────────────────────────────────────────────────────────
// c. Fact embedding backfill — same persistence contract as
//    docintel-generate handleRequirementFacts step 5b, driven from DB state.
// ─────────────────────────────────────────────────────────────────────

async function backfillFactEmbeddings(
  admin: SupabaseClient,
): Promise<Map<string, number>> {
  const backfilled = new Map<string, number>();

  const { data: facts, error: factsErr } = await admin
    .from("ai_requirement_facts")
    .select(
      "id, document_id, project_id, statement_en, statement_ar, source_block_ids, source_page_numbers",
    )
    .not("document_id", "is", null)
    .order("created_at", { ascending: true })
    .limit(FACT_SCAN_WINDOW);
  if (factsErr) throw new Error(`fact scan failed: ${factsErr.message}`);
  const factRows = (facts ?? []) as FactRow[];
  if (factRows.length === 0) return backfilled;

  const documentIds = [...new Set(factRows.map((f) => f.document_id!).filter(Boolean))];

  // Statements that ALREADY have a scope='fact' chunk.
  const { data: factChunkRows, error: chunkErr } = await admin
    .from("ai_document_chunks")
    .select("content")
    .eq("scope", "fact")
    .in("document_id", documentIds);
  if (chunkErr) throw new Error(`fact chunk lookup failed: ${chunkErr.message}`);
  const embeddedStatements = new Set<string>(
    ((factChunkRows ?? []) as Array<{ content: string }>).map((r) => r.content),
  );

  // project_id fallback: facts may carry a null project_id — resolve through
  // the document (ai_document_embeddings.project_id is NOT NULL).
  const { data: docRows, error: docErr } = await admin
    .from("ai_documents")
    .select("id, project_id")
    .in("id", documentIds);
  if (docErr) throw new Error(`fact doc lookup failed: ${docErr.message}`);
  const projectByDoc = new Map<string, string>(
    ((docRows ?? []) as Array<{ id: string; project_id: string }>)
      .map((d) => [d.id, d.project_id]),
  );

  type Draft = {
    document_id: string;
    project_id: string;
    lang: "ar" | "en";
    content: string;
    block_ids: string[];
    page_numbers: number[];
  };
  const drafts: Draft[] = [];
  for (const f of factRows) {
    if (drafts.length >= FACT_BACKFILL_CAP) break;
    const projectId = f.project_id ?? projectByDoc.get(f.document_id!) ?? null;
    if (!projectId) continue; // no resolvable project — cannot persist an embedding
    const statements: Array<{ text: string; lang: "ar" | "en" }> = [];
    const en = (f.statement_en ?? "").trim();
    const ar = (f.statement_ar ?? "").trim();
    if (en.length > 0) statements.push({ text: en, lang: "en" });
    if (ar.length > 0) statements.push({ text: ar, lang: "ar" });
    for (const s of statements) {
      if (embeddedStatements.has(s.text)) continue;
      embeddedStatements.add(s.text);
      drafts.push({
        document_id: f.document_id!,
        project_id: projectId,
        lang: s.lang,
        content: s.text,
        block_ids: f.source_block_ids ?? [],
        page_numbers: f.source_page_numbers ?? [],
      });
    }
  }
  if (drafts.length === 0) return backfilled;

  const factEmbed = await embed(drafts.map((d) => d.content));
  if (factEmbed.embeddings.length !== drafts.length) {
    throw new Error(
      `fact embedding count mismatch: ${factEmbed.embeddings.length} vs ${drafts.length}`,
    );
  }

  const { data: insertedChunks, error: insChunkErr } = await admin
    .from("ai_document_chunks")
    .insert(drafts.map((d) => ({
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
  if (insChunkErr || !insertedChunks) {
    throw new Error(`fact chunk insert failed: ${insChunkErr?.message ?? "no rows"}`);
  }

  const { error: insEmbErr } = await admin.from("ai_document_embeddings").insert(
    drafts.map((d, i) => ({
      chunk_id: insertedChunks[i].id as string,
      document_id: d.document_id,
      project_id: d.project_id,
      content_kind: "requirement_fact",
      embedding: factEmbed.embeddings[i] as unknown as string,
      embedding_model: factEmbed.model,
    })),
  );
  if (insEmbErr) throw new Error(`fact embedding insert failed: ${insEmbErr.message}`);

  for (const d of drafts) {
    backfilled.set(d.project_id, (backfilled.get(d.project_id) ?? 0) + 1);
  }
  return backfilled;
}

// ─────────────────────────────────────────────────────────────────────
// d. Fact conflict scan.
// ─────────────────────────────────────────────────────────────────────

/** Order-independent dedupe key for a fact pair. */
const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

async function scanFactConflicts(
  admin: SupabaseClient,
): Promise<{ byProject: Map<string, number>; verdictCalls: number }> {
  const byProject = new Map<string, number>();
  let verdictCalls = 0;

  const { data: pending, error: pendErr } = await admin
    .from("ai_requirement_facts")
    .select("id, document_id, project_id, kind, statement_en, statement_ar")
    .eq("review_status", "unreviewed")
    .not("statement_en", "is", null)
    .not("project_id", "is", null)
    .not("document_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(MAX_CONFLICT_FACTS);
  if (pendErr) throw new Error(`pending fact scan failed: ${pendErr.message}`);
  const factRows = (pending ?? []) as FactRow[];
  if (factRows.length === 0) return { byProject, verdictCalls };

  // Pairs already flagged — never re-judge (idempotent across 15-min runs).
  const { data: existingIssues } = await admin
    .from("ai_extraction_issues")
    .select("detail")
    .eq("kind", "fact_conflict")
    .limit(500);
  const seenPairs = new Set<string>();
  for (const row of (existingIssues ?? []) as Array<{ detail: string | null }>) {
    if (!row.detail) continue;
    try {
      const d = JSON.parse(row.detail) as { fact_id?: string; other_fact_id?: string };
      if (d.fact_id && d.other_fact_id) seenPairs.add(pairKey(d.fact_id, d.other_fact_id));
    } catch (_e) {
      // non-JSON detail — ignore
    }
  }

  for (const fact of factRows) {
    if (verdictCalls >= MAX_VERDICT_PAIRS) break;
    const statement = (fact.statement_en ?? "").trim();
    if (!statement) continue;

    // The fact's own embedding (via its scope='fact' chunk) — no re-embed cost.
    // Missing chunk ⇒ the backfill step (run just before this) covers it next run.
    const { data: chunk } = await admin
      .from("ai_document_chunks")
      .select("id")
      .eq("document_id", fact.document_id!)
      .eq("scope", "fact")
      .eq("content", statement)
      .limit(1)
      .maybeSingle();
    if (!chunk?.id) continue;
    const { data: embRow } = await admin
      .from("ai_document_embeddings")
      .select("embedding")
      .eq("chunk_id", chunk.id as string)
      .eq("content_kind", "requirement_fact")
      .limit(1)
      .maybeSingle();
    if (!embRow?.embedding) continue;

    // Service-role RPC: auth.uid() is NULL ⇒ the membership guard is skipped.
    const { data: matches, error: matchErr } = await admin.rpc("docintel_match_facts", {
      query_embedding: embRow.embedding as unknown as string,
      p_project_id: fact.project_id,
      p_kinds: null,
      match_threshold: CONFLICT_MATCH_THRESHOLD,
      match_count: CONFLICT_MATCH_COUNT,
    });
    if (matchErr) continue; // one fact's scan failing must not sink the sweep

    const candidates = ((matches ?? []) as Array<{
      id: string;
      document_id: string;
      statement_en: string | null;
    }>).filter((m) => m.id !== fact.id && m.document_id !== fact.document_id);

    for (const cand of candidates) {
      if (verdictCalls >= MAX_VERDICT_PAIRS) break;
      const key = pairKey(fact.id, cand.id);
      if (seenPairs.has(key)) continue;
      const other = (cand.statement_en ?? "").trim();
      if (!other) continue;

      seenPairs.add(key); // judged once per run even if the verdict call fails
      verdictCalls++;
      let verdict: { contradicts: boolean; reason: string } | null = null;
      try {
        const messages: LlmMessage[] = [
          { role: "system", parts: [{ text: CONFLICT_SYSTEM_PROMPT }] },
          {
            role: "user",
            parts: [{
              text: `FACT A (${fact.kind ?? "requirement"}): ${statement}\n\n` +
                `FACT B: ${other}\n\nDo these two statements contradict each other?`,
            }],
          },
        ];
        const result = await generateText({
          messages,
          temperature: 0,
          maxOutputTokens: VERDICT_MAX_OUTPUT_TOKENS,
          timeoutMs: VERDICT_TIMEOUT_MS,
          jsonSchema: CONFLICT_SCHEMA,
        });
        const parsed = result.parsed as { contradicts?: unknown; reason?: unknown } | undefined;
        if (parsed && typeof parsed.contradicts === "boolean") {
          verdict = {
            contradicts: parsed.contradicts,
            reason: typeof parsed.reason === "string" ? parsed.reason : "",
          };
        }
      } catch (_e) {
        verdict = null; // verdict failure = no issue row (zero-assumption)
      }

      if (verdict?.contradicts) {
        const { error: issueErr } = await admin.from("ai_extraction_issues").insert({
          document_id: fact.document_id,
          kind: "fact_conflict",
          severity: "warning",
          detail: JSON.stringify({
            fact_id: fact.id,
            other_fact_id: cand.id,
            reason: verdict.reason.slice(0, 500),
          }),
        });
        if (!issueErr) {
          const k = fact.project_id ?? "global";
          byProject.set(k, (byProject.get(k) ?? 0) + 1);
        }
      }
    }
  }

  return { byProject, verdictCalls };
}

// ─────────────────────────────────────────────────────────────────────
// e. Accounting — ai_sync_runs rows.
// ─────────────────────────────────────────────────────────────────────

async function writeSyncRuns(
  admin: SupabaseClient,
  byProject: Map<string, ProjectCounts>,
  startedAt: string,
  finishedAt: string,
  errorMessage: string | null,
): Promise<void> {
  const status = errorMessage ? "error" : "ok";

  // Doc-status counts for one scope (project or global).
  const docCounts = async (projectId: string | null) => {
    const base = () => {
      const q = admin.from("ai_documents").select("id", { count: "exact", head: true });
      return projectId ? q.eq("project_id", projectId) : q;
    };
    const [total, ready, failed] = await Promise.all([
      base().then(({ count }) => count ?? 0),
      base().eq("status", "ready").then(({ count }) => count ?? 0),
      base().eq("status", "failed").then(({ count }) => count ?? 0),
    ]);
    return { docs_total: total, docs_ready: ready, docs_failed: failed };
  };

  const rows: Array<Record<string, unknown>> = [];

  // One row per project touched this run.
  const globalTally = emptyCounts();
  for (const [key, counts] of byProject) {
    globalTally.stuck_repaired += counts.stuck_repaired;
    globalTally.retried += counts.retried;
    globalTally.facts_backfilled += counts.facts_backfilled;
    globalTally.conflicts_found += counts.conflicts_found;
    if (key === "global") continue;
    rows.push({
      project_id: key,
      counts: { ...(await docCounts(key)), ...counts },
      status,
      error_message: errorMessage,
      started_at: startedAt,
      finished_at: finishedAt,
    });
  }

  // Always one global row (project_id NULL) — the run heartbeat.
  rows.push({
    project_id: null,
    counts: { ...(await docCounts(null)), ...globalTally },
    status,
    error_message: errorMessage,
    started_at: startedAt,
    finished_at: finishedAt,
  });

  const { error } = await admin.from("ai_sync_runs").insert(rows);
  if (error) throw new Error(`sync run insert failed: ${error.message}`);
}
