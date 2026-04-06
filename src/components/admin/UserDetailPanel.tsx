import React, { useState } from 'react';
import { X, ShieldCheck, Share2, Loader2, RefreshCw, Copy, UserX, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { useJiraUserDetail, useToggleUserStatus, useUpdatePerm } from '@/hooks/useJiraUserSync';

const AVATAR_COLORS = [
  { bg: '#DBEAFE', text: '#1D4ED8' }, { bg: '#DCFCE7', text: '#15803D' },
  { bg: '#FEF3C7', text: '#92400E' }, { bg: '#EDE9FE', text: '#5B21B6' },
  { bg: '#FEE2E2', text: '#991B1B' }, { bg: '#F0FDF4', text: '#0F766E' },
  { bg: '#EFF6FF', text: '#1D4ED8' }, { bg: '#E0F2FE', text: '#0369A1' },
  { bg: '#F5F3FF', text: '#7C3AED' }, { bg: '#CCFBF1', text: '#0F766E' },
];

const TABS = [
  { key: 'profile', label: 'Profile' },
  { key: 'projects', label: 'Projects' },
  { key: 'activity', label: 'Activity' },
  { key: 'info', label: 'Info' },
] as const;

type TabKey = typeof TABS[number]['key'];

function getInitials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (diff === 0) return `Today ${time}`;
  if (diff === 1) return `Yesterday ${time}`;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ` ${time}`;
}

function hashColor(id: string): typeof AVATAR_COLORS[number] {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

interface Props {
  userId: string;
  onClose: () => void;
  isDark?: boolean;
}

const mkSectionLabel = (isDark: boolean): React.CSSProperties => ({
  fontSize: '10px', fontWeight: 700, color: isDark ? '#878787' : '#64748B',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px',
});

const mkFieldRow = (isDark: boolean): React.CSSProperties => ({
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '5px 0', borderBottom: `0.5px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.06)'}`,
});

const mkFieldKey = (isDark: boolean): React.CSSProperties => ({ fontSize: '11px', color: isDark ? '#A1A1A1' : '#64748B' });
const mkFieldVal = (isDark: boolean): React.CSSProperties => ({ fontSize: '12px', fontWeight: 500, color: isDark ? '#EDEDED' : '#0F172A', textAlign: 'right' as const });
const monoSmall: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' };
const Code: React.FC<{ children: React.ReactNode; isDark?: boolean }> = ({ children, isDark = false }) => (
  <code style={{
    fontFamily: "'JetBrains Mono', monospace", fontSize: '10px',
    background: isDark ? '#1A1A1A' : '#F1F5F9', padding: '1px 4px', borderRadius: '4px',
    color: isDark ? '#93C5FD' : '#2563EB',
  }}>{children}</code>
);

const InfoCard: React.FC<{ label: string; children: React.ReactNode; isDark?: boolean }> = ({ label, children, isDark = false }) => (
  <div style={{
    background: isDark ? '#1A1A1A' : '#F8FAFC',
    border: `1px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.10)'}`,
    borderRadius: '6px', padding: '10px 12px',
  }}>
    <div style={{
      fontSize: '9.5px', fontWeight: 700, color: isDark ? '#878787' : '#64748B',
      textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '5px',
    }}>
      {label}
    </div>
    <div style={{ fontSize: '11px', color: isDark ? '#A1A1A1' : '#334155', lineHeight: 1.55 }}>{children}</div>
  </div>
);
const PERM_LEVELS = ['view', 'edit', 'full', 'none'] as const;
const PERM_COLORS: Record<string, { bg: string; color: string; bgDark: string; colorDark: string }> = {
  view: { bg: '#EFF6FF', color: '#0747A6', bgDark: 'rgba(37,99,235,0.12)', colorDark: '#93C5FD' },
  edit: { bg: '#FEF3C7', color: '#92400E', bgDark: 'rgba(251,191,36,0.12)', colorDark: '#FCD34D' },
  full: { bg: '#DCFCE7', color: '#006644', bgDark: 'rgba(34,197,94,0.12)', colorDark: '#86EFAC' },
  none: { bg: '#F1F5F9', color: '#64748B', bgDark: '#1A1A1A', colorDark: '#878787' },
};

function getEventDotColor(ev: any): string {
  if (ev.event_type === 'created') return '#7C3AED';
  if (ev.event_type === 'deactivated' || ev.event_type === 'reactivated') return '#D97706';
  if (ev.direction === 'jira_to_catalyst') return '#2563EB';
  if (ev.direction === 'catalyst_to_jira') return '#0D9488';
  return '#2563EB';
}

function getEventText(ev: any): string {
  switch (ev.event_type) {
    case 'created': return 'Account created — Catalyst local auth';
    case 'updated': return 'Profile updated — fields: ' + (ev.changed_fields?.join(', ') || 'unknown');
    case 'deactivated': return 'Access revoked by admin';
    case 'reactivated': return 'Access restored';
    case 'webhook_received': return 'Jira webhook received — user data synced';
    case 'role_mapped': return 'Role mapped from Jira group';
    default: return ev.event_type?.replace(/_/g, ' ') || 'Unknown event';
  }
}

const ProjectsTab: React.FC<{ perms: any[]; isDark?: boolean }> = ({ perms, isDark = false }) => {
  const [checkedPerms, setCheckedPerms] = useState<Set<string>>(new Set());
  const { mutate: updatePerm, isPending, variables } = useUpdatePerm();

  const selectAll = () => setCheckedPerms(new Set(perms.map((p: any) => p.id)));
  const deselectAll = () => setCheckedPerms(new Set());
  const toggleCheck = (id: string) => {
    setCheckedPerms(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const xsBtn: React.CSSProperties = {
    fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
    padding: '3px 7px', borderRadius: '4px', cursor: 'pointer',
    border: `1px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.10)'}`,
    background: isDark ? '#1A1A1A' : '#FFFFFF', color: isDark ? '#A1A1A1' : '#64748B',
  };
  const xsBtnClass = 'jus-action-btn';

  return (
    <div style={{ padding: '12px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ ...mkSectionLabel(isDark), marginBottom: 0 }}>
          PROJECT ASSIGNMENTS ({perms.length})
        </div>
        <div style={{ display: 'flex', gap: '5px' }}>
          <button className={xsBtnClass} style={xsBtn} onClick={selectAll}>Select All</button>
          <button className={xsBtnClass} style={xsBtn} onClick={deselectAll}>Deselect All</button>
          <button
            style={{ ...xsBtn, background: '#2563EB', color: '#FFFFFF', border: 'none' }}
            onClick={() => toast.info('Project picker — Phase 2')}
          >+ Add Project</button>
        </div>
      </div>

      {perms.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 16px' }}>
          <div style={{ fontSize: '12px', color: isDark ? '#878787' : '#94A3B8', marginBottom: '10px' }}>No projects assigned yet</div>
          <button
            style={{ fontSize: '11px', fontWeight: 600, background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '4px', padding: '5px 12px', cursor: 'pointer' }}
            onClick={() => toast.info('Project picker — Phase 2')}
          >+ Add Project</button>
        </div>
      ) : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginTop: '6px' }}>
            <thead>
              <tr style={{ background: isDark ? '#0A0A0A' : '#F1F5F9' }} className="jus-table-head">
                <th style={{ padding: '6px 9px', fontSize: '9px', fontWeight: 700, color: isDark ? '#878787' : '#64748B', textTransform: 'uppercase', textAlign: 'left', width: '28px' }}>
                  <input
                    type="checkbox"
                    checked={checkedPerms.size === perms.length && perms.length > 0}
                    onChange={() => checkedPerms.size === perms.length ? deselectAll() : selectAll()}
                    style={{ width: '12px', height: '12px', accentColor: '#2563EB' }}
                  />
                </th>
                <th style={{ padding: '6px 9px', fontSize: '9px', fontWeight: 700, color: isDark ? '#878787' : '#64748B', textTransform: 'uppercase', textAlign: 'left' }}>Project</th>
                <th style={{ padding: '6px 9px', fontSize: '9px', fontWeight: 700, color: isDark ? '#878787' : '#64748B', textTransform: 'uppercase', textAlign: 'left' }}>Key</th>
                <th style={{ padding: '6px 9px', fontSize: '9px', fontWeight: 700, color: isDark ? '#878787' : '#64748B', textTransform: 'uppercase', textAlign: 'right' }}>Permission</th>
              </tr>
            </thead>
            <tbody>
              {perms.map((p: any) => {
                const isMutating = isPending && variables?.permId === p.id;
                return (
                  <tr key={p.id} style={{ borderBottom: `0.75px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.06)'}` }}
                    onMouseEnter={e => (e.currentTarget.style.background = isDark ? '#1F1F1F' : 'rgba(15,23,42,0.035)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '6px 9px' }}>
                      <input
                        type="checkbox"
                        checked={checkedPerms.has(p.id)}
                        onChange={() => toggleCheck(p.id)}
                        style={{ width: '12px', height: '12px', accentColor: '#2563EB' }}
                      />
                    </td>
                    <td style={{ padding: '6px 9px', fontWeight: 500, color: isDark ? '#EDEDED' : '#0F172A', whiteSpace: 'nowrap' }} className="jus-field-val">
                      {p.project_name || p.project_key}
                    </td>
                    <td style={{ padding: '6px 9px' }}>
                      <span className="jus-project-key-chip" style={{
                        fontFamily: "'JetBrains Mono', monospace", fontSize: '9px',
                        color: isDark ? '#A1A1A1' : '#64748B',
                        background: isDark ? '#1A1A1A' : '#F1F5F9', padding: '1px 4px', borderRadius: '4px',
                      }}>{p.project_key}</span>
                    </td>
                    <td style={{ padding: '6px 9px', textAlign: 'right' }}>
                      <div className="jus-perm-seg" style={{
                        display: 'inline-flex', border: `1px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.10)'}`,
                        borderRadius: '4px', overflow: 'hidden',
                      }}>
                        {PERM_LEVELS.map((level, i) => {
                          const active = p.permission_level === level;
                          const colors = PERM_COLORS[level];
                          const showSpinner = isMutating && variables?.level === level;
                          return (
                            <button
                              key={level}
                              onClick={() => !active && updatePerm({ permId: p.id, level })}
                              disabled={isMutating}
                              style={{
                                padding: '3px 7px', fontSize: '9px', fontWeight: 700,
                                textTransform: 'uppercase', cursor: active ? 'default' : 'pointer',
                                background: active ? (isDark ? colors.bgDark : colors.bg) : 'transparent',
                                color: active ? (isDark ? colors.colorDark : colors.color) : (isDark ? '#878787' : '#94A3B8'),
                                border: 'none',
                                borderRight: i < 3 ? `1px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.10)'}` : 'none',
                              }}
                            >
                              {showSpinner ? <Loader2 size={10} className="animate-spin" /> : level}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <button
            style={{
              width: '100%', marginTop: '10px', padding: '7px 0',
              background: '#2563EB', color: '#FFFFFF', border: 'none',
              borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
            }}
            onClick={() => toast.success('Assignments saved. Changes push to Jira on next sync.')}
          >Save Project Assignments</button>
        </>
      )}
    </div>
  );
};

const ActivityTab: React.FC<{ events: any[]; isDark?: boolean }> = ({ events, isDark = false }) => {
  const sorted = [...events].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div style={{ padding: '12px 16px' }}>
      <div style={mkSectionLabel(isDark)}>SYNC ACTIVITY</div>
      {sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 16px' }}>
          <Activity size={24} color={isDark ? '#878787' : '#94A3B8'} style={{ margin: '0 auto 8px' }} />
          <div style={{ fontSize: '12px', color: isDark ? '#A1A1A1' : '#94A3B8', fontWeight: 500 }}>No activity recorded yet</div>
          <div style={{ fontSize: '11px', color: isDark ? '#878787' : '#CBD5E1', marginTop: '4px' }}>Events will appear here after the first sync</div>
        </div>
      ) : (
        sorted.slice(0, 30).map((ev: any) => (
          <div key={ev.id} style={{
            display: 'flex', gap: '9px', padding: '5px 0',
            borderBottom: `0.5px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.06)'}`,
          }}>
            <div style={{
              width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
              marginTop: '3px', background: getEventDotColor(ev),
            }} />
            <div style={{ flex: 1 }}>
              <div className="jus-event-text" style={{ fontSize: '11px', color: isDark ? '#EDEDED' : '#334155' }}>{getEventText(ev)}</div>
              <div className="jus-event-time" style={{ fontSize: '10px', color: isDark ? '#878787' : '#94A3B8', marginTop: '1px' }}>{formatDate(ev.created_at)}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

const UserDetailPanel: React.FC<Props> = ({ userId, onClose, isDark = false }) => {
  const { data, isLoading } = useJiraUserDetail(userId);
  const { mutate: toggleStatus, isPending: toggling } = useToggleUserStatus();
  const [activeTab, setActiveTab] = useState<TabKey>('profile');
  const [showPwd, setShowPwd] = useState(false);

  const user = data?.data;

  const T = isDark ? {
    surface: '#0A0A0A', border: '#2E2E2E', text1: '#EDEDED',
    text2: '#A1A1A1', text3: '#878787', sunken: '#0A0A0A',
    elevated: '#1A1A1A', inputBg: '#1A1A1A',
  } : {
    surface: '#FFFFFF', border: 'rgba(15,23,42,0.10)', text1: '#0F172A',
    text2: '#64748B', text3: '#94A3B8', sunken: '#F1F5F9',
    elevated: '#F8FAFC', inputBg: '#FFFFFF',
  };

  if (isLoading || !user) {
    return (
      <div style={{
        width: '420px', flexShrink: 0, borderLeft: `1px solid ${T.border}`,
        background: T.surface, display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '20px' }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse" style={{
              height: i === 0 ? 48 : 14, width: i === 0 ? 48 : `${70 + (i * 10)}%`,
              borderRadius: i === 0 ? '50%' : 3, background: isDark ? '#2E2E2E' : '#E2E8F0',
              marginBottom: i === 0 ? 12 : 10,
            }} />
          ))}
        </div>
      </div>
    );
  }

  const isInactive = !user.is_active_in_catalyst;
  const isCatalystOnly = user.catalyst_only;
  const isJiraProxy = user.auth_mode === 'jira_proxy';
  const avatarColor = hashColor(user.id);
  const perms = user.jira_user_project_perms ?? [];
  const events = user.jira_sync_user_events ?? [];

  const handleToggle = () => {
    toggleStatus(
      { id: user.id, active: !user.is_active_in_catalyst },
      {
        onSuccess: () => toast.success(isInactive ? 'User reactivated' : 'User deactivated'),
        onError: () => toast.error('Failed to update status'),
      }
    );
  };

  return (
    <div style={{
      width: '420px', flexShrink: 0, borderLeft: `1px solid ${T.border}`,
      background: T.surface, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      color: T.text1,
    }}>
      {/* ── Header ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 5, background: T.surface, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ padding: '16px 16px 12px', display: 'flex', gap: '12px', position: 'relative' }}>
          {/* Avatar */}
          <div style={{
            width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
            background: user.avatar_url ? 'transparent' : avatarColor.bg,
            color: avatarColor.text, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', fontWeight: 700, overflow: 'hidden',
          }}>
            {user.avatar_url
              ? <img src={user.avatar_url} alt="" style={{ width: 48, height: 48, borderRadius: '50%' }} />
              : getInitials(user.display_name || '?')
            }
          </div>
          {/* Name block */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Sora', sans-serif", fontSize: '15px', fontWeight: 700, color: T.text1, letterSpacing: '-0.2px' }}>
              {user.display_name}
            </div>
            <div style={{ fontSize: '11px', color: T.text2, marginTop: '2px' }}>
              {user.resource_role_id || 'No role assigned'}
            </div>
            <div style={{ display: 'flex', gap: '5px', marginTop: '7px' }}>
              {/* Auth badge */}
              {isJiraProxy ? (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '3px',
                  padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700,
                  letterSpacing: '0.03em', textTransform: 'uppercase',
                  background: isDark ? 'rgba(37,99,235,0.15)' : '#EFF6FF',
                  color: isDark ? '#93C5FD' : '#2563EB',
                  border: `1px solid ${isDark ? 'rgba(37,99,235,0.30)' : '#BFDBFE'}`,
                }}>
                  Jira Proxy
                </span>
              ) : (
                <span style={{
                  padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700,
                  letterSpacing: '0.03em', textTransform: 'uppercase',
                  background: isDark ? 'rgba(124,58,237,0.15)' : '#F5F3FF',
                  color: isDark ? '#C4B5FD' : '#7C3AED',
                  border: '1px solid rgba(124,58,237,0.25)',
                }}>
                  Local Auth
                </span>
              )}
              {/* Status lozenge */}
              <span style={{
                display: 'inline-block', padding: '0 7px', borderRadius: '4px',
                fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                height: '20px', lineHeight: '20px',
                background: isInactive ? (isDark ? '#450A0A' : '#FEE2E2') : (isDark ? '#064E3B' : '#E3FCEF'),
                color: isInactive ? (isDark ? '#FCA5A5' : '#991B1B') : (isDark ? '#6EE7B7' : '#006644'),
              }}>
                {isInactive ? 'INACTIVE' : 'ACTIVE'}
              </span>
            </div>
          </div>
          {/* Close */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: '14px', right: '14px',
              width: '26px', height: '26px', borderRadius: '50%',
              border: `1px solid ${T.border}`, background: T.surface,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: T.text2,
            }}
          >
            <X size={12} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: '8px 12px', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                color: activeTab === t.key ? '#2563EB' : T.text2,
                background: 'none', border: 'none',
                borderBottomWidth: '2px', borderBottomStyle: 'solid',
                borderBottomColor: activeTab === t.key ? '#2563EB' : 'transparent',
                transition: 'color 120ms, border-color 120ms',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'profile' && (
          <>
            {/* Identity */}
            <div className="jus-section-border" style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
              <div className="jus-section-label" style={mkSectionLabel(isDark)}>IDENTITY</div>
              <div className="jus-field-row" style={mkFieldRow(isDark)}>
                <span className="jus-field-key" style={mkFieldKey(isDark)}>Email / Login</span>
                <span className="jus-field-val" style={{ ...mkFieldVal(isDark), ...monoSmall }}>{(!user.email || user.email.includes('@jira.placeholder')) ? '—' : user.email}</span>
              </div>
              <div className="jus-field-row" style={mkFieldRow(isDark)}>
                <span className="jus-field-key" style={mkFieldKey(isDark)}>Jira Account ID</span>
                <span className="jus-field-val" style={{ ...mkFieldVal(isDark), ...monoSmall }}>
                  {user.jira_account_id
                    ? (user.jira_account_id.length > 24 ? user.jira_account_id.slice(0, 24) + '…' : user.jira_account_id)
                    : <i style={{ color: T.text3, fontWeight: 400 }}>N/A — local user</i>
                  }
                </span>
              </div>
              <div className="jus-field-row" style={mkFieldRow(isDark)}>
                <span className="jus-field-key" style={mkFieldKey(isDark)}>Resource Role</span>
                <span className="jus-field-val" style={mkFieldVal(isDark)}>{user.resource_role_id || '—'}</span>
              </div>
              <div className="jus-field-row" style={mkFieldRow(isDark)}>
                <span className="jus-field-key" style={mkFieldKey(isDark)}>Last Synced</span>
                <span className="jus-field-val" style={mkFieldVal(isDark)}>
                  {user.last_synced_at ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#16A34A', display: 'inline-block' }} />
                      {formatDate(user.last_synced_at)}
                    </span>
                  ) : (
                    <i style={{ color: T.text3, fontWeight: 400 }}>Not synced</i>
                  )}
                </span>
              </div>
              <div className="jus-field-row" style={mkFieldRow(isDark)}>
                <span className="jus-field-key" style={mkFieldKey(isDark)}>Last Login</span>
                <span className="jus-field-val" style={mkFieldVal(isDark)}>{formatDate(user.last_catalyst_login_at)}</span>
              </div>
              <div className="jus-field-row" style={{ ...mkFieldRow(isDark), borderBottom: 'none' }}>
                <span className="jus-field-key" style={mkFieldKey(isDark)}>Status</span>
                <span style={{
                  display: 'inline-block', padding: '0 7px', borderRadius: '4px',
                  fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                  height: '20px', lineHeight: '20px',
                  background: isInactive ? (isDark ? '#450A0A' : '#FEE2E2') : (isDark ? '#064E3B' : '#E3FCEF'),
                  color: isInactive ? (isDark ? '#FCA5A5' : '#991B1B') : (isDark ? '#6EE7B7' : '#006644'),
                }}>
                  {isInactive ? 'INACTIVE' : 'ACTIVE'}
                </span>
              </div>
            </div>

            {/* Password & Auth */}
            <div className="jus-section-border" style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
              <div className="jus-section-label" style={mkSectionLabel(isDark)}>PASSWORD & AUTH</div>
              <div className="jus-pwd-box" style={{
                background: T.sunken, borderRadius: '4px', padding: '7px 10px',
                display: 'flex', gap: '8px', alignItems: 'center', marginTop: '5px',
              }}>
                <span style={{
                  flex: 1, fontFamily: showPwd ? "'JetBrains Mono', monospace" : 'inherit',
                  fontSize: showPwd ? '11px' : '14px', letterSpacing: showPwd ? '0' : '3px',
                  color: T.text1,
                }}>
                  {showPwd ? 'bcrypt-hashed · not retrievable' : '● ● ● ● ● ● ● ●'}
                </span>
                {isJiraProxy ? (
                  <span style={{
                    padding: '1px 5px', borderRadius: '4px', fontSize: '9.5px', fontWeight: 700,
                    background: isDark ? 'rgba(13,148,136,0.15)' : '#F0FDFA',
                    color: isDark ? '#5EEAD4' : '#0D9488',
                    border: `1px solid ${isDark ? 'rgba(13,148,136,0.25)' : '#99F6E4'}`,
                    whiteSpace: 'nowrap',
                  }}>
                    Jira Proxy
                  </span>
                ) : (
                  <span style={{
                    padding: '1px 5px', borderRadius: '4px', fontSize: '9.5px', fontWeight: 700,
                    background: isDark ? 'rgba(124,58,237,0.15)' : '#F5F3FF',
                    color: isDark ? '#C4B5FD' : '#7C3AED',
                    border: `1px solid rgba(124,58,237,0.25)`,
                    whiteSpace: 'nowrap',
                  }}>
                    Catalyst Auth
                  </span>
                )}
                <button
                  onClick={() => setShowPwd(p => !p)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '11px', fontWeight: 600, color: '#2563EB', whiteSpace: 'nowrap',
                  }}
                >
                  {showPwd ? 'Hide' : 'Show'}
                </button>
              </div>
              {/* Info box */}
              <div className="jus-info-box" style={{
                marginTop: '7px', padding: '9px 11px', borderRadius: '6px',
                display: 'flex', gap: '8px', alignItems: 'flex-start',
                background: isJiraProxy
                  ? (isDark ? 'rgba(13,148,136,0.10)' : '#F0FDFA')
                  : (isDark ? 'rgba(124,58,237,0.10)' : '#F5F3FF'),
                border: isJiraProxy
                  ? `1px solid ${isDark ? 'rgba(13,148,136,0.20)' : '#99F6E4'}`
                  : `1px solid rgba(124,58,237,0.25)`,
              }}>
                {isJiraProxy
                  ? <ShieldCheck size={13} style={{ color: '#0D9488', flexShrink: 0, marginTop: 1 }} />
                  : <Share2 size={13} style={{ color: '#7C3AED', flexShrink: 0, marginTop: 1 }} />
                }
                <span style={{
                  fontSize: '11px', lineHeight: 1.55,
                  color: isJiraProxy
                    ? (isDark ? '#5EEAD4' : '#134E4A')
                    : (isDark ? '#C4B5FD' : '#7C3AED'),
                }}>
                  {isJiraProxy
                    ? 'Jira password used as-is in Catalyst. No password is stored here. Changing the password in Jira takes effect on the next Catalyst login.'
                    : 'Catalyst-only account. Password managed in Catalyst (bcrypt). Never pushed to Jira. Not part of bidirectional sync.'
                  }
                </span>
              </div>
            </div>

            {/* Account Actions */}
            <div style={{ padding: '12px 16px' }}>
              <div className="jus-section-label" style={mkSectionLabel(isDark)}>ACCOUNT ACTIONS</div>
              <div style={{ display: 'flex', gap: '7px', marginTop: '4px', flexWrap: 'wrap' }}>
                <button
                  onClick={handleToggle}
                  disabled={toggling}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 500,
                    border: `1px solid ${isInactive ? '#16A34A' : '#DC2626'}`,
                    color: isInactive ? '#16A34A' : '#DC2626',
                    background: T.surface, cursor: toggling ? 'not-allowed' : 'pointer',
                  }}
                >
                  {toggling ? <Loader2 size={10} className="animate-spin" /> : <UserX size={10} />}
                  {isInactive ? 'Reactivate' : 'Make Inactive'}
                </button>
                <button
                  className="jus-action-btn"
                  onClick={() => toast.info('Select target users in the table first')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 500,
                    border: `1px solid ${T.border}`, color: T.text1,
                    background: T.surface, cursor: 'pointer',
                  }}
                >
                  <Copy size={10} /> Copy Permissions
                </button>
                {!isCatalystOnly && (
                  <button
                    className="jus-action-btn"
                    onClick={() => toast.info('Re-sync triggered for this user')}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 500,
                      border: `1px solid ${T.border}`, color: T.text1,
                      background: T.surface, cursor: 'pointer',
                    }}
                  >
                    <RefreshCw size={10} /> Force Re-sync
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'projects' && (
          <ProjectsTab perms={perms} isDark={isDark} />
        )}

        {activeTab === 'activity' && (
          <ActivityTab events={events} isDark={isDark} />
        )}

        {activeTab === 'info' && (
          <div style={{ padding: '12px 16px' }}>
            <div style={mkSectionLabel(isDark)}>FUNCTIONAL · TECHNICAL · WIRING · BISYNC</div>

            {/* 2×2 Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              {/* Functional */}
              <InfoCard isDark={isDark} label="Functional">
                {isJiraProxy
                  ? 'User authenticates with their Jira password via live proxy. The exact same credentials used in Jira log them into Catalyst. No separate password is needed.'
                  : 'User exists only in Catalyst. Authentication uses a Catalyst-managed password (bcrypt). This account is permanently excluded from all Jira sync operations.'}
              </InfoCard>

              {/* Technical */}
              <InfoCard isDark={isDark} label="Technical">
                {isJiraProxy ? (
                  <>Login calls Edge Function <Code isDark={isDark}>jira-auth-proxy</Code> which validates against Jira REST API <Code isDark={isDark}>/rest/auth/1/session</Code>. On success, a Supabase session is issued. Credentials are never logged or stored.</>
                ) : (
                  <>Created via <Code isDark={isDark}>supabase.auth.admin.createUser()</Code>. Record stored in <Code isDark={isDark}>jira_identity_map</Code> with <Code isDark={isDark}>catalyst_only=true</Code>. Auth handled entirely by Supabase Auth (bcrypt).</>
                )}
              </InfoCard>

              {/* Wiring */}
              <InfoCard isDark={isDark} label="Wiring">
                {isJiraProxy ? (
                  <>Tables: <Code isDark={isDark}>jira_identity_map</Code> → <Code isDark={isDark}>auth.users</Code>. Sessions cached in <Code isDark={isDark}>jira_auth_sessions</Code> (TTL 8h). Projects in <Code isDark={isDark}>jira_user_project_perms</Code>. Events in <Code isDark={isDark}>jira_sync_user_events</Code>.</>
                ) : (
                  <>Tables: <Code isDark={isDark}>jira_identity_map</Code> (catalyst_only=true) → <Code isDark={isDark}>auth.users</Code>. Projects in <Code isDark={isDark}>jira_user_project_perms</Code>. No sync tables involved.</>
                )}
              </InfoCard>

              {/* BiSync */}
              <InfoCard isDark={isDark} label="BiSync">
                {isJiraProxy ? (
                  <>Full bidirectional. Jira → Catalyst: scheduled every 6h via pg_cron + real-time webhooks. Catalyst → Jira: role changes call <Code isDark={isDark}>jira-write-back</Code> Edge Function to update Jira group membership.</>
                ) : (
                  <><strong style={{ color: '#7C3AED' }}>Excluded from sync.</strong> The <Code isDark={isDark}>catalyst_only=true</Code> flag permanently blocks this user from all bidirectional sync operations. Jira will never receive any data about this user.</>
                )}
              </InfoCard>
            </div>

            {/* Single-row detail cards */}
            <InfoCard isDark={isDark} label="Schema Tables">
              <Code isDark={isDark}>jira_identity_map</Code> · <Code isDark={isDark}>jira_user_project_perms</Code> · <Code isDark={isDark}>jira_sync_runs</Code> · <Code isDark={isDark}>jira_sync_user_events</Code> · <Code isDark={isDark}>jira_auth_sessions</Code> · <Code isDark={isDark}>jira_webhook_events</Code>
            </InfoCard>
            <div style={{ height: '8px' }} />
            <InfoCard isDark={isDark} label="Edge Functions">
              <Code isDark={isDark}>jira-auth-proxy</Code> · <Code isDark={isDark}>jira-user-sync</Code> · <Code isDark={isDark}>jira-webhook-receiver</Code> · <Code isDark={isDark}>jira-write-back</Code> · <Code isDark={isDark}>jira-session-revoke</Code>
            </InfoCard>
            <div style={{ height: '8px' }} />
            <InfoCard isDark={isDark} label="Scheduled Jobs">
              <Code isDark={isDark}>jira-user-sync-6h</Code> — runs every 6 hours (bidirectional sync) · <Code isDark={isDark}>jira-auth-session-cleanup</Code> — daily 02:00 AST (TTL session purge)
            </InfoCard>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="jus-footer-sticky" style={{
        position: 'sticky', bottom: 0, background: T.surface,
        borderTop: `1px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.06)'}`, padding: '10px 16px',
        display: 'flex', gap: '7px',
      }}>
        <button style={{
          flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: '#2563EB', color: '#FFFFFF', border: 'none',
          padding: '7px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
          cursor: 'pointer',
        }}>
          Save All Changes
        </button>
        <button
          className="jus-footer-btn-outline"
          onClick={handleToggle}
          disabled={toggling}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            padding: '7px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
            border: '1px solid #DC2626', color: '#DC2626', background: T.surface,
            cursor: toggling ? 'not-allowed' : 'pointer',
          }}
        >
          Revoke Access
        </button>
      </div>
    </div>
  );
};

export default UserDetailPanel;
