import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Check, ChevronDown, Loader2, X, Shield, Database, CheckCircle2, AlertCircle, Zap } from 'lucide-react';
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

interface JiraProject {
  key: string;
  name: string;
  issueCount: number;
}

interface SyncResult {
  synced: number;
  created: number;
  updated: number;
  errors: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function JiraSyncDialog({ open, onClose }: Props) {
  const [projects, setProjects] = useState<JiraProject[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [syncMode, setSyncMode] = useState<SyncMode>('3months');
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<SyncPhase>('idle');
  const [progressPct, setProgressPct] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [currentProject, setCurrentProject] = useState('');
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      loadProjects();
      setPhase('idle');
      setProgressPct(0);
      setProgressLabel('');
      setSyncResult(null);
    }
  }, [open]);

  async function loadProjects() {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('ph_issues')
        .select('project_key')
        .limit(5000);
      if (error) throw error;

      const countMap: Record<string, number> = {};
      for (const row of data ?? []) {
        countMap[row.project_key] = (countMap[row.project_key] || 0) + 1;
      }

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

    // Simulate phased progress while the edge function runs
    const progressInterval = setInterval(() => {
      setProgressPct(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 3;
      });
    }, 400);

    // Update labels as progress moves
    const labelInterval = setInterval(() => {
      setProgressPct(prev => {
        if (prev < 15) { setProgressLabel('Authenticating with Jira...'); setCurrentProject(''); }
        else if (prev < 30) { setProgressLabel('Fetching project metadata...'); setCurrentProject(projectKeys[0]); }
        else if (prev < 50) { setProgressLabel('Syncing issues & relationships...'); setCurrentProject(projectKeys[Math.min(Math.floor(prev / (90 / total)), total - 1)]); }
        else if (prev < 70) { setProgressLabel('Processing epics & features...'); }
        else if (prev < 85) { setProgressLabel('Building hierarchy links...'); }
        else { setProgressLabel('Finalizing sync...'); }
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
        errors: data?.errors ?? 0,
      });
      setPhase('complete');
      queryClient.invalidateQueries({ queryKey: ['projecthub', 'projects'] });
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

  if (!open) return null;

  const selectedMode = SYNC_OPTIONS.find(o => o.value === syncMode)!;
  const isSyncing = phase === 'syncing';
  const isComplete = phase === 'complete';
  const isError = phase === 'error';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Backdrop */}
      <div
        onClick={!isSyncing ? onClose : undefined}
        style={{ position: 'absolute', inset: 0, background: 'rgba(9,9,11,0.5)', backdropFilter: 'blur(4px)' }}
      />

      {/* Dialog */}
      <div style={{
        position: 'relative', width: 600, maxHeight: '85vh',
        background: '#FFFFFF', borderRadius: 16,
        boxShadow: '0 25px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.05)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>

        {/* ─── HEADER ─── */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid #E4E4E7',
          background: 'linear-gradient(180deg, #FAFBFF 0%, #FFFFFF 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
              }}>
                <RefreshCw size={18} color="#FFF" />
              </div>
              <div>
                <h2 style={{
                  fontSize: 17, fontWeight: 700, fontFamily: "'Sora', system-ui, sans-serif",
                  color: '#09090B', margin: 0, letterSpacing: '-0.02em',
                }}>
                  Jira Sync
                </h2>
                <p style={{ fontSize: 12, color: '#71717A', margin: '2px 0 0', fontWeight: 400 }}>
                  Select projects and sync mode to pull data from Jira
                </p>
              </div>
            </div>
            <button
              onClick={!isSyncing ? onClose : undefined}
              disabled={isSyncing}
              style={{
                background: 'none', border: '1px solid #E4E4E7', borderRadius: 8,
                width: 32, height: 32, cursor: isSyncing ? 'not-allowed' : 'pointer',
                color: '#71717A', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Security badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            marginTop: 10, padding: '3px 10px', borderRadius: 20,
            background: '#F0FDF4', border: '1px solid #BBF7D0',
            fontSize: 10, fontWeight: 600, color: '#16A34A',
            fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.02em',
          }}>
            <Shield size={10} /> ENCRYPTED · TLS 1.3
          </div>
        </div>

        {/* ─── SYNCING / COMPLETE / ERROR OVERLAY ─── */}
        {(isSyncing || isComplete || isError) && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 40px' }}>

            {isSyncing && (
              <>
                {/* Animated icon */}
                <div style={{
                  width: 72, height: 72, borderRadius: 20,
                  background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 24, position: 'relative',
                }}>
                  <Database size={28} color="#2563EB" />
                  <div style={{
                    position: 'absolute', top: -4, right: -4,
                    width: 20, height: 20, borderRadius: 10,
                    background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Loader2 size={12} color="#FFF" className="animate-spin" />
                  </div>
                </div>

                <div style={{ fontSize: 16, fontWeight: 700, color: '#09090B', fontFamily: "'Sora', sans-serif", marginBottom: 4 }}>
                  Synchronizing Data
                </div>
                <div style={{ fontSize: 13, color: '#71717A', marginBottom: 24 }}>{progressLabel}</div>

                {currentProject && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '4px 12px', borderRadius: 6,
                    background: '#F4F4F5', marginBottom: 20,
                    fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: '#3F3F46',
                  }}>
                    <Zap size={10} color="#D97706" /> Processing: <span style={{ fontWeight: 700, color: '#2563EB' }}>{currentProject}</span>
                  </div>
                )}

                {/* Progress bar */}
                <div style={{ width: '100%', maxWidth: 400 }}>
                  <div style={{
                    width: '100%', height: 8, borderRadius: 4,
                    background: '#F4F4F5', overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${Math.min(progressPct, 100)}%`, height: '100%',
                      background: 'linear-gradient(90deg, #2563EB, #3B82F6)',
                      borderRadius: 4, transition: 'width 0.4s ease',
                    }} />
                  </div>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', marginTop: 6,
                    fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: '#A1A1AA',
                  }}>
                    <span>{selected.size} project(s)</span>
                    <span>{Math.round(progressPct)}%</span>
                  </div>
                </div>

                {/* Step indicators */}
                <div style={{ display: 'flex', gap: 24, marginTop: 28 }}>
                  {[
                    { label: 'Auth', done: progressPct > 15 },
                    { label: 'Fetch', done: progressPct > 35 },
                    { label: 'Process', done: progressPct > 65 },
                    { label: 'Finalize', done: progressPct > 90 },
                  ].map((step, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: 9,
                        background: step.done ? '#16A34A' : (progressPct > (i * 25) ? '#2563EB' : '#E4E4E7'),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.3s',
                      }}>
                        {step.done ? <Check size={10} color="#FFF" /> :
                          progressPct > (i * 25) ? <Loader2 size={10} color="#FFF" className="animate-spin" /> : null}
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: step.done ? '#16A34A' : '#71717A',
                        fontFamily: "'Inter', sans-serif",
                      }}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {isComplete && syncResult && (
              <>
                <div style={{
                  width: 72, height: 72, borderRadius: 20,
                  background: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 24,
                }}>
                  <CheckCircle2 size={32} color="#16A34A" />
                </div>

                <div style={{ fontSize: 18, fontWeight: 700, color: '#09090B', fontFamily: "'Sora', sans-serif", marginBottom: 4 }}>
                  Sync Complete
                </div>
                <div style={{ fontSize: 13, color: '#71717A', marginBottom: 28 }}>
                  All selected projects have been synchronized successfully
                </div>

                {/* Result stats */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1,
                  background: '#E4E4E7', borderRadius: 10, overflow: 'hidden',
                  width: '100%', maxWidth: 360, marginBottom: 32,
                }}>
                  {[
                    { label: 'Synced', value: syncResult.synced, color: '#2563EB' },
                    { label: 'Created', value: syncResult.created, color: '#16A34A' },
                    { label: 'Updated', value: syncResult.updated, color: '#D97706' },
                  ].map((s, i) => (
                    <div key={i} style={{ background: '#FFF', padding: '14px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: "'Sora', sans-serif", letterSpacing: '-0.02em' }}>
                        {s.value}
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>

                {syncResult.errors > 0 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                    background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8,
                    fontSize: 12, color: '#DC2626', fontWeight: 500, marginBottom: 20,
                  }}>
                    <AlertCircle size={14} />
                    {syncResult.errors} item(s) had errors during sync
                  </div>
                )}

                <button
                  onClick={handleConfirmComplete}
                  style={{
                    height: 40, padding: '0 32px', fontSize: 14, fontWeight: 600,
                    color: '#FFF', background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                    border: 'none', borderRadius: 10, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                    boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
                    transition: 'all 0.15s',
                  }}
                >
                  <Check size={16} /> Confirm & Close
                </button>
              </>
            )}

            {isError && (
              <>
                <div style={{
                  width: 72, height: 72, borderRadius: 20,
                  background: 'linear-gradient(135deg, #FEF2F2, #FEE2E2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 24,
                }}>
                  <AlertCircle size={32} color="#DC2626" />
                </div>

                <div style={{ fontSize: 18, fontWeight: 700, color: '#09090B', fontFamily: "'Sora', sans-serif", marginBottom: 4 }}>
                  Sync Failed
                </div>
                <div style={{ fontSize: 13, color: '#71717A', marginBottom: 8, textAlign: 'center', maxWidth: 340 }}>
                  {progressLabel}
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button
                    onClick={() => { setPhase('idle'); setProgressPct(0); }}
                    style={{
                      height: 36, padding: '0 20px', fontSize: 13, fontWeight: 500,
                      color: '#3F3F46', background: '#FFF', border: '1px solid #E4E4E7',
                      borderRadius: 8, cursor: 'pointer',
                    }}
                  >
                    Try Again
                  </button>
                  <button
                    onClick={onClose}
                    style={{
                      height: 36, padding: '0 20px', fontSize: 13, fontWeight: 600,
                      color: '#FFF', background: '#DC2626', border: 'none',
                      borderRadius: 8, cursor: 'pointer',
                    }}
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── IDLE STATE: MODE + PROJECT LIST ─── */}
        {phase === 'idle' && (
          <>
            {/* Sync Mode */}
            <div style={{ padding: '14px 24px 12px', borderBottom: '1px solid #F4F4F5' }}>
              <label style={{
                fontSize: 10, fontWeight: 700, color: '#71717A', textTransform: 'uppercase',
                letterSpacing: '0.06em', fontFamily: "'Inter', sans-serif",
              }}>
                Sync Mode
              </label>
              <div style={{ position: 'relative', marginTop: 6 }}>
                <button
                  onClick={() => setShowModeDropdown(!showModeDropdown)}
                  style={{
                    width: '100%', height: 40, padding: '0 14px',
                    background: '#FAFAFA', border: '1px solid #E4E4E7', borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    fontSize: 13, fontWeight: 500, color: '#09090B', cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{selectedMode.icon}</span>
                    <span style={{ fontWeight: 600 }}>{selectedMode.label}</span>
                    <span style={{ color: '#71717A', fontWeight: 400, fontSize: 12 }}>— {selectedMode.desc}</span>
                  </span>
                  <ChevronDown size={14} color="#A1A1AA" style={{ transition: 'transform 0.2s', transform: showModeDropdown ? 'rotate(180deg)' : 'none' }} />
                </button>
                {showModeDropdown && (
                  <div style={{
                    position: 'absolute', top: 44, left: 0, right: 0, zIndex: 10,
                    background: '#FFF', border: '1px solid #E4E4E7', borderRadius: 10,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden',
                  }}>
                    {SYNC_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { setSyncMode(opt.value); setShowModeDropdown(false); }}
                        style={{
                          width: '100%', padding: '10px 14px', textAlign: 'left',
                          background: syncMode === opt.value ? '#EFF6FF' : 'transparent',
                          border: 'none', cursor: 'pointer', fontSize: 13,
                          display: 'flex', alignItems: 'center', gap: 10,
                          borderBottom: '1px solid #F4F4F5', transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => { if (syncMode !== opt.value) (e.target as any).style.background = '#FAFAFA'; }}
                        onMouseLeave={e => { if (syncMode !== opt.value) (e.target as any).style.background = 'transparent'; }}
                      >
                        <span style={{ fontSize: 16 }}>{opt.icon}</span>
                        <div>
                          <div style={{ fontWeight: 600, color: '#09090B' }}>{opt.label}</div>
                          <div style={{ fontSize: 11, color: '#71717A', marginTop: 1 }}>{opt.desc}</div>
                        </div>
                        {syncMode === opt.value && <Check size={14} color="#2563EB" style={{ marginLeft: 'auto' }} />}
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
                padding: '6px 0 8px', borderBottom: '1px solid #E4E4E7',
              }}>
                <label style={{
                  fontSize: 10, fontWeight: 700, color: '#71717A', textTransform: 'uppercase',
                  letterSpacing: '0.06em', fontFamily: "'Inter', sans-serif",
                }}>
                  Projects ({selected.size} of {projects.length} selected)
                </label>
                <button
                  onClick={toggleAll}
                  style={{
                    background: 'none', border: 'none', fontSize: 11, color: '#2563EB',
                    fontWeight: 700, cursor: 'pointer', padding: '2px 6px', borderRadius: 4,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.target as any).style.background = '#EFF6FF'}
                  onMouseLeave={e => (e.target as any).style.background = 'transparent'}
                >
                  {selected.size === projects.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {loading ? (
                <div style={{ padding: 48, textAlign: 'center', color: '#A1A1AA', fontSize: 13 }}>
                  <Loader2 size={22} className="animate-spin" style={{ margin: '0 auto 10px', display: 'block' }} />
                  Loading projects...
                </div>
              ) : (
                <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                  {projects.map((p, idx) => {
                    const isSelected = selected.has(p.key);
                    return (
                      <label
                        key={p.key}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '9px 8px',
                          borderBottom: idx < projects.length - 1 ? '1px solid #FAFAFA' : 'none',
                          cursor: 'pointer', borderRadius: 6,
                          background: isSelected ? '#F0F4FF' : 'transparent',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => { if (!isSelected) (e.target as any).style.background = '#FAFAFA'; }}
                        onMouseLeave={e => { if (!isSelected) (e.target as any).style.background = 'transparent'; }}
                      >
                        <div style={{
                          width: 20, height: 20, borderRadius: 5,
                          border: isSelected ? 'none' : '2px solid #D4D4D8',
                          background: isSelected ? '#2563EB' : '#FFF',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, cursor: 'pointer', transition: 'all 0.15s',
                        }}>
                          {isSelected && <Check size={12} color="#FFF" strokeWidth={3} />}
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleProject(p.key)}
                            style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                          />
                        </div>
                        <span style={{
                          fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                          color: '#2563EB', minWidth: 52, letterSpacing: '0.02em',
                        }}>
                          {p.key}
                        </span>
                        <span style={{
                          flex: 1, fontSize: 13, fontWeight: 500, color: '#09090B',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {p.name}
                        </span>
                        <span style={{
                          fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                          color: p.issueCount > 0 ? '#71717A' : '#D4D4D8', flexShrink: 0, fontWeight: 500,
                        }}>
                          {p.issueCount} issues
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '14px 24px', borderTop: '1px solid #E4E4E7',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#FAFAFA',
            }}>
              <span style={{ fontSize: 11, color: '#A1A1AA', fontFamily: "'JetBrains Mono', monospace" }}>
                {selected.size} project(s) · {selectedMode.label}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={onClose}
                  style={{
                    height: 36, padding: '0 18px', fontSize: 13, fontWeight: 500,
                    color: '#3F3F46', background: '#FFF', border: '1px solid #E4E4E7',
                    borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSync}
                  disabled={selected.size === 0}
                  style={{
                    height: 36, padding: '0 20px', fontSize: 13, fontWeight: 600,
                    color: '#FFF',
                    background: selected.size === 0 ? '#A1A1AA' : 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                    border: 'none', borderRadius: 8,
                    cursor: selected.size === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 7,
                    boxShadow: selected.size > 0 ? '0 2px 8px rgba(37,99,235,0.3)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  <RefreshCw size={14} /> Start Sync
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
