// ============================================================================
// HOOK: useAutoSave — Debounced auto-save to Supabase
// ============================================================================

import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '../types';
import { useToast } from '@/hooks/use-toast';

interface UseAutoSaveOptions {
  debounceMs?: number;
  onSaveStart?: () => void;
  onSaveComplete?: () => void;
  onSaveError?: (error: Error) => void;
}

export const useAutoSave = (options: UseAutoSaveOptions = {}) => {
  const { 
    debounceMs = 1000, 
    onSaveStart, 
    onSaveComplete, 
    onSaveError 
  } = options;
  
  const { toast } = useToast();
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

      if (changes.title !== undefined) dbUpdates.title = changes.title;
      if (changes.description !== undefined) dbUpdates.description = changes.description;
      if (changes.priority !== undefined) dbUpdates.priority = changes.priority?.toLowerCase();
      if (changes.assignee !== undefined) dbUpdates.assignee_id = changes.assignee?.id || null;
      if (changes.dueDate !== undefined) dbUpdates.due_date = changes.dueDate || null;
      if (changes.startDate !== undefined) dbUpdates.start_date = changes.startDate || null;

      const { error } = await supabase
        .from('planner_tasks')
        .update(dbUpdates)
        .eq('id', taskId);

      if (error) throw error;

      onSaveComplete?.();
      
    } catch (error) {
      console.error('Auto-save error:', error);
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
  }, [onSaveStart, onSaveComplete, onSaveError, toast]);

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
