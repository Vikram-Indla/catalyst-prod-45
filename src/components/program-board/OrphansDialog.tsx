import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface OrphansDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId: string;
  piId: string;
}

export function OrphansDialog({ open, onOpenChange, programId, piId }: OrphansDialogProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(new Set());
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  
  const { data: orphanFeatures, isLoading: loadingFeatures } = useQuery({
    queryKey: ['orphan-features', programId, piId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('features')
        .select('id, display_id, name, epic_id')
        .eq('program_id', programId)
        .eq('pi_id', piId)
        .is('team_id', null);
      
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!programId && !!piId,
  });
  
  const { data: teams, isLoading: loadingTeams } = useQuery({
    queryKey: ['teams', programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('project_id', programId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!programId,
  });
  
  const filteredFeatures = orphanFeatures?.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.display_id?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];
  
  const handleFeatureToggle = (featureId: string) => {
    const newSelected = new Set(selectedFeatures);
    if (newSelected.has(featureId)) {
      newSelected.delete(featureId);
    } else {
      newSelected.add(featureId);
    }
    setSelectedFeatures(newSelected);
  };
  
  const handleTeamToggle = (teamId: string) => {
    const newSelected = new Set(selectedTeams);
    if (newSelected.has(teamId)) {
      newSelected.delete(teamId);
    } else {
      newSelected.add(teamId);
    }
    setSelectedTeams(newSelected);
  };
  
  const handleUpdate = async () => {
    if (selectedFeatures.size === 0 || selectedTeams.size === 0) {
      toast.error('Please select features and teams');
      return;
    }
    
    try {
      const updates = Array.from(selectedFeatures).map(featureId => ({
        id: featureId,
        is_orphan_on_board: true,
        orphan_board_teams: Array.from(selectedTeams),
      }));
      
      for (const update of updates) {
        const { error } = await supabase
          .from('features')
          .update(update)
          .eq('id', update.id);
        
        if (error) throw error;
      }
      
      queryClient.invalidateQueries({ queryKey: ['program-board-features'] });
      toast.success(`${selectedFeatures.size} feature(s) added to board`);
      
      setSelectedFeatures(new Set());
      setSelectedTeams(new Set());
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update orphan features:', error);
      toast.error('Failed to update features');
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Program Orphans</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-4 p-4">
          <div className="space-y-2">
            <Label>Search Features</Label>
            <Input 
              placeholder="Search by name or ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-semibold">Unassigned Features ({filteredFeatures.length})</Label>
              <div className="border border-border rounded p-3 max-h-[300px] overflow-y-auto space-y-2">
                {loadingFeatures ? (
                  <div className="text-sm text-muted-foreground text-center py-4">Loading...</div>
                ) : filteredFeatures.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4">No unassigned features</div>
                ) : (
                  filteredFeatures.map((feature) => (
                    <div key={feature.id} className="flex items-start gap-2">
                      <Checkbox
                        checked={selectedFeatures.has(feature.id)}
                        onCheckedChange={() => handleFeatureToggle(feature.id)}
                      />
                      <div className="flex-1 text-sm">
                        <div className="font-medium">#{feature.display_id || feature.id.slice(0, 8)}</div>
                        <div className="text-muted-foreground line-clamp-1">{feature.name}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="font-semibold">Assign to Teams</Label>
              <div className="border border-border rounded p-3 max-h-[300px] overflow-y-auto space-y-2">
                {loadingTeams ? (
                  <div className="text-sm text-muted-foreground text-center py-4">Loading...</div>
                ) : teams?.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4">No teams available</div>
                ) : (
                  teams?.map((team) => (
                    <div key={team.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedTeams.has(team.id)}
                        onCheckedChange={() => handleTeamToggle(team.id)}
                      />
                      <Label className="font-normal text-sm cursor-pointer flex-1">
                        {team.name}
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpdate}
            disabled={selectedFeatures.size === 0 || selectedTeams.size === 0}
          >
            Update ({selectedFeatures.size} features)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
