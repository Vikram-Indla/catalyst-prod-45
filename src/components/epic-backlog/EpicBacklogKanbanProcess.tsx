import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Epic {
  id: string;
  epic_key?: string;
  name: string;
  process_step_id?: string;
  points_estimate?: number;
}

interface EpicBacklogKanbanProcessProps {
  epics: Epic[];
  onEpicSelect: (id: string) => void;
  onRefetch: () => void;
}

export function EpicBacklogKanbanProcess({ epics, onEpicSelect }: EpicBacklogKanbanProcessProps) {
  const { data: processFlows } = useQuery({
    queryKey: ['process-flows'],
    queryFn: async () => {
      const { data } = await supabase
        .from('process_flows')
        .select('*, process_steps(*)')
        .order('created_at');
      return data || [];
    },
  });

  // Group epics by process step
  const unassignedEpics = epics.filter(e => !e.process_step_id);
  const assignedEpics = epics.filter(e => e.process_step_id);

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="grid grid-cols-4 gap-4">
        {/* Unassigned Column */}
        <div className="flex flex-col">
          <div className="mb-4">
            <h3 className="font-semibold text-lg">Unassigned</h3>
            <p className="text-sm text-muted-foreground">{unassignedEpics.length} epics</p>
          </div>
          <div className="space-y-2">
            {unassignedEpics.map((epic) => (
              <Card
                key={epic.id}
                className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onEpicSelect(epic.id)}
              >
                <div className="space-y-2">
                  <span className="font-medium text-sm block">{epic.name}</span>
                  <div className="text-xs text-muted-foreground">
                    {epic.epic_key || epic.id.slice(0, 8)}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Process Step Columns */}
        {processFlows?.flatMap(flow => flow.process_steps || []).map((step: any) => {
          const stepEpics = assignedEpics.filter(e => e.process_step_id === step.id);
          return (
            <div key={step.id} className="flex flex-col">
              <div className="mb-4">
                <h3 className="font-semibold text-lg">{step.name}</h3>
                <p className="text-sm text-muted-foreground">{stepEpics.length} epics</p>
                {step.exit_criteria && (
                  <p className="text-xs text-muted-foreground mt-1">Exit: {step.exit_criteria}</p>
                )}
              </div>
              <div className="space-y-2">
                {stepEpics.map((epic) => (
                  <Card
                    key={epic.id}
                    className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => onEpicSelect(epic.id)}
                  >
                    <div className="space-y-2">
                      <span className="font-medium text-sm block">{epic.name}</span>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{epic.epic_key || epic.id.slice(0, 8)}</span>
                        {epic.points_estimate && (
                          <Badge variant="outline">{epic.points_estimate} pts</Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
