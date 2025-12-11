import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { GripVertical, CheckSquare } from 'lucide-react';
import { EpicContextMenu } from './EpicContextMenu';
import { EpicLabelSelector } from './EpicLabelSelector';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Epic {
  id: string;
  epic_key?: string;
  name: string;
  state: string;
  status?: string;
  health?: string;
  mvp?: boolean;
  points_estimate?: number;
  estimate?: number;
  global_rank: number;
  primary_program_id?: string;
  portfolio_id?: string;
  theme_id?: string;
  owner_id?: string;
  start_date?: string;
  end_date?: string;
  created_at?: string;
  updated_at?: string;
  process_step_id?: string;
}

interface EpicBacklogListViewProps {
  epics: Epic[];
  onEpicSelect: (id: string) => void;
  onEpicClick?: (id: string) => void;
  onRefetch: () => void;
  onManageLabels?: () => void;
  visibleColumns?: string[];
  onSelectEpics?: (ids: string[]) => void;
}

const DEFAULT_COLUMNS = ['id', 'name', 'wsjf'];

export function EpicBacklogListView({ 
  epics, 
  onEpicSelect,
  onEpicClick,
  onRefetch,
  onManageLabels,
  visibleColumns = DEFAULT_COLUMNS,
  onSelectEpics
}: EpicBacklogListViewProps) {
  const [selectedEpics, setSelectedEpics] = useState<Set<string>>(new Set());

  // Fetch labels for all epics
  const { data: labelsMap } = useQuery({
    queryKey: ['epic-labels-map', epics.map(e => e.id)],
    queryFn: async () => {
      if (!epics.length) return {};
      
      const { data, error } = await supabase
        .from('epic_label_assignments')
        .select('epic_id, epic_labels(*)')
        .in('epic_id', epics.map(e => e.id));
      
      if (error) throw error;
      
      const map: Record<string, any[]> = {};
      data.forEach((assignment) => {
        if (!map[assignment.epic_id]) {
          map[assignment.epic_id] = [];
        }
        if (assignment.epic_labels) {
          map[assignment.epic_id].push(assignment.epic_labels);
        }
      });
      return map;
    },
    enabled: epics.length > 0,
  });

  const toggleSelect = (epicId: string) => {
    const newSelected = new Set(selectedEpics);
    if (newSelected.has(epicId)) {
      newSelected.delete(epicId);
    } else {
      newSelected.add(epicId);
    }
    setSelectedEpics(newSelected);
    onSelectEpics?.(Array.from(newSelected));
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) return;

    const reorderedEpics = Array.from(epics);
    const [movedEpic] = reorderedEpics.splice(sourceIndex, 1);
    reorderedEpics.splice(destinationIndex, 0, movedEpic);

    // Update global_rank for all affected epics
    try {
      const updates = reorderedEpics.map((epic, index) => ({
        id: epic.id,
        global_rank: index + 1,
      }));

      for (const update of updates) {
        await supabase
          .from('epics')
          .update({ global_rank: update.global_rank })
          .eq('id', update.id);
      }

      toast.success('Epic order updated');
      onRefetch();
    } catch (error) {
      console.error('Error updating epic order:', error);
      toast.error('Failed to update epic order');
    }
  };

  const getStatusColor = (state?: string) => {
    switch (state) {
      case 'not_started':
        return 'bg-muted';
      case 'in_progress':
        return 'bg-info';
      case 'done':
        return 'bg-success';
      default:
        return 'bg-brand-gold';
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b">
              <TableHead className="w-8"></TableHead>
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead className="w-12"></TableHead>
              {visibleColumns.includes('id') && <TableHead className="w-24">ID</TableHead>}
              {visibleColumns.includes('epic_key') && <TableHead className="w-32">Epic Key</TableHead>}
              <TableHead className="w-12"></TableHead>
              {visibleColumns.includes('name') && <TableHead className="min-w-[400px]">Epic</TableHead>}
              {visibleColumns.includes('wsjf') && <TableHead className="w-32 text-right">Tech Score</TableHead>}
            </TableRow>
          </TableHeader>
          <Droppable droppableId="epics-list">
            {(provided) => (
              <TableBody ref={provided.innerRef} {...provided.droppableProps}>
                {epics.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={20} className="text-center py-12 text-muted-foreground">
                      <div className="text-sm">Drag & Drop Items Here</div>
                    </TableCell>
                  </TableRow>
                ) : (
                  epics.map((epic, index) => (
                    <Draggable key={epic.id} draggableId={epic.id} index={index}>
                      {(provided, snapshot) => (
                        <EpicContextMenu epicId={epic.id} onRefetch={onRefetch}>
                          <TableRow
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={cn(
                              "cursor-pointer hover:bg-accent/20 transition-colors border-b group",
                              selectedEpics.has(epic.id) && "bg-accent/10",
                              snapshot.isDragging && "bg-accent/30 shadow-lg"
                            )}
                          >
                            <TableCell className="p-2" {...provided.dragHandleProps}>
                              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                            </TableCell>
                            
                            <TableCell className="text-sm text-center text-muted-foreground">{index + 1}</TableCell>
                            
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Checkbox 
                                checked={selectedEpics.has(epic.id)}
                                onCheckedChange={() => toggleSelect(epic.id)}
                                className="border-2"
                              />
                            </TableCell>

                            {visibleColumns.includes('id') && (
                              <TableCell className="font-mono text-sm" onClick={() => onEpicSelect(epic.id)}>
                                {epic.epic_key || index + 1100}
                              </TableCell>
                            )}

                            {visibleColumns.includes('epic_key') && (
                              <TableCell className="font-mono text-sm text-muted-foreground" onClick={() => onEpicSelect(epic.id)}>
                                {epic.epic_key || '-'}
                              </TableCell>
                            )}

                            <TableCell className="p-2">
                              <div className={cn("w-3 h-3 rounded-full", getStatusColor(epic.state))} />
                            </TableCell>

                            {visibleColumns.includes('name') && (
                              <TableCell>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <CheckSquare className="h-4 w-4 text-primary" />
                                    <span className="font-medium text-sm cursor-pointer" onClick={() => onEpicSelect(epic.id)}>
                                      {epic.name}
                                    </span>
                                  </div>
                                  {/* Labels for the epic - populated dynamically from labelsMap */}
                                  {labelsMap?.[epic.id] && labelsMap[epic.id].length > 0 && (
                                    <div className="flex gap-2 flex-wrap">
                                      {labelsMap[epic.id].map((label: any) => (
                                        <Badge 
                                          key={label.id} 
                                          style={{ backgroundColor: label.color }} 
                                          className="text-white border-0 text-xs px-2 py-0.5"
                                        >
                                          {label.name}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            )}

                            {visibleColumns.includes('wsjf') && (
                              <TableCell className="text-right text-sm font-semibold" onClick={() => onEpicSelect(epic.id)}>
                                {(5.5 + (epic.global_rank ?? 0) * 0.1).toFixed(2)}
                              </TableCell>
                            )}
                          </TableRow>
                        </EpicContextMenu>
                      )}
                    </Draggable>
                  ))
                )}
                {provided.placeholder}
              </TableBody>
            )}
          </Droppable>
        </Table>
      </div>
    </DragDropContext>
  );
}
