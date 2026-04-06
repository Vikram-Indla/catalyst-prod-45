import React, { useState, useEffect, useRef } from 'react'
import { useHierarchyLevels, useBatchUpdateConfig } from '../hooks/useAdminConfig'
import type { HierarchyLevel, ConfigKey } from '../types/admin-config.types'
import toast from 'react-hot-toast'

const DEFAULT_LEVELS: HierarchyLevel[] = [
  { level: 1, name: 'Epic', jiraTypes: ['Epic'] },
  { level: 2, name: 'Story', jiraTypes: ['Story', 'User Story', 'Feature'] },
  { level: 3, name: 'Subtask', jiraTypes: ['Sub-task', 'Technical Task'] },
  { level: 4, name: 'Bug', jiraTypes: ['Bug', 'Defect'] },
  { level: 5, name: 'Incident', jiraTypes: ['Incident'] },
  { level: 6, name: 'Other', jiraTypes: ['Task', 'Spike', 'Research'] },
]

const TYPE_CHIPS: Record<string, string[]> = {
  Epic: ['Epic', 'Initiative', 'Theme'],
  Story: ['Story', 'User Story', 'Feature', 'Requirement'],
  Subtask: ['Sub-task', 'Technical Task'],
  Bug: ['Bug', 'Defect', 'QA Issue'],
  Incident: ['Incident', 'Service Request'],
  Other: ['Task', 'Spike', 'Research', 'Improvement'],
}

export function HierarchyMapping() {
  const { data: dbLevels, isLoading } = useHierarchyLevels()
  const batchUpdate = useBatchUpdateConfig()
  const [levels, setLevels] = useState<HierarchyLevel[]>(DEFAULT_LEVELS)
  const [isDirty, setIsDirty] = useState(false)
  const dragItem = useRef<number | null>(null)
  const dragOver = useRef<number | null>(null)

  useEffect(() => {
    if (dbLevels && dbLevels.length > 0) {
      setLevels(dbLevels)
      setIsDirty(false)
    }
  }, [dbLevels])

  const handleDragStart = (idx: number) => { dragItem.current = idx }
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    dragOver.current = idx
  }
  const handleDrop = () => {
    if (dragItem.current === null || dragOver.current === null) return
    const copy = [...levels]
    const dragged = copy.splice(dragItem.current, 1)[0]
    copy.splice(dragOver.current, 0, dragged)
    const renumbered = copy.map((l, i) => ({ ...l, level: i + 1 }))
    setLevels(renumbered)
    setIsDirty(true)
    dragItem.current = null
    dragOver.current = null
  }

  const toggleChip = (levelName: string, chip: string) => {
    setLevels(prev => prev.map(l => {
      if (l.name !== levelName) return l
      const has = l.jiraTypes.includes(chip)
      return {
        ...l,
        jiraTypes: has ? l.jiraTypes.filter(t => t !== chip) : [...l.jiraTypes, chip],
      }
    }))
    setIsDirty(true)
  }

  const handleSave = async () => {
    try {
      await batchUpdate.mutateAsync([
        { key: 'hierarchy_levels' as ConfigKey, value: levels },
      ])
      setIsDirty(false)
      toast.success('Hierarchy mapping saved')
    } catch {
      toast.error('Failed to save hierarchy')
    }
  }

  const handleReset = () => {
    setLevels(dbLevels && dbLevels.length > 0 ? dbLevels : DEFAULT_LEVELS)
    setIsDirty(false)
  }

  if (isLoading) {
    return <div style={{ padding: 40, color: '#64748B', fontFamily: 'Inter, sans-serif' }}>Loading hierarchy config...</div>
  }

  return (
    <div style={{ maxWidth: 900, fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>
          Hierarchy Mapping
        </h1>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
          Define issue type hierarchy levels and map Jira types to each. Drag rows to reorder priority.
        </p>
      </div>

      {/* Unsaved bar */}
      {isDirty && (
        <div style={{
          background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 6,
          padding: '8px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B', flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#F59E0B' }}>
            Unsaved changes — hierarchy order modified
          </span>
        </div>
      )}

      {/* Card 1: Hierarchy Levels */}
      <div style={{
        background: 'var(--bg-app, #fff)', border: '1px solid var(--bd-default, #E2E8F0)', borderRadius: 8,
        padding: 20, marginBottom: 16, boxShadow: '0 1px 2px rgba(0,0,0,.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 600, color: '#0F172A', margin: 0 }}>
            Hierarchy Levels
          </h2>
          <span style={{
            fontSize: 9, background: 'var(--tint-blue, #EFF6FF)', color: '#2563EB', padding: '2px 8px',
            borderRadius: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.3px',
          }}>Drag to reorder</span>
        </div>

        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {levels.map((l, idx) => (
            <li
              key={l.name}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={handleDrop}
              onDragEnd={() => { dragItem.current = null; dragOver.current = null }}
              style={{
                background: 'var(--bg-app, #fff)', border: '1px solid var(--bd-default, #E2E8F0)', borderRadius: 6,
                padding: '10px 14px', marginBottom: 4, display: 'flex', alignItems: 'center',
                gap: 12, cursor: 'grab', transition: 'box-shadow .15s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.06)')}
              onMouseOut={(e) => (e.currentTarget.style.boxShadow = 'none')}
            >
              <span style={{ color: 'var(--fg-3, #94A3B8)', fontSize: 16, cursor: 'grab', userSelect: 'none' }}>⠿</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', width: 100 }}>
                {l.level}. {l.name}
              </span>
              <span style={{ fontSize: 11, color: '#64748B', flex: 1 }}>
                Mapped: {l.jiraTypes.join(', ') || 'None'}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Card 2: Type Mapping */}
      <div style={{
        background: 'var(--bg-app, #fff)', border: '1px solid var(--bd-default, #E2E8F0)', borderRadius: 8,
        padding: 20, boxShadow: '0 1px 2px rgba(0,0,0,.05)',
      }}>
        <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 600, color: '#0F172A', margin: '0 0 16px' }}>
          Type Mapping
        </h2>

        {levels.map(l => (
          <div key={l.name} style={{ marginBottom: 16 }}>
            <label style={{
              fontFamily: 'Sora, sans-serif', fontSize: 11, textTransform: 'uppercase',
              color: '#64748B', letterSpacing: '.3px', fontWeight: 600, display: 'block', marginBottom: 6,
            }}>
              Level: {l.name}
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {(TYPE_CHIPS[l.name] || []).map(chip => {
                const isOn = l.jiraTypes.includes(chip)
                return (
                  <button
                    key={chip}
                    onClick={() => toggleChip(l.name, chip)}
                    style={{
                      padding: '5px 12px', borderRadius: 6, fontSize: 11, border: '1px solid',
                      cursor: 'pointer', transition: 'all .15s', fontWeight: isOn ? 600 : 400,
                      background: isOn ? 'var(--tint-blue, #EFF6FF)' : '#fff',
                      borderColor: isOn ? '#BFDBFE' : 'var(--bd-default, #E2E8F0)',
                      color: isOn ? '#1D4ED8' : '#334155',
                    }}
                  >
                    {chip}
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button
            onClick={handleSave}
            disabled={batchUpdate.isPending}
            style={{
              padding: '8px 20px', borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: '#2563EB', color: '#fff', border: 'none', cursor: 'pointer',
              opacity: batchUpdate.isPending ? 0.6 : 1,
            }}
          >
            {batchUpdate.isPending ? 'Saving...' : 'Save Mapping'}
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

export default HierarchyMapping
