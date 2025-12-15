import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { X, Calendar, MoreVertical, ExternalLink, Layers, Settings, CheckCircle2, AlertTriangle, ChevronRight, Pencil } from 'lucide-react';
import { StrategicSnapshot, useSnapshotConfiguration, useDeleteSnapshot } from '@/hooks/useStrategicSnapshots';
import { useSnapshotStrategyLinks } from '@/hooks/useStrategicBacklog';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useState } from 'react';
import { ActivateSnapshotModal } from './ActivateSnapshotModal';
import { ManageQuartersDrawer } from './ManageQuartersDrawer';
import { RenameSnapshotModal } from './RenameSnapshotModal';
import { EditSnapshotDetailsModal } from './EditSnapshotDetailsModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface SnapshotDetailsDrawerV2Props {
  open: boolean;
  onClose: () => void;
  snapshot: StrategicSnapshot | null;
}

export function SnapshotDetailsDrawerV2({ open, onClose, snapshot }: SnapshotDetailsDrawerV2Props) {
  const navigate = useNavigate();
  const { data: configuration } = useSnapshotConfiguration(snapshot?.id || null);
  const { data: links } = useSnapshotStrategyLinks(snapshot?.id);
  const [activateModalOpen, setActivateModalOpen] = useState(false);
  const [manageQuartersOpen, setManageQuartersOpen] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [editDetailsModalOpen, setEditDetailsModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const deleteSnapshotMutation = useDeleteSnapshot();

  if (!snapshot) return null;

  const isActive = snapshot.status === 'ACTIVE';
  const isArchived = snapshot.status === 'ARCHIVED';
  const isDraft = snapshot.status === 'DRAFT';

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    try {
      return format(new Date(dateStr), 'MMM yyyy');
    } catch {
      return dateStr;
    }
  };

  const formatUpdatedAt = () => {
    try {
      return `Updated ${formatDistanceToNow(new Date(snapshot.updated_at), { addSuffix: false })} ago`;
    } catch {
      return 'N/A';
    }
  };

  const getStatusBadge = () => {
    switch (snapshot.status) {
      case 'ACTIVE':
        return <Badge className="bg-secondary-green/10 text-secondary-green border-secondary-green/30">active</Badge>;
      case 'ARCHIVED':
        return <Badge variant="outline" className="text-muted-foreground">archived</Badge>;
      default:
        return <Badge variant="outline" className="text-foreground">draft</Badge>;
    }
  };

  const themeCount = links?.theme_ids?.length || configuration?.themes?.length || 0;
  const quarterCount = configuration?.quarters?.length || 0;
  
  // Readiness check: quarters > 0 AND themes > 0
  const isReady = quarterCount > 0 && themeCount > 0;

  const handleNavigateToStrategyRoom = () => {
    navigate(`/enterprise/strategy-room?snapshot=${snapshot.id}`);
    onClose();
  };

  const handleNavigateToBacklog = () => {
    navigate(`/enterprise/strategic-backlog?snapshot=${snapshot.id}&tab=themes`);
    onClose();
  };

  const getOwnerInitials = () => {
    return snapshot.created_by?.slice(0, 2).toUpperCase() || 'AA';
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent 
          side="right" 
          className="w-[480px] max-w-full p-0 flex flex-col"
          hideClose
        >
          {/* Header */}
          <div className="p-4 border-b border-border">
            {/* Row 1: Title + Status + Actions */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-foreground truncate">{snapshot.name}</h2>
                <div className="flex items-center gap-2 mt-1.5">
                  {getStatusBadge()}
                  <span className="text-xs text-muted-foreground">v1</span>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="z-[400]">
                    <DropdownMenuItem onClick={() => setRenameModalOpen(true)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setEditDetailsModalOpen(true)}>
                      <Settings className="h-4 w-4 mr-2" />
                      Edit Details
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setDeleteConfirmOpen(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Row 2: Metadata */}
            <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
              <Avatar className="h-6 w-6 bg-secondary-green text-white">
                <AvatarFallback className="text-[10px] bg-secondary-green text-white">{getOwnerInitials()}</AvatarFallback>
              </Avatar>
              <span>Ahmed Al-Rashid</span>
              <span className="text-muted-foreground/50">•</span>
              <span>{formatUpdatedAt()}</span>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Description */}
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Description</h4>
              <p className="text-sm text-foreground">
                {snapshot.description || 'No description provided.'}
              </p>
            </div>

            {/* Date Range */}
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Date Range</h4>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{formatDate(snapshot.start_date)} — {formatDate(snapshot.end_date)}</span>
              </div>
            </div>

            <Separator />

            {/* Readiness */}
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Readiness</h4>
              {isReady ? (
                <div className="flex items-center gap-2 p-3 rounded-md bg-secondary-green/10 border border-secondary-green/20">
                  <CheckCircle2 className="h-4 w-4 text-secondary-green" />
                  <span className="text-sm font-medium text-secondary-green">Ready</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                  <span className="text-sm font-medium text-amber-600 dark:text-amber-500">
                    Incomplete — add quarters and themes
                  </span>
                </div>
              )}
            </div>

            <Separator />

            {/* Scope Cards */}
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">Scope</h4>
              <div className="grid grid-cols-2 gap-3">
                {/* Quarters Card */}
                <button
                  onClick={() => setManageQuartersOpen(true)}
                  className="p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors text-left group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-8 w-8 rounded-md bg-brand-gold/10 flex items-center justify-center">
                      <Layers className="h-4 w-4 text-brand-gold" />
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                  <div className="text-xs text-muted-foreground mb-1">Quarters</div>
                  <div className={cn(
                    "text-xl font-semibold",
                    quarterCount === 0 ? "text-amber-600" : "text-foreground"
                  )}>
                    {quarterCount}
                    {quarterCount === 0 && <AlertTriangle className="h-3.5 w-3.5 inline ml-1 text-amber-500" />}
                  </div>
                </button>

                {/* Themes Card */}
                <button
                  onClick={handleNavigateToBacklog}
                  className="p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors text-left group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-8 w-8 rounded-md bg-brand-gold/10 flex items-center justify-center">
                      <Settings className="h-4 w-4 text-brand-gold" />
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                  <div className="text-xs text-muted-foreground mb-1">Themes</div>
                  <div className={cn(
                    "text-xl font-semibold",
                    themeCount === 0 ? "text-amber-600" : "text-foreground"
                  )}>
                    {themeCount}
                    {themeCount === 0 && <AlertTriangle className="h-3.5 w-3.5 inline ml-1 text-amber-500" />}
                  </div>
                </button>
              </div>
            </div>

            <Separator />

            {/* Quick Actions */}
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">Quick Actions</h4>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-10"
                  onClick={handleNavigateToStrategyRoom}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in Strategy Room
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-10"
                  onClick={handleNavigateToBacklog}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Strategic Backlog
                </Button>
              </div>
            </div>
          </div>

          {/* Footer - Activate action for non-active snapshots */}
          {!isActive && !isArchived && (
            <div className="p-4 border-t border-border">
              <Button 
                className="w-full bg-secondary-green hover:bg-secondary-green/90 text-white"
                onClick={() => setActivateModalOpen(true)}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Activate Snapshot
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Activate Modal */}
      {snapshot && (
        <ActivateSnapshotModal
          open={activateModalOpen}
          onClose={() => setActivateModalOpen(false)}
          snapshot={snapshot}
          onOpenQuarters={() => {
            setActivateModalOpen(false);
            setManageQuartersOpen(true);
          }}
        />
      )}

      {/* Manage Quarters Drawer */}
      {snapshot && (
        <ManageQuartersDrawer
          open={manageQuartersOpen}
          onClose={() => setManageQuartersOpen(false)}
          snapshot={snapshot}
        />
      )}

      {/* Rename Modal */}
      {snapshot && (
        <RenameSnapshotModal
          open={renameModalOpen}
          onClose={() => setRenameModalOpen(false)}
          snapshot={snapshot}
        />
      )}

      {/* Edit Details Modal */}
      {snapshot && (
        <EditSnapshotDetailsModal
          open={editDetailsModalOpen}
          onClose={() => setEditDetailsModalOpen(false)}
          snapshot={snapshot}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Snapshot</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{snapshot?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (snapshot) {
                  await deleteSnapshotMutation.mutateAsync(snapshot.id);
                  setDeleteConfirmOpen(false);
                  onClose();
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
