import React from 'react';
import { EFDSession } from '../../types/efd.types';
import { useEFDEpics } from '../../hooks/useEFDSession';
import { useToggleEpicSelection } from '../../hooks/useEFDMutations';
import { Layers, CheckCircle, Circle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const SelectEpicsStep: React.FC<{ session: EFDSession }> = ({ session }) => {
  const { data: epics = [], isLoading } = useEFDEpics(session.id);
  const toggleSelection = useToggleEpicSelection();

  const selectedCount = epics.filter((e: any) => e.is_selected_for_features).length;

  const handleToggle = (epicId: string, currentValue: boolean) => {
    toggleSelection.mutate({ epicId, isSelected: !currentValue });
  };

  const handleSelectAll = () => {
    epics.forEach((epic: any) => {
      if (!epic.is_selected_for_features) {
        toggleSelection.mutate({ epicId: epic.id, isSelected: true });
      }
    });
  };

  const handleDeselectAll = () => {
    epics.forEach((epic: any) => {
      if (epic.is_selected_for_features) {
        toggleSelection.mutate({ epicId: epic.id, isSelected: false });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (epics.length === 0) {
    return (
      <div className="max-w-4xl space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-1">Select Epics for Features</h2>
          <p className="text-muted-foreground">Choose which epics should have features generated</p>
        </div>
        <div className="border rounded-xl p-8 text-center bg-muted/30">
          <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">No Epics Generated Yet</h3>
          <p className="text-muted-foreground">Go back to step 3 to generate epics first</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Select Epics for Features</h2>
        <p className="text-muted-foreground">
          Only selected epics will have features generated in the next step
        </p>
      </div>

      {/* Summary & Actions */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="font-medium">{selectedCount}</span>
            <span className="text-muted-foreground">selected</span>
          </div>
          <div className="text-muted-foreground">of {epics.length} epics</div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSelectAll}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={handleDeselectAll}>
            Deselect All
          </Button>
        </div>
      </div>

      {selectedCount === 0 && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <Info className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <p className="text-amber-700 font-medium">No epics selected</p>
            <p className="text-amber-600 text-sm">Select at least one epic to generate features</p>
          </div>
        </div>
      )}

      {/* Epic Cards */}
      <div className="grid gap-4">
        {epics.map((epic: any) => (
          <Card 
            key={epic.id} 
            className={`cursor-pointer transition-all hover:shadow-md ${
              epic.is_selected_for_features 
                ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                : 'bg-card hover:bg-muted/30'
            }`}
            onClick={() => handleToggle(epic.id, epic.is_selected_for_features)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start gap-4">
                <Checkbox 
                  checked={epic.is_selected_for_features}
                  className="mt-1"
                  onClick={(e) => e.stopPropagation()}
                  onCheckedChange={() => handleToggle(epic.id, epic.is_selected_for_features)}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-mono text-violet-600">{epic.epic_key}</span>
                    {epic.size && (
                      <Badge variant="outline" className="text-xs">{epic.size}</Badge>
                    )}
                    {epic.state && (
                      <Badge variant="secondary" className="text-xs capitalize">{epic.state}</Badge>
                    )}
                  </div>
                  <CardTitle className="text-base">{epic.name}</CardTitle>
                </div>
                <div className="flex items-center">
                  {epic.is_selected_for_features ? (
                    <CheckCircle className="h-6 w-6 text-primary" />
                  ) : (
                    <Circle className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>
            {epic.description && (
              <CardContent className="pt-0 pl-12">
                <p className="text-sm text-muted-foreground line-clamp-2">{epic.description}</p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};
