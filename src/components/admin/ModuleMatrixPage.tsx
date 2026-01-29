// src/components/admin/ModuleMatrixPage.tsx
import { useState, useMemo, Fragment } from 'react';
import { Check, Eye, EyeOff, Search, X, Download, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useModuleMatrix,
  useRoles,
  useModuleGroups,
  usePermissionStats,
  useUpdatePermission,
  useBulkUpdate,
  cycleAccessLevel,
  type MatrixFilters,
  type AccessLevel,
} from '@/hooks/useModuleMatrix';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { RoleDetailDrawer } from './RoleDetailDrawer';

// ============================================
// STATS CARDS COMPONENT
// ============================================
function StatsCards({ roleCode }: { roleCode: string | null }) {
  const { data: stats, isLoading } = usePermissionStats(roleCode);

  if (isLoading) {
    return (
      <div className="grid grid-cols-5 gap-4 mb-6">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  const cards = [
    { label: 'Total Modules', value: stats?.total_modules ?? 0, color: 'border-l-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30' },
    { label: 'Full Access', value: stats?.full_count ?? 0, color: 'border-l-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
    { label: 'View Only', value: stats?.view_count ?? 0, color: 'border-l-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30' },
    { label: 'Hidden', value: stats?.hidden_count ?? 0, color: 'border-l-gray-400', bg: 'bg-gray-50 dark:bg-gray-900/30' },
    { label: 'Total Roles', value: stats?.total_roles ?? 0, color: 'border-l-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/30' },
  ];

  return (
    <div className="grid grid-cols-5 gap-4 mb-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className={cn(
            'rounded-lg border border-l-4 p-4',
            card.color,
            card.bg
          )}
        >
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {card.label}
          </p>
          <p className="text-2xl font-bold text-foreground mt-1">{card.value}</p>
        </div>
      ))}
    </div>
  );
}

// ============================================
// PERMISSION CELL COMPONENT
// ============================================
function PermissionCell({
  roleCode,
  moduleKey,
  accessLevel,
  isSystemRole,
}: {
  roleCode: string;
  moduleKey: string;
  accessLevel: AccessLevel;
  isSystemRole: boolean;
}) {
  const { mutate, isPending } = useUpdatePermission();
  const { toast } = useToast();

  const handleClick = () => {
    if (isSystemRole) return;
    const nextLevel = cycleAccessLevel(accessLevel);
    mutate(
      { roleCode, moduleKey, accessLevel: nextLevel },
      {
        onSuccess: () => {
          toast({
            title: 'Permission updated',
            description: `Set to ${nextLevel}`,
          });
        },
        onError: (err) => {
          toast({
            title: 'Error',
            description: err.message,
            variant: 'destructive',
          });
        },
      }
    );
  };

  const config = {
    full: {
      bg: 'bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:hover:bg-emerald-900/60',
      border: 'border-emerald-400 dark:border-emerald-600',
      icon: Check,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    view: {
      bg: 'bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/60',
      border: 'border-amber-400 dark:border-amber-600',
      icon: Eye,
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    hidden: {
      bg: 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800/40 dark:hover:bg-gray-800/60',
      border: 'border-gray-300 dark:border-gray-600',
      icon: EyeOff,
      iconColor: 'text-gray-400 dark:text-gray-500',
    },
  };

  const { bg, border, icon: Icon, iconColor } = config[accessLevel];

  return (
    <button
      onClick={handleClick}
      disabled={isSystemRole || isPending}
      className={cn(
        'w-7 h-7 rounded flex items-center justify-center border transition-colors',
        bg,
        border,
        isSystemRole && 'opacity-50 cursor-not-allowed',
        isPending && 'animate-pulse'
      )}
      title={`${accessLevel}${isSystemRole ? ' (Super Admin - locked)' : ''}`}
    >
      <Icon className={cn('w-3.5 h-3.5', iconColor)} />
    </button>
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================
export default function ModuleMatrixPage() {
  const { toast } = useToast();
  const [filters, setFilters] = useState<MatrixFilters>({
    roleCode: null,
    groupName: null,
    accessLevel: null,
    search: '',
  });
  const [selectedRole, setSelectedRole] = useState<{
    code: string;
    name: string;
    isSystem: boolean;
  } | null>(null);
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());

  // Data hooks
  const { data: roles } = useRoles();
  const { data: groups } = useModuleGroups();
  const { data: matrixData, isLoading: matrixLoading } = useModuleMatrix(filters);
  const { mutate: bulkUpdate, isPending: bulkPending } = useBulkUpdate();

  // Transform matrix data into grouped structure
  const { roleColumns, groupedModules } = useMemo(() => {
    if (!matrixData?.length) return { roleColumns: [], groupedModules: {} };

    // Get unique roles (columns)
    const rolesMap = new Map<string, { code: string; name: string; isSystem: boolean }>();
    matrixData.forEach((cell) => {
      if (!rolesMap.has(cell.role_code)) {
        rolesMap.set(cell.role_code, {
          code: cell.role_code,
          name: cell.role_name,
          isSystem: cell.is_system_role,
        });
      }
    });
    const roleColumns = Array.from(rolesMap.values());

    // Group modules
    const grouped: Record<string, { key: string; name: string; permissions: Record<string, AccessLevel> }[]> = {};
    const moduleMap = new Map<string, { key: string; name: string; group: string; sort: number; permissions: Record<string, AccessLevel> }>();

    matrixData.forEach((cell) => {
      if (!moduleMap.has(cell.module_key)) {
        moduleMap.set(cell.module_key, {
          key: cell.module_key,
          name: cell.module_name,
          group: cell.group_name,
          sort: cell.sort_order,
          permissions: {},
        });
      }
      moduleMap.get(cell.module_key)!.permissions[cell.role_code] = cell.access_level as AccessLevel;
    });

    // Sort and group
    const sorted = Array.from(moduleMap.values()).sort((a, b) => a.sort - b.sort);
    sorted.forEach((module) => {
      if (!grouped[module.group]) grouped[module.group] = [];
      grouped[module.group].push({
        key: module.key,
        name: module.name,
        permissions: module.permissions,
      });
    });

    return { roleColumns, groupedModules: grouped };
  }, [matrixData]);

  // Bulk actions
  const handleBulkUpdate = (level: AccessLevel) => {
    if (!selectedModules.size || !roles) return;
    const moduleKeys = Array.from(selectedModules);
    const roleCodes = filters.roleCode ? [filters.roleCode] : roles.filter(r => r.code !== 'super_admin').map(r => r.code);
    
    bulkUpdate(
      { moduleKeys, roleCodes, accessLevel: level },
      {
        onSuccess: () => {
          toast({ title: 'Bulk update complete', description: `${moduleKeys.length} modules updated` });
          setSelectedModules(new Set());
        },
      }
    );
  };

  const clearFilters = () => {
    setFilters({ roleCode: null, groupName: null, accessLevel: null, search: '' });
  };

  const hasFilters = filters.roleCode || filters.groupName || filters.accessLevel || filters.search;

  return (
    <div className="p-6 bg-muted/30 min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Module Access Matrix</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure which modules each role can access. Click cells to cycle: Full → View → Hidden.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset Defaults
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards roleCode={filters.roleCode} />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search modules..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="pl-9"
          />
        </div>

        <Select
          value={filters.groupName || 'all'}
          onValueChange={(v) => setFilters({ ...filters, groupName: v === 'all' ? null : v })}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Groups" />
          </SelectTrigger>
          <SelectContent className="z-[9999] bg-popover">
            <SelectItem value="all">All Groups</SelectItem>
            {groups?.map((g) => (
              <SelectItem key={g.group_name} value={g.group_name}>
                {g.group_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.roleCode || 'all'}
          onValueChange={(v) => setFilters({ ...filters, roleCode: v === 'all' ? null : v })}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent className="z-[9999] bg-popover">
            <SelectItem value="all">All Roles</SelectItem>
            {roles?.map((r) => (
              <SelectItem key={r.code} value={r.code}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.accessLevel || 'all'}
          onValueChange={(v) => setFilters({ ...filters, accessLevel: v === 'all' ? null : (v as AccessLevel) })}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Levels" />
          </SelectTrigger>
          <SelectContent className="z-[9999] bg-popover">
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="full">Full Access</SelectItem>
            <SelectItem value="view">View Only</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Matrix Table */}
      <div className="bg-card rounded-lg border shadow-sm overflow-hidden relative">
        <div className="overflow-auto max-h-[calc(100vh-380px)]">
          {matrixLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading matrix...</div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-[10]">
                <tr className="bg-muted dark:bg-muted">
                  <th className="text-left p-3 font-semibold text-foreground sticky left-0 z-[11] min-w-[200px] border-b border-r bg-muted dark:bg-muted">
                    Module
                  </th>
                  {roleColumns.map((role) => (
                    <th
                      key={role.code}
                      className="p-2 font-medium text-muted-foreground border-b text-center min-w-[48px] max-w-[56px] bg-muted dark:bg-muted"
                    >
                      <button
                        onClick={() =>
                          setSelectedRole({
                            code: role.code,
                            name: role.name,
                            isSystem: role.isSystem,
                          })
                        }
                        className="text-[11px] truncate max-h-[80px] hover:text-primary hover:underline underline-offset-2 transition-colors cursor-pointer"
                        style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}
                        title={`Click to view ${role.name} permissions`}
                      >
                        {role.name}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedModules).map(([groupName, modules]) => {
                  // Calculate group selection state
                  const groupModuleKeys = modules.map(m => m.key);
                  const selectedInGroup = groupModuleKeys.filter(k => selectedModules.has(k)).length;
                  const allSelected = selectedInGroup === groupModuleKeys.length;
                  const someSelected = selectedInGroup > 0 && !allSelected;

                  const handleGroupSelect = () => {
                    const next = new Set(selectedModules);
                    if (allSelected) {
                      // Unselect all in group
                      groupModuleKeys.forEach(k => next.delete(k));
                    } else {
                      // Select all in group
                      groupModuleKeys.forEach(k => next.add(k));
                    }
                    setSelectedModules(next);
                  };

                  return (
                    <Fragment key={`group-${groupName}`}>
                      {/* Group Header Row */}
                      <tr className="bg-muted/80">
                        <td
                          colSpan={roleColumns.length + 1}
                          className="px-3 py-2"
                        >
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              ref={(el) => {
                                if (el) el.indeterminate = someSelected;
                              }}
                              onChange={handleGroupSelect}
                              className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                            />
                            <span className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                              {groupName}
                            </span>
                            {selectedInGroup > 0 && (
                              <span className="text-xs text-muted-foreground font-normal">
                                ({selectedInGroup}/{groupModuleKeys.length} selected)
                              </span>
                            )}
                          </label>
                        </td>
                      </tr>
                      {/* Module Rows */}
                      {modules.map((module) => (
                        <tr key={module.key} className="hover:bg-muted/30 border-b border-border/50">
                          <th className="text-left p-3 font-medium text-foreground sticky left-0 bg-card z-10 border-r">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedModules.has(module.key)}
                                onChange={(e) => {
                                  const next = new Set(selectedModules);
                                  e.target.checked ? next.add(module.key) : next.delete(module.key);
                                  setSelectedModules(next);
                                }}
                                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                              />
                              {module.name}
                            </label>
                          </th>
                          {roleColumns.map((role) => (
                            <td key={`${module.key}-${role.code}`} className="p-1 text-center">
                              <PermissionCell
                                roleCode={role.code}
                                moduleKey={module.key}
                                accessLevel={module.permissions[role.code] || 'hidden'}
                                isSystemRole={role.isSystem}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 px-4 py-3 bg-muted/30 border-t text-xs text-muted-foreground">
          <span className="font-medium">Legend:</span>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-emerald-100 border border-emerald-400 flex items-center justify-center dark:bg-emerald-900/40 dark:border-emerald-600">
              <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span>Full Access</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-amber-100 border border-amber-400 flex items-center justify-center dark:bg-amber-900/40 dark:border-amber-600">
              <Eye className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            </div>
            <span>View Only</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-gray-100 border border-gray-300 flex items-center justify-center dark:bg-gray-800/40 dark:border-gray-600">
              <EyeOff className="w-3 h-3 text-gray-400 dark:text-gray-500" />
            </div>
            <span>Hidden</span>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedModules.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-3 rounded-lg shadow-xl flex items-center gap-4 z-50">
          <span className="text-sm font-medium">{selectedModules.size} modules selected</span>
          <div className="flex gap-2">
            <button
              onClick={() => handleBulkUpdate('full')}
              disabled={bulkPending}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 rounded text-sm font-medium transition-colors"
            >
              Set Full
            </button>
            <button
              onClick={() => handleBulkUpdate('view')}
              disabled={bulkPending}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 rounded text-sm font-medium transition-colors"
            >
              Set View
            </button>
            <button
              onClick={() => handleBulkUpdate('hidden')}
              disabled={bulkPending}
              className="px-3 py-1.5 bg-gray-500 hover:bg-gray-600 rounded text-sm font-medium transition-colors"
            >
              Set Hidden
            </button>
            <button
              onClick={() => setSelectedModules(new Set())}
              className="px-3 py-1.5 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Role Detail Drawer */}
      <RoleDetailDrawer
        open={!!selectedRole}
        onClose={() => setSelectedRole(null)}
        roleCode={selectedRole?.code || null}
        roleName={selectedRole?.name || null}
        isSystemRole={selectedRole?.isSystem}
      />
    </div>
  );
}

export { ModuleMatrixPage };
