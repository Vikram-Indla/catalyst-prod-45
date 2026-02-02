/**
 * Task¹⁰ Notes Section - Full CRUD for item notes
 */
import { useState } from 'react';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import { useAqdNotes } from '../hooks/useAqdNotes';
import { formatDistanceToNow } from 'date-fns';

interface NotesSectionProps {
  itemId: string;
}

export function NotesSection({ itemId }: NotesSectionProps) {
  const [newNote, setNewNote] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const { notes, isLoading, createNote, updateNote, deleteNote, isCreating } = useAqdNotes(itemId);

  const handleCreate = () => {
    if (!newNote.trim()) return;
    createNote(newNote.trim());
    setNewNote('');
  };

  const handleUpdate = (noteId: string) => {
    if (!editContent.trim()) return;
    updateNote({ noteId, content: editContent.trim() });
    setEditingNoteId(null);
    setEditContent('');
  };

  const handleDelete = (noteId: string) => {
    if (confirm('Delete this note?')) {
      deleteNote(noteId);
    }
  };

  return (
    <div className="mb-4">
      {/* New Note Input */}
      <div className="mb-3">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note..."
          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 resize-none min-h-[60px] focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
        />
        <button
          onClick={handleCreate}
          disabled={!newNote.trim() || isCreating}
          className="mt-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-300 text-slate-700 text-sm font-medium rounded-lg transition-colors"
        >
          {isCreating ? 'Adding...' : 'Add Note'}
        </button>
      </div>

      {/* Notes List */}
      {isLoading ? (
        <div className="text-center py-4">
          <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin mx-auto" />
        </div>
      ) : notes.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">
          No notes yet
        </p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div 
              key={note.id} 
              className="p-3 bg-slate-50 rounded-lg border border-slate-100 group"
            >
              {editingNoteId === note.id ? (
                /* Edit Mode */
                <div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm resize-none min-h-[60px] focus:border-blue-500 focus:outline-none"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleUpdate(note.id)}
                      className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingNoteId(null);
                        setEditContent('');
                      }}
                      className="px-3 py-1.5 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-200 flex items-center gap-1"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">
                    {note.content}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-slate-400">
                      {note.creatorName} · {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                      {note.isEdited && ' (edited)'}
                    </p>
                    
                    {/* Actions */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingNoteId(note.id);
                          setEditContent(note.content);
                        }}
                        className="p-1.5 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="p-1.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
