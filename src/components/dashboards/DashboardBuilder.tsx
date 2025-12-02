import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { GadgetPosition, GadgetType, GADGET_DEFINITIONS } from '@/types/dashboard.types';
import { DashboardGrid } from './DashboardGrid';
import { AddGadgetDialog } from './AddGadgetDialog';
import { Plus, Save, X, Settings } from 'lucide-react';

interface DashboardBuilderProps {
  initialGadgets?: GadgetPosition[];
  onSave?: (gadgets: GadgetPosition[]) => void;
  onCancel?: () => void;
}

export function DashboardBuilder({ initialGadgets = [], onSave, onCancel }: DashboardBuilderProps) {
  const [gadgets, setGadgets] = useState<GadgetPosition[]>(initialGadgets);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(true);

  const handleAddGadget = (gadgetType: GadgetType) => {
    const def = GADGET_DEFINITIONS[gadgetType];
    const newGadget: GadgetPosition = {
      id: crypto.randomUUID(),
      gadgetType,
      config: {},
      x: 0,
      y: gadgets.length,
      width: def.defaultSize.width,
      height: def.defaultSize.height
    };
    setGadgets([...gadgets, newGadget]);
    setShowAddDialog(false);
  };

  const handleRemoveGadget = (gadgetId: string) => {
    setGadgets(gadgets.filter(g => g.id !== gadgetId));
  };

  const handleSave = () => {
    onSave?.(gadgets);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddDialog(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Gadget
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            {isEditing ? 'Done Editing' : 'Edit Layout'}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          )}
          {onSave && (
            <Button size="sm" onClick={handleSave} className="gap-2">
              <Save className="h-4 w-4" />
              Save Dashboard
            </Button>
          )}
        </div>
      </div>

      {gadgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">No gadgets added yet</p>
          <Button onClick={() => setShowAddDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Your First Gadget
          </Button>
        </div>
      ) : (
        <DashboardGrid
          gadgets={gadgets}
          onRemoveGadget={handleRemoveGadget}
          isEditing={isEditing}
        />
      )}

      <AddGadgetDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAddGadget={handleAddGadget}
        existingGadgets={gadgets.map(g => g.gadgetType)}
      />
    </div>
  );
}
