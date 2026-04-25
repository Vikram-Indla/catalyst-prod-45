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
    return <div style={{ padding: 40, color: '#64748B', fontFamily: 'var(--ds-font-family-body)' }}>Loading...</div>
  }

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 38, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
        background: checked ? '#2563EB' : '#CBD5E1', position: 'relative', flexShrink: 0,
        transition: 'background .2s',
      }}
    >
      <span style={{
        width: 18, height: 18, borderRadius: '50%', background: 'var(--bg-app, #fff)', position: 'absolute',
        top: 2, left: checked ? 18 : 2, transition: 'left .2s',
        boxShadow: '0 1px 3px rgba(0,0,0,.2)',
      }} />
    </button>
  )

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-app, #fff)', border: '1px solid var(--bd-default, #E2E8F0)', borderRadius: 8,
    padding: 20, marginBottom: 16, boxShadow: '0 1px 2px rgba(0,0,0,.05)',
  }

  const priorities = [
    { label: '1st Priority: Issue Due Date', desc: 'uses the explicit dueDate field from Jira' },
    { label: '2nd Priority: FixVersion Release Date', desc: 'uses version.releaseDate (earliest if multiple)' },
    { label: '3rd Priority: Parent Inheritance', desc: "walks up the hierarchy to inherit parent's effective due" },
  ]

  return (
    <div style={{ maxWidth: 900, fontFamily: 'var(--ds-font-family-body)' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--ds-font-family-heading)', fontSize: 18, fontWeight: 700, color: 'var(--fg-1, #0F172A)', margin: 0 }}>
          Scheduling Rules
        </h1>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
          Configure how effective due dates are calculated for the hierarchy.
        </p>
      </div>

      {/* Card 1: Date Precedence */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <h2 style={{ fontFamily: 'var(--ds-font-family-heading)', fontSize: 14, fontWeight: 600, color: 'var(--fg-1, #0F172A)', margin: 0 }}>
            Date Precedence
          </h2>
          <span style={{
            fontSize: 9, background: '#ECFDF5', color: '#10B981', padding: '2px 8px',
            borderRadius: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.3px',
          }}>Priority Chain</span>
        </div>

        {priorities.map((p, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
            borderBottom: i < 2 ? '1px solid #F1F5F9' : 'none',
          }}>
            <Toggle checked={priorityToggles[i]} onChange={(v) => {
              const copy = [...priorityToggles]
              copy[i] = v
              setPriorityToggles(copy)
            }} />
            <div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-1, #0F172A)' }}>{p.label}</span>
              <span style={{ fontSize: 12, color: '#64748B' }}> — {p.desc}</span>
            </div>
          </div>
        ))}

        <div style={{
          background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8,
          padding: '10px 14px', marginTop: 14, display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 14 }}>ℹ️</span>
          <p style={{ fontSize: 12, color: '#1D4ED8', margin: 0, lineHeight: 1.5 }}>
            Items that don't match any enabled rule are flagged as <strong>Unscheduled</strong> in dashboards and reports.
          </p>
        </div>
      </div>

      {/* Card 2: Multi-FixVersion Strategy */}
      <div style={cardStyle}>
        <h2 style={{ fontFamily: 'var(--ds-font-family-heading)', fontSize: 14, fontWeight: 600, color: 'var(--fg-1, #0F172A)', margin: '0 0 14px' }}>
          Multi-FixVersion Strategy
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <label style={{ fontSize: 13, color: '#334155', width: 260 }}>
            When an issue has multiple FixVersions, use:
          </label>
          <select
            value={multiVersionStrategy}
            onChange={(e) => setMultiVersionStrategy(e.target.value)}
            style={{
              width: 200, padding: '7px 10px', borderRadius: 6, border: '1px solid var(--bd-default, #E2E8F0)',
              fontSize: 12, color: '#334155', background: 'var(--bg-app, #fff)',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <h2 style={{ fontFamily: 'var(--ds-font-family-heading)', fontSize: 14, fontWeight: 600, color: 'var(--fg-1, #0F172A)', margin: 0 }}>
            Version Name Parser
          </h2>
          <span style={{
            fontSize: 9, background: '#FFFBEB', color: '#F59E0B', padding: '2px 8px',
            borderRadius: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.3px',
          }}>Fallback</span>
        </div>

        <div style={{
          background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 8,
          padding: '12px 14px', marginBottom: 14,
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 14 }}>⚠</span>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#92400E', margin: '0 0 6px' }}>
                Version Name Parsing
              </p>
              <p style={{ fontSize: 11, color: '#92400E', margin: 0, lineHeight: 1.6 }}>
                When a FixVersion has no releaseDate, Catalyst attempts to extract a date from the version name:
              </p>
              <div style={{ marginTop: 8, fontSize: 11, color: '#92400E', lineHeight: 2 }}>
                <code style={{ fontFamily: 'var(--ds-font-family-monospaced)', background: '#F1F5F9', padding: '1px 5px', borderRadius: 2 }}>2026 02</code>
                {' → 2026-02-28  '}
                <code style={{ fontFamily: 'var(--ds-font-family-monospaced)', background: '#F1F5F9', padding: '1px 5px', borderRadius: 2 }}>2026 Q1</code>
                {' → 2026-03-31  '}
                <code style={{ fontFamily: 'var(--ds-font-family-monospaced)', background: '#F1F5F9', padding: '1px 5px', borderRadius: 2 }}>Release 3.0</code>
                {' → '}
                <span style={{ color: '#EF4444', fontWeight: 600 }}>Cannot parse</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <Toggle checked={versionNameParsing} onChange={setVersionNameParsing} />
          <span style={{ fontSize: 13, color: '#334155' }}>
            Enable version name date parsing as fallback when no releaseDate exists
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleSave}
            disabled={batchUpdate.isPending}
            style={{
              padding: '8px 20px', borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: '#2563EB', color: '#fff', border: 'none', cursor: 'pointer',
              opacity: batchUpdate.isPending ? 0.6 : 1,
            }}
          >
            {batchUpdate.isPending ? 'Saving...' : 'Save Rules'}
          </button>
          <button
            onClick={handleReset}
            style={{
              padding: '8px 20px', borderRadius: 6, fontSize: 12, fontWeight: 500,
              background: 'var(--bg-1, #F8FAFC)', color: '#334155', border: '1px solid var(--bd-default, #E2E8F0)', cursor: 'pointer',
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
