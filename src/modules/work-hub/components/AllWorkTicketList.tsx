import React from 'react';
import { ChevronRight, Zap, Bug, Bookmark, CircleDot, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CatalystOwnerAvatar } from '@/components/ui/catalyst';

interface WorkItem {
  id: string;
  type: 'Feature' | 'Story' | 'Task' | 'Defect' | 'Subtask';
  key: string;
  summary: string;
  status: string;
  statusCategory: 'todo' | 'in_progress' | 'done';
  reporter: string;
  assignee: string | null;
  created: string;
  parent: string | null;
  parentType?: 'Feature' | 'Epic';
  children?: WorkItem[];
}

interface AllWorkTicketListProps {
  items: WorkItem[];
  selectedItemId: string | null;
  onSelectItem: (item: WorkItem) => void;
  onNavigateToParent?: (parentKey: string, parentType: 'Feature' | 'Epic') => void;
}

const typeIcons: Record<string, { icon: React.ReactNode; bgColor: string }> = {
  Feature: { icon: <Zap className="h-3 w-3 text-white" />, bgColor: 'bg-amber-500' },
  Story: { icon: <Bookmark className="h-3 w-3 text-white" />, bgColor: 'bg-green-500' },
  Task: { icon: <CheckSquare className="h-3 w-3 text-white" />, bgColor: 'bg-blue-500' },
  Defect: { icon: <Bug className="h-3 w-3 text-white" />, bgColor: 'bg-red-500' },
  Subtask: { icon: <CircleDot className="h-3 w-3 text-white" />, bgColor: 'bg-gray-500' },
};

// Status - NEUTRAL STYLING (no colors per status)
const neutralStatusStyle = 'bg-muted/50 text-foreground border border-border';

export function AllWorkTicketList({ 
  items, 
  selectedItemId, 
  onSelectItem,
  onNavigateToParent 
}: AllWorkTicketListProps) {
  // Flatten items for the list view
  const flattenItems = (items: WorkItem[]): WorkItem[] => {
    const result: WorkItem[] = [];
    const flatten = (items: WorkItem[]) => {
      items.forEach(item => {
        result.push(item);
        if (item.children) {
          flatten(item.children);
        }
      });
    };
    flatten(items);
    return result;
  };

  const flatItems = flattenItems(items);

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border bg-muted">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          {flatItems.length} Issues
        </span>
      </div>

      {/* Ticket List */}
      <div className="flex-1 overflow-y-auto">
        {flatItems.map((item) => {
          const typeInfo = typeIcons[item.type] || typeIcons['Task'];
          const isSelected = item.id === selectedItemId;

          return (
            <div
              key={item.id}
              onClick={() => onSelectItem(item)}
              className={cn(
                'flex items-start gap-2 px-3 py-2 border-b border-border/50 cursor-pointer transition-colors',
                isSelected 
                  ? 'bg-[#2563eb]/10 border-l-2 border-l-[#2563eb]' 
                  : 'hover:bg-muted border-l-2 border-l-transparent'
              )}
            >
              {/* Type Icon */}
              <div className={cn('w-5 h-5 rounded flex-shrink-0 flex items-center justify-center mt-0.5', typeInfo.bgColor)}>
                {typeInfo.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Key */}
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[12px] font-medium text-[#2563eb] dark:text-[#60a5fa]">{item.key}</span>
                  <span className="catalyst-status text-[9px] font-medium uppercase px-1.5 py-0.5 rounded bg-muted/50 text-foreground border border-border">
                    {item.status}
                  </span>
                </div>

                {/* Summary */}
                <p className="text-[12px] text-foreground line-clamp-2 leading-tight">
                  {item.summary}
                </p>

                {/* Parent Link */}
                {item.parent && (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[10px] text-muted-foreground">Parent:</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToParent?.(item.parent!, item.parentType || 'Feature');
                      }}
                      className="text-[10px] text-[#2563eb] dark:text-[#60a5fa] hover:underline flex items-center gap-0.5"
                    >
                      {item.parent}
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                )}

                {/* Assignee */}
                {item.assignee && (
                  <div className="flex items-center gap-1 mt-1">
                    <CatalystOwnerAvatar name={item.assignee} size="xs" showTooltip={false} />
                    <span className="text-[10px] text-muted-foreground">{item.assignee}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
