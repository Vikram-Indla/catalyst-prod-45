import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { GripVertical, Plus } from 'lucide-react';
import { EpicContextMenu } from './EpicContextMenu';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
  owner_name?: string;
  start_date?: string;
  end_date?: string;
  target_completion_date?: string;
  created_at?: string;
  updated_at?: string;
  process_step_id?: string;
  // Joined data
  strategic_themes?: { name: string };
  programs?: { name: string };
}

interface EpicBacklogListViewProps {
  epics: Epic[];
  onEpicSelect: (id: string) => void;
  onEpicClick?: (id: string) => void;
  onRefetch: () => void;
  onManageLabels?: () => void;
  visibleColumns?: string[];
  onSelectEpics?: (ids: string[]) => void;
  onQuickAdd?: (name: string) => void;
}

// Production column order from audit
const PRODUCTION_COLUMNS = [
  { id: 'rank', label: 'Rank', width: 'w-20' },
  { id: 'name', label: 'Name', width: 'min-w-[300px]' },
  { id: 'epic_key', label: 'Epic Key', width: 'w-28', hidden: true }, // Hidden by default per screenshot
  { id: 'theme', label: 'Theme', width: 'w-48' },
  { id: 'program', label: 'Program', width: 'w-40' },
  { id: 'state', label: 'State', width: 'w-32' },
  { id: 'health', label: 'Health', width: 'w-24' },
  { id: 'owner', label: 'Owner', width: 'w-32' },
  { id: 'dates', label: 'Dates', width: 'w-40' },
  { id: 'estimate', label: 'Estimate', width: 'w-28' },
];

const DEFAULT_VISIBLE_COLUMNS = ['rank', 'name', 'theme', 'program', 'state', 'health', 'owner', 'dates', 'estimate'];

export function EpicBacklogListView({ 
  epics, 
  onEpicSelect,
  onEpicClick,
  onRefetch,
  onManageLabels,
  visibleColumns = DEFAULT_VISIBLE_COLUMNS,
  onSelectEpics,
  onQuickAdd
}: EpicBacklogListViewProps) {
  const [selectedEpics, setSelectedEpics] = useState<Set<string>>(new Set());
  const [quickAddName, setQuickAddName] = useState('');

  // Fetch theme and program names for epics
  const { data: enrichedEpics } = useQuery({
    queryKey: ['epic-enriched-data', epics.map(e => e.id)],
    queryFn: async () => {
      if (!epics.length) return [];
      
      const { data, error } = await supabase
        .from('epics')
        .select(`
          id,
          strategic_themes(name),
          programs:primary_program_id(name)
        `)
        .in('id', epics.map(e => e.id));
      
      if (error) throw error;
      return data || [];
    },
    enabled: epics.length > 0,
  });

  // Create a lookup map for enriched data
  const enrichedMap = new Map(enrichedEpics?.map(e => [e.id, e]) || []);

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

  const toggleSelectAll = () => {
    if (selectedEpics.size === epics.length) {
      setSelectedEpics(new Set());
      onSelectEpics?.([]);
    } else {
      const allIds = new Set(epics.map(e => e.id));
      setSelectedEpics(allIds);
      onSelectEpics?.(epics.map(e => e.id));
    }
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

  const handleQuickAddSubmit = () => {
    if (quickAddName.trim() && onQuickAdd) {
      onQuickAdd(quickAddName.trim());
      setQuickAddName('');
    }
  };

  const getStateBadge = (state?: string) => {
    const stateConfig: Record<string, { label: string; className: string }> = {
      'not_started': { label: 'not started', className: 'bg-muted text-muted-foreground' },
      'in_progress': { label: 'in progress', className: 'bg-info/20 text-info' },
      'done': { label: 'done', className: 'bg-success/20 text-success' },
      'blocked': { label: 'blocked', className: 'bg-destructive/20 text-destructive' },
    };
    const config = stateConfig[state || ''] || stateConfig['not_started'];
    return (
      <Badge variant="secondary" className={cn("text-xs font-normal", config.className)}>
        {config.label}
      </Badge>
    );
  };

  const getHealthBadge = (health?: string) => {
    const healthConfig: Record<string, { label: string; className: string }> = {
      'green': { label: 'green', className: 'bg-success/20 text-success border-success/30' },
      'yellow': { label: 'yellow', className: 'bg-warning/20 text-warning border-warning/30' },
      'amber': { label: 'amber', className: 'bg-warning/20 text-warning border-warning/30' },
      'red': { label: 'red', className: 'bg-destructive/20 text-destructive border-destructive/30' },
    };
    const config = healthConfig[health || 'green'] || healthConfig['green'];
    return (
      <Badge variant="outline" className={cn("text-xs font-normal border", config.className)}>
        {config.label}
      </Badge>
    );
  };

  const formatDates = (startDate?: string, endDate?: string) => {
    if (!startDate && !endDate) return '–';
    const start = startDate ? format(new Date(startDate), 'MMM d') : '–';
    const end = endDate ? format(new Date(endDate), 'MMM d') : '–';
    return `${start} – ${end}`;
  };

  const isColumnVisible = (columnId: string) => visibleColumns.includes(columnId);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b bg-muted/30">
              {/* Checkbox column */}
              <TableHead className="w-10 text-center">
                <Checkbox 
                  checked={selectedEpics.size === epics.length && epics.length > 0}
                  onCheckedChange={toggleSelectAll}
                  className="border-2"
                />
              </TableHead>
              {/* Drag handle column */}
              <TableHead className="w-8"></TableHead>
              {/* Dynamic columns based on visibility */}
              {PRODUCTION_COLUMNS.filter(col => isColumnVisible(col.id)).map(col => (
                <TableHead key={col.id} className={col.width}>
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <Droppable droppableId="epics-list">
            {(provided) => (
              <TableBody ref={provided.innerRef} {...provided.droppableProps}>
                {epics.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={PRODUCTION_COLUMNS.filter(col => isColumnVisible(col.id)).length + 2} className="text-center py-12 text-muted-foreground">
                      <div className="text-sm">Drag & Drop Items Here</div>
                    </TableCell>
                  </TableRow>
                ) : (
                  epics.map((epic, index) => {
                    const enriched = enrichedMap.get(epic.id);
                    const themeName = (enriched as any)?.strategic_themes?.name || '–';
                    const programName = (enriched as any)?.programs?.name || '–';
                    
                    return (
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
                              {/* Checkbox */}
                              <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                                <Checkbox 
                                  checked={selectedEpics.has(epic.id)}
                                  onCheckedChange={() => toggleSelect(epic.id)}
                                  className="border-2"
                                />
                              </TableCell>
                              
                              {/* Drag handle */}
                              <TableCell className="p-2" {...provided.dragHandleProps}>
                                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                              </TableCell>

                              {/* Rank */}
                              {isColumnVisible('rank') && (
                                <TableCell className="text-sm text-muted-foreground font-medium">
                                  {epic.global_rank || index + 1}
                                </TableCell>
                              )}

                              {/* Name */}
                              {isColumnVisible('name') && (
                                <TableCell onClick={() => onEpicSelect(epic.id)}>
                                  <span className="font-medium text-sm hover:text-primary hover:underline cursor-pointer">
                                    {epic.name}
                                  </span>
                                </TableCell>
                              )}

                              {/* Epic Key */}
                              {isColumnVisible('epic_key') && (
                                <TableCell className="font-mono text-sm text-muted-foreground">
                                  {epic.epic_key || '–'}
                                </TableCell>
                              )}

                              {/* Theme */}
                              {isColumnVisible('theme') && (
                                <TableCell className="text-sm">
                                  {themeName}
                                </TableCell>
                              )}

                              {/* Program */}
                              {isColumnVisible('program') && (
                                <TableCell className="text-sm">
                                  {programName}
                                </TableCell>
                              )}

                              {/* State */}
                              {isColumnVisible('state') && (
                                <TableCell>
                                  {getStateBadge(epic.state)}
                                </TableCell>
                              )}

                              {/* Health */}
                              {isColumnVisible('health') && (
                                <TableCell>
                                  {getHealthBadge(epic.health)}
                                </TableCell>
                              )}

                              {/* Owner */}
                              {isColumnVisible('owner') && (
                                <TableCell className="text-sm">
                                  {epic.owner_name || '–'}
                                </TableCell>
                              )}

                              {/* Dates */}
                              {isColumnVisible('dates') && (
                                <TableCell className="text-sm text-muted-foreground">
                                  {formatDates(epic.start_date, epic.target_completion_date || epic.end_date)}
                                </TableCell>
                              )}

                              {/* Estimate */}
                              {isColumnVisible('estimate') && (
                                <TableCell className="text-sm text-right">
                                  {epic.estimate || epic.points_estimate || '–'}
                                </TableCell>
                              )}
                            </TableRow>
                          </EpicContextMenu>
                        )}
                      </Draggable>
                    );
                  })
                )}
                {provided.placeholder}

                {/* Quick Add Row */}
                <TableRow className="hover:bg-muted/20">
                  <TableCell colSpan={2}></TableCell>
                  <TableCell colSpan={PRODUCTION_COLUMNS.filter(col => isColumnVisible(col.id)).length} className="py-2">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Quick add epic"
                        value={quickAddName}
                        onChange={(e) => setQuickAddName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleQuickAddSubmit();
                          }
                        }}
                        className="h-8 border-0 shadow-none bg-transparent focus-visible:ring-0 text-sm"
                      />
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            )}
          </Droppable>
        </Table>
      </div>
    </DragDropContext>
  );
}
