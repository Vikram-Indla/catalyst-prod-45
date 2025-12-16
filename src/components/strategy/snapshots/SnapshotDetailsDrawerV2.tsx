import { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Calendar, MoreVertical, ExternalLink, Layers, Settings, CheckCircle2, AlertTriangle, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { StrategicSnapshot, useSnapshotConfiguration, useDeleteSnapshot } from '@/hooks/useStrategicSnapshots';
import { useSnapshotStrategyLinks } from '@/hooks/useStrategicBacklog';
import { format, formatDistanceToNow } from 'date-fns';
import { useUserRole } from '@/hooks/useUserRole';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ActivateSnapshotModal } from './ActivateSnapshotModal';
import { ManageQuartersDrawer } from './ManageQuartersDrawer';
import { ManageThemesPanel } from './ManageThemesPanel';
import { RenameSnapshotModal } from './RenameSnapshotModal';
import { EditSnapshotDetailsModal } from './EditSnapshotDetailsModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SnapshotDetailsDrawerV2Props {
  open: boolean;
  onClose: () => void;
  snapshot: StrategicSnapshot | null;
}

type DrawerView = 'details' | 'themes';

export function SnapshotDetailsDrawerV2({ open, onClose, snapshot }: SnapshotDetailsDrawerV2Props) {
  const navigate = useNavigate();
  const { data: configuration } = useSnapshotConfiguration(snapshot?.id || null);
  const { data: links } = useSnapshotStrategyLinks(snapshot?.id);
  const { isAdmin } = useUserRole();
  const [activateModalOpen, setActivateModalOpen] = useState(false);
  const [manageQuartersOpen, setManageQuartersOpen] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [editDetailsModalOpen, setEditDetailsModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [currentView, setCurrentView] = useState<DrawerView>('details');
  const deleteSnapshotMutation = useDeleteSnapshot();

  // Fetch owner profile
  const { data: ownerProfile } = useQuery({
    queryKey: ['profile', snapshot?.created_by],
    queryFn: async () => {
      if (!snapshot?.created_by) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', snapshot.created_by)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!snapshot?.created_by,
  });

  if (!snapshot) return null;

  const isActive = snapshot.status === 'ACTIVE';
  const isArchived = snapshot.status === 'ARCHIVED';
  const isDraft = snapshot.status === 'DRAFT';

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
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
      return '—';
    }
  };

  const getStatusBadge = () => {
    switch (snapshot.status) {
      case 'ACTIVE':
        return (
          <Badge className="bg-[rgba(92,124,92,0.1)] dark:bg-[rgba(92,124,92,0.15)] text-[#5C7C5C] dark:text-[#7DA37D] border border-[rgba(92,124,92,0.3)] text-[10px] font-semibold uppercase tracking-wider">
            ACTIVE
          </Badge>
        );
      case 'ARCHIVED':
        return (
          <Badge className="bg-[#F6F8FA] dark:bg-[#21262D] text-[#57606A] dark:text-[#8B949E] border border-[#E1E4E8] dark:border-[#30363D] text-[10px] font-semibold uppercase tracking-wider">
            ARCHIVED
          </Badge>
        );
      default:
        return (
          <Badge className="bg-[#F6F8FA] dark:bg-[#21262D] text-[#57606A] dark:text-[#8B949E] border border-[#E1E4E8] dark:border-[#30363D] text-[10px] font-semibold uppercase tracking-wider">
            DRAFT
          </Badge>
        );
    }
  };

  const themeCount = links?.theme_ids?.length || configuration?.themes?.length || 0;
  const quarterCount = configuration?.quarters?.length || 0;
  const isReady = quarterCount > 0 && themeCount > 0;

  const handleNavigateToStrategyRoom = () => {
    navigate(`/enterprise/strategy-room?snapshotId=${snapshot.id}`);
    onClose();
  };

  const handleNavigateToBacklog = () => {
    navigate(`/enterprise/strategic-backlog?snapshotMode=true&snapshotId=${snapshot.id}`);
    onClose();
  };

  const ownerName = ownerProfile?.full_name || 'Unassigned';
  const ownerInitials = ownerName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const handleClose = () => {
    setCurrentView('details');
    onClose();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && handleClose()}>
        <SheetContent 
          side="right" 
          className="w-[520px] max-w-full p-0 flex flex-col bg-white dark:bg-[#161B22] border-l border-[#E1E4E8] dark:border-[#30363D] shadow-xl z-[1000]"
          hideClose
        >
          {/* Gold rail — full-height */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 bottom-0 w-1 bg-brand-gold"
          />
          {currentView === 'themes' ? (
            <div className="flex-1 overflow-hidden p-4">
              <ManageThemesPanel 
                snapshot={snapshot} 
                onBack={() => setCurrentView('details')} 
              />
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="p-4 border-b border-brand-gold/50">
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
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClose}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Row 2: Metadata */}
                <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[10px] bg-[hsl(var(--secondary-green))] text-white">{ownerInitials}</AvatarFallback>
                  </Avatar>
                  <span>{ownerName}</span>
                  <span className="text-muted-foreground/50">•</span>
                  <span>{formatUpdatedAt()}</span>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Description */}
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">DESCRIPTION</h4>
                <p className="text-sm text-foreground">
                  {snapshot.description || 'No description provided.'}
                </p>
              </div>

              {/* Gold Horizontal Divider */}
              <div className="h-px bg-secondary-champagne" />

              {/* Date Range */}
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">DATE RANGE</h4>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDate(snapshot.start_date)} — {formatDate(snapshot.end_date)}</span>
                </div>
              </div>

              {/* Gold Horizontal Divider */}
              <div className="h-px bg-secondary-champagne" />

              {/* Readiness */}
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">READINESS</h4>
                {isReady ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-[rgba(92,124,92,0.1)] dark:bg-[rgba(92,124,92,0.15)] border border-[rgba(92,124,92,0.3)]">
                    <CheckCircle2 className="h-4 w-4 text-secondary-green flex-shrink-0" />
                    <span className="text-sm text-foreground">Ready for activation</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-brand-gold/10 border border-brand-gold/30">
                    <AlertTriangle className="h-4 w-4 text-brand-gold flex-shrink-0" />
                    <span className="text-sm text-foreground">
                      Incomplete — add quarters and themes
                    </span>
                  </div>
                )}
              </div>

              {/* Gold Horizontal Divider */}
              <div className="h-px bg-secondary-champagne" />

              {/* Scope Cards */}
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">SCOPE</h4>
                <div className="grid grid-cols-2 gap-3">
                  {/* Quarters Card */}
                  <button
                    onClick={() => setManageQuartersOpen(true)}
                    className="p-4 rounded-lg transition-all text-left group bg-muted/50 border border-border hover:border-brand-gold/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-8 w-8 rounded-md bg-brand-gold/10 flex items-center justify-center">
                        <Layers className="h-4 w-4 text-brand-gold" />
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">Quarters</div>
                    <div className={cn(
                      "text-xl font-semibold tabular-nums",
                      quarterCount === 0 ? "text-brand-gold" : "text-foreground"
                    )}>
                      {quarterCount}
                      {quarterCount === 0 && <AlertTriangle className="h-3.5 w-3.5 inline ml-1 text-brand-gold" />}
                    </div>
                  </button>

                  {/* Themes Card */}
                  <button
                    onClick={() => setCurrentView('themes')}
                    className="p-4 rounded-lg transition-all text-left group bg-muted/50 border border-border hover:border-brand-gold/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-8 w-8 rounded-md bg-brand-gold/10 flex items-center justify-center">
                        <Settings className="h-4 w-4 text-brand-gold" />
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">Themes</div>
                    <div className={cn(
                      "text-xl font-semibold tabular-nums",
                      themeCount === 0 ? "text-brand-gold" : "text-foreground"
                    )}>
                      {themeCount}
                      {themeCount === 0 && <AlertTriangle className="h-3.5 w-3.5 inline ml-1 text-brand-gold" />}
                    </div>
                  </button>
                </div>
              </div>

              {/* Gold Horizontal Divider */}
              <div className="h-px bg-secondary-champagne" />

              {/* Quick Actions */}
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">QUICK ACTIONS</h4>
                <div className="space-y-2">
                  <button 
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors bg-background border border-border hover:border-brand-gold/30 text-foreground"
                    onClick={handleNavigateToStrategyRoom}
                  >
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Open in Strategy Room</span>
                  </button>
                  <button 
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors bg-background border border-border hover:border-brand-gold/30 text-foreground"
                    onClick={handleNavigateToBacklog}
                  >
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Open Strategic Backlog</span>
                  </button>
                </div>
              </div>
              </div>

              {/* Footer WITH Gold Line Extension */}
              {!isActive && !isArchived && (
                <div className="flex-shrink-0 flex border-t border-border">
                  {/* Gold line continues into footer */}
                  <div className="w-1 bg-brand-gold flex-shrink-0" />
                  <div className="flex-1 p-4">
                    <button 
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-brand-gold hover:bg-brand-gold-hover text-white text-sm font-medium transition-colors"
                      onClick={() => setActivateModalOpen(true)}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Activate Snapshot
                    </button>
                  </div>
                </div>
              )}
            </>
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
          isAdmin={isAdmin}
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
                  handleClose();
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
