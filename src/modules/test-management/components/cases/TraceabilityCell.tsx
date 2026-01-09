/**
 * Traceability Cell Component
 * Shows linked items count with expandable popover
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Link2, BookOpen, Layers, Flag, AlertTriangle, AlertCircle, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LinkedItem {
  id: string;
  key: string;
  title: string;
  type: 'story' | 'feature' | 'epic' | 'defect' | 'incident';
}

interface TraceabilityCellProps {
  linkedItems: LinkedItem[];
  onItemClick?: (item: LinkedItem) => void;
}

const TYPE_CONFIG: Record<LinkedItem['type'], { 
  icon: LucideIcon; 
  className: string; 
  prefix: string;
}> = {
  story: { 
    icon: BookOpen, 
    className: 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400', 
    prefix: 'STORY' 
  },
  feature: { 
    icon: Layers, 
    className: 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400', 
    prefix: 'FEAT' 
  },
  epic: { 
    icon: Flag, 
    className: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400', 
    prefix: 'EPIC' 
  },
  defect: { 
    icon: AlertTriangle, 
    className: 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400', 
    prefix: 'DEF' 
  },
  incident: { 
    icon: AlertCircle, 
    className: 'bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400', 
    prefix: 'INC' 
  },
};

export function TraceabilityCell({ linkedItems, onItemClick }: TraceabilityCellProps) {
  const [open, setOpen] = useState(false);

  if (!linkedItems || linkedItems.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  const count = linkedItems.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-1.5 text-sm text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          <Link2 className="h-3.5 w-3.5" />
          {count} linked
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-0"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3 py-2 border-b border-border">
          <h4 className="font-medium text-sm">Linked Items ({count})</h4>
        </div>

        <div className="max-h-[200px] overflow-y-auto py-1">
          {linkedItems.map((item) => {
            const config = TYPE_CONFIG[item.type];
            const Icon = config.icon;
            
            return (
              <div
                key={`${item.type}-${item.id}`}
                className="flex items-center gap-2 px-3 py-2 hover:bg-accent cursor-pointer"
                onClick={() => {
                  onItemClick?.(item);
                  setOpen(false);
                }}
              >
                <Badge 
                  variant="secondary" 
                  className={cn("text-[10px] font-mono shrink-0", config.className)}
                >
                  <Icon className="h-3 w-3 mr-1" />
                  {item.key}
                </Badge>
                <span className="text-sm truncate text-muted-foreground">
                  {item.title}
                </span>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
