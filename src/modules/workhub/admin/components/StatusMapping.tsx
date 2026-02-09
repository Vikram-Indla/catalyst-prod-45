import React, { useState, useEffect } from 'react'
import { useStatusMapping, useUpdateConfig } from '../hooks/useAdminConfig'
import { CATALYST_CATEGORY_COLORS, type CatalystCategory, type ConfigKey } from '../types/admin-config.types'
import toast from 'react-hot-toast'

const CATEGORY_ORDER: CatalystCategory[] = ['To Do', 'In Progress', 'Blocked', 'In Review', 'Done']

const DEFAULT_MAPPING: Record<CatalystCategory, string[]> = {
  'To Do':       ['Open', 'To Do', 'Backlog', 'New'],
  'In Progress': ['In Progress', 'In Development', 'Active'],
  'Blocked':     ['Blocked', 'Impediment'],
  'In Review':   ['In Review', 'Code Review', 'QA'],
  'Done':        ['Done', 'Closed', 'Resolved', 'Complete'],
}

export function StatusMapping() {
  const { data: dbMapping, isLoading } = useStatusMapping()
  const updateConfig = useUpdateConfig()
  const [mapping, setMapping] = useState<Record<string, string[]>>(DEFAULT_MAPPING)
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [newStatus, setNewStatus] = useState('')

  useEffect(() => {
    if (dbMapping && Object.keys(dbMapping).length > 0) {
      setMapping(dbMapping)
    }
  }, [dbMapping])

  const totalCount = Object.values(mapping).reduce((sum, arr) => sum + arr.length, 0)

  const handleSave = async () => {
    try {
      await updateConfig.mutateAsync({ key: 'status_mapping' as ConfigKey, value: mapping })
      toast.success('Status mapping saved')
    } catch {
      toast.error('Failed to save')
    }
  }

  const handleReset = () => {
    setMapping(DEFAULT_MAPPING)
  }

  const handleAddStatus = (category: string) => {
    if (!newStatus.trim()) return
    setMapping(prev => ({
      ...prev,
      [category]: [...(prev[category] || []), newStatus.trim()],
    }))
    setNewStatus('')
    setAddingTo(null)
  }

  const handleRemoveStatus = (category: string, status: string) => {
    setMapping(prev => ({
      ...prev,
      [category]: (prev[category] || []).filter(s => s !== status),
    }))
  }

  if (isLoading) {
    return <div style={{ padding: 40, color: '#64748B', fontFamily: 'Inter, sans-serif' }}>Loading...</div>
  }

  return (
    <div style={{ maxWidth: 900, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>
          Status Mapping
        </h1>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
          Map each Jira workflow status to a Catalyst category for consistent reporting.
        </p>
      </div>

      <div style={{
        background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8,
        padding: 20, boxShadow: '0 1px 2px rgba(0,0,0,.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 600, color: '#0F172A', margin: 0 }}>
            Category Mapping
          </h2>
          <span style={{
            fontSize: 10, background: '#F1F5F9', color: '#64748B', padding: '2px 8px',
            borderRadius: 3, fontWeight: 500,
          }}>{totalCount} statuses</span>
        </div>

        {CATEGORY_ORDER.map(category => {
          const colors = CATALYST_CATEGORY_COLORS[category]
          const statuses = mapping[category] || []
          return (
            <div key={category} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{
                  padding: '3px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '.3px',
                  background: colors.bg, color: colors.text,
                }}>
                  {category}
                </span>
                <span style={{ fontSize: 10, color: '#94A3B8' }}>
                  {statuses.length} Jira statuses
                </span>
              </div>

              {statuses.map(status => (
                <div key={status} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                  borderBottom: '1px solid #F1F5F9',
                }}>
                  <span style={{
                    width: 160, fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
                    color: '#334155', fontWeight: 500,
                  }}>
                    {status}
                  </span>
                  <span style={{ fontSize: 14, color: '#94A3B8' }}>→</span>
                  <span style={{
                    padding: '3px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '.3px',
                    background: colors.bg, color: colors.text,
                  }}>
                    {category}
                  </span>
                  <button
                    onClick={() => handleRemoveStatus(category, status)}
                    style={{
                      marginLeft: 'auto', fontSize: 11, color: '#94A3B8', background: 'none',
                      border: 'none', cursor: 'pointer', padding: '2px 6px',
                    }}
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))}

              {addingTo === category && (
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <input
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddStatus(category)}
                    placeholder="Jira status name"
                    autoFocus
                    style={{
                      padding: '5px 10px', border: '1px solid #E2E8F0', borderRadius: 4,
                      fontSize: 12, fontFamily: 'JetBrains Mono, monospace', width: 180,
                    }}
                  />
                  <button onClick={() => handleAddStatus(category)} style={{
                    padding: '5px 12px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                    background: '#2563EB', color: '#fff', border: 'none', cursor: 'pointer',
                  }}>Add</button>
                  <button onClick={() => { setAddingTo(null); setNewStatus('') }} style={{
                    padding: '5px 12px', borderRadius: 4, fontSize: 11,
                    background: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0', cursor: 'pointer',
                  }}>Cancel</button>
                </div>
              )}
            </div>
          )
        })}

        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button
            onClick={handleSave}
            disabled={updateConfig.isPending}
            style={{
              padding: '8px 20px', borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: '#2563EB', color: '#fff', border: 'none', cursor: 'pointer',
              opacity: updateConfig.isPending ? 0.6 : 1,
            }}
          >
            {updateConfig.isPending ? 'Saving...' : 'Save Mapping'}
          </button>
          <button
            onClick={() => setAddingTo(addingTo ? null : CATEGORY_ORDER[0])}
            style={{
              padding: '8px 20px', borderRadius: 6, fontSize: 12, fontWeight: 500,
              background: '#F8FAFC', color: '#334155', border: '1px solid #E2E8F0', cursor: 'pointer',
            }}
          >
            Add Custom Status
          </button>
          <button
            onClick={handleReset}
            style={{
              padding: '8px 20px', borderRadius: 6, fontSize: 12, fontWeight: 500,
              background: '#F8FAFC', color: '#334155', border: '1px solid #E2E8F0', cursor: 'pointer',
            }}
          >
            Reset to Default
          </button>
        </div>
      </div>
    </div>
  )
}

export default StatusMapping
