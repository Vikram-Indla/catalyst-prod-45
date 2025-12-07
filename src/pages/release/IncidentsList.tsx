import { useState, useMemo, lazy, Suspense } from 'react';
import { Search, ChevronLeft, ChevronRight, Filter, Download, List, LayoutGrid, Maximize2, Minimize2 } from 'lucide-react';
import { StatusBadge } from '@/components/release/StatusBadge';
import { PriorityBadge } from '@/components/release/PriorityBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import incidentsData from '@/data/incidents.json';
import type { Incident } from '@/types/release';
import { IncidentsFiltersDialog, IncidentFilters } from '@/components/release/IncidentsFiltersDialog';

// Lazy load the modal to prevent bundle timeout
const IncidentDetailModal = lazy(() => import('@/components/incidents/modal/IncidentDetailModal'));

// Cast and enhance incidents data
const rawIncidents = incidentsData.incidents as any[];
const incidents: Incident[] = rawIncidents.map(inc => ({
  ...inc,
  severity: inc.severity || 'SEV2',
  labels: inc.labels || ['production'],
  isMajorIncident: inc.isMajorIncident || false,
  slackChannel: inc.slackChannel || null,
  attachments: inc.attachments || [
    { id: 'att-1', name: 'error_logs.txt', size: '2.3 MB', uploadedBy: inc.assignee?.name || 'User', uploadedAt: '07 Feb 2025 3:19am' },
  ],
  releaseVersion: inc.releaseVersion || 'Release 2 - Sectorial',
}));

type ViewMode = 'list' | 'kanban';

// Status columns for Kanban
const KANBAN_COLUMNS = [
  { id: 'open', label: 'Open', color: 'bg-blue-500' },
  { id: 'in-progress', label: 'In Progress', color: 'bg-orange-500' },
  { id: 'analysis', label: 'Analysis', color: 'bg-yellow-500' },
  { id: 'implementing', label: 'Implementing', color: 'bg-purple-500' },
  { id: 'pending', label: 'Pending', color: 'bg-amber-500' },
  { id: 'resolved', label: 'Resolved', color: 'bg-green-500' },
  { id: 'closed', label: 'Closed', color: 'bg-gray-500' },
];

export default function IncidentsList() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filtersDialogOpen, setFiltersDialogOpen] = useState(false);
  const [filters, setFilters] = useState<IncidentFilters>({});
  const [kanbanExpanded, setKanbanExpanded] = useState<boolean | undefined>(undefined);
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(
    new Set(['analysis', 'implementing', 'pending', 'resolved', 'closed'])
  );
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const pageSize = 20;

  const filteredIncidents = useMemo(() => {
    let result = incidents;
    
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(inc => 
        inc.id.toLowerCase().includes(q) ||
        inc.summary.toLowerCase().includes(q) ||
        inc.component.toLowerCase().includes(q) ||
        inc.assignee.name.toLowerCase().includes(q)
      );
    }
    
    // Status filter
    if (filters.status && filters.status.length > 0) {
      result = result.filter(inc => filters.status!.includes(inc.status));
    }
    
    // Priority filter
    if (filters.priority && filters.priority.length > 0) {
      result = result.filter(inc => filters.priority!.includes(inc.priority));
    }
    
    return result;
  }, [searchQuery, filters]);

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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const isOverdue = (dateStr: string) => {
    return new Date(dateStr) < new Date();
  };

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
    const grouped: Record<string, Incident[]> = {};
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
      // Collapse all
      setCollapsedColumns(new Set(KANBAN_COLUMNS.map(c => c.id)));
      setKanbanExpanded(false);
    } else {
      // Expand all
      setCollapsedColumns(new Set());
      setKanbanExpanded(true);
    }
  };

  const getTimeInStatus = (updatedAt?: string) => {
    if (!updatedAt) return null;
    try {
      const updated = new Date(updatedAt);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - updated.getTime());
      return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header - fixed height 72px to align with sidebar */}
      <div className="h-[72px] border-b border-border bg-card flex-shrink-0">
        <div className="h-full px-4 sm:px-6 flex items-center">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground truncate">Incidents</h1>
            <p className="text-sm text-muted-foreground truncate">Manage and track all incidents</p>
          </div>
        </div>
      </div>

      {/* Toolbar - no top border, only bottom */}
      <div className="flex flex-col gap-3 px-4 sm:px-6 py-3 bg-card">
        <div className="flex items-center justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search incidents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white border-border"
            />
          </div>

          {/* Pagination - only in list mode */}
          {viewMode === 'list' && (
            <div className="flex items-center gap-1 border border-border rounded-md bg-white px-1">
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
          <div className="flex border border-border rounded-md overflow-hidden bg-white">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 transition-colors",
                viewMode === 'list' 
                  ? "text-brand-gold bg-brand-gold/10" 
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
                  ? "text-brand-gold bg-brand-gold/10" 
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
              className={cn("border-border", activeFilterCount > 0 && "border-brand-gold text-brand-gold")}
              onClick={() => setFiltersDialogOpen(true)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 bg-brand-gold text-white rounded-full text-xs">
                  {activeFilterCount}
                </Badge>
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
        {viewMode === 'list' ? (
          <div className="flex-1 p-4 sm:p-6 min-h-0 flex flex-col">
            <Card className="flex-1 flex flex-col min-h-0 overflow-hidden border border-border rounded shadow-none">
              <div className="flex-1 overflow-x-auto overflow-y-auto">
                <table className="min-w-full w-max border-separate border-spacing-0">
                  <thead className="sticky top-0 z-40" style={{ position: 'sticky', background: 'hsl(35 46% 97%)' }}>
                    <tr>
                      <th className="px-4 py-3 text-left border-b border-r border-border last:border-r-0 w-10">
                        <Checkbox 
                          checked={selectedIds.length === paginatedIncidents.length && paginatedIncidents.length > 0}
                          onCheckedChange={handleSelectAll}
                          className="border-border data-[state=checked]:bg-brand-gold data-[state=checked]:border-brand-gold"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-r border-border whitespace-nowrap">
                        Incident ID
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-r border-border min-w-[200px]">
                        Summary
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-r border-border whitespace-nowrap">
                        Priority
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-r border-border whitespace-nowrap">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-r border-border whitespace-nowrap">
                        Assignee
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-r border-border whitespace-nowrap">
                        Target Date
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border whitespace-nowrap">
                        Component
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedIncidents.map((incident) => (
                      <tr key={incident.id} className="hover:bg-muted/30 group">
                        <td className="px-4 py-3.5 border-b border-r border-border last:border-r-0 bg-card">
                          <Checkbox 
                            checked={selectedIds.includes(incident.id)}
                            onCheckedChange={(checked) => handleSelectOne(incident.id, !!checked)}
                            className="border-border data-[state=checked]:bg-brand-gold data-[state=checked]:border-brand-gold"
                          />
                        </td>
                        <td className="px-4 py-3.5 border-b border-r border-border bg-card">
                          <button 
                            onClick={() => setSelectedIncident(incident)}
                            className="font-mono text-sm font-medium text-brand-gold hover:underline cursor-pointer"
                          >
                            {incident.id}
                          </button>
                        </td>
                        <td className="px-4 py-3.5 border-b border-r border-border bg-card max-w-[300px]">
                          <span className="text-sm text-foreground truncate block">{incident.summary}</span>
                        </td>
                        <td className="px-4 py-3.5 border-b border-r border-border bg-card">
                          <PriorityBadge priority={incident.priority} />
                        </td>
                        <td className="px-4 py-3.5 border-b border-r border-border bg-card">
                          <StatusBadge status={incident.status} />
                        </td>
                        <td className="px-4 py-3.5 border-b border-r border-border bg-card">
                          <span className="text-sm text-foreground">{incident.assignee.name}</span>
                        </td>
                        <td className="px-4 py-3.5 border-b border-r border-border bg-card">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm text-foreground">{formatDate(incident.targetDate)}</span>
                            {isOverdue(incident.targetDate) && incident.status !== 'closed' && incident.status !== 'resolved' && (
                              <span className="w-2 h-2 rounded-full bg-destructive" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 border-b border-border bg-card">
                          <span className="text-sm text-foreground">{incident.component}</span>
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
                Showing {startIndex + 1}-{Math.min(endIndex, filteredIncidents.length)} of {filteredIncidents.length} incidents
              </div>
              <div className="flex items-center gap-1">
                <button 
                  className="min-w-8 h-8 flex items-center justify-center rounded-md text-sm text-muted-foreground hover:bg-brand-gold/10"
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1}
                >
                  «
                </button>
                <button 
                  className="min-w-8 h-8 flex items-center justify-center rounded-md text-sm text-muted-foreground hover:bg-brand-gold/10"
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
                        ? "bg-brand-gold text-white" 
                        : "text-muted-foreground hover:bg-brand-gold/10"
                    )}
                    onClick={() => goToPage(page)}
                  >
                    {page}
                  </button>
                ))}
                <button 
                  className="min-w-8 h-8 flex items-center justify-center rounded-md text-sm text-muted-foreground hover:bg-brand-gold/10"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  ›
                </button>
                <button 
                  className="min-w-8 h-8 flex items-center justify-center rounded-md text-sm text-muted-foreground hover:bg-brand-gold/10"
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
                        <Card className="h-full bg-card/50 backdrop-blur-sm border-border/50 hover:border-brand-gold/30 transition-colors">
                          <div className="h-full flex flex-col items-center py-4">
                            <div className={cn("w-3 h-3 rounded-full shadow-sm mb-3", column.color)} />
                            <Badge variant="secondary" className="rounded-full text-xs font-medium px-2 py-0.5 bg-muted/80 mb-3">
                              {columnIncidents.length}
                            </Badge>
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
                            <Badge variant="secondary" className="rounded-full text-xs font-medium px-2.5 py-0.5 bg-muted/80">
                              {columnIncidents.length}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3 min-h-[200px] flex-1 overflow-y-auto p-3">
                          {columnIncidents.map((incident) => (
                            <Card 
                              key={incident.id} 
                              className="cursor-pointer hover:shadow-lg hover:border-brand-gold/30 transition-all duration-200 bg-card border-border/60"
                            >
                              <CardContent className="p-4 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                  <span className="text-sm font-medium line-clamp-2 text-foreground/90">{incident.summary}</span>
                                </div>
                                
                                <div className="text-xs text-brand-gold font-mono font-medium">
                                  {incident.id}
                                </div>

                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <span>👤 {incident.assignee.name}</span>
                                </div>

                                {getTimeInStatus(incident.targetDate) !== null && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-help">
                                        <span>⏱ {getTimeInStatus(incident.targetDate)}d in status</span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">
                                      Time in current status: {getTimeInStatus(incident.targetDate)} days
                                    </TooltipContent>
                                  </Tooltip>
                                )}

                                <div className="flex items-center justify-between pt-1 border-t border-border/30">
                                  <PriorityBadge priority={incident.priority} />
                                  <span className="text-xs text-muted-foreground">
                                    📅 {formatDate(incident.targetDate)}
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

      {/* Incident Detail Modal - Lazy loaded */}
      {selectedIncident && (
        <Suspense fallback={null}>
          <IncidentDetailModal
            incident={selectedIncident}
            isOpen={!!selectedIncident}
            onClose={() => setSelectedIncident(null)}
            parentIncidentId="INC-1246"
          />
        </Suspense>
      )}
    </div>
  );
}
