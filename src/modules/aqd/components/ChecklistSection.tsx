/**
 * Task¹⁰ Checklist Section - AI-powered checklist with CRUD
 */
import { useState } from 'react';
import { CheckSquare, Square, Plus, Trash2, Loader2, Zap, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  useAqdChecklist, 
  useAqdChecklistRealtime,
  calculateChecklistProgress,
  type AqdChecklistItem 
} from '../hooks/useAqdChecklist';

interface ChecklistSectionProps {
  itemId: string;
  itemTitle: string;
  itemDescription?: string;
}

export function ChecklistSection({ itemId, itemTitle, itemDescription }: ChecklistSectionProps) {
  const [newItemText, setNewItemText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const { 
    items, 
    isLoading, 
    toggleItem, 
    addItem, 
    deleteItem,
    bulkInsert,
    clearAll,
    isBulkInserting,
  } = useAqdChecklist(itemId);
  
  useAqdChecklistRealtime(itemId);

  const totalCount = items.length;
  const completedCount = items.filter(i => i.is_completed).length;
  const progress = calculateChecklistProgress(items);

  // Handle AI generation
  const handleAIGenerate = async () => {
    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-checklist', {
        body: { 
          title: itemTitle, 
          description: itemDescription 
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      if (!data.items || data.items.length === 0) throw new Error('No checklist items generated');

      // Clear existing and insert new
      await clearAll();
      await bulkInsert(data.items);
      
      toast.success(`Generated ${data.items.length} checklist items`);

    } catch (err) {
      console.error('AI generation error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to generate checklist');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle manual add
  const handleAddItem = () => {
    const text = newItemText.trim();
    if (!text) return;

    const maxOrder = items.length > 0 
      ? Math.max(...items.map(i => i.sort_order)) + 1 
      : 0;

    addItem({ content: text, sortOrder: maxOrder });
    setNewItemText('');
  };

  // Handle toggle
  const handleToggle = (item: AqdChecklistItem) => {
    toggleItem({ checklistId: item.id, isCompleted: !item.is_completed });
  };

  // Handle delete
  const handleDelete = (checklistId: string) => {
    deleteItem(checklistId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="mb-4">
      {/* Header with AI button */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-slate-700">Checklist</span>
          {totalCount > 0 && (
            <span className="text-xs text-slate-400">
              ({completedCount}/{totalCount})
            </span>
          )}
        </div>
        <button
          onClick={handleAIGenerate}
          disabled={isGenerating || isBulkInserting}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
            isGenerating || isBulkInserting
              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
              : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
          )}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5" />
              AI Generate
            </>
          )}
        </button>
      </div>

      {/* AI Generation Animation */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 animate-pulse" />
              <span className="text-sm text-amber-700">Generating 5-8 key milestones...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checklist Items */}
      {items.length > 0 ? (
        <div className="space-y-1 mb-3">
          <AnimatePresence mode="popLayout">
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ delay: index * 0.02 }}
                className="group flex items-start gap-2 px-2 py-1.5 rounded hover:bg-slate-50 transition-colors"
              >
                <button
                  onClick={() => handleToggle(item)}
                  className="mt-0.5 flex-shrink-0"
                >
                  {item.is_completed ? (
                    <CheckSquare className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400 hover:text-blue-500 transition-colors" />
                  )}
                </button>
                <span className={cn(
                  "flex-1 text-sm text-slate-700",
                  item.is_completed && "line-through text-slate-400"
                )}>
                  {item.content}
                </span>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-4 text-slate-400 bg-slate-50 rounded-lg mb-3">
          <CheckSquare className="w-6 h-6 mx-auto mb-1 opacity-40" />
          <p className="text-xs">No checklist items</p>
          <p className="text-[10px] mt-0.5">Click AI Generate or add manually</p>
        </div>
      )}

      {/* Add item input */}
      <div className="flex items-center gap-2">
        <Plus className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
          placeholder="Add item..."
          className="flex-1 px-2 py-1.5 text-sm text-slate-700 placeholder:text-slate-400 border border-dashed border-slate-200 rounded focus:border-blue-400 focus:outline-none transition-colors"
        />
        {newItemText.trim() && (
          <button 
            onClick={handleAddItem}
            className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
          >
            Add
          </button>
        )}
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-slate-400 uppercase">Progress</span>
            <span className="text-xs font-bold text-blue-600">{progress}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className={cn(
                "h-full rounded-full",
                progress === 0 ? "bg-slate-300" :
                progress < 30 ? "bg-amber-500" :
                progress < 70 ? "bg-blue-500" :
                progress < 100 ? "bg-teal-500" : "bg-emerald-500"
              )}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
