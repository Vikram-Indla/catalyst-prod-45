import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Settings2 } from 'lucide-react';
import { useStrategySnapshots } from '@/hooks/useStrategySnapshots';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

interface ProgramIncrement {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  portfolio_id: string;
  state: string;
}

interface RoadmapObjective {
  id: string;
  summary: string;
  tier: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  goal_id: string | null;
}

export default function EnterpriseRoadmaps() {
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>('');
  const [selectedPIs, setSelectedPIs] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const { data: snapshots, isLoading: snapshotsLoading } = useStrategySnapshots();
  
  const { data: programIncrements, isLoading: pisLoading } = useQuery({
    queryKey: ['program-increments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_increments')
        .select('*')
        .order('start_date', { ascending: true });
      
      if (error) throw error;
      return data as ProgramIncrement[];
    },
  });

  const { data: objectives, isLoading: objectivesLoading } = useQuery({
    queryKey: ['roadmap-objectives', selectedSnapshotId, selectedPIs],
    queryFn: async () => {
      let query = supabase
        .from('objectives')
        .select('*')
        .order('created_at', { ascending: false });

      if (selectedSnapshotId) {
        query = query.eq('snapshot_id', selectedSnapshotId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as RoadmapObjective[];
    },
    enabled: !!selectedSnapshotId,
  });

  const handlePIToggle = (piId: string) => {
    setSelectedPIs(prev => 
      prev.includes(piId) 
        ? prev.filter(id => id !== piId)
        : [...prev, piId]
    );
  };

  const handleExport = () => {
    toast.info('Export feature coming soon');
  };

  const handleApplyFilters = () => {
    setShowFilters(false);
    toast.success('Filters applied');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track': return 'bg-green-500';
      case 'at_risk': return 'bg-yellow-500';
      case 'off_track': return 'bg-red-500';
      case 'completed': return 'bg-blue-500';
      case 'blocked': return 'bg-gray-500';
      default: return 'bg-muted';
    }
  };

  const calculatePosition = (startDate: string, endDate: string, piStart: string, piEnd: string) => {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const piStartTime = new Date(piStart).getTime();
    const piEndTime = new Date(piEnd).getTime();
    const piDuration = piEndTime - piStartTime;

    const left = ((start - piStartTime) / piDuration) * 100;
    const width = ((end - start) / piDuration) * 100;

    return { left: Math.max(0, left), width: Math.max(5, width) };
  };

  const activeSnapshot = snapshots?.find(s => s.id === selectedSnapshotId) || snapshots?.[0];
  const filteredPIs = selectedPIs.length > 0 
    ? programIncrements?.filter(pi => selectedPIs.includes(pi.id))
    : programIncrements;

  if (snapshotsLoading || pisLoading) {
    return (
      <div className="flex-1 p-6 space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold">Enterprise Roadmaps</h1>
          <Select 
            value={selectedSnapshotId || activeSnapshot?.id || ''} 
            onValueChange={setSelectedSnapshotId}
          >
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
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowFilters(!showFilters)}
          >
            <Settings2 className="h-4 w-4 mr-2" />
            PI Selection
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* PI Selection Panel */}
      {showFilters && (
        <Card className="mx-6 mt-4 p-4">
          <div className="space-y-4">
            <h3 className="font-semibold">Select Program Increments</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {programIncrements?.map((pi) => (
                <div key={pi.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={pi.id}
                    checked={selectedPIs.includes(pi.id)}
                    onCheckedChange={() => handlePIToggle(pi.id)}
                  />
                  <label
                    htmlFor={pi.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {pi.name}
                  </label>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleApplyFilters}>
                Apply
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedPIs([])}>
                Clear
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowFilters(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Roadmap Timeline */}
      <div className="flex-1 overflow-auto p-6">
        {objectivesLoading ? (
          <Skeleton className="h-96 w-full" />
        ) : !objectives || objectives.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            No objectives found for the selected snapshot
          </Card>
        ) : (
          <Card className="p-6">
            <div className="space-y-6">
              {/* Timeline Header */}
              <div className="grid grid-cols-[200px_1fr] gap-4">
                <div className="font-semibold text-sm">Objective</div>
                <div className="grid gap-2" style={{ 
                  gridTemplateColumns: `repeat(${filteredPIs?.length || 1}, 1fr)` 
                }}>
                  {filteredPIs?.map((pi) => (
                    <div key={pi.id} className="text-center border-l px-2">
                      <div className="font-semibold text-sm">{pi.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(parseISO(pi.start_date), 'MMM yyyy')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Objectives Timeline */}
              <div className="space-y-3">
                {objectives
                  .filter(obj => obj.start_date && obj.end_date)
                  .map((objective) => (
                    <div key={objective.id} className="grid grid-cols-[200px_1fr] gap-4 items-center">
                      <div className="text-sm truncate" title={objective.summary}>
                        {objective.summary}
                      </div>
                      <div className="relative h-8 border rounded">
                        {filteredPIs?.map((pi) => {
                          if (!objective.start_date || !objective.end_date) return null;
                          
                          const position = calculatePosition(
                            objective.start_date,
                            objective.end_date,
                            pi.start_date,
                            pi.end_date
                          );

                          // Only render if objective overlaps with this PI
                          const objStart = new Date(objective.start_date).getTime();
                          const objEnd = new Date(objective.end_date).getTime();
                          const piStart = new Date(pi.start_date).getTime();
                          const piEnd = new Date(pi.end_date).getTime();

                          if (objEnd < piStart || objStart > piEnd) return null;

                          return (
                            <div
                              key={pi.id}
                              className={`absolute h-6 rounded ${getStatusColor(objective.status)} opacity-80 hover:opacity-100 cursor-pointer transition-opacity`}
                              style={{
                                left: `${position.left}%`,
                                width: `${position.width}%`,
                                top: '4px',
                              }}
                              title={`${objective.summary} (${objective.status})`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
