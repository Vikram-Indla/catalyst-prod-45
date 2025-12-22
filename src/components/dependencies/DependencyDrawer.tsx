// =====================================================
// DEPENDENCY DRAWER COMPONENT
// Slide-out panel showing all dependencies for an item
// =====================================================

import React from 'react';
import { Link2, Check, Trash2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { 
  useDependenciesForItem, 
  useDeleteDependency,
  useUpdateDependency 
} from '@/hooks/useDependencies';
import { WorkItemType, STATUS_CONFIG, WorkflowStatus } from '@/types/views';

interface DependencyDrawerProps {
  open: boolean;
  onClose: () => void;
  itemType: WorkItemType;
  itemId: string;
  itemIdentifier: string;
  itemTitle: string;
  onAddDependency?: () => void;
}

export function DependencyDrawer({
  open,
  onClose,
  itemType,
  itemId,
  itemIdentifier,
  itemTitle,
  onAddDependency
}: DependencyDrawerProps) {
  const { data, isLoading } = useDependenciesForItem(itemType, itemId);
  const deleteMutation = useDeleteDependency();
  const updateMutation = useUpdateDependency();

  const handleResolve = (dependencyId: string) => {
    updateMutation.mutate({ id: dependencyId, input: { is_resolved: true } });
  };

  const handleDelete = (dependencyId: string) => {
    if (confirm('Remove this dependency?')) {
      deleteMutation.mutate(dependencyId);
    }
  };

  const getStatusConfig = (status: string | undefined) => {
    if (!status) return { bgColor: 'hsl(var(--muted))', textColor: 'hsl(var(--muted-foreground))', label: 'Unknown' };
    const config = STATUS_CONFIG[status as WorkflowStatus];
    return config || { bgColor: 'hsl(var(--muted))', textColor: 'hsl(var(--muted-foreground))', label: status };
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[450px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            Dependencies
          </SheetTitle>
          <div className="text-sm text-muted-foreground">
            <span className="font-mono text-primary">{itemIdentifier}</span>
            <span className="mx-2">·</span>
            <span>{itemTitle}</span>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Blocked By Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                BLOCKED BY ({data?.blockedBy.length || 0})
              </h4>
            </div>
            
            {data?.blockedBy.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No blockers</p>
            ) : (
              <div className="space-y-2">
                {data?.blockedBy.map((dep) => {
                  const statusConfig = getStatusConfig(dep.blocker_item?.status);
                  return (
                    <div
                      key={dep.id}
                      className="p-3 rounded-lg border bg-destructive/5 border-destructive/20"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-sm text-primary">
                          {dep.blocker_item?.identifier}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResolve(dep.id)}
                            className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                            title="Mark as resolved"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(dep.id)}
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Remove dependency"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm truncate">{dep.blocker_item?.title}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                          style={{
                            background: statusConfig.bgColor,
                            color: statusConfig.textColor
                          }}
                        >
                          {statusConfig.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Blocks Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                BLOCKS ({data?.blocking.length || 0})
              </h4>
            </div>
            
            {data?.blocking.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Not blocking anything</p>
            ) : (
              <div className="space-y-2">
                {data?.blocking.map((dep) => {
                  const statusConfig = getStatusConfig(dep.dependent_item?.status);
                  return (
                    <div
                      key={dep.id}
                      className="p-3 rounded-lg border"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-sm text-primary">
                          {dep.dependent_item?.identifier}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(dep.id)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Remove dependency"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-sm truncate">{dep.dependent_item?.title}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                          style={{
                            background: statusConfig.bgColor,
                            color: statusConfig.textColor
                          }}
                        >
                          {statusConfig.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add Dependency Button */}
          {onAddDependency && (
            <Button
              onClick={onAddDependency}
              variant="outline"
              className="w-full border-dashed border-primary text-primary hover:bg-primary/5"
            >
              <Link2 className="w-4 h-4 mr-2" />
              Add Dependency
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
