import { Eye, EyeOff, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useWorkItemWatchers } from '@/hooks/useWorkItemWatchers';

interface WorkItemWatchersProps {
  workItemType: string;
  workItemId: string;
}

export function WorkItemWatchers({ workItemType, workItemId }: WorkItemWatchersProps) {
  const { watchers, isLoading, isWatching, toggleWatch, isPending, currentUser } = useWorkItemWatchers(workItemType, workItemId);

  const getInitials = (userId: string) => {
    return userId.substring(0, 2).toUpperCase();
  };

  return (
    <div className="flex items-center gap-1">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isWatching ? "default" : "ghost"}
              size="sm"
              onClick={toggleWatch}
              disabled={isPending || !currentUser}
              className={isWatching ? "bg-brand-gold hover:bg-brand-gold-hover h-8 px-2" : "h-8 px-2"}
            >
              {isWatching ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isWatching ? 'Stop watching' : 'Watch this item'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2 gap-1">
            <Users className="h-4 w-4" />
            <span className="text-xs">{watchers.length}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="end">
          <div className="space-y-2">
            <p className="text-sm font-medium">Watchers ({watchers.length})</p>
            {isLoading ? (
              <p className="text-xs text-muted-foreground">Loading...</p>
            ) : watchers.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {watchers.map((watcher) => (
                  <div key={watcher.id} className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-brand-gold/20 text-brand-gold text-xs">
                        {getInitials(watcher.user_id)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                      {watcher.user_id === currentUser?.id ? 'You' : 'User'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No watchers yet</p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
