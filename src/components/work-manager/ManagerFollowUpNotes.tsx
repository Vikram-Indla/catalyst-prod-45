import { useState, useCallback, useEffect } from 'react';
import { 
  Plus, 
  Check, 
  Circle, 
  Trash2, 
  History, 
  ChevronDown, 
  ChevronUp,
  Loader2,
  Edit2,
  X,
  Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';

interface ManagerFollowUp {
  id: string;
  user_id: string;
  team_id: string | null;
  week_start: string;
  content: string;
  is_completed: boolean;
  completed_at: string | null;
  created_by: string;
  created_at: string;
}

interface FollowUpHistoryEntry {
  id: string;
  follow_up_id: string;
  action: string;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

interface ManagerFollowUpNotesProps {
  userId: string; // Local user ID (e.g., 'u1')
  teamId: string | null;
  weekStart: Date;
  memberName?: string;
}

// Local storage key for follow-ups (demo mode without database team_members)
const STORAGE_KEY = 'manager_follow_ups';
const HISTORY_KEY = 'manager_follow_up_history';

function generateId() {
  return `fu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function ManagerFollowUpNotes({ 
  userId, 
  teamId, 
  weekStart,
  memberName 
}: ManagerFollowUpNotesProps) {
  const [followUps, setFollowUps] = useState<ManagerFollowUp[]>([]);
  const [history, setHistory] = useState<FollowUpHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const weekStartStr = weekStart.toISOString().split('T')[0];

  // Load follow-ups from localStorage
  useEffect(() => {
    setIsLoading(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const allFollowUps: ManagerFollowUp[] = stored ? JSON.parse(stored) : [];
      const filtered = allFollowUps.filter(
        f => f.user_id === userId && f.week_start === weekStartStr
      );
      setFollowUps(filtered);

      const storedHistory = localStorage.getItem(HISTORY_KEY);
      const allHistory: FollowUpHistoryEntry[] = storedHistory ? JSON.parse(storedHistory) : [];
      const filteredHistory = allHistory.filter(
        h => filtered.some(f => f.id === h.follow_up_id)
      );
      setHistory(filteredHistory);
    } catch (err) {
      console.error('Error loading follow-ups:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, weekStartStr]);

  // Save follow-ups to localStorage
  const saveFollowUps = useCallback((updatedFollowUps: ManagerFollowUp[]) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const allFollowUps: ManagerFollowUp[] = stored ? JSON.parse(stored) : [];
      
      // Remove old entries for this user/week
      const otherFollowUps = allFollowUps.filter(
        f => !(f.user_id === userId && f.week_start === weekStartStr)
      );
      
      // Add updated entries
      const newAll = [...otherFollowUps, ...updatedFollowUps];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newAll));
    } catch (err) {
      console.error('Error saving follow-ups:', err);
    }
  }, [userId, weekStartStr]);

  // Save history to localStorage
  const saveHistory = useCallback((updatedHistory: FollowUpHistoryEntry[]) => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      const allHistory: FollowUpHistoryEntry[] = stored ? JSON.parse(stored) : [];
      
      // Get all history not related to current follow-ups
      const currentIds = followUps.map(f => f.id);
      const otherHistory = allHistory.filter(h => !currentIds.includes(h.follow_up_id));
      
      const newAll = [...otherHistory, ...updatedHistory];
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newAll));
    } catch (err) {
      console.error('Error saving history:', err);
    }
  }, [followUps]);

  const addHistoryEntry = useCallback((
    followUpId: string,
    action: string,
    fieldChanged?: string,
    oldValue?: string,
    newValue?: string
  ) => {
    const entry: FollowUpHistoryEntry = {
      id: generateId(),
      follow_up_id: followUpId,
      action,
      field_changed: fieldChanged || null,
      old_value: oldValue || null,
      new_value: newValue || null,
      created_at: new Date().toISOString(),
    };
    const newHistory = [entry, ...history];
    setHistory(newHistory);
    saveHistory(newHistory);
  }, [history, saveHistory]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setIsSaving(true);
    try {
      const newFollowUp: ManagerFollowUp = {
        id: generateId(),
        user_id: userId,
        team_id: teamId,
        week_start: weekStartStr,
        content: newNote.trim(),
        is_completed: false,
        completed_at: null,
        created_by: 'current_user',
        created_at: new Date().toISOString(),
      };

      const updatedFollowUps = [...followUps, newFollowUp];
      setFollowUps(updatedFollowUps);
      saveFollowUps(updatedFollowUps);
      
      addHistoryEntry(newFollowUp.id, 'created', undefined, undefined, newNote.trim());
      
      setNewNote('');
      toast.success('Follow-up note saved');
    } catch (err) {
      console.error('Error adding follow-up:', err);
      toast.error('Failed to save follow-up note');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleComplete = async (followUpId: string) => {
    const followUp = followUps.find(f => f.id === followUpId);
    if (!followUp) return;

    setIsSaving(true);
    try {
      const newCompleted = !followUp.is_completed;
      const updatedFollowUps = followUps.map(f => 
        f.id === followUpId 
          ? { 
              ...f, 
              is_completed: newCompleted,
              completed_at: newCompleted ? new Date().toISOString() : null,
            }
          : f
      );
      
      setFollowUps(updatedFollowUps);
      saveFollowUps(updatedFollowUps);
      
      addHistoryEntry(
        followUpId, 
        newCompleted ? 'completed' : 'reopened',
        'is_completed',
        String(!newCompleted),
        String(newCompleted)
      );

      toast.success(newCompleted ? 'Marked as complete' : 'Reopened');
    } catch (err) {
      console.error('Error toggling completion:', err);
      toast.error('Failed to update status');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEdit = (followUp: ManagerFollowUp) => {
    setEditingId(followUp.id);
    setEditContent(followUp.content);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editContent.trim()) return;

    const followUp = followUps.find(f => f.id === editingId);
    if (!followUp) return;

    setIsSaving(true);
    try {
      const updatedFollowUps = followUps.map(f => 
        f.id === editingId ? { ...f, content: editContent.trim() } : f
      );
      
      setFollowUps(updatedFollowUps);
      saveFollowUps(updatedFollowUps);
      
      addHistoryEntry(editingId, 'updated', 'content', followUp.content, editContent.trim());
      
      setEditingId(null);
      setEditContent('');
      toast.success('Follow-up note updated');
    } catch (err) {
      console.error('Error updating follow-up:', err);
      toast.error('Failed to update note');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleDelete = async (followUpId: string) => {
    setIsSaving(true);
    try {
      addHistoryEntry(followUpId, 'deleted');
      
      const updatedFollowUps = followUps.filter(f => f.id !== followUpId);
      setFollowUps(updatedFollowUps);
      saveFollowUps(updatedFollowUps);
      
      toast.success('Follow-up note deleted');
    } catch (err) {
      console.error('Error deleting follow-up:', err);
      toast.error('Failed to delete note');
    } finally {
      setIsSaving(false);
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'created': return 'Created';
      case 'updated': return 'Updated';
      case 'completed': return 'Marked complete';
      case 'reopened': return 'Reopened';
      case 'deleted': return 'Deleted';
      default: return action;
    }
  };

  const pendingCount = followUps.filter(f => !f.is_completed).length;
  const completedCount = followUps.filter(f => f.is_completed).length;

  return (
    <div className="bg-surface-card border border-border-default rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-[12px] font-semibold text-text-primary uppercase tracking-wide">
            Manager Follow-up Notes
          </h3>
          {followUps.length > 0 && (
            <div className="flex items-center gap-2 text-[11px]">
              {pendingCount > 0 && (
                <span className="text-amber-700 dark:text-amber-500 flex items-center gap-1 font-medium">
                  <Circle className="w-3 h-3" />
                  {pendingCount} pending
                </span>
              )}
              {completedCount > 0 && (
                <span className="text-green-700 dark:text-green-500 flex items-center gap-1 font-medium">
                  <Check className="w-3 h-3" />
                  {completedCount} done
                </span>
              )}
            </div>
          )}
        </div>
        {history.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-[11px] gap-1.5 h-7"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History className="w-3.5 h-3.5" />
            History
            {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
        )}
      </div>

      {/* Existing Notes */}
      {isLoading ? (
        <div className="flex items-center justify-center py-6 text-text-muted">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Loading...
        </div>
      ) : followUps.length > 0 ? (
        <div className="space-y-2 mb-4">
          {followUps.map((followUp) => (
            <div
              key={followUp.id}
              className={cn(
                'flex items-start gap-3 p-3 rounded-md border transition-colors',
                followUp.is_completed
                  ? 'bg-green-500/5 border-green-500/20'
                  : 'bg-surface-muted border-border-subtle'
              )}
            >
              <Checkbox
                checked={followUp.is_completed}
                onCheckedChange={() => toggleComplete(followUp.id)}
                disabled={isSaving}
                className="mt-0.5 border-gray-400 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
              />
              
              <div className="flex-1 min-w-0">
                {editingId === followUp.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="text-[13px] min-h-[60px]"
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="h-7 text-[11px] gap-1"
                        onClick={handleSaveEdit}
                        disabled={isSaving}
                      >
                        <Save className="w-3 h-3" />
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[11px] gap-1"
                        onClick={handleCancelEdit}
                      >
                        <X className="w-3 h-3" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className={cn(
                      'text-[13px]',
                      followUp.is_completed ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-text-primary'
                    )}>
                      {followUp.content}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                      Added {formatDistanceToNow(new Date(followUp.created_at), { addSuffix: true })}
                      {followUp.is_completed && followUp.completed_at && (
                        <> · Completed {formatDistanceToNow(new Date(followUp.completed_at), { addSuffix: true })}</>
                      )}
                    </p>
                  </>
                )}
              </div>

              {editingId !== followUp.id && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                    onClick={() => handleStartEdit(followUp)}
                    disabled={isSaving}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400"
                    onClick={() => handleDelete(followUp.id)}
                    disabled={isSaving}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {/* Add New Note */}
      <div className="space-y-2">
        <Textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a follow-up action item..."
          className="text-[13px] min-h-[80px] bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 placeholder:text-gray-500"
        />
        <Button
          size="sm"
          onClick={handleAddNote}
          disabled={!newNote.trim() || isSaving}
          className="gap-1.5"
        >
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
          Add Follow-up
        </Button>
      </div>

      {/* History Panel */}
      {showHistory && history.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border-default">
          <h4 className="text-[11px] font-semibold text-text-muted uppercase tracking-wide mb-3">
            Audit Trail
          </h4>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {history.map((entry) => (
              <div 
                key={entry.id} 
                className="text-[11px] text-text-muted py-1.5 border-b border-border-subtle last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'font-medium',
                    entry.action === 'completed' && 'text-green-500',
                    entry.action === 'deleted' && 'text-red-400',
                    entry.action === 'created' && 'text-blue-400'
                  )}>
                    {getActionLabel(entry.action)}
                  </span>
                  <span className="text-text-muted/60">
                    {format(new Date(entry.created_at), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
                {entry.action === 'updated' && entry.field_changed === 'content' && (
                  <div className="mt-1 pl-2 border-l-2 border-border-default">
                    <p className="line-through text-text-muted/50">{entry.old_value}</p>
                    <p className="text-text-secondary">{entry.new_value}</p>
                  </div>
                )}
                {entry.action === 'created' && entry.new_value && (
                  <p className="mt-1 text-text-secondary truncate">{entry.new_value}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
