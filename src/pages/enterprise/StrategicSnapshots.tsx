import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Search, Plus, Grid3x3, List, Camera, FileText, ArrowUpDown } from 'lucide-react';
import { useStrategicSnapshots, useDeleteSnapshot, StrategicSnapshot } from '@/hooks/useStrategicSnapshots';
import { SnapshotCard } from '@/components/strategy/snapshots/SnapshotCard';
import { SnapshotListItem } from '@/components/strategy/snapshots/SnapshotListItem';
import { CreateSnapshotModal } from '@/components/strategy/snapshots/CreateSnapshotModal';
import { SnapshotDetailsDrawer } from '@/components/strategy/snapshots/SnapshotDetailsDrawer';

type SortOption = 'created_desc' | 'created_asc' | 'name_asc' | 'name_desc' | 'status';

export default function StrategicSnapshots() {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('created_desc');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteSnapshot, setDeleteSnapshot] = useState<StrategicSnapshot | null>(null);
  const [detailsSnapshot, setDetailsSnapshot] = useState<StrategicSnapshot | null>(null);

  const { data: snapshots = [], isLoading } = useStrategicSnapshots(showArchived);
  const deleteSnapshotMutation = useDeleteSnapshot();

  const sortedAndFilteredSnapshots = useMemo(() => {
    // Filter first
    let result = snapshots.filter((s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    // Sort with ACTIVE always on top
    result = result.sort((a, b) => {
      // ACTIVE snapshots always first
      if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
      if (b.status === 'ACTIVE' && a.status !== 'ACTIVE') return 1;
      
      // Then apply chosen sort
      switch (sortBy) {
        case 'created_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'created_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'status':
          const statusOrder = { ACTIVE: 0, DRAFT: 1, ARCHIVED: 2 };
          return statusOrder[a.status] - statusOrder[b.status];
        default:
          return 0;
      }
    });
    
    return result;
  }, [snapshots, searchQuery, sortBy]);

  const handleViewDetails = (snapshot: StrategicSnapshot) => {
    setDetailsSnapshot(snapshot);
  };

  const handleDeleteConfirm = async () => {
    if (deleteSnapshot) {
      await deleteSnapshotMutation.mutateAsync(deleteSnapshot.id);
      setDeleteSnapshot(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header Row 1: Title only - NO divider, NO icon */}
      <div className="h-[44px] flex items-center px-6 flex-shrink-0">
        <h1 className="text-xl font-semibold text-secondary-green">Strategic Snapshots</h1>
      </div>

      {/* Header Row 2: Toolbar - with divider AFTER */}
      <div className="h-[52px] px-6 flex items-center justify-between border-b" style={{ borderColor: 'hsl(var(--border))' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              id="show-archived"
              checked={showArchived}
              onCheckedChange={setShowArchived}
            />
            <Label htmlFor="show-archived" className="text-sm cursor-pointer">
              Show archived
            </Label>
          </div>
          
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={view === 'grid' ? 'default' : 'ghost'}
            size="icon"
            className="h-9 w-9"
            onClick={() => setView('grid')}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={view === 'list' ? 'default' : 'ghost'}
            size="icon"
            className="h-9 w-9"
            onClick={() => setView('list')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button onClick={() => setCreateModalOpen(true)} size="icon" className="h-9 w-9">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold"></div>
          </div>
        ) : sortedAndFilteredSnapshots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No snapshots found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery 
                ? 'Try adjusting your search or filters.' 
                : 'Create your first strategic snapshot to get started.'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Snapshot
              </Button>
            )}
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedAndFilteredSnapshots.map((snapshot) => (
              <SnapshotCard
                key={snapshot.id}
                snapshot={snapshot}
                onViewDetails={handleViewDetails}
                onDelete={setDeleteSnapshot}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              {sortedAndFilteredSnapshots.map((snapshot) => (
                <SnapshotListItem
                  key={snapshot.id}
                  snapshot={snapshot}
                  onViewDetails={handleViewDetails}
                  onDelete={setDeleteSnapshot}
                />
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Modal */}
      <CreateSnapshotModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />

      {/* Details Drawer */}
      <SnapshotDetailsDrawer
        open={!!detailsSnapshot}
        onClose={() => setDetailsSnapshot(null)}
        snapshot={detailsSnapshot}
      />

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
