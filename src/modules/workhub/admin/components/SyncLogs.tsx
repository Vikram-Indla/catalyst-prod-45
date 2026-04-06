import { useState, useEffect, useMemo } from 'react'
import { Loader2, CheckCircle2, XCircle, AlertTriangle, Clock, RefreshCw, Trash2, Filter, ChevronDown, ChevronRight, Save } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import {
  useSyncHealth,
  useSyncLogs,
  useForceSync,
  useSyncConfig,
  useUpdateSyncSchedule,
  useSaveFilterSettings,
  useAvailableIssueTypes,
  useAvailableFixVersions,
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
  const { data: availableVersions } = useAvailableFixVersions()
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
      if (Array.isArray(config.sync_fix_versions) && config.sync_fix_versions.length > 0) {
        setSelectedVersions(config.sync_fix_versions)
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
      toast.error('Please select at least one project, work item type, or fix version filter before syncing.')
      setFiltersOpen(true)
      return
    }
    forceSync.mutate({
      sync_type: 'full',
      lookback_months: lookbackMonths,
      issue_types: selectedTypes,
      fix_versions: selectedVersions,
      projects: selectedProjects,
    }, {
      onSuccess: () => toast.success('Sync completed successfully'),
      onError: (err) => toast.error(`Sync failed: ${err.message}`),
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
      fix_versions: [],
    }, {
      onSuccess: () => toast.success('Full sync completed'),
      onError: (err) => toast.error(`Sync failed: ${err.message}`),
    })
  }

  const handleSaveSchedule = () => {
    updateSchedule.mutate({
      sync_interval_minutes: intervalMin,
      sync_full_time_utc: fullSyncTime,
    }, {
      onSuccess: () => toast.success('Schedule saved'),
      onError: (err) => toast.error(`Failed to save: ${err.message}`),
    })
  }

  const handleSaveFilters = () => {
    saveFilters.mutate({
      sync_projects: selectedProjects,
      sync_issue_types: selectedTypes,
      sync_fix_versions: selectedVersions,
      sync_lookback_months: lookbackMonths,
    }, {
      onSuccess: () => toast.success('Filter settings saved'),
      onError: (err) => toast.error(`Failed to save filters: ${err.message}`),
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
        <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: '18px', fontWeight: 700, color: 'var(--fg-1, #0F172A)' }}>
          Sync & Logs
        </h1>
        <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
          Monitor synchronization status and manage sync schedules
        </p>
      </div>

      {/* Health Strip */}
      <div className="grid grid-cols-5 gap-3">
        <HealthBox label="SYNC STATUS" value={syncStatus === 'healthy' ? '● Healthy' : syncStatus === 'syncing' ? '● Syncing' : syncStatus === 'error' ? '● Error' : '● Waiting'} valueColor={syncStatus === 'healthy' ? '#10B981' : syncStatus === 'syncing' ? '#2563EB' : syncStatus === 'error' ? '#EF4444' : 'var(--fg-3, #94A3B8)'} loading={healthLoading} spinning={syncStatus === 'syncing'} />
        <HealthBox label="LAST SYNC" value={health?.lastSync ? formatDistanceToNow(new Date(health.lastSync.started_at), { addSuffix: true }) : '—'} valueColor="#0F172A" loading={healthLoading} />
        <HealthBox label="ISSUES CACHED" value={formatNumber(health?.issueCachedCount || 0)} valueColor="#0F172A" loading={healthLoading} />
        <HealthBox label="VERSIONS CACHED" value={formatNumber(health?.versionCachedCount || 0)} valueColor="#0F172A" loading={healthLoading} />
        <HealthBox label="PROJECTS" value={String(health?.projectCount || 0)} valueColor="#0F172A" loading={healthLoading} />
      </div>

      {/* Error Banner */}
      {syncStatus === 'error' && lastError && (
        <div style={{ background: 'var(--tint-red, #FEF2F2)', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <XCircle style={{ width: 20, height: 20, color: '#EF4444', flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: '13px', color: '#EF4444' }}>Sync Failed</div>
            <div style={{ fontSize: '12px', color: '#334155', marginTop: '4px' }}>{lastError.error_message || 'An unknown error occurred.'}</div>
          </div>
        </div>
      )}

      {/* Sync Filters Card */}
      <div style={{ background: 'var(--bg-1, #F8FAFC)', border: '1px solid var(--bd-default, #E2E8F0)', borderRadius: '8px', overflow: 'visible' }}>
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px', background: 'transparent', border: 'none', cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={14} style={{ color: '#64748B' }} />
            <span style={{ fontFamily: 'Sora, sans-serif', fontSize: '13px', fontWeight: 700, color: 'var(--fg-1, #0F172A)' }}>
              Sync Filters
            </span>
            {hasFilters && (
              <span style={{ fontSize: '10px', padding: '1px 8px', borderRadius: '12px', background: '#DBEAFE', color: '#2563EB', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
                {activeFilterCount} active
              </span>
            )}
          </div>
          {filtersOpen ? <ChevronDown size={14} style={{ color: 'var(--fg-3, #94A3B8)' }} /> : <ChevronRight size={14} style={{ color: 'var(--fg-3, #94A3B8)' }} />}
        </button>

        {filtersOpen && (
          <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Date Range */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: '8px', fontFamily: 'Inter, sans-serif' }}>
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
                      padding: '5px 14px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                      fontFamily: 'Inter, sans-serif', cursor: 'pointer',
                      border: lookbackMonths === opt.value ? '1px solid #2563EB' : '1px solid var(--bd-default, #E2E8F0)',
                      background: lookbackMonths === opt.value ? 'var(--tint-blue, #EFF6FF)' : '#fff',
                      color: lookbackMonths === opt.value ? '#2563EB' : '#334155',
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
              accentColor="#0891B2"
            />

            {/* Issue Types */}
            <MultiSelectDropdown
              label="Work Item Types"
              options={typeOptions}
              selected={selectedTypes}
              onChange={setSelectedTypes}
              placeholder="Select work item types…"
              emptyMessage="Run a sync first to populate types"
              accentColor="#2563EB"
            />

            {/* Fix Versions */}
            <MultiSelectDropdown
              label="Fix Version / Releases"
              options={versionOptions}
              selected={selectedVersions}
              onChange={setSelectedVersions}
              placeholder="Select fix versions…"
              emptyMessage="Run a sync first to populate versions"
              accentColor="#7C3AED"
            />

            {!hasFilters && (typeOptions.length > 0 || projectOptions.length > 0) && (
              <span style={{ fontSize: '10px', color: '#EF4444', fontWeight: 600 }}>⚠ Select at least one project, type, or version to sync</span>
            )}

            {/* Save Filters */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
              <button
                onClick={handleSaveFilters}
                disabled={saveFilters.isPending}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '7px 16px', borderRadius: '6px', border: '1px solid var(--bd-default, #E2E8F0)',
                  background: 'var(--bg-app, #fff)', color: '#334155', fontSize: '12px', fontWeight: 600,
                  cursor: saveFilters.isPending ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif',
                }}
              >
                <Save size={13} />
                {saveFilters.isPending ? 'Saving…' : 'Save Filter Settings'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={handleFilteredSync}
          disabled={isSyncing || !hasFilters}
          title={!hasFilters ? 'Select filters first' : ''}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px', borderRadius: '6px', border: 'none',
            background: isSyncing ? 'var(--fg-3, #94A3B8)' : !hasFilters ? '#CBD5E1' : '#2563EB', color: '#fff',
            fontSize: '12px', fontWeight: 600, cursor: isSyncing || !hasFilters ? 'not-allowed' : 'pointer',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {isSyncing ? 'Syncing…' : 'Sync with Filters'}
        </button>
        {hasFilters && !isSyncing && (
          <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'Inter, sans-serif' }}>
            {lookbackMonths}mo lookback{selectedProjects.length > 0 ? ` · ${selectedProjects.length} projects` : ''}{selectedTypes.length > 0 ? ` · ${selectedTypes.length} types` : ''}{selectedVersions.length > 0 ? ` · ${selectedVersions.length} versions` : ''}
          </span>
        )}
        {!hasFilters && !isSyncing && (
          <span style={{ fontSize: '11px', color: '#EF4444', fontFamily: 'Inter, sans-serif' }}>
            Select work item types or fix versions above
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {confirmFullSync ? (
            <>
              <span style={{ fontSize: '11px', color: '#EF4444', fontWeight: 600 }}>Pull ALL data? This may be slow.</span>
              <button
                onClick={handleFullSync}
                disabled={isSyncing}
                style={{
                  padding: '6px 12px', borderRadius: '6px', border: '1px solid #EF4444',
                  background: 'var(--tint-red, #FEF2F2)', color: '#EF4444', fontSize: '11px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                }}
              >
                Yes, Force Full Sync
              </button>
              <button
                onClick={() => setConfirmFullSync(false)}
                style={{
                  padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--bd-default, #E2E8F0)',
                  background: 'var(--bg-app, #fff)', color: '#64748B', fontSize: '11px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
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
                padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--bd-default, #E2E8F0)',
                background: 'var(--bg-app, #fff)', color: '#64748B', fontSize: '11px', fontWeight: 600,
                cursor: isSyncing ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif',
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
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '6px', border: '1px solid #FCA5A5',
              background: 'var(--tint-red, #FEF2F2)', color: '#EF4444',
              fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}
          >
            <Trash2 size={14} />
            Clear Error & Retry
          </button>
        )}
      </div>

      {/* Sync Schedule */}
      <div style={{ background: 'var(--bg-1, #F8FAFC)', border: '1px solid var(--bd-default, #E2E8F0)', borderRadius: '8px', padding: '20px' }}>
        <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '13px', fontWeight: 700, color: 'var(--fg-1, #0F172A)', marginBottom: '16px' }}>
          Sync Schedule
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ width: '180px', fontSize: '12px', fontWeight: 500, color: '#334155', fontFamily: 'Inter, sans-serif' }}>Incremental sync every:</label>
            <select value={intervalMin} onChange={(e) => setIntervalMin(Number(e.target.value))} style={{ height: '50px', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--bd-default, #E2E8F0)', fontSize: '12px', color: '#334155', fontFamily: 'Inter, sans-serif', background: 'var(--bg-app, #fff)' }}>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
            <span style={{ fontSize: '11px', color: 'var(--fg-3, #94A3B8)' }}>Fetches recently updated issues</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ width: '180px', fontSize: '12px', fontWeight: 500, color: '#334155', fontFamily: 'Inter, sans-serif' }}>Full sync daily at:</label>
            <select value={fullSyncTime} onChange={(e) => setFullSyncTime(e.target.value)} style={{ height: '50px', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--bd-default, #E2E8F0)', fontSize: '12px', color: '#334155', fontFamily: 'Inter, sans-serif', background: 'var(--bg-app, #fff)' }}>
              <option value="02:00">02:00 UTC</option>
              <option value="06:00">06:00 UTC</option>
              <option value="12:00">12:00 UTC</option>
            </select>
            <span style={{ fontSize: '11px', color: 'var(--fg-3, #94A3B8)' }}>Complete re-sync with pruning</span>
          </div>
          <div style={{ marginTop: '8px' }}>
            <button onClick={handleSaveSchedule} disabled={updateSchedule.isPending} style={{ padding: '7px 16px', borderRadius: '6px', border: '1px solid var(--bd-default, #E2E8F0)', background: 'var(--bg-app, #fff)', color: '#334155', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              {updateSchedule.isPending ? 'Saving…' : 'Save Schedule'}
            </button>
          </div>
        </div>
      </div>

      {/* Sync Log */}
      <div style={{ background: 'var(--bg-app, #fff)', border: '1px solid var(--bd-default, #E2E8F0)', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--bd-default, #E2E8F0)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'Sora, sans-serif', fontSize: '13px', fontWeight: 700, color: 'var(--fg-1, #0F172A)' }}>Sync Log</span>
          <span style={{ fontSize: '11px', color: '#64748B', background: '#F1F5F9', padding: '2px 8px', borderRadius: '4px' }}>Last 10 runs</span>
        </div>
        <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '140px 90px 80px 1fr 100px 70px', padding: '8px 20px', background: 'var(--bg-1, #F8FAFC)', borderBottom: '1px solid var(--bd-default, #E2E8F0)', position: 'sticky', top: 0, zIndex: 1 }}>
            {['TIMESTAMP', 'TYPE', 'STATUS', 'DETAILS', 'PROJECTS', 'DURATION'].map(h => (
              <span key={h} style={{ fontFamily: 'Sora, sans-serif', fontSize: '10px', fontWeight: 600, color: 'var(--fg-3, #94A3B8)', letterSpacing: '.5px', textTransform: 'uppercase', textAlign: h === 'DURATION' ? 'right' : 'left' }}>{h}</span>
            ))}
          </div>
          {logsLoading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}><Loader2 size={20} className="animate-spin" style={{ color: 'var(--fg-3, #94A3B8)', margin: '0 auto' }} /></div>
          ) : !logs || logs.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--fg-3, #94A3B8)', fontSize: '13px' }}>
              <Clock size={24} style={{ margin: '0 auto 8px', color: '#CBD5E1' }} />
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
    <div style={{ background: 'var(--bg-1, #F8FAFC)', border: '1px solid var(--bd-default, #E2E8F0)', borderRadius: '6px', padding: '14px', textAlign: 'center' }}>
      {loading ? (
        <Loader2 size={18} className="animate-spin" style={{ color: 'var(--fg-3, #94A3B8)', margin: '0 auto 4px' }} />
      ) : (
        <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '18px', fontWeight: 700, color: valueColor, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          {spinning && <Loader2 size={14} className="animate-spin" />}
          {value}
        </div>
      )}
      <div style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--fg-3, #94A3B8)', letterSpacing: '.3px', marginTop: '4px', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>{label}</div>
    </div>
  )
}

function LogRow({ log, formatDuration }: { log: SyncLogEntry; formatDuration: (ms: number) => string }) {
  const statusColors: Record<string, { bg: string; text: string }> = {
    success: { bg: 'var(--tint-green-soft, #ECFDF5)', text: '#10B981' },
    warning: { bg: '#FFFBEB', text: '#F59E0B' },
    error: { bg: 'var(--tint-red, #FEF2F2)', text: '#EF4444' },
    running: { bg: 'var(--tint-blue, #EFF6FF)', text: '#2563EB' },
  }
  const typeColors: Record<string, { bg: string; text: string }> = {
    incremental: { bg: 'var(--tint-blue, #EFF6FF)', text: '#2563EB' },
    full: { bg: '#F5F3FF', text: '#7C3AED' },
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
      style={{ display: 'grid', gridTemplateColumns: '140px 90px 80px 1fr 100px 70px', padding: '10px 20px', borderBottom: '1px solid #F1F5F9', alignItems: 'center', fontSize: '12px' }}
      onMouseOver={(e) => (e.currentTarget.style.background = 'var(--bg-1, #F8FAFC)')}
      onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#64748B' }}>{timestamp}</span>
      <span><span style={{ fontSize: '9px', padding: '2px 8px', borderRadius: '4px', background: tc.bg, color: tc.text, fontWeight: 600, textTransform: 'capitalize', fontFamily: 'Inter, sans-serif' }}>{log.sync_type}</span></span>
      <span><span style={{ fontSize: '10px', padding: '2px 10px', borderRadius: '12px', background: sc.bg, color: sc.text, fontWeight: 600, textTransform: 'capitalize', fontFamily: 'Inter, sans-serif' }}>{log.status}</span></span>
      <span style={{ color: '#334155', fontSize: '12px', fontFamily: 'Inter, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{details}</span>
      <span style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
        {projectChips ? (
          projectChips.length <= 3 ? (
            projectChips.map(p => (
              <span key={p} style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '4px', background: '#E0F2FE', color: '#0369A1', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>{p}</span>
            ))
          ) : (
            <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '4px', background: '#E0F2FE', color: '#0369A1', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>{projectChips.length} projects</span>
          )
        ) : (
          <span style={{ fontSize: '9px', color: '#CBD5E1' }}>All</span>
        )}
      </span>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'var(--fg-3, #94A3B8)', textAlign: 'right' }}>{log.duration_ms ? formatDuration(log.duration_ms) : '—'}</span>
    </div>
  )
}