import { useState } from 'react';
import { useWorkItemLabels, WorkItemLabel } from '@/hooks/useWorkItemLabels';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tag, Plus, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const LABEL_COLORS: Record<string, string> = {
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  yellow: 'bg-yellow-500',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
  cyan: 'bg-cyan-500',
  gray: 'bg-gray-500',
};

interface WorkItemLabelSelectorProps {
  entityType: 'epic' | 'feature' | 'story';
  entityId: string;
  onManageLabels?: () => void;
  compact?: boolean;
}

export function WorkItemLabelSelector({ 
  entityType, 
  entityId, 
  onManageLabels,
  compact = false 
}: WorkItemLabelSelectorProps) {
  const [open, setOpen] = useState(false);
  const { allLabels, assignedLabels, toggleLabel, isLoading } = useWorkItemLabels(entityType, entityId);

  const assignedLabelIds = new Set(assignedLabels.map(l => l.id));

  const getColorClass = (color: string) => {
    return LABEL_COLORS[color] || 'bg-blue-500';
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading labels...</div>;
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {assignedLabels.map((label) => (
        <Badge
          key={label.id}
          className={cn(
            "text-xs px-2 py-0.5 font-medium border-0 text-white",
            getColorClass(label.color)
          )}
        >
          {label.name}
        </Badge>
      ))}
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn(
              "gap-1 text-muted-foreground hover:text-foreground",
              compact ? "h-6 px-1" : "h-7 px-2"
            )}
          >
            <Tag className="h-3.5 w-3.5" />
            {!compact && <Plus className="h-3 w-3" />}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="start">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Labels</h4>
              {onManageLabels && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setOpen(false);
                    onManageLabels();
                  }}
                  className="h-auto p-1 text-xs gap-1"
                >
                  <Settings className="h-3 w-3" />
                  Manage
                </Button>
              )}
            </div>
            
            <div className="space-y-1 max-h-64 overflow-auto">
              {allLabels.map((label) => (
                <div
                  key={label.id}
                  className="flex items-center gap-2 p-2 hover:bg-accent rounded cursor-pointer transition-colors"
                  onClick={() => toggleLabel(label.id)}
                >
                  <Checkbox 
                    checked={assignedLabelIds.has(label.id)} 
                    className="pointer-events-none"
                  />
                  <div className={cn("w-3 h-3 rounded-full", getColorClass(label.color))} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{label.name}</span>
                    {label.description && (
                      <p className="text-xs text-muted-foreground truncate">{label.description}</p>
                    )}
                  </div>
                </div>
              ))}
              {allLabels.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No labels available
                </p>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
