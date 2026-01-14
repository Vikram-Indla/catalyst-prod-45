// ============================================================
// QUICK ACTIONS BAR - POLISHED
// Move to workstream, Copy link, Star buttons with keyboard hints
// NO TOASTS - silent operations as per guardrail
// ============================================================

import { useState, useEffect } from 'react';
import { ArrowRight, Link2, Star, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface QuickActionsProps {
  taskId: string;
  taskKey: string;
  currentWorkstreamId?: string | null;
  isStarred?: boolean;
  onWorkstreamChange?: (workstreamId: string | null) => void;
  onStarredChange?: (isStarred: boolean) => void;
}

// GUARDRAIL: Aggressive caching to prevent flickering
function useWorkstreams() {
  return useQuery({
    queryKey: ['quick-actions-workstreams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planner_workstreams')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function QuickActions({ 
  taskId, 
  taskKey, 
  currentWorkstreamId,
  isStarred = false,
  onWorkstreamChange,
  onStarredChange,
}: QuickActionsProps) {
  const [moveOpen, setMoveOpen] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [isStarring, setIsStarring] = useState(false);
  const [starred, setStarred] = useState(isStarred);
  const queryClient = useQueryClient();
  
  const { data: workstreams = [], isLoading: workstreamsLoading } = useWorkstreams();

  // Sync starred state with prop
  useEffect(() => {
    setStarred(isStarred);
  }, [isStarred]);

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/planner/task/${taskKey}`);
    // No toast - silent operation
  };

  const handleMoveToWorkstream = async (workstreamId: string | null) => {
    if (isMoving) return;
    setIsMoving(true);
    
    try {
      const { error } = await supabase
        .from('planner_tasks')
        .update({ workstream_id: workstreamId })
        .eq('id', taskId);
      
      if (error) throw error;
      
      // Silently invalidate caches
      queryClient.invalidateQueries({ queryKey: ['task-detail', taskId] });
      queryClient.invalidateQueries({ queryKey: ['kanban-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
      
      onWorkstreamChange?.(workstreamId);
      setMoveOpen(false);
    } catch (error) {
      console.error('Failed to move task:', error);
    } finally {
      setIsMoving(false);
    }
  };

  const handleToggleStarred = async () => {
    if (isStarring) return;
    setIsStarring(true);
    
    const newStarred = !starred;
    
    // Optimistic update
    setStarred(newStarred);
    
    try {
      const { error } = await supabase
        .from('planner_tasks')
        .update({ is_starred: newStarred })
        .eq('id', taskId);
      
      if (error) throw error;
      
      // No toast - silent operation
      onStarredChange?.(newStarred);
    } catch (error) {
      console.error('Failed to toggle starred:', error);
      setStarred(!newStarred); // Revert optimistic update
    } finally {
      setIsStarring(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setMoveOpen(prev => !prev);
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        copyLink();
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        handleToggleStarred();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [starred]);

  return (
    <div className="flex items-center gap-1.5 px-6 py-2.5 bg-muted/50 border-b border-border">
      {/* Move to Workstream */}
      <Popover open={moveOpen} onOpenChange={setMoveOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs font-medium"
          >
            <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
            Move to
            <kbd className="ml-2 px-1.5 py-0.5 bg-muted rounded text-[10px] text-muted-foreground font-mono">M</kbd>
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-56 p-0 z-[500] bg-popover border-border shadow-lg" 
          align="start"
        >
          <div className="text-xs font-medium text-muted-foreground px-3 py-2 border-b border-border">
            Move to Workstream
          </div>
          
          {workstreamsLoading ? (
            <div className="flex items-center justify-center py-4 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Loading...
            </div>
          ) : (
            <ScrollArea className="max-h-64">
              <div className="p-1">
                {/* No Workstream option */}
                <button
                  onClick={() => handleMoveToWorkstream(null)}
                  disabled={isMoving}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors text-left",
                    "hover:bg-muted",
                    currentWorkstreamId === null && "bg-muted"
                  )}
                >
                  <Check className={cn(
                    "w-3.5 h-3.5 flex-shrink-0",
                    currentWorkstreamId === null ? "opacity-100" : "opacity-0"
                  )} />
                  <span className="text-muted-foreground italic">No Workstream</span>
                </button>
                
                {workstreams.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => handleMoveToWorkstream(ws.id)}
                    disabled={isMoving}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors text-left",
                      "hover:bg-muted",
                      currentWorkstreamId === ws.id && "bg-muted"
                    )}
                  >
                    <Check className={cn(
                      "w-3.5 h-3.5 flex-shrink-0",
                      currentWorkstreamId === ws.id ? "opacity-100" : "opacity-0"
                    )} />
                    <span className="truncate">{ws.name}</span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </PopoverContent>
      </Popover>
      
      {/* Copy Link */}
      <Button
        variant="outline"
        size="sm"
        onClick={copyLink}
        className="h-7 text-xs font-medium"
      >
        <Link2 className="w-3.5 h-3.5 mr-1.5" />
        Copy link
        <kbd className="ml-2 px-1.5 py-0.5 bg-muted rounded text-[10px] text-muted-foreground font-mono">C</kbd>
      </Button>
      
      <div className="w-px h-5 bg-border mx-1" />
      
      {/* Starred (renamed from Pin) */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleToggleStarred}
        disabled={isStarring}
        className={cn(
          "h-7 text-xs font-medium transition-colors",
          starred && "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
        )}
      >
        <Star className={cn(
          "w-3.5 h-3.5 mr-1.5 transition-colors",
          starred && "fill-amber-500 text-amber-500"
        )} />
        {starred ? 'Starred' : 'Star'}
        <kbd className="ml-2 px-1.5 py-0.5 bg-muted rounded text-[10px] text-muted-foreground font-mono">P</kbd>
      </Button>
    </div>
  );
}
