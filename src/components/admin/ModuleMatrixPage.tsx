import React, { useState } from 'react';
import { useModuleMatrix } from '@/hooks/useModuleMatrix';
import { useUserRole } from '@/hooks/useUserRole';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, Eye, EyeOff, ChevronDown, Shield, Info } from 'lucide-react';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type AccessLevel = 'none' | 'view' | 'full';

const ACCESS_LEVELS: { value: AccessLevel; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'none', label: 'Hidden', icon: <EyeOff className="h-3.5 w-3.5" />, color: 'bg-muted text-muted-foreground' },
  { value: 'view', label: 'View Only', icon: <Eye className="h-3.5 w-3.5" />, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'full', label: 'Full Access', icon: <Check className="h-3.5 w-3.5" />, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
];

export function ModuleMatrixPage() {
  const { isSuperAdmin } = useUserRole();
  const { isLoading, error, updatePermission, getMatrixByModule, getRoles, getModules } = useModuleMatrix();
  const [updatingCell, setUpdatingCell] = useState<string | null>(null);

  const matrixByModule = getMatrixByModule();
  const roles = getRoles();
  const modules = getModules();

  const handleUpdatePermission = async (roleCode: string, moduleKey: string, newLevel: AccessLevel) => {
    if (!isSuperAdmin) {
      toast.error('Only super admins can modify permissions');
      return;
    }

    const cellKey = `${moduleKey}-${roleCode}`;
    setUpdatingCell(cellKey);

    try {
      await updatePermission.mutateAsync({
        roleCode,
        moduleKey,
        accessLevel: newLevel,
      });
      toast.success(`Updated ${moduleKey} access for ${roleCode}`);
    } catch (err) {
      toast.error('Failed to update permission');
      console.error(err);
    } finally {
      setUpdatingCell(null);
    }
  };

  const getAccessBadge = (level: AccessLevel) => {
    const config = ACCESS_LEVELS.find((l) => l.value === level) || ACCESS_LEVELS[0];
    return (
      <Badge variant="secondary" className={`${config.color} gap-1 text-xs font-medium`}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  // Calculate summary counts per role
  const getRoleSummary = (roleCode: string) => {
    let full = 0, view = 0, none = 0;
    modules.forEach((mod) => {
      const level = matrixByModule[mod.key]?.[roleCode] || 'none';
      if (level === 'full') full++;
      else if (level === 'view') view++;
      else none++;
    });
    return { full, view, none };
  };

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">Error loading module matrix: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Module Access Matrix</CardTitle>
          </div>
          <CardDescription>
            Configure which modules each role can access. Changes apply immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isSuperAdmin && (
            <div className="mb-4 flex items-center gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
              <Info className="h-4 w-4" />
              <span>You have view-only access. Only super admins can modify permissions.</span>
            </div>
          )}

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="sticky left-0 z-10 bg-muted/50 font-semibold">Module</TableHead>
                  {roles.map((role) => (
                    <TableHead key={role.code} className="text-center min-w-[140px]">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="cursor-help">
                              <div className="font-semibold">{role.name}</div>
                              {!isLoading && (
                                <div className="mt-1 text-[10px] font-normal text-muted-foreground">
                                  {(() => {
                                    const s = getRoleSummary(role.code);
                                    return `${s.full}F / ${s.view}V / ${s.none}H`;
                                  })()}
                                </div>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Full: {getRoleSummary(role.code).full}</p>
                            <p>View: {getRoleSummary(role.code).view}</p>
                            <p>Hidden: {getRoleSummary(role.code).none}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j} className="text-center">
                          <Skeleton className="mx-auto h-6 w-20" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  modules.map((module) => (
                    <TableRow key={module.key}>
                      <TableCell className="sticky left-0 z-[5] bg-background font-medium">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">{module.label}</span>
                            </TooltipTrigger>
                            {module.description && (
                              <TooltipContent>
                                <p>{module.description}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      {roles.map((role) => {
                        const cellKey = `${module.key}-${role.code}`;
                        const currentLevel = matrixByModule[module.key]?.[role.code] || 'none';
                        const isUpdating = updatingCell === cellKey;

                        return (
                          <TableCell key={role.code} className="relative text-center">
                            {isSuperAdmin ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild disabled={isUpdating}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-auto gap-1 px-2 py-1"
                                    disabled={isUpdating}
                                  >
                                    {getAccessBadge(currentLevel)}
                                    <ChevronDown className="h-3 w-3 opacity-50" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="center" className="z-[9999]">
                                  {ACCESS_LEVELS.map((level) => (
                                    <DropdownMenuItem
                                      key={level.value}
                                      onClick={() => handleUpdatePermission(role.code, module.key, level.value)}
                                      className="gap-2"
                                    >
                                      {level.icon}
                                      {level.label}
                                      {currentLevel === level.value && (
                                        <Check className="ml-auto h-4 w-4" />
                                      )}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              getAccessBadge(currentLevel)
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ModuleMatrixPage;
