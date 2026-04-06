import React, { useState, useEffect } from 'react'
import { useStatusMapping, useUpdateConfig } from '../hooks/useAdminConfig'
import { CATALYST_CATEGORY_COLORS, type CatalystCategory, type ConfigKey } from '../types/admin-config.types'
import { FULL_DEFAULT_MAPPING } from '@/hooks/useStatusMappingLookup'
import toast from 'react-hot-toast'

const CATEGORY_ORDER: CatalystCategory[] = ['To Do', 'In Progress', 'Blocked', 'In Review', 'Done']

export function StatusMapping() {
  const { data: dbMapping, isLoading } = useStatusMapping()
  const updateConfig = useUpdateConfig()
  const [mapping, setMapping] = useState<Record<string, string[]>>(FULL_DEFAULT_MAPPING)
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [newStatus, setNewStatus] = useState('')
  const [dragItem, setDragItem] = useState<{ status: string; fromCategory: string } | null>(null)

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
    setMapping(FULL_DEFAULT_MAPPING)
    toast.success('Reset to defaults — click Save to persist')
  }

  const handleAddStatus = (category: string) => {
    if (!newStatus.trim()) return
    // Check for duplicates across all categories
    const existing = Object.entries(mapping).find(([, statuses]) =>
      statuses.some(s => s.toLowerCase() === newStatus.trim().toLowerCase())
    )
    if (existing) {
      toast.error(`"${newStatus.trim()}" already exists in ${existing[0]}`)
      return
    }
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

  const handleMoveStatus = (status: string, fromCategory: string, toCategory: string) => {
    if (fromCategory === toCategory) return
    setMapping(prev => ({
      ...prev,
      [fromCategory]: (prev[fromCategory] || []).filter(s => s !== status),
      [toCategory]: [...(prev[toCategory] || []), status],
    }))
  }

  if (isLoading) {
    return <div style={{ padding: 40, color: '#64748B', fontFamily: 'Inter, sans-serif' }}>Loading...</div>
  }

  return (
    <div style={{ maxWidth: 900, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700, color: 'var(--fg-1, #0F172A)', margin: 0 }}>
          Status Mapping
        </h1>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
          Map each Jira workflow status to a Catalyst category. Covers Story, Task, Sub-task, Production Incident, and QA Bug workflows.
        </p>
      </div>

      <div style={{
        background: 'var(--bg-app, #fff)', border: '1px solid var(--bd-default, #E2E8F0)', borderRadius: 8,
        padding: 20, boxShadow: '0 1px 2px rgba(0,0,0,.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 600, color: 'var(--fg-1, #0F172A)', margin: 0 }}>
            Category Mapping
          </h2>
          <span style={{
            fontSize: 10, background: '#F1F5F9', color: '#64748B', padding: '2px 8px',
            borderRadius: 4, fontWeight: 500,
          }}>{totalCount} statuses</span>
        </div>

        {CATEGORY_ORDER.map(category => {
          const colors = CATALYST_CATEGORY_COLORS[category]
          const statuses = mapping[category] || []
          return (
            <div
              key={category}
              style={{ marginBottom: 20 }}
              onDragOver={e => { e.preventDefault(); e.currentTarget.style.background = 'rgba(37,99,235,0.03)' }}
              onDragLeave={e => { e.currentTarget.style.background = 'transparent' }}
              onDrop={e => {
                e.currentTarget.style.background = 'transparent'
                if (dragItem) {
                  handleMoveStatus(dragItem.status, dragItem.fromCategory, category)
                  setDragItem(null)
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{
                  padding: '3px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '.3px',
                  background: colors.bg, color: colors.text,
                }}>
                  {category}
                </span>
                <span style={{ fontSize: 10, color: 'var(--fg-3, #94A3B8)' }}>
                  {statuses.length} Jira statuses
                </span>
                <button
                  onClick={() => { setAddingTo(addingTo === category ? null : category); setNewStatus('') }}
                  style={{
                    marginLeft: 'auto', fontSize: 11, color: '#2563EB', background: 'none',
                    border: 'none', cursor: 'pointer', padding: '2px 6px', fontWeight: 500,
                  }}
                >
                  + Add
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {statuses.map(status => (
                  <div
                    key={status}
                    draggable
                    onDragStart={() => setDragItem({ status, fromCategory: category })}
                    onDragEnd={() => setDragItem(null)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '4px 10px', borderRadius: 4,
                      background: 'var(--bg-1, #F8FAFC)', border: '1px solid var(--bd-default, #E2E8F0)',
                      fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
                      color: '#334155', fontWeight: 500, cursor: 'grab',
                    }}
                  >
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: colors.text, flexShrink: 0,
                    }} />
                    {status}
                    <button
                      onClick={() => handleRemoveStatus(category, status)}
                      style={{
                        fontSize: 10, color: 'var(--fg-3, #94A3B8)', background: 'none',
                        border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1,
                        marginLeft: 2,
                      }}
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {addingTo === category && (
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <input
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddStatus(category)}
                    placeholder="Jira status name"
                    autoFocus
                    style={{
                      padding: '5px 10px', border: '1px solid var(--bd-default, #E2E8F0)', borderRadius: 4,
                      fontSize: 12, fontFamily: 'JetBrains Mono, monospace', width: 200,
                    }}
                  />
                  <button onClick={() => handleAddStatus(category)} style={{
                    padding: '5px 12px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                    background: '#2563EB', color: '#fff', border: 'none', cursor: 'pointer',
                  }}>Add</button>
                  <button onClick={() => { setAddingTo(null); setNewStatus('') }} style={{
                    padding: '5px 12px', borderRadius: 4, fontSize: 11,
                    background: 'var(--bg-1, #F8FAFC)', color: '#64748B', border: '1px solid var(--bd-default, #E2E8F0)', cursor: 'pointer',
                  }}>Cancel</button>
                </div>
              )}
            </div>
          )
        })}

        <div style={{ borderTop: '1px solid var(--bd-default, #E2E8F0)', paddingTop: 16, marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
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
            onClick={handleReset}
            style={{
              padding: '8px 20px', borderRadius: 6, fontSize: 12, fontWeight: 500,
              background: 'var(--bg-1, #F8FAFC)', color: '#334155', border: '1px solid var(--bd-default, #E2E8F0)', cursor: 'pointer',
            }}
          >
            Reset to Default
          </button>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--fg-3, #94A3B8)' }}>
            Drag statuses between categories to reassign
          </span>
        </div>
      </div>
    </div>
  )
}

export default StatusMapping
