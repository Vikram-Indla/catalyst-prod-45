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
    <div className="bg-white border border-[#E8E8E8] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-[#8C8C8C]" />
          <h4 className="text-sm font-semibold text-[#172B4D]">Watchers</h4>
        </div>
        <span className="text-xs text-[#8C8C8C]">{watchers.length}</span>
      </div>

      <div className="space-y-2">
        {watchers.length === 0 ? (
          <p className="text-xs text-[#8C8C8C] text-center py-2">No watchers</p>
        ) : (
          watchers.map(watcher => (
            <div 
              key={watcher.id} 
              className="flex items-center justify-between p-2 rounded-md hover:bg-[#F5F5F5] group"
            >
              <div className="flex items-center gap-2">
                <UserAvatar initials={watcher.initials} size="sm" />
                <span className="text-sm text-[#5C5C5C]">{watcher.name}</span>
              </div>
              {isEditMode && onRemoveWatcher && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:text-red-500"
                  onClick={() => onRemoveWatcher(watcher.id)}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          ))
        )}
      </div>

      <Button 
        variant="ghost" 
        size="sm" 
        className="w-full mt-2 h-8 text-[#C69C6D] hover:text-[#B8894D] hover:bg-[#C69C6D]/10"
        onClick={onAddWatcher}
      >
        <Plus className="w-3.5 h-3.5 mr-1" />
        Add Watcher
      </Button>
    </div>
  );
}
