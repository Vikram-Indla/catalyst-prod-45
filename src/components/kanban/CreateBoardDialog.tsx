import { useState } from 'react';
import { useCreateBoard } from '@/hooks/useKanbanBoards';
import { useTeams } from '@/hooks/useTeams';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { CreateBoardInput } from '@/types/kanban.types';

interface CreateBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateBoardDialog({ open, onOpenChange }: CreateBoardDialogProps) {
  const createBoard = useCreateBoard();
  const { data: teams = [] } = useTeams();
  
  const [formData, setFormData] = useState<CreateBoardInput>({
    title: '',
    description: '',
    team_id: undefined,
    allow_overloading: false,
    allow_state_mapping: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    await createBoard.mutateAsync(formData);
    onOpenChange(false);
    setFormData({
      title: '',
      description: '',
      team_id: undefined,
      allow_overloading: false,
      allow_state_mapping: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Kanban Board</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Board Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Epic Kanban Board"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the purpose of this board..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="team">Team</Label>
              <Select
                value={formData.team_id || 'none'}
                onValueChange={(value) =>
                  setFormData({ ...formData, team_id: value === 'none' ? undefined : value })
                }
              >
                <SelectTrigger id="team">
                  <SelectValue placeholder="Select a team (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No team</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Overloading</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow adding cards even when WIP limit is exceeded
                  </p>
                </div>
                <Switch
                  checked={formData.allow_overloading}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, allow_overloading: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow State Mapping</Label>
                  <p className="text-sm text-muted-foreground">
                    Map Kanban board states to default story states
                  </p>
                </div>
                <Switch
                  checked={formData.allow_state_mapping}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, allow_state_mapping: checked })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!formData.title || createBoard.isPending}
              className="bg-brand-gold hover:bg-brand-gold-hover text-white"
            >
              {createBoard.isPending ? 'Creating...' : 'Create Board'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
