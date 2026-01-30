// ============================================================================
// ORGANISM: NotesTab — Notes tab content
// ============================================================================

import React from 'react';
import { FileText } from 'lucide-react';
import { PermissionBanner, NoteComposer, EmptyState } from '../../molecules';

interface NotesTabProps {
  onAddNote: (content: string) => void;
}

export const NotesTab: React.FC<NotesTabProps> = ({ onAddNote }) => {
  return (
    <div>
      {/* PERMISSION BANNER */}
      <PermissionBanner />

      {/* NOTE COMPOSER */}
      <NoteComposer 
        onSubmit={onAddNote}
        userInitials="U"
      />

      {/* EMPTY STATE */}
      <EmptyState
        icon={<FileText size={52} />}
        title="No notes yet"
        description="Add the first note for your team"
      />
    </div>
  );
};

export default NotesTab;
