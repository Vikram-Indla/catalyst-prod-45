import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Download, Clock, Loader2, CheckCircle2, AlertCircle, BarChart3, FolderGit2, ChevronDown, ChevronRight, Settings2 } from 'lucide-react';
import { MultiSelectDropdown, type MultiSelectOption } from './MultiSelectDropdown';
import {
  useAvailableProjects, useForceSync, useSyncConfig,
  useSaveFilterSettings, useAvailableIssueTypes, useSyncHealth,
  useAvailableFixVersions,
  type SyncLogEntry,
} from '../hooks/useSyncEngine';
import toast from 'react-hot-toast';

const LOOKBACK_OPTIONS = [
  { value: 1, label: '1 month' },
  { value: 2, label: '2 months' },
  { value: 3, label: '3 months' },
  { value: 4, label: '4 months' },
  { value: 5, label: '5 months' },
  { value: 6, label: '6 months' },
  { value: 0, label: 'Lifetime' },
];

/** Jira status categories — from Jira API statusCategory.name */
const JIRA_STATUS_CATEGORIES: MultiSelectOption[] = [
  { value: 'To Do', label: 'To Do', sublabel: 'New, Backlog, Open' },
  { value: 'In Progress', label: 'In Progress', sublabel: 'Active, Development, Review' },
  { value: 'Done', label: 'Done', sublabel: 'Closed, Resolved, Complete' },
];

/** Per-project sync configuration */
export interface ProjectSyncConfig {
  lookback_months: number;
  status_categories: string[];
  issue_types: string[];
  fix_versions: string[];
}

/** Sync progress phases per project */
interface SyncProjectProgress {
  key: string;
  name: string;
  status: 'pending' | 'syncing' | 'done' | 'error';
  startedAt?: number;
  durationMs?: number;
  issuesFetched?: number;
  errorMessage?: string;
}

export function SyncConfigPanel() {
  const { data: availableProjects = [], isLoading: projectsLoading } = useAvailableProjects();
  const { data: syncConfig, isLoading: configLoading } = useSyncConfig();
  const { data: syncHealth } = useSyncHealth();
  const { data: issueTypes = [], isLoading: typesLoading } = useAvailableIssueTypes();
  const { data: fixVersionsRaw = [] } = useAvailableFixVersions();
  const forceSync = useForceSync();
  const saveFilters = useSaveFilterSettings();

  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Per-project config
  const [projectConfigs, setProjectConfigs] = useState<Record<string, ProjectSyncConfig>>({});
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  // Progress tracking
  const [syncProgress, setSyncProgress] = useState<SyncProjectProgress[]>([]);
  const [syncOverallPhase, setSyncOverallPhase] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');
  

  // Track whether we've loaded the initial config from DB
  const initialLoadDone = useRef(false);

  // Load saved config — only on first successful fetch
  useEffect(() => {
    if (syncConfig && !initialLoadDone.current) {
      initialLoadDone.current = true;
      const savedProjects = syncConfig.sync_projects;
      if (Array.isArray(savedProjects) && savedProjects.length > 0) {
        setSelectedProjects(savedProjects);
      }
      const savedProjectConfigs = syncConfig.sync_project_config;
      if (savedProjectConfigs && typeof savedProjectConfigs === 'object') {
        const migrated: Record<string, ProjectSyncConfig> = {};
        Object.entries(savedProjectConfigs as Record<string, any>).forEach(([key, val]) => {
          migrated[key] = {
            lookback_months: val.lookback_months || 3,
            status_categories: val.status_categories || [],
            issue_types: val.issue_types || [],
            fix_versions: val.fix_versions || [],
          };
        });
        setProjectConfigs(migrated);
      }
    }
  }, [syncConfig]);

  // Ensure every selected project has a config entry
  useEffect(() => {
    setProjectConfigs(prev => {
      const next = { ...prev };
      let changed = false;
      selectedProjects.forEach(pk => {
        if (!next[pk]) {
          next[pk] = { lookback_months: 3, status_categories: [], issue_types: [], fix_versions: [] };
          changed = true;
        }
      });
      Object.keys(next).forEach(pk => {
        if (!selectedProjects.includes(pk)) {
          delete next[pk];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [selectedProjects]);

  const projectOptions: MultiSelectOption[] = availableProjects.map(p => ({
    value: p.key, label: p.key, sublabel: p.name,
  }));

  const issueTypeOptions: MultiSelectOption[] = issueTypes.map(t => ({ value: t, label: t }));

  // Fix versions grouped by project
  const fixVersionsByProject = useMemo(() => {
    const map: Record<string, MultiSelectOption[]> = {};
    fixVersionsRaw.forEach(v => {
      if (!map[v.project_key]) {
        map[v.project_key] = [{ value: '__NO_VERSION__', label: 'No version', sublabel: 'Unassigned to any release' }];
      }
      map[v.project_key].push({
        value: v.name,
        label: v.name,
        sublabel: v.released ? 'Released' : undefined,
      });
    });
    // For projects with no versions at all, still offer the "No version" option
    selectedProjects.forEach(pk => {
      if (!map[pk]) {
        map[pk] = [{ value: '__NO_VERSION__', label: 'No version', sublabel: 'Unassigned to any release' }];
      }
    });
    return map;
  }, [fixVersionsRaw, selectedProjects]);

  const handleProjectChange = (newSelected: string[]) => {
    setSelectedProjects(newSelected);
    setHasChanges(true);
  };

  const updateProjectConfig = (projectKey: string, update: Partial<ProjectSyncConfig>) => {
    setProjectConfigs(prev => ({
      ...prev,
      [projectKey]: { ...prev[projectKey], ...update },
    }));
    setHasChanges(true);
  };

  const handleSaveSettings = async () => {
    try {
      await saveFilters.mutateAsync({
        sync_projects: selectedProjects,
        sync_project_config: projectConfigs,
      });
      setHasChanges(false);
      toast.success('Sync settings saved');
    } catch {
      toast.error('Failed to save settings');
    }
  };

  const handleSyncNow = async () => {
    if (selectedProjects.length === 0) {
      toast.error('Select at least one project to sync');
      return;
    }

    const projectList = selectedProjects;
    const initialProgress: SyncProjectProgress[] = projectList.map(key => ({
      key,
      name: availableProjects.find(p => p.key === key)?.name || key,
      status: 'pending',
    }));
    setSyncProgress(initialProgress);
    setSyncOverallPhase('syncing');

    try {
      // Save settings first
      await saveFilters.mutateAsync({
        sync_projects: selectedProjects,
        sync_project_config: projectConfigs,
      });
      setHasChanges(false);

      // Sync projects one-by-one for real progress tracking
      for (let i = 0; i < projectList.length; i++) {
        const pk = projectList[i];
        const startTime = Date.now();

        // Mark current project as syncing
        setSyncProgress(prev => prev.map((p, idx) =>
          idx === i ? { ...p, status: 'syncing', startedAt: startTime } : p
        ));

        try {
          const result = await forceSync.mutateAsync({
            sync_type: 'full',
            projects: [pk],
            project_configs: { [pk]: projectConfigs[pk] },
          });

          // If background processing, poll ph_sync_log for actual result
          if (result?.status === 'processing') {
            let attempts = 0;
            let syncResult: any = null;
            while (attempts < 60) { // poll up to 2 minutes
              await new Promise(r => setTimeout(r, 2000));
              attempts++;
              const { data: logs } = await supabase
                .from('ph_sync_log')
                .select('*')
                .contains('projects_synced', [pk])
                .in('status', ['success', 'warning', 'error'])
                .gte('started_at', new Date(startTime - 5000).toISOString())
                .order('started_at', { ascending: false })
                .limit(1);
              if (logs && logs.length > 0) {
                syncResult = logs[0];
                break;
              }
            }
            setSyncProgress(prev => prev.map((p, idx) =>
              idx === i ? {
                ...p,
                status: syncResult?.status === 'error' ? 'error' : 'done',
                durationMs: syncResult?.duration_ms ?? (Date.now() - startTime),
                issuesFetched: syncResult?.issues_fetched ?? 0,
                errorMessage: syncResult?.error_message || undefined,
              } : p
            ));
          } else {
            setSyncProgress(prev => prev.map((p, idx) =>
              idx === i ? {
                ...p,
                status: 'done',
                durationMs: Date.now() - startTime,
                issuesFetched: result?.issues_fetched ?? result?.summary?.issues_fetched ?? 0,
              } : p
            ));
          }
        } catch (err: any) {
          setSyncProgress(prev => prev.map((p, idx) =>
            idx === i ? {
              ...p,
              status: 'error',
              durationMs: Date.now() - startTime,
              errorMessage: err?.message || 'Failed',
            } : p
          ));
        }
      }

      // Check final state from progress
      setSyncProgress(prev => {
        const hasErrors = prev.some(p => p.status === 'error');
        setSyncOverallPhase(hasErrors ? 'error' : 'done');
        if (!hasErrors) toast.success('Sync completed successfully');
        else toast.error('Some projects failed to sync');
        return prev;
      });
    } catch (err: any) {
      setSyncProgress(prev => prev.map(p => ({
        ...p,
        status: p.status === 'syncing' || p.status === 'pending' ? 'error' : p.status,
      })));
      setSyncOverallPhase('error');
      toast.error(err?.message || 'Sync failed');
    }
  };


  const isLoading = projectsLoading || configLoading;
  const isSyncing = forceSync.isPending || syncOverallPhase === 'syncing';
  const lastSync = syncHealth?.lastSync;

  /** Summary badge for a project config */
  const configSummary = (config: ProjectSyncConfig) => {
    const parts: string[] = [];
    parts.push(config.lookback_months === 0 ? 'Lifetime' : `${config.lookback_months}mo`);
    parts.push(config.status_categories.length === 0 ? 'All categories' : `${config.status_categories.length} cat.`);
    parts.push(config.issue_types.length === 0 ? 'All types' : `${config.issue_types.length} types`);
    parts.push(config.fix_versions.length === 0 ? 'All releases' : `${config.fix_versions.length} rel.`);
    return parts.join(' · ');
  };

  return (
    <div className="wh-card" style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{
          fontFamily: 'var(--wh-fh)', fontSize: 15, fontWeight: 700,
          color: 'var(--wh-tx)', marginBottom: 4,
        }}>
          Sync Configuration
        </h3>
        <p style={{ fontSize: 12, color: 'var(--wh-tx3)', fontFamily: 'var(--wh-fn)', margin: 0 }}>
          Choose projects and configure per-project sync criteria: timeline, status categories, work types, and releases.
        </p>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--wh-tx4)', fontSize: 13 }}>
          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
          Loading configuration...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Project Selection */}
          <div style={{ maxWidth: 480, overflow: 'visible' }}>
            <MultiSelectDropdown
              label="Projects to Sync"
              options={projectOptions}
              selected={selectedProjects}
              onChange={handleProjectChange}
              placeholder="Select projects..."
              emptyMessage="No accessible projects found. Test your connection first."
              accentColor="var(--ds-text-brand, var(--ds-text-brand, #2563EB))"
            />
            <p style={{ fontSize: 11, color: 'var(--wh-tx4)', marginTop: 6, fontFamily: 'var(--wh-fn)' }}>
              {selectedProjects.length === 0
                ? 'No projects selected — select projects to configure sync criteria.'
                : `${selectedProjects.length} of ${availableProjects.length} projects selected. Expand each to configure filters.`}
            </p>
          </div>

          {/* Per-Project Configuration Cards */}
          {selectedProjects.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{
                fontSize: 11, fontWeight: 600, color: 'var(--wh-tx3)', textTransform: 'uppercase' as const,
                letterSpacing: '.4px', fontFamily: 'var(--cp-font-body)', display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <Settings2 size={12} />
                Per-Project Sync Criteria
              </label>

              {selectedProjects.map(pk => {
                const config = projectConfigs[pk] || { lookback_months: 3, status_categories: [], issue_types: [], fix_versions: [] };
                const isExpanded = expandedProject === pk;
                const projectInfo = availableProjects.find(p => p.key === pk);
                const projectVersions = fixVersionsByProject[pk] || [];

                return (
                  <div
                    key={pk}
                    style={{
                      border: '1px solid var(--wh-bdr)',
                      borderRadius: 8,
                      background: isExpanded ? 'var(--wh-sf2)' : 'var(--wh-sf)',
                      overflow: 'visible',
                    }}
                  >
                    {/* Project header row */}
                    <button
                      onClick={() => setExpandedProject(isExpanded ? null : pk)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {isExpanded
                        ? <ChevronDown size={14} style={{ color: 'var(--wh-pri)', flexShrink: 0 }} />
                        : <ChevronRight size={14} style={{ color: 'var(--wh-tx4)', flexShrink: 0 }} />
                      }
                      <span style={{
                        fontFamily: 'var(--wh-mo)', fontSize: 12, fontWeight: 700,
                        color: 'var(--wh-pri)', minWidth: 50,
                      }}>
                        {pk}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--wh-tx3)', flex: 1, fontFamily: 'var(--wh-fn)' }}>
                        {projectInfo?.name || pk}
                      </span>
                      <span style={{
                        fontSize: 10, color: 'var(--wh-tx4)', fontFamily: 'var(--wh-fn)',
                      }}>
                        {configSummary(config)}
                      </span>
                    </button>

                    {/* Expanded config body */}
                    {isExpanded && (
                      <div style={{
                        padding: '0 14px 14px 38px',
                        display: 'flex', flexDirection: 'column', gap: 16,
                      }}>
                        {/* Timeline Lookback */}
                        <div>
                          <label style={{
                            fontSize: 10, fontWeight: 600, color: 'var(--wh-tx3)',
                            textTransform: 'uppercase' as const, letterSpacing: '.4px',
                            fontFamily: 'var(--cp-font-body)', display: 'block', marginBottom: 6,
                          }}>
                            Timeline Lookback
                          </label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {LOOKBACK_OPTIONS.map(opt => {
                              const isActive = config.lookback_months === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  onClick={() => updateProjectConfig(pk, { lookback_months: opt.value })}
                                  style={{
                                    padding: '5px 10px', borderRadius: 6,
                                    border: isActive ? '2px solid var(--wh-pri)' : '1px solid var(--wh-bdr)',
                                    background: isActive ? 'var(--wh-pri-bg)' : 'var(--wh-bg)',
                                    color: isActive ? 'var(--wh-pri)' : 'var(--wh-tx2)',
                                    fontSize: 11, fontWeight: isActive ? 600 : 400,
                                    fontFamily: 'var(--wh-fn)', cursor: 'pointer', transition: 'all .15s',
                                  }}
                                >
                                  <Clock size={10} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 3 }} />
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Status Categories */}
                        <div style={{ overflow: 'visible' }}>
                          <MultiSelectDropdown
                            label={`Status Categories for ${pk}`}
                            options={JIRA_STATUS_CATEGORIES}
                            selected={config.status_categories}
                            onChange={(vals) => updateProjectConfig(pk, { status_categories: vals })}
                            placeholder="All categories (no filter)"
                            emptyMessage="No categories available."
                            accentColor="#7C3AED"
                          />
                          <p style={{ fontSize: 10, color: 'var(--wh-tx4)', marginTop: 4, fontFamily: 'var(--wh-fn)' }}>
                            {config.status_categories.length === 0
                              ? 'No filter — all Jira status categories will be synced.'
                              : `Only issues in ${config.status_categories.join(', ')} category will be synced.`}
                          </p>
                        </div>

                        {/* Issue Types */}
                        <div style={{ overflow: 'visible' }}>
                          <MultiSelectDropdown
                            label={`Work Types for ${pk}`}
                            options={issueTypeOptions}
                            selected={config.issue_types}
                            onChange={(vals) => updateProjectConfig(pk, { issue_types: vals })}
                            placeholder={typesLoading ? 'Loading types...' : 'All types (no filter)'}
                            emptyMessage="No issue types found. Run a sync first."
                            accentColor="#0891B2"
                          />
                          <p style={{ fontSize: 10, color: 'var(--wh-tx4)', marginTop: 4, fontFamily: 'var(--wh-fn)' }}>
                            {config.issue_types.length === 0
                              ? 'No filter — all work types will be synced.'
                              : `Only ${config.issue_types.length} type(s) will be synced for ${pk}.`}
                          </p>
                        </div>

                        {/* Fix Versions / Releases */}
                        <div style={{ overflow: 'visible' }}>
                          <MultiSelectDropdown
                            label={`Releases for ${pk}`}
                            options={projectVersions}
                            selected={config.fix_versions}
                            onChange={(vals) => updateProjectConfig(pk, { fix_versions: vals })}
                            placeholder="All releases (no filter)"
                            emptyMessage={`No versions found for ${pk}. Sync first to discover releases.`}
                            accentColor="#059669"
                          />
                          <p style={{ fontSize: 10, color: 'var(--wh-tx4)', marginTop: 4, fontFamily: 'var(--wh-fn)' }}>
                            {config.fix_versions.length === 0
                              ? 'No filter — all releases will be synced.'
                              : `Only ${config.fix_versions.length} release(s) will be synced for ${pk}.`}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Actions row */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            paddingTop: 12, borderTop: '1px solid var(--wh-bdr)',
          }}>
            <button
              className="wh-btn-primary"
              onClick={handleSyncNow}
              disabled={isSyncing || selectedProjects.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {isSyncing ? (
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Download size={14} />
              )}
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>

            {hasChanges && !isSyncing && (
              <button
                className="wh-btn-secondary"
                onClick={handleSaveSettings}
                disabled={saveFilters.isPending}
              >
                {saveFilters.isPending ? 'Saving...' : 'Save Settings'}
              </button>
            )}

            {selectedProjects.length === 0 && (
              <span style={{ fontSize: 11, color: 'var(--wh-warn)', fontFamily: 'var(--wh-fn)' }}>
                Select at least one project to enable sync
              </span>
            )}
          </div>

          {/* SYNC PROGRESS */}
          {syncProgress.length > 0 && syncOverallPhase !== 'idle' && (
            <SyncProgressPanel projects={syncProgress} phase={syncOverallPhase} />
          )}

          {/* LAST SYNC STATS */}
          {lastSync && syncOverallPhase !== 'syncing' && (
            <SyncStatisticsBoard syncEntry={lastSync} />
          )}
        </div>
      )}
    </div>
  );
}

/* ── Sync Progress Panel ── */
function SyncProgressPanel({
  projects, phase,
}: {
  projects: SyncProjectProgress[];
  phase: 'idle' | 'syncing' | 'done' | 'error';
}) {
  const completedCount = projects.filter(p => p.status === 'done').length;
  const errorCount = projects.filter(p => p.status === 'error').length;
  const totalCount = projects.length;
  const progressPct = totalCount > 0 ? ((completedCount + errorCount) / totalCount) * 100 : 0;
  const currentProject = projects.find(p => p.status === 'syncing');

  return (
    <div style={{
      background: 'var(--wh-bg)', borderRadius: 'var(--wh-rad)',
      border: '1px solid var(--wh-bdr)', padding: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {phase === 'syncing' && <Loader2 size={14} style={{ color: 'var(--wh-pri)', animation: 'spin 1s linear infinite' }} />}
          {phase === 'done' && <CheckCircle2 size={14} style={{ color: 'var(--wh-suc)' }} />}
          {phase === 'error' && <AlertCircle size={14} style={{ color: 'var(--wh-dng)' }} />}
          <span style={{ fontFamily: 'var(--wh-fh)', fontSize: 13, fontWeight: 600, color: 'var(--wh-tx)' }}>
            {phase === 'syncing' && currentProject
              ? `Syncing ${currentProject.name}...`
              : phase === 'done' ? 'Sync complete' : phase === 'error' ? 'Sync completed with errors' : 'Syncing...'}
          </span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--wh-tx3)', fontFamily: 'var(--wh-fn)' }}>
          {completedCount + errorCount} / {totalCount} projects · {Math.round(progressPct)}%
        </span>
      </div>
      {/* Overall progress bar */}
      <div style={{ height: 8, borderRadius: 4, background: 'var(--wh-sf3)', overflow: 'hidden', marginBottom: 14 }}>
        <div style={{
          height: '100%', borderRadius: 4, transition: 'width 0.5s ease',
          width: `${progressPct}%`,
          background: errorCount > 0 && phase !== 'syncing' ? 'var(--wh-dng)' : phase === 'done' ? 'var(--wh-suc)' : 'var(--wh-pri)',
        }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {projects.map(p => (
          <div key={p.key} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 6,
            background: p.status === 'syncing' ? 'var(--wh-pri-bg)' : p.status === 'done' ? 'var(--wh-suc-bg)' : p.status === 'error' ? 'var(--wh-dng-bg)' : 'transparent',
            transition: 'background 0.2s',
          }}>
            <div style={{ width: 16, display: 'flex', justifyContent: 'center' }}>
              {p.status === 'pending' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--wh-tx4)' }} />}
              {p.status === 'syncing' && <Loader2 size={12} style={{ color: 'var(--wh-pri)', animation: 'spin 1s linear infinite' }} />}
              {p.status === 'done' && <CheckCircle2 size={12} style={{ color: 'var(--wh-suc)' }} />}
              {p.status === 'error' && <AlertCircle size={12} style={{ color: 'var(--wh-dng)' }} />}
            </div>
            <span style={{
              fontFamily: 'var(--wh-mo)', fontSize: 11, fontWeight: 700,
              color: p.status === 'syncing' ? 'var(--wh-pri)' : p.status === 'done' ? 'var(--wh-suc)' : p.status === 'error' ? 'var(--wh-dng)' : 'var(--wh-tx3)',
              minWidth: 50,
            }}>
              {p.key}
            </span>
            <span style={{ fontSize: 11, color: 'var(--wh-tx3)', fontFamily: 'var(--wh-fn)', flex: 1 }}>
              {p.name !== p.key ? p.name : ''}
            </span>
            <div style={{ flex: 1, maxWidth: 120, height: 4, borderRadius: 4, background: 'var(--wh-sf3)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 4, transition: 'width 0.4s ease',
                width: p.status === 'done' || p.status === 'error' ? '100%' : p.status === 'syncing' ? '50%' : '0%',
                background: p.status === 'done' ? 'var(--wh-suc)' : p.status === 'syncing' ? 'var(--wh-pri)' : p.status === 'error' ? 'var(--wh-dng)' : 'var(--wh-tx4)',
              }} />
            </div>
            <span style={{ fontSize: 10, color: 'var(--wh-tx4)', fontFamily: 'var(--wh-mo)', minWidth: 70, textAlign: 'right' as const }}>
              {p.status === 'done' && p.issuesFetched != null ? `${p.issuesFetched} issues` : ''}
              {p.status === 'done' && p.durationMs != null ? ` · ${(p.durationMs / 1000).toFixed(1)}s` : ''}
              {p.status === 'syncing' ? 'syncing...' : ''}
              {p.status === 'error' ? 'failed' : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Sync Statistics Board ── */
function SyncStatisticsBoard({ syncEntry }: { syncEntry: SyncLogEntry }) {
  const formatTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const statusColor = syncEntry.status === 'success' ? 'var(--wh-suc)'
    : syncEntry.status === 'warning' ? 'var(--wh-warn)'
    : syncEntry.status === 'error' ? 'var(--wh-dng)' : 'var(--wh-pri)';

  const statusBackground = syncEntry.status === 'success' ? 'var(--wh-suc-bg)'
    : syncEntry.status === 'warning' ? 'var(--wh-warn-bg)'
    : syncEntry.status === 'error' ? 'var(--wh-dng-bg)' : 'var(--wh-pri-bg)';

  const statusLabel = syncEntry.status === 'success' ? 'Completed'
    : syncEntry.status === 'warning' ? 'Completed with warnings'
    : syncEntry.status === 'error' ? 'Failed' : 'Running';

  const stats = [
    { label: 'Issues Fetched', value: syncEntry.issues_fetched ?? 0 },
    { label: 'Issues Upserted', value: syncEntry.issues_upserted ?? 0 },
    { label: 'Issues Pruned', value: syncEntry.issues_pruned ?? 0 },
    { label: 'Versions Synced', value: syncEntry.versions_fetched ?? 0 },
  ];

  return (
    <div style={{
      background: 'var(--wh-bg)', borderRadius: 'var(--wh-rad)',
      border: '1px solid var(--wh-bdr)', padding: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarChart3 size={14} style={{ color: 'var(--wh-tx3)' }} />
          <span style={{ fontFamily: 'var(--wh-fh)', fontSize: 13, fontWeight: 600, color: 'var(--wh-tx)' }}>
            Last Sync Summary
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 600, color: statusColor,
            background: statusBackground, padding: '2px 8px', borderRadius: 12,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor }} />
            {statusLabel}
          </span>
          <span style={{ fontSize: 10, color: 'var(--wh-tx4)', fontFamily: 'var(--wh-fn)' }}>
            {formatTimeAgo(syncEntry.started_at)}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 12 }}>
        {stats.map(s => (
          <div key={s.label} style={{
            background: 'var(--wh-sf2)', borderRadius: 6, padding: '10px 12px',
            border: '1px solid var(--wh-bdr)', textAlign: 'center' as const,
          }}>
            <div style={{ fontFamily: 'var(--wh-fh)', fontSize: 20, fontWeight: 700, color: 'var(--wh-tx)', marginBottom: 2 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--wh-tx4)', fontFamily: 'var(--wh-fn)', textTransform: 'uppercase' as const, letterSpacing: '.3px' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 11, color: 'var(--wh-tx3)', fontFamily: 'var(--wh-fn)',
        paddingTop: 10, borderTop: '1px solid var(--wh-bdr)',
      }}>
        {syncEntry.duration_ms != null && (
          <span><Clock size={10} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 3 }} />
            Duration: <b style={{ color: 'var(--wh-tx2)' }}>{(syncEntry.duration_ms / 1000).toFixed(1)}s</b></span>
        )}
        {syncEntry.projects_synced && syncEntry.projects_synced.length > 0 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <FolderGit2 size={10} style={{ verticalAlign: '-1px' }} /> Projects:
            <span style={{ display: 'inline-flex', gap: 3, flexWrap: 'wrap' }}>
              {syncEntry.projects_synced.map(pk => (
                <span key={pk} style={{
                  padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                  background: 'var(--wh-pri-bg)', color: 'var(--wh-pri)', fontFamily: 'var(--wh-mo)',
                }}>{pk}</span>
              ))}
            </span>
          </span>
        )}
      </div>

      {syncEntry.warnings && syncEntry.warnings.length > 0 && (
        <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--wh-warn-bg)', borderRadius: 6, border: '1px solid var(--wh-warn)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--wh-warn)', marginBottom: 4 }}>
            {syncEntry.warnings.length} warning{syncEntry.warnings.length !== 1 ? 's' : ''}
          </div>
          {syncEntry.warnings.slice(0, 3).map((w, i) => (
            <div key={i} style={{ fontSize: 10, color: 'var(--wh-tx2)', lineHeight: 1.4 }}>• {w}</div>
          ))}
        </div>
      )}

      {syncEntry.error_message && (
        <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--wh-dng-bg)', borderRadius: 6, border: '1px solid var(--wh-dng)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--wh-dng)', marginBottom: 2 }}>Error</div>
          <div style={{ fontSize: 10, color: 'var(--wh-tx2)', lineHeight: 1.4 }}>{syncEntry.error_message}</div>
        </div>
      )}
    </div>
  );
}
