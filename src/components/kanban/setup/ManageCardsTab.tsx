import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import type { KanbanBoard, CardType } from '@/types/kanban.types';

interface ManageCardsTabProps {
  boardId: string;
  board: KanbanBoard;
}

const AVAILABLE_CARD_TYPES: CardType[] = ['Epic', 'Feature', 'Story', 'Defect', 'Task', 'Dependency', 'Risk'];

export function ManageCardsTab({ boardId, board }: ManageCardsTabProps) {
  return (
    <div className="space-y-6">
      {/* Custom Cards Section */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-foreground mb-2">Custom Cards</h3>
          <p className="text-sm text-muted-foreground">
            Add custom card types that are not standard work items
          </p>
        </div>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <Label htmlFor="custom-card">Custom Card Title</Label>
            <Input
              id="custom-card"
              placeholder="Enter custom card name..."
            />
          </div>
          <Button className="bg-brand-gold hover:bg-brand-gold-hover text-white">
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>
      </Card>

      {/* Card Types Visibility */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-foreground mb-2">Card Types</h3>
          <p className="text-sm text-muted-foreground">
            Select which work item types should be visible on this board
          </p>
        </div>

        <div className="space-y-3">
          {AVAILABLE_CARD_TYPES.map((cardType) => (
            <div key={cardType} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="flex items-center gap-3">
                <Switch
                  checked={board.card_types.includes(cardType)}
                  id={`card-type-${cardType}`}
                />
                <Label htmlFor={`card-type-${cardType}`} className="font-normal cursor-pointer">
                  {cardType}
                </Label>
              </div>
              <Badge variant="secondary" className="text-xs">
                Visible
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* Card Display Options */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-foreground mb-2">Display Options</h3>
          <p className="text-sm text-muted-foreground">
            Configure what information is shown on cards
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Show Tags</Label>
              <p className="text-sm text-muted-foreground">Display tags on cards</p>
            </div>
            <Switch checked={board.settings.showTags} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Show Team</Label>
              <p className="text-sm text-muted-foreground">Display team assignment</p>
            </div>
            <Switch checked={board.settings.showTeam} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Small Cards</Label>
              <p className="text-sm text-muted-foreground">Use compact card layout</p>
            </div>
            <Switch checked={board.settings.smallCards} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Show Exit Criteria</Label>
              <p className="text-sm text-muted-foreground">Display column exit criteria</p>
            </div>
            <Switch checked={board.settings.showExitCriteria} />
          </div>
        </div>
      </Card>
    </div>
  );
}
