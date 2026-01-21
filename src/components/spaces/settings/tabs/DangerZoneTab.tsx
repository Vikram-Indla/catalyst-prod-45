// ════════════════════════════════════════════════════════════════════════════
// DANGER ZONE TAB - Archive, trash, delete space
// ════════════════════════════════════════════════════════════════════════════

import { useNavigate } from 'react-router-dom';
import { Archive, Trash2, AlertTriangle } from 'lucide-react';
import { useArchiveSpace, useMoveToTrash, useDeleteSpace } from '@/hooks/spaces';
import type { Space } from '@/types/spaces';

interface DangerZoneTabProps {
  space: Space;
}

export function DangerZoneTab({ space }: DangerZoneTabProps) {
  const navigate = useNavigate();
  const archiveSpace = useArchiveSpace();
  const moveToTrash = useMoveToTrash();
  const deleteSpace = useDeleteSpace();

  const handleArchive = () => {
    if (confirm(`Archive "${space.name}"? It can be restored later.`)) {
      archiveSpace.mutate(space.id, {
        onSuccess: () => navigate('/spaces'),
      });
    }
  };

  const handleMoveToTrash = () => {
    if (confirm(`Move "${space.name}" to trash? It can be restored within 30 days.`)) {
      moveToTrash.mutate(space.id, {
        onSuccess: () => navigate('/spaces'),
      });
    }
  };

  const handleDelete = () => {
    const confirmed = prompt(
      `This will PERMANENTLY delete "${space.name}" and all its data.\n\nType the space key "${space.key}" to confirm:`
    );
    if (confirmed === space.key) {
      deleteSpace.mutate(space.id, {
        onSuccess: () => navigate('/spaces'),
      });
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4 text-destructive">
        <AlertTriangle className="w-5 h-5" />
        <h3 className="font-medium">Danger Zone</h3>
      </div>

      <div className="space-y-4">
        {/* Archive */}
        <div className="flex items-center justify-between p-4 border border-border rounded-lg">
          <div>
            <div className="font-medium text-sm text-foreground">Archive this space</div>
            <div className="text-xs text-muted-foreground">
              Hide from directory. All data preserved.
            </div>
          </div>
          <button
            onClick={handleArchive}
            disabled={archiveSpace.isPending}
            className="flex items-center gap-2 px-3 py-2 border border-amber-500 text-amber-600 rounded-md text-sm font-medium hover:bg-amber-50 disabled:opacity-50 transition-colors"
          >
            <Archive className="w-4 h-4" />
            Archive
          </button>
        </div>

        {/* Move to Trash */}
        <div className="flex items-center justify-between p-4 border border-border rounded-lg">
          <div>
            <div className="font-medium text-sm text-foreground">Move to trash</div>
            <div className="text-xs text-muted-foreground">
              Soft delete. Can be restored within 30 days.
            </div>
          </div>
          <button
            onClick={handleMoveToTrash}
            disabled={moveToTrash.isPending}
            className="flex items-center gap-2 px-3 py-2 border border-orange-500 text-orange-600 rounded-md text-sm font-medium hover:bg-orange-50 disabled:opacity-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Move to Trash
          </button>
        </div>

        {/* Permanent Delete */}
        <div className="flex items-center justify-between p-4 border border-destructive rounded-lg bg-destructive/5">
          <div>
            <div className="font-medium text-sm text-foreground">Delete permanently</div>
            <div className="text-xs text-muted-foreground">
              Irreversible. All data will be lost forever.
            </div>
          </div>
          <button
            onClick={handleDelete}
            disabled={deleteSpace.isPending}
            className="flex items-center gap-2 px-3 py-2 bg-destructive text-destructive-foreground rounded-md text-sm font-medium hover:bg-destructive/90 disabled:opacity-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Forever
          </button>
        </div>
      </div>
    </div>
  );
}
