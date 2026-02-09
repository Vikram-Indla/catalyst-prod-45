import React, { useState, useEffect } from 'react'
import {
  useUserMappings, useBatchSaveUserMappings, useAutoMatchUsers,
  useRefreshJiraUsers, useCatalystProfiles,
} from '../hooks/useAdminConfig'
import type { JiraUserMapping } from '../types/admin-config.types'
import toast from 'react-hot-toast'

export function UserMapping() {
  const { data: users = [], isLoading } = useUserMappings()
  const { data: profiles = [] } = useCatalystProfiles()
  const batchSave = useBatchSaveUserMappings()
  const autoMatch = useAutoMatchUsers()
  const refreshUsers = useRefreshJiraUsers()

  const [localMappings, setLocalMappings] = useState<Record<string, string | null>>({})

  useEffect(() => {
    if (users.length > 0) {
      const map: Record<string, string | null> = {}
      users.forEach(u => { map[u.id] = u.catalyst_profile_id })
      setLocalMappings(map)
    }
  }, [users])

  const unmappedCount = users.filter(u => !u.is_mapped && !localMappings[u.id]).length

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
    } catch {
      toast.error('Auto-match failed')
    }
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  }

  const getAvatarColor = (name: string) => {
    const colors = ['#8B5CF6', '#06B6D4', '#EC4899', '#F97316', '#14B8A6', '#6366F1']
    const idx = name.charCodeAt(0) % colors.length
    return colors[idx]
  }

  if (isLoading) {
    return <div style={{ padding: 40, color: '#64748B', fontFamily: 'Inter, sans-serif' }}>Loading...</div>
  }

  const cardStyle: React.CSSProperties = {
    background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8,
    padding: 20, marginBottom: 16, boxShadow: '0 1px 2px rgba(0,0,0,.05)',
  }

  // Map profile IDs that are already assigned
  const mappedProfileIds = new Set(Object.values(localMappings).filter(Boolean))

  return (
    <div style={{ maxWidth: 1000, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>
          User Mapping
        </h1>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
          Link Jira accounts to Catalyst profiles. Unmapped users show Jira display names in views.
        </p>
      </div>

      {/* Unmapped warning */}
      {unmappedCount > 0 && (
        <div style={{
          background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 6,
          padding: '8px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B', flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#F59E0B' }}>
            {unmappedCount} unmapped Jira users detected — assign Catalyst profiles below
          </span>
        </div>
      )}

      {/* Card 1: User Mapping Table */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 600, color: '#0F172A', margin: 0 }}>
            Jira → Catalyst User Mapping
          </h2>
          <span style={{
            fontSize: 10, background: '#F1F5F9', color: '#64748B', padding: '2px 8px',
            borderRadius: 3, fontWeight: 500,
          }}>{users.length} users</span>
        </div>

        <div style={{
          maxHeight: 380, overflowY: 'auto', border: '1px solid #F1F5F9', borderRadius: 6,
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', position: 'sticky', top: 0, zIndex: 1 }}>
                {['#', 'Account ID', 'Jira User', 'Email', 'Catalyst Profile', 'Status'].map(h => (
                  <th key={h} style={{
                    fontFamily: 'Sora, sans-serif', fontSize: 9, textTransform: 'uppercase',
                    color: '#94A3B8', padding: '8px 10px', textAlign: 'left', fontWeight: 600,
                    letterSpacing: '.3px',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, idx) => {
                const isMapped = u.is_mapped || !!localMappings[u.id]
                return (
                  <tr key={u.id} style={{
                    background: isMapped ? '#fff' : '#FFFBEB',
                    borderBottom: '1px solid #F1F5F9',
                  }}>
                    <td style={{ padding: '8px 10px', color: '#94A3B8', width: 30 }}>{idx + 1}</td>
                    <td style={{
                      padding: '8px 10px', width: 100,
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#64748B',
                      maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {u.jira_account_id.slice(0, 12)}…
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff',
                          background: getAvatarColor(u.jira_display_name), flexShrink: 0,
                        }}>
                          {getInitials(u.jira_display_name)}
                        </span>
                        <span style={{ fontWeight: 500, color: '#0F172A' }}>{u.jira_display_name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '8px 10px', fontSize: 11, color: '#64748B' }}>
                      {u.jira_email || '—'}
                    </td>
                    <td style={{ padding: '8px 10px', width: 220 }}>
                      <select
                        value={localMappings[u.id] || ''}
                        onChange={(e) => setLocalMappings(prev => ({
                          ...prev,
                          [u.id]: e.target.value || null,
                        }))}
                        style={{
                          width: '100%', padding: '5px 8px', borderRadius: 4, fontSize: 11,
                          border: '1px solid',
                          borderColor: isMapped ? '#E2E8F0' : '#F59E0B',
                          background: '#fff', color: '#334155',
                        }}
                      >
                        <option value="">— Select Catalyst User —</option>
                        {profiles.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.full_name || p.email || p.id.slice(0, 8)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '8px 10px', width: 80 }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                        background: isMapped ? '#ECFDF5' : '#FFFBEB',
                        color: isMapped ? '#10B981' : '#F59E0B',
                      }}>
                        ● {isMapped ? 'Mapped' : 'Unmapped'}
                      </span>
                    </td>
                  </tr>
                )
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 30, textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>
                    No Jira users found. Run a sync to populate user data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
          <button onClick={handleSave} disabled={batchSave.isPending} style={{
            padding: '8px 20px', borderRadius: 6, fontSize: 12, fontWeight: 600,
            background: '#2563EB', color: '#fff', border: 'none', cursor: 'pointer',
            opacity: batchSave.isPending ? 0.6 : 1,
          }}>
            {batchSave.isPending ? 'Saving...' : 'Save All Mappings'}
          </button>
          <button onClick={() => refreshUsers.mutate()} disabled={refreshUsers.isPending} style={{
            padding: '8px 20px', borderRadius: 6, fontSize: 12, fontWeight: 500,
            background: '#F8FAFC', color: '#334155', border: '1px solid #E2E8F0', cursor: 'pointer',
          }}>
            {refreshUsers.isPending ? 'Refreshing...' : '↻ Refresh from Jira'}
          </button>
          <button onClick={handleAutoMatch} disabled={autoMatch.isPending} style={{
            padding: '8px 20px', borderRadius: 6, fontSize: 12, fontWeight: 500,
            background: '#F8FAFC', color: '#334155', border: '1px solid #E2E8F0', cursor: 'pointer',
          }}>
            {autoMatch.isPending ? 'Matching...' : '⚡ Auto-Match by Email'}
          </button>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: '#94A3B8' }}>
            Unmapped users show Jira display name in all views
          </span>
        </div>
      </div>

      {/* Card 2: Catalyst Profiles */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 600, color: '#0F172A', margin: 0 }}>
            Catalyst Profiles
          </h2>
          <span style={{
            fontSize: 10, background: '#F1F5F9', color: '#64748B', padding: '2px 8px',
            borderRadius: 3, fontWeight: 500,
          }}>From profiles table</span>
        </div>
        <p style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
          Available Catalyst user profiles for mapping.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {profiles.map(p => {
            const isLinked = mappedProfileIds.has(p.id)
            return (
              <div key={p.id} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 6,
                border: '1px solid',
                borderColor: isLinked ? '#6EE7B7' : '#FCD34D',
                background: isLinked ? '#ECFDF5' : '#FFFBEB',
                fontSize: 11,
              }}>
                <span style={{
                  width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#fff',
                  background: getAvatarColor(p.full_name || 'U'),
                }}>
                  {getInitials(p.full_name || 'U')}
                </span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>
                  {p.full_name || p.email || 'Unnamed'}
                </span>
                {p.role && <span style={{ color: '#94A3B8' }}>{p.role}</span>}
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: isLinked ? '#10B981' : '#F59E0B',
                }} />
              </div>
            )
          })}
          {profiles.length === 0 && (
            <span style={{ fontSize: 12, color: '#94A3B8' }}>No profiles found.</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserMapping
