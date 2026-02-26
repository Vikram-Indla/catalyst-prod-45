import { useState, useEffect } from 'react';
import { RefreshCw, Check, ChevronDown, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

type SyncMode = '3months' | '6months' | 'changes_only';

const SYNC_OPTIONS: { value: SyncMode; label: string; desc: string }[] = [
  { value: '3months', label: '3 Months', desc: 'Sync last 3 months of data' },
  { value: '6months', label: '6 Months', desc: 'Sync last 6 months of data' },
  { value: 'changes_only', label: 'Only Changes', desc: 'Sync only recent changes' },
];

interface JiraProject {
  key: string;
  name: string;
  issueCount: number;
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
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState('');
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      loadProjects();
    }
  }, [open]);

  async function loadProjects() {
    setLoading(true);
    try {
      // Get projects from ph_issues grouped by project_key
      const { data, error } = await (supabase as any)
        .from('ph_issues')
        .select('project_key')
        .limit(5000);

      if (error) throw error;

      const countMap: Record<string, number> = {};
      for (const row of data ?? []) {
        countMap[row.project_key] = (countMap[row.project_key] || 0) + 1;
      }

      // Also get project names from projects table
      const { data: projectData } = await (supabase as any)
        .from('projects')
        .select('key, name');

      const nameMap: Record<string, string> = {};
      for (const p of projectData ?? []) {
        nameMap[p.key] = p.name;
      }

      // Get from ph_projects too
      const { data: phProjects } = await (supabase as any)
        .from('ph_projects')
        .select('key, name');
      for (const p of phProjects ?? []) {
        if (!nameMap[p.key]) nameMap[p.key] = p.name;
      }

      // Also try to get Jira projects that might not have been synced yet
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
        .map(key => ({
          key,
          name: nameMap[key] || key,
          issueCount: countMap[key] || 0,
        }))
        .sort((a, b) => b.issueCount - a.issueCount);

      setProjects(projectList);
      // Pre-select all
      setSelected(new Set(projectList.map(p => p.key)));
    } catch (err: any) {
      toast.error('Failed to load projects: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }

  function toggleProject(key: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === projects.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(projects.map(p => p.key)));
    }
  }

  async function handleSync() {
    if (selected.size === 0) {
      toast.error('Please select at least one project');
      return;
    }

    setSyncing(true);
    setSyncProgress('Starting sync...');

    try {
      const { data, error } = await supabase.functions.invoke('jira-sync-projects', {
        body: {
          projectKeys: Array.from(selected),
          syncMode,
        },
      });

      if (error) throw error;

      toast.success(`Synced ${data?.synced ?? 0} projects successfully`);
      queryClient.invalidateQueries({ queryKey: ['projecthub', 'projects'] });
      onClose();
    } catch (err: any) {
      toast.error('Sync failed: ' + (err.message || 'Unknown error'));
    } finally {
      setSyncing(false);
      setSyncProgress('');
    }
  }

  if (!open) return null;

  const selectedMode = SYNC_OPTIONS.find(o => o.value === syncMode)!;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
      />

      {/* Dialog */}
      <div style={{
        position: 'relative', width: 560, maxHeight: '80vh',
        background: '#FFF', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #E2E8F0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Sora', sans-serif", color: '#0F172A', margin: 0 }}>
              <RefreshCw size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: -2 }} />
              Jira Sync
            </h2>
            <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
              Select projects and sync mode to pull data from Jira
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: '1px solid #E2E8F0', borderRadius: 6,
            width: 28, height: 28, cursor: 'pointer', color: '#94A3B8', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        {/* Sync Mode Selector */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #F1F5F9' }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Sync Mode
          </label>
          <div style={{ position: 'relative', marginTop: 4 }}>
            <button
              onClick={() => setShowModeDropdown(!showModeDropdown)}
              style={{
                width: '100%', height: 36, padding: '0 12px',
                background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                fontSize: 13, fontWeight: 500, color: '#0F172A', cursor: 'pointer',
              }}
            >
              <span>{selectedMode.label} — <span style={{ color: '#64748B', fontWeight: 400 }}>{selectedMode.desc}</span></span>
              <ChevronDown size={14} color="#94A3B8" />
            </button>
            {showModeDropdown && (
              <div style={{
                position: 'absolute', top: 40, left: 0, right: 0, zIndex: 10,
                background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 6,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}>
                {SYNC_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setSyncMode(opt.value); setShowModeDropdown(false); }}
                    style={{
                      width: '100%', padding: '8px 12px', textAlign: 'left',
                      background: syncMode === opt.value ? '#EFF6FF' : 'transparent',
                      border: 'none', cursor: 'pointer', fontSize: 13,
                      display: 'flex', flexDirection: 'column',
                      borderBottom: '1px solid #F1F5F9',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>{opt.label}</span>
                    <span style={{ fontSize: 11, color: '#64748B' }}>{opt.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Project List */}
        <div style={{ flex: 1, overflow: 'auto', padding: '8px 20px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '6px 0', borderBottom: '1px solid #E2E8F0', marginBottom: 4,
          }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Projects ({selected.size} of {projects.length} selected)
            </label>
            <button
              onClick={toggleAll}
              style={{
                background: 'none', border: 'none', fontSize: 11, color: '#2563EB',
                fontWeight: 600, cursor: 'pointer', padding: '2px 4px',
              }}
            >
              {selected.size === projects.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
              <Loader2 size={20} className="animate-spin" style={{ margin: '0 auto 8px' }} />
              Loading projects...
            </div>
          ) : (
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {projects.map(p => (
                <label
                  key={p.key}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '7px 4px',
                    borderBottom: '1px solid #F8FAFC', cursor: 'pointer',
                    background: selected.has(p.key) ? '#FAFBFE' : 'transparent',
                    borderRadius: 4,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(p.key)}
                    onChange={() => toggleProject(p.key)}
                    style={{ width: 16, height: 16, accentColor: '#2563EB', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <span style={{
                    fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                    color: '#2563EB', minWidth: 48,
                  }}>
                    {p.key}
                  </span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </span>
                  <span style={{
                    fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                    color: '#94A3B8', flexShrink: 0,
                  }}>
                    {p.issueCount} issues
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid #E2E8F0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#FAFBFC',
        }}>
          <span style={{ fontSize: 11, color: '#94A3B8' }}>
            {syncing ? syncProgress : `${selected.size} project(s) will be synced`}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              disabled={syncing}
              style={{
                height: 32, padding: '0 14px', fontSize: 13, fontWeight: 500,
                color: '#334155', background: '#FFF', border: '1px solid #E2E8F0',
                borderRadius: 6, cursor: syncing ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSync}
              disabled={syncing || selected.size === 0}
              style={{
                height: 32, padding: '0 16px', fontSize: 13, fontWeight: 600,
                color: '#FFF', background: syncing ? '#93C5FD' : '#2563EB',
                border: 'none', borderRadius: 6,
                cursor: syncing || selected.size === 0 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {syncing ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Syncing...
                </>
              ) : (
                <>
                  <RefreshCw size={14} /> Start Sync
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
