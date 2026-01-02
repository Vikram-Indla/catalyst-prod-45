/**
 * Releases Page
 * Version management with progress bars and create/edit version
 */

import React, { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Search, 
  Plus, 
  Package,
  Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useVersions, VersionWithProgress } from '../hooks/useVersions';
import { VersionCard, VersionDialog } from '../components/releases';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Filter options
type FilterType = 'all' | 'unreleased' | 'released' | 'archived';

export function ReleasesPage() {
  const { projectKey } = useParams<{ projectKey: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingVersion, setEditingVersion] = useState<VersionWithProgress | null>(null);
  const [deletingVersionId, setDeletingVersionId] = useState<string | null>(null);

  // TODO: Get project ID from projectKey - for now we'll use a placeholder
  // In a real implementation, you'd fetch the project by key first
  const projectId = projectKey || null;

  const {
    versions,
    isLoading,
    createVersion,
    updateVersion,
    releaseVersion,
    unreleaseVersion,
    archiveVersion,
    unarchiveVersion,
    deleteVersion,
    isCreating,
    isUpdating,
    isDeleting,
  } = useVersions(projectId);

  // Filter versions
  const filteredVersions = versions.filter(v => {
    // Apply text search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!v.name.toLowerCase().includes(query) && 
          !v.description?.toLowerCase().includes(query)) {
        return false;
      }
    }

    // Apply filter
    switch (filter) {
      case 'unreleased':
        return !v.released && !v.archived;
      case 'released':
        return v.released && !v.archived;
      case 'archived':
        return v.archived;
      default:
        return true;
    }
  });

  // Handlers
  const handleCreateVersion = useCallback(async (data: {
    name: string;
    description?: string;
    startDate?: string;
    releaseDate?: string;
  }) => {
    if (!projectId) {
      toast.error('No project selected');
      return;
    }
    await createVersion({
      ...data,
      projectId,
    });
  }, [createVersion, projectId]);

  const handleUpdateVersion = useCallback(async (data: {
    name: string;
    description?: string;
    startDate?: string;
    releaseDate?: string;
  }) => {
    if (!editingVersion) return;
    await updateVersion({
      id: editingVersion.id,
      data,
    });
    setEditingVersion(null);
  }, [updateVersion, editingVersion]);

  const handleDeleteVersion = useCallback(async () => {
    if (!deletingVersionId) return;
    await deleteVersion(deletingVersionId);
    setDeletingVersionId(null);
  }, [deleteVersion, deletingVersionId]);

  const handleViewDetails = useCallback((versionId: string) => {
    // TODO: Navigate to version detail page or open modal
    toast.info('Version details coming soon');
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search versions"
              className="pl-8 w-64 h-8"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex items-center border border-border rounded-md">
            {(['all', 'unreleased', 'released', 'archived'] as FilterType[]).map((f) => (
              <Button
                key={f}
                variant={filter === f ? 'secondary' : 'ghost'}
                size="sm"
                className={cn(
                  "h-8 rounded-none capitalize",
                  f === 'all' && "rounded-l-md",
                  f === 'archived' && "rounded-r-md"
                )}
                onClick={() => setFilter(f)}
              >
                {f}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => setShowCreateDialog(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Create version
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredVersions.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No versions found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery ? 'Try adjusting your search query' : 'Create your first version to get started'}
              </p>
              <Button onClick={() => setShowCreateDialog(true)} className="gap-1.5">
                <Plus className="h-4 w-4" />
                Create version
              </Button>
            </div>
          ) : (
            filteredVersions.map((version) => (
              <VersionCard
                key={version.id}
                version={version}
                onEdit={setEditingVersion}
                onRelease={releaseVersion}
                onUnrelease={unreleaseVersion}
                onArchive={archiveVersion}
                onUnarchive={unarchiveVersion}
                onDelete={setDeletingVersionId}
                onViewDetails={handleViewDetails}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Create/Edit Dialog */}
      <VersionDialog
        open={showCreateDialog || !!editingVersion}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setEditingVersion(null);
          }
        }}
        version={editingVersion}
        onSave={editingVersion ? handleUpdateVersion : handleCreateVersion}
        isLoading={isCreating || isUpdating}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingVersionId} onOpenChange={(open) => !open && setDeletingVersionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Version</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this version? This action cannot be undone.
              Issues linked to this version will be unlinked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVersion}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ReleasesPage;
