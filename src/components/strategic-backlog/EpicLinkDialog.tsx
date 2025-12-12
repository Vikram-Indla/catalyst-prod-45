import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Zap, Link2 } from 'lucide-react';
import { toast } from 'sonner';

interface Epic {
  id: string;
  name: string;
  epic_key?: string;
  primary_program_id?: string;
  programs?: { id: string; name: string } | null;
}

interface EpicLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshotId: string;
  linkedEpicIds: string[];
}

export function EpicLinkDialog({ open, onOpenChange, snapshotId, linkedEpicIds }: EpicLinkDialogProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Fetch available epics (not already linked)
  const { data: availableEpics = [], isLoading } = useQuery({
    queryKey: ['available-epics-for-snapshot', linkedEpicIds],
    queryFn: async () => {
      let query = supabase
        .from('epics')
        .select(`
          id,
          name,
          epic_key,
          primary_program_id,
          programs!primary_program_id(id, name)
        `)
        .is('deleted_at', null)
        .order('name');
      
      if (linkedEpicIds.length > 0) {
        query = query.not('id', 'in', `(${linkedEpicIds.join(',')})`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Epic[];
    },
    enabled: open,
  });

  const filteredEpics = availableEpics.filter(epic =>
    epic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    epic.epic_key?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const linkEpicsMutation = useMutation({
    mutationFn: async () => {
      const newEpicIds = [...linkedEpicIds, ...selectedIds];
      
      // Check if links record exists
      const { data: existing } = await supabase
        .from('snapshot_strategy_links')
        .select('id')
        .eq('snapshot_id', snapshotId)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('snapshot_strategy_links')
          .update({ epic_ids: newEpicIds })
          .eq('snapshot_id', snapshotId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('snapshot_strategy_links')
          .insert({ 
            snapshot_id: snapshotId, 
            epic_ids: newEpicIds,
            mission_ids: [],
            vision_ids: [],
            value_ids: [],
            goal_ids: [],
            theme_ids: []
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snapshot-strategy-links'] });
      queryClient.invalidateQueries({ queryKey: ['strategic-backlog-epics'] });
      toast.success(`${selectedIds.length} epic(s) linked to snapshot`);
      setSelectedIds([]);
      onOpenChange(false);
    },
    onError: () => toast.error('Failed to link epics'),
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Link Epics to Snapshot
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search epics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* Epic list */}
          <ScrollArea className="h-[300px] border border-border rounded-lg">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">Loading epics...</div>
            ) : filteredEpics.length === 0 ? (
              <div className="p-8 text-center">
                <Zap className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'No epics match your search.' : 'All epics are already linked.'}
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredEpics.map((epic) => (
                  <label
                    key={epic.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedIds.includes(epic.id)}
                      onCheckedChange={() => toggleSelect(epic.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{epic.name}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {epic.epic_key && <span className="font-mono">{epic.epic_key}</span>}
                        {epic.programs && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {epic.programs.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </ScrollArea>

          {selectedIds.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {selectedIds.length} epic(s) selected
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => linkEpicsMutation.mutate()}
            disabled={selectedIds.length === 0 || linkEpicsMutation.isPending}
            className="bg-brand-gold hover:bg-brand-gold/90"
          >
            <Link2 className="h-4 w-4 mr-1" />
            Link {selectedIds.length} Epic{selectedIds.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}