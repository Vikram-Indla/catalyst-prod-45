import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, Filter, Download, Loader2, Plus, ArrowUpDown, ArrowUp, ArrowDown, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useIncidents } from '@/hooks/useIncidents';
import type { IncidentFilters, IncidentStatus, SupportLevel, Incident } from '@/types/incident';
import { IncidentsFiltersDialog } from '@/components/release/IncidentsFiltersDialog';
import { 
  StatusBadge, 
  SeverityBadge, 
  PriorityBadge, 
  SupportLevelBadge,
  getAgingTime 
} from '@/components/incidents/badges/IncidentBadges';

type SortField = 'incident_key' | 'severity' | 'created_at';
type SortDirection = 'asc' | 'desc';

type QuickFilter = 'open' | 'major' | 'l3';

export default function IncidentsListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filtersDialogOpen, setFiltersDialogOpen] = useState(false);
  const [activeQuickFilter, setActiveQuickFilter] = useState<QuickFilter | null>('open');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Parse filters from URL params (supports drill-down from dashboard)
  const urlFilters = useMemo(() => {
    return {
      status: searchParams.get('status'),
      support_level: searchParams.get('support_level'),
      major: searchParams.get('major') === 'true',
      created_today: searchParams.get('created_today') === 'true',
      sla_response_breach: searchParams.get('sla_response_breach') === 'true',
      sla_resolution_breach: searchParams.get('sla_resolution_breach') === 'true',
      workgroup: searchParams.get('workgroup'),
      aging: searchParams.get('aging'),
      delivery_stage: searchParams.get('delivery_stage'),
      converted_to: searchParams.get('converted_to'),
    };
  }, [searchParams]);

  const initialFilters = useMemo((): IncidentFilters => {
    return {
      status: urlFilters.status ? urlFilters.status.split(',') as IncidentStatus[] : undefined,
      support_level: urlFilters.support_level ? urlFilters.support_level.split(',') as SupportLevel[] : undefined,
      delivery_stage: urlFilters.delivery_stage ? [urlFilters.delivery_stage as any] : undefined,
    };
  }, [urlFilters]);

  const [filters, setFilters] = useState<IncidentFilters>(initialFilters);
  const pageSize = 25;

  // Apply quick filters
  const effectiveFilters = useMemo((): IncidentFilters => {
    const baseFilters = { ...filters };
    
    if (activeQuickFilter === 'open') {
      baseFilters.status = ['open', 'triage', 'to_committee', 'in_progress'];
    } else if (activeQuickFilter === 'l3') {
      baseFilters.support_level = ['L3'];
    }
    // major incidents filter is applied client-side
    
    return baseFilters;
  }, [filters, activeQuickFilter]);

  // Fetch incidents from Supabase
  const { data: incidents = [], isLoading, error } = useIncidents(effectiveFilters);

  // Client-side search and advanced filters from URL
  const filteredIncidents = useMemo(() => {
    let result = incidents;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Apply major incident filter (from URL or quick filter)
    if (activeQuickFilter === 'major' || urlFilters.major) {
      result = result.filter((inc: Incident) => inc.is_major_incident);
    }
    
    // Apply created_today filter
    if (urlFilters.created_today) {
      result = result.filter((inc: Incident) => new Date(inc.created_at) >= today);
    }
    
    // Apply SLA breach filters
    if (urlFilters.sla_response_breach) {
      result = result.filter((inc: Incident) => inc.sla?.response_breached);
    }
    if (urlFilters.sla_resolution_breach) {
      result = result.filter((inc: Incident) => inc.sla?.resolution_breached);
    }
    
    // Apply workgroup filter
    if (urlFilters.workgroup) {
      result = result.filter((inc: Incident) => inc.assignee_workgroup?.name === urlFilters.workgroup);
    }
    
    // Apply aging filter
    if (urlFilters.aging) {
      const getAgingDays = (createdAt: string) => 
        Math.floor((now.getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
      
      result = result.filter((inc: Incident) => {
        const days = getAgingDays(inc.created_at);
        switch (urlFilters.aging) {
          case '< 24h': return days < 1;
          case '1-3 days': return days >= 1 && days < 3;
          case '3-7 days': return days >= 3 && days < 7;
          case '> 7 days': return days >= 7;
          default: return true;
        }
      });
    }
    
    // Apply converted_to filter
    if (urlFilters.converted_to) {
      result = result.filter((inc: Incident) => inc.converted_to_type === urlFilters.converted_to);
    }
    
    // Apply search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((inc: Incident) => 
        inc.incident_key?.toLowerCase().includes(q) ||
        inc.title?.toLowerCase().includes(q)
      );
    }
    
    return result;
  }, [incidents, searchQuery, activeQuickFilter, urlFilters]);

  // Sort incidents
  const sortedIncidents = useMemo(() => {
    return [...filteredIncidents].sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'incident_key') {
        comparison = (a.incident_key || '').localeCompare(b.incident_key || '');
      } else if (sortField === 'severity') {
        const severityOrder: Record<string, number> = { SEV1: 1, SEV2: 2, SEV3: 3, SEV4: 4 };
        comparison = (severityOrder[a.severity] || 5) - (severityOrder[b.severity] || 5);
      } else if (sortField === 'created_at') {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredIncidents, sortField, sortDirection]);

  // (getAgingTime imported from shared badges)

  // Calculate active filter count (excluding quick filters)
  const activeFilterCount = Object.entries(filters).filter(([, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== '' && value !== null;
  }).length;

  const totalPages = Math.ceil(sortedIncidents.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedIncidents = sortedIncidents.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const handleRowClick = (incident: Incident) => {
    navigate(`/release/incident-room/${incident.id}`);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 text-muted-foreground/50" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3 ml-1 text-foreground" />
      : <ArrowDown className="h-3 w-3 ml-1 text-foreground" />;
  };

  const handleQuickFilter = (filter: QuickFilter) => {
    if (activeQuickFilter === filter) {
      setActiveQuickFilter(null);
    } else {
      setActiveQuickFilter(filter);
    }
    setCurrentPage(1);
  };

  // Build active URL filter labels for display
  const activeUrlFilters = useMemo(() => {
    const labels: { key: string; label: string }[] = [];
    if (urlFilters.major) labels.push({ key: 'major', label: 'Major Incidents' });
    if (urlFilters.created_today) labels.push({ key: 'created_today', label: 'Created Today' });
    if (urlFilters.sla_response_breach) labels.push({ key: 'sla_response_breach', label: 'Response SLA Breached' });
    if (urlFilters.sla_resolution_breach) labels.push({ key: 'sla_resolution_breach', label: 'Resolution SLA Breached' });
    if (urlFilters.workgroup) labels.push({ key: 'workgroup', label: `Workgroup: ${urlFilters.workgroup}` });
    if (urlFilters.aging) labels.push({ key: 'aging', label: `Age: ${urlFilters.aging}` });
    if (urlFilters.delivery_stage) labels.push({ key: 'delivery_stage', label: `Stage: ${urlFilters.delivery_stage}` });
    if (urlFilters.converted_to) labels.push({ key: 'converted_to', label: `Converted to: ${urlFilters.converted_to}` });
    if (urlFilters.status) labels.push({ key: 'status', label: `Status: ${urlFilters.status}` });
    if (urlFilters.support_level) labels.push({ key: 'support_level', label: `Level: ${urlFilters.support_level}` });
    return labels;
  }, [urlFilters]);

  const clearUrlFilters = () => {
    navigate('/release/incidents');
  };

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive text-lg font-medium">Failed to load incidents</p>
          <p className="text-muted-foreground text-sm mt-1">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Compact Header */}
      <div className="h-12 border-b border-border bg-card flex-shrink-0 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-foreground">Incidents</h1>
          
          {/* Quick Filters */}
          <div className="flex items-center gap-1 ml-4">
            <Button
              variant={activeQuickFilter === 'open' ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                "h-7 text-xs px-2",
                activeQuickFilter === 'open' && "bg-brand-primary text-white"
              )}
              onClick={() => handleQuickFilter('open')}
            >
              Open
            </Button>
            <Button
              variant={activeQuickFilter === 'major' ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                "h-7 text-xs px-2",
                activeQuickFilter === 'major' && "bg-red-600 text-white"
              )}
              onClick={() => handleQuickFilter('major')}
            >
              Major Incidents
            </Button>
            <Button
              variant={activeQuickFilter === 'l3' ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                "h-7 text-xs px-2",
                activeQuickFilter === 'l3' && "bg-purple-600 text-white"
              )}
              onClick={() => handleQuickFilter('l3')}
            >
              L3 Only
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search incidents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm bg-white border-border"
            />
          </div>

          {/* Filters */}
          <Button 
            variant="outline" 
            size="sm" 
            className={cn("h-8 text-xs", activeFilterCount > 0 && "border-brand-primary text-brand-primary")}
            onClick={() => setFiltersDialogOpen(true)}
          >
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 bg-brand-primary text-white rounded-full text-[10px]">
                {activeFilterCount}
              </Badge>
            )}
          </Button>

          {/* Export */}
          <Button variant="outline" size="sm" className="h-8 text-xs">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export
          </Button>

          {/* Create */}
          <Link to="/release/incidents/create">
            <Button size="sm" className="h-8 text-xs bg-brand-primary text-white hover:bg-brand-primary-hover">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Create Incident
            </Button>
          </Link>

          {/* Pagination */}
          <div className="flex items-center gap-1 border border-border rounded bg-white px-1 h-8">
            <Button variant="ghost" size="sm" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="h-6 w-6 p-0">
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-foreground px-2 whitespace-nowrap">
              {sortedIncidents.length > 0 ? `${startIndex + 1}-${Math.min(endIndex, sortedIncidents.length)} of ${sortedIncidents.length}` : '0'}
            </span>
            <Button variant="ghost" size="sm" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0} className="h-6 w-6 p-0">
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Active URL Filters Bar */}
      {activeUrlFilters.length > 0 && (
        <div className="h-9 border-b border-border bg-muted/30 flex-shrink-0 px-4 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Filters:</span>
          {activeUrlFilters.map((f) => (
            <Badge 
              key={f.key} 
              variant="secondary" 
              className="h-6 text-xs bg-brand-primary/10 text-brand-primary border border-brand-primary/20"
            >
              {f.label}
            </Badge>
          ))}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs text-muted-foreground hover:text-destructive ml-auto"
            onClick={clearUrlFilters}
          >
            <X className="h-3 w-3 mr-1" />
            Clear all
          </Button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10 bg-muted/80">
              <tr>
                <th 
                  className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wide w-28 cursor-pointer select-none hover:bg-muted"
                  onClick={() => handleSort('incident_key')}
                >
                  <div className="flex items-center">
                    Key
                    {getSortIcon('incident_key')}
                  </div>
                </th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wide">Summary</th>
                <th 
                  className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wide w-16 cursor-pointer select-none hover:bg-muted"
                  onClick={() => handleSort('severity')}
                >
                  <div className="flex items-center">
                    Severity
                    {getSortIcon('severity')}
                  </div>
                </th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wide w-16">Priority</th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wide w-24">Status</th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wide w-16">Level</th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wide w-28">Workgroup</th>
                <th 
                  className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wide w-16 cursor-pointer select-none hover:bg-muted"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center">
                    Age
                    {getSortIcon('created_at')}
                  </div>
                </th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wide w-32">Assignee</th>
              </tr>
            </thead>
            <tbody>
              {paginatedIncidents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-12 text-center text-muted-foreground">
                    No incidents found
                  </td>
                </tr>
              ) : paginatedIncidents.map((incident: Incident) => (
                <tr 
                  key={incident.id} 
                  className="hover:bg-muted/30 cursor-pointer border-b border-border/50"
                  onClick={() => handleRowClick(incident)}
                >
                  <td className="px-3 py-2">
                    <span className="font-mono text-xs font-medium text-brand-primary">
                      {incident.incident_key || '-'}
                    </span>
                    {incident.is_major_incident && (
                      <Badge variant="destructive" className="ml-1.5 text-[9px] px-1 py-0">M</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-foreground line-clamp-1">{incident.title}</span>
                  </td>
                  <td className="px-3 py-2">
                    <SeverityBadge severity={incident.severity} />
                  </td>
                  <td className="px-3 py-2">
                    <PriorityBadge priority={incident.priority} />
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={incident.status} />
                  </td>
                  <td className="px-3 py-2">
                    <SupportLevelBadge level={incident.support_level} />
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-foreground truncate block max-w-[100px]">
                      {incident.assignee_workgroup?.name || '-'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-muted-foreground font-mono">
                      {getAgingTime(incident.created_at)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-foreground truncate block max-w-[120px]">
                      {incident.assignee?.full_name || '-'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Filters Dialog */}
      <IncidentsFiltersDialog
        open={filtersDialogOpen}
        onOpenChange={setFiltersDialogOpen}
        filters={filters}
        onFiltersChange={(newFilters) => {
          setFilters(newFilters);
          setActiveQuickFilter(null);
        }}
      />
    </div>
  );
}
