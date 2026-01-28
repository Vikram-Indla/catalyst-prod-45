// ============================================================
// DEPENDENCIES SECTION - CONTENT ONLY (no header, wrapped by CollapsibleSection)
// Now with working task picker for adding relations
// ============================================================

import { useState, useMemo } from 'react';
import { Ban, Layers, Link2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { TaskDependency } from '../../hooks/useTaskDetails';
import { useRemoveDependency, useAddDependency } from '../../hooks/useTaskDetails';
import { TaskPicker } from './TaskPicker';

interface DependenciesSectionProps {
  taskId: string;
  dependencies: TaskDependency[];
}

const DEPENDENCY_CONFIG = {
  blocked_by: { 
    label: 'Blocked by', 
    icon: Ban, 
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
  },
  blocks: { 
    label: 'Blocks', 
    icon: Layers, 
    color: 'text-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-500/10',
  },
  related: { 
    label: 'Related', 
    icon: Link2, 
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
} as const;

export function DependenciesSection({ taskId, dependencies }: DependenciesSectionProps) {
  const [activeAddType, setActiveAddType] = useState<string | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const removeDependency = useRemoveDependency();
  const addDependency = useAddDependency();
  
  const grouped = useMemo(() => {
    const result: Record<string, TaskDependency[]> = { blocked_by: [], blocks: [], related: [] };
    dependencies?.forEach(d => result[d.dependency_type]?.push(d));
    return result;
  }, [dependencies]);

  const hasAny = (dependencies?.length || 0) > 0;

  const handleSelectTask = async (linkedTaskId: string) => {
    if (!activeAddType) return;
    
    try {
      await addDependency.mutateAsync({
        taskId,
        dependsOnTaskId: linkedTaskId,
        type: activeAddType,
      });
      toast.success('Relation added');
    } catch (err) {
      console.error('Failed to add relation:', err);
      toast.error('Failed to add relation');
    }
  };

  // CONTENT ONLY - no header (CollapsibleSection provides the header)
  return (
    <div className="space-y-2">
      {/* Quick Add Type Tabs */}
      {activeAddType && (
        <div className="flex gap-1 p-1 bg-muted/50 rounded-md">
          {Object.entries(DEPENDENCY_CONFIG).map(([type, cfg]) => (
            <button
              key={type}
              onClick={() => setActiveAddType(type)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-colors",
                activeAddType === type 
                  ? "bg-background shadow-sm text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <cfg.icon className="w-3 h-3" />
              {cfg.label}
            </button>
          ))}
        </div>
      )}

      {/* Existing Relations - Compact List */}
      {hasAny && (
        <div className="space-y-1">
          {Object.entries(grouped).map(([type, items]) => {
            if (items.length === 0) return null;
            const cfg = DEPENDENCY_CONFIG[type as keyof typeof DEPENDENCY_CONFIG];
            const Icon = cfg.icon;
            
            return items.map(dep => (
              <DependencyItem 
                key={dep.id} 
                dependency={dep}
                typeConfig={cfg}
                Icon={Icon}
                onRemove={() => removeDependency.mutate(dep.id)}
              />
            ));
          })}
        </div>
      )}

      {/* Add New */}
      {activeAddType ? (
        <button 
          className="w-full flex items-center justify-center gap-1.5 p-2 border border-dashed border-muted-foreground/30 rounded-lg text-xs text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
          onClick={() => setIsPickerOpen(true)}
        >
          <Plus className="w-3 h-3" />
          Add {DEPENDENCY_CONFIG[activeAddType as keyof typeof DEPENDENCY_CONFIG]?.label.toLowerCase()}
        </button>
      ) : (
        <button 
          onClick={() => setActiveAddType('blocked_by')}
          className="w-full flex items-center gap-2 p-2 border border-dashed border-muted-foreground/30 rounded-lg text-xs text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add relation...
        </button>
      )}

      {/* Task Picker Modal */}
      <TaskPicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={handleSelectTask}
        excludeTaskId={taskId}
        title={`Add "${DEPENDENCY_CONFIG[activeAddType as keyof typeof DEPENDENCY_CONFIG]?.label || 'relation'}"`}
      />
    </div>
  );
}

function DependencyItem({ 
  dependency, 
  typeConfig,
  Icon,
  onRemove 
}: { 
  dependency: TaskDependency; 
  typeConfig: typeof DEPENDENCY_CONFIG[keyof typeof DEPENDENCY_CONFIG];
  Icon: typeof Ban;
  onRemove: () => void;
}) {
  const statusColors: Record<string, string> = {
    done: 'bg-emerald-500',
    'in-progress': 'bg-amber-500',
    in_progress: 'bg-amber-500',
    review: 'bg-violet-500',
    planned: 'bg-blue-500',
    backlog: 'bg-muted-foreground/50',
  };

  return (
    <div className="group flex items-center gap-2 px-2 py-1.5 bg-muted/30 rounded-md hover:bg-muted/50 transition-colors">
      <div className={cn("p-1 rounded", typeConfig.bgColor)}>
        <Icon className={cn("w-3 h-3", typeConfig.color)} />
      </div>
      
      <span className="text-[10px] font-bold text-muted-foreground font-mono">
        {dependency.linked_task?.key || 'N/A'}
      </span>
      
      <span className="flex-1 text-xs text-foreground truncate">
        {dependency.linked_task?.title || 'Unknown task'}
      </span>
      
      <span className={cn(
        "w-1.5 h-1.5 rounded-full flex-shrink-0",
        statusColors[dependency.linked_task?.status?.slug || 'backlog'] || 'bg-muted-foreground/50'
      )} />
      
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-destructive/10 rounded transition-opacity"
      >
        <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
      </button>
    </div>
  );
}
