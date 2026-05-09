import { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
      <Card>
        <CardHeader className="pb-3">
          <h2 className="text-sm font-semibold text-foreground">Product Roles</h2>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="rounded-full h-6 w-6 border-b-2 border-brand-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3 border-b">
        <h2 className="text-sm font-semibold text-foreground">Product Roles</h2>
      </CardHeader>
      <CardContent className="pt-4">
        {/* Search Input */}
        <div className="relative mb-4">
          <SearchIcon label="" size="small" />
          <Input
            placeholder="Search roles…"
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
          <p className="text-sm text-muted-foreground text-center py-4">
            No roles found matching your search.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
