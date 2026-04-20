// src/components/admin/RoleDetailDrawer.tsx
import { Fragment } from 'react';
import { X, Check, Eye, EyeOff, Shield, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useModuleMatrix, type AccessLevel } from '@/hooks/useModuleMatrix';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Lozenge } from '@/components/ads';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RoleDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  roleCode: string | null;
  roleName: string | null;
  isSystemRole?: boolean;
}

const accessConfig = {
  full: {
    label: 'Full Access',
    bg: 'bg-emerald-100 dark:bg-emerald-900/40',
    border: 'border-emerald-400 dark:border-emerald-600',
    text: 'text-emerald-700 dark:text-emerald-300',
    icon: Check,
  },
  view: {
    label: 'View Only',
    bg: 'bg-amber-100 dark:bg-amber-900/40',
    border: 'border-amber-400 dark:border-amber-600',
    text: 'text-amber-700 dark:text-amber-300',
    icon: Eye,
  },
  hidden: {
    label: 'Hidden',
    bg: 'bg-gray-100 dark:bg-gray-800/40',
    border: 'border-gray-300 dark:border-gray-600',
    text: 'text-gray-500 dark:text-gray-400',
    icon: EyeOff,
  },
};

function AccessBadge({ level }: { level: AccessLevel }) {
  const config = accessConfig[level];
  const Icon = config.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium',
        config.bg,
        config.border,
        config.text
      )}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

export function RoleDetailDrawer({
  open,
  onClose,
  roleCode,
  roleName,
  isSystemRole,
}: RoleDetailDrawerProps) {
  const { data: matrixData, isLoading } = useModuleMatrix({
    roleCode,
    groupName: null,
    accessLevel: null,
    search: '',
  });

  // Group modules by group_name
  const groupedModules = matrixData?.reduce((acc, cell) => {
    if (!acc[cell.group_name]) acc[cell.group_name] = [];
    // Only add unique modules
    if (!acc[cell.group_name].find((m) => m.module_key === cell.module_key)) {
      acc[cell.group_name].push({
        module_key: cell.module_key,
        module_name: cell.module_name,
        access_level: cell.access_level as AccessLevel,
      });
    }
    return acc;
  }, {} as Record<string, { module_key: string; module_name: string; access_level: AccessLevel }[]>);

  // Calculate stats
  const stats = matrixData?.reduce(
    (acc, cell) => {
      if (cell.access_level === 'full') acc.full++;
      else if (cell.access_level === 'view') acc.view++;
      else acc.hidden++;
      return acc;
    },
    { full: 0, view: 0, hidden: 0 }
  );

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[480px] sm:max-w-[480px] p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              {isSystemRole ? (
                <Shield className="w-5 h-5 text-primary" />
              ) : (
                <Users className="w-5 h-5 text-primary" />
              )}
            </div>
            <div>
              <SheetTitle className="text-lg font-semibold">
                {roleName || 'Role Details'}
              </SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {roleCode}
                {isSystemRole && (
                  <span className="ml-2">
                    <Lozenge appearance="default">System Role</Lozenge>
                  </span>
                )}
              </p>
            </div>
          </div>
        </SheetHeader>

        {/* Stats Summary */}
        {!isLoading && stats && (
          <div className="grid grid-cols-3 gap-3 px-6 py-4 border-b">
            <div className="text-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {stats.full}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-emerald-600/70 dark:text-emerald-400/70 font-medium">
                Full Access
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {stats.view}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-amber-600/70 dark:text-amber-400/70 font-medium">
                View Only
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
              <p className="text-2xl font-bold text-gray-500 dark:text-gray-400">
                {stats.hidden}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-gray-500/70 font-medium">
                Hidden
              </p>
            </div>
          </div>
        )}

        {/* Module List */}
        <ScrollArea className="flex-1">
          <div className="px-6 py-4">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {groupedModules &&
                  Object.entries(groupedModules).map(([groupName, modules]) => (
                    <div key={groupName}>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        {groupName}
                      </h3>
                      <div className="space-y-1">
                        {modules.map((module) => (
                          <div
                            key={module.module_key}
                            className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <span className="text-sm font-medium text-foreground">
                              {module.module_name}
                            </span>
                            <AccessBadge level={module.access_level} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-3 border-t bg-muted/20">
          <p className="text-xs text-muted-foreground text-center">
            {isSystemRole
              ? 'System roles cannot be modified'
              : 'Click cells in the matrix to modify permissions'}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
