import { useEffect, useState } from 'react';
import Modal, { ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Select from '@atlaskit/select';
import Spinner from '@atlaskit/spinner';
import {
  useUserProfile,
  useUserProductRole,
  useUserOverrides,
  useRolePermissions,
  useSaveUserOverrides,
  PERMISSION_GROUPS,
} from '@/hooks/useProductRoles';

interface UserOverridesModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  roleId: string | null;
}

const T = {
  text:     'var(--ds-text)',
  subtle:   'var(--ds-text-subtle)',
  subtlest: 'var(--ds-text-subtlest)',
  border:   'var(--ds-border)',
  bg:       'var(--ds-background-neutral-subtle)',
  surface:  'var(--ds-surface)',
};

const OVERRIDE_OPTIONS = [
  { label: 'Inherited', value: 'Inherited' },
  { label: 'Allow',     value: 'Allow' },
  { label: 'Deny',      value: 'Deny' },
];

export function UserOverridesModal({ isOpen, onClose, userId, roleId }: UserOverridesModalProps) {
  const [localOverrides, setLocalOverrides] = useState<Record<string, string>>({});

  const { data: profile,         isLoading: profileLoading   } = useUserProfile(userId);
  const { data: userProductRole, isLoading: roleLoading      } = useUserProductRole(userId);
  const { data: existingOverrides, isLoading: overridesLoading } = useUserOverrides(userId);
  const { data: rolePermissions } = useRolePermissions(userProductRole?.role_id || roleId);
  const saveOverrides = useSaveUserOverrides();

  const roleDefaultsLookup = (rolePermissions || []).reduce((acc, p) => {
    acc[p.permission_group] = p.permission_level;
    return acc;
  }, {} as Record<string, string>);

  useEffect(() => {
    if (existingOverrides) {
      const map = existingOverrides.reduce((acc, o) => {
        acc[o.permission_group] = o.override_value;
        return acc;
      }, {} as Record<string, string>);
      setLocalOverrides(map);
    } else {
      setLocalOverrides({});
    }
  }, [existingOverrides]);

  const handleSave = async () => {
    if (!userId) return;
    const overridesToSave = PERMISSION_GROUPS.map(group => ({
      permission_group: group,
      override_value: localOverrides[group] || 'Inherited',
    }));
    await saveOverrides.mutateAsync({ userId, overrides: overridesToSave });
    onClose();
  };

  const handleCancel = () => {
    if (existingOverrides) {
      const map = existingOverrides.reduce((acc, o) => {
        acc[o.permission_group] = o.override_value;
        return acc;
      }, {} as Record<string, string>);
      setLocalOverrides(map);
    } else {
      setLocalOverrides({});
    }
    onClose();
  };

  const isLoading = profileLoading || roleLoading || overridesLoading;

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={handleCancel} width="medium" shouldScrollInViewport autoFocus={false} label="Custom permissions">
          {/* Header */}
          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${T.border}` }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: T.text }}>
              Custom permissions — {profile?.full_name || 'User'}
            </h2>
            <p style={{ margin: '0px 0 0', fontSize: 12, color: T.subtlest }}>
              Overrides the default permissions of the assigned role.
            </p>
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
              <Spinner size="medium" />
            </div>
          ) : (
            <>
              {/* User summary */}
              <div style={{ margin: '16px 24px', padding: '12px 16px', background: T.bg, borderRadius: 4, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', fontSize: 13 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: T.subtlest, marginBottom: 0 }}>User</div>
                  <div style={{ color: T.text }}>{profile?.full_name || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: T.subtlest, marginBottom: 0 }}>Email</div>
                  <div style={{ color: T.text }}>{profile?.email || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: T.subtlest, marginBottom: 0 }}>Role</div>
                  <div style={{ color: T.text }}>{userProductRole?.role?.name || 'Not assigned'}</div>
                </div>
              </div>

              {/* Overrides table */}
              <div style={{ padding: '0 24px 16px', overflowY: 'auto', maxHeight: 360 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '4px 8px 6px 0', fontSize: 11, fontWeight: 600, color: T.subtle, borderBottom: `2px solid ${T.border}` }}>Permission</th>
                      <th style={{ textAlign: 'left', padding: '4px 8px', fontSize: 11, fontWeight: 600, color: T.subtle, borderBottom: `2px solid ${T.border}`, width: 120 }}>Role default</th>
                      <th style={{ textAlign: 'left', padding: '4px 0 6px 8px', fontSize: 11, fontWeight: 600, color: T.subtle, borderBottom: `2px solid ${T.border}`, width: 140 }}>Override</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PERMISSION_GROUPS.map(group => {
                      const roleDefault = roleDefaultsLookup[group] || 'None';
                      const currentOverride = localOverrides[group] || 'Inherited';
                      const isCustom = currentOverride !== 'Inherited';
                      return (
                        <tr key={group}>
                          <td style={{ padding: '8px 8px 8px 0', borderBottom: `1px solid ${T.border}`, color: T.text, fontWeight: isCustom ? 600 : 400 }}>{group}</td>
                          <td style={{ padding: '8px', borderBottom: `1px solid ${T.border}`, color: T.subtle }}>{roleDefault}</td>
                          <td style={{ padding: '8px 0 8px 8px', borderBottom: `1px solid ${T.border}` }}>
                            <Select
                              value={OVERRIDE_OPTIONS.find(o => o.value === currentOverride) ?? OVERRIDE_OPTIONS[0]}
                              options={OVERRIDE_OPTIONS}
                              onChange={opt => setLocalOverrides(prev => ({ ...prev, [group]: opt?.value ?? 'Inherited' }))}
                              menuPortalTarget={document.body}
                              styles={{
                                menuPortal: (base) => ({ ...base, zIndex: 10000 }),
                                control: (base) => ({ ...base, minHeight: 32 }),
                                menu: (base) => ({ ...base, fontSize: 'var(--ds-font-size-400)' }),
                                option: (base) => ({ ...base, fontSize: 'var(--ds-font-size-400)' }),
                                singleValue: (base) => ({ ...base, fontSize: 'var(--ds-font-size-400)' }),
                                input: (base) => ({ ...base, fontSize: 'var(--ds-font-size-400)' }),
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Footer */}
          <div style={{ padding: '12px 24px', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button appearance="subtle" onClick={() => setLocalOverrides({})} isDisabled={saveOverrides.isPending}>
              Reset to defaults
            </Button>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button appearance="default" onClick={handleCancel} isDisabled={saveOverrides.isPending}>Cancel</Button>
              <Button appearance="primary" onClick={handleSave} isLoading={saveOverrides.isPending}>
                Save overrides
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </ModalTransition>
  );
}
