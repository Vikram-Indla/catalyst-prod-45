import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ManagerFollowUp {
  id: string;
  team_member_id: string;
  team_id: string | null;
  week_start: string;
  content: string;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FollowUpHistoryEntry {
  id: string;
  follow_up_id: string;
  action: string;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  actor_id: string | null;
  created_at: string;
}

// For demo/local use when not using real team_member_ids
export interface LocalFollowUp {
  id: string;
  userId: string; // Local user ID like 'u1'
  teamId: string | null;
  weekStart: string;
  content: string;
  isCompleted: boolean;
  completedAt: string | null;
  createdAt: string;
}

export function useManagerFollowUps(teamMemberId: string | null, weekStart: Date) {
  const [followUps, setFollowUps] = useState<ManagerFollowUp[]>([]);
  const [history, setHistory] = useState<FollowUpHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const weekStartStr = weekStart.toISOString().split('T')[0];

  // Fetch follow-ups for the team member and week
  const fetchFollowUps = useCallback(async () => {
    if (!teamMemberId) {
      setFollowUps([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('manager_follow_ups')
        .select('*')
        .eq('team_member_id', teamMemberId)
        .eq('week_start', weekStartStr)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setFollowUps((data as ManagerFollowUp[]) || []);
    } catch (err) {
      console.error('Error fetching follow-ups:', err);
      toast.error('Failed to load follow-up notes');
    } finally {
      setIsLoading(false);
    }
  }, [teamMemberId, weekStartStr]);

  // Fetch history for all follow-ups
  const fetchHistory = useCallback(async () => {
    if (followUps.length === 0) {
      setHistory([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('manager_follow_up_history')
        .select('*')
        .in('follow_up_id', followUps.map(f => f.id))
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory((data as FollowUpHistoryEntry[]) || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  }, [followUps]);

  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Add a new follow-up note
  const addFollowUp = async (content: string, teamId: string | null) => {
    if (!teamMemberId || !content.trim()) return null;

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('manager_follow_ups')
        .insert({
          team_member_id: teamMemberId,
          team_id: teamId,
          week_start: weekStartStr,
          content: content.trim(),
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Log to history
      await supabase.from('manager_follow_up_history').insert({
        follow_up_id: data.id,
        action: 'created',
        new_value: content.trim(),
        actor_id: user.id,
      });

      setFollowUps(prev => [...prev, data as ManagerFollowUp]);
      toast.success('Follow-up note saved');
      return data as ManagerFollowUp;
    } catch (err) {
      console.error('Error adding follow-up:', err);
      toast.error('Failed to save follow-up note');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle completion status
  const toggleComplete = async (followUpId: string) => {
    const followUp = followUps.find(f => f.id === followUpId);
    if (!followUp) return;

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const newCompleted = !followUp.is_completed;
      const { error } = await supabase
        .from('manager_follow_ups')
        .update({
          is_completed: newCompleted,
          completed_at: newCompleted ? new Date().toISOString() : null,
          completed_by: newCompleted ? user.id : null,
        })
        .eq('id', followUpId);

      if (error) throw error;

      // Log to history
      await supabase.from('manager_follow_up_history').insert({
        follow_up_id: followUpId,
        action: newCompleted ? 'completed' : 'reopened',
        field_changed: 'is_completed',
        old_value: String(!newCompleted),
        new_value: String(newCompleted),
        actor_id: user.id,
      });

      setFollowUps(prev => prev.map(f => 
        f.id === followUpId 
          ? { 
              ...f, 
              is_completed: newCompleted,
              completed_at: newCompleted ? new Date().toISOString() : null,
              completed_by: newCompleted ? user.id : null,
            }
          : f
      ));

      toast.success(newCompleted ? 'Marked as complete' : 'Reopened');
    } catch (err) {
      console.error('Error toggling completion:', err);
      toast.error('Failed to update status');
    } finally {
      setIsSaving(false);
    }
  };

  // Update follow-up content
  const updateFollowUp = async (followUpId: string, newContent: string) => {
    const followUp = followUps.find(f => f.id === followUpId);
    if (!followUp || !newContent.trim()) return;

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('manager_follow_ups')
        .update({ content: newContent.trim() })
        .eq('id', followUpId);

      if (error) throw error;

      // Log to history
      await supabase.from('manager_follow_up_history').insert({
        follow_up_id: followUpId,
        action: 'updated',
        field_changed: 'content',
        old_value: followUp.content,
        new_value: newContent.trim(),
        actor_id: user.id,
      });

      setFollowUps(prev => prev.map(f => 
        f.id === followUpId ? { ...f, content: newContent.trim() } : f
      ));

      toast.success('Follow-up note updated');
    } catch (err) {
      console.error('Error updating follow-up:', err);
      toast.error('Failed to update note');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete follow-up
  const deleteFollowUp = async (followUpId: string) => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Log deletion to history first
      await supabase.from('manager_follow_up_history').insert({
        follow_up_id: followUpId,
        action: 'deleted',
        actor_id: user?.id || null,
      });

      const { error } = await supabase
        .from('manager_follow_ups')
        .delete()
        .eq('id', followUpId);

      if (error) throw error;

      setFollowUps(prev => prev.filter(f => f.id !== followUpId));
      toast.success('Follow-up note deleted');
    } catch (err) {
      console.error('Error deleting follow-up:', err);
      toast.error('Failed to delete note');
    } finally {
      setIsSaving(false);
    }
  };

  return {
    followUps,
    history,
    isLoading,
    isSaving,
    addFollowUp,
    toggleComplete,
    updateFollowUp,
    deleteFollowUp,
    refetch: fetchFollowUps,
  };
}
