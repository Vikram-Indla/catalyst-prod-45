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
}

const sectionLabel: React.CSSProperties = {
  fontSize: '10px', fontWeight: 700, color: '#64748B',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px',
};

const fieldRow: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '5px 0', borderBottom: '0.5px solid rgba(15,23,42,0.06)',
};

const fieldKey: React.CSSProperties = { fontSize: '11px', color: '#64748B' };
const fieldVal: React.CSSProperties = { fontSize: '12px', fontWeight: 500, color: '#0F172A', textAlign: 'right' as const };
const monoSmall: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' };
const Code: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <code style={{
    fontFamily: "'JetBrains Mono', monospace", fontSize: '10px',
    background: '#F1F5F9', padding: '1px 4px', borderRadius: '2px', color: '#2563EB',
  }}>{children}</code>
);

const InfoCard: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{
    background: '#F8FAFC', border: '1px solid rgba(15,23,42,0.10)',
    borderRadius: '5px', padding: '10px 12px',
  }}>
    <div style={{
      fontSize: '9.5px', fontWeight: 700, color: '#64748B',
      textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '5px',
    }}>
      {label}
    </div>
    <div style={{ fontSize: '11px', color: '#334155', lineHeight: 1.55 }}>{children}</div>
  </div>
);

const UserDetailPanel: React.FC<Props> = ({ userId, onClose }) => {
  const { data, isLoading } = useJiraUserDetail(userId);
  const { mutate: toggleStatus, isPending: toggling } = useToggleUserStatus();
  const [activeTab, setActiveTab] = useState<TabKey>('profile');
  const [showPwd, setShowPwd] = useState(false);

  const user = data?.data;

  if (isLoading || !user) {
    return (
      <div style={{
        width: '420px', flexShrink: 0, borderLeft: '1px solid rgba(15,23,42,0.10)',
        background: '#FFFFFF', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '20px' }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse" style={{
              height: i === 0 ? 48 : 14, width: i === 0 ? 48 : `${70 + (i * 10)}%`,
              borderRadius: i === 0 ? '50%' : 3, background: '#E2E8F0',
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
      width: '420px', flexShrink: 0, borderLeft: '1px solid rgba(15,23,42,0.10)',
      background: '#FFFFFF', display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* ── Header ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 5, background: '#FFFFFF', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
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
            <div style={{ fontFamily: "'Sora', sans-serif", fontSize: '15px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.2px' }}>
              {user.display_name}
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
              {user.resource_role_id || 'No role assigned'}
            </div>
            <div style={{ display: 'flex', gap: '5px', marginTop: '7px' }}>
              {/* Auth badge */}
              {isJiraProxy ? (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '3px',
                  padding: '1px 6px', borderRadius: '3px', fontSize: '10px', fontWeight: 700,
                  letterSpacing: '0.03em', textTransform: 'uppercase',
                  background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE',
                }}>
                  Jira Proxy
                </span>
              ) : (
                <span style={{
                  padding: '1px 6px', borderRadius: '3px', fontSize: '10px', fontWeight: 700,
                  letterSpacing: '0.03em', textTransform: 'uppercase',
                  background: '#F5F3FF', color: '#7C3AED', border: '1px solid rgba(124,58,237,0.25)',
                }}>
                  Local Auth
                </span>
              )}
              {/* Status lozenge */}
              <span style={{
                display: 'inline-block', padding: '0 7px', borderRadius: '3px',
                fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                height: '20px', lineHeight: '20px',
                background: isInactive ? '#FEE2E2' : '#E3FCEF',
                color: isInactive ? '#991B1B' : '#006644',
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
              border: '1px solid rgba(15,23,42,0.10)', background: '#FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#64748B',
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
                color: activeTab === t.key ? '#2563EB' : '#64748B',
                borderBottom: activeTab === t.key ? '2px solid #2563EB' : '2px solid transparent',
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
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
              <div style={sectionLabel}>IDENTITY</div>
              <div style={fieldRow}>
                <span style={fieldKey}>Email / Login</span>
                <span style={{ ...fieldVal, ...monoSmall }}>{user.email}</span>
              </div>
              <div style={fieldRow}>
                <span style={fieldKey}>Jira Account ID</span>
                <span style={{ ...fieldVal, ...monoSmall }}>
                  {user.jira_account_id
                    ? (user.jira_account_id.length > 24 ? user.jira_account_id.slice(0, 24) + '…' : user.jira_account_id)
                    : <i style={{ color: '#94A3B8', fontWeight: 400 }}>N/A — local user</i>
                  }
                </span>
              </div>
              <div style={fieldRow}>
                <span style={fieldKey}>Resource Role</span>
                <span style={fieldVal}>{user.resource_role_id || '—'}</span>
              </div>
              <div style={fieldRow}>
                <span style={fieldKey}>Last Synced</span>
                <span style={fieldVal}>
                  {user.last_synced_at ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#16A34A', display: 'inline-block' }} />
                      {formatDate(user.last_synced_at)}
                    </span>
                  ) : (
                    <i style={{ color: '#94A3B8', fontWeight: 400 }}>Not synced</i>
                  )}
                </span>
              </div>
              <div style={fieldRow}>
                <span style={fieldKey}>Last Login</span>
                <span style={fieldVal}>{formatDate(user.last_catalyst_login_at)}</span>
              </div>
              <div style={{ ...fieldRow, borderBottom: 'none' }}>
                <span style={fieldKey}>Status</span>
                <span style={{
                  display: 'inline-block', padding: '0 7px', borderRadius: '3px',
                  fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                  height: '20px', lineHeight: '20px',
                  background: isInactive ? '#FEE2E2' : '#E3FCEF',
                  color: isInactive ? '#991B1B' : '#006644',
                }}>
                  {isInactive ? 'INACTIVE' : 'ACTIVE'}
                </span>
              </div>
            </div>

            {/* Password & Auth */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
              <div style={sectionLabel}>PASSWORD & AUTH</div>
              <div style={{
                background: '#F1F5F9', borderRadius: '4px', padding: '7px 10px',
                display: 'flex', gap: '8px', alignItems: 'center', marginTop: '5px',
              }}>
                <span style={{
                  flex: 1, fontFamily: showPwd ? "'JetBrains Mono', monospace" : 'inherit',
                  fontSize: showPwd ? '11px' : '14px', letterSpacing: showPwd ? '0' : '3px',
                  color: '#334155',
                }}>
                  {showPwd ? 'bcrypt-hashed · not retrievable' : '● ● ● ● ● ● ● ●'}
                </span>
                {isJiraProxy ? (
                  <span style={{
                    padding: '1px 5px', borderRadius: '3px', fontSize: '9.5px', fontWeight: 700,
                    background: '#F0FDFA', color: '#0D9488', border: '1px solid #99F6E4',
                    whiteSpace: 'nowrap',
                  }}>
                    Jira Proxy
                  </span>
                ) : (
                  <span style={{
                    padding: '1px 5px', borderRadius: '3px', fontSize: '9.5px', fontWeight: 700,
                    background: '#F5F3FF', color: '#7C3AED', border: '1px solid rgba(124,58,237,0.25)',
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
              <div style={{
                marginTop: '7px', padding: '9px 11px', borderRadius: '5px',
                display: 'flex', gap: '8px', alignItems: 'flex-start',
                background: isJiraProxy ? '#F0FDFA' : '#F5F3FF',
                border: isJiraProxy ? '1px solid #99F6E4' : '1px solid rgba(124,58,237,0.25)',
              }}>
                {isJiraProxy
                  ? <ShieldCheck size={13} style={{ color: '#0D9488', flexShrink: 0, marginTop: 1 }} />
                  : <Share2 size={13} style={{ color: '#7C3AED', flexShrink: 0, marginTop: 1 }} />
                }
                <span style={{
                  fontSize: '11px', lineHeight: 1.55,
                  color: isJiraProxy ? '#134E4A' : '#7C3AED',
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
              <div style={sectionLabel}>ACCOUNT ACTIONS</div>
              <div style={{ display: 'flex', gap: '7px', marginTop: '4px', flexWrap: 'wrap' }}>
                <button
                  onClick={handleToggle}
                  disabled={toggling}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 500,
                    border: `1px solid ${isInactive ? '#16A34A' : '#DC2626'}`,
                    color: isInactive ? '#16A34A' : '#DC2626',
                    background: '#FFFFFF', cursor: toggling ? 'not-allowed' : 'pointer',
                  }}
                >
                  {toggling ? <Loader2 size={10} className="animate-spin" /> : <UserX size={10} />}
                  {isInactive ? 'Reactivate' : 'Make Inactive'}
                </button>
                <button
                  onClick={() => toast.info('Select target users in the table first')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 500,
                    border: '1px solid rgba(15,23,42,0.10)', color: '#334155',
                    background: '#FFFFFF', cursor: 'pointer',
                  }}
                >
                  <Copy size={10} /> Copy Permissions
                </button>
                {!isCatalystOnly && (
                  <button
                    onClick={() => toast.info('Re-sync triggered for this user')}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 500,
                      border: '1px solid rgba(15,23,42,0.10)', color: '#334155',
                      background: '#FFFFFF', cursor: 'pointer',
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
          <ProjectsTab perms={perms} />
        )}

        {activeTab === 'activity' && (
          <ActivityTab events={events} />
        )}

        {activeTab === 'info' && (
          <div style={{ padding: '12px 16px' }}>
            <div style={sectionLabel}>FUNCTIONAL · TECHNICAL · WIRING · BISYNC</div>

            {/* 2×2 Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              {/* Functional */}
              <InfoCard label="Functional">
                {isJiraProxy
                  ? 'User authenticates with their Jira password via live proxy. The exact same credentials used in Jira log them into Catalyst. No separate password is needed.'
                  : 'User exists only in Catalyst. Authentication uses a Catalyst-managed password (bcrypt). This account is permanently excluded from all Jira sync operations.'}
              </InfoCard>

              {/* Technical */}
              <InfoCard label="Technical">
                {isJiraProxy ? (
                  <>Login calls Edge Function <Code>jira-auth-proxy</Code> which validates against Jira REST API <Code>/rest/auth/1/session</Code>. On success, a Supabase session is issued. Credentials are never logged or stored.</>
                ) : (
                  <>Created via <Code>supabase.auth.admin.createUser()</Code>. Record stored in <Code>jira_identity_map</Code> with <Code>catalyst_only=true</Code>. Auth handled entirely by Supabase Auth (bcrypt).</>
                )}
              </InfoCard>

              {/* Wiring */}
              <InfoCard label="Wiring">
                {isJiraProxy ? (
                  <>Tables: <Code>jira_identity_map</Code> → <Code>auth.users</Code>. Sessions cached in <Code>jira_auth_sessions</Code> (TTL 8h). Projects in <Code>jira_user_project_perms</Code>. Events in <Code>jira_sync_user_events</Code>.</>
                ) : (
                  <>Tables: <Code>jira_identity_map</Code> (catalyst_only=true) → <Code>auth.users</Code>. Projects in <Code>jira_user_project_perms</Code>. No sync tables involved.</>
                )}
              </InfoCard>

              {/* BiSync */}
              <InfoCard label="BiSync">
                {isJiraProxy ? (
                  <>Full bidirectional. Jira → Catalyst: scheduled every 6h via pg_cron + real-time webhooks. Catalyst → Jira: role changes call <Code>jira-write-back</Code> Edge Function to update Jira group membership.</>
                ) : (
                  <><strong style={{ color: '#7C3AED' }}>Excluded from sync.</strong> The <Code>catalyst_only=true</Code> flag permanently blocks this user from all bidirectional sync operations. Jira will never receive any data about this user.</>
                )}
              </InfoCard>
            </div>

            {/* Single-row detail cards */}
            <InfoCard label="Schema Tables">
              <Code>jira_identity_map</Code> · <Code>jira_user_project_perms</Code> · <Code>jira_sync_runs</Code> · <Code>jira_sync_user_events</Code> · <Code>jira_auth_sessions</Code> · <Code>jira_webhook_events</Code>
            </InfoCard>
            <div style={{ height: '8px' }} />
            <InfoCard label="Edge Functions">
              <Code>jira-auth-proxy</Code> · <Code>jira-user-sync</Code> · <Code>jira-webhook-receiver</Code> · <Code>jira-write-back</Code> · <Code>jira-session-revoke</Code>
            </InfoCard>
            <div style={{ height: '8px' }} />
            <InfoCard label="Scheduled Jobs">
              <Code>jira-user-sync-6h</Code> — runs every 6 hours (bidirectional sync) · <Code>jira-auth-session-cleanup</Code> — daily 02:00 AST (TTL session purge)
            </InfoCard>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{
        position: 'sticky', bottom: 0, background: '#FFFFFF',
        borderTop: '1px solid rgba(15,23,42,0.06)', padding: '10px 16px',
        display: 'flex', gap: '7px',
      }}>
        <button style={{
          flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: '#2563EB', color: '#FFFFFF', border: 'none',
          padding: '7px 12px', borderRadius: '5px', fontSize: '12px', fontWeight: 600,
          cursor: 'pointer',
        }}>
          Save All Changes
        </button>
        <button
          onClick={handleToggle}
          disabled={toggling}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            padding: '7px 12px', borderRadius: '5px', fontSize: '12px', fontWeight: 500,
            border: '1px solid #DC2626', color: '#DC2626', background: '#FFFFFF',
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
