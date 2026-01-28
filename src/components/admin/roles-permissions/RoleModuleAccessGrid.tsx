import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRolePermissions, PERMISSION_GROUPS } from '@/hooks/useProductRoles';
import { Check, Eye, EyeOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoleModuleAccessGridProps {
  roleId: string;
  roleName: string;
}

function getAccessBadge(level: string | undefined) {
  switch (level) {
    case 'Full':
      return (
        <Badge 
          variant="secondary" 
          className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 gap-1 text-xs font-medium"
        >
          <Check className="h-3 w-3" />
          Full
        </Badge>
      );
    case 'View only':
      return (
        <Badge 
          variant="secondary" 
          className="bg-blue-100 text-blue-700 hover:bg-blue-100 gap-1 text-xs font-medium"
        >
          <Eye className="h-3 w-3" />
          View
        </Badge>
      );
    case 'None':
    default:
      return (
        <Badge 
          variant="secondary" 
          className="bg-zinc-100 text-zinc-500 hover:bg-zinc-100 gap-1 text-xs font-medium"
        >
          <EyeOff className="h-3 w-3" />
          Hide
        </Badge>
      );
  }
}

export function RoleModuleAccessGrid({ roleId, roleName }: RoleModuleAccessGridProps) {
  const { data: permissions, isLoading } = useRolePermissions(roleId);

  const permissionLookup = (permissions || []).reduce((acc, p) => {
    acc[p.permission_group] = p.permission_level;
    return acc;
  }, {} as Record<string, string>);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3 border-b">
          <h2 className="text-sm font-semibold text-foreground">Module Access</h2>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Count access levels
  const fullCount = PERMISSION_GROUPS.filter(g => permissionLookup[g] === 'Full').length;
  const viewCount = PERMISSION_GROUPS.filter(g => permissionLookup[g] === 'View only').length;
  const hideCount = PERMISSION_GROUPS.filter(g => !permissionLookup[g] || permissionLookup[g] === 'None').length;

  return (
    <Card>
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Module Access</h2>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Full: {fullCount}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              View: {viewCount}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-zinc-400" />
              Hide: {hideCount}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-2 gap-2">
          {PERMISSION_GROUPS.map((module) => {
            const level = permissionLookup[module];
            const isHidden = !level || level === 'None';
            
            return (
              <div 
                key={module}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border",
                  isHidden 
                    ? "bg-muted/30 border-border/50" 
                    : "bg-background border-border"
                )}
              >
                <span className={cn(
                  "text-sm font-medium truncate pr-2",
                  isHidden ? "text-muted-foreground" : "text-foreground"
                )}>
                  {module}
                </span>
                {getAccessBadge(level)}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
