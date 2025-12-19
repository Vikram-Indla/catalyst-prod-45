import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, AlertCircle, BarChart3, LayoutDashboard, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GlobalPageHeader } from '@/components/layout/GlobalPageHeader';
import { useIncidents } from '@/hooks/useIncidents';
import { CreateIncidentDialog } from '@/components/incidents/CreateIncidentDialog';
import { IncidentFiltersDialog } from '@/components/incidents/IncidentFiltersDialog';
import { IncidentListTable } from '@/components/incidents/IncidentListTable';
import type { IncidentFilters } from '@/types/incident';

const PAGE_SIZE = 40;

export default function IncidentRoomList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<IncidentFilters>({
    status: [],
    severity: [],
    support_level: [],
    delivery_stage: [],
  });
  const { data: incidents, isLoading, error, refetch } = useIncidents(filters);

  // Handle ?create=true query param
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setCreateDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Client-side search filter
  const filteredIncidents = useMemo(() => {
    if (!incidents) return [];
    if (!searchQuery.trim()) return incidents;
    
    const query = searchQuery.toLowerCase();
    return incidents.filter(incident =>
      incident.title.toLowerCase().includes(query) ||
      incident.incident_key.toLowerCase().includes(query)
    );
  }, [incidents, searchQuery]);

  // Paginate
  const paginatedIncidents = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredIncidents.slice(start, start + PAGE_SIZE);
  }, [filteredIncidents, page]);

  // Reset page when filters/search change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, filters]);

  // Summary counts from backend data
  const stats = useMemo(() => ({
    critical: incidents?.filter(i => i.severity === 'SEV1' && !['resolved', 'closed', 'converted'].includes(i.status)).length || 0,
    open: incidents?.filter(i => ['open', 'triage', 'in_progress'].includes(i.status)).length || 0,
    toCommittee: incidents?.filter(i => i.status === 'to_committee').length || 0,
  }), [incidents]);

  const activeFilterCount = [
    filters.status?.length || 0,
    filters.severity?.length || 0,
    filters.support_level?.length || 0,
    filters.delivery_stage?.length || 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col h-full bg-background">
      <GlobalPageHeader
        sectionLabel="RELEASE"
        pageTitle="Incident Room"
        rightActions={
          <div className="flex items-center gap-2">
            <Link to="/release/incidents/dashboard">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]">
                <LayoutDashboard className="h-3 w-3 mr-1" />
                Dashboard
              </Button>
            </Link>
            <Link to="/release/incident-command-center">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]">
                <BarChart3 className="h-3 w-3 mr-1" />
                Command
              </Button>
            </Link>
            <Button 
              size="sm"
              className="h-7 px-3 text-[11px]"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Create
            </Button>
          </div>
        }
      />

      {/* Search & Filter Bar */}
      <div className="px-4 py-2.5 border-b border-border bg-background">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Search key or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 h-7 text-[11px]"
            />
          </div>
          
          <div className="flex items-center gap-3">
            {/* Summary Counts - inline, subtle */}
            <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                <span className="font-medium text-foreground">{stats.critical}</span> critical
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                {stats.open} open
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                {stats.toCommittee} committee
              </span>
            </div>

            <div className="h-4 w-px bg-border" />

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => refetch()}
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
              <IncidentFiltersDialog filters={filters} onFiltersChange={setFilters} />
              {activeFilterCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setFilters({ status: [], severity: [], support_level: [], delivery_stage: [] })}
                  className="text-[10px] h-7 px-2"
                >
                  Clear ({activeFilterCount})
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-hidden">
        {error ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <AlertCircle className="h-6 w-6 text-destructive mb-2" />
            <p className="text-xs font-medium text-destructive mb-1">Failed to load incidents</p>
            <p className="text-[10px] text-muted-foreground mb-3">
              {error instanceof Error ? error.message : 'Unable to fetch data'}
            </p>
            <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => refetch()}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </div>
        ) : filteredIncidents.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <AlertCircle className="h-6 w-6 text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">
              {searchQuery ? `No incidents match "${searchQuery}"` : 'No incidents found'}
            </p>
            {!searchQuery && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3 h-7 text-[10px]"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Create First Incident
              </Button>
            )}
          </div>
        ) : (
          <IncidentListTable 
            incidents={paginatedIncidents} 
            isLoading={isLoading}
            page={page}
            pageSize={PAGE_SIZE}
            totalCount={filteredIncidents.length}
            onPageChange={setPage}
          />
        )}
      </div>

      <CreateIncidentDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen} 
      />
    </div>
  );
}
