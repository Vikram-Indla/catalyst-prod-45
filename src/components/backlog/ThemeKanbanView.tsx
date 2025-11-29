import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ThemeKanbanViewProps {
  portfolioId: string;
  piId?: string;
  onThemeClick: (theme: any) => void;
}

const STATES = [
  { key: 'proposed', label: 'Proposed', color: 'bg-muted' },
  { key: 'active', label: 'Active', color: 'bg-primary/5' },
  { key: 'done', label: 'Done', color: 'bg-success/10' },
];

export function ThemeKanbanView({ portfolioId, piId, onThemeClick }: ThemeKanbanViewProps) {
  const { data: themes, isLoading, refetch } = useQuery({
    queryKey: ['themes-kanban', portfolioId, piId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategic_themes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  const updateStateMutation = useMutation({
    mutationFn: async ({ themeId, newStatus }: { themeId: string; newStatus: 'proposed' | 'active' | 'done' | 'cancelled' }) => {
      const { error } = await supabase
        .from('strategic_themes')
        .update({ status: newStatus })
        .eq('id', themeId);
      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
      toast.success('Theme status updated');
    },
    onError: (error: any) => {
      toast.error('Failed to update theme status', {
        description: error.message,
      });
    },
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const themeId = result.draggableId;
    const newStatus = result.destination.droppableId as 'proposed' | 'active' | 'done' | 'cancelled';
    
    updateStateMutation.mutate({ themeId, newStatus });
  };

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading themes...</div>;
  }

  return (
    <div className="h-full overflow-auto p-6">
      <DragDropContext onDragEnd={handleDragEnd}>
        {/* Column Headers */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {STATES.map((state) => {
            const stateThemes = themes?.filter(t => 
              (t.status || 'proposed') === state.key
            ) || [];
            return (
              <div 
                key={state.key} 
                className="flex items-center justify-between px-4 py-2 bg-muted rounded-md"
              >
                <span className="font-semibold text-sm">{state.label}</span>
                <Badge variant="secondary">{stateThemes.length}</Badge>
              </div>
            );
          })}
        </div>

        {/* Kanban Columns */}
        <div className="grid grid-cols-3 gap-4">
          {STATES.map((state) => {
            const stateThemes = themes?.filter(t => 
              (t.status || 'proposed') === state.key
            ) || [];
            return (
              <Droppable key={state.key} droppableId={state.key}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      'min-h-[400px] rounded-md p-3 space-y-2',
                      state.color,
                      snapshot.isDraggingOver && 'ring-2 ring-primary'
                    )}
                  >
                    {stateThemes.map((theme, index) => (
                      <Draggable key={theme.id} draggableId={theme.id} index={index}>
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={cn(
                              'p-3 cursor-pointer hover:shadow-md transition-all',
                              snapshot.isDragging && 'shadow-xl rotate-2'
                            )}
                            onClick={() => onThemeClick(theme)}
                          >
                            <div className="flex items-start gap-2">
                              <div {...provided.dragHandleProps}>
                                <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium line-clamp-2">
                                  {theme.name}
                                </p>
                                {theme.description && (
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                    {theme.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {stateThemes.length === 0 && (
                      <div className="flex items-center justify-center h-32 border-2 border-dashed rounded-md">
                        <p className="text-xs text-muted-foreground">Drop themes here</p>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
