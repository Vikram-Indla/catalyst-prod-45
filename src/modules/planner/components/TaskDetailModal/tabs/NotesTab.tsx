/**
 * Notes Tab Component
 * Lead notes with RBAC permission banner
 */

import React, { useState } from 'react';
import { Lock, Send, FileText } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useLeadNotes, useAddLeadNote, useCanManageLeadNotes } from '../../../hooks/useLeadNotes';
import { useAuth } from '@/lib/auth';

interface NotesTabProps {
  taskId: string;
  workstreamId: string | null;
}

function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ['#8b5cf6', '#3b82f6', '#ec4899', '#14b8a6', '#f59e0b', '#dc2626'];
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

export function NotesTab({ taskId, workstreamId }: NotesTabProps) {
  const [newNote, setNewNote] = useState('');
  const { user } = useAuth();
  const { data: notes = [], isLoading } = useLeadNotes(taskId);
  const addNote = useAddLeadNote();
  const { canManage } = useCanManageLeadNotes(workstreamId);

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addNote.mutate({ taskId, content: newNote.trim() }, {
      onSuccess: () => setNewNote(''),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleAddNote();
    }
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
          <span 
            className="avatar-sm" 
            style={{ backgroundColor: user?.email ? stringToColor(user.email) : '#8b5cf6' }}
          >
            {user?.email ? getInitials(user.email.split('@')[0]) : 'U'}
          </span>
          <textarea
            placeholder="Add a note for the team..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!canManage}
          />
        </div>
        <div className="note-composer-footer">
          <button 
            className="btn-primary" 
            onClick={handleAddNote}
            disabled={!canManage || !newNote.trim() || addNote.isPending}
          >
            <Send size={16} />
            Add Note
          </button>
        </div>
      </div>

      {/* NOTES LIST OR EMPTY STATE */}
      {isLoading ? (
        <div className="empty-state">
          <div className="loading-spinner" style={{ width: 32, height: 32 }} />
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
                style={{ backgroundColor: stringToColor(note.author?.full_name || note.author?.email || '') }}
              >
                {getInitials(note.author?.full_name || note.author?.email || null)}
              </span>
              <div className="note-content">
                <div className="note-header">
                  <span className="note-author">{note.author?.full_name || 'Unknown'}</span>
                  <span className="note-time">{formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}</span>
                </div>
                <div className="note-body">{note.content}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
