import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Download, Settings2 } from 'lucide-react';
import { useStrategySnapshots } from '@/hooks/useStrategySnapshots';
import { useOKRTree } from '@/hooks/useOKRTree';
import { Skeleton } from '@/components/ui/skeleton';
import { MissionVisionValues } from '@/components/strategy/MissionVisionValues';
import { ExecutionAgainstOutcomesWidget } from '@/components/strategy/ExecutionAgainstOutcomesWidget';
import { StrategyPyramid } from '@/components/strategy/StrategyPyramid';
import { SnapshotProgress } from '@/components/strategy/SnapshotProgress';
import { OkrHeatmap } from '@/components/strategy/OkrHeatmap';
import { OkrTree } from '@/components/strategy/OkrTree';
import { ObjectiveDetailsPanelNew } from '@/components/okr/ObjectiveDetailsPanelNew';
import { ObjectiveDialogNew } from '@/components/forms/ObjectiveDialogNew';
import { toast } from 'sonner';

export function StrategyRoomNew() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const snapshotId = searchParams.get('snapshotId');
  
  const { data: snapshots, isLoading: snapshotsLoading } = useStrategySnapshots();
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  const [showNewObjectiveDialog, setShowNewObjectiveDialog] = useState(false);

  const activeSnapshot = snapshots?.find(s => s.id === snapshotId) || snapshots?.[0];

  const handleSnapshotChange = (newSnapshotId: string) => {
    setSearchParams({ snapshotId: newSnapshotId });
  };

  const handleObjectiveClick = (objectiveId: string) => {
    setSelectedObjectiveId(objectiveId);
  };

  const handleExport = () => {
    toast.info('Export feature coming soon');
  };

  const handleConfigure = () => {
    toast.info('Configuration feature coming soon');
  };

  if (snapshotsLoading) {
    return (
      <div className="flex-1 p-6 space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold">Strategy Room</h1>
          <Select value={activeSnapshot?.id || ''} onValueChange={handleSnapshotChange}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select snapshot" />
            </SelectTrigger>
            <SelectContent>
              {snapshots?.map((snapshot) => (
                <SelectItem key={snapshot.id} value={snapshot.id}>
                  {snapshot.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={handleConfigure}>
            <Settings2 className="h-4 w-4 mr-2" />
            Configure
          </Button>
          <Button size="sm" onClick={() => setShowNewObjectiveDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Objective
          </Button>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Mission/Vision/Values */}
          {activeSnapshot && <MissionVisionValues snapshot={activeSnapshot} />}

          {/* Widgets Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ExecutionAgainstOutcomesWidget snapshotId={activeSnapshot?.id} piIds={[]} />
            <StrategyPyramid onLayerClick={(layer) => console.log('Layer clicked:', layer)} />
            <SnapshotProgress snapshotId={activeSnapshot?.id} />
          </div>

          {/* OKR Heatmap */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">OKR Heatmap</h2>
            <OkrHeatmap 
              selectedSnapshot={activeSnapshot?.id || ''} 
              programIncrements={[]}
              onCellClick={(level, pi) => console.log('Heatmap cell clicked:', level, pi)}
            />
          </Card>

          {/* OKR Tree */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">OKR Tree</h2>
            <OkrTree 
              selectedSnapshot={activeSnapshot?.id} 
              onObjectiveClick={handleObjectiveClick}
            />
          </Card>
        </div>
      </div>

      {/* Objective Details Panel */}
      {selectedObjectiveId && (
        <ObjectiveDetailsPanelNew
          objectiveId={selectedObjectiveId}
          open={!!selectedObjectiveId}
          onClose={() => setSelectedObjectiveId(null)}
        />
      )}

      {/* New Objective Dialog */}
      <ObjectiveDialogNew
        open={showNewObjectiveDialog}
        onClose={() => setShowNewObjectiveDialog(false)}
        snapshotId={activeSnapshot?.id}
      />
    </div>
  );
}
