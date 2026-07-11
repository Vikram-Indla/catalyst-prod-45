import React, { useState, useEffect } from 'react'
import { useWhConfig, useBatchUpdateConfig } from '../hooks/useAdminConfig'
import { useJiraConnection } from '../hooks/useJiraConnection'
import { WORKSTREAM_COLORS, type ConfigKey } from '../types/admin-config.types'
import toast from 'react-hot-toast'

export function DataScope() {
  const { data: config, isLoading: configLoading } = useWhConfig()
  const { data: connection } = useJiraConnection()
  const batchUpdate = useBatchUpdateConfig()

  const [includedProjects, setIncludedProjects] = useState<string[]>([])
  const [lookbackMonths, setLookbackMonths] = useState(1)
  const [maxMonths, setMaxMonths] = useState(6)
  const [staleThreshold, setStaleThreshold] = useState(7)
  const [criticalThreshold, setCriticalThreshold] = useState(30)
  const [flagUnscheduled, setFlagUnscheduled] = useState(true)
  const [flagConflicting, setFlagConflicting] = useState(true)
  const [flagUnmapped, setFlagUnmapped] = useState(true)
  const [flagOrphans, setFlagOrphans] = useState(false)

  useEffect(() => {
    if (config) {
      setIncludedProjects(Array.isArray(config.included_projects) ? config.included_projects : [])
      setLookbackMonths(Number(config.sync_lookback_months) || 1)
      setMaxMonths(Number(config.sync_max_months) || 6)
      setStaleThreshold(Number(config.stale_threshold_days) || 7)
      setCriticalThreshold(Number(config.critical_threshold_days) || 30)
      setFlagUnscheduled(config.flag_unscheduled !== false)
      setFlagConflicting(config.flag_conflicting_dates !== false)
      setFlagUnmapped(config.flag_unmapped_types !== false)
      setFlagOrphans(config.flag_orphans === true)
    }
  }, [config])

  // Get projects from accessible_projects
  const accessibleProjects: Array<{ key: string; name: string }> = (() => {
    if (!connection?.accessible_projects) return []
    const raw = connection.accessible_projects
    const arr = Array.isArray(raw) ? raw : typeof raw === 'string' ? JSON.parse(raw) : []
    return arr.filter((p: any) => p?.key).map((p: any) => ({
      key: String(p.key),
      name: String(p.name || p.key),
    }))
  })()

  const toggleProject = (key: string) => {
    setIncludedProjects(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const handleSaveProjects = async () => {
    try {
      await batchUpdate.mutateAsync([
        { key: 'included_projects' as ConfigKey, value: includedProjects },
      ])
      toast.success('Project scope saved')
    } catch {
      toast.error('Failed to save')
    }
  }

  const handleSaveWindow = async () => {
    try {
      await batchUpdate.mutateAsync([
        { key: 'sync_lookback_months' as ConfigKey, value: lookbackMonths },
        { key: 'sync_max_months' as ConfigKey, value: maxMonths },
      ])
      toast.success('Sync window saved')
    } catch {
      toast.error('Failed to save')
    }
  }

  const handleSaveQuality = async () => {
    try {
      await batchUpdate.mutateAsync([
        { key: 'stale_threshold_days' as ConfigKey, value: staleThreshold },
        { key: 'critical_threshold_days' as ConfigKey, value: criticalThreshold },
        { key: 'flag_unscheduled' as ConfigKey, value: flagUnscheduled },
        { key: 'flag_conflicting_dates' as ConfigKey, value: flagConflicting },
        { key: 'flag_unmapped_types' as ConfigKey, value: flagUnmapped },
        { key: 'flag_orphans' as ConfigKey, value: flagOrphans },
      ])
      toast.success('Quality rules saved')
    } catch {
      toast.error('Failed to save')
    }
  }

  if (configLoading) {
    return <div style={{ padding: 40, color: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', fontFamily: 'var(--cp-font-body)' }}>Loading...</div>
  }

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 38, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
        background: checked ? 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' : 'var(--ds-text-disabled)', position: 'relative', flexShrink: 0,
        transition: 'background .2s',
      }}
    >
      <span style={{
        width: 18, height: 18, borderRadius: '50%', background: 'var(--bg-app)', position: 'absolute',
        top: 2, left: checked ? 18 : 2, transition: 'left .2s',
        boxShadow: '0 1px 3px var(--ds-shadow-raised)',
      }} />
    </button>
  )

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-app)', border: '1px solid var(--bd-default, var(--cp-border, var(--cp-bg-sunken)))', borderRadius: 8,
    padding: 16, marginBottom: 16, boxShadow: '0 1px 2px var(--ds-shadow-raised)',
  }

  const activeCount = includedProjects.length
  const totalCount = accessibleProjects.length

  return (
    <div style={{ maxWidth: 900, fontFamily: 'var(--cp-font-body)' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 'var(--ds-font-size-600)', fontWeight: 700, color: 'var(--fg-1, var(--cp-ink-1, var(--cp-ink-1)))', margin: 0 }}>
          Data Scope
        </h1>
        <p style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', marginTop: 4 }}>
          Select projects to sync and configure time window and data quality rules.
        </p>
      </div>

      {/* Card 1: Included Projects */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <h2 style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: 'var(--fg-1, var(--cp-ink-1, var(--cp-ink-1)))', margin: 0 }}>
            Included Projects
          </h2>
          <span style={{
            fontSize: 'var(--ds-font-size-50)', background: 'var(--ds-background-selected)', color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', padding: '0px 8px',
            borderRadius: 4, fontWeight: 600,
          }}>
            {activeCount} of {totalCount} active
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {accessibleProjects.map(p => {
            const isOn = includedProjects.includes(p.key)
            const color = WORKSTREAM_COLORS[p.key] || 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))'
            return (
              <button
                key={p.key}
                onClick={() => toggleProject(p.key)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '8px 16px', borderRadius: 8, border: '1px solid', cursor: 'pointer',
                  background: isOn ? 'var(--ds-background-selected)' : 'var(--ds-surface)',
                  borderColor: isOn ? 'var(--ds-background-information)' : 'var(--bd-default, var(--cp-border, var(--cp-bg-sunken)))',
                  opacity: isOn ? 1 : 0.5,
                  transition: 'all .15s',
                }}
              >
                <span style={{
                  width: 12, height: 12, borderRadius: '50%', background: color, flexShrink: 0,
                }} />
                <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: isOn ? 'var(--fg-1, var(--cp-ink-1, var(--cp-ink-1)))' : 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))' }}>
                  {p.name}
                </span>
                <span style={{
                  fontFamily: 'var(--cp-font-mono)', fontSize: 'var(--ds-font-size-50)', color: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))',
                }}>
                  {p.key}
                </span>
              </button>
            )
          })}
          {accessibleProjects.length === 0 && (
            <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))' }}>No projects discovered. Test your Jira connection first.</span>
          )}
        </div>

        <button onClick={handleSaveProjects} disabled={batchUpdate.isPending} style={{
          marginTop: 12, padding: '8px 20px', borderRadius: 6, fontSize: 'var(--ds-font-size-200)', fontWeight: 600,
          background: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', color: 'var(--ds-surface)', border: 'none', cursor: 'pointer',
          opacity: batchUpdate.isPending ? 0.6 : 1,
        }}>
          Save Projects
        </button>
      </div>

      {/* Card 2: Sync Window */}
      <div style={cardStyle}>
        <h2 style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: 'var(--fg-1, var(--cp-ink-1, var(--cp-ink-1)))', margin: '0 0 14px' }}>
          Sync Window
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
          <label style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2)))', width: 260 }}>Default lookback period:</label>
          <select value={lookbackMonths} onChange={(e) => setLookbackMonths(Number(e.target.value))}
            style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--bd-default, var(--cp-border, var(--cp-bg-sunken)))', fontSize: 'var(--ds-font-size-200)', width: 150 }}>
            <option value={1}>1 month</option>
            <option value={2}>2 months</option>
            <option value={3}>3 months</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
          <label style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2)))', width: 260 }}>Maximum lookback (hard limit):</label>
          <select value={maxMonths} onChange={(e) => setMaxMonths(Number(e.target.value))}
            style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--bd-default, var(--cp-border, var(--cp-bg-sunken)))', fontSize: 'var(--ds-font-size-200)', width: 150 }}>
            <option value={3}>3 months</option>
            <option value={6}>6 months</option>
          </select>
        </div>

        <div style={{
          background: 'var(--ds-background-selected)', border: '1px solid var(--ds-background-information)', borderRadius: 8,
          padding: '8px 14px', marginBottom: 12, display: 'flex', gap: 8,
        }}>
          <span style={{ fontSize: 'var(--ds-font-size-400)' }}>ℹ️</span>
          <p style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-background-brand-bold-hovered)', margin: 0, lineHeight: 1.5 }}>
            Time-bounded sync: Catalyst only caches recent data from Jira within the configured lookback window. Older issues are not synced.
          </p>
        </div>

        <button onClick={handleSaveWindow} disabled={batchUpdate.isPending} style={{
          padding: '8px 20px', borderRadius: 6, fontSize: 'var(--ds-font-size-200)', fontWeight: 600,
          background: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', color: 'var(--ds-surface)', border: 'none', cursor: 'pointer',
        }}>
          Save Window
        </button>
      </div>

      {/* Card 3: Data Quality Flags */}
      <div style={cardStyle}>
        <h2 style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: 'var(--fg-1, var(--cp-ink-1, var(--cp-ink-1)))', margin: '0 0 14px' }}>
          Data Quality Flags
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
          <label style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2)))', width: 260 }}>Mark items stale after:</label>
          <select value={staleThreshold} onChange={(e) => setStaleThreshold(Number(e.target.value))}
            style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--bd-default, var(--cp-border, var(--cp-bg-sunken)))', fontSize: 'var(--ds-font-size-200)', width: 150 }}>
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
          <label style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2)))', width: 260 }}>Mark items critical after:</label>
          <select value={criticalThreshold} onChange={(e) => setCriticalThreshold(Number(e.target.value))}
            style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--bd-default, var(--cp-border, var(--cp-bg-sunken)))', fontSize: 'var(--ds-font-size-200)', width: 150 }}>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'Flag unscheduled items (no effective due date)', checked: flagUnscheduled, onChange: setFlagUnscheduled },
            { label: 'Flag conflicting dates (child due after parent due)', checked: flagConflicting, onChange: setFlagConflicting },
            { label: 'Flag unmapped types (Jira types not in hierarchy)', checked: flagUnmapped, onChange: setFlagUnmapped },
            { label: 'Flag orphan items (no parent issue)', checked: flagOrphans, onChange: setFlagOrphans },
          ].map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Toggle checked={t.checked} onChange={t.onChange} />
              <span style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2)))' }}>{t.label}</span>
            </div>
          ))}
        </div>

        <button onClick={handleSaveQuality} disabled={batchUpdate.isPending} style={{
          padding: '8px 20px', borderRadius: 6, fontSize: 'var(--ds-font-size-200)', fontWeight: 600,
          background: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', color: 'var(--ds-surface)', border: 'none', cursor: 'pointer',
        }}>
          Save Quality Rules
        </button>
      </div>
    </div>
  )
}

export default DataScope
