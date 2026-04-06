import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  invokeEdgeFunction,
  queryTable,
  checkColumnGuard,
  generateFixPrompt,
  COLUMN_GUARDS,
  EDGE_FUNCTION_PRESETS,
  type InvokeResult,
} from '@/lib/diagnosticRunner';
import { Zap, Sparkles, Play, Copy, CheckCircle2, XCircle, Minus, RefreshCw, Database, Shield, Terminal } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import toast from 'react-hot-toast';

interface LogEntry {
  ts: string;
  type: 'info' | 'success' | 'error';
  message: string;
}

// StatusLozenge per V12 spec
function StatusLozenge({ status }: { status: 'passed' | 'failed' | 'running' | 'not_tested' }) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    passed:     { bg: '#1B7F37', color: '#FFFFFF', label: 'PASSED' },
    failed:     { bg: '#FFEBE6', color: '#BF2600', label: 'FAILED' },
    running:    { bg: '#0C66E4', color: '#FFFFFF', label: 'RUNNING' },
    not_tested: { bg: '#DFE1E6', color: '#42526E', label: 'NOT TESTED' },
  };
  const s = styles[status];
  return (
    <span style={{
      background: s.bg, color: s.color,
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
      padding: '2px 8px', borderRadius: 4, letterSpacing: '0.04em',
      fontFamily: 'Inter, sans-serif',
    }}>
      {s.label}
    </span>
  );
}

export default function AdminDiagnosticPage() {
  const { isDark } = useTheme();
  // ── Connection Status ──
  const [connStatus, setConnStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  // ── Edge Function ──
  const [fnName, setFnName] = useState(EDGE_FUNCTION_PRESETS[0].name);
  const [fnBody, setFnBody] = useState(JSON.stringify(EDGE_FUNCTION_PRESETS[0].body, null, 2));
  const [invoking, setInvoking] = useState(false);
  const [lastResult, setLastResult] = useState<InvokeResult | null>(null);

  // ── Table Inspector ──
  const [tableName, setTableName] = useState('brd_documents');
  const [tableCols, setTableCols] = useState('*');
  const [tableData, setTableData] = useState<any[] | null>(null);
  const [tableError, setTableError] = useState<string | null>(null);
  const [querying, setQuerying] = useState(false);

  // ── Column Guards ──
  const [guardResults, setGuardResults] = useState<Map<string, { passed: boolean; detail: string }>>(new Map());
  const [guardsRunning, setGuardsRunning] = useState(false);

  // ── Log ──
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    const ts = new Date().toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev, { ts, type, message }]);
  }, []);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  // ── Connection check ──
  useEffect(() => {
    (async () => {
      try {
        const { error } = await supabase.from('profiles' as any).select('id').limit(1);
        if (error) { setConnStatus('error'); addLog('error', `Connection test failed: ${error.message}`); }
        else { setConnStatus('connected'); addLog('success', 'Database connection verified'); }
      } catch (e: any) {
        setConnStatus('error');
        addLog('error', `Connection error: ${e.message}`);
      }
    })();
  }, [addLog]);

  // ── Preset selection ──
  const selectPreset = (name: string) => {
    const preset = EDGE_FUNCTION_PRESETS.find(p => p.name === name);
    if (preset) {
      setFnName(preset.name);
      setFnBody(JSON.stringify(preset.body, null, 2));
    }
  };

  // ── Invoke Edge Function ──
  const handleInvoke = async () => {
    setInvoking(true);
    setLastResult(null);
    addLog('info', `Invoking "${fnName}"...`);
    let body: object;
    try { body = JSON.parse(fnBody); } catch { addLog('error', 'Invalid JSON body'); setInvoking(false); return; }
    const result = await invokeEdgeFunction(fnName, body);
    setLastResult(result);
    if (result.ok) {
      addLog('success', `${fnName} → OK (${result.elapsed}ms) — ${JSON.stringify(result.data).slice(0, 200)}`);
    } else {
      addLog('error', `${fnName} → ERROR (${result.elapsed}ms) — ${result.error}`);
      console.error('[Diagnostic] Edge Function error:', result.error);
    }
    setInvoking(false);
  };

  // ── Query Table ──
  const handleQuery = async () => {
    setQuerying(true);
    setTableData(null);
    setTableError(null);
    addLog('info', `Querying ${tableName} (${tableCols})...`);
    const { data, error } = await queryTable(tableName, tableCols);
    if (error) { setTableError(error); addLog('error', `Query error: ${error}`); }
    else { setTableData(data); addLog('success', `${tableName} returned ${data?.length ?? 0} rows`); }
    setQuerying(false);
  };

  // ── Column Guards ──
  const runGuards = async () => {
    setGuardsRunning(true);
    setGuardResults(new Map());
    addLog('info', 'Running column guard checks...');
    for (const guard of COLUMN_GUARDS) {
      const result = await checkColumnGuard(guard);
      setGuardResults(prev => new Map(prev).set(guard.label, result));
      addLog(result.passed ? 'success' : 'error', `${guard.label}: ${result.detail}`);
    }
    setGuardsRunning(false);
  };

  // ── Copy helpers ──
  const copyLog = () => {
    const text = logs.map(l => `[${l.ts}] ${l.type.toUpperCase()} ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Log copied');
  };

  const copyFixPrompt = () => {
    if (!lastResult || lastResult.ok) return;
    const prompt = generateFixPrompt(fnName, lastResult.error || 'Unknown');
    navigator.clipboard.writeText(prompt);
    toast.success('Fix prompt copied');
  };

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'Not configured';

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1200, background: isDark ? '#0A0A0A' : undefined }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <div style={{ width: 36, height: 50, borderRadius: 8, background: isDark ? 'rgba(124,58,237,0.12)' : '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap style={{ width: 18, height: 18, color: '#7C3AED' }} />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: isDark ? '#EDEDED' : '#0F172A', fontFamily: 'Sora, sans-serif', margin: 0 }}>System Diagnostic</h1>
          <p style={{ fontSize: 12, color: isDark ? '#878787' : '#64748B', margin: 0, fontFamily: 'Inter, sans-serif' }}>Edge functions, table inspector, and column guard checks</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* SECTION A — Connection Status */}
          <Card title="Connection Status">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: isDark ? '#878787' : '#64748B', fontFamily: 'JetBrains Mono, monospace' }}>{supabaseUrl}</span>
              {connStatus === 'checking' && <StatusLozenge status="running" />}
              {connStatus === 'connected' && <StatusLozenge status="passed" />}
              {connStatus === 'error' && <StatusLozenge status="failed" />}
            </div>
          </Card>

          {/* SECTION B — Edge Function Tester */}
          <Card title="Edge Function Tester" icon={<Sparkles style={{ width: 14, height: 14, color: '#7C3AED' }} />}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {EDGE_FUNCTION_PRESETS.map(p => (
                <button
                  key={p.name}
                  onClick={() => selectPreset(p.name)}
                  style={{
                    fontSize: 11, padding: '3px 8px', borderRadius: 4,
                    border: fnName === p.name ? '1px solid #7C3AED' : isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0',
                    background: fnName === p.name ? (isDark ? 'rgba(124,58,237,0.12)' : '#F5F3FF') : (isDark ? '#1A1A1A' : '#FFFFFF'),
                    color: fnName === p.name ? '#7C3AED' : (isDark ? '#A1A1A1' : '#334155'),
                    cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
            <Input
              value={fnName}
              onChange={e => setFnName(e.target.value)}
              placeholder="Function name"
              style={{ marginBottom: 8, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
            />
            <Textarea
              value={fnBody}
              onChange={e => setFnBody(e.target.value)}
              rows={4}
              style={{ marginBottom: 10, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                onClick={handleInvoke}
                disabled={invoking}
                style={{ background: '#7C3AED', color: '#fff', gap: 6 }}
              >
                {invoking ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                {invoking ? 'Invoking...' : '▶ Invoke Function'}
              </Button>
              {lastResult && !lastResult.ok && (
                <Button variant="outline" onClick={copyFixPrompt} style={{ gap: 6 }}>
                  <Copy className="h-3.5 w-3.5" /> Copy Fix Prompt
                </Button>
              )}
            </div>
            {lastResult && (
              <div style={{
                marginTop: 10, padding: '10px 12px', borderRadius: 6, fontSize: 12,
                fontFamily: 'JetBrains Mono, monospace', wordBreak: 'break-all',
                background: lastResult.ok ? '#1B7F37' : '#FEF2F2',
                border: lastResult.ok ? '1px solid #16A34A' : '1.5px solid #DC2626',
                color: lastResult.ok ? '#FFFFFF' : '#991B1B',
                maxHeight: 120, overflowY: 'auto',
              }}>
                {lastResult.ok
                  ? `OK (${lastResult.elapsed}ms) — ${JSON.stringify(lastResult.data).slice(0, 300)}`
                  : `ERROR (${lastResult.elapsed}ms) — ${lastResult.error || 'Unknown error'}`}
              </div>
            )}
          </Card>

          {/* SECTION D — Column Guard Checker */}
          <Card title="Column Guard Checker" icon={<Shield style={{ width: 14, height: 14, color: '#334155' }} />}>
            <Button variant="outline" onClick={runGuards} disabled={guardsRunning} style={{ marginBottom: 12, gap: 6 }}>
              {guardsRunning ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
              Run Column Guards
            </Button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {COLUMN_GUARDS.map(g => {
                const result = guardResults.get(g.label);
                return (
                  <div key={g.label} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    height: 50, padding: '8px 12px', borderRadius: 4,
                    border: isDark ? '0.75px solid #2E2E2E' : '0.75px solid #E2E8F0', background: isDark ? '#1A1A1A' : '#FFFFFF',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {result ? (
                        result.passed ? <CheckCircle2 style={{ width: 14, height: 14, color: '#16A34A' }} /> : <XCircle style={{ width: 14, height: 14, color: '#DC2626' }} />
                      ) : (
                        <Minus style={{ width: 14, height: 14, color: isDark ? '#878787' : '#94A3B8' }} />
                      )}
                      <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: isDark ? '#A1A1A1' : '#334155' }}>{g.label}</span>
                    </div>
                    <StatusLozenge status={!result ? 'not_tested' : guardsRunning ? 'running' : result.passed ? 'passed' : 'failed'} />
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* SECTION C — Table Inspector */}
          <Card title="Table Inspector" icon={<Database style={{ width: 14, height: 14, color: '#334155' }} />}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <Input
                value={tableName}
                onChange={e => setTableName(e.target.value)}
                placeholder="Table name"
                style={{ flex: 2, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
              />
              <Input
                value={tableCols}
                onChange={e => setTableCols(e.target.value)}
                placeholder="Columns (* for all)"
                style={{ flex: 1, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
              />
            </div>
            <Button variant="outline" onClick={handleQuery} disabled={querying} style={{ marginBottom: 12, gap: 6 }}>
              {querying ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
              Query Table
            </Button>
            {tableError && (
              <div style={{ padding: '10px 12px', borderRadius: 6, background: '#FEF2F2', border: '1.5px solid #DC2626', color: '#991B1B', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 }}>
                {tableError}
              </div>
            )}
            {tableData && tableData.length > 0 && (
              <div style={{ overflowX: 'auto', border: isDark ? '0.75px solid #2E2E2E' : '0.75px solid #E2E8F0', borderRadius: 4 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>
                  <thead>
                    <tr style={{ background: isDark ? '#1A1A1A' : '#F8FAFC' }}>
                      {Object.keys(tableData[0]).map(col => (
                        <th key={col} style={{ height: 50, padding: '0 10px', textAlign: 'left', fontWeight: 650, fontSize: 10, textTransform: 'uppercase', color: isDark ? '#878787' : '#64748B', borderBottom: isDark ? '0.75px solid #2E2E2E' : '0.75px solid #E2E8F0', whiteSpace: 'nowrap' }}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map((row, i) => (
                      <tr key={i} style={{ borderBottom: isDark ? '0.75px solid #292929' : '0.75px solid #E2E8F0' }}>
                        {Object.values(row).map((val, j) => (
                          <td key={j} style={{ height: 50, padding: '0 10px', color: isDark ? '#A1A1A1' : '#334155', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {val === null ? <span style={{ color: isDark ? '#878787' : '#94A3B8' }}>null</span> : typeof val === 'object' ? JSON.stringify(val).slice(0, 50) : String(val).slice(0, 80)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {tableData && tableData.length === 0 && (
              <div style={{ fontSize: 12, color: isDark ? '#878787' : '#64748B', padding: 10, textAlign: 'center' }}>No rows returned</div>
            )}
          </Card>

          {/* SECTION E — Response Log */}
          <Card title="Response Log" icon={<Terminal style={{ width: 14, height: 14, color: '#334155' }} />}>
            <div
              ref={logRef}
              style={{
                background: '#0A0D12', borderRadius: 6, padding: 12,
                height: 260, overflowY: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
              }}
            >
              {logs.length === 0 && <span style={{ color: '#475569' }}>No log entries yet...</span>}
              {logs.map((entry, i) => (
                <div key={i} style={{ marginBottom: 3, lineHeight: 1.5 }}>
                  <span style={{ color: '#64748B' }}>[{entry.ts}]</span>{' '}
                  <span style={{
                    color: entry.type === 'error' ? '#F87171' : entry.type === 'success' ? '#4ADE80' : '#93C5FD',
                  }}>
                    {entry.message}
                  </span>
                </div>
              ))}
            </div>
            <Button variant="outline" onClick={copyLog} style={{ marginTop: 8, gap: 6 }} size="sm">
              <Copy className="h-3 w-3" /> Copy Log
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Reusable Card wrapper ──
function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  const { isDark } = useTheme();
  return (
    <div style={{
      background: isDark ? '#1A1A1A' : '#FFFFFF', border: isDark ? '0.75px solid #2E2E2E' : '0.75px solid #E2E8F0', borderRadius: 8, padding: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        {icon}
        <h2 style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#EDEDED' : '#0F172A', fontFamily: 'Sora, sans-serif', margin: 0 }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}
