import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Star, User, Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
// Native scroll used instead of ScrollArea for better horizontal/vertical scroll support
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';

interface BusinessRequest {
  id: string;
  request_key: string | null;
  title: string;
  process_step: string;
  business_score: number | null;
  rank: number | null;
  delivery_platform: string | null;
  business_owner?: string | null;
  end_date?: string | null;
  updated_at?: string | null;
}

interface BusinessRequestsKanbanViewProps {
  requests: BusinessRequest[];
  onRequestSelect: (id: string) => void;
  allExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

import { PROCESS_STEPS } from '@/types/business-request';

// Use the centralized PROCESS_STEPS as Kanban columns - no colors (neutral styling)
const KANBAN_COLUMNS = PROCESS_STEPS.map(step => ({
  id: step.value,
  label: step.label,
}));

export function BusinessRequestsKanbanView({ requests, onRequestSelect, allExpanded, onExpandedChange }: BusinessRequestsKanbanViewProps) {
  const queryClient = useQueryClient();
  // All columns collapsed by default except 'in_progress'
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(
    new Set(['request_received', 'under_study', 'awaiting_business_response', 'reopen', 'on_hold', 'closed', 'completed'])
  );

  // Sync with external expand/collapse control
  useEffect(() => {
    if (allExpanded === true) {
      setCollapsedColumns(new Set());
    } else if (allExpanded === false) {
      setCollapsedColumns(new Set(KANBAN_COLUMNS.map(c => c.id)));
    }
  }, [allExpanded]);

  const toggleColumnCollapse = (columnId: string) => {
    setCollapsedColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnId)) {
        newSet.delete(columnId);
      } else {
        newSet.add(columnId);
      }
      return newSet;
    });
  };

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

  const formatTargetDate = (date: string | null | undefined) => {
    if (!date) return null;
    try {
      return format(new Date(date), 'MMM dd, yyyy');
    } catch {
      return date;
    }
  };

  const getTimeInStatus = (updatedAt: string | null | undefined) => {
    if (!updatedAt) return null;
    try {
      const updated = new Date(updatedAt);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - updated.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch {
      return null;
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="text-xs text-muted-foreground/60 mb-2 italic">Click any column to expand</div>
        <div className="flex-1 w-full overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
          <div className="flex gap-3 pb-4 pr-4" style={{ minWidth: 'max-content' }}>
            {KANBAN_COLUMNS.map(column => {
              const columnRequests = getRequestsByStatus(column.id);
              const isCollapsed = collapsedColumns.has(column.id);
              
              if (isCollapsed) {
                return (
                  <div 
                    key={column.id} 
                    className="flex-shrink-0 w-12 cursor-pointer group"
                    onClick={() => toggleColumnCollapse(column.id)}
                  >
                    <Card className="h-full bg-card/50 backdrop-blur-sm border-border/50 hover:border-brand-gold/30 transition-colors">
                      <div className="h-full flex flex-col items-center py-4">
                        <div className="w-3 h-3 rounded-full shadow-sm bg-muted border border-border" />
                        <Badge variant="secondary" className="rounded-full text-xs font-medium px-2 py-0.5 bg-muted/80 mb-3">
                          {columnRequests.length}
                        </Badge>
                        <div className="flex-1 flex items-center justify-center">
                          <span 
                            className="text-sm font-semibold tracking-tight text-foreground/80 whitespace-nowrap"
                            style={{ 
                              writingMode: 'vertical-rl',
                              textOrientation: 'mixed',
                              transform: 'rotate(180deg)'
                            }}
                          >
                            {column.label}
                          </span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground mt-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Card>
                  </div>
                );
              }

              return (
                <div key={column.id} className="flex-shrink-0 w-[300px]">
                  <Card className="h-full bg-card/50 backdrop-blur-sm border-border/50 flex flex-col max-h-[calc(100vh-280px)]">
                    <CardHeader className="pb-3 bg-card/95 backdrop-blur-sm z-10 border-b border-border/30 flex-shrink-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => toggleColumnCollapse(column.id)}
                            className="p-0.5 hover:bg-muted/50 rounded transition-colors"
                          >
                            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                          </button>
                          <div className="w-3 h-3 rounded-full shadow-sm bg-muted border border-border" />
                          <CardTitle className="text-sm font-semibold tracking-tight">{column.label}</CardTitle>
                        </div>
                        <Badge variant="secondary" className="rounded-full text-xs font-medium px-2.5 py-0.5 bg-muted/80">
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
                            "space-y-3 min-h-[200px] flex-1 overflow-y-auto transition-colors p-3",
                            snapshot.isDraggingOver && "bg-accent/10"
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
                                    "cursor-pointer hover:shadow-lg hover:border-brand-gold/30 transition-all duration-200 bg-card border-border/60",
                                    snapshot.isDragging && "shadow-xl rotate-1 border-brand-gold/50"
                                  )}
                                  onClick={() => onRequestSelect(request.id)}
                                >
                                  <CardContent className="p-4 space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                      <span className="text-sm font-medium line-clamp-2 text-foreground/90">{request.title}</span>
                                      {request.rank && request.rank <= 10 && (
                                        <Star className="h-3.5 w-3.5 text-red-400 fill-red-400 shrink-0" />
                                      )}
                                    </div>
                                    
                                    {request.request_key && (
                                      <div className="text-xs text-brand-gold font-mono font-medium">
                                        {request.request_key.startsWith('MIM-') 
                                          ? request.request_key 
                                          : `MIM-${String(request.request_key).padStart(3, '0')}`}
                                      </div>
                                    )}

                                    {request.business_owner && (
                                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <User className="h-3 w-3" />
                                        <span className="truncate">{request.business_owner}</span>
                                      </div>
                                    )}

                                    {getTimeInStatus(request.updated_at) !== null && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-help">
                                            <Clock className="h-3 w-3" />
                                            <span>{getTimeInStatus(request.updated_at)}d in status</span>
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="text-xs">
                                          Time in current status: {getTimeInStatus(request.updated_at)} days
                                        </TooltipContent>
                                      </Tooltip>
                                    )}

                                    <div className="flex items-center justify-between pt-1 border-t border-border/30">
                                      {request.business_score !== null ? (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <span className="cursor-help">
                                              {getBusinessScoreBadge(request.business_score)}
                                            </span>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="text-xs">
                                            Business Score: {request.business_score}/100
                                          </TooltipContent>
                                        </Tooltip>
                                      ) : <span />}
                                      
                                      {request.end_date && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground cursor-help">
                                              <Calendar className="h-3 w-3" />
                                              <span>{formatTargetDate(request.end_date)}</span>
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="text-xs">
                                            Target Completion Date
                                          </TooltipContent>
                                        </Tooltip>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {columnRequests.length === 0 && (
                            <div className="text-center py-12 text-sm text-muted-foreground/60 italic">
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
        </div>
      </DragDropContext>
    </TooltipProvider>
  );
}
