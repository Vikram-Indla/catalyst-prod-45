import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Search, AlertCircle, RefreshCw, ArrowUpDown, Columns3, LayoutGrid, LayoutList, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GlobalPageHeader } from '@/components/layout/GlobalPageHeader';
import { useIncidents, useCreateIncident } from '@/hooks/useIncidents';
import { useIncidentColumns, TableDensity } from '@/hooks/useIncidentColumns';
import { CreateIncidentModal, IncidentFormData } from '@/components/incidents/CreateIncidentModal';
import { IncidentCommandBar } from '@/components/incidents/IncidentCommandBar';
import { IncidentFiltersDialog } from '@/components/incidents/IncidentFiltersDialog';
import { IncidentListTable } from '@/components/incidents/IncidentListTable';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { IncidentFilters } from '@/types/incident';

const PAGE_SIZE = 40;

type SortField = 'created_at' | 'severity' | 'priority' | 'status';
type SortOrder = 'asc' | 'desc';

const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: 'created_at', label: 'Created (newest)' },
  { field: 'severity', label: 'Severity' },
  { field: 'priority', label: 'Priority' },
  { field: 'status', label: 'Status' },
];

export default function IncidentRoomList() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filters, setFilters] = useState<IncidentFilters>({
    status: [],
    severity: [],
    support_level: [],
    delivery_stage: [],
  });
  
  const { columns, visibleColumns, toggleColumn, resetColumns, density, setDensity } = useIncidentColumns();
  const { data: incidents, isLoading, error, refetch } = useIncidents(filters);
  const createIncident = useCreateIncident();

  // Handle incident creation from modal
  const handleCreateIncident = async (formData: IncidentFormData) => {
    try {
      const result = await createIncident.mutateAsync({
        title: formData.title,
        description: formData.description,
        severity: formData.severity,
        impact: formData.impact,
        urgency: formData.urgency,
        support_level: formData.support_level,
        project_id: formData.project_id,
        release_version_id: formData.release_version_id,
        is_major_incident: formData.is_major_incident,
        incident_type: formData.incident_type,
        reporter_id: formData.reporterId,
        reporter_name: formData.reporterName,
        assignee_id: formData.assigneeId,
        target_date: formData.target_resolution_date,
      });
      
      toast.success('Incident created successfully');
      setCreateDialogOpen(false);
      
      // Navigate to detail page
      if (result?.id) {
        navigate(`/release/incidents/${result.id}?created=true`);
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create incident');
    }
  };

  // Handle ?create=true query param
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setCreateDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);


  // Client-side search + sort
  const processedIncidents = useMemo(() => {
    if (!incidents) return [];
    
    let result = [...incidents];
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(incident =>
        incident.title.toLowerCase().includes(query) ||
        incident.incident_key.toLowerCase().includes(query)
      );
    }
    
    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'severity':
          const sevOrder = { SEV1: 1, SEV2: 2, SEV3: 3, SEV4: 4 };
          comparison = (sevOrder[a.severity as keyof typeof sevOrder] || 5) - (sevOrder[b.severity as keyof typeof sevOrder] || 5);
          break;
        case 'priority':
          const priOrder = { P1: 1, P2: 2, P3: 3, P4: 4 };
          comparison = (priOrder[a.priority as keyof typeof priOrder] || 5) - (priOrder[b.priority as keyof typeof priOrder] || 5);
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });
    
    return result;
  }, [incidents, searchQuery, sortField, sortOrder]);

  // Paginate
  const paginatedIncidents = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return processedIncidents.slice(start, start + PAGE_SIZE);
  }, [processedIncidents, page]);

  // Reset page when filters/search change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, filters, sortField, sortOrder]);

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
        pageTitle="Incident List"
        showDivider={false}
      />

      {/* Standardized Command Bar */}
      <IncidentCommandBar onCreateClick={() => setCreateDialogOpen(true)} />

      {/* ========== TOOLBAR ========== */}
      <TooltipProvider delayDuration={300}>
        <div className="px-4 py-3 border-b border-border bg-muted/20">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search incidents by key or summary..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            
            {/* Right: Controls */}
            <div className="flex items-center gap-2">
              {/* Summary Counts - Subtle chips */}
              <div className="hidden lg:flex items-center gap-3 text-xs text-muted-foreground mr-3">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  <span className="font-medium text-foreground">{stats.critical}</span> critical
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-sky-500" />
                  {stats.open} open
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  {stats.toCommittee} committee
                </span>
              </div>

              <div className="h-5 w-px bg-border hidden lg:block" />

              {/* Filters */}
              <IncidentFiltersDialog filters={filters} onFiltersChange={setFilters} />
              {activeFilterCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setFilters({ status: [], severity: [], support_level: [], delivery_stage: [] })}
                  className="text-xs h-8 px-2"
                >
                  Clear ({activeFilterCount})
                </Button>
              )}

              {/* Sort */}
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <ArrowUpDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">Sort</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Sort by</DropdownMenuLabel>
                  {SORT_OPTIONS.map(opt => (
                    <DropdownMenuItem 
                      key={opt.field}
                      className="text-sm"
                      onClick={() => {
                        if (sortField === opt.field) {
                          setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField(opt.field);
                          setSortOrder('desc');
                        }
                      }}
                    >
                      {opt.label}
                      {sortField === opt.field && (
                        <span className="ml-auto text-xs text-muted-foreground">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Columns */}
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Columns3 className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">Columns</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Show columns</DropdownMenuLabel>
                  {columns.map(col => (
                    <DropdownMenuCheckboxItem 
                      key={col.id}
                      className="text-sm"
                      checked={col.visible}
                      disabled={col.required}
                      onCheckedChange={() => toggleColumn(col.id)}
                    >
                      {col.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-xs text-muted-foreground" onClick={resetColumns}>
                    Reset to default
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Density */}
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        {density === 'compact' ? <LayoutList className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">Density</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem 
                    className="text-sm"
                    onClick={() => setDensity('comfortable')}
                  >
                    <LayoutGrid className="h-4 w-4 mr-2" />
                    Comfortable
                    {density === 'comfortable' && <span className="ml-auto">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-sm"
                    onClick={() => setDensity('compact')}
                  >
                    <LayoutList className="h-4 w-4 mr-2" />
                    Compact
                    {density === 'compact' && <span className="ml-auto">✓</span>}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Refresh */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => refetch()}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Refresh</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </TooltipProvider>

      {/* ========== TABLE CONTENT - clear gutter from sidebar for visual separation ========== */}
      <div className="flex-1 overflow-hidden px-6 py-4">
        {error ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mb-3" />
            <p className="text-sm font-medium text-destructive mb-1">Failed to load incidents</p>
            <p className="text-xs text-muted-foreground mb-4">
              {error instanceof Error ? error.message : 'Unable to fetch data'}
            </p>
            <Button variant="outline" size="sm" className="h-8 text-sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Retry
            </Button>
          </div>
        ) : processedIncidents.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? `No incidents match "${searchQuery}"` : 'No incidents found'}
            </p>
            {!searchQuery && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4 h-8 text-sm"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1.5" />
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
            totalCount={processedIncidents.length}
            onPageChange={setPage}
            visibleColumns={visibleColumns}
            density={density}
          />
        )}
      </div>

      <CreateIncidentModal 
        isOpen={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)}
        onSubmit={handleCreateIncident}
      />
    </div>
  );
}
