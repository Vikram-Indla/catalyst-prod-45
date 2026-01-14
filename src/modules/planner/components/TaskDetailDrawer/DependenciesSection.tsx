// ============================================================
// DEPENDENCIES SECTION COMPONENT
// Blocked by, Blocks, Related task links
// ============================================================

import { useMemo, useState } from 'react';
import { Ban, Layers, Link2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionHeader } from './SectionHeader';
import { cn } from '@/lib/utils';
import { CATALYST_COLORS } from '../../types/kanban';
import type { TaskDependency } from '../../hooks/useTaskDetails';
import { useRemoveDependency } from '../../hooks/useTaskDetails';

interface DependenciesSectionProps {
  taskId: string;
  dependencies: TaskDependency[];
}

const DEP_TYPES = {
  blocked_by: { 
    label: 'Blocked by', 
    icon: Ban, 
    color: CATALYST_COLORS.danger 
  },
  blocks: { 
    label: 'Blocks', 
    icon: Layers, 
    color: CATALYST_COLORS.warning 
  },
  related: { 
    label: 'Related to', 
    icon: Link2, 
    color: CATALYST_COLORS.gray500 
  },
} as const;

export function DependenciesSection({ taskId, dependencies }: DependenciesSectionProps) {
  const removeDependency = useRemoveDependency();
  
  const grouped = useMemo(() => {
    const result: Record<string, TaskDependency[]> = {
      blocked_by: [],
      blocks: [],
      related: [],
    };
    dependencies?.forEach(d => {
      if (result[d.dependency_type]) {
        result[d.dependency_type].push(d);
      }
    });
    return result;
  }, [dependencies]);

  return (
    <div className="space-y-4">
      <SectionHeader 
        icon={Link2} 
        title="Dependencies" 
        badge={dependencies?.length || 0}
        action={
          <Button variant="ghost" size="sm" className="h-7 text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add
          </Button>
        }
      />
      
      <div className="space-y-4">
        {Object.entries(DEP_TYPES).map(([type, config]) => {
          const items = grouped[type] || [];
          const Icon = config.icon;
          
          if (items.length === 0 && type !== 'related') return null;
          
          return (
            <div key={type} className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon className="w-3.5 h-3.5" style={{ color: config.color }} />
                {config.label}
              </div>
              
              <div className="space-y-1.5 pl-5">
                {items.map(dep => (
                  <DependencyItem 
                    key={dep.id} 
                    dependency={dep}
                    onRemove={() => removeDependency.mutate(dep.id)}
                  />
                ))}
                
                {items.length === 0 && (
                  <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
                    <Plus className="w-3 h-3" />
                    Add {type.replace('_', ' ')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DependencyItem({ 
  dependency, 
  onRemove 
}: { 
  dependency: TaskDependency;
  onRemove: () => void;
}) {
  const statusColor = {
    done: CATALYST_COLORS.success,
    'in-progress': CATALYST_COLORS.warning,
    planned: CATALYST_COLORS.primary,
    review: CATALYST_COLORS.purple,
    backlog: CATALYST_COLORS.gray400,
  }[dependency.linked_task.status?.slug || 'backlog'];

  return (
    <div className="group flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <span className="text-xs font-mono text-primary font-medium">
        {dependency.linked_task.key}
      </span>
      <span className="text-sm text-foreground/80 truncate flex-1">
        {dependency.linked_task.title}
      </span>
      <span 
        className="w-2 h-2 rounded-full flex-shrink-0" 
        style={{ backgroundColor: statusColor }}
      />
      <button 
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded transition-opacity"
      >
        <X className="w-3 h-3 text-muted-foreground" />
      </button>
    </div>
  );
}
