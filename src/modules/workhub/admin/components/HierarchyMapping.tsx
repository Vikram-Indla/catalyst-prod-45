/**
 * HierarchyMapping — Enterprise hierarchy control panel.
 * Propagates via HierarchyConfigContext → WorkItemTree + DetailPanel.
 */
import React, { useState, useEffect, useRef } from 'react'
import { useHierarchyLevels, useBatchUpdateConfig } from '../hooks/useAdminConfig'
import type { HierarchyLevel, ConfigKey } from '../types/admin-config.types'
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons'
import toast from 'react-hot-toast'
import { DEFAULT_HIERARCHY_LEVELS } from '@/contexts/HierarchyConfigContext'

const ALL_TYPES: string[] = [
  'Business Request', 'Epic', 'Feature', 'Story', 'Task',
  'Sub-task', 'Backend', 'Frontend', 'Integration',
  'QA Bug', 'Defect', 'Change Request', 'Production Incident', 'Business Gap', 'Idea',
]

// ADS-compliant badge colors — no yellow/amber
const BADGE_COLORS = [
  'var(--ds-background-brand-bold, #0052CC)',
  'var(--ds-background-accent-purple-bolder, #5243AA)',
  'var(--ds-background-accent-teal-bolder, #008DA6)',
  'var(--ds-background-accent-green-bolder, #006644)',
  'var(--ds-background-accent-red-bolder, #BF2600)',
  'var(--ds-background-accent-gray-bolder, #626F86)',
]
const badgeColor = (level: number) => BADGE_COLORS[(level - 1) % BADGE_COLORS.length]

const CANONICAL_ORDER = DEFAULT_HIERARCHY_LEVELS.map(l => l.name)
function isCanonicalOrder(levels: HierarchyLevel[]): boolean {
  const names = levels.map(l => l.name).filter(n => CANONICAL_ORDER.includes(n))
  let last = -1
  for (const n of names) {
    const idx = CANONICAL_ORDER.indexOf(n)
    if (idx < last) return false
    last = idx
  }
  return true
}

// ── Expanded config panel ─────────────────────────────────────────────────────
function LevelConfigPanel({
  l, levels, onToggleType, onToggleParent, onToggleChild,
}: {
  l: HierarchyLevel
  levels: HierarchyLevel[]
  onToggleType: (levelNum: number, type: string) => void
  onToggleParent: (childLevelNum: number, parentLevelNum: number) => void
  onToggleChild: (parentLevelNum: number, childLevelNum: number) => void
}) {
  const allMapped = new Set(levels.flatMap(x => x.jiraTypes))
  const addable = ALL_TYPES.filter(t => !allMapped.has(t))
  const takenElsewhere = ALL_TYPES.filter(t => !l.jiraTypes.includes(t) && allMapped.has(t))
  const otherLevels = levels.filter(p => p.level !== l.level)
  const currentParents = l.parentLevels ?? []
  const currentChildren = levels.filter(c => (c.parentLevels ?? []).includes(l.level))
  const potentialChildren = levels.filter(c => c.level !== l.level && !(c.parentLevels ?? []).includes(l.level))

  const sectionLabel: React.CSSProperties = {
    display: 'block', fontSize: 'var(--ds-font-size-100)', fontWeight: 653, letterSpacing: '.4px',
    textTransform: 'uppercase', color: 'var(--ds-text-subtlest, #6B778C)',
    marginBottom: 8,
  }
  const chipBase: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 8px', borderRadius: 4, fontSize: 'var(--ds-font-size-100)', cursor: 'pointer',
    border: '1px solid', transition: 'all .1s', fontFamily: 'inherit',
    background: 'none',
  }

  return (
    <div style={{
      display: 'flex', gap: 0, flexWrap: 'nowrap',
      background: 'var(--ds-surface-sunken, #F7F8F9)',
      borderBottom: '1px solid var(--ds-border, #DFE1E6)',
    }}>

      {/* Column 1: Mapped types */}
      <div style={{ flex: '2 1 260px', padding: '14px 16px 16px 52px', borderRight: '1px solid var(--ds-border, #DFE1E6)' }}>

        <label style={sectionLabel}>Assigned to this level</label>
        {l.jiraTypes.length === 0
          ? <p style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest, #6B778C)', margin: '0 0 12px', fontStyle: 'italic' }}>None — add below</p>
          : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
              {l.jiraTypes.map(type => (
                <button key={type} onClick={() => onToggleType(l.level, type)}
                  title="Remove from this level"
                  style={{ ...chipBase, background: 'var(--ds-background-selected, #DEEBFF)', borderColor: 'var(--ds-border-selected, #0052CC)', color: 'var(--ds-text-selected, #0052CC)', fontWeight: 600 }}>
                  <JiraIssueTypeIcon type={type} size={12} />
                  {type}
                  <span style={{ opacity: 0.6, marginLeft: 2, fontSize: 'var(--ds-font-size-50)' }}>✕</span>
                </button>
              ))}
            </div>
        }

        {addable.length > 0 && <>
          <label style={{ ...sectionLabel, marginTop: 4 }}>Available to add</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {addable.map(type => (
              <button key={type} onClick={() => onToggleType(l.level, type)}
                style={{ ...chipBase, background: 'var(--ds-surface, #FFFFFF)', borderColor: 'var(--ds-border, #DFE1E6)', color: 'var(--ds-text-subtle, #42526E)' }}>
                <JiraIssueTypeIcon type={type} size={12} />
                {type}
                <span style={{ opacity: 0.4, marginLeft: 2, fontSize: 'var(--ds-font-size-50)' }}>+</span>
              </button>
            ))}
          </div>
        </>}

        {takenElsewhere.length > 0 && <>
          <label style={{ ...sectionLabel, marginTop: 12 }}>Mapped elsewhere — click to reassign here</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {takenElsewhere.map(type => {
              const owner = levels.find(x => x.jiraTypes.includes(type))
              return (
                <button key={type} onClick={() => onToggleType(l.level, type)}
                  title={`In "${owner?.name}" — click to move here`}
                  style={{ ...chipBase, background: 'var(--ds-background-neutral-subtle, #F7F8F9)', borderColor: 'var(--ds-border, #DFE1E6)', color: 'var(--ds-text-subtlest, #6B778C)', opacity: 0.7 }}>
                  <JiraIssueTypeIcon type={type} size={12} />
                  {type}
                  <span style={{ fontSize: 'var(--ds-font-size-100)', opacity: 0.6 }}>({owner?.name})</span>
                </button>
              )
            })}
          </div>
        </>}
      </div>

      {/* Column 2: Valid parents */}
      <div style={{ flex: '1 1 156px', padding: '14px 16px 16px' }}>
        <label style={sectionLabel}>Valid parents</label>
        {currentParents.length === 0 &&
          <div style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest, #6B778C)', fontStyle: 'italic', marginBottom: 8 }}>Root level</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {otherLevels.map(p => {
            const on = currentParents.includes(p.level)
            return (
              <label key={p.level} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 'var(--ds-font-size-200)', color: on ? 'var(--ds-text, #172B4D)' : 'var(--ds-text-subtle, #42526E)' }}>
                <input type="checkbox" checked={on} onChange={() => onToggleParent(l.level, p.level)} style={{ cursor: 'pointer', accentColor: 'var(--ds-border-brand, var(--ds-link, #0C66E4))' }} />
                <JiraIssueTypeIcon type={p.jiraTypes[0] ?? p.name} size={12} />
                <span style={{ fontWeight: on ? 600 : 400 }}>{p.level}. {p.name}</span>
              </label>
            )
          })}
        </div>
      </div>

      {/* Column 3: Valid children */}
      <div style={{ flex: '1 1 156px', padding: '14px 16px 16px', borderLeft: '1px solid var(--ds-border, #DFE1E6)' }}>
        <label style={sectionLabel}>Valid children</label>
        {currentChildren.length === 0 && potentialChildren.length === 0 &&
          <div style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest, #6B778C)', fontStyle: 'italic', marginBottom: 8 }}>No child levels</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {currentChildren.map(c => (
            <label key={c.level} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text, #172B4D)' }}>
              <input type="checkbox" checked={true} onChange={() => onToggleChild(l.level, c.level)} style={{ cursor: 'pointer', accentColor: 'var(--ds-border-brand, var(--ds-link, #0C66E4))' }} />
              <JiraIssueTypeIcon type={c.jiraTypes[0] ?? c.name} size={12} />
              <span style={{ fontWeight: 600 }}>{c.level}. {c.name}</span>
            </label>
          ))}
          {potentialChildren.map(c => (
            <label key={c.level} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle, #42526E)' }}>
              <input type="checkbox" checked={false} onChange={() => onToggleChild(l.level, c.level)} style={{ cursor: 'pointer', accentColor: 'var(--ds-border-brand, var(--ds-link, #0C66E4))' }} />
              <JiraIssueTypeIcon type={c.jiraTypes[0] ?? c.name} size={12} />
              <span style={{ fontWeight: 400 }}>{c.level}. {c.name}</span>
            </label>
          ))}
        </div>
      </div>

    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function HierarchyMapping() {
  const { data: dbLevels, isLoading } = useHierarchyLevels()
  const batchUpdate = useBatchUpdateConfig()

  const [levels, setLevels] = useState<HierarchyLevel[]>(DEFAULT_HIERARCHY_LEVELS)
  const [isDirty, setIsDirty] = useState(false)
  const [expandedLevel, setExpandedLevel] = useState<number | null>(null)
  const [addingNew, setAddingNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [renamingLevel, setRenamingLevel] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deletingLevel, setDeletingLevel] = useState<number | null>(null)
  const [reassignTarget, setReassignTarget] = useState<number | null>(null)

  const dragItem = useRef<number | null>(null)
  const dragOver = useRef<number | null>(null)
  const newNameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (dbLevels && dbLevels.length > 0) { setLevels(dbLevels); setIsDirty(false) }
  }, [dbLevels])

  useEffect(() => {
    if (addingNew) setTimeout(() => newNameRef.current?.focus(), 50)
  }, [addingNew])

  const renumber = (ls: HierarchyLevel[]) => ls.map((l, i) => ({ ...l, level: i + 1 }))

  const handleDragStart = (idx: number) => { dragItem.current = idx }
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); dragOver.current = idx }
  const handleDrop = () => {
    if (dragItem.current === null || dragOver.current === null) return
    const copy = [...levels]
    const dragged = copy.splice(dragItem.current, 1)[0]
    copy.splice(dragOver.current, 0, dragged)
    const renumbered = renumber(copy)
    const oldToNew: Record<number, number> = {}
    levels.forEach(l => { const nl = renumbered.find(r => r.name === l.name); if (nl) oldToNew[l.level] = nl.level })
    setLevels(renumbered.map(l => ({ ...l, parentLevels: l.parentLevels?.map(p => oldToNew[p] ?? p) })))
    setIsDirty(true)
    dragItem.current = null; dragOver.current = null
  }

  const handleToggleType = (levelNum: number, type: string) => {
    setLevels(prev => {
      const targetHas = prev.find(l => l.level === levelNum)?.jiraTypes.includes(type) ?? false
      return prev.map(l => {
        if (targetHas) {
          if (l.level !== levelNum) return l
          return { ...l, jiraTypes: l.jiraTypes.filter(t => t !== type) }
        } else {
          if (l.level === levelNum) return { ...l, jiraTypes: [...l.jiraTypes, type] }
          return { ...l, jiraTypes: l.jiraTypes.filter(t => t !== type) }
        }
      })
    })
    setIsDirty(true)
  }

  const handleToggleParent = (childLevelNum: number, parentLevelNum: number) => {
    setLevels(prev => prev.map(l => {
      if (l.level !== childLevelNum) return l
      const cur = l.parentLevels ?? []
      return { ...l, parentLevels: cur.includes(parentLevelNum) ? cur.filter(p => p !== parentLevelNum) : [...cur, parentLevelNum] }
    }))
    setIsDirty(true)
  }

  const handleToggleChild = (parentLevelNum: number, childLevelNum: number) => {
    setLevels(prev => prev.map(l => {
      if (l.level !== childLevelNum) return l
      const cur = l.parentLevels ?? []
      return { ...l, parentLevels: cur.includes(parentLevelNum) ? cur.filter(p => p !== parentLevelNum) : [...cur, parentLevelNum] }
    }))
    setIsDirty(true)
  }

  const commitAdd = () => {
    const name = newName.trim()
    if (!name) { setAddingNew(false); return }
    const next = levels.length + 1
    setLevels(prev => [...prev, { level: next, name, jiraTypes: [], parentLevels: next > 1 ? [next - 1] : [] }])
    setIsDirty(true); setAddingNew(false); setNewName(''); setExpandedLevel(next)
  }

  const commitRename = (levelNum: number) => {
    const name = renameValue.trim()
    if (!name) { setRenamingLevel(null); return }
    setLevels(prev => prev.map(l => l.level === levelNum ? { ...l, name } : l))
    setIsDirty(true); setRenamingLevel(null)
  }

  const confirmDelete = (levelNum: number) => {
    const target = levels.find(l => l.level === levelNum)
    if ((target?.jiraTypes.length ?? 0) > 0) { setDeletingLevel(levelNum) } else { doDelete(levelNum, null) }
  }

  const doDelete = (levelNum: number, reassign: number | null) => {
    setLevels(prev => {
      const deletedTypes = prev.find(l => l.level === levelNum)?.jiraTypes ?? []
      let updated = prev.filter(l => l.level !== levelNum)
        .map(l => ({ ...l, parentLevels: l.parentLevels?.filter(p => p !== levelNum) }))
      if (reassign !== null)
        updated = updated.map(l => l.level === reassign ? { ...l, jiraTypes: [...new Set([...l.jiraTypes, ...deletedTypes])] } : l)
      return renumber(updated)
    })
    setIsDirty(true); setDeletingLevel(null); setReassignTarget(null)
  }

  const handleSave = async () => {
    try {
      await batchUpdate.mutateAsync([{ key: 'hierarchy_levels' as ConfigKey, value: levels }])
      setIsDirty(false)
      toast.success('Hierarchy saved — propagated across Catalyst')
    } catch { toast.error('Failed to save hierarchy') }
  }

  const handleReset = () => {
    setLevels(dbLevels && dbLevels.length > 0 ? dbLevels : DEFAULT_HIERARCHY_LEVELS)
    setIsDirty(false)
  }

  const broken = !isCanonicalOrder(levels)
  const allMappedTypes = new Set(levels.flatMap(l => l.jiraTypes))
  const unmappedCount = ALL_TYPES.filter(t => !allMappedTypes.has(t)).length

  if (isLoading) return (
    <div style={{ padding: 40, color: 'var(--ds-text-subtlest, #6B778C)', fontFamily: 'var(--ds-font-family-body, inherit)' }}>
      Loading hierarchy config…
    </div>
  )

  return (
    <div style={{ fontFamily: 'var(--ds-font-family-body, inherit)' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 'var(--ds-font-size-800)', fontWeight: 653, color: 'var(--ds-text, #172B4D)', margin: 0, lineHeight: '28px' }}>
          Hierarchy mapping
        </h1>
        <p style={{ fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text-subtle, #42526E)', margin: '4px 0 0' }}>
          Define work item hierarchy. Changes propagate to Work Item Tree, Detail Panel, and parent/child rules.
        </p>
      </div>

      {/* Propagation badges */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {['Work Item Tree', 'Detail Panel', 'Parent/child rules', 'Jira sync'].map(name => (
          <span key={name} style={{
            fontSize: 'var(--ds-font-size-100)', padding: '3px 8px', borderRadius: 4, fontWeight: 600,
            background: 'var(--ds-background-information, #DEEBFF)',
            color: 'var(--ds-text-information, #0747A6)',
            border: '1px solid var(--ds-border-information, #B3D4FF)',
          }}>↗ {name}</span>
        ))}
      </div>

      {/* Unsaved banner */}
      {isDirty && (
        <div style={{
          background: 'var(--ds-background-information, #DEEBFF)',
          border: '1px solid var(--ds-border-information, #B3D4FF)',
          borderRadius: 6, padding: '8px 14px', marginBottom: 12,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ds-icon-information, #0052CC)', flexShrink: 0 }} />
          <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-information, #0747A6)' }}>Unsaved changes</span>
        </div>
      )}

      {/* Broken hierarchy warning */}
      {broken && (
        <div style={{
          background: 'var(--ds-background-warning, #FFF7D6)',
          border: '1px solid var(--ds-border-warning, #E2B203)',
          borderRadius: 6, padding: '8px 14px', marginBottom: 12,
          display: 'flex', alignItems: 'flex-start', gap: 8,
        }}>
          <span style={{ fontSize: 'var(--ds-font-size-400)', flexShrink: 0, color: 'var(--ds-text-warning, #7F5F01)' }}>⚠</span>
          <div>
            <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-warning, #7F5F01)', display: 'block' }}>
              Hierarchy deviates from canonical order
            </span>
            <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-warning, #7F5F01)' }}>
              Review parent/child rules before applying.
            </span>
          </div>
        </div>
      )}

      {/* Unmapped types notice */}
      {unmappedCount > 0 && (
        <div style={{
          background: 'var(--ds-background-neutral-subtle, #F7F8F9)',
          border: '1px solid var(--ds-border, #DFE1E6)',
          borderRadius: 6, padding: '8px 14px', marginBottom: 12,
          fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle, #42526E)',
        }}>
          {unmappedCount} type{unmappedCount > 1 ? 's' : ''} not assigned to any level — expand a level to assign them.
        </div>
      )}

      {/* Delete modal */}
      {deletingLevel !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--ds-shadow-raised, rgba(9,30,66,0.54))', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--ds-surface-overlay, #FFFFFF)', border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 8, padding: 24, maxWidth: 400, width: '90%', boxShadow: '0 8px 28px var(--ds-shadow-raised, rgba(9,30,66,0.25))' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 'var(--ds-font-size-500)', fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>
              Delete "{levels.find(l => l.level === deletingLevel)?.name}"?
            </h3>
            <p style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtle, #42526E)', margin: '0 0 16px' }}>
              Mapped types: <strong>{levels.find(l => l.level === deletingLevel)?.jiraTypes.join(', ') || 'none'}</strong>. Reassign or drop them.
            </p>
            <select value={reassignTarget ?? ''} onChange={e => setReassignTarget(e.target.value ? Number(e.target.value) : null)}
              style={{ width: '100%', padding: '6px 8px', borderRadius: 4, marginBottom: 16, border: '1px solid var(--ds-border, #DFE1E6)', fontSize: 'var(--ds-font-size-300)', background: 'var(--ds-surface, #FFFFFF)', color: 'var(--ds-text, #172B4D)' }}>
              <option value="">— Drop types (unassign) —</option>
              {levels.filter(l => l.level !== deletingLevel).map(l => (
                <option key={l.level} value={l.level}>{l.level}. {l.name}</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setDeletingLevel(null); setReassignTarget(null) }}
                style={{ padding: '6px 16px', borderRadius: 4, fontSize: 'var(--ds-font-size-300)', border: '1px solid var(--ds-border, #DFE1E6)', background: 'var(--ds-surface, #FFFFFF)', cursor: 'pointer', color: 'var(--ds-text, #172B4D)' }}>
                Cancel
              </button>
              <button onClick={() => doDelete(deletingLevel, reassignTarget)}
                style={{ padding: '6px 16px', borderRadius: 4, fontSize: 'var(--ds-font-size-300)', border: 'none', background: 'var(--ds-background-danger-bold, #DE350B)', color: 'var(--ds-surface, #FFFFFF)', cursor: 'pointer', fontWeight: 600 }}>
                Delete level
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Levels card */}
      <div style={{ background: 'var(--ds-surface, #FFFFFF)', border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 8, marginBottom: 16, overflow: 'hidden' }}>

        {/* Card header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--ds-border, #DFE1E6)', background: 'var(--ds-surface-sunken, #F7F8F9)' }}>
          <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 653, color: 'var(--ds-text-subtle, #42526E)', letterSpacing: '.3px' }}>
            Hierarchy levels — drag to reorder · click row to configure
          </span>
          <button onClick={() => { setAddingNew(true); setExpandedLevel(null) }}
            style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, padding: '4px 12px', borderRadius: 4, background: 'var(--ds-background-brand-bold, #0052CC)', color: 'var(--ds-surface, #FFFFFF)', border: 'none', cursor: 'pointer' }}>
            + Add level
          </button>
        </div>

        {/* Level rows */}
        {levels.map((l, idx) => {
          const isExpanded = expandedLevel === l.level
          const isRenaming = renamingLevel === l.level
          const primaryType = l.jiraTypes[0]

          return (
            <div key={l.name + l.level}>
              <div
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={handleDrop}
                onDragEnd={() => { dragItem.current = null; dragOver.current = null }}
                onClick={() => !isRenaming && setExpandedLevel(isExpanded ? null : l.level)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 16px', cursor: 'pointer',
                  borderBottom: '1px solid var(--ds-border, #DFE1E6)',
                  background: isExpanded ? 'var(--ds-background-neutral-subtle, #F7F8F9)' : 'var(--ds-surface, #FFFFFF)',
                  transition: 'background .1s', userSelect: 'none',
                }}>
                <span style={{ color: 'var(--ds-icon-subtle, #97A0AF)', fontSize: 'var(--ds-font-size-400)', cursor: 'grab', flexShrink: 0 }}
                  onClick={e => e.stopPropagation()}>⠿</span>

                <span style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: badgeColor(l.level), color: 'var(--ds-surface, #FFFFFF)',
                  fontSize: 'var(--ds-font-size-50)', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>{l.level}</span>

                <span style={{ flexShrink: 0 }}>
                  {primaryType
                    ? <JiraIssueTypeIcon type={primaryType} size={18} />
                    : <span style={{ width: 18, height: 18, borderRadius: 3, background: 'var(--ds-background-neutral, #F1F2F4)', display: 'inline-block' }} />}
                </span>

                {isRenaming
                  ? <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                      onBlur={() => commitRename(l.level)}
                      onClick={e => e.stopPropagation()}
                      onKeyDown={e => { if (e.key === 'Enter') commitRename(l.level); if (e.key === 'Escape') setRenamingLevel(null) }}
                      style={{ flex: 1, fontSize: 'var(--ds-font-size-300)', fontWeight: 600, padding: '2px 6px', borderRadius: 4, border: '1px solid var(--ds-border-focused, #0052CC)', background: 'var(--ds-surface, #FFFFFF)', color: 'var(--ds-text, #172B4D)' }} />
                  : <span style={{ flex: 1, fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>{l.name}</span>
                }

                <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest, #6B778C)', flexShrink: 0 }}>
                  {l.jiraTypes.length > 0 ? l.jiraTypes.join(', ') : <em>no types</em>}
                </span>

                <span style={{ fontSize: 'var(--ds-font-size-50)', color: 'var(--ds-text-subtle, #42526E)', flexShrink: 0, width: 12 }}>
                  {isExpanded ? '▲' : '▼'}
                </span>

                <button onClick={e => { e.stopPropagation(); setRenamingLevel(l.level); setRenameValue(l.name) }}
                  title="Rename"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle, #42526E)', flexShrink: 0 }}>✎</button>

                <button onClick={e => { e.stopPropagation(); confirmDelete(l.level) }}
                  title="Delete level"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-danger, #AE2A19)', flexShrink: 0 }}>✕</button>
              </div>

              {isExpanded && (
                <LevelConfigPanel
                  l={l} levels={levels}
                  onToggleType={handleToggleType}
                  onToggleParent={handleToggleParent}
                  onToggleChild={handleToggleChild}
                />
              )}
            </div>
          )
        })}

        {/* Add new inline */}
        {addingNew && (
          <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--ds-background-neutral-subtle, #F7F8F9)', borderBottom: '1px solid var(--ds-border, #DFE1E6)' }}>
            <span style={{ color: 'var(--ds-icon-subtle, #97A0AF)', fontSize: 'var(--ds-font-size-400)' }}>⠿</span>
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--ds-background-neutral, #F1F2F4)', color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 'var(--ds-font-size-50)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {levels.length + 1}
            </span>
            <input ref={newNameRef} value={newName} onChange={e => setNewName(e.target.value)}
              onBlur={commitAdd}
              onKeyDown={e => { if (e.key === 'Enter') commitAdd(); if (e.key === 'Escape') { setAddingNew(false); setNewName('') } }}
              placeholder="Level name (e.g. Initiative)"
              style={{ flex: 1, fontSize: 'var(--ds-font-size-300)', fontWeight: 600, padding: '4px 8px', borderRadius: 4, border: '1px solid var(--ds-border-focused, #0052CC)', background: 'var(--ds-surface, #FFFFFF)', color: 'var(--ds-text, #172B4D)' }} />
            <button onClick={commitAdd}
              style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, padding: '4px 12px', borderRadius: 4, background: 'var(--ds-background-brand-bold, #0052CC)', color: 'var(--ds-surface, #FFFFFF)', border: 'none', cursor: 'pointer' }}>
              Add
            </button>
            <button onClick={() => { setAddingNew(false); setNewName('') }}
              style={{ fontSize: 'var(--ds-font-size-200)', padding: '4px 8px', borderRadius: 4, border: '1px solid var(--ds-border, #DFE1E6)', background: 'var(--ds-surface, #FFFFFF)', cursor: 'pointer', color: 'var(--ds-text, #172B4D)' }}>✕</button>
          </div>
        )}
      </div>

      {/* Actions + stats */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={handleSave} disabled={batchUpdate.isPending || !isDirty}
          style={{ padding: '8px 20px', borderRadius: 4, fontSize: 'var(--ds-font-size-300)', fontWeight: 600, background: isDirty ? 'var(--ds-background-brand-bold, #0052CC)' : 'var(--ds-background-disabled, #97A0AF)', color: 'var(--ds-surface, #FFFFFF)', border: 'none', cursor: isDirty ? 'pointer' : 'not-allowed', opacity: batchUpdate.isPending ? 0.6 : 1 }}>
          {batchUpdate.isPending ? 'Saving…' : 'Apply & propagate'}
        </button>
        <button onClick={handleReset}
          style={{ padding: '8px 20px', borderRadius: 4, fontSize: 'var(--ds-font-size-300)', fontWeight: 500, background: 'var(--ds-surface, #FFFFFF)', color: 'var(--ds-text-subtle, #42526E)', border: '1px solid var(--ds-border, #DFE1E6)', cursor: 'pointer' }}>
          Reset to default
        </button>
        <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest, #6B778C)', marginLeft: 4 }}>
          {levels.length} levels · {allMappedTypes.size} types mapped · {unmappedCount} unmapped
        </span>
      </div>
    </div>
  )
}

export default HierarchyMapping
