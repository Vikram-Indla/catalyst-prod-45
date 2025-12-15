import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Search, Plus, Grid3x3, List, FileText, MoreVertical, AlertTriangle } from 'lucide-react';
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
import { GlobalPageHeader } from '@/components/layout/GlobalPageHeader';
import { PageShell } from '@/components/shared/PageShell';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type SortOption = 'updated_desc' | 'updated_asc' | 'name_asc' | 'name_desc';
type StatusFilter = 'all' | 'draft' | 'active' | 'archived';
type ViewMode = 'table' | 'cards';

interface OwnerProfile {
  id: string;
  full_name: string | null;
}

// Hook to fetch owner profiles for snapshots
function useSnapshotOwners(ownerIds: (string | undefined)[]) {
  const validIds = ownerIds.filter((id): id is string => !!id);
  
  return useQuery({
    queryKey: ['snapshot-owners', validIds],
    queryFn: async () => {
      if (validIds.length === 0) return {};
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', validIds);
      
      if (error) throw error;
      
      const map: Record<string, OwnerProfile> = {};
      (data || []).forEach((p) => {
        map[p.id] = p;
      });
      return map;
    },
    enabled: validIds.length > 0,
  });
}

function SnapshotTableRow({ 
  snapshot, 
  owner,
  onSelect, 
  onDelete 
}: { 
  snapshot: StrategicSnapshot;
  owner?: OwnerProfile | null;
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
      return '—';
    }
  };

  const formatUpdatedAt = () => {
    try {
      return formatDistanceToNow(new Date(snapshot.updated_at), { addSuffix: true });
    } catch {
      return '—';
    }
  };

  const getStatusBadge = () => {
    switch (snapshot.status) {
      case 'ACTIVE':
        return <Badge className="bg-[hsl(var(--g50))] text-[hsl(var(--g400))] border-[hsl(var(--g300))/30] hover:bg-[hsl(var(--g75))]">Active</Badge>;
      case 'ARCHIVED':
        return <Badge variant="outline" className="text-muted-foreground">Archived</Badge>;
      default:
        return <Badge variant="outline" className="text-foreground">Draft</Badge>;
    }
  };

  const ownerName = owner?.full_name || 'Unassigned';
  const ownerInitials = ownerName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <tr 
      className={cn(
        "border-b border-border/40 hover:bg-muted/30 transition-colors cursor-pointer group",
        isActive && "border-l-[3px] border-l-[hsl(var(--brand-gold))] bg-[hsl(var(--brand-gold))/3]"
      )}
      onClick={() => onSelect(snapshot)}
    >
      <td className="py-3 px-4">
        <span className="font-medium text-foreground group-hover:text-[hsl(var(--brand-gold))] transition-colors">
          {snapshot.name}
        </span>
      </td>
      <td className="py-3 px-4">{getStatusBadge()}</td>
      <td className="py-3 px-4 text-sm text-muted-foreground tabular-nums">{formatDateRange()}</td>
      <td className="py-3 px-4 text-right tabular-nums">
        <span className={cn("text-sm", quarterCount === 0 && "text-[hsl(var(--y400))] font-medium")}>
          {quarterCount}
          {quarterCount === 0 && <AlertTriangle className="h-3 w-3 inline ml-1 text-[hsl(var(--y400))]" />}
        </span>
      </td>
      <td className="py-3 px-4 text-right tabular-nums">
        <span className={cn("text-sm", themeCount === 0 && "text-[hsl(var(--y400))] font-medium")}>
          {themeCount}
          {themeCount === 0 && <AlertTriangle className="h-3 w-3 inline ml-1 text-[hsl(var(--y400))]" />}
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-[10px] bg-[hsl(var(--secondary-green))] text-white">{ownerInitials}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground truncate max-w-[120px]">{ownerName}</span>
        </div>
      </td>
      <td className="py-3 px-4 text-sm text-muted-foreground">{formatUpdatedAt()}</td>
      <td className="py-3 px-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
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

  // Fetch owner profiles
  const ownerIds = useMemo(() => snapshots.map(s => s.created_by), [snapshots]);
  const { data: ownersMap = {} } = useSnapshotOwners(ownerIds);

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

  // Breadcrumb dynamic based on drawer state
  const getBreadcrumb = () => {
    if (selectedSnapshot) {
      return `ENTERPRISE / Strategic Snapshots / ${selectedSnapshot.name}`;
    }
    return undefined; // Use default from GlobalPageHeader
  };

  return (
    <PageShell>
      {/* Global Page Header - matches Strategy Room */}
      <GlobalPageHeader
        sectionLabel="Enterprise"
        pageTitle="Strategic Snapshots"
        rightActions={
          <Button 
            onClick={() => setCreateModalOpen(true)} 
            className="h-8 bg-[hsl(var(--brand-gold))] hover:bg-[hsl(var(--brand-gold-hover))] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Snapshot
          </Button>
        }
        toolbar={
          <div className="flex items-center gap-3 w-full">
            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search snapshots..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8 text-[13px]"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-[120px] h-8 text-[13px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="z-[400]">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            {/* Owner Filter */}
            <Select value="all">
              <SelectTrigger className="w-[120px] h-8 text-[13px]">
                <SelectValue placeholder="All Owners" />
              </SelectTrigger>
              <SelectContent className="z-[400]">
                <SelectItem value="all">All Owners</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[130px] h-8 text-[13px]">
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
            <div className="flex items-center border border-border rounded-md overflow-hidden ml-auto">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 rounded-none",
                  view === 'table' && "bg-muted"
                )}
                onClick={() => setView('table')}
                aria-label="Table view"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 rounded-none",
                  view === 'cards' && "bg-muted"
                )}
                onClick={() => setView('cards')}
                aria-label="Card view"
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        }
      />

      {/* Content */}
      <PageShell.Content variant="wide" className="pb-8">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--brand-gold))]"></div>
          </div>
        ) : sortedAndFilteredSnapshots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No snapshots found</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              {searchQuery 
                ? 'Try adjusting your search or filters.' 
                : 'Create your first strategic snapshot to start planning.'}
            </p>
            {!searchQuery && (
              <Button 
                onClick={() => setCreateModalOpen(true)} 
                className="bg-[hsl(var(--brand-gold))] hover:bg-[hsl(var(--brand-gold-hover))] text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Snapshot
              </Button>
            )}
          </div>
        ) : view === 'table' ? (
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="py-2.5 px-4 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Snapshot Name</th>
                  <th className="py-2.5 px-4 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</th>
                  <th className="py-2.5 px-4 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Date Range</th>
                  <th className="py-2.5 px-4 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Quarters</th>
                  <th className="py-2.5 px-4 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Themes</th>
                  <th className="py-2.5 px-4 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Owner</th>
                  <th className="py-2.5 px-4 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Last Updated</th>
                  <th className="py-2.5 px-4 w-[50px]"></th>
                </tr>
              </thead>
              <tbody>
                {sortedAndFilteredSnapshots.map((snapshot) => (
                  <SnapshotTableRow
                    key={snapshot.id}
                    snapshot={snapshot}
                    owner={snapshot.created_by ? ownersMap[snapshot.created_by] : null}
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
      </PageShell.Content>

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
    </PageShell>
  );
}
