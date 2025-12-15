import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Search, Plus, Grid3x3, List, FileText, MoreVertical, AlertTriangle, ChevronRight } from 'lucide-react';
import { useStrategicSnapshots, useDeleteSnapshot, StrategicSnapshot, useSnapshotConfiguration } from '@/hooks/useStrategicSnapshots';
import { useSnapshotStrategyLinks } from '@/hooks/useStrategicBacklog';
import { CreateSnapshotModal } from '@/components/strategy/snapshots/CreateSnapshotModal';
import { SnapshotCard } from '@/components/strategy/snapshots/SnapshotCard';
import { SnapshotDetailsDrawerV2 } from '@/components/strategy/snapshots/SnapshotDetailsDrawerV2';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

type SortOption = 'updated_desc' | 'updated_asc' | 'name_asc' | 'name_desc';
type StatusFilter = 'all' | 'draft' | 'active' | 'archived';
type ViewMode = 'table' | 'cards';

function SnapshotTableRow({ 
  snapshot, 
  onSelect, 
  onDelete 
}: { 
  snapshot: StrategicSnapshot; 
  onSelect: (s: StrategicSnapshot) => void;
  onDelete: (s: StrategicSnapshot) => void;
}) {
  const { data: configuration } = useSnapshotConfiguration(snapshot.id);
  const { data: links } = useSnapshotStrategyLinks(snapshot.id);
  
  const isActive = snapshot.status === 'ACTIVE';
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
      return formatDistanceToNow(new Date(snapshot.updated_at), { addSuffix: false });
    } catch {
      return 'N/A';
    }
  };

  const getStatusBadge = () => {
    switch (snapshot.status) {
      case 'ACTIVE':
        return <Badge className="bg-secondary-green/10 text-secondary-green border-secondary-green/30 hover:bg-secondary-green/20">active</Badge>;
      case 'ARCHIVED':
        return <Badge variant="outline" className="text-muted-foreground">archived</Badge>;
      default:
        return <Badge variant="outline" className="text-foreground">draft</Badge>;
    }
  };

  // Get owner initials (mock for now - would come from profile)
  const getOwnerInitials = () => {
    // This would normally come from a joined profile
    return snapshot.created_by?.slice(0, 2).toUpperCase() || 'UN';
  };

  return (
    <tr 
      className={cn(
        "border-b border-border/40 hover:bg-muted/30 transition-colors cursor-pointer",
        isActive && "border-l-4 border-l-brand-gold"
      )}
      onClick={() => onSelect(snapshot)}
    >
      <td className="p-3">
        <span className="font-medium text-foreground hover:text-brand-gold transition-colors">
          {snapshot.name}
        </span>
      </td>
      <td className="p-3">{getStatusBadge()}</td>
      <td className="p-3 text-sm text-muted-foreground">{formatDateRange()}</td>
      <td className="p-3 text-center">
        <span className={cn("text-sm", quarterCount === 0 && "text-amber-600 font-medium")}>
          {quarterCount}
          {quarterCount === 0 && <AlertTriangle className="h-3 w-3 inline ml-1 text-amber-500" />}
        </span>
      </td>
      <td className="p-3 text-center">
        <span className={cn("text-sm", themeCount === 0 && "text-amber-600 font-medium")}>
          {themeCount}
          {themeCount === 0 && <AlertTriangle className="h-3 w-3 inline ml-1 text-amber-500" />}
        </span>
      </td>
      <td className="p-3">
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7 bg-secondary-green text-white">
            <AvatarFallback className="text-xs bg-secondary-green text-white">{getOwnerInitials()}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">Unassigned</span>
        </div>
      </td>
      <td className="p-3 text-sm text-muted-foreground">{formatUpdatedAt()}</td>
      <td className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[400]">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelect(snapshot); }}>
              View Details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); onDelete(snapshot); }}
              className="text-destructive focus:text-destructive"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

export default function StrategicSnapshots() {
  const [view, setView] = useState<ViewMode>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('updated_desc');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteSnapshot, setDeleteSnapshot] = useState<StrategicSnapshot | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<StrategicSnapshot | null>(null);

  const showArchived = statusFilter === 'all' || statusFilter === 'archived';
  const { data: snapshots = [], isLoading } = useStrategicSnapshots(showArchived);
  const deleteSnapshotMutation = useDeleteSnapshot();

  const sortedAndFilteredSnapshots = useMemo(() => {
    let result = snapshots.filter((s) => {
      // Search filter
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status filter
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        matchesStatus = s.status.toLowerCase() === statusFilter;
      }
      
      return matchesSearch && matchesStatus;
    });
    
    // Sort with ACTIVE always on top
    result = result.sort((a, b) => {
      if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
      if (b.status === 'ACTIVE' && a.status !== 'ACTIVE') return 1;
      
      switch (sortBy) {
        case 'updated_desc':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'updated_asc':
          return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });
    
    return result;
  }, [snapshots, searchQuery, statusFilter, sortBy]);

  const handleDeleteConfirm = async () => {
    if (deleteSnapshot) {
      await deleteSnapshotMutation.mutateAsync(deleteSnapshot.id);
      setDeleteSnapshot(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header Row 1: Title + CTA */}
      <div className="h-[56px] flex items-center justify-between px-6 flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Strategic Snapshots</h1>
          <p className="text-sm text-muted-foreground">Manage planning periods and linked strategic items</p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)} className="bg-brand-gold hover:bg-brand-gold-hover text-white">
          <Plus className="h-4 w-4 mr-2" />
          Create Snapshot
        </Button>
      </div>

      {/* Header Row 2: Toolbar */}
      <div className="px-6 py-3 border-b border-border flex items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search snapshots..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Filters */}
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent className="z-[400]">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        <Select value="all">
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue placeholder="All Owners" />
          </SelectTrigger>
          <SelectContent className="z-[400]">
            <SelectItem value="all">All Owners</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Last Updated" />
          </SelectTrigger>
          <SelectContent className="z-[400]">
            <SelectItem value="updated_desc">Last Updated</SelectItem>
            <SelectItem value="updated_asc">Oldest Updated</SelectItem>
            <SelectItem value="name_asc">Name A-Z</SelectItem>
            <SelectItem value="name_desc">Name Z-A</SelectItem>
          </SelectContent>
        </Select>

        {/* View Toggle */}
        <div className="flex items-center border border-border rounded-md overflow-hidden">
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-9 w-9 rounded-none", view === 'table' && "bg-muted")}
            onClick={() => setView('table')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-9 w-9 rounded-none", view === 'cards' && "bg-muted")}
            onClick={() => setView('cards')}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
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
              <Button onClick={() => setCreateModalOpen(true)} className="bg-brand-gold hover:bg-brand-gold-hover text-white">
                <Plus className="h-4 w-4 mr-2" />
                Create Snapshot
              </Button>
            )}
          </div>
        ) : view === 'table' ? (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-brand-gold/10 border-b-2 border-brand-gold/30">
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-foreground">Snapshot Name</th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-foreground">Status</th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-foreground">Date Range</th>
                  <th className="p-3 text-center text-xs font-semibold uppercase tracking-wide text-foreground">Quarters</th>
                  <th className="p-3 text-center text-xs font-semibold uppercase tracking-wide text-foreground">Themes</th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-foreground">Owner</th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-foreground">Last Updated</th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-foreground w-[60px]"></th>
                </tr>
              </thead>
              <tbody>
                {sortedAndFilteredSnapshots.map((snapshot) => (
                  <SnapshotTableRow
                    key={snapshot.id}
                    snapshot={snapshot}
                    onSelect={setSelectedSnapshot}
                    onDelete={setDeleteSnapshot}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedAndFilteredSnapshots.map((snapshot) => (
              <SnapshotCard
                key={snapshot.id}
                snapshot={snapshot}
                onViewDetails={setSelectedSnapshot}
                onDelete={setDeleteSnapshot}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <CreateSnapshotModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />

      {/* Details Drawer V2 */}
      <SnapshotDetailsDrawerV2
        open={!!selectedSnapshot}
        onClose={() => setSelectedSnapshot(null)}
        snapshot={selectedSnapshot}
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
