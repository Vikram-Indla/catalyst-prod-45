import React, { useState, useEffect } from 'react'
import { useWhConfig, useUpdateConfig, useBatchUpdateConfig } from '../hooks/useAdminConfig'
import type { ConfigKey } from '../types/admin-config.types'
import toast from 'react-hot-toast'

export function SchedulingRules() {
  const { data: config, isLoading } = useWhConfig()
  const updateConfig = useUpdateConfig()
  const batchUpdate = useBatchUpdateConfig()

  const [priorityToggles, setPriorityToggles] = useState([true, true, true])
  const [multiVersionStrategy, setMultiVersionStrategy] = useState('earliest')
  const [versionNameParsing, setVersionNameParsing] = useState(true)

  useEffect(() => {
    if (config) {
      setMultiVersionStrategy(config.multi_version_strategy || 'earliest')
      setVersionNameParsing(config.version_name_parsing !== false)
    }
  }, [config])

  const handleSave = async () => {
    try {
      await batchUpdate.mutateAsync([
        { key: 'multi_version_strategy' as ConfigKey, value: multiVersionStrategy },
        { key: 'version_name_parsing' as ConfigKey, value: versionNameParsing },
      ])
      toast.success('Scheduling rules saved')
    } catch {
      toast.error('Failed to save rules')
    }
  }

  const handleReset = () => {
    setPriorityToggles([true, true, true])
    setMultiVersionStrategy('earliest')
    setVersionNameParsing(true)
  }

  if (isLoading) {
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
        boxShadow: '0 1px 3px var(--ds-shadow-raised, rgba(0,0,0,.2))',
      }} />
    </button>
  )

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-app)', border: '1px solid var(--bd-default, var(--cp-border, var(--cp-bg-sunken)))', borderRadius: 8,
    padding: 16, marginBottom: 16, boxShadow: '0 1px 2px var(--ds-shadow-raised, rgba(0,0,0,.05))',
  }

  const priorities = [
    { label: '1st Priority: Issue Due Date', desc: 'uses the explicit dueDate field from Jira' },
    { label: '2nd Priority: Sprint/Iteration Date', desc: 'uses version.releaseDate (earliest if multiple)' },
    { label: '3rd Priority: Parent Inheritance', desc: "walks up the hierarchy to inherit parent's effective due" },
  ]

  return (
    <div style={{ maxWidth: 900, fontFamily: 'var(--cp-font-body)' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 'var(--ds-font-size-600)', fontWeight: 700, color: 'var(--fg-1, var(--cp-ink-1, var(--cp-ink-1)))', margin: 0 }}>
          Scheduling Rules
        </h1>
        <p style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', marginTop: 4 }}>
          Configure how effective due dates are calculated for the hierarchy.
        </p>
      </div>

      {/* Card 1: Date Precedence */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <h2 style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: 'var(--fg-1, var(--cp-ink-1, var(--cp-ink-1)))', margin: 0 }}>
            Date Precedence
          </h2>
          <span style={{
            fontSize: 'var(--ds-font-size-100)', background: 'var(--ds-background-success)', color: 'var(--ds-background-success-bold)', padding: '0px 8px',
            borderRadius: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.3px',
          }}>Priority Chain</span>
        </div>

        {priorities.map((p, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0',
            borderBottom: i < 2 ? '1px solid var(--cp-bg-sunken, var(--cp-bg-sunken))' : 'none',
          }}>
            <Toggle checked={priorityToggles[i]} onChange={(v) => {
              const copy = [...priorityToggles]
              copy[i] = v
              setPriorityToggles(copy)
            }} />
            <div>
              <span style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: 'var(--fg-1, var(--cp-ink-1, var(--cp-ink-1)))' }}>{p.label}</span>
              <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))' }}> — {p.desc}</span>
            </div>
          </div>
        ))}

        <div style={{
          background: 'var(--ds-background-selected)', border: '1px solid var(--ds-background-information)', borderRadius: 8,
          padding: '8px 14px', marginTop: 12, display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 'var(--ds-font-size-400)' }}>ℹ️</span>
          <p style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-background-brand-bold-hovered)', margin: 0, lineHeight: 1.5 }}>
            Items that don't match any enabled rule are flagged as <strong>Unscheduled</strong> in dashboards and reports.
          </p>
        </div>
      </div>

      {/* Card 2: Multi-SprintRelease Strategy */}
      <div style={cardStyle}>
        <h2 style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: 'var(--fg-1, var(--cp-ink-1, var(--cp-ink-1)))', margin: '0 0 14px' }}>
          Multi-Sprint/Iteration Strategy
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <label style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2)))', width: 260 }}>
            When an issue has multiple Sprint/Iterations, use:
          </label>
          <select
            value={multiVersionStrategy}
            onChange={(e) => setMultiVersionStrategy(e.target.value)}
            style={{
              width: 200, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--bd-default, var(--cp-border, var(--cp-bg-sunken)))',
              fontSize: 'var(--ds-font-size-200)', color: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2)))', background: 'var(--bg-app)',
            }}
          >
            <option value="earliest">Earliest release date</option>
            <option value="latest">Latest release date</option>
            <option value="first_assigned">First assigned</option>
          </select>
        </div>
      </div>

      {/* Card 3: Version Name Parser */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <h2 style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: 'var(--fg-1, var(--cp-ink-1, var(--cp-ink-1)))', margin: 0 }}>
            Version Name Parser
          </h2>
          <span style={{
            fontSize: 'var(--ds-font-size-100)', background: 'var(--ds-background-warning)', color: 'var(--ds-text-warning, var(--cp-amber))', padding: '0px 8px',
            borderRadius: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.3px',
          }}>Fallback</span>
        </div>

        <div style={{
          background: 'var(--ds-background-warning)', border: '1px solid var(--ds-background-warning)', borderRadius: 8,
          padding: '12px 14px', marginBottom: 12,
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 'var(--ds-font-size-400)' }}>⚠</span>
            <div>
              <p style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-warning)', margin: '0 0 6px' }}>
                Version Name Parsing
              </p>
              <p style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-warning)', margin: 0, lineHeight: 1.6 }}>
                When a Sprint/Iteration has no releaseDate, Catalyst attempts to extract a date from the version name:
              </p>
              <div style={{ marginTop: 8, fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-warning)', lineHeight: 2 }}>
                <code style={{ fontFamily: 'var(--cp-font-mono)', background: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', padding: '0px 5px', borderRadius: 2 }}>2026 02</code>
                {' → 2026-02-28  '}
                <code style={{ fontFamily: 'var(--cp-font-mono)', background: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', padding: '0px 5px', borderRadius: 2 }}>2026 Q1</code>
                {' → 2026-03-31  '}
                <code style={{ fontFamily: 'var(--cp-font-mono)', background: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', padding: '0px 5px', borderRadius: 2 }}>Release 3.0</code>
                {' → '}
                <span style={{ color: 'var(--ds-text-danger)', fontWeight: 600 }}>Cannot parse</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Toggle checked={versionNameParsing} onChange={setVersionNameParsing} />
          <span style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2)))' }}>
            Enable version name date parsing as fallback when no releaseDate exists
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleSave}
            disabled={batchUpdate.isPending}
            style={{
              padding: '8px 20px', borderRadius: 6, fontSize: 'var(--ds-font-size-200)', fontWeight: 600,
              background: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', color: 'var(--ds-surface)', border: 'none', cursor: 'pointer',
              opacity: batchUpdate.isPending ? 0.6 : 1,
            }}
          >
            {batchUpdate.isPending ? 'Saving...' : 'Save Rules'}
          </button>
          <button
            onClick={handleReset}
            style={{
              padding: '8px 20px', borderRadius: 6, fontSize: 'var(--ds-font-size-200)', fontWeight: 500,
              background: 'var(--bg-1)', color: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2)))', border: '1px solid var(--bd-default, var(--cp-border, var(--cp-bg-sunken)))', cursor: 'pointer',
            }}
          >
            Reset to Default
          </button>
        </div>
      </div>
    </div>
  )
}

export default SchedulingRules
