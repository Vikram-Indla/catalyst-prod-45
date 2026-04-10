/**
 * Wiki Pipeline Diagnostic Dashboard
 * Runs live health checks against all wiki-related tables and displays results.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import {
  RefreshCw, Database, Layers, FileText, FolderOpen,
  CheckCircle2, XCircle, BookOpen, Activity, BarChart3,
  Stethoscope, Table2, Columns3, Play, Wrench
} from 'lucide-react';
import StatusLozenge from '@/components/ui/StatusLozenge';
import toast from 'react-hot-toast';

/* ─── helpers ─── */
const fromAny = (t: string) => typedQuery(t);
const rpc = (fn: string) => typedRpc(fn);

interface DiagnosticResult {
  summary: Record<string, any> | null;
  chunksByTable: any[];
  sampleKeys: any[];
  schemaCheck: any[];
  columnCheck: any[];
  domainStats: any[];
  categories: any[];
  pages: any[];
  sourceTypeConstraint: any[];
}

/* ─── metric card ─── */
function MetricCard({ label, value, subtitle, icon: Icon, status }: {
  label: string; value: number | string; subtitle?: string;
  icon: React.ElementType; status: 'good' | 'warn' | 'bad' | 'neutral';
}) {
  const colors = {
    good: 'text-white bg-[#1B7F37]',
    warn: 'text-[#FF8B00] bg-[#FFF0B3]',
    bad: 'text-[#BF2600] bg-[#FFEBE6]',
    neutral: 'text-white bg-[#0C66E4]',
  };
  return (
    <div className="border border-[rgba(15,23,42,0.12)] dark:border-[#2E2E2E] rounded-md p-4 bg-white dark:bg-[#1A1A1A]">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded flex items-center justify-center ${colors[status]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wide text-[#44546F]">{label}</span>
      </div>
      <p className="text-2xl font-bold font-[var(--cp-font-mono,monospace)] text-[#0F172A]">{value}</p>
      {subtitle && <p className="text-xs text-[#44546F] mt-0.5">{subtitle}</p>}
    </div>
  );
}

/* ─── section wrapper ─── */
function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <section className="border border-[rgba(15,23,42,0.12)] dark:border-[#2E2E2E] rounded-md bg-white dark:bg-[#1A1A1A]">
      <div className="px-4 py-3 border-b border-[rgba(15,23,42,0.12)] flex items-center gap-2 bg-[#FAFBFC]">
        <Icon className="w-4 h-4 text-[#44546F]" />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#0F172A]">{title}</h3>
      </div>
      <div className="p-0">{children}</div>
    </section>
  );
}

/* ─── diagnostic table ─── */
function DiagTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#FAFBFC]">
            {headers.map((h, i) => (
              <th key={i} className="text-left px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#44546F] border-b border-[rgba(15,23,42,0.12)]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, ri) => (
            <tr key={ri} className="border-b border-[rgba(15,23,42,0.06)] h-9 hover:bg-[rgba(15,23,42,0.02)]">
              {cells.map((cell, ci) => (
                <td key={ci} className="px-4 py-1.5 font-[var(--cp-font-mono,monospace)] text-xs text-[#0F172A]">{cell}</td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={headers.length} className="px-4 py-6 text-center text-xs text-[#44546F]">No data</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ ok }: { ok: boolean }) {
  return ok
    ? <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#1B7F37] text-white"><CheckCircle2 className="w-3 h-3" /> EXISTS</span>
    : <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#FFEBE6] text-[#BF2600]"><XCircle className="w-3 h-3" /> MISSING</span>;
}

/* ═══════════════════════════════════════════════════ */
export default function WikiDiagnosticPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DiagnosticResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, chunksRes, keysRes, schemaRes, columnRes, constraintRes, domainsRes, categoriesRes, pagesRes] = await Promise.all([
        rpc('get_wiki_diagnostic_summary'),
        rpc('get_kb_chunks_summary'),
        rpc('get_kb_sample_keys'),
        rpc('get_schema_check'),
        rpc('get_column_check'),
        rpc('get_kb_source_type_check'),
        fromAny('wiki_domain_stats').select('*').order('sort_order'),
        fromAny('wiki_categories').select('id, domain_id, name, slug, sort_order').order('sort_order'),
        fromAny('wiki_pages').select('id, domain_code, slug, title, status, ai_confidence, version, updated_at').order('domain_code'),
      ]);

      setData({
        summary: summaryRes.data,
        chunksByTable: chunksRes.data || [],
        sampleKeys: keysRes.data || [],
        schemaCheck: schemaRes.data || [],
        columnCheck: columnRes.data || [],
        sourceTypeConstraint: constraintRes.data || [],
        domainStats: domainsRes.data || [],
        categories: categoriesRes.data || [],
        pages: pagesRes.data || [],
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { runDiagnostics(); }, [runDiagnostics]);

  const handleRetrySync = async () => {
    toast.loading('Triggering sync…', { id: 'sync' });
    try {
      const { error } = await supabase.functions.invoke('kb-sync', { body: { action: 'sync_all' } });
      if (error) throw error;
      toast.success('Sync triggered successfully', { id: 'sync' });
    } catch (e: any) {
      toast.error(`Sync failed: ${e.message}`, { id: 'sync' });
    }
  };

  const s = data?.summary || {};

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      {/* Header */}
      <div className="bg-white dark:bg-[#1A1A1A] border-b border-[rgba(15,23,42,0.12)] dark:border-[#2E2E2E] px-7 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Stethoscope className="w-6 h-6 text-[#7C3AED]" />
          <div>
            <h1 className="text-lg font-bold text-[#0F172A]">Wiki Pipeline Diagnostic</h1>
            <p className="text-xs text-[#44546F]">Live health checks against all wiki-related tables</p>
          </div>
        </div>
        <button
          onClick={runDiagnostics}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded bg-[#0747A6] text-white hover:bg-[#0052CC] disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Running…' : 'Re-run Diagnostics'}
        </button>
      </div>

      {error && (
        <div className="mx-7 mt-4 p-3 rounded bg-[#FFEBE6] text-[#BF2600] text-sm">{error}</div>
      )}

      <div className="px-7 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard label="KB Chunks" value={s.total_chunks ?? '—'} icon={Database}
            status={s.total_chunks > 0 ? 'good' : 'bad'} />
          <MetricCard label="Source Tables" value={s.source_tables ?? '—'} icon={Layers}
            status={(s.source_tables ?? 0) >= 5 ? 'good' : 'warn'} />
          <MetricCard label="Domains" value={s.domains ?? '—'} icon={FolderOpen}
            status={(s.domains ?? 0) === 9 ? 'good' : (s.domains ?? 0) > 0 ? 'warn' : 'bad'} />
          <MetricCard label="Categories" value={s.categories ?? '—'} icon={Columns3}
            status={(s.categories ?? 0) > 0 ? 'good' : 'bad'} />
          <MetricCard label="Wiki Pages" value={s.pages ?? '—'}
            subtitle={`${s.published_pages ?? 0} published`}
            icon={FileText}
            status={(s.pages ?? 0) > 0 ? 'good' : 'neutral'} />
          <MetricCard label="Documents" value={s.documents ?? '—'} icon={BookOpen}
            status={(s.documents ?? 0) > 0 ? 'good' : 'neutral'} />
        </div>

        {/* Sync Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <MetricCard label="Sync Runs" value={s.sync_runs ?? '—'} icon={Activity}
            status={(s.sync_runs ?? 0) > 0 ? 'good' : 'neutral'} />
          <MetricCard label="Last Sync" value={s.last_sync ? new Date(s.last_sync).toLocaleString() : '—'} icon={RefreshCw}
            status={s.last_sync ? 'good' : 'bad'} />
          <MetricCard label="Last Status" value={s.last_sync_status ?? '—'} icon={BarChart3}
            status={s.last_sync_status === 'complete' ? 'good' : s.last_sync_status === 'partial' ? 'warn' : 'bad'} />
        </div>

        {/* A: Schema Health */}
        <Section title="Schema Health — Table Existence" icon={Table2}>
          <DiagTable
            headers={['Table', 'Status', 'Rows']}
            rows={(data?.schemaCheck || []).map((r: any) => [
              r.table_name,
              <StatusBadge ok={r.status === 'exists'} />,
              <span className="font-mono">{Number(r.row_count).toLocaleString()}</span>,
            ])}
          />
        </Section>

        {/* B: Column Check */}
        <Section title="Column Check — Sync Dependencies" icon={Columns3}>
          <DiagTable
            headers={['Table', 'Column', 'Status', 'Type']}
            rows={(data?.columnCheck || []).map((r: any) => [
              r.tbl,
              <code className="text-[11px] bg-[#F4F5F7] px-1.5 py-0.5 rounded">{r.col}</code>,
              <StatusBadge ok={r.status === 'exists'} />,
              r.data_type,
            ])}
          />
        </Section>

        {/* Source Type Constraint */}
        <Section title="Source Type Constraint" icon={Activity}>
          <DiagTable
            headers={['Constraint', 'Allowed Values']}
            rows={(data?.sourceTypeConstraint || []).map((r: any) => [
              r.constraint_name,
              <code className="text-[11px] bg-[#F4F5F7] px-1.5 py-0.5 rounded break-all">{r.allowed_values}</code>,
            ])}
          />
        </Section>

        {/* C: KB Embeddings by Source */}
        <Section title="KB Embeddings by Source" icon={Database}>
          <DiagTable
            headers={['Source Table', 'Chunk Type', 'Chunks', 'Unique URLs']}
            rows={(data?.chunksByTable || []).map((r: any) => [
              r.source_table,
              r.chunk_type_val,
              Number(r.chunk_count).toLocaleString(),
              Number(r.unique_urls).toLocaleString(),
            ])}
          />
        </Section>

        {/* D: Sample Source Keys */}
        <Section title="Sample Source Keys (Top 30)" icon={Layers}>
          <DiagTable
            headers={['Source Table', 'Source Key', 'Chunks', 'Preview']}
            rows={(data?.sampleKeys || []).map((r: any) => [
              r.source_table,
              <span className="max-w-[200px] truncate block">{r.source_key}</span>,
              r.chunks,
              <span className="max-w-[300px] truncate block text-[#44546F]">{(r.preview || '').substring(0, 80)}</span>,
            ])}
          />
        </Section>

        {/* E: Wiki Domain Stats */}
        <Section title="Wiki Domain Stats" icon={FolderOpen}>
          <DiagTable
            headers={['Code', 'Name', 'Articles', 'Documents', 'Last Updated']}
            rows={(data?.domainStats || []).map((r: any) => [
              <code className="text-[11px] bg-[#F4F5F7] px-1.5 py-0.5 rounded">{r.domain_code}</code>,
              r.domain_name || r.name,
              r.article_count ?? 0,
              r.document_count ?? 0,
              r.updated_at ? new Date(r.updated_at).toLocaleDateString() : '—',
            ])}
          />
        </Section>

        {/* F: Wiki Categories */}
        <Section title="Wiki Categories" icon={Columns3}>
          <DiagTable
            headers={['Domain ID', 'Category', 'Slug']}
            rows={(data?.categories || []).map((r: any) => [
              r.domain_id?.substring(0, 8) + '…',
              r.name,
              <code className="text-[11px]">{r.slug}</code>,
            ])}
          />
        </Section>

        {/* G: Wiki Pages */}
        <Section title="Wiki Pages" icon={FileText}>
          {(data?.pages || []).length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[#44546F]">No wiki articles generated yet.</div>
          ) : (
            <DiagTable
              headers={['Domain', 'Slug', 'Title', 'Status', 'Confidence', 'Version', 'Updated']}
              rows={(data?.pages || []).map((r: any) => [
                r.domain_code,
                <code className="text-[11px]">{r.slug}</code>,
                <span className="max-w-[200px] truncate block">{r.title}</span>,
                <StatusLozenge status={r.status || 'draft'} />,
                <span className={r.ai_confidence < 0.8 ? 'text-[#BF2600] font-bold' : 'text-white'}>
                  {(r.ai_confidence * 100).toFixed(0)}%
                </span>,
                r.version,
                r.updated_at ? new Date(r.updated_at).toLocaleDateString() : '—',
              ])}
            />
          )}
        </Section>

        {/* H: Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleRetrySync}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded bg-[#0747A6] text-white hover:bg-[#0052CC]"
          >
            <Play className="w-4 h-4" /> Retry Sync
          </button>
          <button
            onClick={() => { runDiagnostics(); toast.success('Diagnostics refreshed'); }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded border border-[rgba(15,23,42,0.12)] dark:border-[#2E2E2E] bg-white dark:bg-[#1A1A1A] text-[#0F172A] hover:bg-[#F4F5F7]"
          >
            <Wrench className="w-4 h-4" /> Refresh All
          </button>
        </div>
      </div>
    </div>
  );
}
