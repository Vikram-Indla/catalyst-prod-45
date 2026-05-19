import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import Button from '@atlaskit/button/new';
import Heading from '@atlaskit/heading';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';
import Textfield from '@atlaskit/textfield';
import Select from '@atlaskit/select';
import { token } from '@atlaskit/tokens';
import PersonAddIcon from '@atlaskit/icon/core/person-add';
import EditIcon from '@atlaskit/icon/core/edit';
import CloseIcon from '@atlaskit/icon/core/close';
import DeleteIcon from '@atlaskit/icon/core/delete';
import { AdminGuard } from '@/components/admin/AdminGuard';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import { supabase } from '@/integrations/supabase/client';
import { useInviteUser } from '@/hooks/useInviteUser';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CatalystUser {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string | null;
  created_at: string | null;
  module_access: Record<string, boolean> | null;
  approval_status: string | null;
}

interface PendingInvite {
  id: string;
  email: string;
  role: string | null;
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

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_OPTIONS = [
  { label: 'Admin', value: 'admin' },
  { label: 'Program Manager', value: 'program_manager' },
  { label: 'Team Lead', value: 'team_lead' },
  { label: 'User', value: 'user' },
];

const FILTER_ROLE_OPTIONS = [
  { label: 'All roles', value: '' },
  { label: 'Super Admin', value: 'super_admin' },
  ...ROLE_OPTIONS,
];

const ROLE_APPEARANCE: Record<string, 'default' | 'success' | 'inprogress' | 'moved' | 'removed' | 'new'> = {
  admin: 'new',
  super_admin: 'removed',
  program_manager: 'inprogress',
  team_lead: 'moved',
  user: 'default',
};

// home + project_hub are always-on defaults
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
  MODULE_ITEMS.map(m => [m.key, !!m.default])
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function moduleCount(moduleAccess: Record<string, boolean> | null): number {
  if (!moduleAccess) return 0;
  return MODULE_ITEMS.filter(m => moduleAccess[m.key] === true).length;
}

// ─── InviteUserModal ──────────────────────────────────────────────────────────

function InviteUserModal({ onClose }: { onClose: () => void }) {
  const { inviteUser, isLoading } = useInviteUser();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<{ label: string; value: string } | null>(
    { label: 'User', value: 'user' }
  );
  const [moduleAccess, setModuleAccess] = useState<Record<string, boolean>>(DEFAULT_MODULE_ACCESS);

  const toggleModule = (key: string) => setModuleAccess(prev => ({ ...prev, [key]: !prev[key] }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey, true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey, true);
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
          maxHeight: 'calc(100vh - 80px)', overflow: 'hidden',
        }}
      >
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${token('color.border', '#EBECF0')}` }}>
          <h2 id="invite-user-modal-title" style={{ margin: 0, fontSize: 20, fontWeight: 500, color: token('color.text', 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))') }}>
            Invite User
          </h2>
        </div>
        <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
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
              styles={{ menuPortal: (base) => ({ ...base, zIndex: 10001 }) }}
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
                    fontSize: 13, color: token('color.text', 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))'),
                    cursor: m.default ? 'default' : 'pointer',
                    opacity: m.default ? 0.65 : 1,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!moduleAccess[m.key]}
                    disabled={!!m.default}
                    onChange={() => !m.default && toggleModule(m.key)}
                    style={{ accentColor: token('color.background.brand.bold', 'var(--cp-primary-60, #0052CC)'), cursor: m.default ? 'default' : 'pointer' }}
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

// ─── UserEditPanel ────────────────────────────────────────────────────────────

interface UserEditPanelProps {
  user: CatalystUser;
  currentUserId: string;
  onClose: () => void;
  onSaved: () => void;
}

function UserEditPanel({ user, currentUserId, onClose, onSaved }: UserEditPanelProps) {
  const qc = useQueryClient();
  const [roleOpt, setRoleOpt] = useState<{ label: string; value: string } | null>(null);
  const [moduleAccess, setModuleAccess] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [deletePhase, setDeletePhase] = useState<'idle' | 'confirm'>('idle');
  const [deleting, setDeleting] = useState(false);

  // Password change state
  const [pwOpen, setPwOpen] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  // Reset / suspend state
  const [resetSending, setResetSending] = useState(false);
  const [suspending, setSuspending] = useState(false);
  const [localApprovalStatus, setLocalApprovalStatus] = useState<string | null>(null);

  // Sync state when user changes
  useEffect(() => {
    const found = ROLE_OPTIONS.find(r => r.value === user.role);
    setRoleOpt(found || { label: (user.role || 'user').replace(/_/g, ' '), value: user.role || 'user' });
    const access: Record<string, boolean> = {};
    MODULE_ITEMS.forEach(m => { access[m.key] = user.module_access?.[m.key] === true || !!m.default; });
    setModuleAccess(access);
    setDeletePhase('idle');
    setPwOpen(false);
    setNewPw('');
    setConfirmPw('');
    setLocalApprovalStatus(user.approval_status ?? null);
  }, [user.id]);

  // Esc closes panel (unless in delete confirm or pw form)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pwOpen) { setPwOpen(false); e.stopPropagation(); }
        else if (deletePhase === 'confirm') { setDeletePhase('idle'); e.stopPropagation(); }
        else { onClose(); }
      }
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [onClose, deletePhase, pwOpen]);

  const isSelf = user.id === currentUserId;
  const isSuperAdmin = user.role === 'super_admin';
  const canDelete = !isSelf && !isSuperAdmin;
  const canModify = !isSelf && !isSuperAdmin;
  const isActive = !localApprovalStatus || localApprovalStatus === 'APPROVED';
  const busyAny = saving || deleting || pwSaving || resetSending || suspending;

  const toggleModule = (key: string) => {
    const item = MODULE_ITEMS.find(m => m.key === key);
    if (item?.default || saving) return;
    setModuleAccess(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await supabase.functions.invoke('user-update', {
        body: { user_id: user.id, role: roleOpt?.value, module_access: moduleAccess },
      });
      if (res.error) throw new Error(res.error.message);
      const data = res.data as { ok: boolean; error?: string };
      if (!data?.ok) throw new Error(data?.error || 'Update failed');
      toast.success('User updated successfully');
      qc.invalidateQueries({ queryKey: ['admin-access-people'] });
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPw || newPw !== confirmPw) { toast.error('Passwords do not match'); return; }
    if (newPw.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setPwSaving(true);
    try {
      const res = await supabase.functions.invoke('admin-set-password', {
        body: { userId: user.id, newPassword: newPw },
      });
      if (res.error) throw new Error(res.error.message);
      const data = res.data as { ok: boolean; error?: string };
      if (!data?.ok) throw new Error(data?.error || 'Failed to set password');
      toast.success('Password changed successfully');
      setPwOpen(false); setNewPw(''); setConfirmPw('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to change password');
    } finally {
      setPwSaving(false);
    }
  };

  const handleResetPassword = async () => {
    setResetSending(true);
    try {
      const res = await supabase.functions.invoke('reset-user-password', {
        body: { userId: user.id },
      });
      if (res.error) throw new Error(res.error.message);
      const data = res.data as { ok: boolean; email?: string; error?: string; message_id?: string; email_log_id?: string };
      if (!data?.ok) throw new Error(data?.error || 'Failed to send reset email');
      const recipient = data.email || user.email;
      const ref = data.message_id ? ` (ref: ${data.message_id.slice(0, 8)})` : '';
      toast.success(`Password reset email sent to ${recipient}${ref}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send reset email');
    } finally {
      setResetSending(false);
    }
  };

  const handleToggleSuspend = async () => {
    const newStatus = isActive ? 'SUSPENDED' : 'APPROVED';
    setSuspending(true);
    try {
      const res = await supabase.functions.invoke('user-update', {
        body: { user_id: user.id, approval_status: newStatus },
      });
      if (res.error) throw new Error(res.error.message);
      const data = res.data as { ok: boolean; error?: string };
      if (!data?.ok) throw new Error(data?.error || 'Failed to update account status');
      setLocalApprovalStatus(newStatus);
      toast.success(newStatus === 'SUSPENDED' ? 'Account suspended' : 'Account reactivated');
      qc.invalidateQueries({ queryKey: ['admin-access-people'] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update account status');
    } finally {
      setSuspending(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await supabase.functions.invoke('user-delete', {
        body: { user_id: user.id },
      });
      if (res.error) throw new Error(res.error.message);
      const data = res.data as { ok: boolean; error?: string };
      if (!data?.ok) throw new Error(data?.error || 'Delete failed');
      toast.success(`${user.full_name || user.email} has been removed`);
      qc.invalidateQueries({ queryKey: ['admin-access-people'] });
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
      setDeleting(false);
    }
  };

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 9990, background: 'rgba(9, 30, 66, 0.32)' }}
      />
      {/* Slide-over panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Edit user ${user.full_name || user.email}`}
        style={{
          position: 'fixed', right: 0, top: 0, height: '100vh',
          width: 500, maxWidth: '100vw', zIndex: 9991,
          background: 'var(--ds-surface, #fff)',
          boxShadow: '-4px 0 24px rgba(9,30,66,0.18)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--ds-border, #EBECF0)',
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          <CatalystAvatar
            name={user.full_name || user.email || '?'}
            src={user.avatar_url}
            size="large"
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.full_name || user.email}
            </div>
            {user.full_name && (
              <div style={{ fontSize: 12, color: 'var(--ds-text-subtle, var(--cp-text-secondary, #6B778C))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close panel"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 4, color: 'var(--ds-text-subtle, var(--cp-text-secondary, #6B778C))', display: 'flex', alignItems: 'center' }}
          >
            <CloseIcon label="Close" size="small" />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

          {/* Role */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-text-subtle, var(--cp-text-secondary, #6B778C))', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
              Role
            </div>
            {isSuperAdmin ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Lozenge appearance="removed">Super Admin</Lozenge>
                <span style={{ fontSize: 12, color: 'var(--ds-text-subtle, var(--cp-text-secondary, #6B778C))' }}>Cannot be changed here</span>
              </div>
            ) : (
              <Select
                options={ROLE_OPTIONS}
                value={roleOpt}
                onChange={opt => setRoleOpt(opt as { label: string; value: string } | null)}
                menuPortalTarget={document.body}
                isDisabled={saving}
                styles={{ menuPortal: (base) => ({ ...base, zIndex: 10000 }) }}
              />
            )}
          </div>

          {/* Module access */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-text-subtle, var(--cp-text-secondary, #6B778C))', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
              Module Access
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
              {MODULE_ITEMS.map(m => (
                <label
                  key={m.key}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    fontSize: 13, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))',
                    cursor: (m.default || saving) ? 'default' : 'pointer',
                    opacity: m.default ? 0.65 : 1, userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={moduleAccess[m.key] === true}
                    disabled={!!m.default || saving}
                    onChange={() => toggleModule(m.key)}
                    style={{ width: 16, height: 16, accentColor: 'var(--ds-background-brand-bold, var(--cp-primary-60, #0052CC))', cursor: (m.default || saving) ? 'default' : 'pointer' }}
                  />
                  {m.label}
                  {m.default && <span style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #97A0AF)' }}>(default)</span>}
                </label>
              ))}
            </div>
          </div>

          {/* Account Info */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-text-subtle, var(--cp-text-secondary, #6B778C))', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
              Account Info
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', rowGap: 8, columnGap: 16, fontSize: 13, alignItems: 'center' }}>
              <span style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, #6B778C))', fontWeight: 500 }}>Status</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {isActive
                  ? <Lozenge appearance="success">Active</Lozenge>
                  : <Lozenge appearance="removed">Suspended</Lozenge>}
                {isSelf && <span style={{ fontSize: 11, color: 'var(--ds-text-subtle, var(--cp-text-secondary, #6B778C))' }}>This is you</span>}
                {canModify && (
                  <button
                    onClick={handleToggleSuspend}
                    disabled={busyAny}
                    style={{
                      background: 'none',
                      border: `1px solid ${isActive ? 'var(--ds-border-danger, #FF8F73)' : 'var(--ds-border, #EBECF0)'}`,
                      borderRadius: 3, cursor: busyAny ? 'not-allowed' : 'pointer',
                      fontSize: 11, fontWeight: 500,
                      color: isActive ? 'var(--ds-text-danger, #AE2A19)' : 'var(--ds-text-subtle, var(--cp-text-secondary, #6B778C))',
                      padding: '2px 8px', opacity: busyAny ? 0.5 : 1,
                    }}
                  >
                    {suspending ? '…' : isActive ? 'Suspend' : 'Reactivate'}
                  </button>
                )}
              </span>
              <span style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, #6B778C))', fontWeight: 500 }}>Joined</span>
              <span style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>
                {user.created_at
                  ? new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                  : '—'}
              </span>
              <span style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, #6B778C))', fontWeight: 500 }}>Active modules</span>
              <span style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>
                {Object.values(moduleAccess).filter(Boolean).length} / {MODULE_ITEMS.length}
              </span>
            </div>
          </div>

          {/* Security — only for non-self, non-super_admin */}
          {canModify && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-text-subtle, var(--cp-text-secondary, #6B778C))', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
                Security
              </div>

              {/* Send password reset email */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Password reset email</div>
                  <div style={{ fontSize: 12, color: 'var(--ds-text-subtle, var(--cp-text-secondary, #6B778C))' }}>Send a reset link to {user.email}</div>
                </div>
                <Button
                  appearance="default"
                  isLoading={resetSending}
                  isDisabled={busyAny && !resetSending}
                  onClick={handleResetPassword}
                >
                  Send reset
                </Button>
              </div>

              {/* Change password inline form */}
              <div style={{ borderTop: '1px solid var(--ds-border-subtle, var(--cp-bg-sunken, #F4F5F7))', paddingTop: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: pwOpen ? 12 : 0 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Set new password</div>
                    <div style={{ fontSize: 12, color: 'var(--ds-text-subtle, var(--cp-text-secondary, #6B778C))' }}>Override password without email</div>
                  </div>
                  <Button
                    appearance="subtle"
                    isDisabled={busyAny && !pwOpen}
                    onClick={() => { setPwOpen(v => !v); setNewPw(''); setConfirmPw(''); }}
                  >
                    {pwOpen ? 'Cancel' : 'Change password'}
                  </Button>
                </div>

                {pwOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle, var(--cp-text-secondary, #6B778C))', marginBottom: 4 }}>
                        New password
                      </label>
                      <div style={{ position: 'relative' }}>
                        <Textfield
                          type={showPw ? 'text' : 'password'}
                          value={newPw}
                          onChange={e => setNewPw((e.target as HTMLInputElement).value)}
                          placeholder="Min 8 characters"
                          isDisabled={pwSaving}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw(v => !v)}
                          style={{
                            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: 11, color: 'var(--ds-text-subtle, var(--cp-text-secondary, #6B778C))', padding: 0,
                          }}
                        >
                          {showPw ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle, var(--cp-text-secondary, #6B778C))', marginBottom: 4 }}>
                        Confirm password
                      </label>
                      <Textfield
                        type={showPw ? 'text' : 'password'}
                        value={confirmPw}
                        onChange={e => setConfirmPw((e.target as HTMLInputElement).value)}
                        placeholder="Re-enter password"
                        isDisabled={pwSaving}
                        isInvalid={confirmPw.length > 0 && newPw !== confirmPw}
                      />
                      {confirmPw.length > 0 && newPw !== confirmPw && (
                        <div style={{ fontSize: 11, color: 'var(--ds-text-danger, #AE2A19)', marginTop: 3 }}>
                          Passwords do not match
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        appearance="primary"
                        isLoading={pwSaving}
                        isDisabled={!newPw || newPw !== confirmPw || newPw.length < 8 || pwSaving}
                        onClick={handleChangePassword}
                      >
                        Set password
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--ds-border, #EBECF0)', flexShrink: 0 }}>
          {/* Inline delete confirm */}
          {deletePhase === 'confirm' && (
            <div style={{
              background: 'var(--ds-background-danger, #FFEDEB)',
              border: '1px solid var(--ds-border-danger, #FF8F73)',
              borderRadius: 4, padding: '10px 14px', marginBottom: 12,
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text-danger, #AE2A19)', marginBottom: 4 }}>
                Delete {user.full_name || user.email}?
              </div>
              <div style={{ fontSize: 12, color: 'var(--ds-text-danger, #AE2A19)', marginBottom: 10 }}>
                This permanently removes their account. This cannot be undone.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button appearance="danger" isLoading={deleting} isDisabled={deleting} onClick={handleDelete}>
                  Yes, delete user
                </Button>
                <Button appearance="subtle" onClick={() => setDeletePhase('idle')} isDisabled={deleting}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {canDelete ? (
              <button
                onClick={() => setDeletePhase('confirm')}
                disabled={busyAny}
                style={{
                  background: 'none', border: 'none',
                  cursor: busyAny ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 13, color: 'var(--ds-text-danger, #AE2A19)',
                  padding: '4px 8px', borderRadius: 4,
                  opacity: busyAny ? 0.5 : 1,
                }}
              >
                <DeleteIcon label="" size="small" />
                Delete user
              </button>
            ) : (
              <div />
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <Button appearance="subtle" onClick={onClose} isDisabled={busyAny}>Cancel</Button>
              <Button
                appearance="primary"
                isLoading={saving}
                isDisabled={busyAny || isSuperAdmin}
                onClick={handleSave}
              >
                Save changes
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

// ─── PeopleTab ────────────────────────────────────────────────────────────────

/**
 * PeopleTableSkeleton — loading placeholder that mirrors the 7-column
 * People table shape. Replaces the bare centred Spinner (design-critique
 * 2026-05-18 H1 P2). Each row renders an avatar bubble + bar shimmers
 * sized to the real cells so the layout stays stable across the
 * loading → loaded transition.
 */
function PeopleTableSkeleton() {
  const SHIMMER: React.CSSProperties = {
    background: 'linear-gradient(90deg, var(--ds-skeleton, #F1F2F4) 0%, var(--ds-skeleton-subtle, #E9EBEE) 50%, var(--ds-skeleton, #F1F2F4) 100%)',
    backgroundSize: '200% 100%',
    animation: 'cp-skeleton-shimmer 1.4s ease-in-out infinite',
    borderRadius: 3,
  };
  const COLS = 7; // mirrors the People table header: Name, Email, Role, Modules, Status, Joined, actions
  return (
    <>
      <style>{`@keyframes cp-skeleton-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }} data-testid="people-skeleton" data-columns={COLS}>
        <tbody>
          {Array.from({ length: 8 }).map((_, rowIdx) => (
            <tr key={rowIdx} style={{ borderBottom: '1px solid var(--ds-border-subtle, #F4F5F7)' }}>
              <td style={{ padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ ...SHIMMER, width: 24, height: 24, borderRadius: '50%' }} />
                  <div style={{ ...SHIMMER, width: 120, height: 12 }} />
                </div>
              </td>
              <td style={{ padding: '10px 12px' }}><div style={{ ...SHIMMER, width: 160, height: 12 }} /></td>
              <td style={{ padding: '10px 12px' }}><div style={{ ...SHIMMER, width: 80, height: 18, borderRadius: 3 }} /></td>
              <td style={{ padding: '10px 12px', textAlign: 'center' }}><div style={{ ...SHIMMER, width: 36, height: 18, borderRadius: 9, margin: '0 auto' }} /></td>
              <td style={{ padding: '10px 12px' }}><div style={{ ...SHIMMER, width: 60, height: 18, borderRadius: 3 }} /></td>
              <td style={{ padding: '10px 12px' }}><div style={{ ...SHIMMER, width: 72, height: 12 }} /></td>
              <td style={{ padding: '10px 4px' }}><div style={{ ...SHIMMER, width: 16, height: 16, borderRadius: 3, margin: '0 auto' }} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function PeopleTab() {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<{ label: string; value: string } | null>(
    { label: 'All roles', value: '' }
  );
  const [editUser, setEditUser] = useState<CatalystUser | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const { data: users = [], isLoading } = useQuery<CatalystUser[]>({
    queryKey: ['admin-access-people'],
    queryFn: async () => {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email, avatar_url, created_at, module_access, approval_status').order('full_name'),
        supabase.from('user_roles').select('user_id, role'),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      const roleMap: Record<string, string> = {};
      (rolesRes.data || []).forEach(r => { roleMap[r.user_id] = r.role; });
      return (profilesRes.data || []).map(p => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        avatar_url: p.avatar_url ?? null,
        role: roleMap[p.id] || null,
        created_at: p.created_at,
        module_access: (p.module_access as Record<string, boolean> | null) ?? null,
        approval_status: p.approval_status,
      }));
    },
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    let result = users;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(u =>
        (u.full_name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
      );
    }
    if (roleFilter?.value) {
      result = result.filter(u => u.role === roleFilter.value);
    }
    return result;
  }, [users, search, roleFilter]);

  return (
    <div style={{ paddingTop: 16 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 220px', maxWidth: 340 }}>
          <Textfield
            value={search}
            onChange={e => setSearch((e.target as HTMLInputElement).value)}
            placeholder="Search by name or email…"
            aria-label="Search users"
          />
        </div>
        <div style={{ width: 180 }}>
          <Select
            options={FILTER_ROLE_OPTIONS}
            value={roleFilter}
            onChange={opt => setRoleFilter(opt as { label: string; value: string } | null)}
            placeholder="Filter by role"
            aria-label="Filter by role"
            menuPortalTarget={document.body}
          />
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <Button appearance="primary" iconBefore={PersonAddIcon} onClick={() => setInviteOpen(true)}>
            Invite User
          </Button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <PeopleTableSkeleton />
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--ds-border, #EBECF0)' }}>
              {[
                { label: 'Name' },
                { label: 'Email' },
                { label: 'Role', width: 150 },
                { label: 'Modules', width: 90 },
                { label: 'Status', width: 100 },
                { label: 'Joined', width: 100 },
                { label: '', width: 44 },
              ].map((h, i) => (
                <th key={i} style={{
                  textAlign: 'left', padding: '8px 12px',
                  fontWeight: 600, color: 'var(--ds-text-subtle, var(--cp-text-secondary, #6B778C))',
                  fontSize: 12, width: h.width,
                }}>
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--ds-text-subtle)' }}>
                  {search || roleFilter?.value ? 'No users match your filters' : 'No users found'}
                </td>
              </tr>
            ) : filtered.map(u => {
              const isActiveRow = !u.approval_status || u.approval_status === 'APPROVED';
              const modCount = moduleCount(u.module_access);
              return (
                <tr
                  key={u.id}
                  onClick={() => setEditUser(u)}
                  style={{ borderBottom: '1px solid var(--ds-border-subtle, var(--cp-bg-sunken, #F4F5F7))', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-background-neutral-subtle-hovered, var(--cp-bg-sunken, #F4F5F7))')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CatalystAvatar
                        name={u.full_name || u.email || '?'}
                        src={u.avatar_url}
                        size="small"
                      />
                      {u.full_name || '—'}
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--ds-text-subtle)' }}>{u.email || '—'}</td>
                  <td style={{ padding: '10px 12px' }}>
                    {u.role ? (
                      <Lozenge appearance={ROLE_APPEARANCE[u.role] || 'default'}>
                        {u.role.replace(/_/g, ' ')}
                      </Lozenge>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block',
                      background: modCount > 0 ? 'var(--ds-background-neutral, var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6)))' : 'var(--ds-background-neutral-subtle, var(--cp-bg-sunken, #F4F5F7))',
                      color: modCount > 0 ? 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' : 'var(--ds-text-disabled, #A5ADBA)',
                      borderRadius: 10, padding: '1px 8px', fontSize: 12, fontWeight: 500,
                    }}>
                      {modCount}/{MODULE_ITEMS.length}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {isActiveRow
                      ? <Lozenge appearance="success">Active</Lozenge>
                      : <Lozenge appearance="removed">Suspended</Lozenge>}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--ds-text-subtle)', fontSize: 12 }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '10px 4px' }} onClick={e => { e.stopPropagation(); setEditUser(u); }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ds-text-subtle, var(--cp-text-secondary, #6B778C))' }}>
                      <EditIcon label="Edit user" size="small" />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Row count */}
      {!isLoading && filtered.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--ds-text-subtle, var(--cp-text-secondary, #6B778C))', textAlign: 'right' }}>
          {filtered.length === users.length
            ? `${users.length} user${users.length !== 1 ? 's' : ''}`
            : `${filtered.length} of ${users.length} users`}
        </div>
      )}

      {editUser && currentUser && (
        <UserEditPanel
          user={editUser}
          currentUserId={currentUser.id}
          onClose={() => setEditUser(null)}
          onSaved={() => setEditUser(null)}
        />
      )}
      {inviteOpen && <InviteUserModal onClose={() => setInviteOpen(false)} />}
    </div>
  );
}

// ─── InvitationsTab ───────────────────────────────────────────────────────────

function InvitationsTab() {
  const qc = useQueryClient();
  const [actionLoading, setActionLoading] = useState<Record<string, 'resend' | 'revoke' | null>>({});

  const { data: invites = [], isLoading } = useQuery<PendingInvite[]>({
    queryKey: ['admin-access-invitations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_invitations')
        .select('id, email, role, invited_by, created_at, expires_at, accepted_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });

  const handleResend = async (inv: PendingInvite) => {
    setActionLoading(prev => ({ ...prev, [inv.id]: 'resend' }));
    try {
      const res = await supabase.functions.invoke('user-invite-send', {
        body: {
          email: inv.email,
          role: inv.role || 'user',
          module_access: DEFAULT_MODULE_ACCESS,
        },
      });
      if (res.error) throw new Error(res.error.message);
      const data = res.data as { ok: boolean; error?: string };
      if (!data?.ok) throw new Error(data?.error || 'Resend failed');
      toast.success(`Invitation resent to ${inv.email}`);
      qc.invalidateQueries({ queryKey: ['admin-access-invitations'] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to resend invitation');
    } finally {
      setActionLoading(prev => ({ ...prev, [inv.id]: null }));
    }
  };

  const handleRevoke = async (inv: PendingInvite) => {
    setActionLoading(prev => ({ ...prev, [inv.id]: 'revoke' }));
    try {
      const { error } = await supabase.from('user_invitations').delete().eq('id', inv.id);
      if (error) throw error;
      toast.success(`Invitation for ${inv.email} revoked`);
      qc.invalidateQueries({ queryKey: ['admin-access-invitations'] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to revoke invitation');
    } finally {
      setActionLoading(prev => ({ ...prev, [inv.id]: null }));
    }
  };

  return (
    <div style={{ paddingTop: 16 }}>
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--ds-border, #EBECF0)' }}>
              {['Email', 'Sent', 'Expires', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: 'var(--ds-text-subtle, var(--cp-text-secondary, #6B778C))', fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invites.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--ds-text-subtle)' }}>No invitations yet. Use "Invite User" in the People tab to send one.</td></tr>
            ) : invites.map(inv => {
              const expired = new Date(inv.expires_at) < new Date() && !inv.accepted_at;
              const isPending = !inv.accepted_at && !expired;
              const loading = actionLoading[inv.id];
              return (
                <tr key={inv.id} style={{ borderBottom: '1px solid var(--ds-border-subtle, var(--cp-bg-sunken, #F4F5F7))' }}>
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
                  <td style={{ padding: '10px 12px' }}>
                    {inv.accepted_at ? (
                      <span style={{ fontSize: 12, color: 'var(--ds-text-disabled, #A5ADBA)' }}>—</span>
                    ) : (
                      <div style={{ display: 'flex', gap: 6 }}>
                        {(isPending || expired) && (
                          <button
                            onClick={() => handleResend(inv)}
                            disabled={!!loading}
                            style={{
                              background: 'none', border: '1px solid var(--ds-border, #EBECF0)',
                              borderRadius: 3, padding: '3px 8px', fontSize: 12, fontWeight: 500,
                              color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))',
                              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1,
                            }}
                          >
                            {loading === 'resend' ? '…' : 'Resend'}
                          </button>
                        )}
                        {isPending && (
                          <button
                            onClick={() => handleRevoke(inv)}
                            disabled={!!loading}
                            style={{
                              background: 'none', border: '1px solid var(--ds-border-danger, #FF8F73)',
                              borderRadius: 3, padding: '3px 8px', fontSize: 12, fontWeight: 500,
                              color: 'var(--ds-text-danger, #AE2A19)',
                              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1,
                            }}
                          >
                            {loading === 'revoke' ? '…' : 'Revoke'}
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
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
              <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: 'var(--ds-text-subtle, var(--cp-text-secondary, #6B778C))', fontSize: 12 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr><td colSpan={4} style={{ padding: 32, textAlign: 'center', color: 'var(--ds-text-subtle)' }}>No emails sent yet</td></tr>
          ) : logs.map(log => (
            <tr key={log.id} style={{ borderBottom: '1px solid var(--ds-border-subtle, var(--cp-bg-sunken, #F4F5F7))' }}>
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
          <Heading size="large">Access Management</Heading>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--ds-text-subtle, var(--cp-text-secondary, #6B778C))' }}>
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
