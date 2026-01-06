/**
 * Danger Zone Section
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Archive, Trash2, ArrowRightLeft, AlertTriangle } from 'lucide-react';

interface DangerZoneProps {
  projectName: string;
  isArchived: boolean;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
  onTransfer: () => void;
  isLoading?: boolean;
}

export function DangerZone({
  projectName,
  isArchived,
  onArchive,
  onRestore,
  onDelete,
  onTransfer,
  isLoading,
}: DangerZoneProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const canDelete = confirmText === projectName;

  const handleDelete = () => {
    if (canDelete) {
      onDelete();
      setDeleteDialogOpen(false);
      setConfirmText('');
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-gradient-to-b from-destructive/5 to-background border border-destructive/20 rounded-xl">
        <div className="px-6 py-5 border-b border-destructive/10">
          <h2 className="text-base font-semibold text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </h2>
          <p className="text-sm text-muted-foreground">
            Irreversible and destructive actions
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* Archive/Restore */}
          <div className="flex items-center justify-between p-4 bg-background border border-destructive/20 rounded-lg">
            <div className="flex-1">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Archive className="h-4 w-4" />
                {isArchived ? 'Restore Project' : 'Archive Project'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                {isArchived
                  ? 'Restore this project to make it active again. All data will be accessible.'
                  : 'Archive this project to hide it from the main view. Data will be preserved but read-only.'}
              </p>
            </div>
            <Button
              variant={isArchived ? 'default' : 'outline'}
              onClick={isArchived ? onRestore : onArchive}
              disabled={isLoading}
            >
              {isArchived ? 'Restore Project' : 'Archive Project'}
            </Button>
          </div>

          {/* Transfer Ownership */}
          <div className="flex items-center justify-between p-4 bg-background border border-destructive/20 rounded-lg">
            <div className="flex-1">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4" />
                Transfer Ownership
              </h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Transfer this project to another admin. You will lose admin access.
              </p>
            </div>
            <Button variant="outline" onClick={onTransfer} disabled={isLoading}>
              Transfer
            </Button>
          </div>

          {/* Delete Project */}
          <div className="flex items-center justify-between p-4 bg-background border border-destructive/20 rounded-lg">
            <div className="flex-1">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-destructive" />
                Delete Project
              </h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Permanently delete this project and all its data. This action cannot be undone.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={isLoading}
            >
              Delete Project
            </Button>
          </div>
        </div>
      </section>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Project
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project{' '}
              <strong>{projectName}</strong> and all associated data including test cases,
              cycles, defects, and settings.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-2">
              Please type <strong>{projectName}</strong> to confirm:
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Project name"
              className="border-destructive/50 focus:border-destructive"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmText('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={!canDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
