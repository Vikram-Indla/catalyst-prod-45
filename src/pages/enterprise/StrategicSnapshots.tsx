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

  // Status badge styling - Catalyst dark mode compliant
  const getStatusBadge = () => {
    // Dark mode compliant status styles with proper contrast
    const statusStyles: Record<string, { bg: string; text: string; border: string; label: string }> = {
      ACTIVE: {
        bg: 'bg-[rgba(92,124,92,0.15)] dark:bg-[rgba(92,124,92,0.2)]',
        text: 'text-[#5c7c5c] dark:text-[#7a9a7a]',
        border: 'border-[rgba(92,124,92,0.3)] dark:border-[rgba(92,124,92,0.4)]',
        label: 'ACTIVE'
      },
      ARCHIVED: {
        bg: 'bg-[rgba(82,82,82,0.08)] dark:bg-[rgba(82,82,82,0.15)]',
        text: 'text-[#737373] dark:text-[#8a8a8a]',
        border: 'border-[rgba(82,82,82,0.2)] dark:border-[rgba(82,82,82,0.3)]',
        label: 'ARCHIVED'
      },
      DRAFT: {
        bg: 'bg-[rgba(115,115,115,0.08)] dark:bg-[rgba(115,115,115,0.15)]',
        text: 'text-[#737373] dark:text-[#a3a3a3]',
        border: 'border-[rgba(115,115,115,0.2)] dark:border-[rgba(115,115,115,0.3)]',
        label: 'DRAFT'
      },
      PROPOSED: {
        bg: 'bg-[rgba(198,156,109,0.1)] dark:bg-[rgba(198,156,109,0.15)]',
        text: 'text-[#c69c6d] dark:text-[#d4b896]',
        border: 'border-[rgba(198,156,109,0.25)] dark:border-[rgba(198,156,109,0.3)]',
        label: 'PROPOSED'
      }
    };
    
    const style = statusStyles[snapshot.status] || statusStyles.DRAFT;
    
    return (
      <Badge 
        className={cn(
          "text-[10px] font-semibold uppercase tracking-wider border",
          style.bg,
          style.text,
          style.border
        )}
      >
        {style.label}
      </Badge>
    );
  };

  const ownerName = owner?.full_name || 'Unassigned';
  const ownerInitials = ownerName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const isSelected = false; // Can be passed as prop if needed for drawer open state

  return (
    <tr 
      className={cn(
        "cursor-pointer transition-all duration-150 group",
        "border-b border-[#E8E4DC] dark:border-[#242424]",
        // Hover state - Catalyst champagne tint
        "hover:bg-[rgba(198,156,109,0.06)] dark:hover:bg-[#1a1a1a]",
        "hover:border-l-[3px] hover:border-l-[#c69c6d]",
        // Active snapshot styling - olive accent
        isActive && "border-l-[3px] border-l-[#5c7c5c] bg-[rgba(92,124,92,0.06)] dark:bg-[rgba(92,124,92,0.1)]",
        // Selected state (when drawer open)
        isSelected && !isActive && [
          "bg-[rgba(198,156,109,0.06)] dark:bg-[rgba(198,156,109,0.08)]",
          "border-l-[3px] border-l-[#c69c6d]"
        ]
      )}
      onClick={() => onSelect(snapshot)}
    >
      {/* Snapshot Name - 14px medium */}
      <td className="py-4 px-4">
        <span className="text-sm font-medium text-[#24292F] dark:text-[#f5f5f5] group-hover:text-[#5c7c5c] dark:group-hover:text-[#7a9a7a] transition-colors">
          {snapshot.name}
        </span>
      </td>
      
      {/* Status Badge - dark mode compliant */}
      <td className="py-4 px-4">{getStatusBadge()}</td>
      
      {/* Date Range - 14px normal, secondary color */}
      <td className="py-4 px-4">
        <span className="text-sm text-[#6E7681] dark:text-[#a3a3a3] tabular-nums">
          {formatDateRange()}
        </span>
      </td>
      
      {/* Quarters - right aligned */}
      <td className="py-4 px-4 text-right tabular-nums">
        <span className={cn(
          "text-sm font-medium",
          quarterCount === 0 
            ? "text-[#8b7355] dark:text-[#c69c6d]" 
            : "text-[#24292F] dark:text-[#f5f5f5]"
        )}>
          {quarterCount}
          {quarterCount === 0 && <AlertTriangle className="h-3.5 w-3.5 inline ml-1 text-[#8b7355] dark:text-[#c69c6d]" />}
        </span>
      </td>
      
      {/* Themes - right aligned */}
      <td className="py-4 px-4 text-right tabular-nums">
        <span className={cn(
          "text-sm font-medium",
          themeCount === 0 
            ? "text-[#8b7355] dark:text-[#c69c6d]" 
            : "text-[#24292F] dark:text-[#f5f5f5]"
        )}>
          {themeCount}
          {themeCount === 0 && <AlertTriangle className="h-3.5 w-3.5 inline ml-1 text-[#8b7355] dark:text-[#c69c6d]" />}
        </span>
      </td>
      
      {/* Owner - with avatar */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-[10px] font-medium bg-[#5c7c5c] text-white">
              {ownerInitials}
            </AvatarFallback>
          </Avatar>
          <span className={cn(
            "text-sm truncate max-w-[120px]",
            ownerName === 'Unassigned' 
              ? "text-[#737373] dark:text-[#737373] italic" 
              : "text-[#6E7681] dark:text-[#a3a3a3]"
          )}>
            {ownerName}
          </span>
        </div>
      </td>
      
      {/* Last Updated - muted */}
      <td className="py-4 px-4">
        <span className="text-sm text-[#6E7681] dark:text-[#737373]">
          {formatUpdatedAt()}
        </span>
      </td>
      
      {/* Actions */}
      <td className="py-4 px-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-[#6E7681] dark:text-[#a3a3a3] hover:text-[#24292F] dark:hover:text-[#f5f5f5]"
            >
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
      {/* Search - Catalyst dark mode styling */}
      <div className={cn(
        "relative flex items-center gap-2 px-3 py-2.5 rounded-lg w-64",
        "bg-white dark:bg-[#1a1a1a]",
        "border border-[#E1E4E8] dark:border-[#333333]",
        "focus-within:border-[#c69c6d] focus-within:ring-1 focus-within:ring-[rgba(198,156,109,0.3)]"
      )}>
        <Search className="h-4 w-4 text-[#8B949E] dark:text-[#9ca3af]" />
        <input
          type="text"
          placeholder="Search snapshots..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent text-sm text-[#24292F] dark:text-[#f5f5f5] placeholder:text-[#8B949E] dark:placeholder:text-[#6b7280] outline-none"
        />
      </div>

      {/* Status Filter - Catalyst dark mode with visible text */}
      <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
        <SelectTrigger 
          className={cn(
            "w-[120px] h-8 text-sm",
            "bg-white dark:bg-[#1a1a1a]",
            "border border-[#E1E4E8] dark:border-[#333333]",
            "hover:border-[#D0D7DE] dark:hover:border-[#404040]",
            "text-[#24292F] dark:text-[#e6e6e6]"
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

      {/* Owner Filter - Catalyst dark mode with visible text */}
      <Select value="all">
        <SelectTrigger 
          className={cn(
            "w-[120px] h-8 text-sm",
            "bg-white dark:bg-[#1a1a1a]",
            "border border-[#E1E4E8] dark:border-[#333333]",
            "hover:border-[#D0D7DE] dark:hover:border-[#404040]",
            "text-[#24292F] dark:text-[#e6e6e6]"
          )}
        >
          <SelectValue placeholder="All Owners" />
        </SelectTrigger>
        <SelectContent className="z-[400]">
          <SelectItem value="all">All Owners</SelectItem>
        </SelectContent>
      </Select>

      {/* Sort - Catalyst dark mode with visible text */}
      <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
        <SelectTrigger 
          className={cn(
            "w-[130px] h-8 text-sm",
            "bg-white dark:bg-[#1a1a1a]",
            "border border-[#E1E4E8] dark:border-[#333333]",
            "hover:border-[#D0D7DE] dark:hover:border-[#404040]",
            "text-[#24292F] dark:text-[#e6e6e6]"
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

      {/* View Toggle - Catalyst dark mode */}
      <div className="flex items-center p-1 bg-[#F6F8FA] dark:bg-[#242424] rounded-lg border border-transparent dark:border-[#333333] ml-auto">
        <button
          className={cn(
            "p-1.5 rounded-md transition-colors",
            view === 'table' 
              ? "bg-white dark:bg-[#333333] text-[#24292F] dark:text-[#f5f5f5] shadow-sm"
              : "text-[#8B949E] dark:text-[#525252] hover:text-[#57606A] dark:hover:text-[#a3a3a3]"
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
              ? "bg-white dark:bg-[#333333] text-[#24292F] dark:text-[#f5f5f5] shadow-sm"
              : "text-[#8B949E] dark:text-[#525252] hover:text-[#57606A] dark:hover:text-[#a3a3a3]"
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
          <div className="bg-white dark:bg-[#141414] border border-[#E1E4E8] dark:border-[#333333] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F5F3F0] dark:bg-[#1a1a1a] border-b border-[#E8E4DC] dark:border-[#333333]">
                  <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6E7681] dark:text-[#9ca3af]">Snapshot Name</th>
                  <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6E7681] dark:text-[#9ca3af]">Status</th>
                  <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6E7681] dark:text-[#9ca3af]">Date Range</th>
                  <th className="py-3 px-4 text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6E7681] dark:text-[#9ca3af]">Quarters</th>
                  <th className="py-3 px-4 text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6E7681] dark:text-[#9ca3af]">Themes</th>
                  <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6E7681] dark:text-[#9ca3af]">Owner</th>
                  <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6E7681] dark:text-[#9ca3af]">Last Updated</th>
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
