// ============================================================
// DEPENDENCIES SECTION - COMPACT UNIFIED VIEW
// All relations (Blocked by, Blocks, Related to) in one collapsible section
// ============================================================

import { useState, useMemo } from 'react';
import { Ban, Layers, Link2, Plus, X, GitBranch, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { TaskDependency } from '../../hooks/useTaskDetails';
import { useRemoveDependency } from '../../hooks/useTaskDetails';

interface DependenciesSectionProps {
  taskId: string;
  dependencies: TaskDependency[];
}

const DEPENDENCY_CONFIG = {
  blocked_by: { 
    label: 'Blocked by', 
    icon: Ban, 
    color: 'text-red-500',
    bgColor: 'bg-red-50',
  },
  blocks: { 
    label: 'Blocks', 
    icon: Layers, 
    color: 'text-amber-500',
    bgColor: 'bg-amber-50',
  },
  related: { 
    label: 'Related', 
    icon: Link2, 
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
  },
} as const;

export function DependenciesSection({ taskId, dependencies }: DependenciesSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeAddType, setActiveAddType] = useState<string | null>(null);
  const removeDependency = useRemoveDependency();
  
  const grouped = useMemo(() => {
    const result: Record<string, TaskDependency[]> = { blocked_by: [], blocks: [], related: [] };
    dependencies?.forEach(d => result[d.dependency_type]?.push(d));
    return result;
  }, [dependencies]);

  const totalCount = dependencies?.length || 0;
  const hasAny = totalCount > 0;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Collapsible Header */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              <GitBranch className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Relations</span>
              {totalCount > 0 && (
                <span className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-semibold text-muted-foreground">
                  {totalCount}
                </span>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 text-xs px-2"
              onClick={(e) => {
                e.stopPropagation();
                setActiveAddType(activeAddType ? null : 'blocked_by');
                if (!isOpen) setIsOpen(true);
              }}
            >
              <Plus className="w-3 h-3 mr-1" />
              Add
            </Button>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-3 space-y-2">
            {/* Quick Add Type Tabs */}
            {activeAddType && (
              <div className="flex gap-1 p-1 bg-muted/50 rounded-md mb-2">
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
            {hasAny ? (
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
            ) : !activeAddType ? (
              <div className="py-3 text-center text-xs text-muted-foreground">
                No relations yet
              </div>
            ) : null}

            {/* Add New Placeholder */}
            {activeAddType && (
              <button 
                className="w-full flex items-center justify-center gap-1.5 p-2 border border-dashed border-muted-foreground/30 rounded-md text-xs text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
                onClick={() => {
                  // TODO: Open task picker modal
                  console.log('Add', activeAddType);
                }}
              >
                <Plus className="w-3 h-3" />
                Add {DEPENDENCY_CONFIG[activeAddType as keyof typeof DEPENDENCY_CONFIG]?.label.toLowerCase()}
              </button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
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
    review: 'bg-purple-500',
    planned: 'bg-blue-500',
    backlog: 'bg-gray-400',
  };

  return (
    <div className="group flex items-center gap-2 px-2 py-1.5 bg-muted/30 rounded-md hover:bg-muted/50 transition-colors">
      {/* Type Icon */}
      <div className={cn("p-1 rounded", typeConfig.bgColor)}>
        <Icon className={cn("w-3 h-3", typeConfig.color)} />
      </div>
      
      {/* Task Key */}
      <span className="text-[10px] font-bold text-muted-foreground font-mono">
        {dependency.linked_task?.key || 'N/A'}
      </span>
      
      {/* Task Title */}
      <span className="flex-1 text-xs text-foreground truncate">
        {dependency.linked_task?.title || 'Unknown task'}
      </span>
      
      {/* Status Dot */}
      <span className={cn(
        "w-1.5 h-1.5 rounded-full flex-shrink-0",
        statusColors[dependency.linked_task?.status?.slug || 'backlog'] || 'bg-gray-400'
      )} />
      
      {/* Remove Button */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-destructive/10 rounded transition-opacity"
      >
        <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
      </button>
    </div>
  );
}
