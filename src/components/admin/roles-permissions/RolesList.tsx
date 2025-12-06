import { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProductRole } from '@/hooks/useProductRoles';

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
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-gold" />
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                  ? "bg-brand-gold/10"
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
                  <Users className="h-3 w-3" />
                  {role.user_count || 0}
                </span>
                <Badge 
                  variant={role.is_active ? "default" : "secondary"}
                  className={cn(
                    "text-xs",
                    role.is_active && "bg-green-100 text-green-700 hover:bg-green-100"
                  )}
                >
                  {role.is_active ? 'Active' : 'Inactive'}
                </Badge>
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
