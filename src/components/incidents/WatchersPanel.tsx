import { Eye, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/release/UserAvatar';
import type { Assignee } from '@/types/release';

interface WatchersPanelProps {
  watchers: Assignee[];
  isEditMode: boolean;
  onRemoveWatcher?: (id: string) => void;
  onAddWatcher?: () => void;
}

export function WatchersPanel({
  watchers,
  isEditMode,
  onRemoveWatcher,
  onAddWatcher,
}: WatchersPanelProps) {
  return (
    // Dark mode compliant: uses semantic tokens
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold text-foreground">Watchers</h4>
        </div>
        <span className="text-xs text-muted-foreground">{watchers.length}</span>
      </div>

      <div className="space-y-2">
        {watchers.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">No watchers</p>
        ) : (
          watchers.map(watcher => (
            <div 
              key={watcher.id} 
              className="flex items-center justify-between p-2 rounded-md hover:bg-muted group"
            >
              <div className="flex items-center gap-2">
                <UserAvatar initials={watcher.initials} size="sm" />
                <span className="text-sm text-muted-foreground">{watcher.name}</span>
              </div>
              {isEditMode && onRemoveWatcher && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:text-destructive"
                  onClick={() => onRemoveWatcher(watcher.id)}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add button uses blue accent - compliant */}
      <Button 
        variant="ghost" 
        size="sm" 
        className="w-full mt-2 h-8 text-[#3b82f6] hover:text-[#2563eb] hover:bg-[rgba(59,130,246,0.1)] dark:text-[#60a5fa] dark:hover:text-[#93c5fd]"
        onClick={onAddWatcher}
      >
        <Plus className="w-3.5 h-3.5 mr-1" />
        Add Watcher
      </Button>
    </div>
  );
}
