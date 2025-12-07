import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, Filter, Download, List, LayoutGrid, Plus } from 'lucide-react';
import { PageHeader } from '@/components/release/PageHeader';
import { StatusBadge } from '@/components/release/StatusBadge';
import { PriorityBadge } from '@/components/release/PriorityBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import incidentsData from '@/data/incidents.json';
import type { Incident } from '@/types/release';

const incidents = incidentsData.incidents as Incident[];

export default function IncidentsList() {
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
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
  const paginatedIncidents = filteredIncidents.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

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

  return (
    <div className="h-full flex flex-col bg-white">
      <PageHeader 
        title="Incidents" 
        subtitle="Manage and track all incidents"
        actions={
          <Link to="/release/incidents/dashboard">
            <Button
              variant="outline"
              size="sm"
              className="h-9 border-[#E8E8E8] text-[#5C5C5C] hover:bg-[rgba(198,156,109,0.1)] hover:text-[#1A1A1A]"
            >
              Dashboard
            </Button>
          </Link>
        }
      />

      {/* Toolbar */}
      <div className="px-6 py-4 border-b border-[#E8E8E8] bg-white">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C8C8C]" />
            <Input
              type="text"
              placeholder="Search incidents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 border-[#E8E8E8] focus:border-[#C69C6D] focus:ring-[#C69C6D] bg-white"
            />
          </div>

          {/* Pagination */}
          <div className="flex items-center border border-[#E8E8E8] rounded-md">
            <button 
              className="px-2 py-1.5 hover:bg-[#FAFAFA] text-[#8C8C8C] disabled:opacity-50"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1.5 text-sm text-[#5C5C5C] border-x border-[#E8E8E8]">
              {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredIncidents.length)} of {filteredIncidents.length}
            </span>
            <button 
              className="px-2 py-1.5 hover:bg-[#FAFAFA] text-[#8C8C8C] disabled:opacity-50"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* View Toggle */}
          <div className="flex border border-[#E8E8E8] rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 transition-colors",
                viewMode === 'list' 
                  ? "text-[#C69C6D] bg-[rgba(198,156,109,0.1)]" 
                  : "text-[#8C8C8C] hover:bg-[#FAFAFA]"
              )}
            >
              <List className="w-4 h-4" />
              List
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                "px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 transition-colors border-l border-[#E8E8E8]",
                viewMode === 'kanban' 
                  ? "text-[#C69C6D] bg-[rgba(198,156,109,0.1)]" 
                  : "text-[#8C8C8C] hover:bg-[#FAFAFA]"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
              Kanban
            </button>
          </div>

          {/* Filters */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 border-[#E8E8E8] text-[#5C5C5C] hover:bg-[rgba(198,156,109,0.1)] hover:text-[#1A1A1A]"
          >
            <Filter className="w-4 h-4 mr-1.5" />
            Filters
          </Button>

          {/* Export */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 border-[#E8E8E8] text-[#5C5C5C] hover:bg-[rgba(198,156,109,0.1)] hover:text-[#1A1A1A]"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-white z-10">
            <tr>
              <th className="w-10 px-4 py-3 text-left border-b border-[#E8E8E8]">
                <Checkbox 
                  checked={selectedIds.length === paginatedIncidents.length && paginatedIncidents.length > 0}
                  onCheckedChange={handleSelectAll}
                  className="border-[#E8E8E8] data-[state=checked]:bg-[#C69C6D] data-[state=checked]:border-[#C69C6D]"
                />
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#8C8C8C] border-b border-[#E8E8E8] whitespace-nowrap">
                Incident ID <span className="text-[#A3A3A3] ml-1">↕</span>
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#8C8C8C] border-b border-[#E8E8E8]">
                Summary <span className="text-[#A3A3A3] ml-1">↕</span>
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#8C8C8C] border-b border-[#E8E8E8] whitespace-nowrap">
                Priority <span className="text-[#A3A3A3] ml-1">↕</span>
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#8C8C8C] border-b border-[#E8E8E8] whitespace-nowrap">
                Status <span className="text-[#A3A3A3] ml-1">↕</span>
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#8C8C8C] border-b border-[#E8E8E8] whitespace-nowrap">
                Assignee <span className="text-[#A3A3A3] ml-1">↕</span>
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#8C8C8C] border-b border-[#E8E8E8] whitespace-nowrap">
                Target Date <span className="text-[#A3A3A3] ml-1">↕</span>
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#8C8C8C] border-b border-[#E8E8E8] whitespace-nowrap">
                Component <span className="text-[#A3A3A3] ml-1">↕</span>
              </th>
              <th className="w-10 px-4 py-3 text-left border-b border-[#E8E8E8]">
                <button className="w-7 h-7 flex items-center justify-center text-[#8C8C8C] rounded hover:bg-[rgba(198,156,109,0.1)]">
                  <Plus className="w-4 h-4" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedIncidents.map((incident) => (
              <tr key={incident.id} className="hover:bg-[#FAFAFA] group">
                <td className="px-4 py-3.5 border-b border-[#F0F0F0]">
                  <Checkbox 
                    checked={selectedIds.includes(incident.id)}
                    onCheckedChange={(checked) => handleSelectOne(incident.id, !!checked)}
                    className="border-[#E8E8E8] data-[state=checked]:bg-[#C69C6D] data-[state=checked]:border-[#C69C6D]"
                  />
                </td>
                <td className="px-4 py-3.5 border-b border-[#F0F0F0]">
                  <Link 
                    to={`/release/incidents/${incident.id}`}
                    className="font-medium text-[#1A1A1A] hover:text-[#C69C6D]"
                  >
                    {incident.id}
                  </Link>
                </td>
                <td className="px-4 py-3.5 border-b border-[#F0F0F0] max-w-[300px] truncate text-[#1A1A1A]">
                  {incident.summary}
                </td>
                <td className="px-4 py-3.5 border-b border-[#F0F0F0]">
                  <PriorityBadge priority={incident.priority} />
                </td>
                <td className="px-4 py-3.5 border-b border-[#F0F0F0]">
                  <StatusBadge status={incident.status} />
                </td>
                <td className="px-4 py-3.5 border-b border-[#F0F0F0] text-[#1A1A1A]">
                  {incident.assignee.name}
                </td>
                <td className="px-4 py-3.5 border-b border-[#F0F0F0]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#1A1A1A]">{formatDate(incident.targetDate)}</span>
                    {isOverdue(incident.targetDate) && incident.status !== 'closed' && incident.status !== 'resolved' && (
                      <span className="w-2 h-2 rounded-full bg-[#E53935]" />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3.5 border-b border-[#F0F0F0] text-[#1A1A1A]">
                  {incident.component}
                </td>
                <td className="px-4 py-3.5 border-b border-[#F0F0F0]" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-[#E8E8E8] bg-white flex items-center justify-between">
        <div className="text-sm text-[#8C8C8C]">
          Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredIncidents.length)} of {filteredIncidents.length} incidents
        </div>
        <div className="flex items-center gap-1">
          <button 
            className="min-w-8 h-8 flex items-center justify-center rounded-md text-sm text-[#5C5C5C] hover:bg-[rgba(198,156,109,0.1)]"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            «
          </button>
          <button 
            className="min-w-8 h-8 flex items-center justify-center rounded-md text-sm text-[#5C5C5C] hover:bg-[rgba(198,156,109,0.1)]"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
                  ? "bg-[#C69C6D] text-white" 
                  : "text-[#5C5C5C] hover:bg-[rgba(198,156,109,0.1)]"
              )}
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </button>
          ))}
          <button 
            className="min-w-8 h-8 flex items-center justify-center rounded-md text-sm text-[#5C5C5C] hover:bg-[rgba(198,156,109,0.1)]"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            ›
          </button>
          <button 
            className="min-w-8 h-8 flex items-center justify-center rounded-md text-sm text-[#5C5C5C] hover:bg-[rgba(198,156,109,0.1)]"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            »
          </button>
        </div>
      </div>
    </div>
  );
}
