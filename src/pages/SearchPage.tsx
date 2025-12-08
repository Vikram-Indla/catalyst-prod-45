import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Save, Star, ChevronDown, Loader2, ExternalLink, Trash2, StarOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';

type WorkItemType = 'all' | 'epic' | 'feature' | 'story';
type StatusFilter = 'all' | 'open' | 'in_progress' | 'done';

interface SearchResult {
  id: string;
  key: string;
  type: WorkItemType;
  summary: string;
  status: string;
  assignee?: string;
  updated_at?: string;
}

interface SavedFilter {
  id: string;
  name: string;
  query: string | null;
  type: string | null;
  status: string | null;
  is_starred: boolean | null;
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const initialQuery = searchParams.get('q') || '';
  const initialType = (searchParams.get('type') as WorkItemType) || 'all';
  const initialStatus = (searchParams.get('status') as StatusFilter) || 'all';
  
  const [query, setQuery] = useState(initialQuery);
  const [typeFilter, setTypeFilter] = useState<WorkItemType>(initialType);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus);
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [filterName, setFilterName] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set('q', debouncedQuery);
    if (typeFilter !== 'all') params.set('type', typeFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    setSearchParams(params, { replace: true });
  }, [debouncedQuery, typeFilter, statusFilter, setSearchParams]);

  const { data: results, isLoading } = useQuery({
    queryKey: ['search-results', debouncedQuery, typeFilter, statusFilter],
    queryFn: () => searchWorkItems(debouncedQuery, typeFilter, statusFilter),
  });

  const { data: savedFilters } = useQuery({
    queryKey: ['saved-filters', user?.id],
    queryFn: fetchSavedFilters,
    enabled: !!user?.id,
  });

  const saveFilterMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase.from('saved_filters').insert({
        user_id: user.id,
        name,
        query: query || null,
        type: typeFilter,
        status: statusFilter,
        is_starred: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-filters'] });
      toast.success('Filter saved');
      setSaveDialogOpen(false);
      setFilterName('');
    },
    onError: () => toast.error('Failed to save filter'),
  });

  const toggleStarMutation = useMutation({
    mutationFn: async ({ id, starred }: { id: string; starred: boolean }) => {
      const { error } = await supabase
        .from('saved_filters')
        .update({ is_starred: starred })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-filters'] }),
  });

  const deleteFilterMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('saved_filters').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-filters'] });
      toast.success('Filter deleted');
    },
  });

  async function searchWorkItems(
    searchQuery: string,
    type: WorkItemType,
    status: StatusFilter
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const searchPattern = searchQuery ? `%${searchQuery}%` : '%';

    if (type === 'all' || type === 'epic') {
      const { data: epics } = await supabase
        .from('epics')
        .select('id, epic_key, name, state, owner_name, updated_at')
        .or(`name.ilike.${searchPattern},epic_key.ilike.${searchPattern}`)
        .is('deleted_at', null)
        .limit(50);
      if (epics) {
        results.push(
          ...epics.map((e) => ({
            id: e.id,
            key: e.epic_key || `EPIC-${e.id.slice(0, 8)}`,
            type: 'epic' as WorkItemType,
            summary: e.name,
            status: e.state || 'unknown',
            assignee: e.owner_name || undefined,
            updated_at: e.updated_at || undefined,
          }))
        );
      }
    }

    if (type === 'all' || type === 'feature') {
      const { data: features } = await supabase
        .from('features')
        .select('id, display_id, name, status, updated_at')
        .or(`name.ilike.${searchPattern},display_id.ilike.${searchPattern}`)
        .limit(50);
      if (features) {
        results.push(
          ...features.map((f) => ({
            id: f.id,
            key: f.display_id || `FEAT-${f.id.slice(0, 8)}`,
            type: 'feature' as WorkItemType,
            summary: f.name,
            status: f.status || 'unknown',
            updated_at: f.updated_at || undefined,
          }))
        );
      }
    }

    if (type === 'all' || type === 'story') {
      const { data: stories } = await supabase
        .from('stories')
        .select('id, story_key, name, status, updated_at')
        .or(`name.ilike.${searchPattern},story_key.ilike.${searchPattern}`)
        .limit(50);
      if (stories) {
        results.push(
          ...stories.map((s) => ({
            id: s.id,
            key: s.story_key || `STORY-${s.id.slice(0, 8)}`,
            type: 'story' as WorkItemType,
            summary: s.name,
            status: s.status || 'unknown',
            updated_at: s.updated_at || undefined,
          }))
        );
      }
    }

    return results.sort((a, b) => {
      if (!a.updated_at) return 1;
      if (!b.updated_at) return -1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }

  async function fetchSavedFilters(): Promise<SavedFilter[]> {
    const { data, error } = await supabase
      .from('saved_filters')
      .select('id, name, query, type, status, is_starred')
      .order('is_starred', { ascending: false })
      .order('name');
    if (error) return [];
    return data || [];
  }

  function applyFilter(filter: SavedFilter) {
    setQuery(filter.query || '');
    setTypeFilter((filter.type as WorkItemType) || 'all');
    setStatusFilter((filter.status as StatusFilter) || 'all');
  }

  function handleRowClick(item: SearchResult) {
    navigate(`/browse/${item.key}`);
  }

  function getTypeBadgeColor(type: WorkItemType) {
    switch (type) {
      case 'epic': return 'bg-purple-100 text-purple-800';
      case 'feature': return 'bg-blue-100 text-blue-800';
      case 'story': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function getStatusBadgeColor(status: string) {
    const normalized = status?.toLowerCase() || '';
    if (['done', 'accepted', 'closed', 'complete'].includes(normalized)) {
      return 'bg-green-100 text-green-800';
    }
    if (['in_progress', 'implementing', 'in_development', 'review'].includes(normalized)) {
      return 'bg-yellow-100 text-yellow-800';
    }
    return 'bg-gray-100 text-gray-800';
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-xl font-semibold text-foreground">Issue Navigator</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Search and filter work items across all projects
        </p>
      </div>

      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by key or summary..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as WorkItemType)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="epic">Epic</SelectItem>
              <SelectItem value="feature">Feature</SelectItem>
              <SelectItem value="story">Story</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Star className="h-4 w-4 mr-2" />
                Saved Filters
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[250px]">
              {savedFilters && savedFilters.length > 0 ? (
                savedFilters.map((filter) => (
                  <div key={filter.id} className="flex items-center px-2 py-1.5 hover:bg-muted/50 rounded-sm">
                    <button
                      className="flex-1 text-left text-sm"
                      onClick={() => applyFilter(filter)}
                    >
                      {filter.name}
                    </button>
                    <button
                      className="p-1 hover:bg-muted rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStarMutation.mutate({ id: filter.id, starred: !filter.is_starred });
                      }}
                    >
                      {filter.is_starred ? (
                        <Star className="h-3 w-3 fill-brand-gold text-brand-gold" />
                      ) : (
                        <StarOff className="h-3 w-3 text-muted-foreground" />
                      )}
                    </button>
                    <button
                      className="p-1 hover:bg-destructive/10 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFilterMutation.mutate(filter.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </button>
                  </div>
                ))
              ) : (
                <DropdownMenuItem disabled>No saved filters</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSaveDialogOpen(true)}>
                <Save className="h-4 w-4 mr-2" />
                Save current filter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {(query || typeFilter !== 'all' || statusFilter !== 'all') && (
          <div className="flex items-center gap-2 mt-3">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {query && <Badge variant="secondary" className="text-xs">text: "{query}"</Badge>}
            {typeFilter !== 'all' && <Badge variant="secondary" className="text-xs">type: {typeFilter}</Badge>}
            {statusFilter !== 'all' && <Badge variant="secondary" className="text-xs">status: {statusFilter}</Badge>}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => { setQuery(''); setTypeFilter('all'); setStatusFilter('all'); }}
            >
              Clear all
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-brand-gold" />
            <span className="ml-2 text-muted-foreground">Searching...</span>
          </div>
        ) : results && results.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Key</TableHead>
                <TableHead className="w-[80px]">Type</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[150px]">Assignee</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((item) => (
                <TableRow
                  key={`${item.type}-${item.id}`}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(item)}
                >
                  <TableCell className="font-medium text-brand-gold">{item.key}</TableCell>
                  <TableCell>
                    <Badge className={cn('text-xs capitalize', getTypeBadgeColor(item.type))}>{item.type}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[400px] truncate">{item.summary}</TableCell>
                  <TableCell>
                    <Badge className={cn('text-xs capitalize', getStatusBadgeColor(item.status))}>
                      {item.status.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{item.assignee || '—'}</TableCell>
                  <TableCell><ExternalLink className="h-4 w-4 text-muted-foreground" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No results found</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              {query
                ? `No work items match "${query}". Try a different search term.`
                : 'Enter a search term or adjust filters to find work items.'}
            </p>
          </div>
        )}
      </div>

      {results && results.length > 0 && (
        <div className="border-t border-border px-6 py-3 bg-muted/30">
          <span className="text-sm text-muted-foreground">
            Showing {results.length} result{results.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Filter</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="filter-name">Filter Name</Label>
              <Input
                id="filter-name"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="My saved filter"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <p>This will save the current search:</p>
              <ul className="list-disc list-inside mt-1">
                {query && <li>Query: "{query}"</li>}
                {typeFilter !== 'all' && <li>Type: {typeFilter}</li>}
                {statusFilter !== 'all' && <li>Status: {statusFilter}</li>}
                {!query && typeFilter === 'all' && statusFilter === 'all' && <li>All items (no filters)</li>}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => saveFilterMutation.mutate(filterName)}
              disabled={!filterName.trim() || saveFilterMutation.isPending}
            >
              {saveFilterMutation.isPending ? 'Saving...' : 'Save Filter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
