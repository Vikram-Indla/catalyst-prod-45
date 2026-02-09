import { useState, useEffect } from 'react'
import { Loader2, CheckCircle2, XCircle, AlertTriangle, Clock, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import {
  useSyncHealth,
  useSyncLogs,
  useForceSync,
  useSyncConfig,
  useUpdateSyncSchedule,
  type SyncLogEntry,
} from '../hooks/useSyncEngine'
import '../../shared/tokens/workhub-tokens.css'

export function SyncLogs() {
  const { data: health, isLoading: healthLoading } = useSyncHealth()
  const { data: logs, isLoading: logsLoading } = useSyncLogs(10)
  const { data: config } = useSyncConfig()
  const forceSync = useForceSync()
  const updateSchedule = useUpdateSyncSchedule()

  const [intervalMin, setIntervalMin] = useState<number>(15)
  const [fullSyncTime, setFullSyncTime] = useState<string>('02:00')

  useEffect(() => {
    if (config) {
      setIntervalMin(config.sync_interval_minutes || 15)
      const t = config.sync_full_time_utc
      setFullSyncTime(typeof t === 'string' ? t.replace(/"/g, '') : '02:00')
    }
  }, [config])

  const isSyncing = forceSync.isPending || logs?.some(l => l.status === 'running')
  const lastError = logs?.find(l => l.status === 'error')
  const syncStatus = isSyncing ? 'syncing' : lastError && logs?.[0]?.status === 'error' ? 'error' : health?.lastSync ? 'healthy' : 'waiting'

  const handleForceSync = () => {
    forceSync.mutate('full', {
      onSuccess: () => toast.success('Sync completed successfully'),
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

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const formatNumber = (n: number) => n.toLocaleString()

  return (
    <div className="wh-module space-y-6">
      {/* Page Header */}
      <div>
        <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>
          Sync & Logs
        </h1>
        <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
          Monitor synchronization status and manage sync schedules
        </p>
      </div>

      {/* Health Strip */}
      <div className="grid grid-cols-5 gap-3">
        <HealthBox
          label="SYNC STATUS"
          value={
            syncStatus === 'healthy' ? '● Healthy' :
            syncStatus === 'syncing' ? '● Syncing' :
            syncStatus === 'error' ? '● Error' : '● Waiting'
          }
          valueColor={
            syncStatus === 'healthy' ? '#10B981' :
            syncStatus === 'syncing' ? '#2563EB' :
            syncStatus === 'error' ? '#EF4444' : '#94A3B8'
          }
          loading={healthLoading}
          spinning={syncStatus === 'syncing'}
        />
        <HealthBox
          label="LAST SYNC"
          value={health?.lastSync ? formatDistanceToNow(new Date(health.lastSync.started_at), { addSuffix: true }) : '—'}
          valueColor="#0F172A"
          loading={healthLoading}
        />
        <HealthBox
          label="ISSUES CACHED"
          value={formatNumber(health?.issueCachedCount || 0)}
          valueColor="#0F172A"
          loading={healthLoading}
        />
        <HealthBox
          label="VERSIONS CACHED"
          value={formatNumber(health?.versionCachedCount || 0)}
          valueColor="#0F172A"
          loading={healthLoading}
        />
        <HealthBox
          label="PROJECTS"
          value={String(health?.projectCount || 0)}
          valueColor="#0F172A"
          loading={healthLoading}
        />
      </div>

      {/* Error Banner */}
      {syncStatus === 'error' && lastError && (
        <div style={{
          background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px',
          padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: '12px',
        }}>
          <XCircle style={{ width: 20, height: 20, color: '#EF4444', flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: '13px', color: '#EF4444' }}>
              Sync Failed
            </div>
            <div style={{ fontSize: '12px', color: '#334155', marginTop: '4px' }}>
              {lastError.error_message || 'An unknown error occurred during synchronization.'}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={handleForceSync}
          disabled={isSyncing}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px', borderRadius: '6px', border: 'none',
            background: isSyncing ? '#94A3B8' : '#2563EB', color: '#fff',
            fontSize: '12px', fontWeight: 600, cursor: isSyncing ? 'not-allowed' : 'pointer',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {isSyncing ? 'Syncing…' : 'Force Sync Now'}
        </button>
        {syncStatus === 'error' && (
          <button
            onClick={handleForceSync}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '6px', border: '1px solid #FCA5A5',
              background: '#FEF2F2', color: '#EF4444',
              fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            <Trash2 size={14} />
            Clear Error & Retry
          </button>
        )}
      </div>

      {/* Sync Schedule */}
      <div style={{
        background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '20px',
      }}>
        <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '16px' }}>
          Sync Schedule
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ width: '180px', fontSize: '12px', fontWeight: 500, color: '#334155', fontFamily: 'Inter, sans-serif' }}>
              Incremental sync every:
            </label>
            <select
              value={intervalMin}
              onChange={(e) => setIntervalMin(Number(e.target.value))}
              style={{
                height: '36px', padding: '0 12px', borderRadius: '6px',
                border: '1px solid #E2E8F0', fontSize: '12px', color: '#334155',
                fontFamily: 'Inter, sans-serif', background: '#fff',
              }}
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
            <span style={{ fontSize: '11px', color: '#94A3B8' }}>Fetches recently updated issues</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ width: '180px', fontSize: '12px', fontWeight: 500, color: '#334155', fontFamily: 'Inter, sans-serif' }}>
              Full sync daily at:
            </label>
            <select
              value={fullSyncTime}
              onChange={(e) => setFullSyncTime(e.target.value)}
              style={{
                height: '36px', padding: '0 12px', borderRadius: '6px',
                border: '1px solid #E2E8F0', fontSize: '12px', color: '#334155',
                fontFamily: 'Inter, sans-serif', background: '#fff',
              }}
            >
              <option value="02:00">02:00 UTC</option>
              <option value="06:00">06:00 UTC</option>
              <option value="12:00">12:00 UTC</option>
            </select>
            <span style={{ fontSize: '11px', color: '#94A3B8' }}>Complete re-sync with pruning</span>
          </div>
          <div style={{ marginTop: '8px' }}>
            <button
              onClick={handleSaveSchedule}
              disabled={updateSchedule.isPending}
              style={{
                padding: '7px 16px', borderRadius: '6px',
                border: '1px solid #E2E8F0', background: '#fff', color: '#334155',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {updateSchedule.isPending ? 'Saving…' : 'Save Schedule'}
            </button>
          </div>
        </div>
      </div>

      {/* Sync Log */}
      <div style={{
        background: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid #E2E8F0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontFamily: 'Sora, sans-serif', fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
            Sync Log
          </span>
          <span style={{
            fontSize: '11px', color: '#64748B', background: '#F1F5F9',
            padding: '2px 8px', borderRadius: '4px',
          }}>
            Last 10 runs
          </span>
        </div>

        <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
          {/* Table Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '140px 90px 80px 1fr 70px',
            padding: '8px 20px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0',
            position: 'sticky', top: 0, zIndex: 1,
          }}>
            {['TIMESTAMP', 'TYPE', 'STATUS', 'DETAILS', 'DURATION'].map(h => (
              <span key={h} style={{
                fontFamily: 'Sora, sans-serif', fontSize: '10px', fontWeight: 600,
                color: '#94A3B8', letterSpacing: '.5px', textTransform: 'uppercase',
                textAlign: h === 'DURATION' ? 'right' : 'left',
              }}>
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          {logsLoading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <Loader2 size={20} className="animate-spin" style={{ color: '#94A3B8', margin: '0 auto' }} />
            </div>
          ) : !logs || logs.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
              <Clock size={24} style={{ margin: '0 auto 8px', color: '#CBD5E1' }} />
              No sync runs yet. Click "Force Sync Now" to run the first sync.
            </div>
          ) : (
            logs.map(log => (
              <LogRow key={log.id} log={log} formatDuration={formatDuration} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function HealthBox({ label, value, valueColor, loading, spinning }: {
  label: string; value: string; valueColor: string; loading?: boolean; spinning?: boolean
}) {
  return (
    <div style={{
      background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px',
      padding: '14px', textAlign: 'center',
    }}>
      {loading ? (
        <Loader2 size={18} className="animate-spin" style={{ color: '#94A3B8', margin: '0 auto 4px' }} />
      ) : (
        <div style={{
          fontFamily: 'Sora, sans-serif', fontSize: '18px', fontWeight: 700,
          color: valueColor, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        }}>
          {spinning && <Loader2 size={14} className="animate-spin" />}
          {value}
        </div>
      )}
      <div style={{
        fontSize: '9px', textTransform: 'uppercase', color: '#94A3B8',
        letterSpacing: '.3px', marginTop: '4px', fontFamily: 'Inter, sans-serif', fontWeight: 600,
      }}>
        {label}
      </div>
    </div>
  )
}

function LogRow({ log, formatDuration }: { log: SyncLogEntry; formatDuration: (ms: number) => string }) {
  const statusColors: Record<string, { bg: string; text: string }> = {
    success: { bg: '#ECFDF5', text: '#10B981' },
    warning: { bg: '#FFFBEB', text: '#F59E0B' },
    error: { bg: '#FEF2F2', text: '#EF4444' },
    running: { bg: '#EFF6FF', text: '#2563EB' },
  }
  const typeColors: Record<string, { bg: string; text: string }> = {
    incremental: { bg: '#EFF6FF', text: '#2563EB' },
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

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '140px 90px 80px 1fr 70px',
      padding: '10px 20px', borderBottom: '1px solid #F1F5F9',
      alignItems: 'center', fontSize: '12px',
    }}
    onMouseOver={(e) => (e.currentTarget.style.background = '#F8FAFC')}
    onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#64748B' }}>
        {timestamp}
      </span>
      <span>
        <span style={{
          fontSize: '9px', padding: '2px 8px', borderRadius: '3px',
          background: tc.bg, color: tc.text, fontWeight: 600, textTransform: 'capitalize',
          fontFamily: 'Inter, sans-serif',
        }}>
          {log.sync_type}
        </span>
      </span>
      <span>
        <span style={{
          fontSize: '10px', padding: '2px 10px', borderRadius: '10px',
          background: sc.bg, color: sc.text, fontWeight: 600, textTransform: 'capitalize',
          fontFamily: 'Inter, sans-serif',
        }}>
          {log.status}
        </span>
      </span>
      <span style={{ color: '#334155', fontSize: '12px', fontFamily: 'Inter, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {details}
      </span>
      <span style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#94A3B8', textAlign: 'right',
      }}>
        {log.duration_ms ? formatDuration(log.duration_ms) : '—'}
      </span>
    </div>
  )
}
