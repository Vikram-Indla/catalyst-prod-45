import React from 'react';
import Lozenge from '@atlaskit/lozenge';
import Textfield from '@atlaskit/textfield';
import SearchIcon from '@atlaskit/icon/core/search';
import { RbacUser, roleById } from '@/lib/rbac-mock';

interface RbacUsersTableProps {
  users: RbacUser[];
}

const T = {
  text:      'var(--ds-text, #172B4D)',
  subtle:    'var(--ds-text-subtle, #44546F)',
  subtlest:  'var(--ds-text-subtlest, #626F86)',
  border:    'var(--ds-border, #DCDFE4)',
  surface:   'var(--ds-surface, #FFFFFF)',
  hover:     'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))',
  headerBg:  'var(--ds-background-neutral, #F1F2F4)',
};

type LozengeApp = 'default' | 'success' | 'inprogress' | 'moved' | 'removed';

const STATUS_META: Record<RbacUser['status'], { label: string; appearance: LozengeApp }> = {
  active:   { label: 'Active',   appearance: 'success'    },
  inactive: { label: 'Inactive', appearance: 'default'    },
  pending:  { label: 'Pending',  appearance: 'inprogress' },
};

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function RbacUsersTable({ users }: RbacUsersTableProps) {
  const [search, setSearch] = React.useState('');

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.department ?? '').toLowerCase().includes(q)
    );
  }, [users, search]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Search */}
      <div style={{ maxWidth: 320 }}>
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
      </div>

      <div style={{ border: `1px solid ${T.border}`, borderRadius: 4, overflow: 'hidden' }}>
        {/* Column headings */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 2fr 1fr 1fr 1.5fr',
            padding: '6px 16px',
            background: T.headerBg,
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          {['User', 'Email', 'Department', 'Status', 'Roles'].map(h => (
            <span key={h} style={{ fontSize: 12, fontWeight: 653, color: T.subtle }}>
              {h}
            </span>
          ))}
        </div>

        {filtered.map(user => {
          const meta = STATUS_META[user.status];
          return (
            <div
              key={user.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 2fr 1fr 1fr 1.5fr',
                alignItems: 'center',
                padding: '10px 16px',
                borderBottom: `1px solid ${T.border}`,
                background: T.surface,
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = T.hover; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = T.surface; }}
            >
              {/* Avatar + name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <div
                  aria-hidden="true"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'var(--ds-background-brand-bold, #0C66E4)',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 653,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {initials(user.name)}
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.name}
                </span>
              </div>

              {/* Email */}
              <span style={{ fontSize: 13, color: T.subtle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </span>

              {/* Department */}
              <span style={{ fontSize: 13, color: T.subtle }}>
                {user.department ?? '—'}
              </span>

              {/* Status */}
              <span>
                <Lozenge appearance={meta.appearance}>{meta.label}</Lozenge>
              </span>

              {/* Roles */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {user.roles.length === 0 ? (
                  <span style={{ fontSize: 12, color: T.subtlest }}>No roles</span>
                ) : (
                  user.roles.map(rid => {
                    const role = roleById(rid);
                    return role ? (
                      <Lozenge key={rid} appearance="inprogress">{role.name}</Lozenge>
                    ) : null;
                  })
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: T.subtle, fontSize: 14 }}>
            No users match your search.
          </div>
        )}
      </div>

      <p style={{ fontSize: 12, color: T.subtlest, margin: 0 }}>
        Showing {filtered.length} of {users.length} users — mock data only
      </p>
    </div>
  );
}
