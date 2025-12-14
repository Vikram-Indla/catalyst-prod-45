import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ControlsBarProps {
  viewMode: 'list' | 'gantt';
  groupBy: string;
  onGroupByChange: (group: string) => void;
}

export function ControlsBar({
  viewMode,
  groupBy,
  onGroupByChange,
}: ControlsBarProps) {
  // Only show for list view with grouping options
  if (viewMode !== 'list') return null;

  return (
    <div 
      className="h-[44px] flex items-center px-6 border-b bg-muted/30"
      style={{ borderColor: 'hsl(var(--border))' }}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Group by:</span>
        <Select value={groupBy} onValueChange={onGroupByChange}>
          <SelectTrigger className="w-[140px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[400]">
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="status">Status</SelectItem>
            <SelectItem value="quarter">Quarter</SelectItem>
            <SelectItem value="resource">Resource</SelectItem>
            <SelectItem value="type">Type</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
