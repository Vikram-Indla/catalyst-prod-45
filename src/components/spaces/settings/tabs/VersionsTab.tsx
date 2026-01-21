// ════════════════════════════════════════════════════════════════════════════
// VERSIONS TAB - Manage space versions/releases
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Plus, Pencil, Trash2, Archive, Rocket, RotateCcw } from 'lucide-react';
import { 
  useSpaceVersions, 
  useCreateVersion, 
  useDeleteVersion,
  useReleaseVersion,
  useArchiveVersion,
  useUnarchiveVersion 
} from '@/hooks/spaces';
import { VersionStatusBadge } from '../../shared/VersionStatusBadge';
import { useSpaceStore } from '@/stores/spaceStore';
import type { VersionStatus } from '@/types/spaces';

interface VersionsTabProps {
  spaceId: string;
}

export function VersionsTab({ spaceId }: VersionsTabProps) {
  const [newName, setNewName] = useState('');
  const [statusFilter, setStatusFilter] = useState<VersionStatus | ''>('');
  
  const { data: versions = [], isLoading } = useSpaceVersions(spaceId, statusFilter || undefined);
  const createVersion = useCreateVersion();
  const deleteVersion = useDeleteVersion();
  const releaseVersion = useReleaseVersion();
  const archiveVersion = useArchiveVersion();
  const unarchiveVersion = useUnarchiveVersion();
  const { openEditVersionModal } = useSpaceStore();

  const handleCreate = () => {
    if (!newName.trim()) return;
    createVersion.mutate(
      { spaceId, input: { name: newName } },
      { onSuccess: () => setNewName('') }
    );
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this version?')) {
      deleteVersion.mutate({ id, spaceId });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-md animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-medium text-foreground">Versions</h3>
          <p className="text-sm text-muted-foreground">
            Track releases and milestones
          </p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as VersionStatus | '')}
          className="px-3 py-1.5 bg-background border border-border rounded-md text-sm cursor-pointer focus:border-primary focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="unreleased">Unreleased</option>
          <option value="released">Released</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Add New */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Version name (e.g., v1.0.0)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
        <button
          onClick={handleCreate}
          disabled={!newName.trim() || createVersion.isPending}
          className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      {/* Versions List */}
      <div className="space-y-2">
        {versions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No versions yet
          </div>
        ) : (
          versions.map((version) => (
            <div
              key={version.id}
              className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-foreground">
                    {version.name}
                  </span>
                  <VersionStatusBadge status={version.status} />
                </div>
                {version.description && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {version.description}
                  </div>
                )}
                {version.release_date && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Release: {new Date(version.release_date).toLocaleDateString()}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {version.status === 'unreleased' && (
                  <button
                    onClick={() => releaseVersion.mutate({ id: version.id, spaceId })}
                    className="p-1.5 text-muted-foreground hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                    title="Release"
                  >
                    <Rocket className="w-4 h-4" />
                  </button>
                )}
                {version.status !== 'archived' && (
                  <button
                    onClick={() => archiveVersion.mutate({ id: version.id, spaceId })}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                    title="Archive"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                )}
                {version.status === 'archived' && (
                  <button
                    onClick={() => unarchiveVersion.mutate({ id: version.id, spaceId })}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                    title="Unarchive"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => openEditVersionModal(version.id)}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(version.id)}
                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
