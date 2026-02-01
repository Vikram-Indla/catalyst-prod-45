// Aqd¹⁰ Executive Dashboard Page
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { AqdLayout } from '../components/AqdLayout';
import { AqdSummaryCards } from '../components/AqdSummaryCards';
import { AqdDashboardToolbar } from '../components/AqdDashboardToolbar';
import { AqdListsTable } from '../components/AqdListsTable';
import { AqdQuickActions } from '../components/AqdQuickActions';
import { AqdCreateListModal } from '../components/AqdCreateListModal';
import { useAqdLists, useCreateAqdList, useToggleAqdListPin, useDeleteAqdList, useArchiveAqdList } from '@/hooks/useAqd';
import { Skeleton } from '@/components/ui/skeleton';
import '@/styles/aqd-dashboard.css';

export function AqdListsPage() {
  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [sortBy, setSortBy] = useState('updated');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  const { data: lists = [], isLoading } = useAqdLists();
  const createList = useCreateAqdList();
  const togglePin = useToggleAqdListPin();
  const deleteList = useDeleteAqdList();
  const archiveList = useArchiveAqdList();

  // Calculate dashboard metrics
  const metrics = useMemo(() => {
    const totalLists = lists.length;
    const totalItems = lists.reduce((sum, l) => sum + (l.item_count ?? 0), 0);
    const completedItems = lists.reduce((sum, l) => sum + (l.completed_count ?? 0), 0);
    const completionPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    const activeLists = lists.filter(l => !l.is_archived).length;
    return { totalLists, totalItems, completionPercent, activeLists };
  }, [lists]);

  // Filter and sort lists
  const filteredLists = useMemo(() => {
    let result = lists;
    
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(list => 
        list.name.toLowerCase().includes(searchLower) ||
        list.description?.toLowerCase().includes(searchLower)
      );
    }
    
    // Status filter
    if (statusFilter === 'active') {
      result = result.filter(l => !l.is_archived);
    } else if (statusFilter === 'archived') {
      result = result.filter(l => l.is_archived);
    }
    
    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'items') {
        return (b.item_count ?? 0) - (a.item_count ?? 0);
      } else {
        // updated
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });
    
    // Pin sorting always on top
    result.sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0));
    
    return result;
  }, [lists, search, statusFilter, sortBy]);

  const handleCreate = async (data: { name: string; description?: string }) => {
    const result = await createList.mutateAsync(data);
    setIsCreateOpen(false);
    if (result?.name) {
      const slug = encodeURIComponent(result.name.toLowerCase().replace(/\s+/g, '-'));
      navigate(`/aqd/${slug}`);
    }
  };

  if (isLoading) {
    return (
      <AqdLayout>
        <div className="aqd-dashboard">
          <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-4 w-48 mt-2" />
              </div>
              <Skeleton className="h-10 w-28" />
            </div>
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))}
            </div>
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </div>
        </div>
      </AqdLayout>
    );
  }

  return (
    <AqdLayout>
      <div className="aqd-dashboard">
        {/* Header */}
        <div className="aqd-dash-header">
          <div className="aqd-dash-brand">
            <h1>AQD<sup>10</sup></h1>
            <p>Executive Priority Management</p>
          </div>
          <button 
            className="aqd-dash-new-btn"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus size={18} />
            New List
          </button>
        </div>

        {/* Summary Cards */}
        <AqdSummaryCards
          totalLists={metrics.totalLists}
          totalItems={metrics.totalItems}
          completionPercent={metrics.completionPercent}
          activeLists={metrics.activeLists}
        />

        {/* Toolbar */}
        <AqdDashboardToolbar
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          ownerFilter={ownerFilter}
          onOwnerFilterChange={setOwnerFilter}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {/* Lists Table */}
        <AqdListsTable
          lists={filteredLists}
          onTogglePin={(id, isPinned) => togglePin.mutate({ id, is_pinned: isPinned })}
          onArchive={(id) => archiveList.mutate(id)}
          onDelete={(id, hasItems) => deleteList.mutate({ id, hasItems })}
        />

        {/* Quick Actions */}
        <AqdQuickActions
          onImport={() => console.log('Import clicked')}
          onExport={() => console.log('Export clicked')}
          onAnalytics={() => console.log('Analytics clicked')}
        />
        
        {/* Create Modal */}
        <AqdCreateListModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={handleCreate}
          isLoading={createList.isPending}
        />
      </div>
    </AqdLayout>
  );
}
