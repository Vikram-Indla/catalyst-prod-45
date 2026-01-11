/**
 * WorkItemsList — Main list view for Requirement Assist V3 generated work items
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useWorkItems, WorkItemFilters } from '@/hooks/useWorkItems';
import { Loader2, Inbox, ChevronRight, Check, FileText, Layers, List, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Database } from '@/integrations/supabase/types';

type WorkItem = Database['public']['Tables']['work_items']['Row'];

interface WorkItemsListProps {
  generationId: string;
  onItemClick?: (id: string) => void;
}

const ITEM_TYPE_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
  epic: { icon: Layers, label: 'Epic', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  feature: { icon: List, label: 'Feature', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  story: { icon: FileText, label: 'Story', color: 'bg-green-100 text-green-700 border-green-200' },
  task: { icon: CheckSquare, label: 'Task', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  prd: { icon: FileText, label: 'PRD', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  test_case: { icon: Check, label: 'Test Case', color: 'bg-teal-100 text-teal-700 border-teal-200' },
};

function WorkItemRow({ 
  item, 
  isSelected, 
  isFocused, 
  onSelect, 
  onClick,
  indentLevel = 0 
}: { 
  item: WorkItem; 
  isSelected: boolean; 
  isFocused: boolean;
  onSelect: (id: string) => void; 
  onClick?: (id: string) => void;
  indentLevel?: number;
}) {
  const config = ITEM_TYPE_CONFIG[item.item_type] || ITEM_TYPE_CONFIG.task;
  const Icon = config.icon;
  const confidencePercent = Math.round((item.confidence_score || 0.85) * 100);

  return (
    <div
      className={cn(
        'group relative flex items-center h-14 px-4 border-b border-border transition-colors',
        'hover:bg-muted/50 cursor-pointer',
        isSelected && 'bg-primary/10',
        isFocused && 'ring-2 ring-inset ring-primary',
      )}
      style={{ paddingLeft: `${16 + indentLevel * 24}px` }}
      onClick={() => onClick?.(item.id)}
      role="row"
      aria-selected={isSelected}
      tabIndex={0}
    >
      {/* Checkbox for selection */}
      <div className="flex-shrink-0 mr-3">
        <Checkbox
          checked={item.is_selected}
          onCheckedChange={() => onSelect?.(item.id)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select ${item.display_id}`}
        />
      </div>

      {/* Type Icon */}
      <div className="flex-shrink-0 mr-3">
        <div className={cn('p-1.5 rounded', config.color)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      {/* Display ID */}
      <button
        className="flex-shrink-0 mr-3 font-mono text-sm font-medium text-primary hover:underline"
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(item.id);
        }}
      >
        {item.display_id}
      </button>

      {/* Title */}
      <div className="flex-1 min-w-0 mr-4">
        <span className="text-sm text-foreground truncate block">
          {item.title}
        </span>
      </div>

      {/* Confidence Score */}
      <div className="flex-shrink-0 mr-4">
        <Badge 
          variant="outline" 
          className={cn(
            'text-xs',
            confidencePercent >= 85 ? 'border-green-300 text-green-700' :
            confidencePercent >= 70 ? 'border-yellow-300 text-yellow-700' :
            'border-red-300 text-red-700'
          )}
        >
          {confidencePercent}%
        </Badge>
      </div>

      {/* Type Badge */}
      <div className="flex-shrink-0">
        <Badge variant="secondary" className="text-xs">
          {config.label}
        </Badge>
      </div>

      {/* Expand Arrow */}
      <div className="flex-shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </div>
  );
}

export function WorkItemsList({ generationId, onItemClick }: WorkItemsListProps) {
  const [filters, setFilters] = useState<WorkItemFilters>({
    item_type: 'all',
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState(0);

  const { data: items = [], isLoading, error } = useWorkItems(generationId, filters);

  const handleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'j':
        case 'arrowdown':
          e.preventDefault();
          setFocusedIndex(prev => Math.min(prev + 1, items.length - 1));
          break;
        case 'k':
        case 'arrowup':
          e.preventDefault();
          setFocusedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'x':
          e.preventDefault();
          if (items[focusedIndex]) {
            handleSelect(items[focusedIndex].id);
          }
          break;
        case 'enter':
          e.preventDefault();
          if (items[focusedIndex]) {
            onItemClick?.(items[focusedIndex].id);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, focusedIndex, handleSelect, onItemClick]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-destructive">
        Error loading work items
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Simple Filter Bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
        {['all', 'epic', 'feature', 'story', 'task'].map((type) => (
          <button
            key={type}
            onClick={() => setFilters({ item_type: type })}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              filters.item_type === type
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {type === 'all' ? 'All' : ITEM_TYPE_CONFIG[type]?.label || type}
          </button>
        ))}
        <div className="ml-auto text-sm text-muted-foreground">
          {items.length} items
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-10">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Inbox className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No work items found</p>
            <p className="text-sm">Generate work items from your requirements</p>
          </div>
        ) : (
          items.map((item, index) => (
            <WorkItemRow
              key={item.id}
              item={item}
              isSelected={selectedIds.has(item.id)}
              isFocused={index === focusedIndex}
              onSelect={handleSelect}
              onClick={onItemClick}
              indentLevel={item.level || 0}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default WorkItemsList;
