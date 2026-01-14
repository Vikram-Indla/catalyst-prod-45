// ============================================================
// DEPENDENCIES SECTION - POLISHED
// All 3 sections: Blocked by, Blocks, Related to
// ============================================================

import { useMemo } from 'react';
import { Ban, Layers, Link2, Plus, X, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TaskDependency } from '../../hooks/useTaskDetails';
import { useRemoveDependency } from '../../hooks/useTaskDetails';

interface DependenciesSectionProps {
  taskId: string;
  dependencies: TaskDependency[];
}

const DEPENDENCY_TYPES = [
  { 
    type: 'blocked_by', 
    label: 'Blocked by', 
    icon: Ban, 
    color: 'text-red-500',
    description: 'Tasks that must complete first'
  },
  { 
    type: 'blocks', 
    label: 'Blocks', 
    icon: Layers, 
    color: 'text-amber-500',
    description: 'Tasks waiting on this'
  },
  { 
    type: 'related', 
    label: 'Related to', 
    icon: Link2, 
    color: 'text-gray-500',
    description: 'Related tasks'
  },
];

export function DependenciesSection({ taskId, dependencies }: DependenciesSectionProps) {
  const removeDependency = useRemoveDependency();
  
  const grouped = useMemo(() => {
    const result: Record<string, TaskDependency[]> = { blocked_by: [], blocks: [], related: [] };
    dependencies?.forEach(d => result[d.dependency_type]?.push(d));
    return result;
  }, [dependencies]);

  const totalCount = dependencies?.length || 0;

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">Dependencies</span>
          {totalCount > 0 && (
            <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[11px] font-semibold text-gray-500">
              {totalCount}
            </span>
          )}
        </div>
        <Button variant="outline" size="sm" className="h-7 text-xs">
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add
        </Button>
      </div>

      {/* ALL THREE Dependency Groups */}
      <div className="space-y-3">
        {DEPENDENCY_TYPES.map(({ type, label, icon: Icon, color }) => {
          const items = grouped[type] || [];
          
          return (
            <div key={type} className="bg-gray-50 rounded-lg p-3">
              <div className={cn("flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-2", color)}>
                <Icon className="w-3 h-3" />
                {label}
              </div>
              
              {items.length > 0 ? (
                <div className="space-y-1.5">
                  {items.map(dep => (
                    <DependencyCard 
                      key={dep.id} 
                      dependency={dep} 
                      onRemove={() => removeDependency.mutate(dep.id)}
                    />
                  ))}
                </div>
              ) : (
                <button className="w-full flex items-center justify-center gap-1.5 p-2.5 border border-dashed border-gray-300 rounded-md text-xs text-gray-400 hover:border-primary hover:text-primary hover:bg-blue-50/50 transition-all">
                  <Plus className="w-3 h-3" />
                  Add {label.toLowerCase()}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DependencyCard({ dependency, onRemove }: { dependency: TaskDependency; onRemove: () => void }) {
  const statusColors: Record<string, string> = {
    done: 'bg-emerald-500',
    'in-progress': 'bg-amber-500',
    in_progress: 'bg-amber-500',
    review: 'bg-purple-500',
    planned: 'bg-blue-500',
    backlog: 'bg-gray-400',
  };

  return (
    <div className="group flex items-center gap-2.5 p-2 bg-white border border-gray-200 rounded-md hover:border-primary hover:shadow-sm transition-all cursor-pointer">
      <span className="text-[10px] font-bold text-gray-400 font-mono">
        {dependency.linked_task?.key || 'N/A'}
      </span>
      <span className="flex-1 text-xs text-gray-700 truncate">
        {dependency.linked_task?.title || 'Unknown task'}
      </span>
      <span className={cn(
        "w-1.5 h-1.5 rounded-full",
        statusColors[dependency.linked_task?.status?.slug || 'backlog'] || 'bg-gray-400'
      )} />
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded transition-opacity"
      >
        <X className="w-3 h-3 text-gray-400" />
      </button>
    </div>
  );
}
