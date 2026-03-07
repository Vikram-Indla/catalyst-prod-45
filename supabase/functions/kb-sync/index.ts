// ══════════════════════════════════════════════════════════════════
// CATALYST KB — kb-sync (Content Pipeline with Semantic Chunking)
// Reads existing Supabase tables → chunks semantically → embeds →
//   loads kb_embeddings with full metadata + tags
// Actions: discover, sync_table, sync_all, status
// ══════════════════════════════════════════════════════════════════
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BATCH_SIZE = 20;
const CHUNK_MAX_TOKENS = 500;
const CHUNK_OVERLAP_TOKENS = 50;
const PER_TABLE_TIMEOUT_MS = 40_000; // 40s max per table to avoid edge function timeout

async function updateSyncRun(sb: any, runId: string | undefined, patch: Record<string, any>) {
  if (!runId) return;
  await sb.from("wiki_sync_runs").update(patch).eq("id", runId);
}

// ── Helpers ──
function estimateTokens(s: string): number { return Math.ceil(s.length / 4); }

async function sha256(text: string): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function batchEmbed(texts: string[]): Promise<number[][]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "text-embedding-3-small", input: texts }),
  });
  const d = await res.json();
  if (!d.data) throw new Error(`Batch embed failed: ${JSON.stringify(d)}`);
  return d.data.sort((a: any, b: any) => a.index - b.index).map((x: any) => x.embedding);
}

// ══════════════════════════════════════════════════════════════════
// SEMANTIC CHUNKER
// ══════════════════════════════════════════════════════════════════

interface Chunk {
  content: string;
  content_hash: string;
  source_type: string;
  source_url: string;
  metadata: Record<string, any>;
  chunk_type: string;
  section_title: string;
  token_count: number;
  tags: string[];
  chunk_index: number;
  language: string;
}

function splitParagraphs(text: string, maxTokens: number, overlapTokens: number): string[] {
  const paras = text.split(/\n\n+/).filter(p => p.trim().length > 10);
  const out: string[] = [];
  let current = "";
  let overlap = "";

  for (const p of paras) {
    const combined = current ? `${current}\n\n${p}` : p;
    if (estimateTokens(combined) > maxTokens && current) {
      out.push(current.trim());
      const words = current.split(/\s+/);
      const ow = Math.ceil(overlapTokens * 4 / 5);
      overlap = words.slice(-ow).join(" ");
      current = overlap ? `${overlap}\n\n${p}` : p;
    } else {
      current = combined;
    }
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

async function chunkRecord(row: Record<string, any>, tableConfig: TableConfig): Promise<Chunk[]> {
  const chunks: Chunk[] = [];
  const { sourceType, urlField, titleField, bodyFields, tagFields, table } = tableConfig;

  const url = row[urlField] || row.id || "unknown";
  const title = row[titleField] || url;
  const baseTags = (tagFields || [])
    .map(f => row[f]).filter(Boolean).flat()
    .map((t: any) => String(t).toLowerCase());
  baseTags.push(table.toLowerCase());

  const headerParts = [
    titleField ? `${title}` : "",
    row.status ? `Status: ${row.status}` : "",
    row.priority ? `Priority: ${row.priority}` : "",
    row.assignee ? `Assignee: ${row.assignee}` : "",
    row.type || row.issue_type ? `Type: ${row.type || row.issue_type}` : "",
    row.project ? `Project: ${row.project}` : "",
  ].filter(Boolean).join(" | ");

  if (headerParts.length > 20) {
    const hContent = `[${table}] ${headerParts}`;
    chunks.push({
      content: hContent,
      content_hash: await sha256(hContent),
      source_type: sourceType,
      source_url: String(url),
      metadata: { table, id: row.id, title, status: row.status, project: row.project },
      chunk_type: "header",
      section_title: String(title).substring(0, 200),
      token_count: estimateTokens(hContent),
      tags: [...baseTags, "header"],
      chunk_index: 0,
      language: "en",
    });
  }

  for (const field of bodyFields) {
    const text = row[field];
    if (!text || String(text).trim().length < 20) continue;

    const paragraphs = splitParagraphs(String(text), CHUNK_MAX_TOKENS, CHUNK_OVERLAP_TOKENS);
    for (let i = 0; i < paragraphs.length; i++) {
      const content = `[${table}:${url}] ${field}:\n${paragraphs[i]}`;
      chunks.push({
        content,
        content_hash: await sha256(content),
        source_type: sourceType,
        source_url: String(url),
        metadata: { table, id: row.id, field, title, status: row.status, project: row.project },
        chunk_type: field === "comment" || field === "body" ? "comment" : "paragraph",
        section_title: `${String(title).substring(0, 100)} — ${field}`,
        token_count: estimateTokens(content),
        tags: [...baseTags, field.toLowerCase()],
        chunk_index: chunks.length,
        language: "en",
      });
    }
  }

  return chunks;
}

// ══════════════════════════════════════════════════════════════════
// TABLE CONFIGS
// ══════════════════════════════════════════════════════════════════

interface TableConfig {
  table: string;
  sourceType: string;
  urlField: string;
  titleField: string;
  bodyFields: string[];
  tagFields?: string[];
  selectFields: string;
  maxRows: number;
}

const TABLE_CONFIGS: TableConfig[] = [
  {
    table: "planner_tasks",
    sourceType: "catalyst",
    urlField: "id",
    titleField: "title",
    bodyFields: ["description"],
    tagFields: ["priority"],
    selectFields: "id, title, description, priority, created_at",
    maxRows: 500,
  },
  {
    table: "tm_test_cases",
    sourceType: "catalyst",
    urlField: "case_key",
    titleField: "title",
    bodyFields: ["description", "preconditions", "expected_result"],
    tagFields: ["status"],
    selectFields: "id, case_key, title, description, preconditions, expected_result, status, created_at",
    maxRows: 500,
  },
  {
    table: "planner_workstreams",
    sourceType: "catalyst",
    urlField: "id",
    titleField: "name",
    bodyFields: ["description"],
    tagFields: [],
    selectFields: "id, name, description, is_active, created_at",
    maxRows: 100,
  },
  {
    table: "profiles",
    sourceType: "internal",
    urlField: "id",
    titleField: "full_name",
    bodyFields: [],
    tagFields: ["role"],
    selectFields: "id, full_name, role, created_at",
    maxRows: 200,
  },
  {
    table: "ph_issues",
    sourceType: "jira",
    urlField: "issue_key",
    titleField: "summary",
    bodyFields: ["description_text"],
    tagFields: ["status", "priority", "issue_type"],
    selectFields: "issue_key, summary, description_text, status, priority, issue_type, assignee_display_name, reporter_display_name, project_name, sprint_name, jira_created_at, jira_updated_at",
    maxRows: 150,
  },
  {
    table: "epics",
    sourceType: "jira",
    urlField: "epic_key",
    titleField: "name",
    bodyFields: ["description"],
    tagFields: ["status", "health"],
    selectFields: "id, epic_key, name, description, status, health, owner_name, start_date, end_date, created_at",
    maxRows: 200,
  },
  {
    table: "stories",
    sourceType: "jira",
    urlField: "story_key",
    titleField: "title",
    bodyFields: ["description"],
    tagFields: ["status", "priority"],
    selectFields: "id, story_key, title, name, description, status, priority, created_at",
    maxRows: 500,
  },
  {
    table: "business_requests",
    sourceType: "catalyst",
    urlField: "request_key",
    titleField: "title",
    bodyFields: ["description", "business_justification", "proposed_solution"],
    tagFields: ["process_step", "health", "priority_tier", "urgency", "department", "delivery_model"],
    selectFields: "id, request_key, title, description, business_justification, proposed_solution, process_step, health, priority_tier, urgency, assignee, business_owner, department, delivery_model, estimated_cost_sar, approved_budget_sar, planned_quarter, progress, created_at, updated_at",
    maxRows: 500,
  },
  {
    table: "incidents",
    sourceType: "catalyst",
    urlField: "incident_key",
    titleField: "title",
    bodyFields: ["description", "resolution_summary", "root_cause"],
    tagFields: ["status", "severity", "priority", "incident_type", "service_component"],
    selectFields: "id, incident_key, title, description, status, severity, priority, incident_type, is_major_incident, reporter_name, service_component, resolution_summary, root_cause, target_date, created_at, updated_at",
    maxRows: 500,
  },
];

// ══════════════════════════════════════════════════════════════════
// SYNC ACTIONS
// ══════════════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { action = "status", table_name, custom_config, sync_run_id, record_id, table, content_field, source_type, metadata: reqMetadata } = await req.json().catch(() => ({ action: "status" }));
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    if (action === "discover") {
      const tables: Record<string, number> = {};
      const candidates = [
        ...TABLE_CONFIGS.map(c => c.table),
        "issues", "jira_issues", "epics", "stories", "tasks", "defects", "bugs",
        "comments", "issue_comments", "attachments", "sprints", "projects",
        "user_roles", "user_product_roles", "kb_sources", "kb_training_questions", "kb_embeddings",
      ];

      for (const t of [...new Set(candidates)]) {
        try {
          const { count } = await sb.from(t).select("*", { count: "exact", head: true });
          tables[t] = count || 0;
        } catch { /* table doesn't exist */ }
      }

      return new Response(JSON.stringify({ tables, configured: TABLE_CONFIGS.map(c => c.table) }),
        { headers: { ...cors, "Content-Type": "application/json" } });
    }

    if (action === "status") {
      const { count: total } = await sb.from("kb_embeddings").select("*", { count: "exact", head: true });

      const { data: bySource } = await sb.from("kb_embeddings")
        .select("source_type")
        .then(({ data }) => {
          const counts: Record<string, number> = {};
          for (const r of data || []) counts[r.source_type] = (counts[r.source_type] || 0) + 1;
          return { data: counts };
        });

      return new Response(JSON.stringify({ total_chunks: total || 0, by_source: bySource }),
        { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // ── Inline sync logic (shared by sync_table and sync_all) ──
    async function syncTableInline(config: TableConfig, sb: any, timeoutMs: number = PER_TABLE_TIMEOUT_MS): Promise<any> {
      const tableStart = Date.now();

      const { data: rows, error: fetchErr } = await sb
        .from(config.table)
        .select(config.selectFields)
        .limit(config.maxRows);

      if (fetchErr) throw new Error(`${config.table}: ${fetchErr.message}`);
      if (!rows || rows.length === 0) {
        return { table: config.table, message: `No rows in ${config.table}`, rows_processed: 0, total_chunks: 0, new_chunks: 0, synced: 0 };
      }

      const allChunks: Chunk[] = [];
      for (const row of rows) {
        const c = await chunkRecord(row, config);
        allChunks.push(...c);
      }

      const uniqueChunksByHash = new Map<string, Chunk>();
      for (const chunk of allChunks) {
        if (!uniqueChunksByHash.has(chunk.content_hash)) uniqueChunksByHash.set(chunk.content_hash, chunk);
      }
      const uniqueChunks = Array.from(uniqueChunksByHash.values());

      if (uniqueChunks.length === 0) {
        return {
          table: config.table, rows_processed: rows.length,
          total_chunks: allChunks.length, new_chunks: 0, synced: 0,
          message: `All ${allChunks.length} chunks already synced`,
        };
      }

      let synced = 0;
      const errors: string[] = [];

      for (let i = 0; i < uniqueChunks.length; i += BATCH_SIZE) {
        // Timeout guard: stop embedding if we're running out of time
        if (Date.now() - tableStart > timeoutMs) {
          errors.push(`Timeout after ${synced} chunks — remaining ${uniqueChunks.length - i} skipped`);
          break;
        }

        const batch = uniqueChunks.slice(i, i + BATCH_SIZE);
        const batchHashes = batch.map(c => c.content_hash);

        try {
          const { data: existingInBatch } = await sb
            .from("kb_embeddings")
            .select("content_hash")
            .in("content_hash", batchHashes);

          const existingSet = new Set((existingInBatch || []).map((r: any) => r.content_hash));
          const toInsert = batch.filter(c => !existingSet.has(c.content_hash));

          if (toInsert.length === 0) {
            if (i + BATCH_SIZE < uniqueChunks.length) await new Promise(r => setTimeout(r, 150));
            continue;
          }

          const texts = toInsert.map(c => c.content);
          const embeddings = await batchEmbed(texts);

          const insertRows = toInsert.map((c, j) => ({
            content: c.content,
            content_hash: c.content_hash,
            source_type: c.source_type,
            source_url: c.source_url,
            metadata: c.metadata,
            embedding: JSON.stringify(embeddings[j]),
            chunk_type: c.chunk_type,
            section_title: c.section_title,
            token_count: c.token_count,
            tags: c.tags,
            chunk_index: c.chunk_index,
            language: c.language,
          }));

          const { error: insertErr } = await sb
            .from("kb_embeddings")
            .upsert(insertRows, { onConflict: "content_hash", ignoreDuplicates: true });

          if (insertErr) {
            console.error(`Insert error for ${config.table} batch ${i}:`, insertErr.message);
            errors.push(`Batch ${i}: ${insertErr.message}`);
          } else {
            synced += toInsert.length;
          }

          if (i + BATCH_SIZE < uniqueChunks.length) await new Promise(r => setTimeout(r, 300));
        } catch (batchErr: any) {
          errors.push(`Batch ${i}-${i + BATCH_SIZE}: ${batchErr.message}`);
        }
      }

      await sb.from("kb_sources")
        .update({ last_scraped_at: new Date().toISOString(), pages_indexed: synced })
        .eq("source_type", config.sourceType);

      return {
        table: config.table,
        rows_processed: rows.length,
        total_chunks: allChunks.length,
        new_chunks: synced,
        synced,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      };
    }

    if (action === "sync_table") {
      const config = custom_config || TABLE_CONFIGS.find(c => c.table === table_name);
      if (!config) {
        return new Response(JSON.stringify({ error: `No config for table: ${table_name}` }),
          { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
      }
      const result = await syncTableInline(config, sb);
      return new Response(JSON.stringify(result),
        { headers: { ...cors, "Content-Type": "application/json" } });
    }

    if (action === "sync_all") {
      const startedAt = Date.now();
      let rowsProcessed = 0;
      let newChunks = 0;
      let failedTables = 0;

      const steps = TABLE_CONFIGS.map((config, idx) => ({
        name: config.table, status: "pending", result: "—",
        durationMs: 0, rowsProcessed: 0, newChunks: 0, synced: 0, order: idx + 1,
      }));

      await updateSyncRun(sb, sync_run_id, {
        status: "running", steps, total_items_processed: 0, new_chunks: 0, error_message: null,
      });

      const results: any[] = [];

      for (let i = 0; i < TABLE_CONFIGS.length; i++) {
        const config = TABLE_CONFIGS[i];
        const stepStart = Date.now();

        steps[i] = { ...steps[i], status: "active", result: "Syncing…" };
        await updateSyncRun(sb, sync_run_id, { steps });

        try {
          const payload = await syncTableInline(config, sb);
          const stepDuration = Date.now() - stepStart;
          const stepRows = payload?.rows_processed ?? 0;
          const stepNewChunks = payload?.new_chunks ?? 0;
          const stepSynced = payload?.synced ?? 0;

          rowsProcessed += stepRows;
          newChunks += stepNewChunks;

          if (payload?.error || (payload?.errors && payload.errors.length > 0)) {
            failedTables += 1;
            const errMsg = payload.error || payload.errors?.[0] || 'Unknown error';
            steps[i] = { ...steps[i], status: "failed", durationMs: stepDuration, rowsProcessed: stepRows, newChunks: stepNewChunks, synced: stepSynced, result: errMsg };
          } else {
            steps[i] = { ...steps[i], status: "done", durationMs: stepDuration, rowsProcessed: stepRows, newChunks: stepNewChunks, synced: stepSynced, result: `${stepSynced} synced` };
          }

          results.push(payload);
          await updateSyncRun(sb, sync_run_id, { steps, total_items_processed: rowsProcessed, new_chunks: newChunks, error_message: failedTables > 0 ? `${failedTables} table(s) failed` : null });
        } catch (e: any) {
          failedTables += 1;
          const stepDuration = Date.now() - stepStart;
          steps[i] = { ...steps[i], status: "failed", durationMs: stepDuration, result: e.message };
          results.push({ table: config.table, error: e.message });
          await updateSyncRun(sb, sync_run_id, { steps, error_message: `${failedTables} table(s) failed` });
        }
      }

      const durationMs = Date.now() - startedAt;
      const finalStatus = failedTables === 0 ? "complete" : (failedTables === TABLE_CONFIGS.length ? "failed" : "partial");

      await updateSyncRun(sb, sync_run_id, {
        status: finalStatus, completed_at: new Date().toISOString(),
        total_duration_ms: durationMs, total_items_processed: rowsProcessed,
        new_chunks: newChunks, steps,
        error_message: failedTables > 0 ? `${failedTables} table(s) failed` : null,
      });

      return new Response(JSON.stringify({
        results, steps,
        summary: { total_tables: TABLE_CONFIGS.length, failed_tables: failedTables, rows_processed: rowsProcessed, new_chunks: newChunks, duration_ms: durationMs },
      }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    if (action === "add_config" && custom_config) {
      const result = await syncTableInline(custom_config, sb);
      return new Response(JSON.stringify(result),
        { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // ── sync_single: chunk + embed a single record from any table ──
    if (action === "sync_single") {
      if (!record_id || !table) {
        return new Response(JSON.stringify({ error: "sync_single requires record_id and table" }),
          { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
      }

      const fieldName = content_field || "raw_text";
      const srcType = source_type || "brd";

      // Fetch the single record
      const { data: row, error: fetchErr } = await sb
        .from(table)
        .select("*")
        .eq("id", record_id)
        .single();

      if (fetchErr || !row) {
        return new Response(JSON.stringify({ error: fetchErr?.message || "Record not found" }),
          { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
      }

      const text = row[fieldName];
      if (!text || String(text).trim().length < 20) {
        return new Response(JSON.stringify({ error: `Field "${fieldName}" is empty or too short` }),
          { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
      }

      // Chunk the content
      const title = row.title || row.jira_key || record_id;
      const paragraphs = splitParagraphs(String(text), CHUNK_MAX_TOKENS, CHUNK_OVERLAP_TOKENS);
      const chunks: Chunk[] = [];

      for (let i = 0; i < paragraphs.length; i++) {
        const content = `[${table}:${record_id}] ${fieldName}:\n${paragraphs[i]}`;
        const hash = await sha256(content);
        chunks.push({
          content,
          content_hash: hash,
          source_type: srcType,
          source_url: record_id,
          metadata: { ...(reqMetadata || {}), table, id: record_id, field: fieldName, title },
          chunk_type: "paragraph",
          section_title: `${String(title).substring(0, 100)} — chunk ${i + 1}`,
          token_count: estimateTokens(content),
          tags: [table.toLowerCase(), srcType, fieldName],
          chunk_index: i,
          language: reqMetadata?.language || "en",
        });
      }

      if (chunks.length === 0) {
        return new Response(JSON.stringify({ synced: 0, message: "No chunks generated" }),
          { headers: { ...cors, "Content-Type": "application/json" } });
      }

      // Deduplicate against existing
      const hashes = chunks.map(c => c.content_hash);
      const { data: existing } = await sb
        .from("kb_embeddings")
        .select("content_hash")
        .in("content_hash", hashes);
      const existingSet = new Set((existing || []).map((r: any) => r.content_hash));
      const newChunks = chunks.filter(c => !existingSet.has(c.content_hash));

      if (newChunks.length === 0) {
        return new Response(JSON.stringify({ synced: 0, total_chunks: chunks.length, message: "All chunks already indexed" }),
          { headers: { ...cors, "Content-Type": "application/json" } });
      }

      // Embed and insert in batches
      let synced = 0;
      for (let i = 0; i < newChunks.length; i += BATCH_SIZE) {
        const batch = newChunks.slice(i, i + BATCH_SIZE);
        const texts = batch.map(c => c.content);
        const embeddings = await batchEmbed(texts);

        const insertRows = batch.map((c, j) => ({
          content: c.content,
          content_hash: c.content_hash,
          source_type: c.source_type,
          source_url: c.source_url,
          metadata: c.metadata,
          embedding: JSON.stringify(embeddings[j]),
          chunk_type: c.chunk_type,
          section_title: c.section_title,
          token_count: c.token_count,
          tags: c.tags,
          chunk_index: c.chunk_index,
          language: c.language,
        }));

        const { error: insertErr } = await sb
          .from("kb_embeddings")
          .upsert(insertRows, { onConflict: "content_hash", ignoreDuplicates: true });

        if (insertErr) {
          console.error(`sync_single insert error batch ${i}:`, insertErr.message);
        } else {
          synced += batch.length;
        }

        if (i + BATCH_SIZE < newChunks.length) await new Promise(r => setTimeout(r, 200));
      }

      return new Response(JSON.stringify({
        synced,
        total_chunks: chunks.length,
        new_chunks: synced,
        record_id,
        table,
      }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use: discover, status, sync_table, sync_all, sync_single, add_config" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

  } catch (e: any) {
    console.error("KB Sync Error:", e);
    return new Response(JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
