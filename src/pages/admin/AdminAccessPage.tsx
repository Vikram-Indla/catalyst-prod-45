import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import Button from '@atlaskit/button/new';
import Heading from '@atlaskit/heading';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';
import Modal, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTransition,
} from '@atlaskit/modal-dialog';
import Textfield from '@atlaskit/textfield';
import Select from '@atlaskit/select';
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

  const handleSubmit = async () => {
    if (!email.trim()) return;
    const result = await inviteUser({
      email: email.trim(),
      full_name: fullName.trim() || undefined,
      role: role?.value || 'user',
    });
    if (result.ok) {
      toast.success(`Invitation sent to ${email}`);
      onClose();
    } else {
      toast.error(result.error || 'Failed to send invitation');
    }
  };

  return (
    <Modal onClose={onClose} width="small">
      <ModalHeader>
        <ModalTitle>Invite User</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle)', marginBottom: 4 }}>
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
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle)', marginBottom: 4 }}>
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
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle)', marginBottom: 4 }}>
              Role
            </label>
            <Select
              options={ROLE_OPTIONS}
              value={role}
              onChange={opt => setRole(opt as { label: string; value: string } | null)}
              menuPortalTarget={document.body}
            />
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose}>Cancel</Button>
        <Button
          appearance="primary"
          isLoading={isLoading}
          isDisabled={!email.trim() || isLoading}
          onClick={handleSubmit}
        >
          Send Invitation
        </Button>
      </ModalFooter>
    </Modal>
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

      <ModalTransition>
        {inviteOpen && <InviteUserModal onClose={() => setInviteOpen(false)} />}
      </ModalTransition>
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
