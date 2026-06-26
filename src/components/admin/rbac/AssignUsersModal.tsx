import React, { useState } from 'react';
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
import Tooltip from '@atlaskit/tooltip';
import SearchIcon from '@atlaskit/icon/core/search';
import CheckboxIcon from '@atlaskit/icon/core/checkbox-checked';
import Spinner from '@atlaskit/spinner';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import { ProductRole, useUsersWithRole } from '@/hooks/useProductRoles';

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

  const { data: currentUsers = [], isLoading } = useUsersWithRole(isOpen ? role?.id ?? null : null);

  React.useEffect(() => {
    if (!isOpen) return;
    setSearch('');
    setSelected(new Set(currentUsers.map(u => u.user_id)));
  }, [isOpen, currentUsers]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return currentUsers.filter(u =>
      !q ||
      (u.user?.full_name ?? '').toLowerCase().includes(q) ||
      (u.user?.email ?? '').toLowerCase().includes(q),
    );
  }, [currentUsers, search]);

  function toggleUser(userId: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(userId)) { next.delete(userId); } else { next.add(userId); }
      return next;
    });
  }

  if (!role) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Assign users — {role.name}</DialogTitle>
          <DialogDescription>
            Current members of this role. Reassignment available in a future release.
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
                {search ? 'No users match your search.' : 'No users assigned to this role.'}
              </div>
            ) : (
              filtered.map(user => {
                const isChecked = selected.has(user.user_id);
                return (
                  <div
                    key={user.id}
                    role="checkbox"
                    aria-checked={isChecked}
                    onClick={() => toggleUser(user.user_id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                      borderBottom: `1px solid ${T.border}`, cursor: 'pointer',
                      background: isChecked ? T.selected : T.surface, transition: 'background 0.1s',
                    }}
                  >
                    <span style={{ color: isChecked ? T.brand : T.border, display: 'flex', flexShrink: 0 }}>
                      <CheckboxIcon label="" size="small" />
                    </span>
                    <CatalystAvatar
                      name={user.user?.full_name ?? user.user?.email ?? '?'}
                      size="xsmall"
                    />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.user?.full_name ?? '—'}
                      </p>
                      <p style={{ margin: 0, fontSize: 12, color: T.subtlest, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.user?.email ?? '—'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <p style={{ margin: 0, fontSize: 12, color: T.subtlest }}>
            {selected.size} user{selected.size !== 1 ? 's' : ''} in this role
          </p>
        </div>

        <DialogFooter>
          <Button appearance="default" onClick={onClose}>
            Close
          </Button>
          <Tooltip content="User reassignment coming soon" position="top">
            <Button appearance="primary" isDisabled>
              Save assignments
            </Button>
          </Tooltip>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
