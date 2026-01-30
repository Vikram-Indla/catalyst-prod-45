/**
 * NOTES TAB
 * Lead/Manager notes with permission banner
 */

import React, { useState } from 'react';
import { Lock, Send, FileText } from 'lucide-react';
import { useLeadNotes, useAddLeadNote, useCanManageLeadNotes } from '../../../hooks/useLeadNotes';
import { formatDistanceToNow } from 'date-fns';

interface NotesTabProps {
  taskId: string;
  workstreamId: string | null;
  currentUserInitials: string;
  currentUserColor: string;
}

export const NotesTab: React.FC<NotesTabProps> = ({
  taskId,
  workstreamId,
  currentUserInitials,
  currentUserColor,
}) => {
  const [newNote, setNewNote] = useState('');
  const { data: notes = [], isLoading } = useLeadNotes(taskId);
  const { canManage } = useCanManageLeadNotes(workstreamId);
  const addNoteMutation = useAddLeadNote();

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addNoteMutation.mutate(
      { taskId, content: newNote },
      {
        onSuccess: () => setNewNote(''),
      }
    );
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string | null) => {
    if (!name) return '#94a3b8';
    const colors = ['#8b5cf6', '#3b82f6', '#ec4899', '#14b8a6', '#f59e0b'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="notes-tab">
      {/* PERMISSION BANNER */}
      <div className="permission-banner">
        <Lock size={20} />
        <span>Visible to all · Editable by leads and management</span>
      </div>

      {/* NOTE COMPOSER */}
      <div className="note-composer">
        <div className="note-composer-body">
          <span className="avatar-sm" style={{ backgroundColor: currentUserColor }}>
            {currentUserInitials}
          </span>
          <textarea
            placeholder="Add a note for the team..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            disabled={!canManage}
          />
        </div>
        <div className="note-composer-footer">
          <button
            className="btn-primary"
            onClick={handleAddNote}
            disabled={!canManage || !newNote.trim() || addNoteMutation.isPending}
          >
            <Send size={16} />
            Add Note
          </button>
        </div>
      </div>

      {/* NOTES LIST OR EMPTY STATE */}
      {isLoading ? (
        <div className="empty-state">
          <p>Loading notes...</p>
        </div>
      ) : notes.length === 0 ? (
        <div className="empty-state">
          <FileText size={52} />
          <h3>No notes yet</h3>
          <p>Add the first note for your team</p>
        </div>
      ) : (
        <div className="notes-list">
          {notes.map((note) => (
            <div key={note.id} className="note-item">
              <span
                className="avatar-sm"
                style={{ backgroundColor: getAvatarColor(note.author?.full_name) }}
              >
                {getInitials(note.author?.full_name)}
              </span>
              <div className="note-content">
                <div className="note-header">
                  <span className="note-author">{note.author?.full_name || 'Unknown'}</span>
                  <span className="note-time">
                    {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                  </span>
                </div>
                <div className="note-body">{note.content}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
