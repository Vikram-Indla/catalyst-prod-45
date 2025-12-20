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
import { SnapshotDrawer } from '@/components/enterprise/snapshots/SnapshotDrawer';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { PageChrome } from '@/components/layout/PageChrome';
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
        return (
          <Badge className="bg-[var(--status-success-bg)] text-[var(--status-success)] border border-[var(--status-success-border)] text-[10px] font-semibold uppercase tracking-wider">
            ACTIVE
          </Badge>
        );
      case 'ARCHIVED':
        return (
          <Badge className="bg-[var(--status-muted-bg)] text-[var(--status-muted)] border border-[var(--status-muted-border)] text-[10px] font-semibold uppercase tracking-wider">
            ARCHIVED
          </Badge>
        );
      default:
        return (
          <Badge className="bg-[var(--status-muted-bg)] text-[var(--status-muted)] border border-[var(--status-muted-border)] text-[10px] font-semibold uppercase tracking-wider">
            DRAFT
          </Badge>
        );
    }
  };

  const ownerName = owner?.full_name || 'Unassigned';
  const ownerInitials = ownerName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const isSelected = false; // Can be passed as prop if needed for drawer open state

  return (
    <tr 
      className={cn(
        "cursor-pointer transition-all duration-150 group",
        "border-b border-[#E8E4DC] dark:border-[#21262D]",
        // Hover state with champagne left border
        "hover:bg-[rgba(198,156,109,0.06)] dark:hover:bg-[rgba(198,156,109,0.08)]",
        "hover:border-l-[3px] hover:border-l-[var(--status-warning)]",
        // Active snapshot styling
        isActive && "border-l-[3px] border-l-[var(--status-success)] bg-[var(--status-success-bg)]",
        // Selected state (when drawer open)
        isSelected && !isActive && [
          "bg-[var(--status-info-bg)]",
          "border-l-[3px] border-l-[var(--status-info)]"
        ]
      )}
      onClick={() => onSelect(snapshot)}
    >
      <td className="py-3 px-4">
        <span className="font-medium text-foreground group-hover:text-[hsl(var(--brand-primary))] transition-colors">
          {snapshot.name}
        </span>
      </td>
      <td className="py-3 px-4">{getStatusBadge()}</td>
      <td className="py-3 px-4 text-sm text-muted-foreground tabular-nums">{formatDateRange()}</td>
      <td className="py-3 px-4 text-right tabular-nums">
        <span className={cn("text-sm", quarterCount === 0 && "text-[#C69C6D] font-medium")}>
          {quarterCount}
          {quarterCount === 0 && <AlertTriangle className="h-3 w-3 inline ml-1 text-[#C69C6D]" />}
        </span>
      </td>
      <td className="py-3 px-4 text-right tabular-nums">
        <span className={cn("text-sm", themeCount === 0 && "text-[#C69C6D] font-medium")}>
          {themeCount}
          {themeCount === 0 && <AlertTriangle className="h-3 w-3 inline ml-1 text-[#C69C6D]" />}
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

  // Create Snapshot CTA - matches Strategy Room primary CTA styling
  const createSnapshotCta = (
    <Button 
      onClick={() => setCreateModalOpen(true)} 
      className="h-8 bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary-hover))] text-white"
    >
      <Plus className="h-4 w-4 mr-2" />
      Create Snapshot
    </Button>
  );

  // Toolbar - matches Strategy Room control styling
  const toolbar = (
    <div className="flex items-center gap-3 w-full">
      {/* Search */}
      <div className={cn(
        "relative flex items-center gap-2 px-3 py-2 rounded-lg w-64",
        "bg-white dark:bg-[#0D1117]",
        "border border-[#E1E4E8] dark:border-[#30363D]",
        "focus-within:border-[#C69C6D] focus-within:ring-1 focus-within:ring-[rgba(198,156,109,0.3)]"
      )}>
        <Search className="h-4 w-4 text-[#8B949E]" />
        <input
          type="text"
          placeholder="Search snapshots..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent text-sm text-[#24292F] dark:text-[#E6EDF3] placeholder:text-[#8B949E] outline-none"
        />
      </div>

      {/* Status Filter */}
      <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
        <SelectTrigger 
          className={cn(
            "w-[120px] h-8 text-sm",
            "bg-white dark:bg-[#0D1117]",
            "border border-[#E1E4E8] dark:border-[#30363D]",
            "hover:border-[#D0D7DE] dark:hover:border-[#3D444D]",
            "text-[#24292F] dark:text-[#E6EDF3]"
          )}
        >
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
        <SelectTrigger 
          className={cn(
            "w-[120px] h-8 text-sm",
            "bg-white dark:bg-[#0D1117]",
            "border border-[#E1E4E8] dark:border-[#30363D]",
            "hover:border-[#D0D7DE] dark:hover:border-[#3D444D]",
            "text-[#24292F] dark:text-[#E6EDF3]"
          )}
        >
          <SelectValue placeholder="All Owners" />
        </SelectTrigger>
        <SelectContent className="z-[400]">
          <SelectItem value="all">All Owners</SelectItem>
        </SelectContent>
      </Select>

      {/* Sort */}
      <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
        <SelectTrigger 
          className={cn(
            "w-[130px] h-8 text-sm",
            "bg-white dark:bg-[#0D1117]",
            "border border-[#E1E4E8] dark:border-[#30363D]",
            "hover:border-[#D0D7DE] dark:hover:border-[#3D444D]",
            "text-[#24292F] dark:text-[#E6EDF3]"
          )}
        >
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
      <div className="flex items-center p-1 bg-[#F6F8FA] dark:bg-[#21262D] rounded-lg ml-auto">
        <button
          className={cn(
            "p-1.5 rounded-md transition-colors",
            view === 'table' 
              ? "bg-white dark:bg-[#30363D] text-[#24292F] dark:text-[#E6EDF3] shadow-sm"
              : "text-[#8B949E] hover:text-[#57606A]"
          )}
          onClick={() => setView('table')}
          aria-label="Table view"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          className={cn(
            "p-1.5 rounded-md transition-colors",
            view === 'cards' 
              ? "bg-white dark:bg-[#30363D] text-[#24292F] dark:text-[#E6EDF3] shadow-sm"
              : "text-[#8B949E] hover:text-[#57606A]"
          )}
          onClick={() => setView('cards')}
          aria-label="Card view"
        >
          <Grid3x3 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return (
    <PageChrome rightActions={createSnapshotCta} toolbar={toolbar}>
      {/* Content - matches Strategy Room padding/spacing */}
      <div className="px-6 py-4 space-y-5 pb-8 max-w-[1600px] mx-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : sortedAndFilteredSnapshots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No snapshots found</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              {searchQuery 
                ? 'Try adjusting your search or filters.' 
                : 'Create a snapshot to start planning and link quarters and themes.'}
            </p>
            {!searchQuery && (
              <Button 
                onClick={() => setCreateModalOpen(true)} 
                className="bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary-hover))] text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Snapshot
              </Button>
            )}
          </div>
        ) : view === 'table' ? (
          <div className="bg-white dark:bg-[#0D1117] border border-[#E1E4E8] dark:border-[#30363D] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F5F3F0] dark:bg-[#21262D] border-b border-[#E8E4DC] dark:border-[#30363D]">
                  <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wider text-[#8B949E] dark:text-[#6E7681]">Snapshot Name</th>
                  <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wider text-[#8B949E] dark:text-[#6E7681]">Status</th>
                  <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wider text-[#8B949E] dark:text-[#6E7681]">Date Range</th>
                  <th className="py-3 px-4 text-right text-[11px] font-semibold uppercase tracking-wider text-[#8B949E] dark:text-[#6E7681]">Quarters</th>
                  <th className="py-3 px-4 text-right text-[11px] font-semibold uppercase tracking-wider text-[#8B949E] dark:text-[#6E7681]">Themes</th>
                  <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wider text-[#8B949E] dark:text-[#6E7681]">Owner</th>
                  <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wider text-[#8B949E] dark:text-[#6E7681]">Last Updated</th>
                  <th className="py-3 px-4 w-[50px]"></th>
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
      </div>

      {/* Create Modal */}
      <CreateSnapshotModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />

      {/* New Snapshot Drawer */}
      <SnapshotDrawer
        isOpen={!!selectedSnapshot}
        onClose={() => setSelectedSnapshot(null)}
        snapshotId={selectedSnapshot?.id || null}
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
    </PageChrome>
  );
}
