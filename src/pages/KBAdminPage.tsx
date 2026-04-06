import React, { useState, useEffect, useCallback } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { useKBAdmin } from '@/hooks/useKnowledgeBase';
import { fetchQueryLogs, fetchSources, fetchAccessMatrix, type KBQueryLogEntry, type KBSource } from '@/services/knowledgeBase';
import { supabase } from '@/integrations/supabase/client';
import { Shield, FileText, Lock, RefreshCw, Zap, FolderOpen, Globe, Brain, ThumbsUp, ThumbsDown, Keyboard, Mic, Check, X as XIcon, Activity, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { AutoSyncCard } from '@/components/shared/AutoSyncCard';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

/* ═══════════════════════════════════════════
   TAB DEFINITIONS
   ═══════════════════════════════════════════ */

const TABS = [
  { key: 'health', label: 'Health', icon: '💚' },
  { key: 'logs', label: 'Query Log', icon: '📝' },
  { key: 'access', label: 'Access Matrix', icon: '🔐' },
  { key: 'sync', label: 'Sync Config', icon: '🔄' },
  { key: 'pipeline', label: 'Pipeline', icon: '⚡' },
  { key: 'projects', label: 'Projects', icon: '📁' },
  { key: 'sources', label: 'Sources', icon: '🌐' },
  { key: 'training', label: 'Training', icon: '🧠' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

/* ═══════════════════════════════════════════
   SHARED STYLES
   ═══════════════════════════════════════════ */
const card = 'bg-white dark:bg-[#1A1A1A] border border-zinc-200 dark:border-[#2E2E2E] rounded-lg p-5 shadow-sm';
const badge = (color: string) =>
  `inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${color}`;

function ConfidenceBadge({ v }: { v: number | null }) {
  if (v == null) return <span className="text-zinc-400 text-xs">—</span>;
  const pct = Math.round(v * 100);
  const color = pct >= 85 ? 'text-emerald-600' : pct >= 70 ? 'text-amber-600' : 'text-red-600';
  return <span className={`text-xs font-semibold ${color}`}>{pct}%</span>;
}

/* ═══════════════════════════════════════════
   TAB 0: HEALTH — KB Readiness Dashboard
   ═══════════════════════════════════════════ */

interface HealthCheck {
  label: string;
  description: string;
  status: 'pass' | 'warn' | 'fail' | 'loading';
  detail: string;
}

function HealthTab() {
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState<{ done: number; total: number; currentCategory: string; alreadyDone: number } | null>(null);
  const [warmingCache, setWarmingCache] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [ingestProgress, setIngestProgress] = useState<{ done: number; total: number } | null>(null);

  const runChecks = useCallback(async () => {
    setLoading(true);
    const results: HealthCheck[] = [];

    try {
      // 1. Training Questions — paginate to overcome 1000-row limit
      let tq: any[] = [];
      let from = 0;
      const step = 999;
      while (true) {
        const { data } = await supabase.from('kb_training_questions').select('id, is_embedded, expected_answer').range(from, from + step);
        if (!data || data.length === 0) break;
        tq = tq.concat(data);
        if (data.length < step + 1) break;
        from += step + 1;
      }
      const totalQ = tq.length;
      const embeddedQ = tq.filter((q: any) => q.is_embedded).length;
      const withAnswers = tq.filter((q: any) => q.expected_answer && q.expected_answer.trim() !== '').length;

      results.push({
        label: 'Training Questions Loaded',
        description: 'Total Q&A pairs ingested into the training set',
        status: totalQ >= 100 ? 'pass' : totalQ > 0 ? 'warn' : 'fail',
        detail: `${totalQ.toLocaleString()} questions loaded`,
      });

      results.push({
        label: 'Questions Vectorized',
        description: 'Training questions with embeddings generated for semantic search',
        status: embeddedQ === totalQ && totalQ > 0 ? 'pass' : embeddedQ > 0 ? 'warn' : 'fail',
        detail: `${embeddedQ.toLocaleString()} / ${totalQ.toLocaleString()} embedded (${totalQ > 0 ? Math.round((embeddedQ / totalQ) * 100) : 0}%)`,
      });

      results.push({
        label: 'Expected Answers Populated',
        description: 'Questions that have expected answers for direct response matching',
        status: withAnswers === totalQ && totalQ > 0 ? 'pass' : withAnswers > 0 ? 'warn' : 'fail',
        detail: `${withAnswers.toLocaleString()} / ${totalQ.toLocaleString()} have answers (${totalQ > 0 ? Math.round((withAnswers / totalQ) * 100) : 0}%)`,
      });

      // 2. KB Embeddings (RAG chunks) — separate from training question embeddings
      const { count: embCount } = await supabase.from('kb_embeddings').select('id', { count: 'exact', head: true });
      const embedTotal = embCount || 0;
      results.push({
        label: 'RAG Content Chunks Indexed',
        description: 'Source documents (PDFs, web pages, policies) chunked and vectorized for retrieval. This is separate from training question embeddings — requires ingesting documents via Sources tab.',
        status: embedTotal >= 50 ? 'pass' : 'warn',
        detail: embedTotal > 0 ? `${embedTotal.toLocaleString()} chunks in vector store` : 'Optional — No source documents ingested. Training questions provide primary coverage. Use Sources tab to add supplementary documents.',
      });

      // 3. Sources configured
      const { data: sources } = await supabase.from('kb_sources').select('id, is_active, source_type');
      const totalSources = sources?.length || 0;
      const activeSources = sources?.filter((s: any) => s.is_active).length || 0;
      results.push({
        label: 'Knowledge Sources Active',
        description: 'External and internal data sources feeding the knowledge base',
        status: activeSources >= 3 ? 'pass' : activeSources > 0 ? 'warn' : 'fail',
        detail: `${activeSources} active / ${totalSources} total sources`,
      });

      // 4. Cache layer
      const { count: cacheCount } = await supabase.from('kb_cache').select('id', { count: 'exact', head: true });
      const cacheTotal = cacheCount || 0;
      results.push({
        label: 'Response Cache',
        description: 'Cached query-response pairs for faster repeated lookups',
        status: cacheTotal > 0 ? 'pass' : 'warn',
        detail: cacheTotal > 0 ? `${cacheTotal.toLocaleString()} cached responses` : 'Empty — will populate as users query',
      });

      // 5. Access matrix
      const { count: matrixCount } = await supabase.from('kb_access_matrix').select('id', { count: 'exact', head: true });
      const matrixTotal = matrixCount || 0;
      results.push({
        label: 'Access Matrix Configured',
        description: 'Role-based access rules governing knowledge module visibility',
        status: matrixTotal >= 10 ? 'pass' : matrixTotal > 0 ? 'warn' : 'fail',
        detail: `${matrixTotal} access rules defined`,
      });

      // 6. Query log (usage indicator)
      const { count: logCount } = await supabase.from('kb_query_log').select('id', { count: 'exact', head: true });
      const logTotal = logCount || 0;
      results.push({
        label: 'Query Activity',
        description: 'Historical queries logged — indicates the KB is being used',
        status: logTotal > 0 ? 'pass' : 'warn',
        detail: logTotal > 0 ? `${logTotal.toLocaleString()} queries logged` : 'No queries yet — KB has not been used',
      });

    } catch (err: any) {
      results.push({
        label: 'System Error',
        description: 'Failed to complete health checks',
        status: 'fail',
        detail: err.message || 'Unknown error',
      });
    }

    setChecks(results);
    setLoading(false);
    setLastRefresh(new Date());
  }, []);

  useEffect(() => { runChecks(); }, [runChecks]);

  // Generate answers for all training questions
  const handleGenerateAnswers = useCallback(async () => {
    setGenerating(true);
    const BATCH = 50;
    let totalDone = 0;

    try {
      const { count: totalCount } = await supabase
        .from('kb_training_questions')
        .select('*', { count: 'exact', head: true });
      const { count: withAnswersCount } = await supabase
        .from('kb_training_questions')
        .select('*', { count: 'exact', head: true })
        .not('expected_answer', 'is', null)
        .neq('expected_answer', '');

      const total = totalCount || 0;
      const alreadyDone = withAnswersCount || 0;
      const remaining = total - alreadyDone;

      setGenProgress({ done: 0, total: total, currentCategory: 'Starting...', alreadyDone });

      if (remaining === 0) {
        toast.success('All questions already have answers!');
        setGenerating(false);
        setGenProgress(null);
        return;
      }

      for (let i = 0; i < 20 && totalDone < remaining; i++) {
        const res = await supabase.functions.invoke('kb-generate-answers', {
          body: { action: 'generate_batch', batch_size: BATCH },
        });

        if (res.error) throw new Error(res.error.message);
        const generated = res.data?.generated || 0;
        if (generated === 0) break;

        totalDone += generated;
        setGenProgress({
          done: totalDone,
          total: total,
          currentCategory: `Batch ${i + 1} complete — ${generated} answers generated`,
          alreadyDone,
        });

        if (totalDone < remaining) {
          await new Promise(r => setTimeout(r, 500));
        }
      }

      toast.success(`Generated ${totalDone} answers successfully!`);
      runChecks();
    } catch (err: any) {
      toast.error(`Error generating answers: ${err.message}`);
    } finally {
      setGenerating(false);
      setGenProgress(null);
    }
  }, [runChecks]);

  // Warm cache from training answers
  const handleWarmCache = useCallback(async () => {
    setWarmingCache(true);
    try {
      const res = await supabase.functions.invoke('kb-train', {
        body: { action: 'warm_cache' },
      });
      if (res.error) throw new Error(res.error.message);
      toast.success(res.data.message || 'Cache warmed successfully!');
      runChecks();
    } catch (err: any) {
      toast.error(`Cache warm failed: ${err.message}`);
    } finally {
      setWarmingCache(false);
    }
  }, [runChecks]);

  // Build RAG index from training Q&A
  const handleBuildRAGIndex = useCallback(async () => {
    setIngesting(true);
    let totalIngested = 0;

    try {
      // First get count of training questions with answers
      const { count: qaCount } = await supabase
        .from('kb_training_questions')
        .select('*', { count: 'exact', head: true })
        .not('expected_answer', 'is', null)
        .neq('expected_answer', '');

      const total = qaCount || 0;
      setIngestProgress({ done: 0, total });

      // Process in pages of training questions (not by newly ingested chunks)
      let offset = 0;
      let processed = 0;
      for (let i = 0; i < 100; i++) {
        const res = await supabase.functions.invoke('kb-ingest', {
          body: { action: 'ingest_training', batch_size: 100, offset },
        });

        if (res.error) throw new Error(res.error.message);
        const ingested = res.data?.ingested || 0;
        const batchProcessed = res.data?.batch_processed || 0;

        totalIngested += ingested;
        processed += batchProcessed;
        offset += batchProcessed;
        setIngestProgress({ done: Math.min(processed, total), total });

        if (batchProcessed === 0 || (res.data?.remaining ?? 0) === 0) break;
        await new Promise(r => setTimeout(r, 350));
      }

      toast.success(`RAG index built — ${totalIngested} chunks ingested!`);
      runChecks();
    } catch (err: any) {
      toast.error(`RAG ingest failed: ${err.message}`);
    } finally {
      setIngesting(false);
      setIngestProgress(null);
    }
  }, [runChecks]);
  const passCount = checks.filter(c => c.status === 'pass').length;
  const warnCount = checks.filter(c => c.status === 'warn').length;
  const failCount = checks.filter(c => c.status === 'fail').length;
  const totalChecks = checks.length;
  // Weighted score: pass=100, warn=50, fail=0
  const overallScore = totalChecks > 0 ? Math.round(((passCount * 100) + (warnCount * 50)) / totalChecks) : 0;
  const overallStatus = failCount > 0 ? 'fail' : warnCount > 0 ? 'warn' : 'pass';

  const statusIcon = (s: string) => {
    switch (s) {
      case 'pass': return <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />;
      case 'warn': return <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />;
      case 'fail': return <XCircle size={18} className="text-red-500 flex-shrink-0" />;
      default: return <RefreshCw size={18} className="animate-spin text-zinc-400 flex-shrink-0" />;
    }
  };

  const overallColor = overallStatus === 'pass' ? 'text-emerald-600' : overallStatus === 'warn' ? 'text-amber-600' : 'text-red-600';
  const overallBg = overallStatus === 'pass' ? 'bg-emerald-50 border-emerald-200' : overallStatus === 'warn' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';
  const overallLabel = overallStatus === 'pass' ? 'All Systems Operational' : overallStatus === 'warn' ? 'Partially Ready — Action Needed' : 'Not Ready — Critical Issues';

  // Determine which actions are needed
  const answersCheck = checks.find(c => c.label.includes('Answers'));
  const cacheCheck = checks.find(c => c.label === 'Response Cache');
  const ragCheck = checks.find(c => c.label.includes('RAG'));
  const needsAnswers = answersCheck && answersCheck.status !== 'pass';
  const needsCache = cacheCheck && cacheCheck.status !== 'pass';
  const needsRAG = ragCheck && ragCheck.status !== 'pass';

  return (
    <div className="space-y-5">
      {/* Overall score banner */}
      <div className={`${overallBg} border rounded-xl p-6 flex items-center justify-between`}>
        <div className="flex items-center gap-4">
          <div className={`text-4xl font-bold font-mono ${overallColor}`}>
            {loading ? '...' : `${overallScore}%`}
          </div>
          <div>
            <h2 className={`text-base font-bold ${overallColor}`}>{loading ? 'Checking...' : overallLabel}</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {passCount} passed · {warnCount} warnings · {failCount} failed — Last checked {lastRefresh.toLocaleTimeString()}
            </p>
          </div>
        </div>
        <button
          onClick={runChecks}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-[#1A1A1A] border border-zinc-200 dark:border-[#2E2E2E] rounded-lg text-xs font-semibold text-zinc-700 dark:text-[#A1A1A1] hover:bg-zinc-50 dark:hover:bg-[#1A1A1A] transition-colors disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Re-check
        </button>
      </div>

      {/* Active generation progress */}
      {generating && genProgress && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <RefreshCw size={16} className="animate-spin text-blue-600" />
            <span className="text-sm font-bold text-blue-800">Generating Expected Answers...</span>
          </div>
          <div className="w-full bg-blue-100 rounded-full h-3 mb-2">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${genProgress.total > 0 ? Math.round(((genProgress.alreadyDone + genProgress.done) / genProgress.total) * 100) : 0}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-blue-700">
            <span>{genProgress.currentCategory}</span>
            <span className="font-mono font-semibold">
              {(genProgress.alreadyDone + genProgress.done).toLocaleString()} / {genProgress.total.toLocaleString()} ({genProgress.total > 0 ? Math.round(((genProgress.alreadyDone + genProgress.done) / genProgress.total) * 100) : 0}%)
            </span>
          </div>
          {genProgress.alreadyDone > 0 && (
            <p className="text-[11px] text-blue-500 mt-1">{genProgress.alreadyDone.toLocaleString()} previously generated · {genProgress.done.toLocaleString()} new this session</p>
          )}
        </div>
      )}

      {/* RAG Index build progress */}
      {ingesting && ingestProgress && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <RefreshCw size={16} className="animate-spin text-indigo-600" />
            <span className="text-sm font-bold text-indigo-800">Building RAG Index...</span>
          </div>
          <div className="w-full bg-indigo-100 rounded-full h-3 mb-2">
            <div
              className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${ingestProgress.total > 0 ? Math.round((ingestProgress.done / ingestProgress.total) * 100) : 0}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-indigo-700">
            <span>Chunking & embedding training Q&A into vector store</span>
            <span className="font-mono font-semibold">
              {ingestProgress.done.toLocaleString()} / {ingestProgress.total.toLocaleString()} chunks
            </span>
          </div>
        </div>
      )}

      <div className={card}>
        <h3 className="text-sm font-bold text-zinc-800 mb-1">Pipeline Readiness</h3>
        <p className="text-xs text-zinc-500 mb-4">The 4-layer RAG pipeline requires all components to be operational for full KB functionality</p>
        <div className="flex items-center gap-2 mb-4">
          {['Training Data', 'Vectorization', 'RAG Index', 'Response Layer'].map((stage, i) => {
            const stageStatus = !loading && checks.length > 0
              ? (i === 0 ? (checks[0]?.status) 
                 : i === 1 ? (checks[1]?.status)
                 : i === 2 ? (checks[3]?.status)
                 : (checks[4]?.status)) || 'loading'
              : 'loading';
            const colors = {
              pass: 'bg-emerald-500 text-white',
              warn: 'bg-amber-400 text-white',
              fail: 'bg-red-400 text-white',
              loading: 'bg-zinc-200 text-zinc-500',
            };
            return (
              <React.Fragment key={stage}>
                {i > 0 && <div className={`h-0.5 w-8 ${stageStatus === 'pass' ? 'bg-emerald-400' : 'bg-zinc-200'}`} />}
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold ${colors[stageStatus]}`}>
                  {stageStatus === 'pass' ? <Check size={12} /> : stageStatus === 'fail' ? <XIcon size={12} /> : null}
                  {stage}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Individual checks */}
      <div className={card}>
        <h3 className="text-sm font-bold text-zinc-800 mb-4">Detailed Health Checks</h3>
        <div className="space-y-0">
          {checks.map((check, i) => (
            <div key={i} className={`flex items-start gap-3 py-3 ${i < checks.length - 1 ? 'border-b border-zinc-100' : ''}`}>
              {statusIcon(check.status)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-800">{check.label}</span>
                  <span className={badge(
                    check.status === 'pass' ? 'bg-emerald-50 text-emerald-700' :
                    check.status === 'warn' ? 'bg-amber-50 text-amber-700' :
                    'bg-red-50 text-red-700'
                  )}>
                    {check.status === 'pass' ? 'PASS' : check.status === 'warn' ? 'WARNING' : 'FAIL'}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">{check.description}</p>
                <p className="text-xs font-mono text-zinc-600 mt-1 bg-zinc-50 rounded px-2 py-1 inline-block">{check.detail}</p>
              </div>
            </div>
          ))}
          {loading && checks.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="animate-spin text-zinc-400 mr-2" size={16} />
              <span className="text-sm text-zinc-500">Running health checks...</span>
            </div>
          )}
        </div>
      </div>

      {/* Action panel */}
      {!loading && (failCount + warnCount > 0) && (
        <div className={card}>
          <h3 className="text-sm font-bold text-zinc-800 mb-4">🔧 Fix Issues</h3>
          <div className="space-y-3">
            {needsAnswers && (
              <div className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-zinc-800">Generate Expected Answers</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Use AI to generate answers for all {checks[0]?.detail?.match(/[\d,]+/)?.[0] || ''} training questions. This enables Layer 2 (Training Match) of the RAG pipeline.</p>
                </div>
                <button
                  onClick={handleGenerateAnswers}
                  disabled={generating}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {generating ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} />}
                  {generating ? 'Generating...' : 'Generate All Answers'}
                </button>
              </div>
            )}

            {needsCache && !needsAnswers && (
              <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-100 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-zinc-800">Warm Response Cache</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Pre-populate the cache with top training question answers for faster query response.</p>
                </div>
                <button
                  onClick={handleWarmCache}
                  disabled={warmingCache}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {warmingCache ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} />}
                  {warmingCache ? 'Warming...' : 'Warm Cache'}
                </button>
              </div>
            )}

            {needsRAG && !needsAnswers && (
              <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-zinc-800">Build RAG Index</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Convert your {checks.find(c => c.label.includes('Answers'))?.detail?.match(/[\d,]+/)?.[0] || ''} training Q&A pairs into vector chunks for semantic retrieval (Layer 3).</p>
                </div>
                <button
                  onClick={handleBuildRAGIndex}
                  disabled={ingesting}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {ingesting ? <RefreshCw size={13} className="animate-spin" /> : <Brain size={13} />}
                  {ingesting ? 'Building...' : 'Build RAG Index'}
                </button>
              </div>
            )}

            {/* Guidance items */}
            {checks.filter(c => (c.status === 'fail' || c.status === 'warn') && !c.label.includes('Answers') && c.label !== 'Response Cache').map((c, i) => (
              <div key={i} className="flex items-start gap-2 text-xs p-3 bg-zinc-50 rounded-lg">
                <span className={c.status === 'fail' ? 'text-red-500' : 'text-amber-500'}>
                  {c.status === 'fail' ? '🔴' : '🟡'}
                </span>
                <div>
                  <span className="font-semibold text-zinc-700">{c.label}:</span>{' '}
                  <span className="text-zinc-600">
                    {c.label.includes('RAG') && 'Ingest source documents into kb_embeddings via the Sources or Pipeline tab.'}
                    {c.label.includes('Vectorized') && 'Run "Embed All" from the Training tab to generate embeddings for remaining questions.'}
                    {c.label.includes('Training') && c.status === 'fail' && 'Import training questions from the Training tab.'}
                    {c.label.includes('Sources') && 'Add and activate more knowledge sources from the Sources tab.'}
                    {c.label.includes('Access') && 'Configure role-based access rules in the Access Matrix tab.'}
                    {c.label.includes('Query') && 'No queries logged yet. The KB needs to be used to generate activity.'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Automated Sync */}
      <AutoSyncCard
        scheduleKeys={['kb-daily-sync', 'kb-weekly-cleanup']}
        lastSyncTable="kb_embeddings"
        lastSyncColumn="updated_at"
        title="Automated KB Sync"
      />
    </div>
  );
}

/* ═══════════════════════════════════════════
   TAB 1: QUERY LOG — with Training Capture
   ═══════════════════════════════════════════ */
function QueryLogTab() {
  const [logs, setLogs] = useState<KBQueryLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{ lang: string; method: string; helpful: string; answered: string }>({
    lang: 'all', method: 'all', helpful: 'all', answered: 'all',
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draftAnswer, setDraftAnswer] = useState('');
  const [draftCategory, setDraftCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [trainedIds, setTrainedIds] = useState<Set<string>>(new Set());

  const loadLogs = useCallback(() => {
    setLoading(true);
    fetchQueryLogs(200).then(setLogs).catch(() => toast.error('Failed to load logs')).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const filtered = logs.filter((l) => {
    if (filter.lang !== 'all' && l.language !== filter.lang) return false;
    if (filter.method !== 'all' && l.input_method !== filter.method) return false;
    if (filter.helpful === 'yes' && l.was_helpful !== true) return false;
    if (filter.helpful === 'no' && l.was_helpful !== false) return false;
    if (filter.helpful === 'none' && l.was_helpful !== null) return false;
    if (filter.answered === 'unanswered' && l.was_answered !== false) return false;
    if (filter.answered === 'low' && (l.confidence_score == null || l.confidence_score >= 0.7)) return false;
    if (filter.answered === 'answered' && l.was_answered !== true) return false;
    return true;
  });

  const needsTraining = (log: KBQueryLogEntry) =>
    !log.was_answered || (log.confidence_score != null && log.confidence_score < 0.5);

  const handleExpand = (log: KBQueryLogEntry) => {
    if (expandedId === log.id) {
      setExpandedId(null);
      setDraftAnswer('');
      setDraftCategory('');
    } else {
      setExpandedId(log.id);
      setDraftAnswer('');
      setDraftCategory(log.matched_category || '');
    }
  };

  const handleSubmitTraining = async (log: KBQueryLogEntry) => {
    if (!draftAnswer.trim()) { toast.error('Please provide an answer'); return; }
    setSubmitting(true);
    try {
      const { data: maxQ } = await supabase.from('kb_training_questions')
        .select('question_number').order('question_number', { ascending: false }).limit(1).single();
      const nextNum = (maxQ?.question_number || 0) + 1;

      const { error: insertErr } = await supabase.from('kb_training_questions').insert({
        question_number: nextNum,
        question: log.query_text,
        expected_answer: draftAnswer.trim(),
        category: draftCategory.trim() || 'User Query',
        language: log.language || 'en',
        is_embedded: false,
      });
      if (insertErr) throw insertErr;

      await supabase.from('kb_cache').delete().eq('query_text', log.query_text);

      toast.success(`Training question #${nextNum} created! Run "Embed All" from Health tab to vectorize.`);
      setTrainedIds((prev) => new Set(prev).add(log.id));
      setExpandedId(null);
      setDraftAnswer('');
      setDraftCategory('');
    } catch (err: any) {
      toast.error(`Failed to create training entry: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const unansweredCount = logs.filter(l => !l.was_answered).length;
  const lowConfCount = logs.filter(l => l.was_answered && l.confidence_score != null && l.confidence_score < 0.5).length;

  if (loading) return <div className="flex justify-center py-16"><RefreshCw className="animate-spin text-zinc-400" size={24} /></div>;

  return (
    <div className="space-y-4">
      {/* Training opportunity banner */}
      {(unansweredCount > 0 || lowConfCount > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Training Opportunities Detected</p>
            <p className="text-xs text-amber-700 mt-1">
              {unansweredCount > 0 && <><strong>{unansweredCount}</strong> unanswered queries. </>}
              {lowConfCount > 0 && <><strong>{lowConfCount}</strong> low-confidence responses. </>}
              Expand a row to provide an answer and push it to the training pipeline.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Filters</span>
        <select value={filter.lang} onChange={(e) => setFilter((f) => ({ ...f, lang: e.target.value }))} className="text-xs border border-zinc-200 rounded px-2 py-1">
          <option value="all">All Languages</option><option value="en">EN</option>
        </select>
        <select value={filter.method} onChange={(e) => setFilter((f) => ({ ...f, method: e.target.value }))} className="text-xs border border-zinc-200 rounded px-2 py-1">
          <option value="all">All Methods</option><option value="keyboard">Keyboard</option><option value="voice">Voice</option>
        </select>
        <select value={filter.helpful} onChange={(e) => setFilter((f) => ({ ...f, helpful: e.target.value }))} className="text-xs border border-zinc-200 rounded px-2 py-1">
          <option value="all">All Feedback</option><option value="yes">Helpful</option><option value="no">Not Helpful</option><option value="none">No Feedback</option>
        </select>
        <select value={filter.answered} onChange={(e) => setFilter((f) => ({ ...f, answered: e.target.value }))} className="text-xs border border-zinc-200 rounded px-2 py-1">
          <option value="all">All Status</option>
          <option value="unanswered">❌ Unanswered</option>
          <option value="low">⚠️ Low Confidence (&lt;50%)</option>
          <option value="answered">✅ Answered</option>
        </select>
        <button onClick={loadLogs} className="text-xs px-2 py-1 border border-zinc-200 rounded hover:bg-zinc-50 flex items-center gap-1">
          <RefreshCw size={11} /> Refresh
        </button>
        <span className="ml-auto text-xs text-zinc-400">{filtered.length} of {logs.length} entries</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-zinc-200">
        <table className="min-w-full text-xs">
          <thead className="bg-zinc-50">
            <tr>
              {['', 'Time', 'User', 'Query', 'Lang', 'Method', 'Category', 'Confidence', 'Speed', 'Cache', 'Helpful', 'Action'].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-semibold text-zinc-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.map((log) => {
              const isNeedsTrain = needsTraining(log);
              const isTrained = trainedIds.has(log.id);
              const isExpanded = expandedId === log.id;

              return (
                <React.Fragment key={log.id}>
                  <tr className={`hover:bg-zinc-50/50 ${isNeedsTrain && !isTrained ? 'bg-amber-50/30' : ''}`}>
                    <td className="px-2 py-2 w-6">
                      {isNeedsTrain && !isTrained && <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" title="Needs training" />}
                      {isTrained && <CheckCircle2 size={13} className="text-emerald-500" />}
                    </td>
                    <td className="px-3 py-2 text-zinc-500 whitespace-nowrap">{log.created_at ? formatDistanceToNow(new Date(log.created_at), { addSuffix: true }) : '—'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="font-medium text-zinc-700">{log.user_name || '—'}</span>
                      {log.user_role && <span className={badge('bg-zinc-100 text-zinc-600 ml-1')}>{log.user_role}</span>}
                    </td>
                    <td className="px-3 py-2 max-w-[260px] truncate text-zinc-700">{log.query_text}</td>
                    <td className="px-3 py-2"><span className={badge('bg-blue-50 text-blue-700')}>{log.language || 'en'}</span></td>
                    <td className="px-3 py-2">{log.input_method === 'voice' ? <Mic size={13} className="text-violet-500" /> : <Keyboard size={13} className="text-zinc-400" />}</td>
                    <td className="px-3 py-2">{log.matched_category ? <span className={badge('bg-blue-50 text-blue-700')}>{log.matched_category}</span> : <span className="text-zinc-300">—</span>}</td>
                    <td className="px-3 py-2"><ConfidenceBadge v={log.confidence_score} /></td>
                    <td className="px-3 py-2 text-zinc-500 whitespace-nowrap">{log.response_time_ms ?? '—'}ms</td>
                    <td className="px-3 py-2">{log.cache_hit ? <Check size={13} className="text-emerald-500" /> : <XIcon size={13} className="text-zinc-300" />}</td>
                    <td className="px-3 py-2">
                      {log.was_helpful === true && <ThumbsUp size={13} className="text-emerald-500" />}
                      {log.was_helpful === false && <ThumbsDown size={13} className="text-red-500" />}
                      {log.was_helpful == null && <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      {isTrained ? (
                        <span className={badge('bg-emerald-50 text-emerald-700')}>Trained</span>
                      ) : isNeedsTrain ? (
                        <button
                          onClick={() => handleExpand(log)}
                          className="px-2 py-1 text-[10px] font-semibold rounded bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors"
                        >
                          {isExpanded ? 'Close' : '📝 Capture'}
                        </button>
                      ) : (
                        <span className="text-zinc-300 text-[10px]">—</span>
                      )}
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr>
                      <td colSpan={12} className="px-0 py-0">
                        <div className="bg-blue-50/60 border-t border-b border-blue-100 px-6 py-4 space-y-3">
                          <div className="flex items-start gap-3">
                            <Brain size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <h4 className="text-sm font-bold text-zinc-800">Train KB on this query</h4>
                              <p className="text-xs text-zinc-500 mt-0.5">
                                Provide the correct answer below. Once confirmed, it will be added to the training set and available after the next embedding run.
                              </p>
                            </div>
                          </div>

                          <div className="bg-white dark:bg-[#1A1A1A] rounded-lg border border-zinc-200 dark:border-[#2E2E2E] p-3">
                            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">User Question</p>
                            <p className="text-sm text-zinc-800 font-medium">{log.query_text}</p>
                          </div>

                          <div>
                            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide block mb-1">Category</label>
                            <input
                              type="text"
                              value={draftCategory}
                              onChange={(e) => setDraftCategory(e.target.value)}
                              placeholder="e.g. Person & Resource, Work Item Status..."
                              className="w-full text-xs border border-zinc-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide block mb-1">Expected Answer</label>
                            <textarea
                              value={draftAnswer}
                              onChange={(e) => setDraftAnswer(e.target.value)}
                              rows={4}
                              placeholder="Type the correct, concise answer for this question. 2-4 sentences recommended."
                              className="w-full text-xs border border-zinc-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none resize-y"
                            />
                            <p className="text-[10px] text-zinc-400 mt-1">{draftAnswer.trim().split(/\s+/).filter(Boolean).length} words</p>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => handleSubmitTraining(log)}
                              disabled={submitting || !draftAnswer.trim()}
                              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                              {submitting ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
                              {submitting ? 'Saving...' : 'Confirm & Add to Training'}
                            </button>
                            <button
                              onClick={() => { setExpandedId(null); setDraftAnswer(''); setDraftCategory(''); }}
                              className="px-3 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-800 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-zinc-400 text-sm">
          {logs.length === 0 ? 'No query logs yet. Queries will appear here after users interact with the KB.' : 'No logs match the current filters.'}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   TAB 2: ACCESS MATRIX
   ═══════════════════════════════════════════ */
function AccessMatrixTab() {
  const [matrix, setMatrix] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetchAccessMatrix().then(setMatrix).catch(() => toast.error('Failed to load matrix')).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const roles = [...new Set(matrix.map((m: any) => m.role_name))].sort();
  const modules = [...new Set(matrix.map((m: any) => m.module_name))].sort();

  const getAccess = (role: string, mod: string) => matrix.find((m: any) => m.role_name === role && m.module_name === mod);

  const toggleAccess = async (role: string, mod: string) => {
    const current = getAccess(role, mod);
    const newVal = !(current?.has_access);
    try {
      if (current) {
        await supabase.from('kb_access_matrix').update({ has_access: newVal }).eq('id', current.id);
      } else {
        await supabase.from('kb_access_matrix').insert({ role_name: role, module_name: mod, has_access: newVal });
      }
      load();
    } catch { toast.error('Update failed'); }
  };

  const enabledCount = matrix.filter((m: any) => m.has_access).length;

  if (loading) return <div className="flex justify-center py-16"><RefreshCw className="animate-spin text-zinc-400" size={24} /></div>;

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-zinc-200">
        <table className="min-w-full text-xs">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-zinc-500 sticky left-0 bg-zinc-50 z-10">Role</th>
              {modules.map((mod) => (
                <th key={mod} className="px-2 py-2 text-center font-semibold text-zinc-500 whitespace-nowrap" style={{ maxWidth: 100, fontSize: 10 }}>{mod}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {roles.map((role) => (
              <tr key={role} className="hover:bg-zinc-50/50">
                <td className="px-3 py-2 font-medium text-zinc-700 dark:text-[#EDEDED] sticky left-0 bg-white dark:bg-[#1A1A1A] z-10 whitespace-nowrap">{role}</td>
                {modules.map((mod) => {
                  const acc = getAccess(role, mod);
                  const on = acc?.has_access;
                  return (
                    <td key={mod} className="px-2 py-2 text-center">
                      <button
                        onClick={() => toggleAccess(role, mod)}
                        className={`w-8 h-4 rounded-full relative transition-colors ${on ? 'bg-emerald-500' : 'bg-zinc-200'}`}
                      >
                        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${on ? 'left-4' : 'left-0.5'}`} />
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-zinc-400 mt-3">{enabledCount} of {roles.length * modules.length} permissions enabled</p>
    </div>
  );
}

/* ═══════════════════════════════════════════
   TAB 3: SYNC CONFIG
   ═══════════════════════════════════════════ */
function SyncConfigTab() {
  const syncTypes = [
    { type: 'Epics', source: 'Jira', count: '~450', lastSync: '2h ago', enabled: true },
    { type: 'Stories', source: 'Jira', count: '~3,200', lastSync: '2h ago', enabled: true },
    { type: 'Sub-tasks', source: 'Jira', count: '~1,800', lastSync: '2h ago', enabled: true },
    { type: 'Comments', source: 'Jira', count: '~12,000', lastSync: '2h ago', enabled: true },
    { type: 'Changelogs', source: 'Jira', count: '~8,500', lastSync: '2h ago', enabled: true },
    { type: 'Attachments', source: 'Jira', count: '~600', lastSync: '4h ago', enabled: false },
    { type: 'Users', source: 'Catalyst', count: '~85', lastSync: 'Real-time', enabled: true },
  ];

  return (
    <div className="space-y-6">
      <div className={card}>
        <h3 className="text-sm font-bold text-zinc-800 mb-3">Data Sync Types</h3>
        <div className="space-y-2">
          {syncTypes.map((s) => (
            <div key={s.type} className="flex items-center gap-3 py-2 border-b border-zinc-100 last:border-0">
              <span className="w-28 text-xs font-medium text-zinc-700">{s.type}</span>
              <span className={badge('bg-blue-50 text-blue-700')}>{s.source}</span>
              <span className="text-xs text-zinc-500 flex-1">{s.lastSync}</span>
              <span className="text-xs text-zinc-600 font-mono">{s.count}</span>
              <div className={`w-8 h-4 rounded-full relative ${s.enabled ? 'bg-emerald-500' : 'bg-zinc-200'}`}>
                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow ${s.enabled ? 'left-4' : 'left-0.5'}`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className={card}>
          <h4 className="text-xs font-bold text-zinc-600 uppercase tracking-wide mb-2">Attachment Dedup</h4>
          <div className="space-y-1 text-xs text-zinc-600">
            <p>Total files: <span className="font-mono font-semibold">602</span></p>
            <p>Unique files: <span className="font-mono font-semibold">489</span></p>
            <p>Dedup savings: <span className="font-mono font-semibold text-emerald-600">18.8%</span></p>
          </div>
        </div>
        <div className={card}>
          <h4 className="text-xs font-bold text-zinc-600 uppercase tracking-wide mb-2">Vector DB Config</h4>
          <div className="space-y-1 text-xs text-zinc-600">
            <p>Model: <span className="font-mono font-semibold">text-embedding-3-small</span></p>
            <p>Dimensions: <span className="font-mono font-semibold">1536</span></p>
            <p>Total chunks: <span className="font-mono font-semibold">4,218</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   TAB 4: PIPELINE
   ═══════════════════════════════════════════ */
function PipelineTab() {
  const stages = [
    { name: 'Preflight Discovery', detail: '42 tables, 380 columns, 28 routes', time: '2s', status: 'complete' },
    { name: 'Jira API Extract', detail: '5,450 issues fetched', time: '45s', status: 'complete' },
    { name: 'Data Transform & Normalize', detail: 'Schema mapping applied', time: '12s', status: 'complete' },
    { name: 'Supabase Sync', detail: '4,820 upserted', time: '30s', status: 'complete' },
    { name: 'Attachment Processing + Dedup', detail: '602 files, 489 unique', time: '90s', status: 'complete' },
    { name: 'Vector Embedding Generation', detail: '4,218 chunks embedded', time: '180s', status: 'complete' },
    { name: 'Cross-Reference Merge', detail: 'Links, parents, dependencies', time: '8s', status: 'complete' },
    { name: 'Cache Warm-up', detail: 'Top 50 queries cached', time: '15s', status: 'complete' },
    { name: 'Quality Validation', detail: 'Coverage: 94.2%', time: '5s', status: 'complete' },
  ];

  const totalTime = stages.reduce((sum, s) => sum + parseInt(s.time), 0);

  return (
    <div className={card}>
      <h3 className="text-sm font-bold text-zinc-800 mb-5">Processing Pipeline — 9 Stages</h3>
      <div className="space-y-0">
        {stages.map((s, i) => (
          <div key={i} className="flex items-start gap-4 relative">
            {/* Connector line */}
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                s.status === 'complete' ? 'bg-emerald-100 text-emerald-700' : s.status === 'in-progress' ? 'bg-blue-100 text-blue-700 animate-pulse' : 'bg-zinc-100 text-zinc-400'
              }`}>{i + 1}</div>
              {i < stages.length - 1 && <div className="w-px h-8 bg-zinc-200" />}
            </div>
            <div className="pb-6">
              <p className="text-sm font-semibold text-zinc-800">{s.name}</p>
              <p className="text-xs text-zinc-500">{s.detail}</p>
              <span className="text-[10px] font-mono text-zinc-400">{s.time}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 pt-3 border-t border-zinc-200 text-xs font-semibold text-zinc-600">
        Total pipeline time: <span className="font-mono text-blue-600">{totalTime}s</span> (~{Math.round(totalTime / 60)}min)
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   TAB 5: PROJECTS
   ═══════════════════════════════════════════ */
function ProjectsTab() {
  const projects = [
    { key: 'CP', name: 'Chemical Permits', issues: 1240, lastSync: '2h ago', active: true },
    { key: 'DS', name: 'Dangerous Storage', issues: 890, lastSync: '2h ago', active: true },
    { key: 'EC', name: 'Environmental Compliance', issues: 1560, lastSync: '3h ago', active: true },
    { key: 'LIC', name: 'Industrial Licensing', issues: 1760, lastSync: '2h ago', active: true },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {projects.map((p) => (
        <div key={p.key} className={card}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-blue-600 font-mono">{p.key}</span>
              <span className="text-sm font-semibold text-zinc-800">{p.name}</span>
            </div>
            <div className={`w-8 h-4 rounded-full relative ${p.active ? 'bg-emerald-500' : 'bg-zinc-200'}`}>
              <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow ${p.active ? 'left-4' : 'left-0.5'}`} />
            </div>
          </div>
          <div className="text-xs text-zinc-500 space-y-1">
            <p>Total issues: <span className="font-mono font-semibold text-zinc-700">{p.issues.toLocaleString()}</span></p>
            <p>Last sync: <span className="font-semibold text-zinc-600">{p.lastSync}</span></p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   TAB 6: SOURCES
   ═══════════════════════════════════════════ */
function SourcesTab() {
  const [sources, setSources] = useState<KBSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSource, setNewSource] = useState({ label: '', url: '', description: '' });

  const load = useCallback(() => {
    setLoading(true);
    fetchSources().then(setSources).catch(() => toast.error('Failed to load sources')).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleSource = async (id: string, active: boolean) => {
    await supabase.from('kb_sources').update({ is_active: active }).eq('id', id);
    load();
  };

  const addSource = async () => {
    if (!newSource.label || !newSource.url) { toast.error('Label and URL required'); return; }
    await supabase.from('kb_sources').insert({
      label: newSource.label,
      url: newSource.url,
      description: newSource.description || null,
      source_type: 'ministry',
      priority: 1,
      is_active: true,
    });
    setNewSource({ label: '', url: '', description: '' });
    load();
    toast.success('Source added');
  };

  const ministry = sources.filter((s) => s.source_type === 'ministry');
  const internal = sources.filter((s) => s.source_type !== 'ministry');

  if (loading) return <div className="flex justify-center py-16"><RefreshCw className="animate-spin text-zinc-400" size={24} /></div>;

  return (
    <div className="space-y-6">
      {/* Priority info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-800 space-y-1">
        <p className="font-bold text-sm mb-2">Source Priority Order</p>
        <p>1. Ministry Sources (industry.sa) — Background, service definitions</p>
        <p>2. BRD Attachments — Business requirements</p>
        <p>3. Jira / Catalyst — Implementation details</p>
        <p>4. Catalyst DB — Technical schema</p>
      </div>

      {/* Ministry sources */}
      <div className={card}>
        <h3 className="text-sm font-bold text-zinc-800 mb-3">Ministry URLs</h3>
        <div className="space-y-3">
          {ministry.map((s) => (
            <div key={s.id} className="flex items-start gap-3 py-2 border-b border-zinc-100 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-zinc-800">{s.label}</p>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-600 truncate block">{s.url}</a>
                {s.description && <p className="text-[11px] text-zinc-500 mt-0.5">{s.description}</p>}
                <div className="flex gap-3 mt-1 text-[10px] text-zinc-400">
                  <span>{s.pages_indexed ?? 0} pages</span>
                  <span>Last scraped: {s.last_scraped_at ? formatDistanceToNow(new Date(s.last_scraped_at), { addSuffix: true }) : 'Never'}</span>
                </div>
              </div>
              <button
                onClick={() => toggleSource(s.id, !s.is_active)}
                className={`w-8 h-4 rounded-full relative flex-shrink-0 ${s.is_active ? 'bg-emerald-500' : 'bg-zinc-200'}`}
              >
                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow ${s.is_active ? 'left-4' : 'left-0.5'}`} />
              </button>
            </div>
          ))}
          {ministry.length === 0 && <p className="text-xs text-zinc-400">No ministry sources configured</p>}
        </div>

        {/* Add new */}
        <div className="mt-4 pt-4 border-t border-zinc-200">
          <p className="text-xs font-semibold text-zinc-600 mb-2">Add New URL</p>
          <div className="grid grid-cols-3 gap-2">
            <input value={newSource.label} onChange={(e) => setNewSource((n) => ({ ...n, label: e.target.value }))} placeholder="Label" className="text-xs border border-zinc-200 rounded px-2 py-1.5" />
            <input value={newSource.url} onChange={(e) => setNewSource((n) => ({ ...n, url: e.target.value }))} placeholder="URL" className="text-xs border border-zinc-200 rounded px-2 py-1.5" />
            <input value={newSource.description} onChange={(e) => setNewSource((n) => ({ ...n, description: e.target.value }))} placeholder="Description (optional)" className="text-xs border border-zinc-200 rounded px-2 py-1.5" />
          </div>
          <button onClick={addSource} className="mt-2 px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition-colors">
            Add Source
          </button>
        </div>
      </div>

      {/* Internal sources */}
      <div className={card}>
        <h3 className="text-sm font-bold text-zinc-800 mb-3">Internal Sources</h3>
        <div className="grid grid-cols-2 gap-3">
          {internal.map((s) => (
            <div key={s.id} className="border border-zinc-100 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-zinc-700">{s.label}</span>
                <span className={badge('bg-emerald-50 text-emerald-700')}>Connected</span>
              </div>
              <p className="text-[11px] text-zinc-500">{s.source_type}</p>
            </div>
          ))}
          {internal.length === 0 && <p className="text-xs text-zinc-400 col-span-2">No internal sources</p>}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   TAB 7: TRAINING
   ═══════════════════════════════════════════ */
function TrainingTab() {
  const { status, isProcessing, embedProgress, fetchStatus, embedBatch, embedAll, generateAnswers, cleanup } = useKBAdmin();
  const [categories, setCategories] = useState<{ category: string; count: number }[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'answered' | 'unanswered' | 'embedded'>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const loadQuestions = useCallback(async () => {
    // Paginate to overcome PostgREST max_rows limit (1000)
    let allData: any[] = [];
    let from = 0;
    const step = 999;
    while (true) {
      const { data } = await supabase.from('kb_training_questions').select('id, question, category, expected_answer, is_embedded, language, cache_hits, created_at').order('category').order('question').range(from, from + step);
      if (!data || data.length === 0) break;
      allData = allData.concat(data);
      if (data.length < step + 1) break;
      from += step + 1;
    }
    if (allData.length > 0) {
      setQuestions(allData);
      const counts: Record<string, number> = {};
      allData.forEach((d: any) => { counts[d.category || 'Uncategorized'] = (counts[d.category || 'Uncategorized'] || 0) + 1; });
      setCategories(Object.entries(counts).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count));
    }
  }, []);

  useEffect(() => { fetchStatus(); loadQuestions(); }, [fetchStatus, loadQuestions]);

  // Filter logic
  useEffect(() => {
    let filtered = questions;
    if (search.trim()) {
      const s = search.toLowerCase();
      filtered = filtered.filter((q: any) => q.question?.toLowerCase().includes(s) || q.expected_answer?.toLowerCase().includes(s));
    }
    if (catFilter !== 'all') {
      filtered = filtered.filter((q: any) => (q.category || 'Uncategorized') === catFilter);
    }
    if (statusFilter === 'answered') filtered = filtered.filter((q: any) => q.expected_answer?.trim());
    if (statusFilter === 'unanswered') filtered = filtered.filter((q: any) => !q.expected_answer?.trim());
    if (statusFilter === 'embedded') filtered = filtered.filter((q: any) => q.is_embedded);
    setFilteredQuestions(filtered);
    setPage(0);
  }, [questions, search, catFilter, statusFilter]);

  const paged = filteredQuestions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filteredQuestions.length / PAGE_SIZE);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === paged.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paged.map((q: any) => q.id)));
    }
  };

  const handleDelete = async () => {
    if (selected.size === 0) return;
    const confirm = window.confirm(`Delete ${selected.size} training question(s)? This cannot be undone.`);
    if (!confirm) return;

    setIsDeleting(true);
    try {
      const ids = Array.from(selected);
      // Delete in batches of 100
      for (let i = 0; i < ids.length; i += 100) {
        const batch = ids.slice(i, i + 100);
        const { error } = await supabase.from('kb_training_questions').delete().in('id', batch);
        if (error) throw error;
      }
      toast.success(`Deleted ${ids.length} question(s)`);
      setSelected(new Set());
      await loadQuestions();
      fetchStatus();
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  const total = status?.training_questions?.total ?? (status as any)?.total_questions ?? questions.length;
  const embedded = status?.training_questions?.embedded ?? (status as any)?.embedded ?? 0;
  const pct = total > 0 ? Math.round((embedded / total) * 100) : 0;
  const answeredCount = questions.filter((q: any) => q.expected_answer?.trim()).length;

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className={card}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-zinc-800">Training Status</h3>
          <div className="flex gap-4 text-xs text-zinc-500">
            <span>Total: <span className="font-mono font-semibold text-zinc-800">{total.toLocaleString()}</span></span>
            <span>Answered: <span className="font-mono font-semibold text-emerald-600">{answeredCount.toLocaleString()}</span></span>
            <span>Embedded: <span className="font-mono font-semibold text-blue-600">{embedded.toLocaleString()}</span> ({pct}%)</span>
          </div>
        </div>
        <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Actions row */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => embedBatch(50)} disabled={isProcessing} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {isProcessing ? <RefreshCw className="animate-spin inline mr-1" size={12} /> : null}
          Embed Batch (50)
        </button>
        <button onClick={() => embedAll(50)} disabled={isProcessing} className="px-3 py-1.5 bg-blue-800 text-white text-xs font-semibold rounded hover:bg-blue-900 disabled:opacity-50 transition-colors">
          Embed All
        </button>
        <button onClick={generateAnswers} disabled={isProcessing} className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded hover:bg-emerald-700 disabled:opacity-50 transition-colors">
          {isProcessing ? <RefreshCw className="animate-spin inline mr-1" size={12} /> : <Brain className="inline mr-1" size={12} />}
          Generate Answers
        </button>
        {selected.size > 0 && (
          <button onClick={handleDelete} disabled={isDeleting} className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded hover:bg-red-700 disabled:opacity-50 transition-colors ml-auto">
            {isDeleting ? <RefreshCw className="animate-spin inline mr-1" size={12} /> : <XIcon className="inline mr-1" size={12} />}
            Delete Selected ({selected.size})
          </button>
        )}
      </div>

      {embedProgress && (
        <div className="text-xs text-zinc-500 bg-zinc-50 rounded p-3">
          Last batch: {embedProgress.embedded} embedded, {embedProgress.remaining} remaining — {embedProgress.message}
        </div>
      )}

      {/* Filters */}
      <div className={card}>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions or answers..."
            className="flex-1 min-w-[200px] px-3 py-1.5 text-xs border border-zinc-200 dark:border-[#2E2E2E] rounded bg-white dark:bg-[#1A1A1A] dark:text-[#EDEDED] focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="px-3 py-1.5 text-xs border border-zinc-200 dark:border-[#2E2E2E] rounded bg-white dark:bg-[#1A1A1A] dark:text-[#EDEDED]">
            <option value="all">All Categories ({questions.length})</option>
            {categories.map(c => (
              <option key={c.category} value={c.category}>{c.category} ({c.count})</option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="px-3 py-1.5 text-xs border border-zinc-200 dark:border-[#2E2E2E] rounded bg-white dark:bg-[#1A1A1A] dark:text-[#EDEDED]">
            <option value="all">All Status</option>
            <option value="answered">Has Answer</option>
            <option value="unanswered">No Answer</option>
            <option value="embedded">Embedded</option>
          </select>
        </div>

        <div className="text-xs text-zinc-500 mb-3">
          Showing {paged.length} of {filteredQuestions.length} questions {filteredQuestions.length !== questions.length && `(filtered from ${questions.length} total)`}
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[32px_1fr_160px_80px_60px] gap-2 items-center py-2 px-2 bg-zinc-50 rounded-t text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
          <label className="flex items-center justify-center">
            <input type="checkbox" checked={paged.length > 0 && selected.size === paged.length} onChange={toggleAll} className="rounded" />
          </label>
          <span>Question</span>
          <span>Category</span>
          <span className="text-center">Answer</span>
          <span className="text-center">Lang</span>
        </div>

        {/* Questions list */}
        <div className="divide-y divide-zinc-100 max-h-[500px] overflow-y-auto">
          {paged.map((q: any) => (
            <div key={q.id}>
              <div
                className={`grid grid-cols-[32px_1fr_160px_80px_60px] gap-2 items-center py-2 px-2 hover:bg-zinc-50 cursor-pointer transition-colors ${selected.has(q.id) ? 'bg-blue-50' : ''}`}
                onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
              >
                <label className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(q.id)} onChange={() => toggleSelect(q.id)} className="rounded" />
                </label>
                <span className="text-xs text-zinc-800 truncate">{q.question}</span>
                <span className="text-[11px] text-zinc-500 truncate">{q.category || 'Uncategorized'}</span>
                <span className="text-center">
                  {q.expected_answer?.trim() ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                      <Check size={10} /> Yes
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                      <XIcon size={10} /> No
                    </span>
                  )}
                </span>
                <span className="text-center text-[11px] text-zinc-400">{q.language || 'en'}</span>
              </div>
              {expandedId === q.id && (
                <div className="px-10 py-3 bg-zinc-50 border-t border-zinc-100">
                  <p className="text-xs font-semibold text-zinc-600 mb-1">Question:</p>
                  <p className="text-xs text-zinc-800 mb-3">{q.question}</p>
                  {q.expected_answer?.trim() ? (
                    <>
                      <p className="text-xs font-semibold text-zinc-600 mb-1">Expected Answer:</p>
                      <p className="text-xs text-zinc-700 whitespace-pre-wrap leading-relaxed">{q.expected_answer}</p>
                    </>
                  ) : (
                    <p className="text-xs text-amber-600 italic">No answer generated yet.</p>
                  )}
                  <div className="flex gap-4 mt-3 text-[11px] text-zinc-400">
                    <span>Embedded: {q.is_embedded ? '✅' : '❌'}</span>
                    <span>Cache Hits: {q.cache_hits ?? 0}</span>
                    <span>Created: {q.created_at ? formatDistanceToNow(new Date(q.created_at), { addSuffix: true }) : '—'}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
          {paged.length === 0 && (
            <div className="py-8 text-center text-xs text-zinc-400">No questions found matching your filters.</div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-zinc-100">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1 text-xs text-zinc-600 bg-zinc-100 rounded hover:bg-zinc-200 disabled:opacity-40">
              ← Previous
            </button>
            <span className="text-xs text-zinc-500">Page {page + 1} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-3 py-1 text-xs text-zinc-600 bg-zinc-100 rounded hover:bg-zinc-200 disabled:opacity-40">
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN ADMIN PAGE
   ═══════════════════════════════════════════ */
export default function KBAdminPage() {
  const { isAdmin, isProgramManager, isLoading: roleLoading } = useUserRole();
  const [activeTab, setActiveTab] = useState<TabKey>('health');

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="animate-spin text-zinc-400" size={28} />
      </div>
    );
  }

  if (!isAdmin && !isProgramManager) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <Shield className="mx-auto text-red-400" size={40} />
          <h2 className="text-lg font-bold text-zinc-800">Access Denied</h2>
          <p className="text-sm text-zinc-500">You need <span className="font-semibold">admin</span> or <span className="font-semibold">program_manager</span> role to access the KB Admin Panel.</p>
        </div>
      </div>
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'health': return <HealthTab />;
      case 'logs': return <QueryLogTab />;
      case 'access': return <AccessMatrixTab />;
      case 'sync': return <SyncConfigTab />;
      case 'pipeline': return <PipelineTab />;
      case 'projects': return <ProjectsTab />;
      case 'sources': return <SourcesTab />;
      case 'training': return <TrainingTab />;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50" style={{ paddingTop: 48 }}>
      {/* Page header */}
      <div className="bg-white dark:bg-[#1A1A1A] border-b border-zinc-200 dark:border-[#2E2E2E] px-6 py-4">
        <h1 className="text-lg font-bold text-zinc-900 dark:text-[#EDEDED]">Knowledge Base — Admin</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Manage training, sources, access control, and pipeline configuration</p>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-[#1A1A1A] border-b border-zinc-200 dark:border-[#2E2E2E] px-6">
        <nav className="flex gap-0 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {renderTab()}
      </div>
    </div>
  );
}
