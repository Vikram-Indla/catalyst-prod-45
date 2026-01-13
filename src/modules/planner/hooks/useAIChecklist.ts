// ============================================================
// AI CHECKLIST HOOK
// Generates AI-powered checklist from task title using edge function
// ============================================================

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ChecklistItem {
  content: string;
  is_completed: boolean;
  sort_order: number;
}

export function useAIChecklist() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);

  const generateChecklist = async (title: string, description?: string) => {
    if (!title.trim()) {
      toast.error('Please enter a task title first');
      return [];
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-checklist', {
        body: { title, description },
      });

      if (error) {
        console.error('AI checklist error:', error);
        if (error.message?.includes('429')) {
          toast.error('Rate limit exceeded. Please try again in a moment.');
        } else if (error.message?.includes('402')) {
          toast.error('AI credits exhausted. Please add funds to continue.');
        } else {
          toast.error('Failed to generate checklist. Please try again.');
        }
        return [];
      }

      if (data?.items && Array.isArray(data.items)) {
        const items: ChecklistItem[] = data.items.map((item: any, index: number) => ({
          content: item.content || '',
          is_completed: false,
          sort_order: index,
        }));
        setChecklistItems(items);
        toast.success(`Generated ${items.length} checklist items`);
        return items;
      }

      return [];
    } catch (err) {
      console.error('AI checklist error:', err);
      toast.error('Failed to generate checklist');
      return [];
    } finally {
      setIsGenerating(false);
    }
  };

  const clearChecklist = () => {
    setChecklistItems([]);
  };

  const toggleItem = (index: number) => {
    setChecklistItems(prev => 
      prev.map((item, i) => 
        i === index ? { ...item, is_completed: !item.is_completed } : item
      )
    );
  };

  const removeItem = (index: number) => {
    setChecklistItems(prev => prev.filter((_, i) => i !== index));
  };

  return {
    isGenerating,
    checklistItems,
    generateChecklist,
    clearChecklist,
    toggleItem,
    removeItem,
    setChecklistItems,
  };
}
