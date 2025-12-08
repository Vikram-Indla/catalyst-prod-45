import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, Save, Star, ChevronDown, Loader2, ExternalLink } from 'lucide-react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type WorkItemType = 'all' | 'epic' | 'feature' | 'story';
type StatusFilter = 'all' | 'open' | 'in_progress' | 'done';

interface SearchResult {
  id: string;
  key: string;
  type: WorkItemType;
  summary: string;
  status: string;
  assignee?: string;
  priority?: string;
  updated_at?: string;
}

interface SavedFilter {
  id: string;
  name: string;
  query: string;
  type: WorkItemType;
  status: StatusFilter;
  is_starred: boolean;
}

/**
 * SearchPage - Global Issue Navigator
 * Route: /search
 * 
 * Provides JQL-like search across all work items with saved filters
 */
export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Parse URL params
  const initialQuery = searchParams.get('q') || '';
  const initialType = (searchParams.get('type') as WorkItemType) || 'all';
  const initialStatus = (searchParams.get('status') as StatusFilter) || 'all';
  
  const [query, setQuery] = useState(initialQuery);
  const [typeFilter, setTypeFilter] = useState<WorkItemType>(initialType);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus);
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set('q', debouncedQuery);
    if (typeFilter !== 'all') params.set('type', typeFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    setSearchParams(params, { replace: true });
  }, [debouncedQuery, typeFilter, statusFilter, setSearchParams]);

  // Fetch search results
  const { data: results, isLoading } = useQuery({
    queryKey: ['search-results', debouncedQuery, typeFilter, statusFilter],
    queryFn: () => searchWorkItems(debouncedQuery, typeFilter, statusFilter),
    enabled: true,
  });

  // Fetch saved filters
  const { data: savedFilters } = useQuery({
    queryKey: ['saved-filters'],
    queryFn: fetchSavedFilters,
  });

  async function searchWorkItems(
    searchQuery: string,
    type: WorkItemType,
    status: StatusFilter
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const searchPattern = searchQuery ? `%${searchQuery}%` : '%';

    // Build status filter
    const statusMap: Record<StatusFilter, string[]> = {
      all: [],
      open: ['funnel', 'backlog', 'new', 'todo', 'open'],
      in_progress: ['in_progress', 'implementing', 'in_development', 'review'],
      done: ['done', 'accepted', 'closed', 'complete'],
    };

    // Search epics
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

    // Search features
    if (type === 'all' || type === 'feature') {
      const { data: features } = await supabase
        .from('features')
        .select('id, display_id, name, status, owner_id, updated_at')
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

    // Search stories
    if (type === 'all' || type === 'story') {
      const { data: stories } = await supabase
        .from('stories')
        .select('id, story_key, name, status, assignee_id, updated_at')
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

    // Sort by updated_at descending
    return results.sort((a, b) => {
      if (!a.updated_at) return 1;
      if (!b.updated_at) return -1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }

  async function fetchSavedFilters(): Promise<SavedFilter[]> {
    // TODO: Implement saved filters table
    // For now, return empty array
    return [];
  }

  function handleRowClick(item: SearchResult) {
    navigate(`/browse/${item.key}`);
  }

  function getTypeBadgeColor(type: WorkItemType) {
    switch (type) {
      case 'epic':
        return 'bg-purple-100 text-purple-800';
      case 'feature':
        return 'bg-blue-100 text-blue-800';
      case 'story':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-xl font-semibold text-foreground">Issue Navigator</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Search and filter work items across all projects
        </p>
      </div>

      {/* Search & Filters */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by key or summary..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Type Filter */}
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

          {/* Status Filter */}
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

          {/* Saved Filters Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Star className="h-4 w-4 mr-2" />
                Saved Filters
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              {savedFilters && savedFilters.length > 0 ? (
                savedFilters.map((filter) => (
                  <DropdownMenuItem
                    key={filter.id}
                    onClick={() => {
                      setQuery(filter.query);
                      setTypeFilter(filter.type);
                      setStatusFilter(filter.status);
                    }}
                  >
                    {filter.is_starred && <Star className="h-3 w-3 mr-2 fill-brand-gold text-brand-gold" />}
                    {filter.name}
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled>No saved filters</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <Save className="h-4 w-4 mr-2" />
                Save current filter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Active filters summary */}
        {(query || typeFilter !== 'all' || statusFilter !== 'all') && (
          <div className="flex items-center gap-2 mt-3">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {query && (
              <Badge variant="secondary" className="text-xs">
                text: "{query}"
              </Badge>
            )}
            {typeFilter !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                type: {typeFilter}
              </Badge>
            )}
            {statusFilter !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                status: {statusFilter}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => {
                setQuery('');
                setTypeFilter('all');
                setStatusFilter('all');
              }}
            >
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Results */}
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
                  <TableCell className="font-medium text-brand-gold">
                    {item.key}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn('text-xs capitalize', getTypeBadgeColor(item.type))}>
                      {item.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[400px] truncate">
                    {item.summary}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn('text-xs capitalize', getStatusBadgeColor(item.status))}>
                      {item.status.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.assignee || '—'}
                  </TableCell>
                  <TableCell>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
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
                ? `No work items match "${query}". Try a different search term or adjust your filters.`
                : 'Enter a search term or adjust filters to find work items.'}
            </p>
          </div>
        )}
      </div>

      {/* Footer with result count */}
      {results && results.length > 0 && (
        <div className="border-t border-border px-6 py-3 bg-muted/30">
          <span className="text-sm text-muted-foreground">
            Showing {results.length} result{results.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
