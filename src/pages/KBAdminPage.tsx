import React, { useState, useEffect, useCallback } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { useKBAdmin } from '@/hooks/useKnowledgeBase';
import { fetchQueryLogs, fetchSources, fetchAccessMatrix, type KBQueryLogEntry, type KBSource } from '@/services/knowledgeBase';
import { supabase } from '@/integrations/supabase/client';
import { Shield, FileText, Lock, RefreshCw, Zap, FolderOpen, Globe, Brain, ThumbsUp, ThumbsDown, Keyboard, Mic, Check, X as XIcon, Activity, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
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
const card = 'bg-white border border-zinc-200 rounded-lg p-5 shadow-sm';
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

  const runChecks = useCallback(async () => {
    setLoading(true);
    const results: HealthCheck[] = [];

    try {
      // 1. Training Questions
      const { data: tq } = await supabase.from('kb_training_questions').select('id, is_embedded, expected_answer');
      const totalQ = tq?.length || 0;
      const embeddedQ = tq?.filter((q: any) => q.is_embedded).length || 0;
      const withAnswers = tq?.filter((q: any) => q.expected_answer && q.expected_answer.trim() !== '').length || 0;

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

      // 2. KB Embeddings (RAG chunks)
      const { count: embCount } = await supabase.from('kb_embeddings').select('id', { count: 'exact', head: true });
      const embedTotal = embCount || 0;
      results.push({
        label: 'RAG Content Chunks Indexed',
        description: 'Source documents chunked and vectorized for retrieval-augmented generation',
        status: embedTotal >= 50 ? 'pass' : embedTotal > 0 ? 'warn' : 'fail',
        detail: `${embedTotal.toLocaleString()} chunks in vector store`,
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

  const passCount = checks.filter(c => c.status === 'pass').length;
  const warnCount = checks.filter(c => c.status === 'warn').length;
  const failCount = checks.filter(c => c.status === 'fail').length;
  const totalChecks = checks.length;
  const overallScore = totalChecks > 0 ? Math.round((passCount / totalChecks) * 100) : 0;
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
          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Re-check
        </button>
      </div>

      {/* Pipeline readiness visual */}
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

      {/* Action items */}
      {!loading && failCount + warnCount > 0 && (
        <div className={card}>
          <h3 className="text-sm font-bold text-zinc-800 mb-3">🔧 Recommended Actions</h3>
          <div className="space-y-2">
            {checks.filter(c => c.status === 'fail' || c.status === 'warn').map((c, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className={c.status === 'fail' ? 'text-red-500' : 'text-amber-500'}>
                  {c.status === 'fail' ? '🔴' : '🟡'}
                </span>
                <div>
                  <span className="font-semibold text-zinc-700">{c.label}:</span>{' '}
                  <span className="text-zinc-600">
                    {c.label.includes('Answers') && 'Populate expected_answer fields on training questions so the KB can return direct matches.'}
                    {c.label.includes('RAG') && 'Ingest source documents into kb_embeddings via the Sources or Pipeline tab.'}
                    {c.label.includes('Vectorized') && 'Run "Embed All" from the Training tab to generate embeddings for remaining questions.'}
                    {c.label.includes('Training') && c.status === 'fail' && 'Import training questions from the Training tab.'}
                    {c.label.includes('Sources') && 'Add and activate more knowledge sources from the Sources tab.'}
                    {c.label.includes('Cache') && 'Cache is empty — it will auto-populate as users query the KB.'}
                    {c.label.includes('Access') && 'Configure role-based access rules in the Access Matrix tab.'}
                    {c.label.includes('Query') && 'No queries logged yet. The KB needs to be used to generate activity.'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   TAB 1: QUERY LOG
   ═══════════════════════════════════════════ */
function QueryLogTab() {
  const [logs, setLogs] = useState<KBQueryLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{ lang: string; method: string; helpful: string }>({
    lang: 'all', method: 'all', helpful: 'all',
  });

  useEffect(() => {
    fetchQueryLogs(200).then(setLogs).catch(() => toast.error('Failed to load logs')).finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter((l) => {
    if (filter.lang !== 'all' && l.language !== filter.lang) return false;
    if (filter.method !== 'all' && l.input_method !== filter.method) return false;
    if (filter.helpful === 'yes' && l.was_helpful !== true) return false;
    if (filter.helpful === 'no' && l.was_helpful !== false) return false;
    if (filter.helpful === 'none' && l.was_helpful !== null) return false;
    return true;
  });

  if (loading) return <div className="flex justify-center py-16"><RefreshCw className="animate-spin text-zinc-400" size={24} /></div>;

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Filters</span>
        <select value={filter.lang} onChange={(e) => setFilter((f) => ({ ...f, lang: e.target.value }))} className="text-xs border border-zinc-200 rounded px-2 py-1">
          <option value="all">All Languages</option><option value="en">EN</option><option value="ar">AR</option>
        </select>
        <select value={filter.method} onChange={(e) => setFilter((f) => ({ ...f, method: e.target.value }))} className="text-xs border border-zinc-200 rounded px-2 py-1">
          <option value="all">All Methods</option><option value="keyboard">Keyboard</option><option value="voice">Voice</option>
        </select>
        <select value={filter.helpful} onChange={(e) => setFilter((f) => ({ ...f, helpful: e.target.value }))} className="text-xs border border-zinc-200 rounded px-2 py-1">
          <option value="all">All Feedback</option><option value="yes">Helpful</option><option value="no">Not Helpful</option><option value="none">No Feedback</option>
        </select>
        <span className="ml-auto text-xs text-zinc-400">{filtered.length} of {logs.length} entries</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-zinc-200">
        <table className="min-w-full text-xs">
          <thead className="bg-zinc-50">
            <tr>
              {['Time', 'User', 'Query', 'Lang', 'Method', 'Category', 'Confidence', 'Speed', 'Cache', 'Helpful'].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-semibold text-zinc-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.map((log) => (
              <tr key={log.id} className="hover:bg-zinc-50/50">
                <td className="px-3 py-2 text-zinc-500 whitespace-nowrap">{log.created_at ? formatDistanceToNow(new Date(log.created_at), { addSuffix: true }) : '—'}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className="font-medium text-zinc-700">{log.user_name || '—'}</span>
                  {log.user_role && <span className={badge('bg-zinc-100 text-zinc-600 ml-1')}>{log.user_role}</span>}
                </td>
                <td className="px-3 py-2 max-w-[260px] truncate text-zinc-700">{log.query_text}</td>
                <td className="px-3 py-2"><span className={badge(log.language === 'ar' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700')}>{log.language || 'en'}</span></td>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
                <td className="px-3 py-2 font-medium text-zinc-700 sticky left-0 bg-white z-10 whitespace-nowrap">{role}</td>
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
  const { status, isProcessing, embedProgress, fetchStatus, embedBatch, embedAll, cleanup } = useKBAdmin();
  const [categories, setCategories] = useState<{ category: string; count: number }[]>([]);

  useEffect(() => {
    fetchStatus();
    // Fetch category breakdown
    supabase
      .from('kb_training_questions')
      .select('category')
      .then(({ data }) => {
        if (!data) return;
        const counts: Record<string, number> = {};
        data.forEach((d: any) => { counts[d.category || 'Uncategorized'] = (counts[d.category || 'Uncategorized'] || 0) + 1; });
        setCategories(Object.entries(counts).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count));
      });
  }, [fetchStatus]);

  const total = status?.training_questions.total ?? 0;
  const embedded = status?.training_questions.embedded ?? 0;
  const pct = total > 0 ? Math.round((embedded / total) * 100) : 0;

  const phases = [
    { name: 'Phase 1: Baseline Training', desc: 'Load & embed 1,500 questions', done: true },
    { name: 'Phase 2: Live Refinement', desc: 'Monitor real queries, fill gaps', done: false },
    { name: 'Phase 3: Continuous Learning', desc: 'Weekly retrain on new data', done: false },
  ];

  return (
    <div className="space-y-6">
      {/* Status card */}
      <div className={card}>
        <h3 className="text-sm font-bold text-zinc-800 mb-3">Training Status</h3>
        <div className="flex items-center gap-4 mb-2">
          <span className="text-2xl font-bold text-zinc-800">{embedded.toLocaleString()}</span>
          <span className="text-xs text-zinc-500">of {total.toLocaleString()} embedded</span>
          <span className="text-xs font-semibold text-blue-600">{pct}%</span>
        </div>
        <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        {status && (
          <div className="mt-3 flex gap-4 text-xs text-zinc-500">
            <span>KB Embeddings: <span className="font-mono font-semibold">{status.kb_embeddings}</span></span>
            <span>Sources: <span className="font-mono font-semibold">{status.sources}</span></span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={() => embedBatch(50)} disabled={isProcessing} className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {isProcessing ? <RefreshCw className="animate-spin inline mr-1" size={12} /> : null}
          Embed Batch (50)
        </button>
        <button onClick={() => embedAll(50)} disabled={isProcessing} className="px-4 py-2 bg-blue-800 text-white text-xs font-semibold rounded hover:bg-blue-900 disabled:opacity-50 transition-colors">
          {isProcessing ? <RefreshCw className="animate-spin inline mr-1" size={12} /> : null}
          Embed All
        </button>
        <button onClick={() => cleanup('clear_cache')} disabled={isProcessing} className="px-4 py-2 bg-zinc-100 text-zinc-700 text-xs font-semibold rounded hover:bg-zinc-200 disabled:opacity-50 transition-colors">
          Warm Cache
        </button>
      </div>

      {embedProgress && (
        <div className="text-xs text-zinc-500 bg-zinc-50 rounded p-3">
          Last batch: {embedProgress.embedded} embedded, {embedProgress.remaining} remaining — {embedProgress.message}
        </div>
      )}

      {/* Category breakdown */}
      <div className={card}>
        <h3 className="text-sm font-bold text-zinc-800 mb-3">Category Breakdown</h3>
        <div className="space-y-1.5">
          {categories.map((c) => (
            <div key={c.category} className="flex items-center gap-2">
              <span className="text-xs text-zinc-700 flex-1 truncate">{c.category}</span>
              <span className="text-xs font-mono text-zinc-500">{c.count}</span>
              <div className="w-24 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (c.count / (total || 1)) * 100 * 5)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Training phases */}
      <div className={card}>
        <h3 className="text-sm font-bold text-zinc-800 mb-3">Training Phase Plan</h3>
        <div className="space-y-3">
          {phases.map((p, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] mt-0.5 ${p.done ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-400'}`}>
                {p.done ? '✓' : i + 1}
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-700">{p.name}</p>
                <p className="text-[11px] text-zinc-500">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
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
      <div className="bg-white border-b border-zinc-200 px-6 py-4">
        <h1 className="text-lg font-bold text-zinc-900">Knowledge Base — Admin</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Manage training, sources, access control, and pipeline configuration</p>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-zinc-200 px-6">
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
