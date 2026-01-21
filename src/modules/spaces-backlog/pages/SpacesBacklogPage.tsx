/**
 * Spaces Backlog Page — CATALYST HIERARCHY CONTRACT ENFORCED
 * 
 * ENTERPRISE: Objectives, Strategic Initiatives ONLY
 * PROGRAM: Epics ONLY
 * PROJECT: Features, Stories, Subtasks ONLY
 */

import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { Download, Plus, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TopNavBar } from '../components/spaces';
import { Toolbar, BulkActionsBar, DataGrid, Pagination } from '../components/grid';
import { DetailsDrawer } from '../components/drawer';
import { workItems as initialItems } from '../data/sampleData';
import { WorkItem, WorkItemType, WorkItemStatus, ScopeLevel, SCOPE_ALLOWED_TYPES, SCOPE_LABELS, TYPE_CONFIG } from '../types';

const PAGE_SIZE = 20;

// Scope-aware page titles
const SCOPE_PAGE_TITLES: Record<ScopeLevel, string> = {
  enterprise: 'Strategic Backlog',
  program: 'Epic Backlog',
  project: 'Backlog',
};

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
  
  // Details drawer state
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Reset filters when scope changes
  useEffect(() => {
    setTypeFilter('all');
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [currentScope]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[placeholder="Search..."]')?.focus();
      }
      if (e.key === 'c' && !e.ctrlKey && !e.metaKey && !isDrawerOpen) {
        toast.info('Create modal would open');
      }
      if (e.key === 'Escape' && isDrawerOpen) {
        setIsDrawerOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen]);

  // Get allowed types for current scope
  const allowedTypes = SCOPE_ALLOWED_TYPES[currentScope];

  // Filter items by scope first (HIERARCHY CONTRACT ENFORCEMENT)
  const scopedItems = useMemo(() => {
    return items.filter(item => item.scopeLevel === currentScope);
  }, [items, currentScope]);

  // Then apply user filters
  const filteredItems = useMemo(() => {
    let result = [...scopedItems];
    
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
  }, [scopedItems, searchQuery, typeFilter, statusFilter, activeView, sortColumn, sortDirection]);

  const paginatedItems = filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Check if there are items in wrong scope (for guidance)
  const wrongScopeItems = useMemo(() => {
    if (typeFilter === 'all') return [];
    const config = TYPE_CONFIG[typeFilter];
    if (config && config.scopeLevel !== currentScope) {
      return items.filter(i => i.type === typeFilter);
    }
    return [];
  }, [items, typeFilter, currentScope]);

  const handleStatusChange = (id: string, status: WorkItemStatus) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status, updatedAt: new Date().toISOString() } : i));
    toast.success('Status updated');
  };

  const handleBulkStatusChange = (status: WorkItemStatus) => {
    setItems(prev => prev.map(i => selectedIds.has(i.id) ? { ...i, status, updatedAt: new Date().toISOString() } : i));
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

  const handleRowClick = (item: WorkItem) => {
    setSelectedItem(item);
    setIsDrawerOpen(true);
  };

  const handleSaveItem = (updatedItem: WorkItem) => {
    setItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
    setSelectedItem(updatedItem);
    toast.success('Changes saved');
  };

  const handleSwitchScope = (newScope: ScopeLevel) => {
    setCurrentScope(newScope);
    setTypeFilter('all');
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
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {SCOPE_PAGE_TITLES[currentScope]}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {SCOPE_LABELS[currentScope]} scope • {allowedTypes.map(t => TYPE_CONFIG[t].label).join(', ')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1.5" />Export</Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-1.5" />Create</Button>
          </div>
        </div>

        {/* Hierarchy Guidance Banner */}
        {wrongScopeItems.length > 0 && typeFilter !== 'all' && (
          <div className="mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  {TYPE_CONFIG[typeFilter].label}s are managed at {TYPE_CONFIG[typeFilter].scopeLevel.charAt(0).toUpperCase() + TYPE_CONFIG[typeFilter].scopeLevel.slice(1)} level
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {wrongScopeItems.length} item{wrongScopeItems.length > 1 ? 's' : ''} found. Switch scope to view.
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-amber-300 text-amber-700 hover:bg-amber-100"
              onClick={() => handleSwitchScope(TYPE_CONFIG[typeFilter].scopeLevel)}
            >
              Switch to {TYPE_CONFIG[typeFilter].scopeLevel}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        )}

        {/* Toolbar - only show allowed types for current scope */}
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
          allowedTypes={allowedTypes}
        />

        {/* Bulk Actions */}
        <BulkActionsBar
          selectedCount={selectedIds.size}
          onClear={() => setSelectedIds(new Set())}
          onStatusChange={handleBulkStatusChange}
        />

        {/* Data Grid */}
        {paginatedItems.length > 0 ? (
          <DataGrid
            items={paginatedItems}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onRowClick={handleRowClick}
            onStatusChange={handleStatusChange}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
        ) : (
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-12 text-center">
            <div className="max-w-sm mx-auto">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
                No items found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                {scopedItems.length === 0 
                  ? `No ${allowedTypes.map(t => TYPE_CONFIG[t].label.toLowerCase()).join(' or ')}s in ${currentScope} scope.`
                  : 'Try adjusting your filters or search query.'
                }
              </p>
              {scopedItems.length === 0 && (
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Create {TYPE_CONFIG[allowedTypes[0]].label}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Pagination */}
        {paginatedItems.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredItems.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        )}
      </main>

      {/* Details Drawer */}
      <DetailsDrawer
        workItem={selectedItem}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSave={handleSaveItem}
      />
    </div>
  );
}
