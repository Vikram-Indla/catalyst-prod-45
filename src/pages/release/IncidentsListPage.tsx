import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, Filter, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useIncidents } from '@/hooks/useIncidents';
import type { IncidentFilters, IncidentStatus, SupportLevel, Incident } from '@/types/incident';
import { IncidentsFiltersDialog } from '@/components/release/IncidentsFiltersDialog';

// Severity badge component
const SeverityBadge = ({ severity }: { severity: string }) => {
  const colors: Record<string, string> = {
    SEV1: 'bg-red-100 text-red-800 border-red-200',
    SEV2: 'bg-orange-100 text-orange-800 border-orange-200',
    SEV3: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    SEV4: 'bg-blue-100 text-blue-800 border-blue-200',
  };
  return (
    <Badge variant="outline" className={cn('text-[10px] font-medium px-1.5 py-0', colors[severity] || 'bg-gray-100')}>
      {severity}
    </Badge>
  );
};

// Support Level badge
const SupportLevelBadge = ({ level }: { level: string | null | undefined }) => {
  if (!level) return <span className="text-muted-foreground text-xs">-</span>;
  const colors: Record<string, string> = {
    L1: 'bg-green-100 text-green-800',
    L2: 'bg-blue-100 text-blue-800',
    L3: 'bg-purple-100 text-purple-800',
  };
  return (
    <Badge variant="outline" className={cn('text-[10px] font-medium px-1.5 py-0', colors[level] || 'bg-gray-100')}>
      {level}
    </Badge>
  );
};

// Status badge
const StatusBadge = ({ status }: { status: IncidentStatus }) => {
  const config: Record<IncidentStatus, { label: string; className: string }> = {
    open: { label: 'Open', className: 'bg-blue-100 text-blue-800' },
    triage: { label: 'Triage', className: 'bg-yellow-100 text-yellow-800' },
    to_committee: { label: 'To Committee', className: 'bg-purple-100 text-purple-800' },
    in_progress: { label: 'In Progress', className: 'bg-orange-100 text-orange-800' },
    resolved: { label: 'Resolved', className: 'bg-green-100 text-green-800' },
    converted: { label: 'Converted', className: 'bg-teal-100 text-teal-800' },
    closed: { label: 'Closed', className: 'bg-gray-100 text-gray-800' },
  };
  const { label, className } = config[status] || { label: status, className: 'bg-gray-100' };
  return (
    <Badge variant="outline" className={cn('text-[10px] font-medium px-1.5 py-0', className)}>
      {label}
    </Badge>
  );
};

export default function IncidentsListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filtersDialogOpen, setFiltersDialogOpen] = useState(false);
  
  // Parse filters from URL params
  const initialFilters = useMemo((): IncidentFilters => {
    const statusParam = searchParams.get('status');
    const supportLevelParam = searchParams.get('support_level');
    return {
      status: statusParam ? statusParam.split(',') as IncidentStatus[] : ['open', 'triage', 'to_committee', 'in_progress'],
      support_level: supportLevelParam ? supportLevelParam.split(',') as SupportLevel[] : undefined,
    };
  }, [searchParams]);

  const [filters, setFilters] = useState<IncidentFilters>(initialFilters);
  const pageSize = 25;

  // Fetch incidents from Supabase
  const { data: incidents = [], isLoading, error } = useIncidents(filters);

  // Client-side search filter
  const filteredIncidents = useMemo(() => {
    if (!searchQuery) return incidents;
    const q = searchQuery.toLowerCase();
    return incidents.filter((inc: Incident) => 
      inc.incident_key?.toLowerCase().includes(q) ||
      inc.title?.toLowerCase().includes(q)
    );
  }, [incidents, searchQuery]);

  // Calculate aging (days since created)
  const getAgingDays = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (days === 0) return '<1d';
    if (days < 7) return `${days}d`;
    if (days < 30) return `${Math.floor(days / 7)}w`;
    return `${Math.floor(days / 30)}mo`;
  };

  // Calculate active filter count
  const activeFilterCount = Object.entries(filters).filter(([, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== '' && value !== null;
  }).length;

  const totalPages = Math.ceil(filteredIncidents.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedIncidents = filteredIncidents.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const handleRowClick = (incident: Incident) => {
    navigate(`/release/incidents/${incident.id}`);
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
        <h1 className="text-base font-semibold text-foreground">Incidents</h1>
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

          {/* Pagination */}
          <div className="flex items-center gap-1 border border-border rounded bg-white px-1 h-8">
            <Button variant="ghost" size="sm" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="h-6 w-6 p-0">
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-foreground px-2 whitespace-nowrap">
              {filteredIncidents.length > 0 ? `${startIndex + 1}-${Math.min(endIndex, filteredIncidents.length)} of ${filteredIncidents.length}` : '0'}
            </span>
            <Button variant="ghost" size="sm" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0} className="h-6 w-6 p-0">
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

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
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wide w-28">Key</th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wide">Summary</th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wide w-16">Severity</th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wide w-16">Level</th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wide w-24">Status</th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wide w-12">Age</th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wide w-32">Workgroup</th>
              </tr>
            </thead>
            <tbody>
              {paginatedIncidents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-12 text-center text-muted-foreground">
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
                    <span className="text-foreground line-clamp-2">{incident.title}</span>
                  </td>
                  <td className="px-3 py-2">
                    <SeverityBadge severity={incident.severity} />
                  </td>
                  <td className="px-3 py-2">
                    <SupportLevelBadge level={incident.support_level} />
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={incident.status} />
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-muted-foreground font-mono">
                      {getAgingDays(incident.created_at)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-foreground truncate block max-w-[120px]">
                      {incident.assignee_workgroup?.name || '-'}
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
        onFiltersChange={setFilters}
      />
    </div>
  );
}
