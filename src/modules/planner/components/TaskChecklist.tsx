// ============================================================
// TASK CHECKLIST COMPONENT
// Displays and manages checklist items with AI generation
// REVISED: 5-8 high-level items, NO headers, flat list
// ============================================================

import { useState } from 'react';
import { Zap, CheckSquare, Square, Plus, Trash2, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import {
  usePlannerChecklist,
  usePlannerChecklistRealtime,
  useToggleChecklistItem,
  useAddChecklistItem,
  useDeleteChecklistItem,
  useBulkInsertChecklist,
  calculateChecklistProgress,
  type ChecklistItem,
} from '../hooks/usePlannerChecklist';

interface TaskChecklistProps {
  taskId: string;
  taskTitle: string;
  taskDescription?: string;
  onProgressChange?: (progress: number) => void;
}

// AI Analysis animation steps
const ANALYSIS_STEPS = [
  { text: 'Analyzing task scope...', delay: 0 },
  { text: 'Identifying key milestones...', delay: 500 },
  { text: 'Generating action items...', delay: 1000 },
];

export function TaskChecklist({ 
  taskId, 
  taskTitle, 
  taskDescription,
  onProgressChange 
}: TaskChecklistProps) {
  const [newItemText, setNewItemText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);

  // Queries and mutations
  const { data: items = [], isLoading } = usePlannerChecklist(taskId);
  usePlannerChecklistRealtime(taskId);
  
  const toggleItem = useToggleChecklistItem();
  const addItem = useAddChecklistItem();
  const deleteItem = useDeleteChecklistItem();
  const bulkInsert = useBulkInsertChecklist();

  // Calculate progress - count all items (no headers in new spec)
  const totalCount = items.length;
  const completedCount = items.filter(i => i.is_completed).length;
  const progress = calculateChecklistProgress(items);

  // Handle AI generation
  const handleAIGenerate = async () => {
    setIsGenerating(true);
    setAnalysisStep(0);

    // Animate through steps
    const stepInterval = setInterval(() => {
      setAnalysisStep(prev => Math.min(prev + 1, ANALYSIS_STEPS.length - 1));
    }, 500);

    try {
      const { data, error } = await supabase.functions.invoke('generate-checklist', {
        body: { 
          title: taskTitle, 
          description: taskDescription 
        },
      });

      clearInterval(stepInterval);

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.items || data.items.length === 0) {
        throw new Error('No checklist items generated');
      }

      // Insert generated items
      await bulkInsert.mutateAsync({ taskId, items: data.items });
      
      catalystToast.success('Checklist Generated', `Created ${data.items.length} items`);

    } catch (err) {
      console.error('AI generation error:', err);
      catalystToast.error(
        'Generation Failed', 
        err instanceof Error ? err.message : 'Could not generate checklist'
      );
    } finally {
      clearInterval(stepInterval);
      setIsGenerating(false);
      setAnalysisStep(0);
    }
  };

  // Handle adding manual item
  const handleAddItem = async () => {
    const text = newItemText.trim();
    if (!text) return;

    try {
      const maxOrder = items.length > 0 
        ? Math.max(...items.map(i => i.sort_order)) + 1 
        : 0;

      await addItem.mutateAsync({
        taskId,
        content: text,
        sortOrder: maxOrder,
      });

      setNewItemText('');
    } catch (err) {
      catalystToast.error('Failed to add item', 'Please try again');
    }
  };

  // Handle toggling item
  const handleToggle = async (item: ChecklistItem) => {
    try {
      await toggleItem.mutateAsync({
        itemId: item.id,
        isCompleted: !item.is_completed,
      });

      // Calculate new progress and notify parent
      const newItems = items.map(i => 
        i.id === item.id ? { ...i, is_completed: !item.is_completed } : i
      );
      const newProgress = calculateChecklistProgress(newItems);
      onProgressChange?.(newProgress);
    } catch (err) {
      catalystToast.error('Failed to update', 'Please try again');
    }
  };

  // Handle delete
  const handleDelete = async (itemId: string) => {
    try {
      await deleteItem.mutateAsync(itemId);
    } catch (err) {
      catalystToast.error('Failed to delete', 'Please try again');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with AI Generate button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Checklist</span>
          {totalCount > 0 && (
            <span className="text-xs text-muted-foreground">
              ({completedCount} of {totalCount})
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAIGenerate}
          disabled={isGenerating || (taskDescription || '').trim().split(/\s+/).filter(Boolean).length < 20}
          title={(taskDescription || '').trim().split(/\s+/).filter(Boolean).length < 20 ? 'Add at least 20 words to description to enable AI generation' : undefined}
          className="gap-2 text-primary border-primary/30 hover:bg-primary/5 disabled:opacity-50"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Zap className="w-4 h-4" />
          )}
          AI Generate
        </Button>
      </div>

      {/* AI Generation Animation */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-primary/5 border border-primary/20 rounded-lg p-4"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              </div>
              <span className="text-sm font-medium text-primary">
                Generating 5-8 key milestones...
              </span>
            </div>
            
            {/* Progress bar */}
            <div className="h-1.5 bg-primary/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${((analysisStep + 1) / ANALYSIS_STEPS.length) * 100}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checklist Items - Flat list, no headers */}
      {items.length > 0 ? (
        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.03 }}
                className="group flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors"
              >
                <button
                  onClick={() => handleToggle(item)}
                  className="mt-0.5 flex-shrink-0"
                >
                  {item.is_completed ? (
                    <CheckSquare className="w-4 h-4 text-primary" />
                  ) : (
                    <Square className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
                  )}
                </button>
                <span className={cn(
                  "flex-1 text-sm",
                  item.is_completed && "line-through text-muted-foreground"
                )}>
                  {item.content}
                </span>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-6 text-muted-foreground">
          <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No checklist items yet</p>
          <p className="text-xs mt-1">Click "AI Generate" or add items manually</p>
        </div>
      )}

      {/* Add item input */}
      <div className="flex items-center gap-2 pt-2">
        <Plus className="w-4 h-4 text-muted-foreground" />
        <Input
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
          placeholder="Add item..."
          className="flex-1 h-8 text-sm border-dashed"
        />
        {newItemText.trim() && (
          <Button size="sm" variant="ghost" onClick={handleAddItem}>
            Add
          </Button>
        )}
      </div>

      {/* Progress indicator (if items exist) */}
      {totalCount > 0 && (
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-muted-foreground">Progress</span>
            <span className="text-xs font-bold text-primary">{progress}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className={cn(
                "h-full rounded-full transition-colors",
                progress === 0 ? "bg-muted-foreground/30" :
                progress < 30 ? "bg-amber-500" :
                progress < 70 ? "bg-primary" :
                progress < 100 ? "bg-teal-500" : "bg-emerald-500"
              )}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
