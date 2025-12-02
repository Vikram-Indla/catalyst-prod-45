import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ObjectiveTier } from '../../types/objective.types';

interface LinkObjectiveDialogProps {
  open: boolean;
  onClose: () => void;
  workItemId: string;
  workItemType: 'epic' | 'feature' | 'story';
}

export function LinkObjectiveDialog({
  open,
  onClose,
  workItemId,
  workItemType,
}: LinkObjectiveDialogProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<ObjectiveTier | 'all'>('all');

  // Fetch available objectives
  const { data: objectives = [], isLoading } = useQuery({
    queryKey: ['available-objectives', search, tierFilter],
    queryFn: async () => {
      let query = supabase
        .from('objectives')
        .select('id, summary, tier, status, score')
        .order('created_at', { ascending: false })
        .limit(50);

      if (search) {
        query = query.ilike('summary', `%${search}%`);
      }

      if (tierFilter && tierFilter !== 'all') {
        query = query.eq('tier', tierFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Add link mutation
  const addLinkMutation = useMutation({
    mutationFn: async (objectiveId: string) => {
      const table = `objective_${workItemType}_links` as 'objective_epic_links';
      const column = `${workItemType}_id`;
      
      const { error } = await supabase.from(table as any).insert({
        objective_id: objectiveId,
        [column]: workItemId,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item-objectives', workItemType, workItemId] });
      toast.success('Objective linked successfully');
      onClose();
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('This objective is already linked');
      } else {
        toast.error('Failed to link objective');
      }
    },
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      on_track: 'bg-success/10 text-success border-success/20',
      at_risk: 'bg-warning/10 text-warning border-warning/20',
      off_track: 'bg-destructive/10 text-destructive border-destructive/20',
      completed: 'bg-info/10 text-info border-info/20',
      pending: 'bg-muted text-muted-foreground border-border',
    };
    return colors[status] || colors.pending;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Link Objective to {workItemType.charAt(0).toUpperCase() + workItemType.slice(1)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search objectives..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={tierFilter} onValueChange={(val) => setTierFilter(val as ObjectiveTier | 'all')}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="portfolio">Portfolio</SelectItem>
                <SelectItem value="program">Program</SelectItem>
                <SelectItem value="team">Team</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : objectives.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No objectives found</p>
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {objectives.map((objective: any) => (
                <div
                  key={objective.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-muted-foreground">
                        {objective.id.slice(0, 8)}
                      </span>
                      <Badge variant="outline" className="text-xs capitalize">
                        {objective.tier}
                      </Badge>
                      <Badge className={cn('text-xs', getStatusColor(objective.status))}>
                        {objective.status?.replace('_', ' ').toUpperCase()}
                      </Badge>
                      {objective.score !== null && (
                        <span className="text-xs text-muted-foreground">
                          Score: {(objective.score * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium truncate">{objective.summary}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => addLinkMutation.mutate(objective.id)}
                    disabled={addLinkMutation.isPending}
                  >
                    Link
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
