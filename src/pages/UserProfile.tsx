import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { Avatar, Lozenge, type LozengeAppearance } from '@/components/ads';
import { token } from '@atlaskit/tokens';
import Textfield from '@atlaskit/textfield';
import InlineEdit from '@atlaskit/inline-edit';
import Spinner from '@atlaskit/spinner';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import Button from '@atlaskit/button/new';
import { catalystToast } from '@/lib/catalystToast';
import { Shield, History, Calendar } from '@/lib/atlaskit-icons';
import { useUserRole } from '@/hooks/useUserRole';
import { formatDistanceToNow } from 'date-fns';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  program_manager: 'Program Manager',
  team_lead: 'Team Lead',
  user: 'User',
};

const ROLE_COLORS: Record<string, LozengeAppearance> = {
  admin: 'removed',
  program_manager: 'inprogress',
  team_lead: 'default',
  user: 'default',
};

const cardStyle: React.CSSProperties = {
  background: token('elevation.surface.raised', '#FFFFFF'),
  borderRadius: 8,
  padding: 24,
  boxShadow: token('elevation.shadow.raised', '0 1px 3px rgba(9,30,66,0.13)'),
};

const sectionTitle: React.CSSProperties = {
  fontSize: 12, fontWeight: 653,
  color: token('color.text.subtlest', '#6B778C'),
  letterSpacing: 0,
  marginBottom: 16,
};

const fieldLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 600,
  color: token('color.text.subtlest', '#6B778C'),
  marginBottom: 4,
};

const fieldValue: React.CSSProperties = {
  fontSize: 14, fontWeight: 400,
  color: token('color.text', '#172B4D'),
};

const thStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 653,
  color: token('color.text.subtle', '#505258'),
  textAlign: 'left' as const,
  padding: '4px 8px 4px 0',
  borderBottom: `1.67px solid ${token('color.border', 'rgba(11,18,14,0.14)')}`,
};

const tdStyle: React.CSSProperties = {
  padding: '8px 8px 8px 0',
  fontSize: 14,
};

function StatChip({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{
      flex: 1,
      padding: '8px 16px',
      background: token('color.background.neutral.subtle', '#F7F8F9'),
      borderRadius: 8,
      minWidth: 0,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: token('color.text.subtlest', '#6B778C'), marginBottom: 4 }}>
        {label}
      </div>
      <div style={{
        fontSize: 13,
        fontWeight: 500,
        color: token('color.text', '#172B4D'),
        fontFamily: mono ? 'monospace' : 'inherit',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {value}
      </div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${token('color.border', '#DFE1E6')}` }}>
      <span style={{ fontSize: 14, color: token('color.text.subtle', '#42526E') }}>{label}</span>
      <span style={{ fontSize: 14, color: token('color.text', '#172B4D'), textAlign: 'right' as const }}>{children}</span>
    </div>
  );
}

export default function UserProfile() {
  const queryClient = useQueryClient();
  const { role: userAppRole } = useUserRole();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    },
  });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: resourceInfo } = useQuery({
    queryKey: ['resource-info', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('resource_inventory')
        .select('name, role_name, department_name, vendor_name, rid, resource_type, contract_start_date, contract_end_date, is_active')
        .eq('profile_id', user.id)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: leaveHistory } = useQuery({
    queryKey: ['leave-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_availability')
        .select('id, kind, starts_at, ends_at, note, backup_user_id, created_at')
        .eq('user_id', user.id)
        .order('starts_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      if (!data || data.length === 0) return [];
      const backupIds = data.map(d => d.backup_user_id).filter(Boolean) as string[];
      let backupMap: Record<string, string> = {};
      if (backupIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', backupIds);
        if (profiles) {
          backupMap = Object.fromEntries(profiles.map(p => [p.id, p.full_name ?? p.id]));
        }
      }
      return data.map(d => ({
        ...d,
        backup_name: d.backup_user_id ? (backupMap[d.backup_user_id] ?? '—') : null,
      }));
    },
    enabled: !!user?.id,
  });

  const { data: roleHistory } = useQuery({
    queryKey: ['user-role-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await typedQuery('user_role_history')
        .select('*, changed_by_profile:profiles!user_role_history_changed_by_fkey(full_name, email)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const updateField = useCallback(async (field: string, value: string) => {
    if (!user?.id) return;
    const { error } = await supabase
      .from('profiles')
      .update({ [field]: value })
      .eq('id', user.id);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
    catalystToast.success('Profile updated');
  }, [user?.id, queryClient]);

  const updateFieldMutation = useMutation({
    mutationFn: ({ field, value }: { field: string; value: string }) => updateField(field, value),
    onError: (err: Error) => catalystToast.error(`Update failed: ${err.message}`),
  });

  const [uploading, setUploading] = useState(false);
  const [emailChanging, setEmailChanging] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [showEmailEdit, setShowEmailEdit] = useState(false);
  const [emailPassword, setEmailPassword] = useState('');

  const handleEmailChange = useCallback(async () => {
    if (!newEmail || !emailPassword) {
      catalystToast.error('Please enter both your password and new email');
      return;
    }
    setEmailChanging(true);
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: emailPassword,
      });
      if (signInErr) throw new Error('Password verification failed');
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      catalystToast.success('Confirmation email sent to both old and new addresses.');
      setShowEmailEdit(false);
      setNewEmail('');
      setEmailPassword('');
    } catch (err: any) {
      catalystToast.error(`Email change failed: ${err.message}`);
    } finally {
      setEmailChanging(false);
    }
  }, [newEmail, emailPassword, user?.email]);

  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    if (file.size > 2 * 1024 * 1024) { catalystToast.error('Image must be under 2MB'); return; }
    if (!file.type.startsWith('image/')) { catalystToast.error('File must be an image'); return; }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `avatars/${user.id}/profile.${ext}`;
      const { error: upErr } = await supabase.storage.from('attachments').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path);
      await updateField('avatar_url', `${urlData.publicUrl}?t=${Date.now()}`);
      catalystToast.success('Avatar updated');
    } catch (err: any) {
      catalystToast.error(`Avatar upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [user?.id, updateField]);

  if (profileLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spinner size="large" />
      </div>
    );
  }

  const designation = resourceInfo?.role_name ?? null;
  const department = resourceInfo?.department_name ?? null;
  const vendor = resourceInfo?.vendor_name ?? null;
  const rid = resourceInfo?.rid ?? null;
  const resourceType = resourceInfo?.resource_type ?? null;
  const contractStart = resourceInfo?.contract_start_date;
  const contractEnd = resourceInfo?.contract_end_date;

  const fmtDate = (d: string | null | undefined) =>
    d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const contractLabel = contractStart && contractEnd
    ? `${fmtDate(contractStart)} – ${fmtDate(contractEnd)}`
    : '—';

  const memberSince = profile?.created_at ? fmtDate(profile.created_at) : '—';

  const lastLogin = (profile as any)?.last_login_at
    ? formatDistanceToNow(new Date((profile as any).last_login_at), { addSuffix: true })
    : '—';

  const jiraLinked = !!(profile as any)?.jira_account_id;
  const jiraName = (profile as any)?.jira_display_name ?? (profile as any)?.jira_account_id ?? null;

  return (
    <div style={{ padding: 32, maxWidth: 960, margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 653, color: token('color.text', '#292A2E'), margin: 0 }}>
          User profile
        </h1>
        <p style={{ fontSize: 14, fontWeight: 400, color: token('color.text.subtlest', '#6B778C'), marginTop: 4 }}>
          Manage your account settings and preferences
        </p>
      </div>

      {/* ═══ HERO HEADER CARD ═══ */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          {/* Avatar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div
              style={{ position: 'relative', cursor: 'pointer' }}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Change profile picture"
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
            >
              <Avatar
                src={profile?.avatar_url || undefined}
                name={profile?.full_name || 'U'}
                size="xxlarge"
              />
              <div style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 28, height: 28, borderRadius: '50%',
                background: token('color.background.brand.bold', '#0052CC'),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `2px solid ${token('elevation.surface', '#FFFFFF')}`,
              }}>
                {uploading ? (
                  <Spinner size="small" appearance="invert" />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarUpload}
              />
            </div>
          </div>

          {/* Name + designation + meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h2 style={{ fontSize: 20, fontWeight: 653, color: token('color.text', '#292A2E'), margin: 0 }}>
                {profile?.full_name || '—'}
              </h2>
              {userAppRole && (
                <Lozenge appearance={ROLE_COLORS[userAppRole] ?? 'default'}>
                  {ROLE_LABELS[userAppRole] ?? userAppRole}
                </Lozenge>
              )}
            </div>

            {(designation || department) && (
              <div style={{ fontSize: 14, fontWeight: 400, color: token('color.text.subtle', '#42526E'), marginBottom: 4 }}>
                {[designation, department].filter(Boolean).join(' · ')}
              </div>
            )}

            <div style={{ fontSize: 13, color: token('color.text.subtlest', '#6B778C'), marginBottom: 12 }}>
              {profile?.email || user?.email || '—'}
            </div>

            {/* Meta line */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12, color: token('color.text.subtlest', '#6B778C') }}>
              {vendor && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span>🏢</span> {vendor}
                </span>
              )}
              {rid && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontWeight: 600 }}>RID</span> {rid}
                </span>
              )}
              {resourceType && (
                <span>
                  <Lozenge appearance="default">{resourceType}</Lozenge>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stat chips */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <StatChip label="Contract" value={contractLabel} />
          <StatChip label="Member since" value={memberSince} />
          <StatChip label="Last login" value={lastLogin} />
          <StatChip
            label="Jira identity"
            value={jiraLinked ? (jiraName || 'Linked') : 'Not linked'}
          />
        </div>
      </div>

      {/* ═══ TABBED SECTIONS ═══ */}
      <Tabs id="profile-tabs">
        <TabList>
          <Tab>Personal</Tab>
          <Tab>Security</Tab>
          <Tab>Leave</Tab>
        </TabList>

        {/* ── Personal tab ── */}
        <TabPanel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }}>
            {/* Personal details */}
            <div style={cardStyle}>
              <div style={sectionTitle}>Personal details</div>

              <div style={{ marginBottom: 16 }}>
                <div style={fieldLabel}>Full name</div>
                <InlineEdit
                  defaultValue={profile?.full_name || ''}
                  editView={({ errorMessage, ...fieldProps }) => (
                    <Textfield {...fieldProps} autoFocus />
                  )}
                  readView={() => (
                    <div style={{ ...fieldValue, padding: '4px 0', minHeight: 24 }}>
                      {profile?.full_name || <span style={{ color: token('color.text.disabled', '#A5ADBA') }}>Click to add</span>}
                    </div>
                  )}
                  onConfirm={(value) => {
                    if (value !== profile?.full_name) updateFieldMutation.mutate({ field: 'full_name', value });
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={fieldLabel}>Nickname</div>
                <InlineEdit
                  defaultValue={(profile as any)?.nickname || ''}
                  editView={({ errorMessage, ...fieldProps }) => (
                    <Textfield {...fieldProps} autoFocus placeholder="e.g., Vik" />
                  )}
                  readView={() => (
                    <div style={{ ...fieldValue, padding: '4px 0', minHeight: 24 }}>
                      {(profile as any)?.nickname || <span style={{ color: token('color.text.disabled', '#A5ADBA') }}>Click to add</span>}
                    </div>
                  )}
                  onConfirm={(value) => {
                    if (value !== (profile as any)?.nickname) updateFieldMutation.mutate({ field: 'nickname', value });
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={fieldLabel}>Email</div>
                <div style={{ ...fieldValue, padding: '4px 0' }}>{profile?.email || user?.email || '—'}</div>
                {!showEmailEdit ? (
                  <button
                    onClick={() => setShowEmailEdit(true)}
                    style={{ fontSize: 11, color: token('color.link', '#0052CC'), background: 'none', border: 'none', padding: 0, cursor: 'pointer', marginTop: 2 }}
                  >
                    Change email
                  </button>
                ) : (
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 320 }}>
                    <Textfield type="password" placeholder="Current password" value={emailPassword} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmailPassword(e.target.value)} />
                    <Textfield type="email" placeholder="New email address" value={newEmail} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEmail(e.target.value)} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button appearance="primary" isLoading={emailChanging} isDisabled={!newEmail || !emailPassword} onClick={() => void handleEmailChange()}>Confirm</Button>
                      <Button appearance="subtle" onClick={() => { setShowEmailEdit(false); setNewEmail(''); setEmailPassword(''); }}>Cancel</Button>
                    </div>
                    <div style={{ fontSize: 11, color: token('color.text.subtlest', '#6B778C') }}>
                      A confirmation link will be sent to both addresses.
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={fieldLabel}>Country</div>
                <InlineEdit
                  defaultValue={(profile as any)?.country || ''}
                  editView={({ errorMessage, ...fieldProps }) => (
                    <Textfield {...fieldProps} autoFocus placeholder="e.g., Saudi Arabia" />
                  )}
                  readView={() => (
                    <div style={{ ...fieldValue, padding: '4px 0', minHeight: 24 }}>
                      {(profile as any)?.country || <span style={{ color: token('color.text.disabled', '#A5ADBA') }}>Click to add</span>}
                    </div>
                  )}
                  onConfirm={(value) => {
                    if (value !== (profile as any)?.country) updateFieldMutation.mutate({ field: 'country', value });
                  }}
                />
              </div>

              <div>
                <div style={fieldLabel}>Location</div>
                <InlineEdit
                  defaultValue={(profile as any)?.location || ''}
                  editView={({ errorMessage, ...fieldProps }) => (
                    <Textfield {...fieldProps} autoFocus placeholder="e.g., Riyadh" />
                  )}
                  readView={() => (
                    <div style={{ ...fieldValue, padding: '4px 0', minHeight: 24 }}>
                      {(profile as any)?.location || <span style={{ color: token('color.text.disabled', '#A5ADBA') }}>Click to add</span>}
                    </div>
                  )}
                  onConfirm={(value) => {
                    if (value !== (profile as any)?.location) updateFieldMutation.mutate({ field: 'location', value });
                  }}
                />
              </div>
            </div>

            {/* Organization (read-only from resource_inventory) */}
            <div style={cardStyle}>
              <div style={sectionTitle}>Organization</div>
              <FieldRow label="Designation">{designation ?? '—'}</FieldRow>
              <FieldRow label="Department">{department ?? '—'}</FieldRow>
              <FieldRow label="Vendor">{vendor ?? '—'}</FieldRow>
              <FieldRow label="Resource ID">{rid ?? '—'}</FieldRow>
              <FieldRow label="Resource type">{resourceType ?? '—'}</FieldRow>
              <FieldRow label="Contract start">{fmtDate(contractStart)}</FieldRow>
              <FieldRow label="Contract end">{fmtDate(contractEnd)}</FieldRow>
              <div style={{ fontSize: 11, color: token('color.text.subtlest', '#6B778C'), marginTop: 12 }}>
                Organization details are managed by your administrator.
              </div>
            </div>
          </div>
        </TabPanel>

        {/* ── Security tab ── */}
        <TabPanel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }}>
            {/* System role */}
            <div style={cardStyle}>
              <div style={{ ...sectionTitle, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Shield style={{ width: 14, height: 14 }} />
                System role
              </div>
              {userAppRole ? (
                <div>
                  <div style={{ fontSize: 11, color: token('color.text.subtlest', '#6B778C'), marginBottom: 8 }}>Current role</div>
                  <Lozenge appearance={ROLE_COLORS[userAppRole] ?? 'default'}>
                    {ROLE_LABELS[userAppRole] ?? userAppRole}
                  </Lozenge>
                  <div style={{ fontSize: 12, color: token('color.text.subtlest', '#6B778C'), marginTop: 8 }}>
                    This role determines your system-wide permissions and access levels.
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 14, color: token('color.text.subtlest', '#6B778C') }}>No system role assigned</div>
              )}

              {/* Role history inline */}
              <div style={{ marginTop: 24 }}>
                <div style={{ ...sectionTitle, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <History style={{ width: 14, height: 14 }} />
                  Role history
                </div>
                {roleHistory && roleHistory.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['Role', 'Action', 'Changed by', 'Date'].map((h) => (
                          <th key={h} style={thStyle}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {roleHistory.map((history: any) => (
                        <tr key={history.id}>
                          <td style={tdStyle}>
                            <Lozenge appearance={ROLE_COLORS[history.role] ?? 'default'}>
                              {ROLE_LABELS[history.role] ?? history.role}
                            </Lozenge>
                          </td>
                          <td style={tdStyle}>
                            <Lozenge appearance={history.action === 'assigned' ? 'inprogress' : 'default'}>
                              {history.action}
                            </Lozenge>
                          </td>
                          <td style={{ ...tdStyle, color: token('color.text', '#172B4D') }}>
                            {history.changed_by_profile?.full_name || 'System'}
                          </td>
                          <td style={{ ...tdStyle, color: token('color.text.subtlest', '#6B778C') }}>
                            {formatDistanceToNow(new Date(history.created_at), { addSuffix: true })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ fontSize: 14, color: token('color.text.subtlest', '#6B778C'), textAlign: 'center', padding: 16 }}>
                    No role history available
                  </div>
                )}
              </div>
            </div>

            {/* Account details */}
            <div style={cardStyle}>
              <div style={sectionTitle}>Account details</div>
              <FieldRow label="User ID">
                <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{user?.id?.slice(0, 8)}…</span>
              </FieldRow>
              <FieldRow label="Account created">{memberSince}</FieldRow>
              <FieldRow label="Last updated">{profile?.updated_at ? fmtDate(profile.updated_at) : '—'}</FieldRow>
              <FieldRow label="Last login">{lastLogin}</FieldRow>
              <FieldRow label="Jira identity">
                {jiraLinked ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ color: token('color.icon.success', '#22A06B') }}>✓</span>
                    {jiraName || 'Linked'}
                  </span>
                ) : (
                  <span style={{ color: token('color.text.subtlest', '#6B778C') }}>Not linked</span>
                )}
              </FieldRow>
            </div>
          </div>
        </TabPanel>

        {/* ── Leave tab ── */}
        <TabPanel>
          <div style={{ marginTop: 24 }}>
            <div style={cardStyle}>
              <div style={{ ...sectionTitle, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Calendar style={{ width: 14, height: 14 }} />
                Leave history
              </div>
              {leaveHistory && leaveHistory.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['From', 'Until', 'Type', 'Backup', 'Note', 'Status'].map((h) => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leaveHistory.map((leave: any) => {
                      const now = new Date();
                      const start = new Date(leave.starts_at);
                      const end = new Date(leave.ends_at);
                      const isActive = start <= now && end >= now;
                      const isUpcoming = start > now;
                      const statusLabel = isActive ? 'Active' : isUpcoming ? 'Upcoming' : 'Completed';
                      const statusAppearance: LozengeAppearance = isActive ? 'inprogress' : isUpcoming ? 'new' : 'default';
                      const kindLabels: Record<string, string> = {
                        vacation: 'Vacation', sick: 'Sick leave',
                        public_holiday: 'Public holiday', ooo: 'Out of office',
                      };
                      const kindAppearance: Record<string, LozengeAppearance> = {
                        vacation: 'inprogress', sick: 'removed',
                        public_holiday: 'default', ooo: 'moved',
                      };
                      return (
                        <tr key={leave.id}>
                          <td style={{ ...tdStyle, color: token('color.text', '#172B4D') }}>{fmtDate(leave.starts_at)}</td>
                          <td style={{ ...tdStyle, color: token('color.text', '#172B4D') }}>{fmtDate(leave.ends_at)}</td>
                          <td style={tdStyle}>
                            <Lozenge appearance={kindAppearance[leave.kind] ?? 'default'}>
                              {kindLabels[leave.kind] ?? leave.kind}
                            </Lozenge>
                          </td>
                          <td style={{ ...tdStyle, color: token('color.text', '#172B4D') }}>{leave.backup_name ?? '—'}</td>
                          <td style={{ ...tdStyle, color: token('color.text.subtlest', '#6B778C') }}>{leave.note ?? '—'}</td>
                          <td style={tdStyle}>
                            <Lozenge appearance={statusAppearance}>{statusLabel}</Lozenge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div style={{ fontSize: 14, color: token('color.text.subtlest', '#6B778C'), textAlign: 'center', padding: 32 }}>
                  No leave history available
                </div>
              )}
            </div>
          </div>
        </TabPanel>
      </Tabs>
    </div>
  );
}
