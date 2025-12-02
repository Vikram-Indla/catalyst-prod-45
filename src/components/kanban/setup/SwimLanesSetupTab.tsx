import { useState } from 'react';
import { useCreateSwimLane } from '@/hooks/useKanbanBoards';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, GripVertical, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import type { SwimLane } from '@/types/kanban.types';

interface SwimLanesSetupTabProps {
  boardId: string;
  swimLanes: SwimLane[];
}

export function SwimLanesSetupTab({ boardId, swimLanes }: SwimLanesSetupTabProps) {
  const [newLaneName, setNewLaneName] = useState('');
  const [newLaneWipLimit, setNewLaneWipLimit] = useState<string>('');
  const createSwimLane = useCreateSwimLane();

  const handleAddSwimLane = async () => {
    if (!newLaneName) return;

    await createSwimLane.mutateAsync({
      board_id: boardId,
      name: newLaneName,
      wip_limit: newLaneWipLimit ? parseInt(newLaneWipLimit) : undefined,
      sort_order: swimLanes.length,
    });

    setNewLaneName('');
    setNewLaneWipLimit('');
  };

  return (
    <div className="space-y-6">
      {/* Add Swim Lane Form */}
      <Card className="p-6">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <Label htmlFor="lane-name">Swim Lane Name</Label>
            <Input
              id="lane-name"
              placeholder="e.g., Expedite, Standard Class"
              value={newLaneName}
              onChange={(e) => setNewLaneName(e.target.value)}
            />
          </div>
          <div className="w-32">
            <Label htmlFor="lane-wip">WIP Limit</Label>
            <Input
              id="lane-wip"
              type="number"
              placeholder="—"
              value={newLaneWipLimit}
              onChange={(e) => setNewLaneWipLimit(e.target.value)}
            />
          </div>
          <Button
            onClick={handleAddSwimLane}
            disabled={!newLaneName || createSwimLane.isPending}
            className="bg-brand-gold hover:bg-brand-gold-hover text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Swim Lane
          </Button>
        </div>
      </Card>

      {/* Swim Lanes List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground">Swim Lanes</h3>
          <Badge variant="secondary">{swimLanes.length} lanes</Badge>
        </div>

        {swimLanes.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-2">No swim lanes configured yet</p>
            <p className="text-sm text-muted-foreground">
              Swim lanes help differentiate classes of service, priorities, or customer types
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {swimLanes.map((lane) => (
              <Card key={lane.id} className="p-4">
                <div className="flex items-center gap-4">
                  <GripVertical className="w-5 h-5 text-muted-foreground cursor-move" />
                  {lane.is_collapsed ? (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div className="flex-1 flex items-center gap-4">
                    <span className="font-medium text-foreground">{lane.name}</span>
                    <span className="text-sm text-muted-foreground">
                      WIP: {lane.wip_limit || '—'}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
