import { useState, useEffect } from 'react';
import { Download, Clock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { MultiSelectDropdown, type MultiSelectOption } from './MultiSelectDropdown';
import { useAvailableProjects, useForceSync, useSyncConfig, useSaveFilterSettings } from '../hooks/useSyncEngine';
import toast from 'react-hot-toast';

const LOOKBACK_OPTIONS = [
  { value: 1, label: 'Last 1 month' },
  { value: 2, label: 'Last 2 months' },
  { value: 3, label: 'Last 3 months' },
  { value: 4, label: 'Last 4 months' },
  { value: 5, label: 'Last 5 months' },
  { value: 6, label: 'Last 6 months' },
];

export function SyncConfigPanel() {
  const { data: availableProjects = [], isLoading: projectsLoading } = useAvailableProjects();
  const { data: syncConfig, isLoading: configLoading } = useSyncConfig();
  const forceSync = useForceSync();
  const saveFilters = useSaveFilterSettings();

  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [lookbackMonths, setLookbackMonths] = useState<number>(3);
  const [hasChanges, setHasChanges] = useState(false);

  // Load saved config
  useEffect(() => {
    if (syncConfig) {
      const savedProjects = syncConfig.sync_projects;
      if (Array.isArray(savedProjects) && savedProjects.length > 0) {
        setSelectedProjects(savedProjects);
      }
      const savedLookback = syncConfig.sync_lookback_months;
      if (savedLookback && typeof savedLookback === 'number') {
        setLookbackMonths(savedLookback);
      }
    }
  }, [syncConfig]);

  const projectOptions: MultiSelectOption[] = availableProjects.map(p => ({
    value: p.key,
    label: p.key,
    sublabel: p.name,
  }));

  const handleProjectChange = (newSelected: string[]) => {
    setSelectedProjects(newSelected);
    setHasChanges(true);
  };

  const handleLookbackChange = (months: number) => {
    setLookbackMonths(months);
    setHasChanges(true);
  };

  const handleSaveSettings = async () => {
    try {
      await saveFilters.mutateAsync({
        sync_projects: selectedProjects,
        sync_lookback_months: lookbackMonths,
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

    try {
      // Save settings first, then trigger sync
      await saveFilters.mutateAsync({
        sync_projects: selectedProjects,
        sync_lookback_months: lookbackMonths,
      });
      setHasChanges(false);

      await forceSync.mutateAsync({
        sync_type: 'full',
        lookback_months: lookbackMonths,
        projects: selectedProjects,
      });
      toast.success('Sync started successfully');
    } catch (err: any) {
      toast.error(err?.message || 'Sync failed');
    }
  };

  const isLoading = projectsLoading || configLoading;
  const isSyncing = forceSync.isPending;

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
          Choose which projects and how much history to sync from Jira.
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
              accentColor="#2563EB"
            />
            <p style={{ fontSize: 11, color: 'var(--wh-tx4)', marginTop: 6, fontFamily: 'var(--wh-fn)' }}>
              {selectedProjects.length === 0
                ? 'No projects selected — sync will use all accessible projects.'
                : `${selectedProjects.length} of ${availableProjects.length} projects selected.`}
            </p>
          </div>

          {/* Timeline Lookback */}
          <div style={{ maxWidth: 480 }}>
            <label style={{
              fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' as const,
              letterSpacing: '.4px', fontFamily: 'Inter, sans-serif', display: 'block', marginBottom: 8,
            }}>
              Sync Timeline
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {LOOKBACK_OPTIONS.map(opt => {
                const isActive = lookbackMonths === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleLookbackChange(opt.value)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 6,
                      border: isActive ? '2px solid #2563EB' : '1px solid var(--wh-bdr)',
                      background: isActive ? '#EFF6FF' : 'var(--wh-sf)',
                      color: isActive ? '#2563EB' : 'var(--wh-tx2)',
                      fontSize: 12,
                      fontWeight: isActive ? 600 : 400,
                      fontFamily: 'var(--wh-fn)',
                      cursor: 'pointer',
                      transition: 'all .15s',
                    }}
                  >
                    <Clock size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: 11, color: 'var(--wh-tx4)', marginTop: 6, fontFamily: 'var(--wh-fn)' }}>
              Only issues updated within this window will be fetched from Jira.
            </p>
          </div>

          {/* Actions row */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            paddingTop: 12, borderTop: '1px solid var(--wh-bdr)',
          }}>
            <button
              className="wh-btn-primary"
              onClick={handleSyncNow}
              disabled={isSyncing}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {isSyncing ? (
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Download size={14} />
              )}
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>

            {hasChanges && (
              <button
                className="wh-btn-secondary"
                onClick={handleSaveSettings}
                disabled={saveFilters.isPending}
              >
                {saveFilters.isPending ? 'Saving...' : 'Save Settings'}
              </button>
            )}

            {forceSync.isSuccess && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#10B981' }}>
                <CheckCircle2 size={14} /> Sync initiated
              </span>
            )}
            {forceSync.isError && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--wh-dng)' }}>
                <AlertCircle size={14} /> {forceSync.error?.message || 'Sync failed'}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
