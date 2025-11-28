import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GripVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface TeamRankDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId: string;
}

export function TeamRankDialog({ open, onOpenChange, programId }: TeamRankDialogProps) {
  const queryClient = useQueryClient();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  const { data: teams, isLoading } = useQuery({
    queryKey: ['teams', programId],
    queryFn: async () => {
      const { data: allTeams, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .eq('program_id', programId);
      
      if (teamsError) throw teamsError;
      
      const { data: rankings } = await supabase
        .from('program_team_rankings')
        .select('team_id, rank_order')
        .eq('program_id', programId)
        .order('rank_order');
      
      if (rankings && rankings.length > 0) {
        const rankMap = new Map(rankings.map(r => [r.team_id, r.rank_order]));
        return allTeams.sort((a, b) => {
          const rankA = rankMap.get(a.id) ?? 999;
          const rankB = rankMap.get(b.id) ?? 999;
          return rankA - rankB;
        });
      }
      
      return allTeams.sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: open && !!programId,
  });
  
  const [localTeams, setLocalTeams] = useState(teams || []);
  
  // Update local state when teams data changes
  if (teams && localTeams.length === 0) {
    setLocalTeams(teams);
  }
  
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };
  
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newTeams = [...localTeams];
    const draggedTeam = newTeams[draggedIndex];
    newTeams.splice(draggedIndex, 1);
    newTeams.splice(index, 0, draggedTeam);
    
    setLocalTeams(newTeams);
    setDraggedIndex(index);
  };
  
  const handleDragEnd = () => {
    setDraggedIndex(null);
  };
  
  const handleSave = async () => {
    try {
      // Delete existing rankings
      await supabase
        .from('program_team_rankings')
        .delete()
        .eq('program_id', programId);
      
      // Insert new rankings
      const rankings = localTeams.map((team, index) => ({
        program_id: programId,
        team_id: team.id,
        rank_order: index + 1,
      }));
      
      const { error } = await supabase
        .from('program_team_rankings')
        .insert(rankings);
      
      if (error) throw error;
      
      // Invalidate teams query to reload with new rankings
      queryClient.invalidateQueries({ queryKey: ['teams', programId] });
      
      toast.success('Team rankings updated successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save team rankings:', error);
      toast.error('Failed to save team rankings');
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Team Ranking</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-2 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="text-sm text-muted-foreground text-center py-8">Loading teams...</div>
          ) : localTeams.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">No teams found</div>
          ) : (
            localTeams.map((team, index) => (
              <div
                key={team.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`
                  flex items-center gap-3 p-3 rounded border border-border bg-background
                  cursor-move hover:bg-muted/50 transition-colors
                  ${draggedIndex === index ? 'opacity-50' : ''}
                `}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 font-medium text-sm">{team.name}</div>
                <div className="text-xs text-muted-foreground">#{index + 1}</div>
              </div>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
