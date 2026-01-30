// ============================================================
// NOTES TAB
// Permission banner + composer + notes list
// ============================================================

import React, { useState } from 'react';
import { Lock, Send, FileText } from 'lucide-react';
import type { TaskNote } from '../types';

interface NotesTabProps {
  notes: TaskNote[];
  onAddNote: (content: string) => void;
}

export const NotesTab: React.FC<NotesTabProps> = ({ notes, onAddNote }) => {
  const [newNote, setNewNote] = useState('');

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    onAddNote(newNote);
    setNewNote('');
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
          <span className="avatar-sm" style={{ backgroundColor: '#8b5cf6' }}>U</span>
          <textarea
            placeholder="Add a note for the team..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="note-composer-footer">
          <span className="keyboard-hint">Press ⌘+Enter to save</span>
          <button className="btn-primary" onClick={handleAddNote}>
            <Send size={16} />
            Add Note
          </button>
        </div>
      </div>

      {/* NOTES LIST OR EMPTY STATE */}
      {notes.length === 0 ? (
        <div className="empty-state">
          <FileText size={52} />
          <h3>No notes yet</h3>
          <p>Add the first note for your team</p>
        </div>
      ) : (
        <div className="notes-list">
          {notes.map((note) => (
            <div key={note.id} className="note-item">
              <span className="avatar-sm" style={{ backgroundColor: note.author_color }}>
                {note.author_initials}
              </span>
              <div className="note-content">
                <div className="note-header">
                  <span className="note-author">{note.author}</span>
                  <span className="note-time">{note.created_at}</span>
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
