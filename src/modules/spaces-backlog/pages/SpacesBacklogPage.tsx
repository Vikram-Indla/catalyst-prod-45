/**
 * Spaces Backlog Page — Complete Jira-class index listing
 */

import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { Download, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TopNavBar } from '../components/spaces';
import { Toolbar, BulkActionsBar, DataGrid, Pagination } from '../components/grid';
import { workItems as initialItems } from '../data/sampleData';
import { WorkItem, WorkItemType, WorkItemStatus, ScopeLevel } from '../types';

const PAGE_SIZE = 20;

export default function SpacesBacklogPage() {
  const [items, setItems] = useState<WorkItem[]>(initialItems);
  const [currentScope, setCurrentScope] = useState<ScopeLevel>('project');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<WorkItemType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<WorkItemStatus | 'all'>('all');
  const [activeView, setActiveView] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState('key');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[placeholder="Search..."]')?.focus();
      }
      if (e.key === 'c' && !e.ctrlKey && !e.metaKey) {
        toast.info('Create modal would open here');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let result = [...items];
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i => i.key.toLowerCase().includes(q) || i.title.toLowerCase().includes(q));
    }
    if (typeFilter !== 'all') result = result.filter(i => i.type === typeFilter);
    if (statusFilter !== 'all') result = result.filter(i => i.status === statusFilter);
    if (activeView === 'blocked') result = result.filter(i => i.status === 'blocked');
    if (activeView === 'my') result = result.filter(i => i.assignee?.initials === 'VK');

    result.sort((a, b) => {
      const aVal = a[sortColumn as keyof WorkItem] ?? '';
      const bVal = b[sortColumn as keyof WorkItem] ?? '';
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [items, searchQuery, typeFilter, statusFilter, activeView, sortColumn, sortDirection]);

  const paginatedItems = filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleStatusChange = (id: string, status: WorkItemStatus) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i));
    toast.success('Status updated');
  };

  const handleBulkStatusChange = (status: WorkItemStatus) => {
    setItems(prev => prev.map(i => selectedIds.has(i.id) ? { ...i, status } : i));
    toast.success(`${selectedIds.size} items updated`);
    setSelectedIds(new Set());
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <TopNavBar
        currentScope={currentScope}
        onScopeChange={setCurrentScope}
        onNavigate={(type) => toast.info(`Navigate to ${type}s`)}
        onCreateClick={() => toast.info('Create modal would open')}
      />

      <main className="flex-1 overflow-auto px-6 py-4">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Backlog</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1.5" />Export</Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-1.5" />Create</Button>
          </div>
        </div>

        {/* Toolbar */}
        <Toolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          activeView={activeView}
          onViewChange={setActiveView}
          onColumnsClick={() => toast.info('Column chooser would open')}
        />

        {/* Bulk Actions */}
        <BulkActionsBar
          selectedCount={selectedIds.size}
          onClear={() => setSelectedIds(new Set())}
          onStatusChange={handleBulkStatusChange}
        />

        {/* Data Grid */}
        <DataGrid
          items={paginatedItems}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onRowClick={(item) => toast.info(`Open drawer for ${item.key}`)}
          onStatusChange={handleStatusChange}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
        />

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredItems.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </main>
    </div>
  );
}
