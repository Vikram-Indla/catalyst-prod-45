import { useState } from 'react';
import Textfield from '@atlaskit/textfield';
import Spinner from '@atlaskit/spinner';
import { Lozenge } from '@/components/ads';
import { cn } from '@/lib/utils';
import { ProductRole } from '@/hooks/useProductRoles';
import PeopleGroupIcon from '@atlaskit/icon/core/people-group';
import SearchIcon from '@atlaskit/icon/core/search';

interface RolesListProps {
  roles: ProductRole[];
  selectedRoleId: string | null;
  onSelectRole: (roleId: string) => void;
  isLoading: boolean;
}

export function RolesList({ roles, selectedRoleId, onSelectRole, isLoading }: RolesListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (role.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  if (isLoading) {
    return (
      <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px' }}>
        <div style={{ padding: '12px 16px' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Product Roles</h2>
        </div>
        <div style={{ padding: '16px' }}>
          <div className="flex items-center justify-center py-8">
            <Spinner size="small" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--ds-border-layout, #EBECF0)' }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Product Roles</h2>
      </div>
      <div style={{ padding: '16px' }}>
        {/* Search */}
        <div className="mb-4">
          <Textfield
            placeholder="Search roles…"
            value={searchTerm}
            onChange={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
            elemBeforeInput={
              <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px' }}>
                <SearchIcon label="" size="small" />
              </span>
            }
          />
        </div>

        {/* Roles List */}
        <ul className="space-y-1">
          {filteredRoles.map((role) => (
            <li
              key={role.id}
              className={cn(
                "flex items-center justify-between px-3 py-3 rounded-md cursor-pointer transition-colors",
                selectedRoleId === role.id
                  ? "bg-brand-primary/10"
                  : "hover:bg-muted"
              )}
              onClick={() => onSelectRole(role.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">
                  {role.name}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {role.description}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <PeopleGroupIcon label="" size="small" />
                  {role.user_count || 0}
                </span>
                <Lozenge appearance={role.is_active ? 'inprogress' : 'default'}>
                  {role.is_active ? 'Active' : 'Inactive'}
                </Lozenge>
              </div>
            </li>
          ))}
        </ul>

        {filteredRoles.length === 0 && (
          <p className="text-sm text-center py-4" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}>
            No roles found matching your search.
          </p>
        )}
      </div>
    </div>
  );
}
