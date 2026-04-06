import React, { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type CheckStatus = "pass" | "fail" | "warn" | "info" | "pending" | "running";

interface CheckResult {
  id: string;
  layer: number;
  title: string;
  status: CheckStatus;
  data: any;
  message?: string;
}

const statusColors: Record<string, { bg: string; fg: string; label: string }> = {
  pass: { bg: "#1B7F37", fg: "#FFFFFF", label: "PASS" },
  fail: { bg: "#FFEBE6", fg: "#BF2600", label: "FAIL" },
  warn: { bg: "#FFFAE6", fg: "#974F0C", label: "WARN" },
  info: { bg: "#0C66E4", fg: "#FFFFFF", label: "INFO" },
  pending: { bg: "#F4F5F7", fg: "#6B778C", label: "PENDING" },
  running: { bg: "#0C66E4", fg: "#FFFFFF", label: "RUNNING" },
};

const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

function DataTable({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <span style={{ color: "#6B778C", fontSize: 12 }}>No rows</span>;
  const keys = Object.keys(data[0]);
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 8 }}>
      <thead>
        <tr>
          {keys.map((k) => (
            <th key={k} style={{ textAlign: "left", padding: "4px 8px", borderBottom: "1px solid var(--bd-default, rgba(255,255,255,0.10))", color: "rgba(237,237,237,0.40)", fontWeight: 600 }}>{k}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row: any, i: number) => (
          <tr key={i} style={{ background: i % 2 === 0 ? "#FAFBFC" : "#FFF" }}>
            {keys.map((k) => (
              <td key={k} style={{ padding: "4px 8px", borderBottom: "1px solid #1A1A1A" }}>{String(row[k] ?? "—")}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StatusBadge({ status }: { status: CheckStatus }) {
  const s = statusColors[status];
  return (
    <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 4, background: s.bg, color: s.fg, fontWeight: 700, fontSize: 11, letterSpacing: 0.5 }}>
      {s.label}
    </span>
  );
}

function CheckCard({ result }: { result: CheckResult }) {
  return (
    <div style={{ border: "0.75px solid var(--bd-default, rgba(255,255,255,0.10))", borderRadius: 6, background: "#FFFFFF", padding: 16, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{result.id} · {result.title}</span>
        <StatusBadge status={result.status} />
      </div>
      {result.message && <p style={{ fontSize: 12, color: "rgba(237,237,237,0.40)", marginBottom: 4 }}>{result.message}</p>}
      {result.data && Array.isArray(result.data) && result.data.length > 0 && <DataTable data={result.data} />}
      {result.data && !Array.isArray(result.data) && typeof result.data === "object" && (
        <div style={{ fontSize: 12, marginTop: 4 }}>
          {Object.entries(result.data).map(([k, v]) => (
            <div key={k} style={{ display: "flex", gap: 8, padding: "2px 0" }}>
              <span style={{ color: "rgba(237,237,237,0.40)", fontWeight: 500, minWidth: 140 }}>{k}:</span>
              <span>{String(v ?? "—")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type CheckDef = {
  id: string;
  layer: number;
  title: string;
  query: string;
  evaluate: (data: any[]) => { status: CheckStatus; message?: string };
};

const checks: CheckDef[] = [
  // LAYER 1
  {
    id: "L1-01", layer: 1, title: "Core RAG tables exist",
    query: `SELECT table_name FROM information_schema.tables WHERE table_name IN ('kb_embeddings','kb_cache','kb_query_log','kb_training_questions','brd_documents') ORDER BY table_name`,
    evaluate: (d) => d.length === 5 ? { status: "pass" } : { status: "fail", message: `Found ${d.length}/5 tables` },
  },
  {
    id: "L1-02", layer: 1, title: "Extensions enabled",
    query: `SELECT extname FROM pg_extension WHERE extname IN ('vector','pg_trgm')`,
    evaluate: (d) => d.length === 2 ? { status: "pass" } : { status: "fail", message: `Found ${d.length}/2 extensions` },
  },
  {
    id: "L1-03", layer: 1, title: "Embeddings populated",
    query: `SELECT COUNT(*) AS total_chunks, COUNT(embedding) AS with_embedding, COUNT(*) FILTER (WHERE embedding IS NULL) AS missing_embedding, COUNT(DISTINCT source_type) AS source_types FROM kb_embeddings`,
    evaluate: (d) => {
      const r = d[0];
      if (Number(r.total_chunks) === 0) return { status: "fail", message: "No embeddings found" };
      if (Number(r.missing_embedding) > 0) return { status: "warn", message: `${r.missing_embedding} chunks missing embeddings` };
      return { status: "pass" };
    },
  },
  {
    id: "L1-04", layer: 1, title: "Vector + FTS indexes on kb_embeddings",
    query: `SELECT indexname FROM pg_indexes WHERE tablename = 'kb_embeddings' ORDER BY indexname`,
    evaluate: (d) => d.some((r: any) => r.indexname?.toLowerCase().includes("ivfflat")) ? { status: "pass" } : { status: "warn", message: "No ivfflat index found" },
  },
  {
    id: "L1-05", layer: 1, title: "brd_documents pipeline stages",
    query: `SELECT pipeline_stage, COUNT(*) AS count FROM brd_documents GROUP BY pipeline_stage ORDER BY pipeline_stage`,
    evaluate: (d) => d.length > 0 ? { status: "pass" } : { status: "fail", message: "No documents found" },
  },
  {
    id: "L1-06", layer: 1, title: "brd_documents linked to embeddings",
    query: `SELECT COUNT(DISTINCT b.jira_key) AS brd_docs, COUNT(DISTINCT k.source_url) AS embedded_docs, COUNT(DISTINCT b.jira_key) - COUNT(DISTINCT k.source_url) AS not_yet_embedded FROM brd_documents b LEFT JOIN kb_embeddings k ON k.source_url = b.jira_key`,
    evaluate: (d) => {
      const n = Number(d[0]?.not_yet_embedded ?? 0);
      return n === 0 ? { status: "pass" } : { status: "warn", message: `${n} docs not yet embedded` };
    },
  },
  {
    id: "L1-07", layer: 1, title: "kb_hybrid_search function exists",
    query: `SELECT routine_name FROM information_schema.routines WHERE routine_name = 'kb_hybrid_search' AND routine_type = 'FUNCTION'`,
    evaluate: (d) => d.length === 1 ? { status: "pass" } : { status: "fail", message: "Function not found" },
  },
  {
    id: "L1-08", layer: 1, title: "Cache state",
    query: `SELECT COUNT(*) AS total_cached, MAX(created_at) AS newest FROM kb_cache`,
    evaluate: () => ({ status: "info" }),
  },
  {
    id: "L1-09", layer: 1, title: "Query log activity",
    query: `SELECT COUNT(*) AS total_queries, COUNT(*) FILTER (WHERE created_at > now() - interval '24 hours') AS last_24h FROM kb_query_log`,
    evaluate: () => ({ status: "info" }),
  },
  {
    id: "L1-10", layer: 1, title: "brd_documents unique index",
    query: `SELECT indexname FROM pg_indexes WHERE tablename = 'brd_documents'`,
    evaluate: (d) => d.some((r: any) => r.indexname === "brd_documents_jira_key_idx") ? { status: "pass" } : { status: "fail", message: "brd_documents_jira_key_idx not found" },
  },
  // LAYER 2
  {
    id: "L2-01", layer: 2, title: "brd_documents content populated",
    query: `SELECT COUNT(*) AS total, COUNT(raw_text) FILTER (WHERE raw_text IS NOT NULL AND raw_text != '') AS has_text, COUNT(raw_text) FILTER (WHERE raw_text IS NULL OR raw_text = '') AS missing_text FROM brd_documents`,
    evaluate: (d) => Number(d[0]?.missing_text ?? 0) === 0 ? { status: "pass" } : { status: "warn", message: `${d[0].missing_text} docs missing text` },
  },
  {
    id: "L2-02", layer: 2, title: "Language distribution",
    query: `SELECT language, COUNT(*) AS count FROM brd_documents GROUP BY language`,
    evaluate: () => ({ status: "info" }),
  },
  {
    id: "L2-03", layer: 2, title: "Quality scores",
    query: `SELECT MIN(quality_score) AS min_q, MAX(quality_score) AS max_q, ROUND(AVG(quality_score)::numeric, 1) AS avg_q, COUNT(*) FILTER (WHERE quality_score IS NULL) AS missing FROM brd_documents`,
    evaluate: (d) => Number(d[0]?.missing ?? 0) > 0 ? { status: "warn", message: `${d[0].missing} docs missing quality score` } : { status: "pass" },
  },
  {
    id: "L2-04", layer: 2, title: "Processing queue state",
    query: `SELECT status, COUNT(*) AS count FROM brd_processing_queue GROUP BY status ORDER BY status`,
    evaluate: () => ({ status: "info" }),
  },
  {
    id: "L2-05", layer: 2, title: "Chunks per document",
    query: `SELECT k.source_url AS jira_key, COUNT(*) AS chunk_count FROM kb_embeddings k WHERE k.source_url IN (SELECT jira_key FROM brd_documents) GROUP BY k.source_url ORDER BY chunk_count DESC`,
    evaluate: (d) => d.length > 0 ? { status: "pass" } : { status: "warn", message: "No chunks synced yet" },
  },
  {
    id: "L2-06", layer: 2, title: "Embedding coverage",
    query: `SELECT COUNT(DISTINCT b.jira_key) AS total_brd_docs, COUNT(DISTINCT k.source_url) AS docs_with_chunks FROM brd_documents b LEFT JOIN kb_embeddings k ON k.source_url = b.jira_key`,
    evaluate: (d) => ({ status: "info", message: `${d[0]?.docs_with_chunks ?? 0} / ${d[0]?.total_brd_docs ?? 0} docs embedded` }),
  },
  // LAYER 3
  {
    id: "L3-01", layer: 3, title: "Embedding count + avg tokens",
    query: `SELECT COUNT(*) AS embedding_count, ROUND(AVG(token_count)::numeric, 1) AS avg_tokens FROM kb_embeddings WHERE embedding IS NOT NULL`,
    evaluate: () => ({ status: "info" }),
  },
  {
    id: "L3-02", layer: 3, title: "FTS tsvector populated",
    query: `SELECT COUNT(*) FILTER (WHERE fts IS NOT NULL) AS has_fts, COUNT(*) FILTER (WHERE fts IS NULL) AS missing_fts FROM kb_embeddings`,
    evaluate: (d) => Number(d[0]?.missing_fts ?? 0) === 0 ? { status: "pass" } : { status: "warn", message: `${d[0].missing_fts} missing FTS` },
  },
  {
    id: "L3-03", layer: 3, title: "Source type distribution",
    query: `SELECT source_type, COUNT(*) AS chunks FROM kb_embeddings GROUP BY source_type ORDER BY chunks DESC`,
    evaluate: () => ({ status: "info" }),
  },
  {
    id: "L3-04", layer: 3, title: "Cache freshness",
    query: `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE created_at > now() - interval '24 hours') AS fresh, COUNT(*) FILTER (WHERE created_at <= now() - interval '24 hours') AS stale FROM kb_cache`,
    evaluate: () => ({ status: "info" }),
  },
  {
    id: "L3-05", layer: 3, title: "Retrieval methods in query log",
    query: `SELECT retrieval_method, COUNT(*) AS count, ROUND(AVG(response_time_ms)::numeric, 1) AS avg_ms FROM kb_query_log GROUP BY retrieval_method ORDER BY count DESC`,
    evaluate: () => ({ status: "info" }),
  },
  {
    id: "L3-06", layer: 3, title: "Confidence distribution",
    query: `SELECT confidence_level, COUNT(*) AS count FROM kb_query_log WHERE confidence_level IS NOT NULL GROUP BY confidence_level`,
    evaluate: () => ({ status: "info" }),
  },
  {
    id: "L3-07", layer: 3, title: "Hallucination risk",
    query: `SELECT COUNT(*) FILTER (WHERE confidence < 0.25) AS low_confidence, COUNT(*) FILTER (WHERE confidence >= 0.75) AS high_confidence, COUNT(*) AS total FROM kb_query_log`,
    evaluate: (d) => {
      const low = Number(d[0]?.low_confidence ?? 0);
      const total = Number(d[0]?.total ?? 1);
      return low > total * 0.3 ? { status: "warn", message: `${low}/${total} queries below 0.25 confidence` } : { status: "info" };
    },
  },
  {
    id: "L3-08", layer: 3, title: "Training questions loaded",
    query: `SELECT COUNT(*) AS total, COUNT(embedding) AS with_embedding FROM kb_training_questions`,
    evaluate: (d) => Number(d[0]?.total ?? 0) === 0 ? { status: "warn", message: "No training questions" } : { status: "info" },
  },
];

export default function RAGAuditPage() {
  const [results, setResults] = useState<CheckResult[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const runAllChecks = useCallback(async () => {
    setResults([]);
    setDone(false);
    setRunning(true);

    for (const check of checks) {
      // Show running state
      setResults((prev) => [...prev, { id: check.id, layer: check.layer, title: check.title, status: "running", data: null }]);

      try {
        const { data, error } = await supabase.rpc("execute_sql_query" as any, { query_text: check.query });
        if (error) throw error;
        const rows = Array.isArray(data) ? data : [];
        const evalResult = check.evaluate(rows);
        setResults((prev) =>
          prev.map((r) => r.id === check.id ? { ...r, status: evalResult.status, data: rows.length <= 1 && rows[0] && !Array.isArray(rows[0]) ? rows[0] : rows, message: evalResult.message } : r)
        );
      } catch (err: any) {
        setResults((prev) =>
          prev.map((r) => r.id === check.id ? { ...r, status: "fail", message: err.message || "Query failed", data: null } : r)
        );
      }
    }

    setRunning(false);
    setDone(true);
  }, []);

  const passCount = (layer: number) => results.filter((r) => r.layer === layer && r.status === "pass").length;
  const totalForLayer = (layer: number) => checks.filter((c) => c.layer === layer).length;
  const totalPass = results.filter((r) => r.status === "pass").length;
  const summaryBg = totalPass >= 22 ? "#1B7F37" : totalPass >= 15 ? "#FFFAE6" : "#FFEBE6";

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px", fontFamily: "Sora, system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>RAG Pipeline Audit — Layers 1–3</h1>
      <p style={{ fontSize: 13, color: "rgba(237,237,237,0.40)", marginBottom: 24 }}>Req Assist™ · Run by Vikram · {today}</p>

      <button
        onClick={runAllChecks}
        disabled={running}
        style={{
          height: 50, padding: "0 20px", background: running ? "#93C5FD" : "#2563EB", color: "#FFF",
          border: "none", borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: running ? "not-allowed" : "pointer", marginBottom: 24,
        }}
      >
        {running ? "Running…" : "Run All Checks"}
      </button>

      {results.map((r) => (
        <CheckCard key={r.id} result={r} />
      ))}

      {done && (
        <div style={{ marginTop: 24, padding: 16, borderRadius: 6, background: summaryBg, textAlign: "center", fontWeight: 600, fontSize: 14 }}>
          Layer 1: {passCount(1)}/{totalForLayer(1)} PASS &nbsp;|&nbsp;
          Layer 2: {passCount(2)}/{totalForLayer(2)} PASS &nbsp;|&nbsp;
          Layer 3: {passCount(3)}/{totalForLayer(3)} PASS &nbsp;|&nbsp;
          Overall: {totalPass}/24
        </div>
      )}
    </div>
  );
}
