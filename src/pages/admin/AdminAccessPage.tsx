import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import Button from '@atlaskit/button/new';
import Heading from '@atlaskit/heading';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';
import Textfield from '@atlaskit/textfield';
import Select from '@atlaskit/select';
import { portalSelectStyles } from '@/lib/select-portal-styles';
import { Checkbox } from '@atlaskit/checkbox';
import EmptyState from '@atlaskit/empty-state';
import Modal, { ModalTransition } from '@atlaskit/modal-dialog';
import { token } from '@atlaskit/tokens';
import PersonAddIcon from '@atlaskit/icon/core/person-add';
import EditIcon from '@atlaskit/icon/core/edit';
import CloseIcon from '@atlaskit/icon/core/close';
import { AdminGuard } from '@/components/admin/AdminGuard';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import { supabase } from '@/integrations/supabase/client';
import { useApprovedProfiles } from '@/hooks/useApprovedProfiles';
import { useResourceAvatarOverrides } from '@/hooks/useResourceAvatarOverrides';
import { uploadResourceAvatar, removeResourceAvatar } from '@/services/resourceAvatarService';
import { useInviteUser } from '@/hooks/useInviteUser';
import { useAuth } from '@/lib/auth';
import { catalystToast } from '@/lib/catalystToast';
import { HUB_ICON_REGISTRY, type HubKey } from '@/components/icons';

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
  last_login_at: string | null;
  department_name?: string | null;
  failed_login_count?: number | null;
  locked_until?: string | null;
  must_change_password?: boolean | null;
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

// Grouped role options for @atlaskit/select (supports optgroups natively)
const ROLE_GROUPS = [
  { label: 'Admin',      options: [{ label: 'Admin', value: 'admin' }] },
  { label: 'Product',    options: [{ label: 'Product Owner', value: 'product_owner' }, { label: 'Product Manager', value: 'product_manager' }, { label: 'Business Owner', value: 'business_owner' }] },
  { label: 'Delivery',   options: [{ label: 'Project Manager', value: 'project_manager' }, { label: 'Project Coordinator', value: 'project_coordinator' }, { label: 'Release Manager', value: 'release_manager' }, { label: 'Architect', value: 'architect' }, { label: 'Developer', value: 'developer' }, { label: 'QA Tester', value: 'qa_tester' }] },
  { label: 'Operations', options: [{ label: 'Operations Engineer', value: 'operations_engineer' }, { label: 'Technical Support', value: 'technical_support' }, { label: 'Support', value: 'support' }] },
  { label: 'Governance', options: [{ label: 'Governance', value: 'governance' }, { label: 'PMO', value: 'pmo' }] },
  { label: 'Guest',      options: [{ label: 'Guest (read-only · 48 h max)', value: 'guest' }] },
];

// Flat list for filter dropdowns and lookup
const ROLE_OPTIONS = ROLE_GROUPS.flatMap(g => g.options);

const FILTER_ROLE_OPTIONS = [{ label: 'All roles', value: '' }, ...ROLE_OPTIONS];

const STATUS_FILTER_OPTIONS = [
  { label: 'All approved', value: 'all_approved' },
  { label: 'Active', value: 'active' },
  { label: 'Pending setup', value: 'pending' },
  { label: 'Suspended', value: 'suspended' },
  { label: 'All users', value: '' },
];

const ROLE_APPEARANCE: Record<string, 'default' | 'success' | 'inprogress' | 'moved' | 'removed' | 'new'> = {
  admin: 'new', super_admin: 'removed',
  product_owner: 'inprogress', product_manager: 'inprogress', business_owner: 'inprogress',
  project_manager: 'moved', project_coordinator: 'moved', release_manager: 'moved', architect: 'moved',
  developer: 'success', qa_tester: 'success',
  operations_engineer: 'default', technical_support: 'default', support: 'default',
  governance: 'new', pmo: 'new',
  guest: 'default',
  // legacy (not shown in UI, may exist in old rows)
  program_manager: 'inprogress', team_lead: 'moved', user: 'default',
};

// Default module access per role — auto-suggested when a role is selected in the drawer
const ROLE_DEFAULT_MODULES: Record<string, string[]> = {
  admin:                ['home','project_hub','product_hub','strategy_hub','release_hub','test_hub','incident_hub','task_hub','plan_hub','wiki_hub'],
  product_owner:        ['home','project_hub','product_hub','strategy_hub'],
  product_manager:      ['home','project_hub','product_hub','strategy_hub'],
  business_owner:       ['home','project_hub','product_hub','strategy_hub'],
  project_manager:      ['home','project_hub','release_hub','task_hub'],
  project_coordinator:  ['home','project_hub','task_hub'],
  release_manager:      ['home','project_hub','release_hub'],
  architect:            ['home','project_hub','product_hub','strategy_hub'],
  developer:            ['home','project_hub','task_hub'],
  qa_tester:            ['home','project_hub','test_hub'],
  operations_engineer:  ['home','incident_hub','task_hub'],
  technical_support:    ['home','incident_hub','task_hub'],
  support:              ['home','project_hub'],
  governance:           ['home','project_hub','product_hub','strategy_hub'],
  pmo:                  ['home','project_hub','product_hub','strategy_hub','release_hub'],
  guest:                ['home','project_hub'],
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

function enabledModuleKeys(moduleAccess: Record<string, boolean> | null): string[] {
  if (!moduleAccess) return [];
  return MODULE_ITEMS.filter(m => moduleAccess[m.key] === true).map(m => m.key);
}

// AdminAccessPage module keys (home, project_hub, …) → HUB_ICON_REGISTRY keys.
function hubKeyFor(moduleKey: string): HubKey {
  return (moduleKey === 'home' ? 'home' : moduleKey.replace('_hub', '')) as HubKey;
}

function userSource(email: string | null): 'catalyst' | 'jira' {
  return (email || '').includes('+jira@catalyst.internal') ? 'jira' : 'catalyst';
}

// Honest lifecycle state. Jira-synced rows that never logged in are "Synced",
// not "Active" — they are resource records, not access-holders.
type UserState = 'active' | 'pending' | 'suspended' | 'deactivated' | 'locked';

// Status rendered via @atlaskit/lozenge — appearance maps to ADS status tokens
// (no hardcoded hex). Matches the Invitations tab's lozenges for consistency.
type LozengeAppearance = 'default' | 'success' | 'inprogress' | 'moved' | 'removed' | 'new';
const STATE_META: Record<UserState, { label: string; appearance: LozengeAppearance }> = {
  active:      { label: 'Active',        appearance: 'success' },
  pending:     { label: 'Pending setup', appearance: 'inprogress' },
  suspended:   { label: 'Suspended',     appearance: 'removed' },
  deactivated: { label: 'Deactivated',   appearance: 'default' },
  locked:      { label: 'Locked',        appearance: 'removed' },
};

function userState(u: Pick<CatalystUser, 'email' | 'approval_status' | 'last_login_at' | 'locked_until'>): UserState {
  if (u.approval_status === 'PENDING_APPROVAL') return 'pending';
  if (u.approval_status === 'REJECTED') return 'suspended';
  if (u.approval_status === 'DISABLED') return 'suspended';
  // Account locked out from too many failed password attempts.
  if (u.locked_until && new Date(u.locked_until) > new Date()) return 'locked';
  // Honest: a user who has never logged in is still "Pending setup", not Active.
  return u.last_login_at ? 'active' : 'pending';
}

function StatusPill({ state }: { state: UserState }) {
  const m = STATE_META[state];
  return <Lozenge appearance={m.appearance}>{m.label}</Lozenge>;
}

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return '—';
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

// ─── CreateAccessInline ───────────────────────────────────────────────────────
// Inline create-access surface rendered directly on the People tab (no drawer).
// WhatsApp is the primary channel. Guest TTL hard-capped to 48 h server-side.

const SAFE_KEYS = ['home', 'project_hub', 'product_hub'];
const GUEST_MAX_TTL = 172800; // 48 h in seconds

// ─── Channel glyphs (real brand/line SVGs — never emoji) ──────────────────────
// Official WhatsApp brand mark (simple-icons path), brand green #25D366.
function WhatsAppGlyph({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={{ display: 'block' }}>
      <path fill="#25D366" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/> // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
    </svg>
  );
}

function EmailGlyph({ size = 22, color }: { size?: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ display: 'block' }}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function SmsGlyph({ size = 22, color }: { size?: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ display: 'block' }}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
    </svg>
  );
}

function LinkGlyph({ size = 22, color }: { size?: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ display: 'block' }}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

interface ChannelDef { value: 'whatsapp' | 'email' | 'sms' | 'manual'; label: string; sub: string; render: (color: string) => React.ReactNode }
// Manual first (default), WhatsApp last — per Vikram 2026-06-20.
const CHANNEL_DEFS: ChannelDef[] = [
  { value: 'manual',   label: 'Manual',   sub: 'Copy link',  render: (c) => <LinkGlyph color={c} /> },
  { value: 'email',    label: 'Email',    sub: 'Send email', render: (c) => <EmailGlyph color={c} /> },
  { value: 'sms',      label: 'SMS',      sub: 'Fallback',   render: (c) => <SmsGlyph color={c} /> },
  { value: 'whatsapp', label: 'WhatsApp', sub: 'Business',   render: () => <WhatsAppGlyph /> },
];

interface TtlDef { value: number; label: string; sub: string }
const TTL_DEFS: TtlDef[] = [
  { value: 300,    label: '5 min',  sub: 'Quick' },
  { value: 900,    label: '15 min', sub: '' },
  { value: 3600,   label: '1 hour', sub: 'Default' },
  { value: 28800,  label: '8 hours',sub: '' },
  { value: 86400,  label: '1 day',  sub: 'Max (non-guest)' },
  { value: 172800, label: '2 days', sub: 'Max (guest only)' },
];

interface LinkResult { link: string; expiresAt?: string; invitationId?: string; channelPending?: boolean; channel: string }

// ─── Module multi-select options (real hub-switcher icons) ────────────────────
// Each option renders the SAME asset the HubSwitcher renders (HUB_ICON_REGISTRY).
interface ModuleOption { label: string; value: string; isFixed?: boolean }
const MODULE_SELECT_OPTIONS: ModuleOption[] = MODULE_ITEMS.map(m => ({
  label: m.label, value: m.key, isFixed: m.key === 'home',
}));

function renderModuleOption(o: ModuleOption) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <img src={HUB_ICON_REGISTRY[hubKeyFor(o.value)]} alt="" width={18} height={18} style={{ display: 'block', flexShrink: 0 }} />
      {o.label}
    </span>
  );
}

function CreateAccessInline({ onClose, onCreated }: { onClose: () => void; onCreated?: () => void }) {
  const { inviteUser, expireInvitation, isLoading } = useInviteUser();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [roleOpt, setRoleOpt] = useState<{ label: string; value: string } | null>(null);
  const [deptId, setDeptId] = useState<string | null>(null);
  const [moduleAccess, setModuleAccess] = useState<Record<string, boolean>>(DEFAULT_MODULE_ACCESS);
  const [channel, setChannel] = useState<'whatsapp' | 'email' | 'sms' | 'manual'>('manual');
  const [ttl, setTtl] = useState(3600);
  const [result, setResult] = useState<LinkResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [pendingConflict, setPendingConflict] = useState(false);

  // Fetch departments for the chip row
  const { data: departments = [] } = useQuery({
    queryKey: ['capacity_departments_list'],
    queryFn: async () => {
      const { data } = await supabase.from('capacity_departments').select('id, name').order('name');
      return (data || []) as { id: string; name: string }[];
    },
  });

  // When role changes, auto-suggest modules
  useEffect(() => {
    const rv = roleOpt?.value || '';
    const suggested = ROLE_DEFAULT_MODULES[rv];
    if (suggested) {
      const next: Record<string, boolean> = {};
      MODULE_ITEMS.forEach(m => { next[m.key] = suggested.includes(m.key); });
      setModuleAccess(next);
    }
  }, [roleOpt?.value]);

  // Guest: clamp TTL to 48h
  const isGuest = roleOpt?.value === 'guest';
  const effectiveTtl = isGuest ? Math.min(ttl, GUEST_MAX_TTL) : ttl;
  const availableTtls = isGuest ? TTL_DEFS : TTL_DEFS.filter(t => t.value <= 86400);

  // Live expiry preview
  const expiryPreview = useMemo(() => {
    const d = new Date(Date.now() + effectiveTtl * 1000);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const isTomorrow = d.toDateString() === new Date(now.getTime() + 86400000).toDateString();
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Expires today at ${timeStr}`;
    if (isTomorrow) return `Expires tomorrow at ${timeStr}`;
    return `Expires ${d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} at ${timeStr}`;
  }, [effectiveTtl]);

  const safeOk = SAFE_KEYS.some(k => moduleAccess[k]);
  const emailOk = /\S+@\S+\.\S+/.test(email.trim());
  const nameOk = !!fullName.trim();
  const roleOk = !!roleOpt?.value;
  // Phone is shown for whatsapp/sms (where it would be used) but is NEVER
  // required — the admin can always generate without it.
  const needsPhone = channel === 'whatsapp' || channel === 'sms';
  const canCreate = nameOk && emailOk && roleOk && safeOk && !isLoading;

  const submit = async (regenerate = false) => {
    if (!canCreate && !regenerate) return;
    const r = await inviteUser({
      email: email.trim(),
      full_name: fullName.trim() || undefined,
      phone: phone.trim() || undefined,
      role: roleOpt?.value || 'developer',
      module_access: moduleAccess,
      delivery_channel: channel,
      ttl_seconds: effectiveTtl,
      purpose: 'invite',
      regenerate,
      department_id: deptId,
    });
    if (r.ok) {
      setPendingConflict(false);
      setResult({ link: r.setup_link || '', expiresAt: r.expires_at, invitationId: r.invitation_id, channelPending: r.channel_pending, channel });
      setCopied(false);
      onCreated?.();
      catalystToast.success(r.dispatched ? `Access created · sent via ${channel}` : 'Access created · copy the link');
    } else if (!regenerate && r.error?.startsWith('A pending link already exists')) {
      setPendingConflict(true);
    } else {
      catalystToast.error(r.error || 'Failed to create access');
    }
  };

  const copyLink = async () => {
    if (!result?.link) return;
    try { await navigator.clipboard.writeText(result.link); setCopied(true); } catch { /* clipboard blocked */ }
  };

  const expireNow = async () => {
    if (!result?.invitationId) return;
    const r = await expireInvitation({ invitation_id: result.invitationId });
    if (r.ok) { catalystToast.success('Link expired'); setResult(prev => prev ? { ...prev, link: '', expiresAt: undefined } : prev); }
    else catalystToast.error(r.error || 'Failed to expire link');
  };

  // ADS field label: sentence-case, 12px/600, subtle token — no all-caps, no tracking.
  const lbl: React.CSSProperties = { display: 'block', fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtle)', marginBottom: 4 };

  const selectStyles = {
    menuPortal: (base: Record<string, unknown>) => ({ ...base, zIndex: 10000 }),
    menu: (base: Record<string, unknown>) => ({ ...base, fontSize: 'var(--ds-font-size-400)' }),
    option: (base: Record<string, unknown>) => ({ ...base, fontSize: 'var(--ds-font-size-400)' }),
    singleValue: (base: Record<string, unknown>) => ({ ...base, fontSize: 'var(--ds-font-size-400)' }),
    input: (base: Record<string, unknown>) => ({ ...base, fontSize: 'var(--ds-font-size-400)' }),
  };
  const deptOptions = [{ label: 'No department', value: '' }, ...departments.map(d => ({ label: d.name, value: d.id }))];
  const ttlOptions = availableTtls.map(t => ({ label: t.sub ? `${t.label} · ${t.sub}` : t.label, value: t.value }));
  const moduleValue = MODULE_SELECT_OPTIONS.filter(o => moduleAccess[o.value]);

  return (
    <ModalTransition>
      <Modal onClose={onClose} width="medium" shouldScrollInViewport autoFocus={false} label="Create access">
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--ds-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 'var(--ds-font-size-500)', fontWeight: 600, color: 'var(--ds-text)', letterSpacing: '-0.01em' }}>
            {result ? 'Setup link ready' : 'Create access'}
          </h2>
          {!result && <p style={{ margin: '0px 0 0', fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest)' }}>Creates the user and a one-time setup link</p>}
        </div>
        <button onClick={onClose} aria-label="Close" style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, borderRadius: 4, color: 'var(--ds-text-subtlest)', display: 'flex' }}>
          <CloseIcon label="Close" size="medium" />
        </button>
      </div>

      {!result ? (
        <>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Identity */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Email address <span style={{ color: 'var(--ds-text-danger)' }}>*</span></label>
                <Textfield value={email} onChange={e => { setEmail((e.target as HTMLInputElement).value); setPendingConflict(false); }} placeholder="name@company.com" aria-label="Email address" isRequired />
              </div>
              <div>
                <label style={lbl}>Full name <span style={{ color: 'var(--ds-text-danger)' }}>*</span></label>
                <Textfield value={fullName} onChange={e => setFullName((e.target as HTMLInputElement).value)} placeholder="Jane Doe" aria-label="Full name" />
              </div>
            </div>

            {/* Role + Department — proper grouped dropdowns (no pills) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Role <span style={{ color: 'var(--ds-text-danger)' }}>*</span></label>
                <Select
                  inputId="ca-role"
                  options={ROLE_GROUPS}
                  value={roleOpt}
                  onChange={opt => setRoleOpt(opt as { label: string; value: string } | null)}
                  menuPortalTarget={document.body}
                  styles={selectStyles}
                  aria-label="Role"
                  placeholder="Select a role…"
                />
              </div>
              <div>
                <label style={lbl}>Department</label>
                <Select
                  inputId="ca-dept"
                  options={deptOptions}
                  value={deptOptions.find(o => o.value === (deptId || ''))}
                  onChange={opt => setDeptId((opt as { value: string } | null)?.value || null)}
                  menuPortalTarget={document.body}
                  styles={selectStyles}
                  aria-label="Department"
                  placeholder="No department"
                />
              </div>
            </div>

            {isGuest && (
              <div style={{ padding: '8px 12px', background: 'var(--ds-background-warning)', borderRadius: 6, fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-warning)' }}>
                Guest access is read-only. Link lifetime is capped at 48 hours.
              </div>
            )}

            {/* Module access — multi-select dropdown with the real hub-switcher icons */}
            <div>
              <label style={lbl}>
                Module access{' '}
                {!safeOk && <span style={{ color: 'var(--ds-text-warning)', fontWeight: 500 }}>· add Home, Project, or Product</span>}
              </label>
              <Select
                inputId="ca-modules"
                isMulti
                isClearable={false}
                backspaceRemovesValue={false}
                options={MODULE_SELECT_OPTIONS}
                value={moduleValue}
                onChange={vals => {
                  const next: Record<string, boolean> = {};
                  MODULE_ITEMS.forEach(m => { next[m.key] = false; });
                  (vals as ModuleOption[] | null || []).forEach(v => { next[v.value] = true; });
                  next.home = true; // Home is always granted — the landing dashboard
                  setModuleAccess(next);
                }}
                formatOptionLabel={renderModuleOption}
                menuPortalTarget={document.body}
                styles={{
                  ...selectStyles,
                  multiValueRemove: (base: Record<string, unknown>, state: { data?: ModuleOption }) =>
                    state.data?.isFixed ? { ...base, display: 'none' } : base,
                }}
                aria-label="Module access"
                placeholder="Select modules…"
              />
            </div>

            {/* Delivery channel — real brand/line icons (WhatsApp is the brand mark) */}
            <div>
              <label style={lbl} id="ca-sendvia-label">Send via</label>
              <div role="radiogroup" aria-labelledby="ca-sendvia-label" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {CHANNEL_DEFS.map(c => {
                  const active = channel === c.value;
                  const iconColor = active ? 'var(--ds-icon-information)' : 'var(--ds-icon-subtle)';
                  return (
                    <button key={c.value} type="button" role="radio" aria-checked={active} aria-label={`${c.label} — ${c.sub}`} onClick={() => setChannel(c.value)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '12px 8px', borderRadius: 8, border: `1px solid ${active ? 'var(--ds-border-selected, var(--ds-link))' : 'var(--ds-border)'}`, background: active ? 'var(--ds-background-selected)' : 'transparent', cursor: 'pointer', transition: 'all 0.1s' }}>
                      <span style={{ display: 'flex' }}>{c.render(iconColor)}</span>
                      <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: active ? 'var(--ds-text-information)' : 'var(--ds-text)' }}>{c.label}</span>
                      <span style={{ fontSize: 'var(--ds-font-size-50)', color: 'var(--ds-text-subtle)' }}>{c.sub}</span>
                    </button>
                  );
                })}
              </div>
              {needsPhone && (
                <div style={{ marginTop: 12 }}>
                  <label style={lbl}>Phone <span style={{ color: 'var(--ds-text-subtlest)' }}>(optional)</span></label>
                  <Textfield value={phone} onChange={e => setPhone((e.target as HTMLInputElement).value)} placeholder="+966 5x xxx xxxx" aria-label="Phone" />
                  <p style={{ margin: '4px 0 0', fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-disabled)' }}>Provider integration pending — the link is recorded and shown below for manual sharing.</p>
                </div>
              )}
            </div>

            {/* Link validity */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'end' }}>
              <div>
                <label style={lbl}>Link validity</label>
                <Select
                  inputId="ca-ttl"
                  options={ttlOptions}
                  value={ttlOptions.find(o => o.value === effectiveTtl)}
                  onChange={opt => setTtl((opt as { value: number } | null)?.value || 3600)}
                  menuPortalTarget={document.body}
                  styles={selectStyles}
                  aria-label="Link validity"
                />
              </div>
              <p style={{ margin: 0, fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)', paddingBottom: 8 }}>{expiryPreview}</p>
            </div>

          </div>

          {/* Pending-link conflict banner — replaces the generic error toast */}
          {pendingConflict && (
            <div style={{ margin: '0 20px 4px', padding: '8px 14px', background: 'var(--ds-background-warning)', border: '1px solid var(--ds-border-warning)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-warning)', lineHeight: 1.4 }}>
                <strong>A pending link already exists for this email.</strong>
                {' '}Replacing it will expire the old link immediately.
              </div>
              <Button appearance="warning" isLoading={isLoading} onClick={() => submit(true)} style={{ flexShrink: 0 }}>
                Replace existing link
              </Button>
            </div>
          )}

          {/* Footer — amber blockHint on the left, actions on the right */}
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--ds-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)', fontWeight: 500 }}>
              {/* Guidance hint — only after the user has started, never on a pristine open (no premature error) */}
              {!pendingConflict && (email || fullName || roleOpt)
                ? (!nameOk ? 'Enter the full name' : (!emailOk ? 'Enter an email' : (!roleOk ? 'Select a role' : (!safeOk ? 'Add a safe-landing module' : ''))))
                : ''}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button appearance="subtle" onClick={onClose}>Cancel</Button>
              {!pendingConflict && (
                <Button appearance="primary" isLoading={isLoading} isDisabled={!canCreate} onClick={() => submit(false)}>Create access</Button>
              )}
            </div>
          </div>
        </>
      ) : (
          /* ─ Link result pane ─ */
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ padding: 12, background: 'var(--ds-background-information)', borderRadius: 8, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 'var(--ds-font-size-800)', flexShrink: 0 }}>✅</span>
                <div>
                  <p style={{ margin: 0, fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: 'var(--ds-text)' }}>Access created for {email}</p>
                  <p style={{ margin: '0px 0 0', fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest)' }}>
                    Role: <strong>{roleOpt?.label}</strong> · Channel: <strong style={{ textTransform: 'capitalize' }}>{result.channel}{result.channelPending ? ' (manual share)' : ''}</strong>
                  </p>
                </div>
              </div>

              <div>
                <label style={lbl}>One-time setup link</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1, padding: '8px 12px', fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 'var(--ds-font-size-100)', background: 'var(--ds-background-neutral)', border: '1px solid var(--ds-border)', borderRadius: 6, color: 'var(--ds-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {result.link || 'Link expired — regenerate below'}
                  </div>
                  <Button appearance="primary" isDisabled={!result.link} onClick={copyLink}>{copied ? '✓ Copied' : 'Copy'}</Button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 24, fontSize: 'var(--ds-font-size-300)' }}>
                <div>
                  <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-disabled)', marginBottom: 0 }}>Expires</div>
                  <div style={{ color: 'var(--ds-text)' }}>{result.expiresAt ? new Date(result.expiresAt).toLocaleString() : '—'}</div>
                </div>
              </div>

              <div style={{ padding: '8px 12px', background: 'var(--ds-background-warning)', borderRadius: 6, fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-warning)', lineHeight: 1.5 }}>
                This link is single-use and expires after one click. If the recipient's contact details were wrong, expire it below and regenerate. Catalyst never stores the raw token.
              </div>
            </div>

            <div style={{ padding: '12px 24px', borderTop: '1px solid var(--ds-border)', display: 'flex', justifyContent: 'space-between', gap: 8, flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button appearance="default" isLoading={isLoading} onClick={() => submit(true)}>Regenerate</Button>
                <Button appearance="subtle" isDisabled={!result.link} onClick={expireNow}>Expire now</Button>
              </div>
              <Button appearance="primary" onClick={onClose}>Done</Button>
            </div>
        </>
      )}
      </Modal>
    </ModalTransition>
  );
}

// ─── UserEditPanel ────────────────────────────────────────────────────────────

interface UserEditPanelProps {
  user: CatalystUser;
  currentUserId: string;
  adminCount: number;
  onClose: () => void;
  onSaved: () => void;
}

function UserEditPanel({ user, currentUserId, adminCount, onClose, onSaved }: UserEditPanelProps) {
  const qc = useQueryClient();
  const [roleOpt, setRoleOpt] = useState<{ label: string; value: string } | null>(null);
  const [moduleAccess, setModuleAccess] = useState<Record<string, boolean>>({});
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletePhase, setDeletePhase] = useState<'idle' | 'confirm'>('idle');
  const [deleting, setDeleting] = useState(false);

  // Password change state
  const [pwOpen, setPwOpen] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);

  // Staged changes — committed only when "Save changes" is clicked
  const [initialRole, setInitialRole] = useState<string | null>(null);
  const [stagedPassword, setStagedPassword] = useState<string | null>(null);

  // Reset / suspend state
  const [resetSending, setResetSending] = useState(false);
  const [localApprovalStatus, setLocalApprovalStatus] = useState<string | null>(null);

  // Generate-setup-link state
  const { inviteUser } = useInviteUser();
  const [genLink, setGenLink] = useState<string | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [genCopied, setGenCopied] = useState(false);

  // Onboarding lifecycle — sent / opened / clicked / lockout evidence.
  const { data: lifecycle } = useQuery({
    queryKey: ['user-onboarding', user.id, user.email],
    enabled: !!user.email,
    staleTime: 30_000,
    queryFn: async () => {
      const [invRes, logRes] = await Promise.all([
        supabase.from('user_invitations').select('created_at, accepted_at, status, expires_at, delivery_channel').eq('email', user.email!).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('email_log').select('sent_at, delivered_at, opened_at, clicked_at, bounced_at, status').eq('to_email', user.email!).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      return {
        inv: invRes.data as Record<string, string | null> | null,
        log: logRes.data as Record<string, string | null> | null,
      };
    },
  });

  // Sync state when user changes
  useEffect(() => {
    const found = ROLE_OPTIONS.find(r => r.value === user.role);
    setRoleOpt(found || { label: (user.role || 'user').replace(/_/g, ' '), value: user.role || 'user' });
    const access: Record<string, boolean> = {};
    MODULE_ITEMS.forEach(m => { access[m.key] = user.module_access?.[m.key] === true || !!m.default; });
    setModuleAccess(access);
    const parts = (user.full_name || '').trim().split(/\s+/).filter(Boolean);
    setFirstName(parts[0] || '');
    setLastName(parts.length > 1 ? parts.slice(1).join(' ') : '');
    setEmail(user.email || '');
    setGenLink(null);
    setGenCopied(false);
    setDeletePhase('idle');
    setPwOpen(false);
    setNewPw('');
    setConfirmPw('');
    setStagedPassword(null);
    const foundRole = ROLE_OPTIONS.find(r => r.value === user.role);
    const resolvedRole = foundRole?.value ?? user.role ?? null;
    setInitialRole(resolvedRole);
    setLocalApprovalStatus(user.approval_status ?? null);
  }, [user.id]);

  // Escape / blanket-click closes the nested UI first, then the modal.
  const handleModalClose = () => {
    if (pwOpen) { setPwOpen(false); return; }
    if (deletePhase === 'confirm') { setDeletePhase('idle'); return; }
    onClose();
  };

  const isSelf = user.id === currentUserId;
  const isSuperAdmin = user.role === 'super_admin';
  const canDelete = !isSelf && !isSuperAdmin;
  const canModify = !isSelf && !isSuperAdmin;
  const isActive = !localApprovalStatus || localApprovalStatus === 'APPROVED';
  const busyAny = saving || deleting || resetSending || genLoading;
  // Placeholder rows (never registered, +jira@catalyst.internal) cannot be invited
  // until given a real address — gate the Generate button on a real email.
  const isPlaceholderEmail = (email || '').includes('+jira@catalyst.internal');
  const emailValid = /\S+@\S+\.\S+/.test(email.trim()) && !isPlaceholderEmail;

  const handleGenerateLink = async () => {
    setGenLoading(true);
    try {
      const r = await inviteUser({
        email: email.trim(),
        full_name: [firstName.trim(), lastName.trim()].filter(Boolean).join(' ') || undefined,
        role: roleOpt?.value || 'developer',
        module_access: moduleAccess,
        delivery_channel: 'manual',
        purpose: 'invite',
        regenerate: true,
        ttl_seconds: 86400,
      });
      if (r.ok) { setGenLink(r.setup_link || ''); setGenCopied(false); catalystToast.success('Setup link generated — copy it below'); }
      else catalystToast.error(r.error || 'Failed to generate link');
    } finally { setGenLoading(false); }
  };

  const toggleModule = (key: string) => {
    const item = MODULE_ITEMS.find(m => m.key === key);
    if (item?.default || saving) return;
    setModuleAccess(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        user_id: user.id,
        module_access: moduleAccess,
        full_name: [firstName.trim(), lastName.trim()].filter(Boolean).join(' '),
        email: email.trim(),
      };
      // Only send role if it changed — prevents "Failed to update user role" for roles
      // that already match the DB value or that come from a different role table.
      if (roleOpt?.value !== initialRole) {
        body.role = roleOpt?.value;
      }
      // Commit staged suspension change if it differs from persisted state
      if (localApprovalStatus !== (user.approval_status ?? null)) {
        body.approval_status = localApprovalStatus;
      }
      const res = await supabase.functions.invoke('user-update', { body });
      if (res.error) throw new Error(res.error.message);
      const data = res.data as { ok: boolean; error?: string };
      if (!data?.ok) throw new Error(data?.error || 'Update failed');
      // Commit staged password after profile update succeeds
      if (stagedPassword) {
        const pwRes = await supabase.functions.invoke('admin-set-password', {
          body: { userId: user.id, newPassword: stagedPassword },
        });
        if (pwRes.error) throw new Error(pwRes.error.message);
        const pwData = pwRes.data as { ok: boolean; error?: string };
        if (!pwData?.ok) throw new Error(pwData?.error || 'Failed to set password');
        setStagedPassword(null);
      }
      catalystToast.success('User updated successfully');
      qc.invalidateQueries({ queryKey: ['admin-access-people'] });
      onSaved();
    } catch (e) {
      catalystToast.error(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = () => {
    if (!newPw || newPw !== confirmPw) { catalystToast.error('Passwords do not match'); return; }
    if (newPw.length < 8) { catalystToast.error('Password must be at least 8 characters'); return; }
    setStagedPassword(newPw);
    setPwOpen(false);
    setNewPw('');
    setConfirmPw('');
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
      catalystToast.success(`Password reset email sent to ${recipient}${ref}`);
    } catch (e) {
      catalystToast.error(e instanceof Error ? e.message : 'Failed to send reset email');
    } finally {
      setResetSending(false);
    }
  };

  const handleToggleSuspend = () => {
    const newStatus = isActive ? 'DISABLED' : 'APPROVED';
    if (newStatus === 'DISABLED' && user.role === 'admin' && adminCount <= 1) {
      catalystToast.error('Cannot suspend the only admin. Promote another user to admin first.');
      return;
    }
    setLocalApprovalStatus(newStatus);
  };

  const handleDelete = async () => {
    if (user.role === 'admin' && adminCount <= 1) {
      catalystToast.error('Cannot delete the only admin. Promote another user to admin first.');
      return;
    }
    setDeleting(true);
    try {
      const res = await supabase.functions.invoke('user-delete', {
        body: { user_id: user.id },
      });
      const data = res.data as { ok: boolean; error?: string } | null;
      if (!data?.ok) throw new Error(data?.error || res.error?.message || 'Delete failed');
      catalystToast.success(`${user.full_name || user.email} has been removed`);
      qc.invalidateQueries({ queryKey: ['admin-access-people'] });
      onClose();
    } catch (e) {
      catalystToast.error(e instanceof Error ? e.message : 'Delete failed');
      setDeleting(false);
    }
  };

  return (
    <ModalTransition>
      <Modal onClose={handleModalClose} width="medium" shouldScrollInViewport autoFocus={false} label={`Edit user ${user.full_name || user.email}`}>
        {/* Header */}
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid var(--ds-border)',
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          <CatalystAvatar
            name={user.full_name || user.email || '?'}
            src={user.avatar_url}
            size="large"
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.full_name || user.email}
            </div>
            {user.full_name && (
              <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </div>
            )}
            <div style={{ marginTop: 4 }}>
              <StatusPill state={userState({ email: user.email, approval_status: localApprovalStatus, last_login_at: user.last_login_at, locked_until: user.locked_until })} />
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close panel"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, borderRadius: 4, color: 'var(--ds-text-subtle)', display: 'flex', alignItems: 'center' }}
          >
            <CloseIcon label="Close" size="small" />
          </button>
        </div>

        {/* Tabbed body */}
        <div style={{ padding: '0 24px 24px' }}>
          <Tabs id="user-edit-tabs">
            <TabList>
              <Tab>Profile</Tab>
              <Tab>Access</Tab>
              <Tab>Security</Tab>
              <Tab>Activity</Tab>
            </TabList>

            {/* Profile tab */}
            <TabPanel>
              <div style={{ paddingTop: 16 }}>
                {/* Identity */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtle)', letterSpacing: '0.04em', marginBottom: 8 }}>Identity</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtle)', marginBottom: 4 }}>First name</label>
                      <Textfield value={firstName} onChange={e => setFirstName((e.target as HTMLInputElement).value)} isDisabled={isSuperAdmin || saving} placeholder="First" />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtle)', marginBottom: 4 }}>Last name</label>
                      <Textfield value={lastName} onChange={e => setLastName((e.target as HTMLInputElement).value)} isDisabled={isSuperAdmin || saving} placeholder="Last" />
                    </div>
                  </div>
                  <label style={{ display: 'block', fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtle)', marginBottom: 4 }}>Email</label>
                  <Textfield value={email} onChange={e => setEmail((e.target as HTMLInputElement).value)} isDisabled={isSuperAdmin || saving} placeholder="name@company.com" />
                  {isPlaceholderEmail && (
                    <div style={{ marginTop: 4, fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-warning)' }}>
                      Placeholder email — set a real address before generating a setup link.
                    </div>
                  )}
                </div>

                {/* Role */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtle)', letterSpacing: '0.04em', marginBottom: 8 }}>Role</div>
                  {isSuperAdmin ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Lozenge appearance="removed">Super Admin</Lozenge>
                      <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)' }}>Cannot be changed here</span>
                    </div>
                  ) : (
                    <Select
                      options={ROLE_GROUPS}
                      value={roleOpt}
                      onChange={opt => setRoleOpt(opt as { label: string; value: string } | null)}
                      menuPortalTarget={document.body}
                      isDisabled={saving}
                      styles={{ ...portalSelectStyles, menuPortal: (base) => ({ ...base, zIndex: 10000 }) }}
                    />
                  )}
                </div>

                {/* Account info */}
                <div>
                  <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtle)', letterSpacing: '0.04em', marginBottom: 8 }}>Account info</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', rowGap: 8, columnGap: 16, fontSize: 'var(--ds-font-size-300)', alignItems: 'center' }}>
                    <span style={{ color: 'var(--ds-text-subtle)', fontWeight: 500 }}>Joined</span>
                    <span style={{ color: 'var(--ds-text)' }}>
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </span>
                    <span style={{ color: 'var(--ds-text-subtle)', fontWeight: 500 }}>Last login</span>
                    <span style={{ color: 'var(--ds-text)' }}>{relativeTime(user.last_login_at)}</span>
                    <span style={{ color: 'var(--ds-text-subtle)', fontWeight: 500 }}>Source</span>
                    <span style={{ color: 'var(--ds-text)', textTransform: 'capitalize' }}>{userSource(user.email)}</span>
                  </div>
                </div>
              </div>
            </TabPanel>

            {/* Access tab */}
            <TabPanel>
              <div style={{ paddingTop: 16 }}>
                <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtle)', letterSpacing: '0.04em', marginBottom: 12 }}>Module access</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
                  {MODULE_ITEMS.map(m => (
                    <Checkbox
                      key={m.key}
                      isChecked={moduleAccess[m.key] === true}
                      isDisabled={!!m.default || saving}
                      onChange={() => toggleModule(m.key)}
                      label={
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 'var(--ds-font-size-300)' }}>
                          <img
                            src={HUB_ICON_REGISTRY[hubKeyFor(m.key)]}
                            alt=""
                            width={16}
                            height={16}
                            style={{ display: 'block', flexShrink: 0, filter: moduleAccess[m.key] ? 'none' : 'grayscale(1) opacity(0.4)' }}
                          />
                          {m.label}
                          {m.default && <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)' }}>always on</span>}
                        </span>
                      }
                    />
                  ))}
                </div>
                <div style={{ marginTop: 16, padding: '8px 12px', background: 'var(--ds-background-neutral-subtle)', borderRadius: 4, fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)' }}>
                  {Object.values(moduleAccess).filter(Boolean).length} of {MODULE_ITEMS.length} modules enabled
                </div>
              </div>
            </TabPanel>

            {/* Security tab */}
            <TabPanel>
              <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 0 }}>
                {canModify ? (
                  <>
                    {/* Setup link */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtle)', letterSpacing: '0.04em', marginBottom: 8 }}>Setup link</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)' }}>
                          Single-use link for the user to set their password (valid 24 h).
                        </div>
                        <Button appearance="default" isLoading={genLoading} isDisabled={busyAny || !emailValid} onClick={handleGenerateLink}>
                          Generate link
                        </Button>
                      </div>
                      {genLink && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <div style={{ flex: 1, padding: '8px 12px', fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 'var(--ds-font-size-100)', background: 'var(--ds-background-neutral)', border: '1px solid var(--ds-border)', borderRadius: 6, color: 'var(--ds-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {genLink}
                          </div>
                          <Button appearance="primary" onClick={async () => { try { await navigator.clipboard.writeText(genLink); setGenCopied(true); } catch { /* clipboard blocked */ } }}>
                            {genCopied ? '✓ Copied' : 'Copy'}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Password reset email */}
                    <div style={{ borderTop: '1px solid var(--ds-border-subtle)', paddingTop: 16, marginBottom: 16 }}>
                      <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtle)', letterSpacing: '0.04em', marginBottom: 8 }}>Password reset email</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)' }}>Send a reset link to {user.email}</div>
                        <Button appearance="default" isLoading={resetSending} isDisabled={busyAny && !resetSending} onClick={handleResetPassword}>
                          Send reset
                        </Button>
                      </div>
                    </div>

                    {/* Set new password */}
                    <div style={{ borderTop: '1px solid var(--ds-border-subtle)', paddingTop: 16, marginBottom: 16 }}>
                      <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtle)', letterSpacing: '0.04em', marginBottom: 8 }}>Set new password</div>
                      {stagedPassword ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-success)' }}>
                            ✓ New password staged — will be set on save
                          </div>
                          <Button appearance="subtle" onClick={() => setStagedPassword(null)}>Clear</Button>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: pwOpen ? 12 : 0 }}>
                            <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)' }}>Override password directly without sending email</div>
                            <Button appearance="default" isDisabled={busyAny && !pwOpen} onClick={() => { setPwOpen(v => !v); setNewPw(''); setConfirmPw(''); }}>
                              {pwOpen ? 'Cancel' : 'Set password'}
                            </Button>
                          </div>
                          {pwOpen && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <div>
                                <label style={{ display: 'block', fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtle)', marginBottom: 4 }}>New password</label>
                                <div style={{ position: 'relative' }}>
                                  <Textfield type={showPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw((e.target as HTMLInputElement).value)} placeholder="Min 8 characters" />
                                  <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 8, top: '48%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtle)', padding: 0 }}>
                                    {showPw ? 'Hide' : 'Show'}
                                  </button>
                                </div>
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtle)', marginBottom: 4 }}>Confirm password</label>
                                <Textfield type={showPw ? 'text' : 'password'} value={confirmPw} onChange={e => setConfirmPw((e.target as HTMLInputElement).value)} placeholder="Re-enter password" isInvalid={confirmPw.length > 0 && newPw !== confirmPw} />
                                {confirmPw.length > 0 && newPw !== confirmPw && (
                                  <div style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-danger)', marginTop: 4 }}>Passwords do not match</div>
                                )}
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <Button appearance="primary" isDisabled={!newPw || newPw !== confirmPw || newPw.length < 8} onClick={handleChangePassword}>
                                  Stage password
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Account status */}
                    <div style={{ borderTop: '1px solid var(--ds-border-subtle)', paddingTop: 16, marginBottom: canDelete ? 20 : 0 }}>
                      <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtle)', letterSpacing: '0.04em', marginBottom: 8 }}>Account status</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 0 }}>
                            <span style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 500, color: 'var(--ds-text)' }}>
                              {isActive ? 'Account is active' : 'Account is suspended'}
                            </span>
                            {localApprovalStatus !== (user.approval_status ?? null) && (
                              <span style={{ fontSize: 'var(--ds-font-size-50)', fontWeight: 500, padding: '0px 6px', borderRadius: 3, background: 'var(--ds-background-warning)', color: 'var(--ds-text-warning)', border: '1px solid var(--ds-border-warning)' }}>
                                pending save
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)' }}>
                            {isActive ? 'Suspend to revoke all access. Change is committed on save.' : 'Reactivate to restore access. Change is committed on save.'}
                          </div>
                        </div>
                        <Button
                          appearance={isActive ? 'default' : 'primary'}
                          isDisabled={busyAny}
                          onClick={handleToggleSuspend}
                        >
                          {isActive ? 'Suspend' : 'Reactivate'}
                        </Button>
                      </div>
                    </div>

                    {/* Danger zone */}
                    {canDelete && (
                      <div style={{ borderTop: '2px solid var(--ds-border-danger)', paddingTop: 16 }}>
                        <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-danger)', letterSpacing: '0.04em', marginBottom: 8 }}>Danger zone</div>
                        {deletePhase === 'confirm' ? (
                          <div style={{ background: 'var(--ds-background-danger)', border: '1px solid var(--ds-border-danger)', borderRadius: 4, padding: '12px 16px' }}>
                            <div style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: 'var(--ds-text-danger)', marginBottom: 4 }}>
                              Delete {user.full_name || user.email}?
                            </div>
                            <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-danger)', marginBottom: 12 }}>
                              This permanently removes their account. This cannot be undone.
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <Button appearance="danger" isLoading={deleting} isDisabled={deleting} onClick={handleDelete}>Yes, delete user</Button>
                              <Button appearance="subtle" onClick={() => setDeletePhase('idle')} isDisabled={deleting}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                            <div>
                              <div style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 500, color: 'var(--ds-text)', marginBottom: 0 }}>Delete account</div>
                              <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)' }}>Permanently remove this user and all their data.</div>
                            </div>
                            <Button appearance="danger" isDisabled={busyAny} onClick={() => setDeletePhase('confirm')}>Delete user</Button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--ds-text-subtle)', fontSize: 'var(--ds-font-size-300)' }}>
                    Security actions are not available for {isSelf ? 'your own account' : 'this account'}.
                  </div>
                )}
              </div>
            </TabPanel>

            {/* Activity tab */}
            <TabPanel>
              {(() => {
                const inv = lifecycle?.inv; const log = lifecycle?.log;
                const fmt = (t?: string | null) => t ? new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null;
                const lockedNow = !!user.locked_until && new Date(user.locked_until) > new Date();
                const fails = user.failed_login_count ?? 0;
                const steps: { label: string; at?: string | null; note?: string }[] = [
                  { label: 'Invited', at: inv?.created_at },
                  { label: 'Email sent', at: log?.sent_at, note: inv?.delivery_channel && inv.delivery_channel !== 'email' ? `via ${inv.delivery_channel}` : undefined },
                  { label: 'Delivered', at: log?.delivered_at },
                  { label: 'Opened', at: log?.opened_at },
                  { label: 'Link used', at: inv?.accepted_at },
                  { label: 'Password set / logged in', at: user.last_login_at },
                ];
                return (
                  <div style={{ paddingTop: 16 }}>
                    {(lockedNow || fails > 0) && (
                      <div style={{ marginBottom: 16, padding: '8px 12px', borderRadius: 6, fontSize: 'var(--ds-font-size-200)', background: lockedNow ? 'var(--ds-background-danger)' : 'var(--ds-background-warning)', color: lockedNow ? 'var(--ds-text-danger)' : 'var(--ds-text-warning)', border: `1px solid ${lockedNow ? 'var(--ds-border-danger)' : 'var(--ds-border-warning)'}` }}>
                        {lockedNow
                          ? `Account locked after ${fails} failed attempt${fails === 1 ? '' : 's'} — unlocks ${fmt(user.locked_until)}.`
                          : `${fails} failed login attempt${fails === 1 ? '' : 's'} recorded.`}
                      </div>
                    )}
                    <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtle)', letterSpacing: '0.04em', marginBottom: 12 }}>Onboarding journey</div>
                    {steps.map(s => (
                      <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--ds-border-subtle)' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: s.at ? 'var(--ds-icon-success)' : 'var(--ds-border)' }} />
                        <span style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)', flex: 1 }}>{s.label}</span>
                        <span style={{ fontSize: 'var(--ds-font-size-200)', color: s.at ? 'var(--ds-text-subtle)' : 'var(--ds-text-subtlest)' }}>
                          {s.at ? fmt(s.at) : (s.note || '—')}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </TabPanel>
          </Tabs>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid var(--ds-border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
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
      </Modal>
    </ModalTransition>
  );
}

// ─── BulkGenerateModal ────────────────────────────────────────────────────────
// Generate one-time setup links in bulk for users who have a real email and have
// never logged in. Placeholder (+jira@catalyst.internal) rows are excluded.

function BulkGenerateModal({ users, onClose }: { users: CatalystUser[]; onClose: () => void }) {
  const { inviteUser } = useInviteUser();
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const [results, setResults] = useState<{ name: string; email: string; link?: string; error?: string }[]>([]);

  const eligible = users.filter(u =>
    !u.last_login_at &&
    !!u.email && /\S+@\S+\.\S+/.test(u.email) && !u.email.includes('+jira@catalyst.internal') &&
    u.role !== 'super_admin'
  );

  const run = async () => {
    setRunning(true); setDone(false);
    const out: { name: string; email: string; link?: string; error?: string }[] = [];
    for (const u of eligible) {
      const r = await inviteUser({
        email: u.email!,
        full_name: u.full_name || undefined,
        role: u.role || 'developer',
        module_access: u.module_access || DEFAULT_MODULE_ACCESS,
        delivery_channel: 'manual',
        purpose: 'invite',
        regenerate: true,
        ttl_seconds: 86400,
      });
      out.push({ name: u.full_name || u.email!, email: u.email!, link: r.ok ? r.setup_link : undefined, error: r.ok ? undefined : r.error });
      setResults([...out]);
    }
    setRunning(false); setDone(true);
  };

  const copyAll = async () => {
    const text = results.filter(r => r.link).map(r => `${r.name} <${r.email}>: ${r.link}`).join('\n');
    try { await navigator.clipboard.writeText(text); setCopied(true); } catch { /* clipboard blocked */ }
  };

  const okCount = results.filter(r => r.link).length;

  return (
    <ModalTransition>
      <Modal onClose={onClose} width="large" shouldScrollInViewport autoFocus={false} label="Bulk generate setup links">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--ds-border)' }}>
          <h2 style={{ margin: 0, fontSize: 'var(--ds-font-size-500)', fontWeight: 600, color: 'var(--ds-text)' }}>Bulk generate setup links</h2>
          <p style={{ margin: '0px 0 0', fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest)' }}>
            For users with a real email who have never logged in. Placeholder (+jira) rows are excluded — give them a real email first.
          </p>
        </div>
        <div style={{ padding: 16 }}>
          {!running && !done && (
            <p style={{ margin: 0, fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text)' }}>
              {eligible.length === 0
                ? 'No eligible users — everyone has either logged in or lacks a real email.'
                : `${eligible.length} user${eligible.length === 1 ? '' : 's'} will get a fresh single-use setup link (manual / copy).`}
            </p>
          )}
          {(running || done) && (
            <div style={{ maxHeight: 360, overflowY: 'auto', border: '1px solid var(--ds-border)', borderRadius: 6 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--ds-font-size-200)' }}>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={r.email} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--ds-background-neutral)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 500, color: 'var(--ds-text)', whiteSpace: 'nowrap' }}>{r.name}</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 'var(--ds-font-size-100)', color: r.link ? 'var(--ds-text)' : 'var(--ds-text-danger)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 0 }}>
                        {r.link || r.error || '…'}
                      </td>
                    </tr>
                  ))}
                  {running && results.length < eligible.length && (
                    <tr><td colSpan={2} style={{ padding: '8px 12px', color: 'var(--ds-text-subtlest)' }}>Generating… {results.length}/{eligible.length}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {done && <p style={{ margin: '8px 0 0', fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest)' }}>{okCount} of {results.length} links generated.</p>}
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--ds-border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {done
            ? <Button appearance="default" isDisabled={okCount === 0} onClick={copyAll}>{copied ? '✓ Copied all' : 'Copy all links'}</Button>
            : <Button appearance="primary" isLoading={running} isDisabled={eligible.length === 0} onClick={run}>Generate {eligible.length} link{eligible.length === 1 ? '' : 's'}</Button>}
          <Button appearance="subtle" onClick={onClose} isDisabled={running}>Close</Button>
        </div>
      </Modal>
    </ModalTransition>
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
    background: 'linear-gradient(90deg, var(--ds-skeleton) 0%, var(--ds-skeleton-subtle) 50%, var(--ds-skeleton) 100%)',
    backgroundSize: '200% 100%',
    animation: 'cp-skeleton-shimmer 1.4s ease-in-out infinite',
    borderRadius: 3,
  };
  const COLS = 9; // Name, Email, Role, Department, Modules, Status, Last active, Source, actions
  return (
    <>
      <style>{`@keyframes cp-skeleton-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--ds-font-size-400)', tableLayout: 'fixed' }} data-testid="people-skeleton" data-columns={COLS}>
        <tbody>
          {Array.from({ length: 8 }).map((_, rowIdx) => (
            <tr key={rowIdx} style={{ borderBottom: '1px solid var(--ds-border-subtle)' }}>
              <td style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ ...SHIMMER, width: 24, height: 24, borderRadius: '50%' }} />
                  <div style={{ ...SHIMMER, width: 120, height: 12 }} />
                </div>
              </td>
              <td style={{ padding: '12px 16px' }}><div style={{ ...SHIMMER, width: 160, height: 12 }} /></td>
              <td style={{ padding: '12px 16px' }}><div style={{ ...SHIMMER, width: 80, height: 18, borderRadius: 3 }} /></td>
              <td style={{ padding: '12px 16px' }}><div style={{ ...SHIMMER, width: 90, height: 12 }} /></td>
              <td style={{ padding: '12px 16px', textAlign: 'center' }}><div style={{ ...SHIMMER, width: 36, height: 18, borderRadius: 9, margin: '0 auto' }} /></td>
              <td style={{ padding: '12px 16px' }}><div style={{ ...SHIMMER, width: 60, height: 18, borderRadius: 3 }} /></td>
              <td style={{ padding: '12px 16px' }}><div style={{ ...SHIMMER, width: 72, height: 12 }} /></td>
              <td style={{ padding: '12px 16px' }}><div style={{ ...SHIMMER, width: 50, height: 12 }} /></td>
              <td style={{ padding: '8px 4px' }}><div style={{ ...SHIMMER, width: 16, height: 16, borderRadius: 3, margin: '0 auto' }} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

// ─── Inline avatar upload cell ───────────────────────────────────────────────
// Renders the avatar with a hover overlay — click to upload, hover to reveal
// "Remove" if an override exists. Uses the same service as /admin/avatars.

interface AvatarCellProps {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  hasOverride: boolean;
  uploadedBy: string;
  overrideStoragePath?: string;
  onChanged: () => void;
}

function AvatarCell({ userId, name, avatarUrl, hasOverride, uploadedBy, overrideStoragePath, onChanged }: AvatarCellProps) {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      catalystToast.error(`Unsupported type. Use PNG / JPG / WEBP.`);
      e.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      catalystToast.error(`File too large. Max 2 MB.`);
      e.target.value = '';
      return;
    }
    setBusy(true);
    try {
      await uploadResourceAvatar({ profileId: userId, file, uploadedBy, previousStoragePath: overrideStoragePath ?? null });
      onChanged();
      catalystToast.success(`Avatar updated`);
    } catch (err) {
      catalystToast.error(`Upload failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  async function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    setBusy(true);
    try {
      await removeResourceAvatar(userId);
      onChanged();
      catalystToast.success(`Avatar reset`);
    } catch (err) {
      catalystToast.error(`Remove failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex', cursor: busy ? 'wait' : 'pointer', flexShrink: 0 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
      title={hasOverride ? 'Click to replace photo' : 'Click to upload photo'}
    >
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={handleUpload} disabled={busy} />
      <CatalystAvatar name={name} src={avatarUrl} size="small" />
      {hovered && !busy && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: 'rgba(0,0,0,0.45)', // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color: 'var(--ds-text-inverse)', fontSize: 'var(--ds-font-size-100)', fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>
            {hasOverride ? '✎' : '+'}
          </span>
        </div>
      )}
      {hovered && hasOverride && !busy && (
        <button
          onClick={handleRemove}
          style={{
            position: 'absolute', top: -4, right: -4, width: 14, height: 14,
            borderRadius: '50%', border: 'none', background: 'var(--ds-text-danger)',
            color: 'var(--ds-text-inverse)', fontSize: 'var(--ds-font-size-100)', fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
          }}
          title="Remove custom photo"
        >✕</button>
      )}
    </div>
  );
}

function PeopleTab() {
  const { user: currentUser } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<{ label: string; value: string } | null>(
    { label: 'All roles', value: '' }
  );
  const [sourceFilter, setSourceFilter] = useState<{ label: string; value: string } | null>(
    { label: 'All sources', value: '' }
  );
  const [statusFilter, setStatusFilter] = useState<{ label: string; value: string }>(
    STATUS_FILTER_OPTIONS[0]
  );
  const [editUser, setEditUser] = useState<CatalystUser | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const { data: users = [], isLoading } = useQuery<CatalystUser[]>({
    queryKey: ['admin-access-people'],
    queryFn: async () => {
      const [profilesRes, rolesRes, deptsRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email, avatar_url, created_at, module_access, approval_status, last_login_at, department_id, failed_login_count, locked_until, must_change_password').order('full_name'),
        supabase.from('user_roles').select('user_id, role'),
        supabase.from('capacity_departments').select('id, name'),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      const roleMap: Record<string, string> = {};
      (rolesRes.data || []).forEach(r => { roleMap[r.user_id] = r.role; });
      const deptMap: Record<string, string> = {};
      (deptsRes.data || []).forEach(d => { deptMap[d.id] = d.name; });
      return (profilesRes.data || []).map(p => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        avatar_url: p.avatar_url ?? null,
        role: roleMap[p.id] || null,
        created_at: p.created_at,
        module_access: (p.module_access as Record<string, boolean> | null) ?? null,
        approval_status: p.approval_status,
        last_login_at: (p as { last_login_at?: string | null }).last_login_at ?? null,
        department_name: (p as { department_id?: string | null }).department_id ? deptMap[(p as { department_id?: string | null }).department_id!] ?? null : null,
        failed_login_count: (p as { failed_login_count?: number | null }).failed_login_count ?? null,
        locked_until: (p as { locked_until?: string | null }).locked_until ?? null,
        must_change_password: (p as { must_change_password?: boolean | null }).must_change_password ?? null,
      }));
    },
    staleTime: 60_000,
  });

  // Merge resolved avatars (bundled photos + admin overrides) into user list
  const { data: approvedProfiles = [] } = useApprovedProfiles();
  const { data: avatarOverrides = {}, refetch: refetchOverrides } = useResourceAvatarOverrides();
  const resolvedAvatarMap = useMemo(
    () => new Map(approvedProfiles.map(p => [p.id, p.avatarUrl])),
    [approvedProfiles]
  );
  const usersWithAvatars = useMemo(
    () => users.map(u => ({ ...u, avatar_url: resolvedAvatarMap.get(u.id) ?? u.avatar_url })),
    [users, resolvedAvatarMap]
  );

  function handleAvatarChanged() {
    refetchOverrides();
    qc.invalidateQueries({ queryKey: ['approved-profiles'] });
    qc.invalidateQueries({ queryKey: ['resource-avatar-overrides'] });
  }

  const adminCount = useMemo(() => usersWithAvatars.filter(u => u.role === 'admin').length, [usersWithAvatars]);

  const filtered = useMemo(() => {
    let result = usersWithAvatars;
    if (statusFilter.value === 'all_approved') {
      result = result.filter(u => { const s = userState(u); return s === 'active' || s === 'pending' || s === 'locked'; });
    } else if (statusFilter.value === 'active') {
      result = result.filter(u => { const s = userState(u); return s === 'active' || s === 'locked'; });
    } else if (statusFilter.value === 'pending') {
      result = result.filter(u => userState(u) === 'pending');
    } else if (statusFilter.value === 'suspended') {
      result = result.filter(u => userState(u) === 'suspended');
    }
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
    if (sourceFilter?.value) {
      result = result.filter(u => userSource(u.email) === sourceFilter.value);
    }
    return result;
  }, [users, search, roleFilter, sourceFilter, statusFilter]);

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
        <div style={{ width: 160 }}>
          <Select
            options={FILTER_ROLE_OPTIONS}
            value={roleFilter}
            onChange={opt => setRoleFilter(opt as { label: string; value: string } | null)}
            placeholder="Filter by role"
            aria-label="Filter by role"
            menuPortalTarget={document.body}
            styles={selectStyles}
          />
        </div>
        <div style={{ width: 160 }}>
          <Select
            options={STATUS_FILTER_OPTIONS}
            value={statusFilter}
            onChange={opt => setStatusFilter((opt as { label: string; value: string }) ?? STATUS_FILTER_OPTIONS[0])}
            placeholder="Filter by status"
            aria-label="Filter by status"
            menuPortalTarget={document.body}
            styles={selectStyles}
          />
        </div>
        <div style={{ width: 170 }}>
          <Select
            options={[
              { label: 'All sources', value: '' },
              { label: 'Catalyst', value: 'catalyst' },
              { label: 'Jira', value: 'jira' },
            ]}
            value={sourceFilter}
            onChange={opt => setSourceFilter(opt as { label: string; value: string } | null)}
            placeholder="Filter by source"
            aria-label="Filter by source"
            menuPortalTarget={document.body}
            styles={selectStyles}
          />
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <Button appearance="subtle" onClick={() => setBulkOpen(true)}>Generate links</Button>
          <Button appearance="primary" iconBefore={PersonAddIcon} onClick={() => setInviteOpen(v => !v)} isSelected={inviteOpen}>
            Create access
          </Button>
        </div>
      </div>

      {/* Inline create-access surface (no drawer) */}
      {inviteOpen && (
        <CreateAccessInline
          onClose={() => setInviteOpen(false)}
          onCreated={() => {
            qc.invalidateQueries({ queryKey: ['admin-access-invitations'] });
            qc.invalidateQueries({ queryKey: ['admin-access-people'] });
          }}
        />
      )}
      {bulkOpen && <BulkGenerateModal users={users} onClose={() => setBulkOpen(false)} />}

      {/* Table */}
      {isLoading ? (
        <PeopleTableSkeleton />
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--ds-font-size-400)', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--ds-border)' }}>
              {[
                { label: 'Name', width: 180 },
                { label: 'Email', width: 220 },
                { label: 'Role', width: 148 },
                { label: 'Department', width: 120 },
                { label: 'Modules', width: 144 },
                { label: 'Status', width: 128 },
                { label: 'Last active', width: 96 },
                { label: 'Source', width: 100 },
                { label: '', width: 44 },
              ].map((h, i) => (
                <th key={i} style={{
                  textAlign: 'left', padding: '8px 12px',
                  fontWeight: 600, color: 'var(--ds-text-subtle, var(--cp-text-secondary))',
                  fontSize: 'var(--ds-font-size-200)', width: h.width, overflow: 'hidden',
                }}>
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: 'var(--ds-text-subtle)' }}>
                  {statusFilter.value === 'suspended' && !search && !roleFilter?.value && !sourceFilter?.value
                    ? 'No suspended users'
                    : (search || roleFilter?.value || sourceFilter?.value || statusFilter.value)
                      ? 'No users match your filters'
                      : 'No users found'}
                </td>
              </tr>
            ) : filtered.map(u => {
              const state = userState(u);
              const modKeys = enabledModuleKeys(u.module_access);
              return (
                <tr
                  key={u.id}
                  onClick={() => setEditUser(u)}
                  style={{ borderBottom: '1px solid var(--ds-border-subtle, var(--cp-bg-sunken))', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-background-neutral-subtle-hovered, var(--cp-bg-sunken))')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <td style={{ padding: '8px 16px', fontWeight: 500, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                      <AvatarCell
                        userId={u.id}
                        name={u.full_name || u.email || '?'}
                        avatarUrl={u.avatar_url}
                        hasOverride={!!avatarOverrides[u.id]}
                        uploadedBy={currentUser?.id ?? ''}
                        overrideStoragePath={avatarOverrides[u.id]?.storage_path}
                        onChanged={handleAvatarChanged}
                      />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.full_name || '—'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '8px 16px', color: 'var(--ds-text-subtle)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email || '—'}</td>
                  <td style={{ padding: '8px 16px', overflow: 'hidden' }}>
                    {u.role ? (
                      <Lozenge appearance={ROLE_APPEARANCE[u.role] || 'default'}>
                        {u.role.replace(/_/g, ' ')}
                      </Lozenge>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '8px 16px', fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.department_name ?? '—'}
                  </td>
                  <td style={{ padding: '8px 16px', overflow: 'hidden' }}>
                    {modKeys.length === 0 ? (
                      <span style={{ color: 'var(--ds-text-disabled)' }}>—</span>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'nowrap', overflow: 'hidden' }} title={modKeys.map(k => MODULE_ITEMS.find(m => m.key === k)?.label).join(', ')}>
                        {modKeys.slice(0, 6).map(k => (
                          <img key={k} src={HUB_ICON_REGISTRY[hubKeyFor(k)]} alt="" width={18} height={18} style={{ display: 'block', flexShrink: 0 }} />
                        ))}
                        {modKeys.length > 6 && (
                          <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtle)', fontWeight: 500, flexShrink: 0 }}>+{modKeys.length - 6}</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '8px 16px', overflow: 'hidden' }}>
                    <StatusPill state={state} />
                  </td>
                  <td style={{ padding: '8px 16px', color: 'var(--ds-text-subtle)', fontSize: 'var(--ds-font-size-200)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {relativeTime(u.last_login_at)}
                  </td>
                  <td style={{ padding: '8px 16px', overflow: 'hidden' }}>
                    {(() => {
                      const s = userSource(u.email);
                      return (
                        <Lozenge appearance={s === 'jira' ? 'default' : 'inprogress'}>
                          {s === 'jira' ? 'Jira' : 'Catalyst'}
                        </Lozenge>
                      );
                    })()}
                  </td>
                  <td style={{ padding: '8px 4px' }} onClick={e => { e.stopPropagation(); setEditUser(u); }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ds-text-subtle, var(--cp-text-secondary))' }}>
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
        <div style={{ marginTop: 12, fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle, var(--cp-text-secondary))', textAlign: 'right' }}>
          {filtered.length === users.length
            ? `${users.length} user${users.length !== 1 ? 's' : ''}`
            : `${filtered.length} of ${users.length} users`}
          {(statusFilter.value === 'all_approved' || statusFilter.value === 'active' || statusFilter.value === 'pending') && (() => {
            const suspendedCount = users.filter(u => userState(u) === 'suspended').length;
            return suspendedCount > 0 ? ` · ${suspendedCount} suspended hidden` : null;
          })()}
        </div>
      )}

      {editUser && currentUser && (
        <UserEditPanel
          user={editUser}
          currentUserId={currentUser.id}
          adminCount={adminCount}
          onClose={() => setEditUser(null)}
          onSaved={() => setEditUser(null)}
        />
      )}
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
      catalystToast.success(`Invitation resent to ${inv.email}`);
      qc.invalidateQueries({ queryKey: ['admin-access-invitations'] });
    } catch (e) {
      catalystToast.error(e instanceof Error ? e.message : 'Failed to resend invitation');
    } finally {
      setActionLoading(prev => ({ ...prev, [inv.id]: null }));
    }
  };

  const handleRevoke = async (inv: PendingInvite) => {
    setActionLoading(prev => ({ ...prev, [inv.id]: 'revoke' }));
    try {
      const { error } = await supabase.from('user_invitations').delete().eq('id', inv.id);
      if (error) throw error;
      catalystToast.success(`Invitation for ${inv.email} revoked`);
      qc.invalidateQueries({ queryKey: ['admin-access-invitations'] });
    } catch (e) {
      catalystToast.error(e instanceof Error ? e.message : 'Failed to revoke invitation');
    } finally {
      setActionLoading(prev => ({ ...prev, [inv.id]: null }));
    }
  };

  return (
    <div style={{ paddingTop: 16 }}>
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--ds-font-size-400)' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--ds-border)' }}>
              {['Email', 'Sent', 'Expires', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: 'var(--ds-text-subtle, var(--cp-text-secondary))', fontSize: 'var(--ds-font-size-200)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invites.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--ds-text-subtle)' }}>No invitations yet. Use "Create access" in the People tab to issue one.</td></tr>
            ) : invites.map(inv => {
              const expired = new Date(inv.expires_at) < new Date() && !inv.accepted_at;
              const isPending = !inv.accepted_at && !expired;
              const loading = actionLoading[inv.id];
              return (
                <tr key={inv.id} style={{ borderBottom: '1px solid var(--ds-border-subtle, var(--cp-bg-sunken))' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>{inv.email}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--ds-text-subtle)', fontSize: 'var(--ds-font-size-200)' }}>{new Date(inv.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--ds-text-subtle)', fontSize: 'var(--ds-font-size-200)' }}>{new Date(inv.expires_at).toLocaleDateString()}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {inv.accepted_at ? (
                      <Lozenge appearance="success">Accepted</Lozenge>
                    ) : expired ? (
                      <Lozenge appearance="removed">Expired</Lozenge>
                    ) : (
                      <Lozenge appearance="inprogress">Pending</Lozenge>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {inv.accepted_at ? (
                      <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-disabled)' }}>—</span>
                    ) : (
                      <div style={{ display: 'flex', gap: 4 }}>
                        {(isPending || expired) && (
                          <button
                            onClick={() => handleResend(inv)}
                            disabled={!!loading}
                            style={{
                              background: 'none', border: '1px solid var(--ds-border)',
                              borderRadius: 3, padding: '4px 8px', fontSize: 'var(--ds-font-size-200)', fontWeight: 500,
                              color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))',
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
                              background: 'none', border: '1px solid var(--ds-border-danger)',
                              borderRadius: 3, padding: '4px 8px', fontSize: 'var(--ds-font-size-200)', fontWeight: 500,
                              color: 'var(--ds-text-danger)',
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

  if (logs.length === 0) {
    return (
      <EmptyState
        header="No emails sent yet"
        description="Setup-link and invitation emails appear here once you create access or generate links from the People tab."
      />
    );
  }

  return (
    <div style={{ paddingTop: 16 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--ds-font-size-400)' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--ds-border)' }}>
            {['To', 'Subject', 'Status', 'Sent'].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: 'var(--ds-text-subtle, var(--cp-text-secondary))', fontSize: 'var(--ds-font-size-200)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id} style={{ borderBottom: '1px solid var(--ds-border-subtle, var(--cp-bg-sunken))' }}>
              <td style={{ padding: '12px 16px' }}>{log.to_email}</td>
              <td style={{ padding: '12px 16px', color: 'var(--ds-text-subtle)' }}>{log.subject}</td>
              <td style={{ padding: '12px 16px' }}>
                <Lozenge appearance={log.status === 'sent' ? 'success' : log.status === 'failed' ? 'removed' : 'default'}>
                  {log.status}
                </Lozenge>
              </td>
              <td style={{ padding: '12px 16px', color: 'var(--ds-text-subtle)', fontSize: 'var(--ds-font-size-200)' }}>
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
      <div style={{ background: 'var(--ds-surface)', minHeight: '100%', width: '100%' }}>
      <div style={{ padding: '24px 32px', maxWidth: 1100 }}>
        <div style={{ marginBottom: 24 }}>
          <Heading size="large">Access Management</Heading>
          <p style={{ margin: '4px 0 0', fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text-subtle, var(--cp-text-secondary))' }}>
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
      </div>
    </AdminGuard>
  );
}
