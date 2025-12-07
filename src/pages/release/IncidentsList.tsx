import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, Filter, Download, List, LayoutGrid } from 'lucide-react';
import { StatusBadge } from '@/components/release/StatusBadge';
import { PriorityBadge } from '@/components/release/PriorityBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import incidentsData from '@/data/incidents.json';
import type { Incident } from '@/types/release';

const incidents = incidentsData.incidents as Incident[];

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
  const pageSize = 20;

  const filteredIncidents = useMemo(() => {
    if (!searchQuery) return incidents;
    const q = searchQuery.toLowerCase();
    return incidents.filter(inc => 
      inc.id.toLowerCase().includes(q) ||
      inc.summary.toLowerCase().includes(q) ||
      inc.component.toLowerCase().includes(q) ||
      inc.assignee.name.toLowerCase().includes(q)
    );
  }, [searchQuery]);

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

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-border">
              <Filter className="h-4 w-4 mr-2" />
              Filters
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
                        Incident ID ↕
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-r border-border min-w-[200px]">
                        Summary ↕
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-r border-border whitespace-nowrap">
                        Priority ↕
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-r border-border whitespace-nowrap">
                        Status ↕
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-r border-border whitespace-nowrap">
                        Assignee ↕
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-r border-border whitespace-nowrap">
                        Target Date ↕
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border whitespace-nowrap">
                        Component ↕
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
                          <Link 
                            to={`/release/incidents/${incident.id}`}
                            className="font-semibold text-foreground hover:text-brand-gold"
                          >
                            {incident.id}
                          </Link>
                        </td>
                        <td className="px-4 py-3.5 border-b border-r border-border bg-card max-w-[300px] truncate text-foreground">
                          {incident.summary}
                        </td>
                        <td className="px-4 py-3.5 border-b border-r border-border bg-card">
                          <PriorityBadge priority={incident.priority} />
                        </td>
                        <td className="px-4 py-3.5 border-b border-r border-border bg-card">
                          <StatusBadge status={incident.status} />
                        </td>
                        <td className="px-4 py-3.5 border-b border-r border-border bg-card text-foreground">
                          {incident.assignee.name}
                        </td>
                        <td className="px-4 py-3.5 border-b border-r border-border bg-card">
                          <div className="flex items-center gap-1.5">
                            <span className="text-foreground">{formatDate(incident.targetDate)}</span>
                            {isOverdue(incident.targetDate) && incident.status !== 'closed' && incident.status !== 'resolved' && (
                              <span className="w-2 h-2 rounded-full bg-red-500" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 border-b border-border bg-card text-foreground">
                          {incident.component}
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
          <div className="flex-1 p-4 sm:p-6 min-h-0 overflow-auto">
            <p className="text-sm text-muted-foreground mb-4">Click any column to expand</p>
            <div className="flex gap-4 min-w-max">
              {KANBAN_COLUMNS.map((column) => {
                const columnIncidents = incidentsByStatus[column.id] || [];
                return (
                  <div key={column.id} className="w-[300px] flex-shrink-0">
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                      <div className={cn("w-3 h-3 rounded-full", column.color)} />
                      <span className="font-medium text-sm">{column.label}</span>
                      <span className="ml-auto px-2 py-0.5 text-xs font-medium rounded-full bg-muted text-muted-foreground">
                        {columnIncidents.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {columnIncidents.map((incident) => (
                        <Card key={incident.id} className="p-4 border-border hover:border-brand-gold hover:shadow-sm transition-all cursor-pointer">
                          <div className="font-medium text-sm mb-1">{incident.summary}</div>
                          <div className="text-xs text-brand-gold mb-2">{incident.id}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            <span>👤 {incident.assignee.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                            <span>⏱ 0d in status</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <PriorityBadge priority={incident.priority} />
                            <span className="text-xs text-muted-foreground">
                              📅 {formatDate(incident.targetDate)}
                            </span>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
