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
import EmptyState from '@atlaskit/empty-state';
import { RbacRole, RbacUser, RBAC_SCHEMA_DEPLOYED, usersForRole } from '@/lib/rbac-mock';

interface AssignUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: RbacRole | null;
  allUsers: RbacUser[];
}

const SAVE_DISABLED_REASON = 'Assign actions unavailable — RBAC schema not deployed';

const T = {
  text:     'var(--ds-text, #172B4D)',
  subtle:   'var(--ds-text-subtle, #44546F)',
  subtlest: 'var(--ds-text-subtlest, #626F86)',
  border:   'var(--ds-border, #DCDFE4)',
  surface:  'var(--ds-surface, #FFFFFF)',
  selected: 'var(--ds-background-selected, #E9F2FE)',
  brand:    'var(--ds-icon-brand, #0C66E4)',
};

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function AssignUsersModal({ isOpen, onClose, role, allUsers }: AssignUsersModalProps) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (!isOpen || !role) return;
    setSearch('');
    // Pre-select current role members
    const current = usersForRole(role.id).map(u => u.id);
    setSelected(new Set(current));
  }, [isOpen, role]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return allUsers.filter(u =>
      !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [allUsers, search]);

  function toggleUser(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
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
            Select users to assign to this role. Changes are preview-only in mock-safe mode.
          </DialogDescription>
        </DialogHeader>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
          {/* Mock-safe callout */}
          {!RBAC_SCHEMA_DEPLOYED && (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ds-text-subtle, #44546F)', background: 'var(--ds-background-neutral, #F1F2F4)', border: '1px solid var(--ds-border, #DCDFE4)', padding: '8px 12px', borderRadius: 3 }}>
              RBAC schema is not deployed. Writes are disabled in preview mode.
            </p>
          )}

          {/* Search */}
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

          {/* User list */}
          <div style={{ maxHeight: 320, overflowY: 'auto', border: `1px solid ${T.border}`, borderRadius: 4 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '24px 0' }}>
                <EmptyState header="No users found" description="Try a different search term." />
              </div>
            ) : (
              filtered.map(user => {
                const isSelected = selected.has(user.id);
                return (
                  <div
                    key={user.id}
                    onClick={() => toggleUser(user.id)}
                    role="checkbox"
                    aria-checked={isSelected}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '9px 12px',
                      borderBottom: `1px solid ${T.border}`,
                      cursor: 'pointer',
                      background: isSelected ? T.selected : T.surface,
                      transition: 'background 0.1s',
                    }}
                  >
                    {/* Check indicator */}
                    <span style={{ color: isSelected ? T.brand : T.border, display: 'flex', flexShrink: 0 }}>
                      <CheckboxIcon label="" size="small" />
                    </span>

                    {/* Avatar */}
                    <div
                      aria-hidden="true"
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        background: 'var(--ds-background-brand-bold, #0C66E4)',
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 653,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {initials(user.name)}
                    </div>

                    {/* Name + email */}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.name}
                      </p>
                      <p style={{ margin: 0, fontSize: 12, color: T.subtlest, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.email}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <p style={{ margin: 0, fontSize: 12, color: T.subtlest }}>
            {selected.size} user{selected.size !== 1 ? 's' : ''} selected
          </p>
        </div>

        <DialogFooter>
          <Button appearance="default" onClick={onClose}>
            Cancel
          </Button>
          <Tooltip content={RBAC_SCHEMA_DEPLOYED ? undefined : SAVE_DISABLED_REASON} position="top">
            <Button
              appearance="primary"
              isDisabled={!RBAC_SCHEMA_DEPLOYED}
              onClick={RBAC_SCHEMA_DEPLOYED ? onClose : undefined}
            >
              Save assignments
            </Button>
          </Tooltip>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
