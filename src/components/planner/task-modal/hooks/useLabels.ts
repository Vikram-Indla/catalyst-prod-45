// ============================================================================
// HOOK: useLabels — Complete labels management
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '../types/labels';
import { useToast } from '@/hooks/use-toast';

export const useLabels = () => {
  const [labels, setLabels] = useState<Label[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch all available labels
  const fetchLabels = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('planner_labels')
        .select('*')
        .order('name');

      if (error) throw error;
      setLabels(data || []);
    } catch (error) {
      console.error('Error fetching labels:', error);
      toast({ title: 'Error', description: 'Failed to load labels', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Create a new label
  const createLabel = async (name: string, color: string, description?: string): Promise<Label | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('planner_labels')
        .insert({
          name: name.trim(),
          color,
          description,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast({ title: 'Label exists', description: 'A label with this name already exists', variant: 'destructive' });
          return null;
        }
        throw error;
      }

      setLabels(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      toast({ title: 'Label created', description: `"${name}" label created` });
      return data;
    } catch (error) {
      console.error('Error creating label:', error);
      toast({ title: 'Error', description: 'Failed to create label', variant: 'destructive' });
      return null;
    }
  };

  // Delete a label
  const deleteLabel = async (labelId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('planner_labels')
        .delete()
        .eq('id', labelId);

      if (error) throw error;

      setLabels(prev => prev.filter(l => l.id !== labelId));
      toast({ title: 'Label deleted' });
      return true;
    } catch (error) {
      console.error('Error deleting label:', error);
      toast({ title: 'Error', description: 'Failed to delete label', variant: 'destructive' });
      return false;
    }
  };

  useEffect(() => {
    fetchLabels();
  }, [fetchLabels]);

  return {
    labels,
    isLoading,
    createLabel,
    deleteLabel,
    refetch: fetchLabels
  };
};

export default useLabels;
