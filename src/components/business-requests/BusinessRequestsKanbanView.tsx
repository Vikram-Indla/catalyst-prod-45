import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface BusinessRequest {
  id: string;
  request_key: string | null;
  title: string;
  process_step: string;
  business_score: number | null;
  rank: number | null;
  planned_quarter: string | null;
  delivery_platform: string | null;
}

interface BusinessRequestsKanbanViewProps {
  requests: BusinessRequest[];
  onRequestSelect: (id: string) => void;
}

// Kanban columns based on the process step statuses from image 4
const KANBAN_COLUMNS = [
  { id: 'request_received', label: 'Request Received', color: 'bg-[#4a4a4a]' },
  { id: 'under_study', label: 'Under Study', color: 'bg-[#c4c4c4]' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-[#5c4b8a]' },
  { id: 'awaiting_business_response', label: 'Awaiting Business Response', color: 'bg-[#a0a0a0]' },
  { id: 'reopen', label: 'Reopen', color: 'bg-[#4ecdc4]' },
  { id: 'on_hold', label: 'On Hold', color: 'bg-[#c9a0a0]' },
  { id: 'closed', label: 'Closed', color: 'bg-[#1a1a1a]' },
  { id: 'completed', label: 'Completed', color: 'bg-[#6abf4b]' },
];

export function BusinessRequestsKanbanView({ requests, onRequestSelect }: BusinessRequestsKanbanViewProps) {
  const queryClient = useQueryClient();

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const requestId = result.draggableId;
    const newStatus = result.destination.droppableId;

    try {
      const { error } = await supabase
        .from('business_requests')
        .update({ process_step: newStatus })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Request status updated');
      queryClient.invalidateQueries({ queryKey: ['business-requests'] });
    } catch (error) {
      console.error('Error updating request status:', error);
      toast.error('Failed to update request status');
    }
  };

  const getRequestsByStatus = (status: string) => {
    return requests.filter(r => r.process_step === status);
  };

  const getBusinessScoreBadge = (score: number | null | undefined) => {
    if (score === null || score === undefined) return null;
    let colorClass = 'bg-destructive/10 text-destructive';
    if (score >= 90) colorClass = 'bg-green-100 text-green-700';
    else if (score >= 75) colorClass = 'bg-emerald-100 text-emerald-700';
    else if (score >= 60) colorClass = 'bg-amber-100 text-amber-700';
    else if (score >= 40) colorClass = 'bg-orange-100 text-orange-700';
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
        {score}
      </span>
    );
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map(column => {
          const columnRequests = getRequestsByStatus(column.id);
          return (
            <div key={column.id} className="flex-shrink-0 w-[280px]">
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-3 h-3 rounded-full", column.color)} />
                      <CardTitle className="text-sm font-medium">{column.label}</CardTitle>
                    </div>
                    <Badge variant="secondary" className="rounded-full">
                      {columnRequests.length}
                    </Badge>
                  </div>
                </CardHeader>
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <CardContent
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "space-y-2 min-h-[200px] transition-colors",
                        snapshot.isDraggingOver && "bg-accent/5"
                      )}
                    >
                      {columnRequests.map((request, index) => (
                        <Draggable key={request.id} draggableId={request.id} index={index}>
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={cn(
                                "cursor-pointer hover:shadow-md transition-shadow",
                                snapshot.isDragging && "shadow-lg rotate-2"
                              )}
                              onClick={() => onRequestSelect(request.id)}
                            >
                              <CardContent className="p-3 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <span className="text-sm font-medium line-clamp-2">{request.title}</span>
                                  {request.rank && request.rank <= 10 && (
                                    <Star className="h-3 w-3 text-red-400 fill-red-400 shrink-0" />
                                  )}
                                </div>
                                
                                {request.request_key && (
                                  <div className="text-xs text-brand-gold font-mono">
                                    {request.request_key.startsWith('MIM-') 
                                      ? request.request_key 
                                      : `MIM-${String(request.request_key).padStart(3, '0')}`}
                                  </div>
                                )}

                                {request.delivery_platform && (
                                  <div className="text-xs text-muted-foreground truncate">
                                    {request.delivery_platform}
                                  </div>
                                )}

                                <div className="flex items-center justify-between">
                                  {request.business_score !== null && getBusinessScoreBadge(request.business_score)}
                                  {request.planned_quarter && (
                                    <span className="text-xs text-muted-foreground">
                                      {request.planned_quarter}
                                    </span>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {columnRequests.length === 0 && (
                        <div className="text-center py-8 text-sm text-muted-foreground">
                          Drop requests here
                        </div>
                      )}
                    </CardContent>
                  )}
                </Droppable>
              </Card>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
