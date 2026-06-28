import React, { useState, useMemo } from 'react'
import {
  useUserMappings, useBatchSaveUserMappings, useAutoMatchUsers,
  useRefreshJiraUsers, useCatalystProfilesWithDept, useCapacityDepartments,
} from '../hooks/useAdminConfig'
import type { CatalystProfileWithDept } from '../hooks/useAdminConfig'
import type { JiraUserMapping } from '../types/admin-config.types'
import toast from 'react-hot-toast'

// ═══ FUZZY NAME MATCHING ═══

function normalizeStr(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function tokenize(name: string): string[] {
  return name.toLowerCase().trim().split(/\s+/).filter(Boolean)
}

function bigramSimilarity(a: string, b: string): number {
  const na = normalizeStr(a)
  const nb = normalizeStr(b)
  if (na === nb) return 1
  if (na.length < 2 || nb.length < 2) return na === nb ? 1 : 0
  const bigramsA = new Set<string>()
  for (let i = 0; i < na.length - 1; i++) bigramsA.add(na.slice(i, i + 2))
  const bigramsB = new Set<string>()
  for (let i = 0; i < nb.length - 1; i++) bigramsB.add(nb.slice(i, i + 2))
  let overlap = 0
  bigramsA.forEach(bg => { if (bigramsB.has(bg)) overlap++ })
  return (2 * overlap) / (bigramsA.size + bigramsB.size)
}

function matchScore(jiraName: string, catalystName: string): number {
  if (normalizeStr(jiraName) === normalizeStr(catalystName)) return 1
  const jTokens = tokenize(jiraName)
  const cTokens = tokenize(catalystName)
  let tokenMatches = 0
  for (const jt of jTokens) {
    for (const ct of cTokens) {
      if (jt === ct) { tokenMatches++; break }
      if (jt.length > 3 && ct.length > 3 && (jt.startsWith(ct.slice(0, 4)) || ct.startsWith(jt.slice(0, 4)))) {
        tokenMatches += 0.7
        break
      }
    }
  }
  const tokenScore = jTokens.length > 0 ? tokenMatches / Math.max(jTokens.length, cTokens.length) : 0
  const bigram = bigramSimilarity(jiraName, catalystName)
  return tokenScore * 0.6 + bigram * 0.4
}

function findBestMatch(
  catalystName: string,
  jiraUsers: JiraUserMapping[],
  threshold = 0.35,
): { jiraUser: JiraUserMapping; score: number } | null {
  let best: { jiraUser: JiraUserMapping; score: number } | null = null
  for (const j of jiraUsers) {
    if (!j.jira_display_name) continue
    const s = matchScore(j.jira_display_name, catalystName)
    if (s >= threshold && (!best || s > best.score)) {
      best = { jiraUser: j, score: s }
    }
  }
  return best
}

// ═══ HELPERS ═══

const getInitials = (name: string) =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

const AVATAR_COLORS = ['var(--ds-background-discovery-bold, #8b5cf6)', 'var(--ds-icon-information, #1D7AFC)', 'var(--ds-background-accent-magenta-bolder, #ec4899)', 'var(--ds-background-warning-bold, #f97316)', 'var(--ds-background-accent-teal-bolder, #14b8a6)', 'var(--ds-background-discovery-bold, #6366f1)']
const getAvatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]

const Avatar = ({ name, url, size = 24 }: { name: string; url?: string | null; size?: number }) => (
  url ? (
    <img src={url} alt={name} loading="lazy" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  ) : (
    <span style={{
      width: size, height: size, borderRadius: '50%', display: 'inline-flex',
      alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38,
      fontWeight: 700, color: 'var(--ds-surface, #fff)', background: getAvatarColor(name), flexShrink: 0,
    }}>
      {getInitials(name)}
    </span>
  )
)

type ViewMode = 'all' | 'unmapped'

// ═══ COMPONENT ═══

export function UserMapping() {
  const { data: jiraUsers = [], isLoading } = useUserMappings()
  const { data: profiles = [] } = useCatalystProfilesWithDept()
  const { data: departments = [] } = useCapacityDepartments()
  const batchSave = useBatchSaveUserMappings()
  const autoMatch = useAutoMatchUsers()
  const refreshUsers = useRefreshJiraUsers()

  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [searchText, setSearchText] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [localMappings, setLocalMappings] = useState<Record<string, string | null>>({})
  const [initialized, setInitialized] = useState(false)

  // Initialize local mappings from server data
  React.useEffect(() => {
    if (jiraUsers.length > 0 && !initialized) {
      const map: Record<string, string | null> = {}
      jiraUsers.forEach(u => { map[u.id] = u.catalyst_profile_id })
      setLocalMappings(map)
      setInitialized(true)
    }
  }, [jiraUsers, initialized])

  // Reverse map: catalyst profile id -> jira mapping id
  const catalystToJira = useMemo(() => {
    const map: Record<string, string> = {}
    Object.entries(localMappings).forEach(([jiraId, profileId]) => {
      if (profileId) map[profileId] = jiraId
    })
    return map
  }, [localMappings])

  // Filter profiles by department
  const deptFilteredProfiles = useMemo(() => {
    if (departmentFilter === 'all') return profiles
    return profiles.filter(p => p.department_id === departmentFilter)
  }, [profiles, departmentFilter])

  // Build rows for the main table
  const rows = useMemo(() => {
    let base = deptFilteredProfiles

    if (searchText.trim()) {
      const q = searchText.toLowerCase()
      base = base.filter(p =>
        (p.full_name?.toLowerCase().includes(q)) ||
        (p.email?.toLowerCase().includes(q))
      )
    }

    return base.map(profile => {
      const mappedJiraId = catalystToJira[profile.id]
      const existingJiraMapping = mappedJiraId ? jiraUsers.find(j => j.id === mappedJiraId) || null : null
      const isMapped = !!existingJiraMapping

      const suggestion = !isMapped
        ? findBestMatch(profile.full_name || '', jiraUsers)
        : null

      return { profile, existingJiraMapping, suggestedJira: suggestion, isMapped }
    })
  }, [deptFilteredProfiles, jiraUsers, catalystToJira, searchText])

  // Filtered by view mode
  const visibleRows = useMemo(() => {
    if (viewMode === 'unmapped') return rows.filter(r => !r.isMapped)
    return rows
  }, [rows, viewMode])

  const unmappedProfiles = useMemo(() => rows.filter(r => !r.isMapped), [rows])

  const handleAcceptSuggestion = (profileId: string, jiraUserId: string) => {
    // Clear any previous mapping for this jira user
    setLocalMappings(prev => {
      const next = { ...prev }
      // Remove old catalyst mapping if this jira user was mapped to someone else
      next[jiraUserId] = profileId
      return next
    })
  }

  const handleClearMapping = (jiraUserId: string) => {
    setLocalMappings(prev => ({ ...prev, [jiraUserId]: null }))
  }

  const handleSave = async () => {
    const mappings = Object.entries(localMappings).map(([id, catalyst_profile_id]) => ({
      id,
      catalyst_profile_id: catalyst_profile_id || null,
    }))
    try {
      await batchSave.mutateAsync(mappings)
      toast.success('User mappings saved')
    } catch {
      toast.error('Failed to save')
    }
  }

  const handleAutoMatch = async () => {
    try {
      const result = await autoMatch.mutateAsync()
      toast.success(`Auto-matched ${result.matched} users`)
      setInitialized(false)
    } catch {
      toast.error('Auto-match failed')
    }
  }

  const mappedCount = rows.filter(r => r.isMapped).length
  const unmappedCount = rows.filter(r => !r.isMapped).length
  const totalUnmappedAll = useMemo(() => {
    return profiles.filter(p => !catalystToJira[p.id]).length
  }, [profiles, catalystToJira])

  if (isLoading) {
    return <div style={{ padding: 40, color: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary, #64748B)))', fontFamily: 'var(--cp-font-body)' }}>Loading...</div>
  }

  const cardBg = 'var(--ds-surface, #fff)'
  const borderColor = 'var(--bd-default, var(--cp-border, var(--cp-bg-sunken, var(--ds-border, #DFE1E6))))'

  // Available (unmapped) Jira users for manual dropdown
  const availableJiraUsers = jiraUsers.filter(j => !Object.values(localMappings).includes(j.id) || !localMappings[j.id])

  return (
    <div style={{ maxWidth: 1200, fontFamily: 'var(--cp-font-body)' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 18, fontWeight: 700, color: 'var(--fg-1, var(--cp-ink-1, var(--cp-ink-1, var(--ds-text, #172B4D))))', margin: 0 }}>
          User Mapping
        </h1>
        <p style={{ fontSize: 13, color: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary, #64748B)))', marginTop: 4 }}>
          Link Catalyst resources to Jira accounts. Filter by department and use smart name matching for suggestions.
        </p>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Catalyst Profiles', value: deptFilteredProfiles.length, color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))', mode: 'all' as ViewMode },
          { label: 'Jira Users', value: jiraUsers.length, color: 'var(--ds-background-discovery-bold, #8b5cf6)', mode: null },
          { label: 'Mapped', value: mappedCount, color: 'var(--ds-background-success-bold, #059669)', mode: null },
          { label: 'Unmapped', value: unmappedCount, color: 'var(--ds-text-warning, var(--cp-amber, #F59E0B))', mode: 'unmapped' as ViewMode },
        ].map(s => (
          <div
            key={s.label}
            onClick={s.mode ? () => setViewMode(s.mode!) : undefined}
            style={{
              background: viewMode === s.mode ? 'var(--ds-background-information, rgba(37,99,235,0.04))' : cardBg,
              border: `1px solid ${viewMode === s.mode ? 'var(--ds-background-information-bold, #0C66E4)' : borderColor}`,
              borderRadius: 8, padding: '10px 16px', flex: 1,
              display: 'flex', alignItems: 'center', gap: 10,
              cursor: s.mode ? 'pointer' : 'default',
              transition: 'all .15s',
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-1, var(--cp-ink-1, var(--cp-ink-1, var(--ds-text, #172B4D))))' }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light, #94A3B8)))', textTransform: 'uppercase', letterSpacing: '.3px' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Unmapped Resources Widget */}
      {viewMode === 'unmapped' && unmappedProfiles.length > 0 && (
        <div style={{
          background: 'var(--ds-background-warning, #FFF7D6)', border: '1px solid var(--ds-background-warning, #FFF7D6)', borderRadius: 8,
          padding: 16, marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>⚠️</span>
              <span style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 13, fontWeight: 700, color: 'var(--ds-text-warning, #974F0C)' }}>
                {unmappedCount} Unmapped Catalyst Resource{unmappedCount !== 1 ? 's' : ''}
              </span>
              {departmentFilter !== 'all' && (
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                  background: 'rgba(146,64,14,0.08)', color: 'var(--ds-text-warning, var(--ds-text-warning, #974F0C))',
                }}>
                  {departments.find(d => d.id === departmentFilter)?.name || 'Filtered'}
                </span>
              )}
            </div>
            <span style={{ fontSize: 10, color: 'var(--ds-background-warning-bold, #b45309)' }}>
              {totalUnmappedAll} total unmapped across all departments
            </span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--ds-text-warning, #974F0C)', margin: '0 0 12px', lineHeight: 1.5 }}>
            These Catalyst users have no linked Jira account. Map them manually using the dropdown in the table below, or use Auto-Match to link by email.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {unmappedProfiles.slice(0, 20).map(r => (
              <span key={r.profile.id} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: 'var(--ds-background-warning, #FFF7D6)', border: '1px solid var(--ds-background-warning, #FFF7D6)', borderRadius: 6,
                padding: '4px 10px', fontSize: 11, color: 'var(--ds-text-warning, #974F0C)', fontWeight: 500,
              }}>
                <Avatar name={r.profile.full_name || 'U'} url={r.profile.avatar_url} size={18} />
                {r.profile.full_name || 'Unnamed'}
              </span>
            ))}
            {unmappedProfiles.length > 20 && (
              <span style={{ fontSize: 11, color: 'var(--ds-background-warning-bold, #b45309)', alignSelf: 'center' }}>
                +{unmappedProfiles.length - 20} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Filters bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
        background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 8, padding: '10px 14px',
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary, #64748B)))' }}>Department</span>
        <select
          value={departmentFilter}
          onChange={e => setDepartmentFilter(e.target.value)}
          style={{
            padding: '5px 10px', borderRadius: 6, fontSize: 12, border: `1px solid ${borderColor}`,
            background: 'var(--bg-1, var(--ds-surface-sunken, #F8FAFC))', color: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, var(--ds-text-subtle, #44546F))))', minWidth: 160,
          }}
        >
          <option value="all">All Departments</option>
          {departments.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        <div style={{ width: 1, height: 24, background: 'var(--bd-default, var(--cp-border, var(--cp-bg-sunken, var(--ds-border, #DFE1E6))))', margin: '0 4px' }} />

        {/* View mode toggle */}
        <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: `1px solid ${borderColor}` }}>
          {[
            { mode: 'all' as ViewMode, label: 'All' },
            { mode: 'unmapped' as ViewMode, label: 'Unmapped Only' },
          ].map(v => (
            <button
              key={v.mode}
              onClick={() => setViewMode(v.mode)}
              style={{
                padding: '5px 12px', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
                background: viewMode === v.mode ? 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))' : 'var(--bg-1, var(--ds-surface-sunken, #F8FAFC))',
                color: viewMode === v.mode ? 'var(--ds-surface, #fff)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary, #64748B)))',
                transition: 'all .15s',
              }}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 24, background: 'var(--bd-default, var(--cp-border, var(--cp-bg-sunken, var(--ds-border, #DFE1E6))))', margin: '0 4px' }} />

        <input
          type="text"
          placeholder="Search by name…"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={{
            padding: '5px 10px', borderRadius: 6, fontSize: 12, border: `1px solid ${borderColor}`,
            background: 'var(--bg-1, var(--ds-surface-sunken, #F8FAFC))', color: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, var(--ds-text-subtle, #44546F))))', width: 200, outline: 'none',
          }}
        />

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={() => refreshUsers.mutate()} disabled={refreshUsers.isPending} style={{
            padding: '6px 14px', borderRadius: 6, fontSize: 11, fontWeight: 500,
            background: 'var(--bg-1, var(--ds-surface-sunken, #F8FAFC))', color: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, var(--ds-text-subtle, #44546F))))', border: `1px solid ${borderColor}`, cursor: 'pointer',
          }}>
            {refreshUsers.isPending ? 'Refreshing…' : '↻ Refresh Jira'}
          </button>
          <button onClick={handleAutoMatch} disabled={autoMatch.isPending} style={{
            padding: '6px 14px', borderRadius: 6, fontSize: 11, fontWeight: 500,
            background: 'var(--bg-1, var(--ds-surface-sunken, #F8FAFC))', color: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, var(--ds-text-subtle, #44546F))))', border: `1px solid ${borderColor}`, cursor: 'pointer',
          }}>
            {autoMatch.isPending ? 'Matching…' : '⚡ Auto-Match Email'}
          </button>
          <button onClick={handleSave} disabled={batchSave.isPending} style={{
            padding: '6px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600,
            background: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))', color: 'var(--ds-surface, #fff)', border: 'none', cursor: 'pointer',
            opacity: batchSave.isPending ? 0.6 : 1,
          }}>
            {batchSave.isPending ? 'Saving…' : '💾 Save All'}
          </button>
        </div>
      </div>

      {/* Main mapping table */}
      <div style={{
        background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 8,
        boxShadow: '0 1px 3px var(--ds-shadow-raised, rgba(0,0,0,.04))',
      }}>
        <div style={{ maxHeight: 600, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--bg-1, var(--ds-surface-sunken, #F8FAFC))', position: 'sticky', top: 0, zIndex: 2 }}>
                {['#', 'CATALYST RESOURCE', 'DEPT', 'JIRA ACCOUNT (MAPPED)', 'SUGGESTED MATCH', 'ACTION'].map(h => (
                  <th key={h} style={{
                    fontFamily: 'var(--cp-font-heading)', fontSize: 9, textTransform: 'uppercase',
                    color: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light, #94A3B8)))', padding: '10px 12px', textAlign: 'left', fontWeight: 600,
                    letterSpacing: '.4px', borderBottom: `1px solid ${borderColor}`,
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, idx) => {
                const { profile, existingJiraMapping, suggestedJira, isMapped } = row

                return (
                  <tr key={profile.id} style={{
                    borderBottom: '1px solid var(--cp-bg-sunken, var(--cp-bg-sunken, var(--ds-surface-sunken, #F7F8F9)))',
                    background: isMapped ? 'var(--ds-surface, #fff)' : '#FEFCE8',
                  }}>
                    {/* # */}
                    <td style={{ padding: '10px 12px', color: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light, #94A3B8)))', width: 36, fontSize: 11 }}>
                      {idx + 1}
                    </td>

                    {/* Catalyst Resource */}
                    <td style={{ padding: '10px 12px', width: 240 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={profile.full_name || 'U'} url={existingJiraMapping?.jira_avatar_url || profile.avatar_url} size={28} />
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--fg-1, var(--cp-ink-1, var(--cp-ink-1, var(--ds-text, #172B4D))))', fontSize: 12 }}>
                            {profile.full_name || 'Unnamed'}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light, #94A3B8)))' }}>
                            {profile.email || '—'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Dept */}
                    <td style={{ padding: '10px 12px', width: 100 }}>
                      {profile.department_name ? (
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                          background: profile.department_name === 'Delivery' ? 'var(--ds-background-information, rgba(37,99,235,0.08))' :
                            profile.department_name === 'Product' ? 'var(--ds-background-discovery-bold, rgba(139,92,246,0.08))' :
                              'var(--ds-background-neutral, rgba(148,163,184,0.08))',
                          color: profile.department_name === 'Delivery' ? 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))' :
                            profile.department_name === 'Product' ? 'var(--ds-background-discovery-bold, #8b5cf6)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary, #64748B)))',
                        }}>
                          {profile.department_name}
                        </span>
                      ) : (
                        <span style={{ fontSize: 10, color: 'var(--ds-text-disabled, #CBD5E1)' }}>—</span>
                      )}
                    </td>

                    {/* Jira Account (Mapped) */}
                    <td style={{ padding: '10px 12px', width: 260 }}>
                      {isMapped && existingJiraMapping ? (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          background: 'var(--ds-background-success, #DFFCF0)', padding: '6px 10px', borderRadius: 6,
                          border: '1px solid var(--ds-background-success, #A7F3D0)',
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ds-background-success-bold, #059669)', flexShrink: 0 }} />
                          <Avatar name={existingJiraMapping.jira_display_name} url={existingJiraMapping.jira_avatar_url} size={22} />
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--fg-1, var(--cp-ink-1, var(--cp-ink-1, var(--ds-text, #172B4D))))', fontSize: 11 }}>
                              {existingJiraMapping.jira_display_name}
                            </div>
                            <div style={{ fontSize: 9, color: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary, #64748B)))', fontFamily: 'var(--cp-font-mono)' }}>
                              {existingJiraMapping.jira_account_id.slice(0, 16)}…
                            </div>
                          </div>
                        </div>
                      ) : (
                        <select
                          value=""
                          onChange={e => {
                            if (e.target.value) handleAcceptSuggestion(profile.id, e.target.value)
                          }}
                          style={{
                            padding: '5px 8px', borderRadius: 6, fontSize: 11, width: '100%',
                            border: '1px solid var(--ds-background-warning, #FFF7D6)', background: 'var(--ds-background-warning, #FFF7D6)',
                            color: 'var(--ds-text-warning, #974F0C)',
                          }}
                        >
                          <option value="">— Select Jira User —</option>
                          {jiraUsers.map(j => (
                            <option key={j.id} value={j.id}>
                              {j.jira_display_name} ({j.jira_email || j.jira_account_id.slice(0, 12)})
                            </option>
                          ))}
                        </select>
                      )}
                    </td>

                    {/* Suggested Match */}
                    <td style={{ padding: '10px 12px', width: 260 }}>
                      {suggestedJira && !isMapped ? (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          background: suggestedJira.score >= 0.7 ? 'var(--ds-background-information, rgba(37,99,235,0.06))' : 'var(--ds-background-warning-bold, rgba(251,191,36,0.06))',
                          padding: '6px 10px', borderRadius: 6,
                          border: `1px solid ${suggestedJira.score >= 0.7 ? 'var(--ds-background-information-bold, #0C66E4)' : 'var(--ds-background-warning, #FFF7D6)'}`,
                        }}>
                          <Avatar name={suggestedJira.jiraUser.jira_display_name} url={suggestedJira.jiraUser.jira_avatar_url} size={22} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, color: 'var(--fg-1, var(--cp-ink-1, var(--cp-ink-1, var(--ds-text, #172B4D))))', fontSize: 11 }}>
                              {suggestedJira.jiraUser.jira_display_name}
                            </div>
                            <div style={{ fontSize: 9, color: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary, #64748B)))' }}>
                              {Math.round(suggestedJira.score * 100)}% match
                            </div>
                          </div>
                          <span style={{
                            fontSize: 8, fontWeight: 700, padding: '2px 5px', borderRadius: 4,
                            background: suggestedJira.score >= 0.7 ? 'var(--ds-background-information, #E9F2FF)' : 'var(--ds-background-warning, #FFF7D6)',
                            color: suggestedJira.score >= 0.7 ? 'var(--ds-background-brand-bold-hovered, #1D4ED8)' : 'var(--ds-text-warning, #974F0C)',
                          }}>
                            {suggestedJira.score >= 0.7 ? 'HIGH' : 'LOW'}
                          </span>
                        </div>
                      ) : isMapped ? (
                        <span style={{ fontSize: 10, color: 'var(--ds-text-disabled, #CBD5E1)' }}>—</span>
                      ) : (
                        <span style={{ fontSize: 10, color: 'var(--ds-text-disabled, #CBD5E1)', fontStyle: 'italic' }}>No match found</span>
                      )}
                    </td>

                    {/* Action */}
                    <td style={{ padding: '10px 12px', width: 120 }}>
                      {isMapped && existingJiraMapping ? (
                        <button
                          onClick={() => handleClearMapping(existingJiraMapping.id)}
                          style={{
                            padding: '4px 10px', borderRadius: 4, fontSize: 10, fontWeight: 500,
                            background: 'var(--ds-background-danger, #FEF2F2)', color: 'var(--ds-text-danger, #EF4444)', border: '1px solid var(--ds-background-danger, #FFECEB)',
                            cursor: 'pointer',
                          }}
                        >
                          ✕ Unlink
                        </button>
                      ) : suggestedJira ? (
                        <button
                          onClick={() => handleAcceptSuggestion(profile.id, suggestedJira.jiraUser.id)}
                          style={{
                            padding: '4px 10px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                            background: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))', color: 'var(--ds-surface, #fff)', border: 'none', cursor: 'pointer',
                          }}
                        >
                          ✓ Accept
                        </button>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light, #94A3B8)))', fontSize: 12 }}>
                    {viewMode === 'unmapped' ? 'All resources in this department are mapped! 🎉' : 'No resources found for the selected filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default UserMapping
