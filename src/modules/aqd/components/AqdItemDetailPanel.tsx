/**
 * Task¹⁰ Item Detail Panel - Side panel for editing items
 */
import { useState, useEffect } from 'react';
import { X, Calendar, User, Tag, FileText, Clock, MessageSquare, Trash2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { AqdItemFull, AqdLabel, AqdItemStatus } from '../types/aqd.types';
import { AQD_STATUS_CONFIG, getStatusLabel } from '../types/aqd.types';
import { AqdLabelBadge } from './AqdLabelBadge';

interface AqdItemDetailPanelProps {
  item: AqdItemFull;
  listId: string;
  weekId: string;
  labels: AqdLabel[];
  onClose: () => void;
  onDelete?: (itemId: string) => void;
}

export function AqdItemDetailPanel({
  item,
  listId,
  weekId,
  labels,
  onClose,
  onDelete,
}: AqdItemDetailPanelProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description || '');
  const [dueDate, setDueDate] = useState<Date | undefined>(
    item.due_date ? new Date(item.due_date) : undefined
  );
  const [newNote, setNewNote] = useState('');

  // Sync local state when item changes
  useEffect(() => {
    setTitle(item.title);
    setDescription(item.description || '');
    setDueDate(item.due_date ? new Date(item.due_date) : undefined);
  }, [item]);

  // Fetch notes for this item
  const { data: notes = [] } = useQuery({
    queryKey: ['aqd-item-notes', item.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aqd_item_notes')
        .select(`
          id,
          content,
          created_at,
          created_by,
          profiles:created_by (full_name, avatar_url)
        `)
        .eq('item_id', item.id)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  // Update item mutation
  const updateItem = useMutation({
    mutationFn: async (updates: Partial<AqdItemFull>) => {
      const { error } = await supabase
        .from('aqd_items')
        .update(updates)
        .eq('id', item.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aqd-items', weekId] });
      toast.success('Item updated');
    },
    onError: (e) => toast.error(`Failed to update: ${e.message}`),
  });

  // Add note mutation
  const addNote = useMutation({
    mutationFn: async (content: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from('aqd_item_notes').insert({
        item_id: item.id,
        content,
        created_by: userData.user?.id,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aqd-item-notes', item.id] });
      setNewNote('');
      toast.success('Note added');
    },
    onError: (e) => toast.error(`Failed to add note: ${e.message}`),
  });

  // Update status mutation
  const updateStatus = useMutation({
    mutationFn: async (status: AqdItemStatus) => {
      const { error } = await supabase
        .from('aqd_items')
        .update({ status })
        .eq('id', item.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aqd-items', weekId] });
    },
  });

  // Toggle label mutation
  const toggleLabel = useMutation({
    mutationFn: async (labelId: string) => {
      const hasLabel = item.labels?.some(l => l.id === labelId);
      if (hasLabel) {
        const { error } = await supabase
          .from('aqd_item_labels')
          .delete()
          .eq('item_id', item.id)
          .eq('label_id', labelId);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from('aqd_item_labels')
          .insert({ item_id: item.id, label_id: labelId });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aqd-items', weekId] });
    },
  });

  const handleSaveTitle = () => {
    if (title.trim() && title !== item.title) {
      updateItem.mutate({ title: title.trim() });
    }
  };

  const handleSaveDescription = () => {
    if (description !== (item.description || '')) {
      updateItem.mutate({ description: description || null });
    }
  };

  const handleSaveDueDate = (date: Date | undefined) => {
    setDueDate(date);
    updateItem.mutate({ due_date: date ? date.toISOString().split('T')[0] : null });
  };

  const handleAddNote = () => {
    if (newNote.trim()) {
      addNote.mutate(newNote.trim());
    }
  };

  return (
    <div className="aqd-detail-panel">
      {/* Panel Header */}
      <div className="aqd-detail-header">
        <div className="aqd-detail-header-left">
          <span className="aqd-detail-rank">#{item.rank}</span>
          {item.taskhub_key && (
            <span className="aqd-detail-key">{item.taskhub_key}</span>
          )}
        </div>
        <button className="aqd-detail-close" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      {/* Panel Content */}
      <div className="aqd-detail-content">
        {/* Title */}
        <input
          type="text"
          className="aqd-detail-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleSaveTitle}
          onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
          placeholder="Item title..."
        />

        {/* Status Selector */}
        <div className="aqd-detail-field">
          <label className="aqd-detail-label">
            <Clock size={14} />
            Status
          </label>
          <div className="aqd-detail-status-options">
            {(['not_started', 'in_progress', 'completed'] as AqdItemStatus[]).map((status) => (
              <button
                key={status}
                className={cn(
                  'aqd-detail-status-btn',
                  item.status === status && 'aqd-detail-status-btn-active'
                )}
                style={{
                  '--status-color': AQD_STATUS_CONFIG[status].color,
                } as React.CSSProperties}
                onClick={() => updateStatus.mutate(status)}
              >
                <span 
                  className="aqd-detail-status-dot" 
                  style={{ background: AQD_STATUS_CONFIG[status].color }}
                />
                {getStatusLabel(status)}
              </button>
            ))}
          </div>
        </div>

        {/* Due Date */}
        <div className="aqd-detail-field">
          <label className="aqd-detail-label">
            <Calendar size={14} />
            Due Date
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <button className="aqd-detail-date-btn">
                {dueDate ? format(dueDate, 'MMM d, yyyy') : 'Set due date'}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarPicker
                mode="single"
                selected={dueDate}
                onSelect={handleSaveDueDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Labels */}
        <div className="aqd-detail-field">
          <label className="aqd-detail-label">
            <Tag size={14} />
            Labels
          </label>
          <div className="aqd-detail-labels">
            {labels.map((label) => {
              const isActive = item.labels?.some(l => l.id === label.id);
              return (
                <button
                  key={label.id}
                  className={cn('aqd-detail-label-btn', isActive && 'aqd-detail-label-btn-active')}
                  style={{ 
                    borderColor: label.color,
                    color: isActive ? 'white' : label.color,
                    background: isActive ? label.color : 'transparent',
                  }}
                  onClick={() => toggleLabel.mutate(label.id)}
                >
                  {label.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div className="aqd-detail-field">
          <label className="aqd-detail-label">
            <FileText size={14} />
            Description
          </label>
          <Textarea
            className="aqd-detail-textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleSaveDescription}
            placeholder="Add a description..."
            rows={4}
          />
        </div>

        {/* Notes Section */}
        <div className="aqd-detail-field">
          <label className="aqd-detail-label">
            <MessageSquare size={14} />
            Notes ({notes.length})
          </label>
          
          {/* Add Note Input */}
          <div className="aqd-detail-note-input">
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note..."
              rows={2}
            />
            <Button 
              size="sm" 
              onClick={handleAddNote}
              disabled={!newNote.trim() || addNote.isPending}
            >
              {addNote.isPending ? 'Adding...' : 'Add Note'}
            </Button>
          </div>

          {/* Notes List */}
          <div className="aqd-detail-notes-list">
            {notes.map((note: any) => (
              <div key={note.id} className="aqd-detail-note">
                <div className="aqd-detail-note-header">
                  <span className="aqd-detail-note-author">
                    {note.profiles?.full_name || 'Unknown'}
                  </span>
                  <span className="aqd-detail-note-date">
                    {format(new Date(note.created_at), 'MMM d, h:mm a')}
                  </span>
                </div>
                <p className="aqd-detail-note-content">{note.content}</p>
              </div>
            ))}
            {notes.length === 0 && (
              <p className="aqd-detail-notes-empty">No notes yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Panel Footer */}
      <div className="aqd-detail-footer">
        <span className="aqd-detail-timestamp">
          Created {format(new Date(item.created_at), 'MMM d, yyyy')}
        </span>
        {onDelete && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-destructive"
            onClick={() => onDelete(item.id)}
          >
            <Trash2 size={14} />
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}

export default AqdItemDetailPanel;
