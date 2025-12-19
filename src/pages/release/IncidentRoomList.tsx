import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, AlertCircle, Clock, Users, BarChart3, LayoutDashboard, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GlobalPageHeader } from '@/components/layout/GlobalPageHeader';
import { useIncidents } from '@/hooks/useIncidents';
import { CreateIncidentDialog } from '@/components/incidents/CreateIncidentDialog';
import { IncidentFiltersDialog } from '@/components/incidents/IncidentFiltersDialog';
import { IncidentListTable } from '@/components/incidents/IncidentListTable';
import type { IncidentFilters } from '@/types/incident';

export default function IncidentRoomList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [filters, setFilters] = useState<IncidentFilters>({
    status: [],
    severity: [],
    support_level: [],
    delivery_stage: [],
  });
  const { data: incidents, isLoading, error } = useIncidents(filters);

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
    <div className="flex flex-col h-full">
      <GlobalPageHeader
        sectionLabel="RELEASE"
        pageTitle="Incident Room"
        rightActions={
          <div className="flex items-center gap-2">
            <Link to="/release/incidents/dashboard">
              <Button variant="outline" size="sm">
                <LayoutDashboard className="h-4 w-4 mr-1.5" />
                Dashboard
              </Button>
            </Link>
            <Link to="/release/incident-command-center">
              <Button variant="outline" size="sm">
                <BarChart3 className="h-4 w-4 mr-1.5" />
                Command Center
              </Button>
            </Link>
            <Button 
              size="sm"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Create Incident
            </Button>
          </div>
        }
      />

      {/* Search & Filter Bar */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-border">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by key or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <IncidentFiltersDialog filters={filters} onFiltersChange={setFilters} />
          {activeFilterCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setFilters({ status: [], severity: [], support_level: [], delivery_stage: [] })}
              className="text-xs h-7 px-2"
            >
              Clear filters ({activeFilterCount})
            </Button>
          )}
        </div>
      </div>

      {/* Summary Counts Row */}
      <div className="flex items-center gap-6 px-4 py-2.5 border-b border-border bg-muted/20">
        <div className="flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
          <span className="text-xs font-medium">{stats.critical} Critical</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-blue-500" />
          <span className="text-xs text-muted-foreground">{stats.open} Open</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-purple-500" />
          <span className="text-xs text-muted-foreground">{stats.toCommittee} Awaiting Committee</span>
        </div>
        <div className="ml-auto text-xs text-muted-foreground">
          {filteredIncidents.length} incident{filteredIncidents.length !== 1 ? 's' : ''}
          {searchQuery && ` matching "${searchQuery}"`}
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto">
        {error ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mb-2" />
            <p className="text-sm font-medium text-destructive mb-1">Failed to load incidents</p>
            <p className="text-xs text-muted-foreground">
              {error instanceof Error ? error.message : 'Unable to fetch data from the server'}
            </p>
          </div>
        ) : filteredIncidents.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? `No incidents match "${searchQuery}"` : 'No incidents found'}
            </p>
            {!searchQuery && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Create First Incident
              </Button>
            )}
          </div>
        ) : (
          <IncidentListTable incidents={filteredIncidents} isLoading={isLoading} />
        )}
      </div>

      <CreateIncidentDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen} 
      />
    </div>
  );
}
