// ============================================================================
// HOOK: useAutoSave — Debounced auto-save to Supabase with real-time sync
// Properly maps Task modal types to database columns
// ============================================================================

import { useCallback, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Task, TaskStatus, TaskWorkstream } from '../types';
import { useToast } from '@/hooks/use-toast';

// Status name to database ID mapping (fetched once)
const STATUS_MAP: Record<TaskStatus, string> = {
  'Backlog': '6804dc2e-a32c-47c9-8a76-1690fa926370',
  'Planned': '5d732379-4702-49f5-bf3e-124eb0733f37',
  'In Progress': 'b350b0d3-6b35-4baf-80fb-e8688d10abea',
  'In Review': '86ec7466-5e46-417d-a3f5-c1681f25078f',
  'Done': 'f71c7171-abc7-40b8-8f05-d858ad589e17'
};

// Workstream name to database ID mapping
const WORKSTREAM_MAP: Record<TaskWorkstream, string> = {
  'Catalyst': '9ca91d55-a391-4d21-b248-35c79ae30d43',
  'Data & AI': 'a01e3530-93ca-41e6-9a2a-34cd9d2ea941',
  'Delivery': '9fa4f2fe-1acc-426b-aaec-30e02f4c1e37',
  'MIM': 'a5951f9d-2af2-46f3-b4d7-4328c6cbc701',
  'Senaei': '12598f42-8f77-4195-97d7-0976f1589b55'
};

interface UseAutoSaveOptions {
  debounceMs?: number;
  onSaveStart?: () => void;
  onSaveComplete?: () => void;
  onSaveError?: (error: Error) => void;
}

export const useAutoSave = (options: UseAutoSaveOptions = {}) => {
  const { 
    debounceMs = 800, 
    onSaveStart, 
    onSaveComplete, 
    onSaveError 
  } = options;
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingChangesRef = useRef<Partial<Task> | null>(null);
  const taskIdRef = useRef<string | null>(null);
  const isSavingRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Invalidate all dependent queries for real-time sync
  const invalidateQueries = useCallback(() => {
    // Core task lists
    queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['kanban-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['planner-task-list'] });
    
    // Dashboard and timeline
    queryClient.invalidateQueries({ queryKey: ['timeline-tasks-v2'] });
    queryClient.invalidateQueries({ queryKey: ['planner-dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
    
    // Calendar views
    queryClient.invalidateQueries({ queryKey: ['calendar-tasks'] });
    
    // Board-specific view
    queryClient.invalidateQueries({ queryKey: ['board-tasks'] });
    
    // Single task detail (if open elsewhere)
    if (taskIdRef.current) {
      queryClient.invalidateQueries({ queryKey: ['task-detail', taskIdRef.current] });
    }
  }, [queryClient]);

  // Perform the actual save
  const performSave = useCallback(async (taskId: string, changes: Partial<Task>) => {
    if (isSavingRef.current) return;
    
    isSavingRef.current = true;
    onSaveStart?.();

    try {
      // Map Task fields to database columns
      const dbUpdates: Record<string, unknown> = {
        updated_at: new Date().toISOString()
      };

      // Title
      if (changes.title !== undefined) {
        dbUpdates.title = changes.title;
      }

      // Description
      if (changes.description !== undefined) {
        dbUpdates.description = changes.description || null;
      }

      // Status -> status_id (lookup by name)
      if (changes.status !== undefined) {
        const statusId = STATUS_MAP[changes.status];
        if (statusId) {
          dbUpdates.status_id = statusId;
          
          // If status is "Done", set completed_at
          if (changes.status === 'Done') {
            dbUpdates.completed_at = new Date().toISOString();
          } else {
            dbUpdates.completed_at = null;
          }
        }
      }

      // Priority (lowercase in DB)
      if (changes.priority !== undefined) {
        dbUpdates.priority = changes.priority.toLowerCase();
      }

      // Workstream -> workstream_id (lookup by name)
      if (changes.workstream !== undefined) {
        const workstreamId = WORKSTREAM_MAP[changes.workstream];
        if (workstreamId) {
          dbUpdates.workstream_id = workstreamId;
        }
      }

      // Assignee -> assignee_id
      if (changes.assignee !== undefined) {
        dbUpdates.assignee_id = changes.assignee?.id || null;
      }

      // Due Date (format as date string for DB)
      if (changes.dueDate !== undefined) {
        if (changes.dueDate) {
          const date = new Date(changes.dueDate);
          dbUpdates.due_date = date.toISOString().split('T')[0]; // YYYY-MM-DD
        } else {
          dbUpdates.due_date = null;
        }
      }

      // Start Date (format as date string for DB)
      if (changes.startDate !== undefined) {
        if (changes.startDate) {
          const date = new Date(changes.startDate);
          dbUpdates.start_date = date.toISOString().split('T')[0]; // YYYY-MM-DD
        } else {
          dbUpdates.start_date = null;
        }
      }

      // Only update if we have meaningful changes
      if (Object.keys(dbUpdates).length <= 1) {
        // Only updated_at, skip
        isSavingRef.current = false;
        onSaveComplete?.();
        return;
      }

      console.log('[AutoSave] Saving changes:', { taskId, dbUpdates });

      const { error } = await supabase
        .from('planner_tasks')
        .update(dbUpdates)
        .eq('id', taskId);

      if (error) {
        console.error('[AutoSave] Supabase error:', error);
        throw new Error(error.message);
      }

      console.log('[AutoSave] Save successful');

      // Invalidate queries for real-time sync across all views
      invalidateQueries();

      onSaveComplete?.();
      
    } catch (error) {
      console.error('[AutoSave] Error:', error);
      onSaveError?.(error as Error);
      toast({ 
        title: 'Save failed', 
        description: 'Changes could not be saved. Please try again.',
        variant: 'destructive' 
      });
    } finally {
      isSavingRef.current = false;
      pendingChangesRef.current = null;
    }
  }, [onSaveStart, onSaveComplete, onSaveError, toast, invalidateQueries]);

  // Debounced save function
  const saveChanges = useCallback((taskId: string, changes: Partial<Task>) => {
    taskIdRef.current = taskId;
    
    // Merge with pending changes
    pendingChangesRef.current = {
      ...pendingChangesRef.current,
      ...changes
    };

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      if (pendingChangesRef.current && taskIdRef.current) {
        performSave(taskIdRef.current, pendingChangesRef.current);
      }
    }, debounceMs);
  }, [debounceMs, performSave]);

  // Immediate save (bypass debounce)
  const saveNow = useCallback(async (taskId: string, changes: Partial<Task>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    const allChanges = {
      ...pendingChangesRef.current,
      ...changes
    };
    
    await performSave(taskId, allChanges);
  }, [performSave]);

  // Flush any pending changes
  const flush = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (pendingChangesRef.current && taskIdRef.current) {
      await performSave(taskIdRef.current, pendingChangesRef.current);
    }
  }, [performSave]);

  return {
    saveChanges,
    saveNow,
    flush,
    isSaving: isSavingRef.current
  };
};

export default useAutoSave;
