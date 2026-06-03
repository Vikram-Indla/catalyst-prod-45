import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { Avatar, Lozenge, type LozengeAppearance } from '@/components/ads';
import { token } from '@atlaskit/tokens';
import Textfield from '@atlaskit/textfield';
import InlineEdit from '@atlaskit/inline-edit';
import Spinner from '@atlaskit/spinner';
import { catalystToast } from '@/lib/catalystToast';
import { Shield, History } from '@/lib/atlaskit-icons';
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

const cardStyle: React.CSSProperties = {
  background: token('elevation.surface.raised', '#FFFFFF'),
  borderRadius: 8,
  padding: 24,
  boxShadow: token('elevation.shadow.raised', '0 1px 3px rgba(9,30,66,0.13)'),
};

const dividerStyle: React.CSSProperties = {
  borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
  paddingBottom: 8,
  marginBottom: 8,
};

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

  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      catalystToast.error('Image must be under 2MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      catalystToast.error('File must be an image');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `avatars/${user.id}/profile.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('attachments')
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      await updateField('avatar_url', publicUrl);
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

  return (
    <div style={{ padding: 32, maxWidth: 960, margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 653, color: token('color.text', '#292A2E'), margin: 0 }}>
          User profile
        </h1>
        <p style={{ fontSize: 14, fontWeight: 400, color: token('color.text.subtlest', '#6B778C'), marginTop: 4 }}>
          Manage your account settings and preferences
        </p>
      </div>

      {/* Profile header card */}
      <div style={{ ...cardStyle, display: 'flex', gap: 32, alignItems: 'flex-start', marginBottom: 24 }}>
        {/* Avatar with upload */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 120 }}>
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
          <span style={{ fontSize: 11, color: token('color.text.subtlest', '#6B778C') }}>
            Click to change
          </span>
        </div>

        {/* Name + email + role */}
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={fieldLabel}>Full name</div>
            <InlineEdit
              defaultValue={profile?.full_name || ''}
              editView={({ errorMessage, ...fieldProps }) => (
                <Textfield {...fieldProps} autoFocus />
              )}
              readView={() => (
                <div style={{ ...fieldValue, padding: '4px 0', minHeight: 24 }}>
                  {profile?.full_name || <span style={{ color: token('color.text.disabled', '#A5ADBA') }}>Click to add name</span>}
                </div>
              )}
              onConfirm={(value) => {
                if (value !== profile?.full_name) {
                  updateFieldMutation.mutate({ field: 'full_name', value });
                }
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={fieldLabel}>Email</div>
            <div style={{ ...fieldValue, padding: '4px 0', color: token('color.text.subtle', '#42526E') }}>
              {profile?.email || user?.email || '—'}
            </div>
            <div style={{ fontSize: 11, color: token('color.text.subtlest', '#6B778C'), marginTop: 2 }}>
              Email cannot be changed
            </div>
          </div>

          <div>
            <div style={fieldLabel}>Role</div>
            <InlineEdit
              defaultValue={profile?.role || ''}
              editView={({ errorMessage, ...fieldProps }) => (
                <Textfield {...fieldProps} autoFocus placeholder="e.g., Product Owner, Scrum Master" />
              )}
              readView={() => (
                <div style={{ ...fieldValue, padding: '4px 0', minHeight: 24 }}>
                  {profile?.role || <span style={{ color: token('color.text.disabled', '#A5ADBA') }}>Click to add role</span>}
                </div>
              )}
              onConfirm={(value) => {
                if (value !== profile?.role) {
                  updateFieldMutation.mutate({ field: 'role', value });
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Details row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* Account details */}
        <div style={cardStyle}>
          <div style={sectionTitle}>Account details</div>
          <div style={dividerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, color: token('color.text.subtle', '#42526E') }}>User ID</span>
              <span style={{ fontSize: 12, fontFamily: 'monospace', color: token('color.text', '#172B4D') }}>{user?.id}</span>
            </div>
          </div>
          <div style={dividerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, color: token('color.text.subtle', '#42526E') }}>Account created</span>
              <span style={{ fontSize: 14, color: token('color.text', '#172B4D') }}>
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}
              </span>
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, color: token('color.text.subtle', '#42526E') }}>Last updated</span>
              <span style={{ fontSize: 14, color: token('color.text', '#172B4D') }}>
                {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* System role */}
        <div style={cardStyle}>
          <div style={{ ...sectionTitle, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Shield style={{ width: 14, height: 14 }} />
            System role
          </div>
          {userAppRole ? (
            <div>
              <div style={{ fontSize: 11, color: token('color.text.subtlest', '#6B778C'), marginBottom: 8 }}>
                Current role
              </div>
              <Lozenge appearance={ROLE_COLORS[userAppRole] ?? 'default'}>
                {ROLE_LABELS[userAppRole] ?? userAppRole}
              </Lozenge>
              <div style={{ fontSize: 12, color: token('color.text.subtlest', '#6B778C'), marginTop: 8 }}>
                This role determines your system-wide permissions and access levels.
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 14, color: token('color.text.subtlest', '#6B778C') }}>
              No system role assigned
            </div>
          )}
        </div>
      </div>

      {/* Role history */}
      <div style={cardStyle}>
        <div style={{ ...sectionTitle, display: 'flex', alignItems: 'center', gap: 4 }}>
          <History style={{ width: 14, height: 14 }} />
          Role history
        </div>
        {roleHistory && roleHistory.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Role', 'Action', 'Changed by', 'Date', 'Notes'].map((h) => (
                  <th
                    key={h}
                    style={{
                      fontSize: 12, fontWeight: 653,
                      color: token('color.text.subtle', '#505258'),
                      textAlign: 'left',
                      padding: '4px 8px 4px 0',
                      borderBottom: `1.67px solid ${token('color.border', 'rgba(11,18,14,0.14)')}`,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roleHistory.map((history: any) => (
                <tr key={history.id}>
                  <td style={{ padding: '8px 8px 8px 0', fontSize: 14 }}>
                    <Lozenge appearance={ROLE_COLORS[history.role] ?? 'default'}>
                      {ROLE_LABELS[history.role] ?? history.role}
                    </Lozenge>
                  </td>
                  <td style={{ padding: '8px 8px 8px 0', fontSize: 14 }}>
                    <Lozenge appearance={history.action === 'assigned' ? 'inprogress' : 'default'}>
                      {history.action}
                    </Lozenge>
                  </td>
                  <td style={{ padding: '8px 8px 8px 0', fontSize: 14, color: token('color.text', '#172B4D') }}>
                    {history.changed_by_profile?.full_name || history.changed_by_profile?.email || 'System'}
                  </td>
                  <td style={{ padding: '8px 8px 8px 0', fontSize: 14, color: token('color.text.subtlest', '#6B778C') }}>
                    {formatDistanceToNow(new Date(history.created_at), { addSuffix: true })}
                  </td>
                  <td style={{ padding: '8px 8px 8px 0', fontSize: 14, color: token('color.text.subtlest', '#6B778C') }}>
                    {history.notes || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ fontSize: 14, color: token('color.text.subtlest', '#6B778C'), textAlign: 'center', padding: 32 }}>
            No role history available
          </div>
        )}
      </div>
    </div>
  );
}
