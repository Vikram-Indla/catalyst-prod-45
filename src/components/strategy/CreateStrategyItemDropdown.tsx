import { useState } from 'react';
import { Plus, Target, Eye, Heart, Flag, Palette, Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreateStrategyObjectDialog } from '@/components/strategic-backlog/CreateStrategyObjectDialog';
import { CreateGoalDialog } from '@/components/strategic-backlog/CreateGoalDialog';
import { CreateThemeDialog } from '@/components/strategic-backlog/CreateThemeDialog';
import { CreateObjectiveDialog } from '@/modules/objectives/components/ObjectivePanel/CreateObjectiveDialog';

interface CreateStrategyItemDropdownProps {
  snapshotId: string;
  isArchived?: boolean;
}

type ItemType = 'mission' | 'vision' | 'value' | 'goal' | 'theme' | 'objective' | null;

export function CreateStrategyItemDropdown({ snapshotId, isArchived }: CreateStrategyItemDropdownProps) {
  const [selectedType, setSelectedType] = useState<ItemType>(null);
  
  if (isArchived) {
    return null;
  }

  const items = [
    { type: 'theme' as const, label: 'Theme', icon: Palette },
    { type: 'objective' as const, label: 'Objective', icon: Crosshair },
  ];

  const handleClose = () => {
    setSelectedType(null);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="default" size="sm" className="bg-brand-gold hover:bg-brand-gold/90">
            <Plus className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-background border-border z-[100]">
          {items.map(({ type, label, icon: Icon }) => (
            <DropdownMenuItem 
              key={type}
              onClick={() => setSelectedType(type)}
              className="cursor-pointer"
            >
              <Icon className="h-4 w-4 mr-2 text-muted-foreground" />
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Mission/Vision/Value dialogs */}
      {(selectedType === 'mission' || selectedType === 'vision' || selectedType === 'value') && (
        <CreateStrategyObjectDialog
          open={true}
          onOpenChange={(open) => !open && handleClose()}
          type={selectedType}
          snapshotId={snapshotId}
        />
      )}

      {/* Strategic Goal dialog */}
      {selectedType === 'goal' && (
        <CreateGoalDialog
          open={true}
          onOpenChange={(open) => !open && handleClose()}
          snapshotId={snapshotId}
        />
      )}

      {/* Theme dialog */}
      {selectedType === 'theme' && (
        <CreateThemeDialog
          open={true}
          onOpenChange={(open) => !open && handleClose()}
          snapshotId={snapshotId}
        />
      )}

      {/* Objective dialog */}
      {selectedType === 'objective' && (
        <CreateObjectiveDialog
          open={true}
          onOpenChange={(open) => !open && handleClose()}
          tier="portfolio"
        />
      )}
    </>
  );
}
