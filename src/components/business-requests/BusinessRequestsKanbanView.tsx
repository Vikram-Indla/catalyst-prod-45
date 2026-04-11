import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Star, User, Calendar, Clock, ChevronLeft, ChevronRight, MoreHorizontal, ExternalLink, Building2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { useActiveDemandProcessSteps } from '@/hooks/useDemandProcessSteps';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface BusinessRequest {
  id: string;
  request_key: string | null;
  title: string;
  process_step: string;
  business_score: number | null;
  rank: number | null;
  delivery_platform: string | null;
  business_owner?: string | null;
  department?: string | null;
  requestor?: string | null;
  end_date?: string | null;
  updated_at?: string | null;
}

interface BusinessRequestsKanbanViewProps {
  requests: BusinessRequest[];
  onRequestSelect: (id: string) => void;
  allExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

export function BusinessRequestsKanbanView({ requests, onRequestSelect, allExpanded, onExpandedChange }: BusinessRequestsKanbanViewProps) {
  const queryClient = useQueryClient();
  const { data: processSteps = [] } = useActiveDemandProcessSteps();
  
  // Use the dynamic process steps as Kanban columns
  const KANBAN_COLUMNS = processSteps.map(step => ({
    id: step.value,
    label: step.label,
  }));
  
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
      const { error } = await typedQuery('business_requests')
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

  const formatRequestId = (key: string | null) => {
    if (!key) return '—';
    return key.startsWith('MIM-') ? key : `MIM-${String(key).padStart(3, '0')}`;
  };

  const getPriorityBadge = (score: number | null | undefined, rank: number | null | undefined) => {
    if (score === null || score === undefined || score === 0) {
      return (
        <span 
          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
          style={{ 
            background: 'var(--surface-2)',
            color: 'var(--text-3)',
          }}
        >
          Unscored
        </span>
      );
    }
    
    let bgColor = 'var(--surface-2)';
    let textColor = 'var(--text-2)';
    
    if (score >= 80) {
      bgColor = 'rgba(92, 124, 92, 0.15)';
      textColor = 'var(--secondary-green)';
    } else if (score >= 60) {
      bgColor = 'rgba(198, 156, 109, 0.15)';
      textColor = 'var(--brand-primary)';
    } else if (score >= 40) {
      bgColor = 'rgba(198, 156, 109, 0.1)';
      textColor = 'var(--text-2)';
    }
    
    return (
      <span 
        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tabular-nums"
        style={{ background: bgColor, color: textColor }}
      >
        {score}
      </span>
    );
  };

  const getRankBadge = (rank: number | null | undefined) => {
    if (rank === null || rank === undefined) {
      return (
        <span 
          className="text-xs"
          style={{ color: 'var(--text-3)' }}
        >
          Unranked
        </span>
      );
    }
    
    const isTop10 = rank <= 10;
    return (
      <span 
        className={cn(
          "inline-flex items-center gap-1 text-xs font-medium tabular-nums",
          isTop10 && "font-semibold"
        )}
        style={{ color: isTop10 ? 'var(--brand-primary)' : 'var(--text-2)' }}
      >
        #{rank}
        {isTop10 && <Star className="h-3 w-3 fill-current" />}
      </span>
    );
  };

  const formatTargetDate = (date: string | null | undefined) => {
    if (!date) return null;
    try {
      return format(new Date(date), 'MMM dd');
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

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <DragDropContext onDragEnd={handleDragEnd}>
        {/* Board container - fills viewport */}
        <div 
          className="flex gap-3 pb-4 pr-4 overflow-x-auto"
          style={{ 
            height: 'calc(100vh - 200px)',
            minHeight: '400px',
          }}
        >
          {KANBAN_COLUMNS.map(column => {
            const columnRequests = getRequestsByStatus(column.id);
            const isCollapsed = collapsedColumns.has(column.id);
            
            // Collapsed column
            if (isCollapsed) {
              return (
                <div 
                  key={column.id} 
                  className="flex-shrink-0 w-12 cursor-pointer group"
                  onClick={() => toggleColumnCollapse(column.id)}
                  style={{ height: '100%' }}
                >
                  <div 
                    className="h-full flex flex-col items-center py-4 rounded-lg transition-colors"
                    style={{ 
                      background: 'var(--surface-1)',
                      border: '1px solid var(--divider)',
                    }}
                  >
                    <Badge 
                      variant="secondary" 
                      className="rounded-full text-xs font-semibold px-2 py-0.5 mb-3"
                      style={{ background: 'var(--surface-2)' }}
                    >
                      {columnRequests.length}
                    </Badge>
                    <div className="flex-1 flex items-center justify-center">
                      <span 
                        className="text-sm font-semibold tracking-tight whitespace-nowrap"
                        style={{ 
                          writingMode: 'vertical-rl',
                          textOrientation: 'mixed',
                          transform: 'rotate(180deg)',
                          color: 'var(--text-2)',
                        }}
                      >
                        {column.label}
                      </span>
                    </div>
                    <ChevronRight 
                      className="h-4 w-4 mt-3 opacity-0 group-hover:opacity-100 transition-opacity" 
                      style={{ color: 'var(--icon-muted)' }}
                    />
                  </div>
                </div>
              );
            }

            // Expanded column
            return (
              <div 
                key={column.id} 
                className="flex-shrink-0 w-[320px] flex flex-col"
                style={{ height: '100%' }}
              >
                <div 
                  className="flex flex-col h-full rounded-lg overflow-hidden"
                  style={{ 
                    background: 'var(--surface-1)',
                    border: '1px solid var(--divider)',
                  }}
                >
                  {/* Column header - sticky */}
                  <div 
                    className="sticky top-0 z-10 px-3 py-2.5 flex items-center justify-between flex-shrink-0"
                    style={{ 
                      background: 'var(--surface-2)',
                      borderBottom: '1px solid var(--divider)',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => toggleColumnCollapse(column.id)}
                        className="p-1 rounded hover:bg-muted/50 transition-colors"
                        style={{ color: 'var(--icon-muted)' }}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                        {column.label}
                      </span>
                      <Badge 
                        variant="secondary" 
                        className="rounded-full text-xs font-semibold px-2 py-0.5"
                        style={{ background: 'var(--brand-primary)', color: 'white' }}
                      >
                        {columnRequests.length}
                      </Badge>
                    </div>
                    
                    {/* Column menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button 
                          className="p-1 rounded hover:bg-muted/50 transition-colors"
                          style={{ color: 'var(--icon-muted)' }}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem disabled>Rename column</DropdownMenuItem>
                        <DropdownMenuItem disabled>Set WIP limit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => toggleColumnCollapse(column.id)}>
                          Collapse column
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Cards area - scrollable */}
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "flex-1 p-2 space-y-2 overflow-y-auto transition-colors",
                          snapshot.isDraggingOver && "bg-accent/10"
                        )}
                        style={{ minHeight: '200px' }}
                      >
                        {columnRequests.map((request, index) => (
                          <Draggable key={request.id} draggableId={request.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={cn(
                                  "rounded-lg p-3 cursor-pointer transition-all duration-200 group",
                                  snapshot.isDragging && "shadow-xl rotate-1"
                                )}
                                style={{
                                  ...provided.draggableProps.style,
                                  background: 'var(--card-bg, var(--background))',
                                  border: snapshot.isDragging 
                                    ? '1px solid var(--brand-primary)' 
                                    : '1px solid var(--divider)',
                                  boxShadow: snapshot.isDragging 
                                    ? '0 10px 25px -5px rgba(0,0,0,0.1)' 
                                    : undefined,
                                }}
                                onClick={() => onRequestSelect(request.id)}
                                onMouseEnter={(e) => {
                                  if (!snapshot.isDragging) {
                                    e.currentTarget.style.borderColor = 'var(--brand-primary)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px -2px rgba(0,0,0,0.08)';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!snapshot.isDragging) {
                                    e.currentTarget.style.borderColor = 'var(--divider)';
                                    e.currentTarget.style.boxShadow = 'none';
                                  }
                                }}
                              >
                                {/* Card header: ID + Quick actions */}
                                <div className="flex items-center justify-between mb-2">
                                  <span 
                                    className="text-xs font-mono font-semibold"
                                    style={{ color: 'var(--brand-primary)' }}
                                  >
                                    {formatRequestId(request.request_key)}
                                  </span>
                                  
                                  {/* Quick actions - show on hover */}
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button 
                                          className="p-1 rounded hover:bg-muted/50"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onRequestSelect(request.id);
                                          }}
                                        >
                                          <ExternalLink className="h-3.5 w-3.5" style={{ color: 'var(--icon-muted)' }} />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent>Open</TooltipContent>
                                    </Tooltip>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button 
                                          className="p-1 rounded hover:bg-muted/50"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <MoreHorizontal className="h-3.5 w-3.5" style={{ color: 'var(--icon-muted)' }} />
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-32">
                                        <DropdownMenuItem onClick={() => onRequestSelect(request.id)}>
                                          Open details
                                        </DropdownMenuItem>
                                        <DropdownMenuItem disabled>Copy link</DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>

                                {/* Title */}
                                <div 
                                  className="text-sm font-medium line-clamp-2 mb-3"
                                  style={{ color: 'var(--text-1)' }}
                                >
                                  {request.title}
                                </div>

                                {/* Metadata chips row */}
                                <div className="flex items-center gap-2 flex-wrap mb-3">
                                  {/* Department */}
                                  {request.department && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span 
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs max-w-[140px] truncate"
                                          style={{ 
                                            background: 'var(--surface-2)',
                                            color: 'var(--text-2)',
                                          }}
                                        >
                                          <Building2 className="h-3 w-3 flex-shrink-0" />
                                          <span className="truncate">{request.department}</span>
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>{request.department}</TooltipContent>
                                    </Tooltip>
                                  )}

                                  {/* Assignee */}
                                  {(request.requestor || request.business_owner) && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span 
                                          className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold"
                                          style={{ 
                                            background: 'var(--brand-primary)',
                                            color: 'white',
                                          }}
                                        >
                                          {getInitials(request.requestor || request.business_owner)}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {request.requestor || request.business_owner}
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>

                                {/* Footer row: Priority + Date + Rank */}
                                <div 
                                  className="flex items-center justify-between pt-2"
                                  style={{ borderTop: '1px solid var(--divider)' }}
                                >
                                  <div className="flex items-center gap-2">
                                    {getPriorityBadge(request.business_score, request.rank)}
                                    
                                    {request.end_date && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span 
                                            className="inline-flex items-center gap-1 text-xs"
                                            style={{ color: 'var(--text-3)' }}
                                          >
                                            <Calendar className="h-3 w-3" />
                                            {formatTargetDate(request.end_date)}
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent>Target: {request.end_date}</TooltipContent>
                                      </Tooltip>
                                    )}
                                  </div>

                                  {getRankBadge(request.rank)}
                                </div>

                                {/* Time in status indicator */}
                                {getTimeInStatus(request.updated_at) !== null && getTimeInStatus(request.updated_at)! > 7 && (
                                  <div 
                                    className="mt-2 flex items-center gap-1 text-xs"
                                    style={{ color: 'var(--text-3)' }}
                                  >
                                    <Clock className="h-3 w-3" />
                                    <span>{getTimeInStatus(request.updated_at)}d in status</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        
                        {/* Empty column state */}
                        {columnRequests.length === 0 && (
                          <div 
                            className="text-center py-8 rounded-lg"
                            style={{ 
                              background: 'var(--surface-2)',
                              border: '1px dashed var(--divider)',
                            }}
                          >
                            <p 
                              className="text-sm font-medium mb-1"
                              style={{ color: 'var(--text-3)' }}
                            >
                              No items
                            </p>
                            <p 
                              className="text-xs"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              Drag items here
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </TooltipProvider>
  );
}
