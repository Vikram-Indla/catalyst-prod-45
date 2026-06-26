import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/admin/admin-dialog';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import Spinner from '@atlaskit/spinner';
import SearchIcon from '@atlaskit/icon/core/search';
import CheckboxIcon from '@atlaskit/icon/core/checkbox-checked';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import { catalystToast } from '@/lib/catalystToast';
import {
  ProductRole,
  useAllProfiles,
  useUsersWithRole,
  useAssignUserToRole,
  useRemoveUserFromRole,
} from '@/hooks/useProductRoles';

interface AssignUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: ProductRole | null;
}

const T = {
  text:     'var(--ds-text, #172B4D)',
  subtle:   'var(--ds-text-subtle, #44546F)',
  subtlest: 'var(--ds-text-subtlest, #626F86)',
  border:   'var(--ds-border, #DCDFE4)',
  surface:  'var(--ds-surface, #FFFFFF)',
  selected: 'var(--ds-background-selected, #E9F2FE)',
  brand:    'var(--ds-icon-brand, #0C66E4)',
};

export function AssignUsersModal({ isOpen, onClose, role }: AssignUsersModalProps) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const initialIds = useRef<Set<string>>(new Set());

  const { data: allProfiles = [], isLoading: profilesLoading } = useAllProfiles();
  const { data: currentUsers = [], isLoading: currentLoading } = useUsersWithRole(isOpen ? role?.id ?? null : null);

  const assignUser = useAssignUserToRole();
  const removeUser = useRemoveUserFromRole();

  useEffect(() => {
    if (!isOpen) return;
    setSearch('');
    setSaving(false);
    const ids = new Set(currentUsers.map(u => u.user_id));
    initialIds.current = ids;
    setSelected(new Set(ids));
  }, [isOpen, currentUsers]);

  const isLoading = profilesLoading || currentLoading;

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allProfiles;
    return allProfiles.filter(p =>
      (p.full_name ?? '').toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q)
    );
  }, [allProfiles, search]);

  function toggleUser(userId: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(userId)) { next.delete(userId); } else { next.add(userId); }
      return next;
    });
  }

  const pendingChanges = React.useMemo(() => {
    const added = [...selected].filter(id => !initialIds.current.has(id)).length;
    const removed = [...initialIds.current].filter(id => !selected.has(id)).length;
    return added + removed;
  }, [selected]);

  async function handleSave() {
    if (!role || saving) return;
    const added = [...selected].filter(id => !initialIds.current.has(id));
    const removed = [...initialIds.current].filter(id => !selected.has(id));
    if (added.length === 0 && removed.length === 0) { onClose(); return; }
    setSaving(true);
    try {
      await Promise.all([
        ...added.map(userId => assignUser.mutateAsync({ userId, roleId: role.id })),
        ...removed.map(userId => {
          const ur = currentUsers.find(u => u.user_id === userId);
          if (!ur) return Promise.resolve();
          return removeUser.mutateAsync({ userRoleId: ur.id, roleId: role.id });
        }),
      ]);
      catalystToast.success(`${role.name} — assignments updated`);
      onClose();
    } catch {
      // individual mutations toast their own errors
    } finally {
      setSaving(false);
    }
  }

  if (!role) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Assign users — {role.name}</DialogTitle>
          <DialogDescription>
            Select users to assign to this role. Changes apply on save.
          </DialogDescription>
        </DialogHeader>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
          <Textfield
            placeholder="Search users…"
            value={search}
            onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
            elemBeforeInput={
              <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', color: T.subtlest }}>
                <SearchIcon label="" size="small" />
              </span>
            }
          />

          <div style={{ maxHeight: 320, overflowY: 'auto', border: `1px solid ${T.border}`, borderRadius: 4 }}>
            {isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                <Spinner size="medium" />
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: T.subtle, fontSize: 14 }}>
                {search ? 'No users match your search.' : 'No users found.'}
              </div>
            ) : (
              filtered.map(profile => {
                const isChecked = selected.has(profile.id);
                const wasAssigned = initialIds.current.has(profile.id);
                const changed = isChecked !== wasAssigned;
                return (
                  <div
                    key={profile.id}
                    role="checkbox"
                    aria-checked={isChecked}
                    onClick={() => toggleUser(profile.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                      borderBottom: `1px solid ${T.border}`, cursor: 'pointer',
                      background: isChecked ? T.selected : T.surface,
                      outline: changed ? `2px solid var(--ds-border-brand, #579DFF)` : 'none',
                      outlineOffset: '-2px',
                      transition: 'background 0.1s',
                    }}
                  >
                    <span style={{ color: isChecked ? T.brand : T.border, display: 'flex', flexShrink: 0 }}>
                      <CheckboxIcon label="" size="small" />
                    </span>
                    <CatalystAvatar
                      name={profile.full_name ?? profile.email}
                      size="xsmall"
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {profile.full_name ?? '—'}
                      </p>
                      <p style={{ margin: 0, fontSize: 12, color: T.subtlest, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {profile.email}
                      </p>
                    </div>
                    {changed && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-text-brand, #0C66E4)', flexShrink: 0 }}>
                        {isChecked ? '+' : '−'}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <p style={{ margin: 0, fontSize: 12, color: T.subtlest }}>
            {selected.size} user{selected.size !== 1 ? 's' : ''} assigned
            {pendingChanges > 0 && (
              <span style={{ color: 'var(--ds-text-brand, #0C66E4)', marginLeft: 6 }}>
                · {pendingChanges} unsaved change{pendingChanges !== 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>

        <DialogFooter>
          <Button appearance="default" onClick={onClose} isDisabled={saving}>
            Cancel
          </Button>
          <Button
            appearance="primary"
            isLoading={saving}
            onClick={handleSave}
          >
            Save assignments
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
