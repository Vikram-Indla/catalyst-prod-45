// ==============================================
// MAP TO EXISTING WORK ITEM DIALOG
// Based on Jira Align Ideation documentation
// ==============================================

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, CheckCircle } from 'lucide-react';
import { useUpdateIdea } from '@/hooks/useIdeation';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Idea } from '@/types/ideation';

interface MapToExistingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idea: Idea | null;
  workItemType: 'Epic' | 'Feature' | 'Story';
}

export function MapToExistingDialog({
  open,
  onOpenChange,
  idea,
  workItemType,
}: MapToExistingDialogProps) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isMapping, setIsMapping] = useState(false);
  
  const updateIdea = useUpdateIdea();

  // Fetch work items based on type
  const { data: workItems = [], isLoading } = useQuery({
    queryKey: ['work-items-for-mapping', workItemType],
    queryFn: async () => {
      if (workItemType === 'Epic') {
        const { data, error } = await supabase
          .from('epics')
          .select('id, name, epic_key')
          .is('deleted_at', null)
          .order('name');
        if (error) throw error;
        return data.map(e => ({ id: e.id, name: e.name, key: e.epic_key }));
      } else if (workItemType === 'Feature') {
        const { data, error } = await supabase
          .from('features')
          .select('id, name, display_id')
          .is('deleted_at', null)
          .order('name');
        if (error) throw error;
        return data.map(f => ({ id: f.id, name: f.name, key: f.display_id }));
      } else if (workItemType === 'Story') {
        const { data, error } = await supabase
          .from('stories')
          .select('id, title, story_key')
          .order('title');
        if (error) throw error;
        return data.map(s => ({ id: s.id, name: s.title, key: s.story_key }));
      }
      return [];
    },
    enabled: open,
  });

  // Filter by search
  const filteredItems = useMemo(() => {
    if (!search.trim()) return workItems;
    const searchLower = search.toLowerCase();
    return workItems.filter(
      item => 
        item.name?.toLowerCase().includes(searchLower) ||
        item.key?.toLowerCase().includes(searchLower)
    );
  }, [workItems, search]);

  const handleMap = async () => {
    if (!idea || !selectedId) {
      toast.error('Please select a work item to map');
      return;
    }

    setIsMapping(true);
    try {
      await updateIdea.mutateAsync({
        id: idea.id,
        work_item_id: selectedId,
        work_item_type: workItemType,
        status: 'Planned',
      });

      toast.success(`Idea mapped to ${workItemType}`);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Failed to map: ${error.message}`);
    } finally {
      setIsMapping(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Map to Existing {workItemType}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Link idea "{idea?.title}" to an existing {workItemType.toLowerCase()}.
          </p>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${workItemType.toLowerCase()}s...`}
              className="pl-9"
            />
          </div>

          {/* Work items list */}
          <ScrollArea className="h-[300px] border rounded-md">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">Loading...</div>
            ) : filteredItems.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No {workItemType.toLowerCase()}s found
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors flex items-center justify-between",
                      selectedId === item.id && "bg-brand-gold/10 border border-brand-gold"
                    )}
                  >
                    <div>
                      <span className="text-xs text-muted-foreground mr-2">
                        {item.key || item.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className="text-sm">{item.name}</span>
                    </div>
                    {selectedId === item.id && (
                      <CheckCircle className="h-4 w-4 text-brand-gold" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleMap} 
            disabled={isMapping || !selectedId}
            className="bg-brand-gold text-white hover:bg-brand-gold-hover"
          >
            {isMapping ? 'Mapping...' : `Map to ${workItemType}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
