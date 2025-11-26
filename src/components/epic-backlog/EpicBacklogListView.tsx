import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, ChevronRight, ChevronDown, GripVertical } from 'lucide-react';
import { EpicContextMenu } from './EpicContextMenu';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

interface Epic {
  id: string;
  epic_key?: string;
  name: string;
  state: string;
  owner_id?: string;
  mvp?: boolean;
  points_estimate?: number;
  global_rank: number;
  parked_at?: string;
  strategic_themes?: { name: string };
}

interface EpicBacklogListViewProps {
  epics: Epic[];
  onEpicSelect: (id: string) => void;
  onRefetch: () => void;
  selectedProgram?: string;
  selectedPI?: string;
}

export function EpicBacklogListView({ epics, onEpicSelect, onRefetch, selectedProgram, selectedPI }: EpicBacklogListViewProps) {
  const [newEpicName, setNewEpicName] = useState('');
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Quick add epic mutation
  const addEpicMutation = useMutation({
    mutationFn: async (name: string) => {
      const maxRank = Math.max(...epics.map(e => e.global_rank), 0);
      const { data, error } = await supabase
        .from('epics')
        .insert({
          name,
          global_rank: maxRank + 1,
          state: 'not_started',
          primary_program_id: selectedProgram || null,
        })
        .select()
        .single();
      if (error) throw error;
      
      // If PI selected, assign to PI
      if (selectedPI && data) {
        await supabase
          .from('epic_program_increments')
          .insert({ epic_id: data.id, pi_id: selectedPI });
      }
      
      return data;
    },
    onSuccess: () => {
      setNewEpicName('');
      onRefetch();
      toast({ title: 'Epic added successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to add epic', variant: 'destructive' });
    },
  });

  // Fetch children for expanded epics
  const { data: epicChildren } = useQuery({
    queryKey: ['epic-children', Array.from(expandedEpics)],
    queryFn: async () => {
      if (expandedEpics.size === 0) return {};
      
      const epicIds = Array.from(expandedEpics);
      const [features, capabilities] = await Promise.all([
        supabase
          .from('features')
          .select('*')
          .in('epic_id', epicIds)
          .order('rank_within_epic'),
        supabase
          .from('capabilities')
          .select('*')
          .in('epic_id', epicIds)
          .order('rank_within_epic'),
      ]);
      
      const result: Record<string, any[]> = {};
      epicIds.forEach(id => {
        result[id] = [
          ...(capabilities.data?.filter(c => c.epic_id === id) || []),
          ...(features.data?.filter(f => f.epic_id === id) || []),
        ];
      });
      
      return result;
    },
    enabled: expandedEpics.size > 0,
  });

  // Handle drag and drop ranking
  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(epics);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    
    // Update ranks
    const updates = items.map((epic, index) => ({
      id: epic.id,
      global_rank: index,
    }));
    
    try {
      for (const update of updates) {
        await supabase
          .from('epics')
          .update({ global_rank: update.global_rank })
          .eq('id', update.id);
      }
      onRefetch();
      toast({ title: 'Epic ranking updated' });
    } catch (error) {
      toast({ title: 'Failed to update ranking', variant: 'destructive' });
    }
  };

  const toggleExpand = (epicId: string) => {
    const newExpanded = new Set(expandedEpics);
    if (newExpanded.has(epicId)) {
      newExpanded.delete(epicId);
    } else {
      newExpanded.add(epicId);
    }
    setExpandedEpics(newExpanded);
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'not_started': return 'bg-gray-500';
      case 'in_progress': return 'bg-blue-500';
      case 'accepted': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  // Separate parked epics
  const activeEpics = epics.filter(e => !e.parked_at);
  const parkedEpics = epics.filter(e => e.parked_at);

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* Quick Add */}
      <div className="flex gap-2">
        <Input
          placeholder="New Epic Name"
          value={newEpicName}
          onChange={(e) => setNewEpicName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newEpicName.trim()) {
              addEpicMutation.mutate(newEpicName.trim());
            }
          }}
          className="max-w-md"
        />
        <Button
          onClick={() => newEpicName.trim() && addEpicMutation.mutate(newEpicName.trim())}
          disabled={!newEpicName.trim() || addEpicMutation.isPending}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add
        </Button>
      </div>

      {/* Active Epics */}
      <div className="border rounded-lg">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="epic-list">
            {(provided) => (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead className="w-12">Rank</TableHead>
                    <TableHead className="w-12">State</TableHead>
                    <TableHead className="w-24">ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Theme</TableHead>
                    <TableHead className="w-20">MVP</TableHead>
                    <TableHead className="w-24">Points</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody ref={provided.innerRef} {...provided.droppableProps}>
                  {activeEpics.map((epic, index) => (
                    <Draggable key={epic.id} draggableId={epic.id} index={index}>
                      {(provided) => (
                        <>
                          <TableRow
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="cursor-pointer hover:bg-muted/50"
                          >
                            <TableCell {...provided.dragHandleProps}>
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{epic.global_rank + 1}</TableCell>
                            <TableCell>
                              <div className={`w-3 h-3 rounded-full ${getStateColor(epic.state)}`} title={epic.state} />
                            </TableCell>
                            <TableCell className="text-sm font-mono">{epic.epic_key || epic.id.slice(0, 8)}</TableCell>
                            <TableCell>
                              <EpicContextMenu epicId={epic.id} onRefetch={onRefetch}>
                                <div className="flex items-center gap-2">
                                  {(epicChildren?.[epic.id]?.length || 0) > 0 && (
                                    <button onClick={(e) => { e.stopPropagation(); toggleExpand(epic.id); }}>
                                      {expandedEpics.has(epic.id) ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                    </button>
                                  )}
                                  <span className="font-medium hover:text-primary" onClick={() => onEpicSelect(epic.id)}>
                                    {epic.name}
                                  </span>
                                </div>
                              </EpicContextMenu>
                            </TableCell>
                            <TableCell className="text-sm">{epic.strategic_themes?.name || '-'}</TableCell>
                            <TableCell>{epic.mvp && <Badge variant="secondary">MVP</Badge>}</TableCell>
                            <TableCell className="text-sm">{epic.points_estimate || '-'}</TableCell>
                          </TableRow>
                          {expandedEpics.has(epic.id) && epicChildren?.[epic.id] && (
                            epicChildren[epic.id].map((child: any) => (
                              <TableRow key={child.id} className="bg-muted/30">
                                <TableCell colSpan={4}></TableCell>
                                <TableCell colSpan={4} className="pl-12 text-sm text-muted-foreground">
                                  └─ {child.name} ({child.capability_key || child.feature_key || 'Child'})
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </TableBody>
              </Table>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* Parking Lot */}
      {parkedEpics.length > 0 && (
        <div className="border rounded-lg bg-muted/20">
          <div className="px-4 py-2 bg-muted font-medium text-sm">Parking Lot</div>
          <Table>
            <TableBody>
              {parkedEpics.map((epic) => (
                <TableRow key={epic.id} className="cursor-pointer" onClick={() => onEpicSelect(epic.id)}>
                  <TableCell className="w-12"></TableCell>
                  <TableCell className="w-12">
                    <div className={`w-3 h-3 rounded-full ${getStateColor(epic.state)}`} />
                  </TableCell>
                  <TableCell className="w-24 text-sm font-mono">{epic.epic_key || epic.id.slice(0, 8)}</TableCell>
                  <TableCell className="font-medium">{epic.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">Parked</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
