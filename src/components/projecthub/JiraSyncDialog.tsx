import { useState, useEffect, useCallback } from 'react';
import { Check, ChevronDown, Loader2, X, Shield, Database, CheckCircle2, AlertCircle, Zap, History, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

type SyncMode = '3months' | '6months' | 'changes_only';
type SyncPhase = 'idle' | 'syncing' | 'complete' | 'error';

const SYNC_OPTIONS: { value: SyncMode; label: string; desc: string; icon: string }[] = [
  { value: '3months', label: '3 Months', desc: 'Full backfill — last 90 days of project data', icon: '📅' },
  { value: '6months', label: '6 Months', desc: 'Extended backfill — last 180 days of project data', icon: '📆' },
  { value: 'changes_only', label: 'Only Changes', desc: 'Delta sync — fetch only recent modifications', icon: '⚡' },
];

/* Jira Logo SVG — Official mark */
const JiraIcon = ({ size = 18, color = '#2684FF' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M22.9 11.4L13 1.5 12 .5 4.1 8.4.5 12l3.6 3.6L12 23.5l7.9-7.9.4-.4 2.6-2.6-2.6-2.6zM12 15.3L8.7 12 12 8.7l3.3 3.3-3.3 3.3z" fill={color}/>
  </svg>
);

interface JiraProject {
  key: string;
  name: string;
  issueCount: number;
}

interface SyncResult {
  synced: number;
  created: number;
  updated: number;
  softDeleted: number;
  baselineTotal: number;
  errors: number;
}

interface SyncLogEntry {
  id: string;
  status: string;
  sync_mode: string;
  items_created: number;
  items_updated: number;
  items_deleted_soft: number;
  total_items_in_baseline: number;
  baseline_snapshot_date: string;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  project_keys: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function JiraSyncDialog({ open, onClose }: Props) {
  const [projects, setProjects] = useState<JiraProject[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [syncMode, setSyncMode] = useState<SyncMode>('changes_only');
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<SyncPhase>('idle');
  const [progressPct, setProgressPct] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [currentProject, setCurrentProject] = useState('');
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [recentSyncs, setRecentSyncs] = useState<SyncLogEntry[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      loadProjects();
      loadRecentSyncs();
      setPhase('idle');
      setProgressPct(0);
      setProgressLabel('');
      setSyncResult(null);
    }
  }, [open]);

  async function loadRecentSyncs() {
    try {
      const { data } = await (supabase as any)
        .from('ph_jira_sync_log')
        .select('id, status, sync_mode, items_created, items_updated, items_deleted_soft, total_items_in_baseline, baseline_snapshot_date, started_at, completed_at, duration_ms, project_keys')
        .order('started_at', { ascending: false })
        .limit(3);
      setRecentSyncs((data ?? []) as SyncLogEntry[]);
    } catch (_e) {}
  }

  async function loadProjects() {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('ph_issues')
        .select('project_key')
        .is('jira_removed_at', null)
        .limit(5000);
      if (error) throw error;

      const countMap: Record<string, number> = {};
      for (const row of data ?? []) countMap[row.project_key] = (countMap[row.project_key] || 0) + 1;

      const { data: projectData } = await (supabase as any).from('projects').select('key, name');
      const nameMap: Record<string, string> = {};
      for (const p of projectData ?? []) nameMap[p.key] = p.name;

      const { data: phProjects } = await (supabase as any).from('ph_projects').select('key, name');
      for (const p of phProjects ?? []) if (!nameMap[p.key]) nameMap[p.key] = p.name;

      const { data: conn } = await (supabase as any)
        .from('ph_jira_connection')
        .select('accessible_projects')
        .eq('status', 'connected')
        .single();
      if (conn?.accessible_projects) {
        for (const ap of conn.accessible_projects) {
          if (!nameMap[ap.key]) nameMap[ap.key] = ap.name;
          if (!countMap[ap.key]) countMap[ap.key] = 0;
        }
      }

      const projectList: JiraProject[] = Object.keys({ ...countMap, ...nameMap })
        .map(key => ({ key, name: nameMap[key] || key, issueCount: countMap[key] || 0 }))
        .sort((a, b) => b.issueCount - a.issueCount);

      setProjects(projectList);
      setSelected(new Set());
    } catch (err: any) {
      toast.error('Failed to load projects: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }

  function toggleProject(key: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function toggleAll() {
    setSelected(prev => prev.size === projects.length ? new Set() : new Set(projects.map(p => p.key)));
  }

  async function handleSync() {
    if (selected.size === 0) { toast.error('Select at least one project'); return; }

    setPhase('syncing');
    setProgressPct(0);
    setProgressLabel('Initializing connection...');
    setCurrentProject('');

    const projectKeys = Array.from(selected);
    const total = projectKeys.length;

    const progressInterval = setInterval(() => {
      setProgressPct(prev => prev >= 90 ? prev : prev + Math.random() * 3);
    }, 400);

    const labelInterval = setInterval(() => {
      setProgressPct(prev => {
        if (prev < 15) { setProgressLabel('Authenticating with Jira...'); setCurrentProject(''); }
        else if (prev < 30) { setProgressLabel('Fetching project metadata...'); setCurrentProject(projectKeys[0]); }
        else if (prev < 50) { setProgressLabel('Delta comparing issues...'); setCurrentProject(projectKeys[Math.min(Math.floor(prev / (90 / total)), total - 1)]); }
        else if (prev < 70) { setProgressLabel('Upserting changed items...'); }
        else if (prev < 85) { setProgressLabel('Soft-flagging removals...'); }
        else { setProgressLabel('Writing sync log...'); }
        return prev;
      });
    }, 800);

    try {
      const { data, error } = await supabase.functions.invoke('jira-sync-projects', {
        body: { projectKeys, syncMode },
      });
      clearInterval(progressInterval);
      clearInterval(labelInterval);

      if (error) throw error;

      setProgressPct(100);
      setProgressLabel('Sync complete');
      setSyncResult({
        synced: data?.synced ?? total,
        created: data?.created ?? 0,
        updated: data?.updated ?? 0,
        softDeleted: data?.softDeleted ?? 0,
        baselineTotal: data?.baselineTotal ?? 0,
        errors: 0,
      });
      setPhase('complete');
      queryClient.invalidateQueries({ queryKey: ['projecthub', 'projects'] });
      loadRecentSyncs(); // refresh sync history
    } catch (err: any) {
      clearInterval(progressInterval);
      clearInterval(labelInterval);
      setPhase('error');
      setProgressLabel(err.message || 'Sync failed');
      toast.error('Sync failed: ' + (err.message || 'Unknown error'));
    }
  }

  function handleConfirmComplete() {
    onClose();
    setPhase('idle');
    setProgressPct(0);
    setSyncResult(null);
  }

  function formatAge(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  function formatDuration(ms: number) {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  if (!open) return null;

  const selectedMode = SYNC_OPTIONS.find(o => o.value === syncMode)!;
  const isSyncing = phase === 'syncing';
  const isComplete = phase === 'complete';
  const isError = phase === 'error';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={!isSyncing ? onClose : undefined} style={{ position: 'absolute', inset: 0, background: 'rgba(9,9,11,0.5)', backdropFilter: 'blur(4px)' }} />

      <div style={{
        position: 'relative', width: 620, maxHeight: '88vh',
        background: 'var(--cp-float)', borderRadius: 16,
        boxShadow: '0 25px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.05)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>

        {/* ─── HEADER with Jira Icon ─── */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--divider)',
          background: 'linear-gradient(180deg, #FAFBFF 0%, #FFFFFF 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: 'linear-gradient(135deg, #2684FF, #0052CC)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(38,132,255,0.3)',
              }}>
                <JiraIcon size={20} color="#FFF" />
              </div>
              <div>
                <h2 style={{
                  fontSize: 17, fontWeight: 700, fontFamily: "'Sora', system-ui, sans-serif",
                  color: 'var(--fg-1)', margin: 0, letterSpacing: '-0.02em',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  Jira Sync
                  <span style={{
                    fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                    color: '#0D9488', background: '#F0FDFA', padding: '2px 6px',
                    borderRadius: 4, letterSpacing: '0.04em',
                  }}>GUARDRAIL</span>
                </h2>
                <p style={{ fontSize: 12, color: 'var(--fg-3)', margin: '2px 0 0', fontWeight: 400 }}>
                  Append-only delta sync — data is never deleted
                </p>
              </div>
            </div>
            <button
              onClick={!isSyncing ? onClose : undefined} disabled={isSyncing}
              style={{
                background: 'none', border: '1px solid var(--divider)', borderRadius: 8,
                width: 32, height: 32, cursor: isSyncing ? 'not-allowed' : 'pointer',
                color: 'var(--fg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            ><X size={15} /></button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '3px 10px', borderRadius: 20,
              background: 'var(--tint-green, #F0FDF4)', border: '1px solid #BBF7D0',
              fontSize: 10, fontWeight: 600, color: 'var(--sem-success)',
              fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.02em',
            }}>
              <Shield size={10} /> ENCRYPTED · TLS 1.3
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '3px 10px', borderRadius: 20,
              background: 'var(--cp-blue-wash)', border: '1px solid var(--cp-primary-20)',
              fontSize: 10, fontWeight: 600, color: 'var(--cp-blue)',
              fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.02em',
            }}>
              <Database size={10} /> APPEND-ONLY
            </div>
          </div>
        </div>

        {/* ─── SYNCING / COMPLETE / ERROR ─── */}
        {(isSyncing || isComplete || isError) && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 40px' }}>

            {isSyncing && (
              <>
                <div style={{
                  width: 72, height: 72, borderRadius: 20,
                  background: 'linear-gradient(135deg, var(--tint-blue, #EFF6FF), #DBEAFE)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 24, position: 'relative',
                }}>
                  <JiraIcon size={28} color="#2684FF" />
                  <div style={{
                    position: 'absolute', top: -4, right: -4,
                    width: 20, height: 20, borderRadius: 12,
                    background: 'var(--cp-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Loader2 size={12} color="#FFF" className="animate-spin" />
                  </div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-1)', fontFamily: "'Sora', sans-serif", marginBottom: 4 }}>
                  Delta Synchronizing
                </div>
                <div style={{ fontSize: 13, color: 'var(--fg-3)', marginBottom: 24 }}>{progressLabel}</div>
                {currentProject && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '4px 12px', borderRadius: 6,
                    background: 'var(--bg-2)', marginBottom: 20,
                    fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: 'var(--fg-2)',
                  }}>
                    <Zap size={10} color="var(--sem-warning)" /> Processing: <span style={{ fontWeight: 700, color: 'var(--cp-blue)' }}>{currentProject}</span>
                  </div>
                )}
                <div style={{ width: '100%', maxWidth: 400 }}>
                  <div style={{ width: '100%', height: 8, borderRadius: 4, background: 'var(--bg-2)', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(progressPct, 100)}%`, height: '100%',
                      background: 'linear-gradient(90deg, #2684FF, #0052CC)',
                      borderRadius: 4, transition: 'width 0.4s ease',
                    }} />
                  </div>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', marginTop: 6,
                    fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: 'var(--fg-4)',
                  }}>
                    <span>{selected.size} project(s)</span>
                    <span>{Math.round(progressPct)}%</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 24, marginTop: 28 }}>
                  {[
                    { label: 'Auth', done: progressPct > 15 },
                    { label: 'Delta', done: progressPct > 35 },
                    { label: 'Upsert', done: progressPct > 65 },
                    { label: 'Log', done: progressPct > 90 },
                  ].map((step, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: 8,
                        background: step.done ? '#16A34A' : (progressPct > (i * 25) ? '#2563EB' : '#E4E4E7'),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {step.done ? <Check size={10} color="#FFF" /> :
                          progressPct > (i * 25) ? <Loader2 size={10} color="#FFF" className="animate-spin" /> : null}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: step.done ? 'var(--sem-success)' : 'var(--fg-3)' }}>{step.label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {isComplete && syncResult && (
              <>
                <div style={{
                  width: 72, height: 72, borderRadius: 20,
                  background: 'linear-gradient(135deg, var(--tint-green, #F0FDF4), #DCFCE7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
                }}>
                  <CheckCircle2 size={32} color="#16A34A" />
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-1)', fontFamily: "'Sora', sans-serif", marginBottom: 4 }}>
                  Sync Complete
                </div>
                <div style={{ fontSize: 13, color: 'var(--fg-3)', marginBottom: 28 }}>
                  Baseline preserved — {syncResult.baselineTotal} total items in database
                </div>

                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1,
                  background: 'var(--divider)', borderRadius: 12, overflow: 'hidden',
                  width: '100%', maxWidth: 440, marginBottom: 32,
                }}>
                  {[
                    { label: 'Created', value: syncResult.created, color: 'var(--sem-success)' },
                    { label: 'Updated', value: syncResult.updated, color: 'var(--sem-warning)' },
                    { label: 'Removed', value: syncResult.softDeleted, color: 'var(--sem-danger)' },
                    { label: 'Baseline', value: syncResult.baselineTotal, color: 'var(--cp-blue)' },
                  ].map((s, i) => (
                    <div key={i} style={{ background: 'var(--bg-app)', padding: '14px 8px', textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: s.color, fontFamily: "'Sora', sans-serif", letterSpacing: '-0.02em' }}>
                        {s.value}
                      </div>
                      <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={handleConfirmComplete} style={{
                  height: 40, padding: '0 32px', fontSize: 14, fontWeight: 600,
                  color: '#FFF', background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                  border: 'none', borderRadius: 12, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
                }}>
                  <Check size={16} /> Confirm & Close
                </button>
              </>
            )}

            {isError && (
              <>
                <div style={{
                  width: 72, height: 72, borderRadius: 20,
                  background: 'linear-gradient(135deg, var(--tint-red, #FEF2F2), #FEE2E2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
                }}>
                  <AlertCircle size={32} color="#DC2626" />
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-1)', fontFamily: "'Sora', sans-serif", marginBottom: 4 }}>Sync Failed</div>
                <div style={{ fontSize: 13, color: 'var(--fg-3)', marginBottom: 8, textAlign: 'center', maxWidth: 340 }}>{progressLabel}</div>
                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button onClick={() => { setPhase('idle'); setProgressPct(0); }} style={{
                    height: 36, padding: '0 20px', fontSize: 13, fontWeight: 500,
                    color: 'var(--fg-2)', background: 'var(--bg-app)', border: '1px solid var(--divider)', borderRadius: 8, cursor: 'pointer',
                  }}>Try Again</button>
                  <button onClick={onClose} style={{
                    height: 36, padding: '0 20px', fontSize: 13, fontWeight: 600,
                    color: '#FFF', background: 'var(--sem-danger)', border: 'none', borderRadius: 8, cursor: 'pointer',
                  }}>Close</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── IDLE STATE ─── */}
        {phase === 'idle' && (
          <>
            {/* Last 3 Syncs */}
            {recentSyncs.length > 0 && (
              <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--divider)', background: 'var(--bg-1)' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
                  fontSize: 10, fontWeight: 700, color: 'var(--fg-3)', textTransform: 'uppercase',
                  letterSpacing: '0.06em', fontFamily: "'Inter', sans-serif",
                }}>
                  <History size={11} /> Last Syncs
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {recentSyncs.map((s, i) => (
                    <div key={s.id} style={{
                      flex: 1, padding: '8px 10px', borderRadius: 8,
                      background: 'var(--bg-app)', border: '1px solid var(--divider)',
                      fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{
                          fontSize: 9, fontWeight: 700,
                          color: s.status === 'completed' ? '#16A34A' : '#DC2626',
                          textTransform: 'uppercase',
                        }}>
                          {s.status === 'completed' ? '✓ OK' : '✗ FAIL'}
                        </span>
                        <span style={{ color: 'var(--fg-4)', fontSize: 9 }}>{formatAge(s.started_at)}</span>
                      </div>
                      <div style={{ color: 'var(--fg-2)', fontSize: 10, fontWeight: 600 }}>
                        +{s.items_created} / ~{s.items_updated}
                        {s.items_deleted_soft > 0 && <span style={{ color: 'var(--sem-danger)' }}> / −{s.items_deleted_soft}</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3, color: 'var(--fg-4)', fontSize: 9 }}>
                        <Calendar size={8} />
                        <span>{s.baseline_snapshot_date}</span>
                        <span>·</span>
                        <span>{s.total_items_in_baseline} items</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sync Mode */}
            <div style={{ padding: '14px 24px 12px', borderBottom: '1px solid var(--cp-bd-zone)' }}>
              <label style={{
                fontSize: 10, fontWeight: 700, color: 'var(--fg-3)', textTransform: 'uppercase',
                letterSpacing: '0.06em', fontFamily: "'Inter', sans-serif",
              }}>Sync Mode</label>
              <div style={{ position: 'relative', marginTop: 6 }}>
                <button
                  onClick={() => setShowModeDropdown(!showModeDropdown)}
                  style={{
                    width: '100%', height: 40, padding: '0 14px',
                    background: 'var(--bg-1)', border: '1px solid var(--divider)', borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    fontSize: 13, fontWeight: 500, color: 'var(--fg-1)', cursor: 'pointer',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{selectedMode.icon}</span>
                    <span style={{ fontWeight: 600 }}>{selectedMode.label}</span>
                    <span style={{ color: 'var(--fg-3)', fontWeight: 400, fontSize: 12 }}>— {selectedMode.desc}</span>
                  </span>
                  <ChevronDown size={14} color="var(--fg-4)" style={{ transition: 'transform 0.2s', transform: showModeDropdown ? 'rotate(180deg)' : 'none' }} />
                </button>
                {showModeDropdown && (
                  <div style={{
                    position: 'absolute', top: 44, left: 0, right: 0, zIndex: 10,
                    background: 'var(--bg-app)', border: '1px solid var(--divider)', borderRadius: 12,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden',
                  }}>
                    {SYNC_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => { setSyncMode(opt.value); setShowModeDropdown(false); }} style={{
                        width: '100%', padding: '10px 14px', textAlign: 'left',
                        background: syncMode === opt.value ? 'var(--tint-blue, #EFF6FF)' : 'transparent',
                        border: 'none', cursor: 'pointer', fontSize: 13,
                        display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--cp-bd-zone)',
                      }}>
                        <span style={{ fontSize: 16 }}>{opt.icon}</span>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--fg-1)' }}>{opt.label}</div>
                          <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 1 }}>{opt.desc}</div>
                        </div>
                        {syncMode === opt.value && <Check size={14} color="var(--cp-blue)" style={{ marginLeft: 'auto' }} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Project List */}
            <div style={{ flex: 1, overflow: 'auto', padding: '10px 24px 8px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 0 8px', borderBottom: '1px solid var(--divider)',
              }}>
                <label style={{
                  fontSize: 10, fontWeight: 700, color: 'var(--fg-3)', textTransform: 'uppercase',
                  letterSpacing: '0.06em', fontFamily: "'Inter', sans-serif",
                }}>Projects ({selected.size} of {projects.length} selected)</label>
                <button onClick={toggleAll} style={{
                  background: 'none', border: 'none', fontSize: 11, color: 'var(--cp-blue)',
                  fontWeight: 700, cursor: 'pointer', padding: '2px 6px', borderRadius: 4,
                }}>{selected.size === projects.length ? 'Deselect All' : 'Select All'}</button>
              </div>

              {loading ? (
                <div style={{ padding: 48, textAlign: 'center', color: 'var(--fg-4)', fontSize: 13 }}>
                  <Loader2 size={22} className="animate-spin" style={{ margin: '0 auto 10px', display: 'block' }} />
                  Loading projects...
                </div>
              ) : (
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  {projects.map((p, idx) => {
                    const isSelected = selected.has(p.key);
                    return (
                      <label key={p.key} style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '9px 8px',
                        borderBottom: idx < projects.length - 1 ? '1px solid #FAFAFA' : 'none',
                        cursor: 'pointer', borderRadius: 6,
                        background: isSelected ? '#F0F4FF' : 'transparent',
                      }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: 6,
                          border: isSelected ? 'none' : '2px solid #D4D4D8',
                          background: isSelected ? '#2563EB' : '#FFF',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          {isSelected && <Check size={12} color="#FFF" strokeWidth={3} />}
                          <input type="checkbox" checked={isSelected} onChange={() => toggleProject(p.key)}
                            style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
                        </div>
                        <span style={{
                          fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                          color: 'var(--cp-blue)', minWidth: 52, letterSpacing: '0.02em',
                        }}>{p.key}</span>
                        <span style={{
                          flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--fg-1)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{p.name}</span>
                        <span style={{
                          fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                          color: p.issueCount > 0 ? 'var(--fg-3)' : '#D4D4D8', flexShrink: 0, fontWeight: 500,
                        }}>{p.issueCount} issues</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '14px 24px', borderTop: '1px solid var(--divider)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-1)',
            }}>
              <span style={{ fontSize: 11, color: 'var(--fg-4)', fontFamily: "'JetBrains Mono', monospace" }}>
                {selected.size} project(s) · {selectedMode.label}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={onClose} style={{
                  height: 36, padding: '0 18px', fontSize: 13, fontWeight: 500,
                  color: 'var(--fg-2)', background: 'var(--bg-app)', border: '1px solid var(--divider)', borderRadius: 8, cursor: 'pointer',
                }}>Cancel</button>
                <button onClick={handleSync} disabled={selected.size === 0} style={{
                  height: 36, padding: '0 20px', fontSize: 13, fontWeight: 600,
                  color: '#FFF',
                  background: selected.size === 0 ? '#A1A1AA' : 'linear-gradient(135deg, #2684FF, #0052CC)',
                  border: 'none', borderRadius: 8,
                  cursor: selected.size === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 7,
                  boxShadow: selected.size > 0 ? '0 2px 8px rgba(38,132,255,0.3)' : 'none',
                }}>
                  <JiraIcon size={14} color="#FFF" /> Start Sync
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
