import { useState, useEffect, useMemo } from 'react'
import Spinner from '@atlaskit/spinner';
import CheckCircleIcon from '@atlaskit/icon/core/check-circle';
import CrossCircleIcon from '@atlaskit/icon/core/cross-circle';
import WarningIcon from '@atlaskit/icon/core/warning';
import ClockIcon from '@atlaskit/icon/core/clock';
import RefreshIcon from '@atlaskit/icon/core/refresh';
import DeleteIcon from '@atlaskit/icon/core/delete';
import FilterIcon from '@atlaskit/icon/core/filter';
import DownloadIcon from '@atlaskit/icon/core/download';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import { catalystToast } from '@/lib/catalystToast'
import { formatDistanceToNow } from 'date-fns'
import {
  useSyncHealth,
  useSyncLogs,
  useForceSync,
  useSyncConfig,
  useUpdateSyncSchedule,
  useSaveFilterSettings,
  useAvailableIssueTypes,
  useAvailableSprintReleases,
  useAvailableProjects,
  type SyncLogEntry,
} from '../hooks/useSyncEngine'
import { MultiSelectDropdown, type MultiSelectOption } from './MultiSelectDropdown'
import '../../shared/tokens/workhub-tokens.css'

export function SyncLogs() {
  const { data: health, isLoading: healthLoading } = useSyncHealth()
  const { data: logs, isLoading: logsLoading } = useSyncLogs(10)
  const { data: config } = useSyncConfig()
  const forceSync = useForceSync()
  const updateSchedule = useUpdateSyncSchedule()
  const saveFilters = useSaveFilterSettings()
  const { data: availableTypes } = useAvailableIssueTypes()
  const { data: availableVersions } = useAvailableSprintReleases()
  const { data: availableProjects } = useAvailableProjects()

  const [intervalMin, setIntervalMin] = useState<number>(15)
  const [fullSyncTime, setFullSyncTime] = useState<string>('02:00')
  const [lookbackMonths, setLookbackMonths] = useState<number>(6)
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedVersions, setSelectedVersions] = useState<string[]>([])
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [confirmFullSync, setConfirmFullSync] = useState(false)

  useEffect(() => {
    if (config) {
      setIntervalMin(config.sync_interval_minutes || 15)
      const t = config.sync_full_time_utc
      setFullSyncTime(typeof t === 'string' ? t.replace(/"/g, '') : '02:00')
      setLookbackMonths(config.sync_max_months || 6)
      if (Array.isArray(config.sync_issue_types) && config.sync_issue_types.length > 0) {
        setSelectedTypes(config.sync_issue_types)
      }
      if (Array.isArray(config.sync_sprint_releases) && config.sync_sprint_releases.length > 0) {
        setSelectedVersions(config.sync_sprint_releases)
      }
      if (Array.isArray(config.sync_projects) && config.sync_projects.length > 0) {
        setSelectedProjects(config.sync_projects)
      }
    }
  }, [config])

  const isSyncing = forceSync.isPending || logs?.some(l => l.status === 'running')
  const lastError = logs?.find(l => l.status === 'error')
  const syncStatus = isSyncing ? 'syncing' : lastError && logs?.[0]?.status === 'error' ? 'error' : health?.lastSync ? 'healthy' : 'waiting'

  const handleFilteredSync = () => {
    if (!hasFilters) {
      catalystToast.error('Please select at least one project, work item type, or sprint/release filter before syncing.')
      setFiltersOpen(true)
      return
    }
    forceSync.mutate({
      sync_type: 'full',
      lookback_months: lookbackMonths,
      issue_types: selectedTypes,
      sprint_releases: selectedVersions,
      projects: selectedProjects,
    }, {
      onSuccess: () => catalystToast.success('Sync completed successfully'),
      onError: (err) => catalystToast.error(`Sync failed: ${err.message}`),
    })
  }

  const handleFullSync = () => {
    if (!confirmFullSync) {
      setConfirmFullSync(true)
      return
    }
    setConfirmFullSync(false)
    forceSync.mutate({
      sync_type: 'full',
      lookback_months: lookbackMonths,
      issue_types: [],
      sprint_releases: [],
    }, {
      onSuccess: () => catalystToast.success('Full sync completed'),
      onError: (err) => catalystToast.error(`Sync failed: ${err.message}`),
    })
  }

  const handleSaveSchedule = () => {
    updateSchedule.mutate({
      sync_interval_minutes: intervalMin,
      sync_full_time_utc: fullSyncTime,
    }, {
      onSuccess: () => catalystToast.success('Schedule saved'),
      onError: (err) => catalystToast.error(`Failed to save: ${err.message}`),
    })
  }

  const handleSaveFilters = () => {
    saveFilters.mutate({
      sync_projects: selectedProjects,
      sync_issue_types: selectedTypes,
      sync_sprint_releases: selectedVersions,
      sync_lookback_months: lookbackMonths,
    }, {
      onSuccess: () => catalystToast.success('Filter settings saved'),
      onError: (err) => catalystToast.error(`Failed to save filters: ${err.message}`),
    })
  }

  const toggleType = (type: string) => {
    setSelectedTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])
  }

  const toggleVersion = (name: string) => {
    setSelectedVersions(prev => prev.includes(name) ? prev.filter(v => v !== name) : [...prev, name])
  }

  // Build dropdown options
  const typeOptions: MultiSelectOption[] = useMemo(() =>
    (availableTypes || []).map(t => ({ value: t, label: t })),
    [availableTypes]
  )

  const versionOptions: MultiSelectOption[] = useMemo(() =>
    (availableVersions || []).map(v => ({
      value: v.name,
      label: v.name,
      sublabel: v.project_key,
      badge: v.released ? '✓' : undefined,
    })),
    [availableVersions]
  )

  const projectOptions: MultiSelectOption[] = useMemo(() =>
    (availableProjects || []).map(p => ({ value: p.key, label: `${p.key} – ${p.name}` })),
    [availableProjects]
  )

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const formatNumber = (n: number) => n.toLocaleString()

  const hasFilters = selectedTypes.length > 0 || selectedVersions.length > 0 || selectedProjects.length > 0
  const activeFilterCount = selectedTypes.length + selectedVersions.length + selectedProjects.length

  return (
    <div className="wh-module space-y-6">
      {/* Page Header */}
      <div>
        <h1 style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 'var(--ds-font-size-600)', fontWeight: 700, color: 'var(--fg-1, var(--cp-ink-1, var(--cp-ink-1, var(--ds-text))))' }}>
          Sync & Logs
        </h1>
        <p style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', marginTop: '4px' }}>
          Monitor synchronization status and manage sync schedules
        </p>
      </div>

      {/* Health Strip */}
      <div className="grid grid-cols-5 gap-3">
        <HealthBox label="SYNC STATUS" value={syncStatus === 'healthy' ? '● Healthy' : syncStatus === 'syncing' ? '● Syncing' : syncStatus === 'error' ? '● Error' : '● Waiting'} valueColor={syncStatus === 'healthy' ? 'var(--ds-background-success-bold)' : syncStatus === 'syncing' ? 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' : syncStatus === 'error' ? 'var(--ds-text-danger)' : 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))'} loading={healthLoading} spinning={syncStatus === 'syncing'} />
        <HealthBox label="LAST SYNC" value={health?.lastSync ? formatDistanceToNow(new Date(health.lastSync.started_at), { addSuffix: true }) : '—'} valueColor="var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))" loading={healthLoading} />
        <HealthBox label="ISSUES CACHED" value={formatNumber(health?.issueCachedCount || 0)} valueColor="var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))" loading={healthLoading} />
        <HealthBox label="VERSIONS CACHED" value={formatNumber(health?.versionCachedCount || 0)} valueColor="var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))" loading={healthLoading} />
        <HealthBox label="PROJECTS" value={String(health?.projectCount || 0)} valueColor="var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))" loading={healthLoading} />
      </div>

      {/* Error Banner */}
      {syncStatus === 'error' && lastError && (
        <div style={{ background: 'var(--ds-background-danger)', border: '1px solid var(--ds-background-danger)', borderRadius: '8px', padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <span style={{ flexShrink: 0, marginTop: 0, display: 'flex', color: 'var(--ds-text-danger)' }}><CrossCircleIcon label="" size="small" /></span>
          <div>
            <div style={{ fontFamily: 'var(--cp-font-heading)', fontWeight: 600, fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-danger)' }}>Sync Failed</div>
            <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, var(--ds-text-subtle))))', marginTop: '4px' }}>{lastError.error_message || 'An unknown error occurred.'}</div>
          </div>
        </div>
      )}

      {/* Sync Filters Card */}
      <div style={{ background: 'var(--bg-1, var(--ds-surface-sunken))', border: '1px solid var(--bd-default, var(--cp-border, var(--cp-bg-sunken, var(--ds-border))))', borderRadius: '8px', overflow: 'visible' }}>
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 20px', background: 'transparent', border: 'none', cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FilterIcon label="" size="small" />
            <span style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 'var(--ds-font-size-300)', fontWeight: 700, color: 'var(--fg-1, var(--cp-ink-1, var(--cp-ink-1, var(--ds-text))))' }}>
              Sync Filters
            </span>
            {hasFilters && (
              <span style={{ fontSize: 'var(--ds-font-size-50)', padding: '0px 8px', borderRadius: '12px', background: 'var(--ds-background-information)', color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', fontWeight: 600, fontFamily: 'var(--cp-font-body)' }}>
                {activeFilterCount} active
              </span>
            )}
          </div>
          {filtersOpen
            ? <span style={{ color: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))', display: 'inline-flex' }}><ChevronDownIcon label="" size="small" /></span>
            : <span style={{ color: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))', display: 'inline-flex' }}><ChevronRightIcon label="" size="small" /></span>
          }
        </button>

        {filtersOpen && (
          <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Date Range */}
            <div>
              <label style={{ display: 'block', fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: '8px', fontFamily: 'var(--cp-font-body)' }}>
                Date Range (Lookback)
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { label: '1 month', value: 1 },
                  { label: '3 months', value: 3 },
                  { label: '6 months', value: 6 },
                  { label: '12 months', value: 12 },
                  { label: '24 months', value: 24 },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setLookbackMonths(opt.value)}
                    style={{
                      padding: '4px 14px', borderRadius: '4px', fontSize: 'var(--ds-font-size-100)', fontWeight: 600,
                      fontFamily: 'var(--cp-font-body)', cursor: 'pointer',
                      border: lookbackMonths === opt.value ? '1px solid var(--ds-link)' : '1px solid var(--bd-default, var(--cp-border, var(--cp-bg-sunken, var(--ds-border))))',
                      background: lookbackMonths === opt.value ? 'var(--ds-background-selected)' : 'var(--ds-surface)',
                      color: lookbackMonths === opt.value ? 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' : 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, var(--ds-text-subtle))))',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Projects (Jira Spaces) */}
            <MultiSelectDropdown
              label="Projects (Jira Spaces)"
              options={projectOptions}
              selected={selectedProjects}
              onChange={setSelectedProjects}
              placeholder="Select projects…"
              emptyMessage="Run a sync first to populate projects"
              accentColor="var(--ds-link)"
            />

            {/* Issue Types */}
            <MultiSelectDropdown
              label="Work Item Types"
              options={typeOptions}
              selected={selectedTypes}
              onChange={setSelectedTypes}
              placeholder="Select work item types…"
              emptyMessage="Run a sync first to populate types"
              accentColor="var(--ds-text-brand, var(--cp-workstream-catalyst-primary))"
            />

            {/* Sprint/Iterations */}
            <MultiSelectDropdown
              label="Sprint/Iteration"
              options={versionOptions}
              selected={selectedVersions}
              onChange={setSelectedVersions}
              placeholder="Select sprint/releases…"
              emptyMessage="Run a sync first to populate versions"
              accentColor="var(--cp-purple-60, var(--ds-background-discovery-bold))"
            />

            {!hasFilters && (typeOptions.length > 0 || projectOptions.length > 0) && (
              <span style={{ fontSize: 'var(--ds-font-size-50)', color: 'var(--ds-text-danger)', fontWeight: 600 }}>⚠ Select at least one project, type, or version to sync</span>
            )}

            {/* Save Filters */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
              <button
                onClick={handleSaveFilters}
                disabled={saveFilters.isPending}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--bd-default, var(--cp-border, var(--cp-bg-sunken, var(--ds-border))))',
                  background: 'var(--bg-app, var(--ds-surface))', color: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, var(--ds-text-subtle))))', fontSize: 'var(--ds-font-size-200)', fontWeight: 600,
                  cursor: saveFilters.isPending ? 'not-allowed' : 'pointer', fontFamily: 'var(--cp-font-body)',
                }}
              >
                <DownloadIcon label="" size="small" />
                {saveFilters.isPending ? 'Saving…' : 'Save Filter Settings'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={handleFilteredSync}
          disabled={isSyncing || !hasFilters}
          title={!hasFilters ? 'Select filters first' : ''}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '8px 16px', borderRadius: '6px', border: 'none',
            background: isSyncing ? 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))' : !hasFilters ? 'var(--ds-text-disabled)' : 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', color: 'var(--ds-surface)',
            fontSize: 'var(--ds-font-size-200)', fontWeight: 600, cursor: isSyncing || !hasFilters ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--cp-font-body)',
          }}
        >
          {isSyncing ? <Spinner size="small" /> : <RefreshIcon label="" size="small" />}
          {isSyncing ? 'Syncing…' : 'Sync with Filters'}
        </button>
        {hasFilters && !isSyncing && (
          <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', fontFamily: 'var(--cp-font-body)' }}>
            {lookbackMonths}mo lookback{selectedProjects.length > 0 ? ` · ${selectedProjects.length} projects` : ''}{selectedTypes.length > 0 ? ` · ${selectedTypes.length} types` : ''}{selectedVersions.length > 0 ? ` · ${selectedVersions.length} versions` : ''}
          </span>
        )}
        {!hasFilters && !isSyncing && (
          <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-danger)', fontFamily: 'var(--cp-font-body)' }}>
            Select work item types or sprint/releases above
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {confirmFullSync ? (
            <>
              <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-danger)', fontWeight: 600 }}>Pull ALL data? This may be slow.</span>
              <button
                onClick={handleFullSync}
                disabled={isSyncing}
                style={{
                  padding: '4px 12px', borderRadius: '6px', border: '1px solid var(--ds-background-danger-bold)',
                  background: 'var(--ds-background-danger)', color: 'var(--ds-text-danger)', fontSize: 'var(--ds-font-size-100)', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'var(--cp-font-body)',
                }}
              >
                Yes, Force Full Sync
              </button>
              <button
                onClick={() => setConfirmFullSync(false)}
                style={{
                  padding: '4px 12px', borderRadius: '6px', border: '1px solid var(--bd-default, var(--cp-border, var(--cp-bg-sunken, var(--ds-border))))',
                  background: 'var(--bg-app, var(--ds-surface))', color: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', fontSize: 'var(--ds-font-size-100)', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'var(--cp-font-body)',
                }}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={handleFullSync}
              disabled={isSyncing}
              style={{
                padding: '4px 12px', borderRadius: '6px', border: '1px solid var(--bd-default, var(--cp-border, var(--cp-bg-sunken, var(--ds-border))))',
                background: 'var(--bg-app, var(--ds-surface))', color: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', fontSize: 'var(--ds-font-size-100)', fontWeight: 600,
                cursor: isSyncing ? 'not-allowed' : 'pointer', fontFamily: 'var(--cp-font-body)',
              }}
            >
              Force Full Sync (All Data)
            </button>
          )}
        </div>
        {syncStatus === 'error' && (
          <button
            onClick={handleFilteredSync}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--ds-background-danger)',
              background: 'var(--ds-background-danger)', color: 'var(--ds-text-danger)',
              fontSize: 'var(--ds-font-size-200)', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--cp-font-body)',
            }}
          >
            <DeleteIcon label="" size="small" />
            Clear Error & Retry
          </button>
        )}
      </div>

      {/* Sync Schedule */}
      <div style={{ background: 'var(--bg-1, var(--ds-surface-sunken))', border: '1px solid var(--bd-default, var(--cp-border, var(--cp-bg-sunken, var(--ds-border))))', borderRadius: '8px', padding: '16px' }}>
        <div style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 'var(--ds-font-size-300)', fontWeight: 700, color: 'var(--fg-1, var(--cp-ink-1, var(--cp-ink-1, var(--ds-text))))', marginBottom: '16px' }}>
          Sync Schedule
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ width: '180px', fontSize: 'var(--ds-font-size-200)', fontWeight: 500, color: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, var(--ds-text-subtle))))', fontFamily: 'var(--cp-font-body)' }}>Incremental sync every:</label>
            <select value={intervalMin} onChange={(e) => setIntervalMin(Number(e.target.value))} style={{ height: '50px', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--bd-default, var(--cp-border, var(--cp-bg-sunken, var(--ds-border))))', fontSize: 'var(--ds-font-size-200)', color: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, var(--ds-text-subtle))))', fontFamily: 'var(--cp-font-body)', background: 'var(--bg-app, var(--ds-surface))' }}>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
            <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))' }}>Fetches recently updated issues</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ width: '180px', fontSize: 'var(--ds-font-size-200)', fontWeight: 500, color: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, var(--ds-text-subtle))))', fontFamily: 'var(--cp-font-body)' }}>Full sync daily at:</label>
            <select value={fullSyncTime} onChange={(e) => setFullSyncTime(e.target.value)} style={{ height: '50px', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--bd-default, var(--cp-border, var(--cp-bg-sunken, var(--ds-border))))', fontSize: 'var(--ds-font-size-200)', color: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, var(--ds-text-subtle))))', fontFamily: 'var(--cp-font-body)', background: 'var(--bg-app, var(--ds-surface))' }}>
              <option value="02:00">02:00 UTC</option>
              <option value="06:00">06:00 UTC</option>
              <option value="12:00">12:00 UTC</option>
            </select>
            <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))' }}>Complete re-sync with pruning</span>
          </div>
          <div style={{ marginTop: '8px' }}>
            <button onClick={handleSaveSchedule} disabled={updateSchedule.isPending} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--bd-default, var(--cp-border, var(--cp-bg-sunken, var(--ds-border))))', background: 'var(--bg-app, var(--ds-surface))', color: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, var(--ds-text-subtle))))', fontSize: 'var(--ds-font-size-200)', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--cp-font-body)' }}>
              {updateSchedule.isPending ? 'Saving…' : 'Save Schedule'}
            </button>
          </div>
        </div>
      </div>

      {/* Sync Log */}
      <div style={{ background: 'var(--bg-app, var(--ds-surface))', border: '1px solid var(--bd-default, var(--cp-border, var(--cp-bg-sunken, var(--ds-border))))', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--bd-default, var(--cp-border, var(--cp-bg-sunken, var(--ds-border))))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 'var(--ds-font-size-300)', fontWeight: 700, color: 'var(--fg-1, var(--cp-ink-1, var(--cp-ink-1, var(--ds-text))))' }}>Sync Log</span>
          <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', background: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', padding: '0px 8px', borderRadius: '4px' }}>Last 10 runs</span>
        </div>
        <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '140px 90px 80px 1fr 100px 70px', padding: '8px 20px', background: 'var(--bg-1, var(--ds-surface-sunken))', borderBottom: '1px solid var(--bd-default, var(--cp-border, var(--cp-bg-sunken, var(--ds-border))))', position: 'sticky', top: 0, zIndex: 1 }}>
            {['TIMESTAMP', 'TYPE', 'STATUS', 'DETAILS', 'PROJECTS', 'DURATION'].map(h => (
              <span key={h} style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 'var(--ds-font-size-50)', fontWeight: 600, color: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))', letterSpacing: '.5px', textTransform: 'uppercase', textAlign: h === 'DURATION' ? 'right' : 'left' }}>{h}</span>
            ))}
          </div>
          {logsLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', display: 'flex', justifyContent: 'center' }}><Spinner size="medium" /></div>
          ) : !logs || logs.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))', fontSize: 'var(--ds-font-size-300)' }}>
              <span style={{ display: 'flex', justifyContent: 'center', marginBottom: 8, color: 'var(--ds-text-disabled)' }}><ClockIcon label="" size="medium" /></span>
              No sync runs yet. Click "Force Sync Now" to run the first sync.
            </div>
          ) : (
            logs.map(log => <LogRow key={log.id} log={log} formatDuration={formatDuration} />)
          )}
        </div>
      </div>
    </div>
  )
}

function HealthBox({ label, value, valueColor, loading, spinning }: { label: string; value: string; valueColor: string; loading?: boolean; spinning?: boolean }) {
  return (
    <div style={{ background: 'var(--bg-1, var(--ds-surface-sunken))', border: '1px solid var(--bd-default, var(--cp-border, var(--cp-bg-sunken, var(--ds-border))))', borderRadius: '6px', padding: '12px', textAlign: 'center' }}>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}><Spinner size="medium" /></div>
      ) : (
        <div style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 'var(--ds-font-size-600)', fontWeight: 700, color: valueColor, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
          {spinning && <Spinner size="small" />}
          {value}
        </div>
      )}
      <div style={{ fontSize: 'var(--ds-font-size-100)', textTransform: 'uppercase', color: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))', letterSpacing: '.3px', marginTop: '4px', fontFamily: 'var(--cp-font-body)', fontWeight: 600 }}>{label}</div>
    </div>
  )
}

function LogRow({ log, formatDuration }: { log: SyncLogEntry; formatDuration: (ms: number) => string }) {
  const statusColors: Record<string, { bg: string; text: string }> = {
    success: { bg: 'var(--ds-background-success)', text: 'var(--ds-background-success-bold)' },
    warning: { bg: 'var(--ds-background-warning)', text: 'var(--ds-text-warning, var(--cp-amber))' },
    error: { bg: 'var(--ds-background-danger)', text: 'var(--ds-text-danger)' },
    running: { bg: 'var(--ds-background-selected)', text: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' },
  }
  const typeColors: Record<string, { bg: string; text: string }> = {
    incremental: { bg: 'var(--ds-background-selected)', text: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' },
    full: { bg: 'var(--ds-background-discovery)', text: 'var(--cp-purple-60, var(--ds-background-discovery-bold))' },
  }
  const sc = statusColors[log.status] || statusColors.running
  const tc = typeColors[log.sync_type] || typeColors.full

  const details = log.status === 'error'
    ? (log.error_message || 'Unknown error')
    : log.status === 'running'
    ? 'Sync in progress…'
    : `${log.issues_fetched} fetched, ${log.issues_upserted} upserted${log.versions_fetched ? `, ${log.versions_fetched} versions` : ''}${log.issues_pruned ? `, ${log.issues_pruned} pruned` : ''}${log.warnings?.length ? ` · ${log.warnings.join(', ')}` : ''}`

  const ts = new Date(log.started_at)
  const timestamp = `${ts.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} ${ts.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`

  const projectChips = log.projects_synced && log.projects_synced.length > 0 ? log.projects_synced : null

  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: '140px 90px 80px 1fr 100px 70px', padding: '8px 20px', borderBottom: '1px solid var(--cp-bg-sunken, var(--cp-bg-sunken, var(--ds-surface-sunken)))', alignItems: 'center', fontSize: 'var(--ds-font-size-200)' }}
      onMouseOver={(e) => (e.currentTarget.style.background = 'var(--bg-1, var(--ds-surface-sunken))')}
      onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))' }}>{timestamp}</span>
      <span><span style={{ fontSize: 'var(--ds-font-size-100)', padding: '0px 8px', borderRadius: '4px', background: tc.bg, color: tc.text, fontWeight: 600, textTransform: 'capitalize', fontFamily: 'var(--cp-font-body)' }}>{log.sync_type}</span></span>
      <span><span style={{ fontSize: 'var(--ds-font-size-50)', padding: '0px 10px', borderRadius: '12px', background: sc.bg, color: sc.text, fontWeight: 600, textTransform: 'capitalize', fontFamily: 'var(--cp-font-body)' }}>{log.status}</span></span>
      <span style={{ color: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, var(--ds-text-subtle))))', fontSize: 'var(--ds-font-size-200)', fontFamily: 'var(--cp-font-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{details}</span>
      <span style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {projectChips ? (
          projectChips.length <= 3 ? (
            projectChips.map(p => (
              <span key={p} style={{ fontSize: 'var(--ds-font-size-100)', padding: '0px 6px', borderRadius: '4px', background: 'var(--ds-background-information)', color: '#0369A1', fontWeight: 600, fontFamily: 'var(--cp-font-body)' }}>{p}</span>
            ))
          ) : (
            <span style={{ fontSize: 'var(--ds-font-size-100)', padding: '0px 6px', borderRadius: '4px', background: 'var(--ds-background-information)', color: '#0369A1', fontWeight: 600, fontFamily: 'var(--cp-font-body)' }}>{projectChips.length} projects</span>
          )
        ) : (
          <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-disabled)' }}>All</span>
        )}
      </span>
      <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))', textAlign: 'right' }}>{log.duration_ms ? formatDuration(log.duration_ms) : '—'}</span>
    </div>
  )
}