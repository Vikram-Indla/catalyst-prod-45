import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { HealthBadge } from '@/components/shared/HealthBadge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { PermissionGuard } from '@/components/shared/PermissionGuard';

type CardType = 'br-epic' | 'epic';
type SwimlaneType = 'theme' | 'initiative';

export default function PortfolioKanban() {
  const [cardType, setCardType] = useState<CardType>('epic');
  const [swimlaneType, setSwimlaneType] = useState<SwimlaneType>('theme');
  const queryClient = useQueryClient();

  // Fetch epics
  const { data: epics } = useQuery({
    queryKey: ['epics-kanban'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epics')
        .select('*, strategic_themes(name), business_requests(name)')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch business requests
  const { data: businessRequests } = useQuery({
    queryKey: ['business-requests-kanban'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_requests')
        .select('*, strategic_themes(name), initiatives(name)')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch themes for swimlanes
  const { data: themes } = useQuery({
    queryKey: ['strategic_themes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategic_themes')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch initiatives for swimlanes
  const { data: initiatives } = useQuery({
    queryKey: ['initiatives'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('initiatives')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Update epic status
  const updateEpicStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: any }) => {
      const { error } = await supabase
        .from('epics')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epics-kanban'] });
    },
  });

  // Update BR status
  const updateBRStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: any }) => {
      const { error } = await supabase
        .from('business_requests')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-requests-kanban'] });
    },
  });

  const columns = cardType === 'epic' 
    ? ['proposed', 'analyzing', 'approved', 'in_progress', 'done']
    : ['proposed', 'analyzing', 'approved', 'in_progress', 'done', 'cancelled'];

  const columnLabels: Record<string, string> = {
    proposed: 'Proposed',
    analyzing: 'Analyzing',
    approved: 'Approved',
    in_progress: 'In Progress',
    done: 'Done',
    cancelled: 'Cancelled',
  };

  const getItemsForColumn = (columnStatus: string, swimlaneId?: string) => {
    if (cardType === 'epic') {
      return epics?.filter(epic => {
        const statusMatch = epic.status === columnStatus;
        if (!swimlaneId) return statusMatch;
        if (swimlaneType === 'theme') {
          return statusMatch && epic.theme_id === swimlaneId;
        }
        return statusMatch;
      }) || [];
    } else {
      return businessRequests?.filter(br => {
        const statusMatch = br.status === columnStatus;
        if (!swimlaneId) return statusMatch;
        if (swimlaneType === 'theme') {
          return statusMatch && br.theme_id === swimlaneId;
        } else if (swimlaneType === 'initiative') {
          return statusMatch && br.initiative_id === swimlaneId;
        }
        return statusMatch;
      }) || [];
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceStatus = result.source.droppableId.split('-')[0];
    const destStatus = result.destination.droppableId.split('-')[0];
    
    if (sourceStatus === destStatus) return;

    const itemId = result.draggableId;
    
    if (cardType === 'epic') {
      updateEpicStatus.mutate({ id: itemId, status: destStatus });
    } else {
      updateBRStatus.mutate({ id: itemId, status: destStatus });
    }
  };

  const swimlanes = swimlaneType === 'theme' ? themes : initiatives;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Portfolio Kanban</h1>
            <p className="text-sm text-muted-foreground">Visualize portfolio work flow</p>
          </div>
          <PermissionGuard requiredRole="program_manager" showMessage={false}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Item
            </Button>
          </PermissionGuard>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Card Type:</span>
            <Tabs value={cardType} onValueChange={(v) => setCardType(v as CardType)}>
              <TabsList>
                <TabsTrigger value="epic">Epic</TabsTrigger>
                <TabsTrigger value="br-epic">BR/Epic</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Swimlanes:</span>
            <Tabs value={swimlaneType} onValueChange={(v) => setSwimlaneType(v as SwimlaneType)}>
              <TabsList>
                <TabsTrigger value="theme">Theme</TabsTrigger>
                <TabsTrigger value="initiative">Initiative</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden">
        <DragDropContext onDragEnd={handleDragEnd}>
          <ScrollArea className="h-full">
            <div className="p-6">
              {/* Column Headers */}
              <div className="flex gap-4 mb-4 sticky top-0 bg-background z-10 pb-2">
                {columns.map(column => (
                  <div key={column} className="flex-1 min-w-[280px]">
                    <div className="font-semibold text-sm px-3 py-2 bg-muted rounded-t-lg">
                      {columnLabels[column]}
                      <Badge variant="secondary" className="ml-2">
                        {getItemsForColumn(column).length}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>

              {/* Swimlanes */}
              {swimlanes?.map(swimlane => (
                <div key={swimlane.id} className="mb-6">
                  <div className="font-medium text-sm mb-2 px-3 text-muted-foreground">
                    {swimlane.name}
                  </div>
                  <div className="flex gap-4">
                    {columns.map(column => (
                      <Droppable key={`${column}-${swimlane.id}`} droppableId={`${column}-${swimlane.id}`}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`flex-1 min-w-[280px] min-h-[100px] p-3 rounded-lg border-2 border-dashed transition-colors ${
                              snapshot.isDraggingOver ? 'border-primary bg-primary/5' : 'border-transparent bg-muted/30'
                            }`}
                          >
                            <div className="space-y-2">
                              {getItemsForColumn(column, swimlane.id).map((item, index) => (
                                <Draggable key={item.id} draggableId={item.id} index={index}>
                                  {(provided, snapshot) => (
                                    <Card
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      className={`p-3 cursor-move transition-shadow ${
                                        snapshot.isDragging ? 'shadow-lg' : ''
                                      }`}
                                    >
                                      <div {...provided.dragHandleProps} className="flex items-start gap-2">
                                        <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <p className="font-medium text-sm mb-2 line-clamp-2">{item.name}</p>
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <HealthBadge health={item.health} />
                                            {cardType === 'br-epic' && item.wsjf_score && (
                                              <Badge variant="outline" className="text-xs">
                                                WSJF: {item.wsjf_score}
                                              </Badge>
                                            )}
                                            {item.estimate && (
                                              <Badge variant="outline" className="text-xs">
                                                {item.estimate}
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </Card>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          </div>
                        )}
                      </Droppable>
                    ))}
                  </div>
                </div>
              ))}

              {/* No Swimlane Items */}
              <div className="mt-6">
                <div className="font-medium text-sm mb-2 px-3 text-muted-foreground">
                  Unassigned
                </div>
                <div className="flex gap-4">
                  {columns.map(column => (
                    <Droppable key={`${column}-unassigned`} droppableId={`${column}-unassigned`}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex-1 min-w-[280px] min-h-[100px] p-3 rounded-lg border-2 border-dashed transition-colors ${
                            snapshot.isDraggingOver ? 'border-primary bg-primary/5' : 'border-transparent bg-muted/30'
                          }`}
                        >
                          <div className="space-y-2">
                            {getItemsForColumn(column).filter(item => {
                              if (cardType === 'epic') {
                                return !item.theme_id;
                              } else {
                                return swimlaneType === 'theme' ? !item.theme_id : !(item as any).initiative_id;
                              }
                            }).map((item, index) => (
                              <Draggable key={item.id} draggableId={item.id} index={index}>
                                {(provided, snapshot) => (
                                  <Card
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={`p-3 cursor-move transition-shadow ${
                                      snapshot.isDragging ? 'shadow-lg' : ''
                                    }`}
                                  >
                                    <div {...provided.dragHandleProps} className="flex items-start gap-2">
                                      <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm mb-2 line-clamp-2">{item.name}</p>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <HealthBadge health={item.health} />
                                          {cardType === 'br-epic' && (item as any).wsjf_score && (
                                            <Badge variant="outline" className="text-xs">
                                              WSJF: {(item as any).wsjf_score}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </Card>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        </div>
                      )}
                    </Droppable>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </DragDropContext>
      </div>
    </div>
  );
}
