import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import Button from '@atlaskit/button/new';
import Heading from '@atlaskit/heading';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';
import Textfield from '@atlaskit/textfield';
import Select from '@atlaskit/select';
import { token } from '@atlaskit/tokens';
import PersonAddIcon from '@atlaskit/icon/core/person-add';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { supabase } from '@/integrations/supabase/client';
import { useInviteUser } from '@/hooks/useInviteUser';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CatalystUser {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  created_at: string | null;
}

interface PendingInvite {
  id: string;
  email: string;
  invited_by: string | null;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
}

interface EmailLogEntry {
  id: string;
  to_email: string;
  subject: string;
  status: string;
  created_at: string;
}

const ROLE_OPTIONS = [
  { label: 'Admin', value: 'admin' },
  { label: 'Program Manager', value: 'program_manager' },
  { label: 'Team Lead', value: 'team_lead' },
  { label: 'User', value: 'user' },
];

// Modules available for access selection. home + project_hub are always-on defaults.
const MODULE_ITEMS: { key: string; label: string; default?: true }[] = [
  { key: 'home',         label: 'Home',     default: true },
  { key: 'project_hub',  label: 'Project',  default: true },
  { key: 'strategy_hub', label: 'Strategy' },
  { key: 'product_hub',  label: 'Product' },
  { key: 'release_hub',  label: 'Release' },
  { key: 'test_hub',     label: 'Test' },
  { key: 'incident_hub', label: 'Incident' },
  { key: 'task_hub',     label: 'Task' },
  { key: 'plan_hub',     label: 'Plan' },
  { key: 'wiki_hub',     label: 'Wiki' },
];

const DEFAULT_MODULE_ACCESS: Record<string, boolean> = Object.fromEntries(
  MODULE_ITEMS.map(m => [m.key, !!m.default]),
);

const ROLE_APPEARANCE: Record<string, 'default' | 'success' | 'inprogress' | 'moved' | 'removed' | 'new'> = {
  admin: 'new',
  super_admin: 'removed',
  program_manager: 'inprogress',
  team_lead: 'moved',
  user: 'default',
};

// ─── InviteUserModal ──────────────────────────────────────────────────────────

function InviteUserModal({ onClose }: { onClose: () => void }) {
  const { inviteUser, isLoading } = useInviteUser();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<{ label: string; value: string } | null>(
    { label: 'User', value: 'user' }
  );
  const [moduleAccess, setModuleAccess] = useState<Record<string, boolean>>(DEFAULT_MODULE_ACCESS);

  const toggleModule = (key: string) => {
    setModuleAccess(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Esc-to-close + body scroll lock
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const handleSubmit = async () => {
    if (!email.trim()) return;
    const result = await inviteUser({
      email: email.trim(),
      full_name: fullName.trim() || undefined,
      role: role?.value || 'user',
      module_access: moduleAccess,
    });
    if (result.ok) {
      toast.success(`Invitation sent to ${email}`);
      onClose();
    } else {
      toast.error(result.error || 'Failed to send invitation');
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-user-modal-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(9, 30, 66, 0.54)',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 480, maxWidth: 'calc(100vw - 48px)',
          background: token('elevation.surface.overlay', '#fff'),
          borderRadius: 8,
          boxShadow: token('elevation.shadow.overlay', '0 8px 24px rgba(9,30,66,0.25)'),
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${token('color.border', '#EBECF0')}` }}>
          <h2 id="invite-user-modal-title" style={{ margin: 0, fontSize: 20, fontWeight: 500, color: token('color.text', '#172B4D') }}>
            Invite User
          </h2>
        </div>
        <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: token('color.text.subtle', '#6B778C'), marginBottom: 4 }}>
              Email address *
            </label>
            <Textfield
              value={email}
              onChange={e => setEmail((e.target as HTMLInputElement).value)}
              placeholder="user@example.com"
              aria-label="Email address"
              isRequired
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: token('color.text.subtle', '#6B778C'), marginBottom: 4 }}>
              Full name (optional)
            </label>
            <Textfield
              value={fullName}
              onChange={e => setFullName((e.target as HTMLInputElement).value)}
              placeholder="Jane Doe"
              aria-label="Full name"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: token('color.text.subtle', '#6B778C'), marginBottom: 4 }}>
              Role
            </label>
            <Select
              options={ROLE_OPTIONS}
              value={role}
              onChange={opt => setRole(opt as { label: string; value: string } | null)}
              menuPortalTarget={document.body}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: token('color.text.subtle', '#6B778C'), marginBottom: 8 }}>
              Module access
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
              {MODULE_ITEMS.map(m => (
                <label
                  key={m.key}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    fontSize: 13, color: token('color.text', '#172B4D'),
                    cursor: m.default ? 'default' : 'pointer',
                    opacity: m.default ? 0.65 : 1,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!moduleAccess[m.key]}
                    disabled={!!m.default}
                    onChange={() => !m.default && toggleModule(m.key)}
                    style={{ accentColor: token('color.background.brand.bold', '#0052CC'), cursor: m.default ? 'default' : 'pointer' }}
                  />
                  {m.label}
                  {m.default && <span style={{ fontSize: 11, color: token('color.text.subtlest', '#97A0AF') }}>(default)</span>}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding: '12px 24px', display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: `1px solid ${token('color.border', '#EBECF0')}` }}>
          <Button appearance="subtle" onClick={onClose}>Cancel</Button>
          <Button
            appearance="primary"
            isLoading={isLoading}
            isDisabled={!email.trim() || isLoading}
            onClick={handleSubmit}
          >
            Send Invitation
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── PeopleTab ────────────────────────────────────────────────────────────────

function PeopleTab() {
  const { data: users = [], isLoading } = useQuery<CatalystUser[]>({
    queryKey: ['admin-access-people'],
    queryFn: async () => {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email, created_at').order('full_name'),
        supabase.from('user_roles').select('user_id, role'),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      const roleMap: Record<string, string> = {};
      (rolesRes.data || []).forEach(r => { roleMap[r.user_id] = r.role; });
      return (profilesRes.data || []).map(p => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        role: roleMap[p.id] || null,
        created_at: p.created_at,
      }));
    },
    staleTime: 60_000,
  });

  if (isLoading) return <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}><Spinner /></div>;

  return (
    <div style={{ paddingTop: 16 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--ds-border, #EBECF0)' }}>
            {['Name', 'Email', 'Role', 'Joined'].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: 'var(--ds-text-subtle, #6B778C)', fontSize: 12 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr><td colSpan={4} style={{ padding: 32, textAlign: 'center', color: 'var(--ds-text-subtle)' }}>No users found</td></tr>
          ) : users.map(u => (
            <tr key={u.id} style={{ borderBottom: '1px solid var(--ds-border-subtle, #F4F5F7)' }}>
              <td style={{ padding: '10px 12px', fontWeight: 500 }}>{u.full_name || '—'}</td>
              <td style={{ padding: '10px 12px', color: 'var(--ds-text-subtle)' }}>{u.email || '—'}</td>
              <td style={{ padding: '10px 12px' }}>
                {u.role ? (
                  <Lozenge appearance={ROLE_APPEARANCE[u.role] || 'default'}>{u.role.replace('_', ' ')}</Lozenge>
                ) : '—'}
              </td>
              <td style={{ padding: '10px 12px', color: 'var(--ds-text-subtle)', fontSize: 12 }}>
                {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── InvitationsTab ───────────────────────────────────────────────────────────

function InvitationsTab() {
  const [inviteOpen, setInviteOpen] = useState(false);

  const { data: invites = [], isLoading } = useQuery<PendingInvite[]>({
    queryKey: ['admin-access-invitations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_invitations')
        .select('id, email, invited_by, created_at, expires_at, accepted_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });

  return (
    <div style={{ paddingTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button
          appearance="primary"
          iconBefore={PersonAddIcon}
          onClick={() => setInviteOpen(true)}
        >
          Invite User
        </Button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--ds-border, #EBECF0)' }}>
              {['Email', 'Sent', 'Expires', 'Status'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: 'var(--ds-text-subtle, #6B778C)', fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invites.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: 32, textAlign: 'center', color: 'var(--ds-text-subtle)' }}>No invitations yet</td></tr>
            ) : invites.map(inv => {
              const expired = new Date(inv.expires_at) < new Date() && !inv.accepted_at;
              return (
                <tr key={inv.id} style={{ borderBottom: '1px solid var(--ds-border-subtle, #F4F5F7)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>{inv.email}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--ds-text-subtle)', fontSize: 12 }}>{new Date(inv.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--ds-text-subtle)', fontSize: 12 }}>{new Date(inv.expires_at).toLocaleDateString()}</td>
                  <td style={{ padding: '10px 12px' }}>
                    {inv.accepted_at ? (
                      <Lozenge appearance="success">Accepted</Lozenge>
                    ) : expired ? (
                      <Lozenge appearance="removed">Expired</Lozenge>
                    ) : (
                      <Lozenge appearance="inprogress">Pending</Lozenge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {inviteOpen && <InviteUserModal onClose={() => setInviteOpen(false)} />}
    </div>
  );
}

// ─── EmailLogTab ──────────────────────────────────────────────────────────────

function EmailLogTab() {
  const { data: logs = [], isLoading } = useQuery<EmailLogEntry[]>({
    queryKey: ['admin-access-email-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_log')
        .select('id, to_email, subject, status, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
  });

  if (isLoading) return <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}><Spinner /></div>;

  return (
    <div style={{ paddingTop: 16 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--ds-border, #EBECF0)' }}>
            {['To', 'Subject', 'Status', 'Sent'].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: 'var(--ds-text-subtle, #6B778C)', fontSize: 12 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr><td colSpan={4} style={{ padding: 32, textAlign: 'center', color: 'var(--ds-text-subtle)' }}>No emails sent yet</td></tr>
          ) : logs.map(log => (
            <tr key={log.id} style={{ borderBottom: '1px solid var(--ds-border-subtle, #F4F5F7)' }}>
              <td style={{ padding: '10px 12px' }}>{log.to_email}</td>
              <td style={{ padding: '10px 12px', color: 'var(--ds-text-subtle)' }}>{log.subject}</td>
              <td style={{ padding: '10px 12px' }}>
                <Lozenge appearance={log.status === 'sent' ? 'success' : log.status === 'failed' ? 'removed' : 'default'}>
                  {log.status}
                </Lozenge>
              </td>
              <td style={{ padding: '10px 12px', color: 'var(--ds-text-subtle)', fontSize: 12 }}>
                {new Date(log.created_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── AdminAccessPage ──────────────────────────────────────────────────────────

export default function AdminAccessPage() {
  return (
    <AdminGuard>
      <div style={{ padding: '24px 32px', maxWidth: 1100 }}>
        <div style={{ marginBottom: 24 }}>
          <Heading size="xlarge">User Access</Heading>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--ds-text-subtle, #6B778C)' }}>
            Manage Catalyst user accounts, send invitations, and review email activity.
          </p>
        </div>
        <Tabs id="admin-access-tabs">
          <TabList>
            <Tab>People</Tab>
            <Tab>Invitations</Tab>
            <Tab>Email Log</Tab>
          </TabList>
          <TabPanel><PeopleTab /></TabPanel>
          <TabPanel><InvitationsTab /></TabPanel>
          <TabPanel><EmailLogTab /></TabPanel>
        </Tabs>
      </div>
    </AdminGuard>
  );
}
