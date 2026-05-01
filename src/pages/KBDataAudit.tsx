import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AuditSection {
  title: string;
  data: any;
  loading: boolean;
  error: string | null;
}

const Cell = ({ value, highlight }: { value: any; highlight?: boolean }) => {
  const isZeroOrNull = value === 0 || value === null || value === undefined;
  const shouldHighlight = highlight !== false && isZeroOrNull;
  return (
    <td
      style={{
        padding: "8px 14px",
        borderBottom: "1px solid var(--divider, #222)",
        color: shouldHighlight ? "var(--ds-text-danger, var(--ds-text-danger, #EF4444))" : "var(--fg-1, #e5e5e5)",
        fontWeight: shouldHighlight ? 700 : 400,
        background: shouldHighlight ? "rgba(239,68,68,0.08)" : "transparent",
        fontFamily: "monospace",
        fontSize: 13,
      }}
    >
      {value === null || value === undefined ? "NULL" : String(value)}
    </td>
  );
};

const SectionCard = ({ title, children, loading, error }: { title: string; children: React.ReactNode; loading: boolean; error: string | null }) => (
  <div style={{ background: "var(--bg-2, #1a1a1a)", borderRadius: 8, padding: "16px 20px", marginBottom: 16 }}>
    <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: "var(--fg-1, #e5e5e5)", textTransform: "uppercase", letterSpacing: 1 }}>{title}</h3>
    {loading ? <p style={{ color: "#888", fontSize: 13 }}>Loading…</p> : error ? <p style={{ color: "var(--ds-text-danger, var(--ds-text-danger, #EF4444))", fontSize: 13 }}>{error}</p> : children}
  </div>
);

const SimpleTable = ({ rows, columns }: { rows: any[]; columns: { key: string; label: string; noHighlight?: boolean }[] }) => (
  <table style={{ width: "100%", borderCollapse: "collapse" }}>
    <thead>
      <tr>
        {columns.map((c) => (
          <th key={c.key} style={{ textAlign: "left", padding: "6px 14px", fontSize: 11, fontWeight: 600, color: "var(--fg-2, #999)", textTransform: "uppercase", borderBottom: "1px solid var(--divider, #333)" }}>{c.label}</th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map((row, i) => (
        <tr key={i}>
          {columns.map((c) => (
            <Cell key={c.key} value={row[c.key]} highlight={!c.noHighlight} />
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);

export default function KBDataAudit() {
  const [training, setTraining] = useState<AuditSection>({ title: "Training Questions", data: null, loading: true, error: null });
  const [embeddings, setEmbeddings] = useState<AuditSection>({ title: "Embeddings", data: null, loading: true, error: null });
  const [embeddingsTotal, setEmbeddingsTotal] = useState<number | null>(null);
  const [cache, setCache] = useState<AuditSection>({ title: "Cache", data: null, loading: true, error: null });
  const [queryLog, setQueryLog] = useState<AuditSection>({ title: "Query Log", data: null, loading: true, error: null });
  const [sources, setSources] = useState<AuditSection>({ title: "Sources", data: null, loading: true, error: null });
  const [liveTest, setLiveTest] = useState<{ data: any; loading: boolean; error: string | null }>({ data: null, loading: false, error: null });

  useEffect(() => {
    // 1. Training questions
    (async () => {
      // Paginate to overcome 1000-row limit
      let allData: any[] = [];
      let from = 0;
      const step = 999;
      while (true) {
        const { data: batch, error: bErr } = await supabase.from("kb_training_questions").select("is_embedded, expected_answer").range(from, from + step);
        if (bErr) return setTraining((s) => ({ ...s, loading: false, error: bErr.message }));
        if (!batch || batch.length === 0) break;
        allData = allData.concat(batch);
        if (batch.length < step + 1) break;
        from += step + 1;
      }
      const data = allData;
      const total = data.length;
      const embedded = data.filter((r) => r.is_embedded).length;
      const hasAnswers = data.filter((r) => r.expected_answer !== null).length;
      const missingAnswers = total - hasAnswers;
      setTraining({ title: "Training Questions", data: [{ total, embedded, has_answers: hasAnswers, missing_answers: missingAnswers }], loading: false, error: null });
    })();

    // 2. Embeddings by source_type
    (async () => {
      const { data, error } = await supabase.from("kb_embeddings").select("source_type, source_url");
      if (error) return setEmbeddings((s) => ({ ...s, loading: false, error: error.message }));
      setEmbeddingsTotal(data.length);
      const grouped: Record<string, { chunks: number; sources: Set<string> }> = {};
      data.forEach((r) => {
        const key = r.source_type || "null";
        if (!grouped[key]) grouped[key] = { chunks: 0, sources: new Set() };
        grouped[key].chunks++;
        if (r.source_url) grouped[key].sources.add(r.source_url);
      });
      const rows = Object.entries(grouped).map(([source_type, v]) => ({ source_type, chunks: v.chunks, unique_sources: v.sources.size }));
      rows.sort((a, b) => a.source_type.localeCompare(b.source_type));
      setEmbeddings({ title: "Embeddings", data: rows, loading: false, error: null });
    })();

    // 3. Cache
    (async () => {
      const { count, error } = await supabase.from("kb_cache").select("id", { count: "exact", head: true });
      if (error) return setCache((s) => ({ ...s, loading: false, error: error.message }));
      setCache({ title: "Cache", data: [{ cached_responses: count }], loading: false, error: null });
    })();

    // 4. Query log
    (async () => {
      const { data, error } = await supabase.from("kb_query_log").select("was_answered");
      if (error) return setQueryLog((s) => ({ ...s, loading: false, error: error.message }));
      const total = data.length;
      const answered = data.filter((r) => r.was_answered === true).length;
      const unanswered = data.filter((r) => r.was_answered === false).length;
      setQueryLog({ title: "Query Log", data: [{ total_queries: total, answered, unanswered }], loading: false, error: null });
    })();

    // 5. Sources
    (async () => {
      const { data, error } = await supabase.from("kb_sources").select("label, source_type, is_active, pages_indexed, last_scraped_at").order("priority");
      if (error) return setSources((s) => ({ ...s, loading: false, error: error.message }));
      setSources({ title: "Sources", data: data || [], loading: false, error: null });
    })();
  }, []);

  const runLiveTest = async () => {
    setLiveTest({ data: null, loading: true, error: null });
    try {
      const { data, error } = await supabase.functions.invoke("kb-query", {
        body: { query: "What is a Gold License?", language: "en" },
      });
      if (error) throw error;
      setLiveTest({ data, loading: false, error: null });
    } catch (err: any) {
      setLiveTest({ data: null, loading: false, error: err.message || "Failed" });
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: "0 24px", color: "var(--fg-1, #e5e5e5)" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6, letterSpacing: 0.5 }}>KB Data Connectivity Audit</h1>
      <p style={{ color: "var(--fg-2, #888)", fontSize: 13, marginBottom: 24 }}>Real-time data layer diagnostics</p>

      <SectionCard title="1 · Training Questions" loading={training.loading} error={training.error}>
        {training.data && <SimpleTable rows={training.data} columns={[{ key: "total", label: "Total" }, { key: "embedded", label: "Embedded" }, { key: "has_answers", label: "Has Answers" }, { key: "missing_answers", label: "Missing Answers" }]} />}
      </SectionCard>

      <SectionCard title="2 · Embeddings (Content Chunks)" loading={embeddings.loading} error={embeddings.error}>
        {embeddings.data && (
          <>
            <SimpleTable rows={embeddings.data} columns={[{ key: "source_type", label: "Source Type", noHighlight: true }, { key: "chunks", label: "Chunks" }, { key: "unique_sources", label: "Unique Sources" }]} />
            <p style={{ marginTop: 8, fontSize: 12, color: "var(--fg-2, #888)" }}>Total embeddings: <strong style={{ color: embeddingsTotal === 0 ? "var(--ds-text-danger, var(--ds-text-danger, #EF4444))" : "var(--fg-1)" }}>{embeddingsTotal}</strong></p>
          </>
        )}
      </SectionCard>

      <SectionCard title="3 · Cache" loading={cache.loading} error={cache.error}>
        {cache.data && <SimpleTable rows={cache.data} columns={[{ key: "cached_responses", label: "Cached Responses" }]} />}
      </SectionCard>

      <SectionCard title="4 · Query Log" loading={queryLog.loading} error={queryLog.error}>
        {queryLog.data && <SimpleTable rows={queryLog.data} columns={[{ key: "total_queries", label: "Total Queries" }, { key: "answered", label: "Answered" }, { key: "unanswered", label: "Unanswered" }]} />}
      </SectionCard>

      <SectionCard title="5 · KB Sources" loading={sources.loading} error={sources.error}>
        {sources.data && <SimpleTable rows={sources.data} columns={[{ key: "label", label: "Label", noHighlight: true }, { key: "source_type", label: "Type", noHighlight: true }, { key: "is_active", label: "Active" }, { key: "pages_indexed", label: "Pages Indexed" }, { key: "last_scraped_at", label: "Last Scraped" }]} />}
      </SectionCard>

      <SectionCard title="6 · Live Test" loading={false} error={null}>
        <button
          onClick={runLiveTest}
          disabled={liveTest.loading}
          style={{
            background: "var(--ds-text-brand, var(--ds-text-brand, #2563EB))",
            color: "var(--ds-surface, var(--ds-surface, var(--ds-surface, #fff)))",
            border: "none",
            borderRadius: 6,
            padding: "8px 18px",
            fontSize: 13,
            fontWeight: 600,
            cursor: liveTest.loading ? "not-allowed" : "pointer",
            opacity: liveTest.loading ? 0.6 : 1,
            marginBottom: 12,
          }}
        >
          {liveTest.loading ? "Testing…" : "Test KB Query"}
        </button>
        <p style={{ fontSize: 11, color: "var(--fg-3, #666)", marginBottom: 8 }}>Query: "What is a Gold License?" · Language: en</p>
        {liveTest.error && <p style={{ color: "var(--ds-text-danger, var(--ds-text-danger, #EF4444))", fontSize: 13 }}>{liveTest.error}</p>}
        {liveTest.data && (
          <pre style={{ background: "var(--bg-1, #111)", borderRadius: 6, padding: 14, fontSize: 12, overflow: "auto", maxHeight: 400, color: "var(--fg-1, #ddd)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {JSON.stringify(liveTest.data, null, 2)}
          </pre>
        )}
      </SectionCard>
    </div>
  );
}
