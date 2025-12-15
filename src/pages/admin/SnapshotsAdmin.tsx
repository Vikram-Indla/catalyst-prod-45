import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Search, Plus, MoreVertical, Pencil, Trash2, CheckCircle, Archive, AlertTriangle } from 'lucide-react';
import { useStrategicSnapshots, useDeleteSnapshot, useActivateSnapshot, useArchiveSnapshot, StrategicSnapshot, useSnapshotConfiguration } from '@/hooks/useStrategicSnapshots';
import { useSnapshotStrategyLinks } from '@/hooks/useStrategicBacklog';
import { CreateSnapshotModal } from '@/components/strategy/snapshots/CreateSnapshotModal';
import { RenameSnapshotModal } from '@/components/strategy/snapshots/RenameSnapshotModal';
import { EditSnapshotDetailsModal } from '@/components/strategy/snapshots/EditSnapshotDetailsModal';
import { ManageQuartersDrawer } from '@/components/strategy/snapshots/ManageQuartersDrawer';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { catalystToast } from '@/lib/catalystToast';

type StatusFilter = 'all' | 'draft' | 'active' | 'archived';

function SnapshotAdminRow({ 
  snapshot, 
  onEdit,
  onRename,
  onManageQuarters,
  onActivate,
  onArchive,
  onDelete,
}: { 
  snapshot: StrategicSnapshot;
  onEdit: (s: StrategicSnapshot) => void;
  onRename: (s: StrategicSnapshot) => void;
  onManageQuarters: (s: StrategicSnapshot) => void;
  onActivate: (s: StrategicSnapshot) => void;
  onArchive: (s: StrategicSnapshot) => void;
  onDelete: (s: StrategicSnapshot) => void;
}) {
  const { data: configuration } = useSnapshotConfiguration(snapshot.id);
  const { data: links } = useSnapshotStrategyLinks(snapshot.id);
  
  const isActive = snapshot.status === 'ACTIVE';
  const isArchived = snapshot.status === 'ARCHIVED';
  const isDraft = snapshot.status === 'DRAFT';
  
  const themeCount = links?.theme_ids?.length || configuration?.themes?.length || 0;
  const quarterCount = configuration?.quarters?.length || 0;
  
  const formatDateRange = () => {
    try {
      const start = format(new Date(snapshot.start_date), 'MMM yyyy');
      const end = format(new Date(snapshot.end_date), 'MMM yyyy');
      return `${start} — ${end}`;
    } catch {
      return 'N/A';
    }
  };

  const formatUpdatedAt = () => {
    try {
      return formatDistanceToNow(new Date(snapshot.updated_at), { addSuffix: true });
    } catch {
      return 'N/A';
    }
  };

  const getStatusBadge = () => {
    switch (snapshot.status) {
      case 'ACTIVE':
        return <Badge className="bg-secondary-green/10 text-secondary-green border-secondary-green/30">Active</Badge>;
      case 'ARCHIVED':
        return <Badge variant="outline" className="text-muted-foreground">Archived</Badge>;
      default:
        return <Badge variant="outline" className="text-foreground">Draft</Badge>;
    }
  };

  return (
    <TableRow className={cn(isActive && "bg-secondary-green/5")}>
      <TableCell>
        <span className="font-medium">{snapshot.name}</span>
      </TableCell>
      <TableCell>{getStatusBadge()}</TableCell>
      <TableCell className="text-muted-foreground">{formatDateRange()}</TableCell>
      <TableCell className="text-center">
        <span className={cn(quarterCount === 0 && "text-amber-600 font-medium")}>
          {quarterCount}
          {quarterCount === 0 && <AlertTriangle className="h-3 w-3 inline ml-1" />}
        </span>
      </TableCell>
      <TableCell className="text-center">
        <span className={cn(themeCount === 0 && "text-amber-600 font-medium")}>
          {themeCount}
          {themeCount === 0 && <AlertTriangle className="h-3 w-3 inline ml-1" />}
        </span>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">{formatUpdatedAt()}</TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[400]">
            <DropdownMenuItem onClick={() => onRename(snapshot)}>
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(snapshot)}>
              Edit Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onManageQuarters(snapshot)}>
              Manage Quarters
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {isDraft && (
              <DropdownMenuItem onClick={() => onActivate(snapshot)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Activate
              </DropdownMenuItem>
            )}
            {!isArchived && (
              <DropdownMenuItem onClick={() => onArchive(snapshot)}>
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>
            )}
            {isDraft && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onDelete(snapshot)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

export default function SnapshotsAdmin() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<StrategicSnapshot | null>(null);
  const [renameSnapshot, setRenameSnapshot] = useState<StrategicSnapshot | null>(null);
  const [editSnapshot, setEditSnapshot] = useState<StrategicSnapshot | null>(null);
  const [quartersSnapshot, setQuartersSnapshot] = useState<StrategicSnapshot | null>(null);
  const [deleteSnapshot, setDeleteSnapshot] = useState<StrategicSnapshot | null>(null);

  const { data: snapshots = [], isLoading } = useStrategicSnapshots(true); // Always show archived
  const deleteSnapshotMutation = useDeleteSnapshot();
  const activateSnapshotMutation = useActivateSnapshot();
  const archiveSnapshotMutation = useArchiveSnapshot();

  const sortedAndFilteredSnapshots = useMemo(() => {
    let result = snapshots.filter((s) => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        matchesStatus = s.status.toLowerCase() === statusFilter;
      }
      
      return matchesSearch && matchesStatus;
    });
    
    // Sort: ACTIVE first, then by updated_at desc
    result = result.sort((a, b) => {
      if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
      if (b.status === 'ACTIVE' && a.status !== 'ACTIVE') return 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
    
    return result;
  }, [snapshots, searchQuery, statusFilter]);

  const handleActivate = async (snapshot: StrategicSnapshot) => {
    try {
      await activateSnapshotMutation.mutateAsync(snapshot.id);
    } catch {
      // Error handled by mutation
    }
  };

  const handleArchive = async (snapshot: StrategicSnapshot) => {
    try {
      await archiveSnapshotMutation.mutateAsync(snapshot.id);
    } catch {
      // Error handled by mutation
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteSnapshot) {
      try {
        await deleteSnapshotMutation.mutateAsync(deleteSnapshot.id);
        setDeleteSnapshot(null);
      } catch {
        // Error handled by mutation
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Strategic Snapshots</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage planning periods and linked strategic items (Admin only)
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)} className="bg-brand-gold hover:bg-brand-gold-hover text-white">
          <Plus className="h-4 w-4 mr-2" />
          Create Snapshot
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search snapshots..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Snapshot Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date Range</TableHead>
              <TableHead className="text-center">Quarters</TableHead>
              <TableHead className="text-center">Themes</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : sortedAndFilteredSnapshots.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No snapshots found
                </TableCell>
              </TableRow>
            ) : (
              sortedAndFilteredSnapshots.map((snapshot) => (
                <SnapshotAdminRow
                  key={snapshot.id}
                  snapshot={snapshot}
                  onEdit={setEditSnapshot}
                  onRename={setRenameSnapshot}
                  onManageQuarters={setQuartersSnapshot}
                  onActivate={handleActivate}
                  onArchive={handleArchive}
                  onDelete={setDeleteSnapshot}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modals */}
      <CreateSnapshotModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />

      {renameSnapshot && (
        <RenameSnapshotModal
          open={!!renameSnapshot}
          onClose={() => setRenameSnapshot(null)}
          snapshot={renameSnapshot}
        />
      )}

      {editSnapshot && (
        <EditSnapshotDetailsModal
          open={!!editSnapshot}
          onClose={() => setEditSnapshot(null)}
          snapshot={editSnapshot}
        />
      )}

      {quartersSnapshot && (
        <ManageQuartersDrawer
          open={!!quartersSnapshot}
          onClose={() => setQuartersSnapshot(null)}
          snapshot={quartersSnapshot}
          isAdmin={true}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteSnapshot} onOpenChange={() => setDeleteSnapshot(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Snapshot</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteSnapshot?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
