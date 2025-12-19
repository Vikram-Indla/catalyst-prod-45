/**
 * EpicDependenciesTab - Bidirectional Dependencies View
 * 
 * Shows both Outgoing and Incoming dependencies for an Epic.
 * - Outgoing: This Epic depends on something else
 * - Incoming: Other work items depend on this Epic
 * 
 * No CSS changes - uses existing Catalyst components only.
 */

import { useState } from 'react';
import { useWorkItemDependencies, WorkItemDependency } from '@/hooks/useWorkItemDependencies';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, ArrowRight, ArrowLeft, AlertTriangle, Clock, CheckCircle2, ExternalLink } from 'lucide-react';
import { CreateDependencyDialog } from '@/components/dependencies/CreateDependencyDialog';
import { DependencyDetailsDrawer } from '@/components/dependencies/DependencyDetailsDrawer';
import { DEPENDENCY_TYPE_LABELS, DEPENDENCY_LEVEL_LABELS } from '@/lib/dependencies/types';
import { format } from 'date-fns';

interface EpicDependenciesTabProps {
  epicId: string;
  epicName?: string;
}

export function EpicDependenciesTab({ epicId, epicName }: EpicDependenciesTabProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedDependencyId, setSelectedDependencyId] = useState<string | null>(null);
  
  const { outgoing, incoming, isLoading } = useWorkItemDependencies('epic', epicId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">Dependencies</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {outgoing.length + incoming.length} total dependencies
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Dependency
        </Button>
      </div>

      {/* Outgoing Dependencies Section */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <ArrowRight className="h-4 w-4 text-brand-primary" />
          <h4 className="text-sm font-medium">Outgoing Dependencies</h4>
          <Badge variant="secondary" className="text-xs">{outgoing.length}</Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          This Epic depends on the following work items
        </p>
        {outgoing.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-md">
            No outgoing dependencies
          </div>
        ) : (
          <div className="space-y-2">
            {outgoing.map(dep => (
              <DependencyRow 
                key={dep.id} 
                dependency={dep}
                onSelect={() => setSelectedDependencyId(dep.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Incoming Dependencies Section */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <ArrowLeft className="h-4 w-4 text-amber-600" />
          <h4 className="text-sm font-medium">Incoming Dependencies</h4>
          <Badge variant="secondary" className="text-xs">{incoming.length}</Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          These work items depend on this Epic
        </p>
        {incoming.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-md">
            No incoming dependencies
          </div>
        ) : (
          <div className="space-y-2">
            {incoming.map(dep => (
              <DependencyRow 
                key={dep.id} 
                dependency={dep}
                onSelect={() => setSelectedDependencyId(dep.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Create Dialog */}
      <CreateDependencyDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        defaultRequestingWorkItemId={epicId}
        defaultRequestingWorkItemType="epic"
      />

      {/* Details Drawer */}
      <DependencyDetailsDrawer
        open={!!selectedDependencyId}
        onClose={() => setSelectedDependencyId(null)}
        dependencyId={selectedDependencyId || undefined}
      />
    </div>
  );
}

interface DependencyRowProps {
  dependency: WorkItemDependency;
  onSelect: () => void;
}

function DependencyRow({ dependency, onSelect }: DependencyRowProps) {
  const isOutgoing = dependency.direction === 'outgoing';
  const linkedItem = isOutgoing 
    ? { key: dependency.target_key, name: dependency.target_name, type: dependency.target_type }
    : { key: dependency.source_key, name: dependency.source_name, type: dependency.source_type };

  const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
    draft: { variant: 'outline', icon: Clock },
    pending_commit: { variant: 'outline', icon: Clock },
    committed: { variant: 'default', icon: CheckCircle2 },
    in_progress: { variant: 'secondary', icon: Clock },
    delivered: { variant: 'default', icon: CheckCircle2 },
    cancelled: { variant: 'outline', icon: AlertTriangle },
    not_required: { variant: 'outline', icon: AlertTriangle },
  };

  const config = statusConfig[dependency.status || 'draft'] || { variant: 'outline' as const, icon: Clock };
  const StatusIcon = config.icon;

  return (
    <div 
      className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={onSelect}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Direction indicator */}
        <div className="flex-shrink-0">
          {isOutgoing ? (
            <Badge variant="outline" className="text-xs bg-brand-primary/10 text-brand-primary border-brand-primary/30">
              Outgoing
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
              Incoming
            </Badge>
          )}
        </div>

        {/* Type badge */}
        <Badge variant="secondary" className="text-xs flex-shrink-0">
          {linkedItem.type === 'epic' ? 'E' : 'F'}
        </Badge>

        {/* Work item info */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">{linkedItem.key}</span>
            <span className="text-sm font-medium truncate">{linkedItem.name}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">
              {DEPENDENCY_TYPE_LABELS[dependency.dependency_type as keyof typeof DEPENDENCY_TYPE_LABELS] || dependency.dependency_type}
            </span>
            {dependency.is_cross_level && (
              <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/30">
                Cross-Level
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Blocked indicators */}
        {(dependency.source_blocked || dependency.target_delayed) && (
          <AlertTriangle className="h-4 w-4 text-destructive" />
        )}

        {/* Status badge */}
        <Badge variant={config.variant} className="text-xs gap-1">
          <StatusIcon className="h-3 w-3" />
          {(dependency.status || 'Draft').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </Badge>

        {/* Date */}
        {dependency.needed_by_date && (
          <span className="text-xs text-muted-foreground">
            {format(new Date(dependency.needed_by_date), 'MMM d')}
          </span>
        )}

        <ExternalLink className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}
