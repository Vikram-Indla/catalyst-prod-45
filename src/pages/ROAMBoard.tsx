import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { PISelector } from '@/components/shared/PISelector';
import { RiskDialog } from '@/components/forms/RiskDialog';
import { Database } from '@/integrations/supabase/types';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

type RoamStatus = Database['public']['Enums']['roam_status'];

export default function ROAMBoard() {
  const [selectedPIId, setSelectedPIId] = useState<string[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<any>(null);

  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('programs').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: risks } = useQuery({
    queryKey: ['risks', selectedProgramId, selectedPIId],
    queryFn: async () => {
      if (!selectedProgramId || !selectedPIId.length) return [];
      const { data, error } = await supabase
        .from('risks')
        .select('*')
        .eq('program_id', selectedProgramId)
        .in('pi_id', selectedPIId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProgramId && selectedPIId.length > 0,
  });

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const riskId = result.draggableId;
    const newStatus = result.destination.droppableId as RoamStatus;

    await supabase
      .from('risks')
      .update({ roam_status: newStatus })
      .eq('id', riskId);
  };

  const getRisksByStatus = (status: RoamStatus) => {
    return risks?.filter(r => r.roam_status === status) || [];
  };

  const getRiskScore = (risk: any) => {
    if (!risk.probability || !risk.impact) return 0;
    return risk.probability * risk.impact;
  };

  const columns: { status: RoamStatus; title: string; color: string }[] = [
    { status: 'resolved', title: 'Resolved', color: 'bg-success/10 border-success/20' },
    { status: 'owned', title: 'Owned', color: 'bg-primary/10 border-primary/20' },
    { status: 'accepted', title: 'Accepted', color: 'bg-warning/10 border-warning/20' },
    { status: 'mitigated', title: 'Mitigated', color: 'bg-secondary/10 border-secondary/20' },
  ];

  const getDistribution = () => {
    const total = risks?.length || 0;
    return columns.map(col => ({
      ...col,
      count: getRisksByStatus(col.status).length,
      percentage: total > 0 ? Math.round((getRisksByStatus(col.status).length / total) * 100) : 0,
    }));
  };

  const handleCreate = () => {
    if (!selectedProgramId || selectedPIId.length === 0) {
      toast.error('Please select a program and PI first');
      return;
    }
    setEditingRisk(null);
    setDialogOpen(true);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">ROAM Board</h1>
          <p className="text-muted-foreground">Manage risks and opportunities</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Risk
        </Button>
      </div>

      <div className="flex gap-4">
        <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Select Program" />
          </SelectTrigger>
          <SelectContent>
            {programs?.map((program) => (
              <SelectItem key={program.id} value={program.id}>
                {program.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <PISelector value={selectedPIId} onChange={setSelectedPIId} />
      </div>

      {selectedProgramId && selectedPIId.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            {getDistribution().map(item => (
              <Card key={item.status} className={`p-4 ${item.color}`}>
                <div className="text-center">
                  <div className="text-3xl font-bold">{item.count}</div>
                  <div className="text-sm text-muted-foreground">{item.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{item.percentage}%</div>
                </div>
              </Card>
            ))}
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-4 gap-4">
              {columns.map((column) => (
                <div key={column.status} className="space-y-2">
                  <h3 className="font-semibold text-center">{column.title}</h3>
                  <Droppable droppableId={column.status}>
                    {(provided) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`p-4 min-h-[500px] ${column.color}`}
                      >
                        <div className="space-y-2">
                          {getRisksByStatus(column.status).map((risk, index) => (
                            <Draggable key={risk.id} draggableId={risk.id} index={index}>
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className="p-3 bg-card border rounded-lg space-y-2"
                                >
                                  <div className="font-medium text-sm">{risk.name}</div>
                                  {risk.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                      {risk.description}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-2">
                                    {risk.probability && risk.impact && (
                                      <Badge variant="outline" className="text-xs">
                                        Score: {getRiskScore(risk)}
                                      </Badge>
                                    )}
                                    {risk.probability && (
                                      <span className="text-xs text-muted-foreground">
                                        P: {risk.probability}
                                      </span>
                                    )}
                                    {risk.impact && (
                                      <span className="text-xs text-muted-foreground">
                                        I: {risk.impact}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      </Card>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        </div>
      )}

      <RiskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        risk={editingRisk}
      />
    </div>
  );
}
