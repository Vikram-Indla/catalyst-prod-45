import { useState, useMemo, lazy, Suspense } from 'react';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import { Search, ChevronLeft, ChevronRight, Filter, Download, List, LayoutGrid, Maximize2, Minimize2, Loader2 } from 'lucide-react';
import { StatusBadge } from '@/components/release/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lozenge } from '@/components/ads';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useIncidents } from '@/hooks/useIncidents';
import type { IncidentFilters } from '@/types/incident';
import { IncidentsFiltersDialog } from '@/components/release/IncidentsFiltersDialog';

// Lazy load the detail router
const CatalystDetailRouter = lazy(() => import('@/components/catalyst-detail-views/CatalystDetailRouter'));

type ViewMode = 'list' | 'kanban';

// Status columns for Kanban - aligned with database enum values
const KANBAN_COLUMNS = [
  { id: 'open', label: 'Open', color: 'bg-blue-500' },
  { id: 'triage', label: 'Triage', color: 'bg-yellow-500' },
  { id: 'to_committee', label: 'To Committee', color: 'bg-amber-500' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-orange-500' },
  { id: 'resolved', label: 'Resolved', color: 'bg-green-500' },
  { id: 'converted', label: 'Converted', color: 'bg-blue-600' },
  { id: 'closed', label: 'Closed', color: 'bg-gray-500' },
];

// Severity badge component
const SeverityBadge = ({ severity }: { severity: string }) => {
  const appearances: Record<string, 'removed' | 'moved' | 'default'> = {
    SEV1: 'removed',
    SEV2: 'moved',
    SEV3: 'default',
    SEV4: 'default',
  };
  return (
    <Lozenge appearance={appearances[severity] || 'default'}>
      {severity}
    </Lozenge>
  );
};

// Support Level badge
const SupportLevelBadge = ({ level }: { level: string | null | undefined }) => {
  if (!level) return <span className="text-muted-foreground text-sm">-</span>;
  return (
    <Lozenge appearance="default">
      {level}
    </Lozenge>
  );
};

export default function IncidentsList() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filtersDialogOpen, setFiltersDialogOpen] = useState(false);
  const [filters, setFilters] = useState<IncidentFilters>({
    status: ['open', 'triage', 'to_committee', 'in_progress'], // Default: Open incidents only
  });
  const [kanbanExpanded, setKanbanExpanded] = useState<boolean | undefined>(undefined);
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(
    new Set(['converted', 'closed'])
  );
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const pageSize = 20;

  // Fetch incidents from Supabase
  const { data: incidents = [], isLoading, error } = useIncidents(filters as any);

  // Client-side search filter
  const filteredIncidents = useMemo(() => {
    if (!searchQuery) return incidents;
    const q = searchQuery.toLowerCase();
    return incidents.filter(inc => 
      inc.incident_key?.toLowerCase().includes(q) ||
      inc.title?.toLowerCase().includes(q) ||
      inc.reporter_name?.toLowerCase().includes(q)
    );
  }, [incidents, searchQuery]);

  // Calculate aging (days since created)
  const getAgingDays = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  // Calculate active filter count
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'activeSmartFilter') return false;
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== '' && value !== null;
  }).length;

  const totalPages = Math.ceil(filteredIncidents.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedIncidents = filteredIncidents.slice(startIndex, endIndex);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedIncidents.map(inc => inc.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(i => i !== id));
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  // Group incidents by status for Kanban view
  const incidentsByStatus = useMemo(() => {
    const grouped: Record<string, typeof filteredIncidents> = {};
    KANBAN_COLUMNS.forEach(col => {
      grouped[col.id] = filteredIncidents.filter(inc => inc.status === col.id);
    });
    return grouped;
  }, [filteredIncidents]);

  // Kanban column toggle
  const toggleColumnCollapse = (columnId: string) => {
    setCollapsedColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnId)) {
        newSet.delete(columnId);
      } else {
        newSet.add(columnId);
      }
      return newSet;
    });
  };

  // Expand/Collapse all handler
  const handleExpandCollapseAll = () => {
    if (kanbanExpanded) {
      setCollapsedColumns(new Set(KANBAN_COLUMNS.map(c => c.id)));
      setKanbanExpanded(false);
    } else {
      setCollapsedColumns(new Set());
      setKanbanExpanded(true);
    }
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
      {/* Header */}
      <div className="border-b border-border bg-card flex-shrink-0">
        <div className="px-4 sm:px-6">
          <CatalystPageHeader title="Incidents" />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 px-4 sm:px-6 py-3 bg-card">
        <div className="flex items-center justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search incidents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background border-border"
            />
          </div>

          {/* Pagination - only in list mode */}
          {viewMode === 'list' && (
            <div className="flex items-center gap-1 border border-border rounded-md bg-background px-1">
              <Button variant="ghost" size="sm" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="h-8 w-8 p-0">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-foreground px-2 whitespace-nowrap">
                {filteredIncidents.length > 0 ? `${startIndex + 1}-${Math.min(endIndex, filteredIncidents.length)} of ${filteredIncidents.length}` : '0 items'}
              </span>
              <Button variant="ghost" size="sm" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0} className="h-8 w-8 p-0">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* View Toggle */}
          <div className="flex border border-border rounded-md overflow-hidden bg-background">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 transition-colors",
                viewMode === 'list' 
                  ? "text-brand-primary bg-brand-primary/10" 
                  : "text-muted-foreground hover:bg-muted/50"
              )}
            >
              <List className="w-4 h-4" />
              List
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                "px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 transition-colors border-l border-border",
                viewMode === 'kanban' 
                  ? "text-brand-primary bg-brand-primary/10" 
                  : "text-muted-foreground hover:bg-muted/50"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
              Kanban
            </button>
          </div>

          {/* Expand All - only in kanban mode */}
          {viewMode === 'kanban' && (
            <Button 
              variant="outline" 
              size="sm" 
              className="border-border"
              onClick={handleExpandCollapseAll}
            >
              {kanbanExpanded ? (
                <>
                  <Minimize2 className="h-4 w-4 mr-2" />
                  Collapse All
                </>
              ) : (
                <>
                  <Maximize2 className="h-4 w-4 mr-2" />
                  Expand All
                </>
              )}
            </Button>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className={cn("border-border", activeFilterCount > 0 && "border-brand-primary text-brand-primary")}
              onClick={() => setFiltersDialogOpen(true)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Lozenge appearance="inprogress">
                  {activeFilterCount}
                </Lozenge>
              )}
            </Button>
            <Button variant="outline" size="sm" className="border-border">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : viewMode === 'list' ? (
          <div className="flex-1 p-4 sm:p-6 min-h-0 flex flex-col">
            <Card className="flex-1 flex flex-col min-h-0 overflow-hidden border border-border rounded shadow-none">
              <div className="flex-1 overflow-x-auto overflow-y-auto">
                <table className="min-w-full w-max border-separate border-spacing-0">
                  <thead className="sticky top-0 z-40" style={{ position: 'sticky', background: '#F4F5F7' }}>
                    <tr>
                      <th className="px-4 py-3 text-left border-b border-r border-border last:border-r-0 w-10">
                        <Checkbox 
                          checked={selectedIds.length === paginatedIncidents.length && paginatedIncidents.length > 0}
                          onCheckedChange={handleSelectAll}
                          className="border-border data-[state=checked]:bg-brand-primary data-[state=checked]:border-brand-primary"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-r border-border whitespace-nowrap">
                        INC Number
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-r border-border min-w-[250px]">
                        Summary
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-r border-border whitespace-nowrap">
                        Severity
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-r border-border whitespace-nowrap">
                        Priority
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-r border-border whitespace-nowrap">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-r border-border whitespace-nowrap">
                        Support Level
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-r border-border whitespace-nowrap">
                        Work Group
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border whitespace-nowrap">
                        Aging
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedIncidents.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                          No incidents found
                        </td>
                      </tr>
                    ) : paginatedIncidents.map((incident) => (
                      <tr key={incident.id} className="hover:bg-muted/30 group">
                        <td className="px-4 py-3.5 border-b border-r border-border last:border-r-0 bg-card">
                          <Checkbox 
                            checked={selectedIds.includes(incident.id)}
                            onCheckedChange={(checked) => handleSelectOne(incident.id, !!checked)}
                            className="border-border data-[state=checked]:bg-brand-primary data-[state=checked]:border-brand-primary"
                          />
                        </td>
                        <td className="px-4 py-3.5 border-b border-r border-border bg-card">
                          <button 
                            onClick={() => setSelectedIncidentId(incident.id)}
                            className="font-mono text-sm font-medium text-brand-primary hover:underline cursor-pointer"
                          >
                            {incident.incident_key || '-'}
                          </button>
                          {incident.is_major_incident && (
                            <span className="ml-2"><Lozenge appearance="removed">Major</Lozenge></span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 border-b border-r border-border bg-card max-w-[350px]">
                          <span className="text-sm text-foreground truncate block">{incident.title}</span>
                        </td>
                        <td className="px-4 py-3.5 border-b border-r border-border bg-card">
                          <SeverityBadge severity={incident.severity} />
                        </td>
                        <td className="px-4 py-3.5 border-b border-r border-border bg-card">
                          {incident.priority ? (
                            <Lozenge appearance="default">{incident.priority}</Lozenge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 border-b border-r border-border bg-card">
                          <StatusBadge status={incident.status as any} />
                        </td>
                        <td className="px-4 py-3.5 border-b border-r border-border bg-card">
                          <SupportLevelBadge level={incident.support_level} />
                        </td>
                        <td className="px-4 py-3.5 border-b border-r border-border bg-card">
                          <span className="text-sm text-foreground">
                            {incident.assignee_workgroup?.name || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 border-b border-border bg-card">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm text-foreground">{getAgingDays(incident.created_at)}d</span>
                            {getAgingDays(incident.created_at) > 7 && (
                              <span className="w-2 h-2 rounded-full bg-destructive" title="Aging > 7 days" />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Footer */}
            <div className="pt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {filteredIncidents.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, filteredIncidents.length)} of {filteredIncidents.length} incidents
              </div>
              <div className="flex items-center gap-1">
                <button 
                  className="min-w-8 h-8 flex items-center justify-center rounded-md text-sm text-muted-foreground hover:bg-brand-primary/10"
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1}
                >
                  «
                </button>
                <button 
                  className="min-w-8 h-8 flex items-center justify-center rounded-md text-sm text-muted-foreground hover:bg-brand-primary/10"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  ‹
                </button>
                {Array.from({ length: Math.min(3, totalPages) }, (_, i) => i + 1).map(page => (
                  <button 
                    key={page}
                    className={cn(
                      "min-w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium",
                      currentPage === page 
                        ? "bg-brand-primary text-white" 
                        : "text-muted-foreground hover:bg-brand-primary/10"
                    )}
                    onClick={() => goToPage(page)}
                  >
                    {page}
                  </button>
                ))}
                <button 
                  className="min-w-8 h-8 flex items-center justify-center rounded-md text-sm text-muted-foreground hover:bg-brand-primary/10"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  ›
                </button>
                <button 
                  className="min-w-8 h-8 flex items-center justify-center rounded-md text-sm text-muted-foreground hover:bg-brand-primary/10"
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  »
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Kanban View */
          <TooltipProvider delayDuration={200}>
            <div className="flex-1 p-4 sm:p-6 min-h-0 overflow-auto">
              <p className="text-xs text-muted-foreground/60 mb-3 italic">Click any column header to expand/collapse</p>
              <div className="flex gap-3 min-w-max pb-4">
                {KANBAN_COLUMNS.map((column) => {
                  const columnIncidents = incidentsByStatus[column.id] || [];
                  const isCollapsed = collapsedColumns.has(column.id);
                  
                  if (isCollapsed) {
                    return (
                      <div 
                        key={column.id} 
                        className="flex-shrink-0 w-12 cursor-pointer group"
                        onClick={() => toggleColumnCollapse(column.id)}
                      >
                        <Card className="h-full bg-card/50 backdrop-blur-sm border-border/50 hover:border-brand-primary/30 transition-colors">
                          <div className="h-full flex flex-col items-center py-4">
                            <div className={cn("w-3 h-3 rounded-full shadow-sm mb-3", column.color)} />
                            <div className="mb-3">
                              <Lozenge appearance="default">
                                {columnIncidents.length}
                              </Lozenge>
                            </div>
                            <div className="flex-1 flex items-center justify-center">
                              <span 
                                className="text-sm font-semibold tracking-tight text-foreground/80 whitespace-nowrap"
                                style={{ 
                                  writingMode: 'vertical-rl',
                                  textOrientation: 'mixed',
                                  transform: 'rotate(180deg)'
                                }}
                              >
                                {column.label}
                              </span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground mt-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </Card>
                      </div>
                    );
                  }

                  return (
                    <div key={column.id} className="flex-shrink-0 w-[300px]">
                      <Card className="h-full bg-card/50 backdrop-blur-sm border-border/50 flex flex-col max-h-[calc(100vh-280px)]">
                        <CardHeader className="pb-3 bg-card/95 backdrop-blur-sm z-10 border-b border-border/30 flex-shrink-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => toggleColumnCollapse(column.id)}
                                className="p-0.5 hover:bg-muted/50 rounded transition-colors"
                              >
                                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                              </button>
                              <div className={cn("w-3 h-3 rounded-full shadow-sm", column.color)} />
                              <CardTitle className="text-sm font-semibold tracking-tight">{column.label}</CardTitle>
                            </div>
                            <Lozenge appearance="default">
                              {columnIncidents.length}
                            </Lozenge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3 min-h-[200px] flex-1 overflow-y-auto p-3">
                          {columnIncidents.map((incident) => (
                            <Card 
                              key={incident.id} 
                              onClick={() => setSelectedIncidentId(incident.id)}
                              className="cursor-pointer hover:shadow-lg hover:border-brand-primary/30 transition-all duration-200 bg-card border-border/60"
                            >
                              <CardContent className="p-4 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                  <span className="text-sm font-medium line-clamp-2 text-foreground/90">{incident.title}</span>
                                  {incident.is_major_incident && (
                                    <Lozenge appearance="removed">Major</Lozenge>
                                  )}
                                </div>
                                
                                <div className="text-xs text-brand-primary font-mono font-medium">
                                  {incident.incident_key}
                                </div>

                                <div className="flex items-center gap-2">
                                  <SeverityBadge severity={incident.severity} />
                                  <SupportLevelBadge level={incident.support_level} />
                                </div>

                                <div className="flex items-center justify-between pt-1 border-t border-border/30">
                                  <span className="text-xs text-muted-foreground">
                                    {incident.assignee_workgroup?.name || 'Unassigned'}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {getAgingDays(incident.created_at)}d ago
                                  </span>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                          {columnIncidents.length === 0 && (
                            <div className="text-center py-12 text-sm text-muted-foreground/60 italic">
                              No incidents
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          </TooltipProvider>
        )}
      </div>

      {/* Filters Dialog */}
      <IncidentsFiltersDialog
        open={filtersDialogOpen}
        onOpenChange={setFiltersDialogOpen}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Incident Detail Modal */}
      {selectedIncidentId && (
        <Suspense fallback={null}>
          <CatalystDetailRouter
            itemId={selectedIncidentId}
            itemType="incident"
            isOpen={!!selectedIncidentId}
            onClose={() => setSelectedIncidentId(null)}
          />
        </Suspense>
      )}
    </div>
  );
}
