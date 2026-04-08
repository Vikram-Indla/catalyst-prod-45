/**
 * For You Page - MARAM V3.1 · Enterprise landing page
 * Ring-fenced: all classes use fy- prefix
 */

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { MessageSquare, AlertCircle, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useForYouData } from '@/hooks/useForYouData';
import {
  ForYouHeader, ForYouSubTabs, ForYouToolbar, ForYouTable,
  ForYouTableSkeleton, ForYouPagination,
} from '@/components/for-you';
import { StatusSummaryBar } from '@/components/for-you/StatusSummaryBar';
import { ForYouInlineFilters, type ForYouFilters } from '@/components/for-you/ForYouInlineFilters';
import { ForYouLightBulkBar } from '@/components/for-you/ForYouLightBulkBar';
import { toast } from 'sonner';
import type { AIPriorityItem, AINextItemData, AIStats, AISuggestionData } from '@/components/catalyst-ai/CatalystAIPanel';

// ─── Heavy panels: lazy-loaded so they never block initial render ────
const StoryDetailModal = lazy(() => import('@/modules/project-work-hub/components/dialogs/StoryDetailModal'));
const CatalystAIPanel = lazy(() => import('@/components/catalyst-ai/CatalystAIPanel').then(m => ({ default: m.CatalystAIPanel })));

export default function ForYouPage() {
  const {
    activeTab, setActiveTab,
    searchQuery, setSearchQuery,
    isAIPanelOpen, setIsAIPanelOpen,
    user, groupedItems, tabCounts, hubStats,
    aiData, performanceStats, isLoading, workItems,
    selectedItem, handleRowClick, closeDetailPanel,
    handleStartTask, generateStatusUpdate, generateImpactReport,
    showDeprioritize, toggleStar,
  } = useForYouData();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [inlineFilters, setInlineFilters] = useState<ForYouFilters>({ project: null, hub: null, reportedBy: null });
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => setIsInitialLoad(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  useEffect(() => { setCurrentPage(1); }, [activeTab, searchQuery, inlineFilters]);

  const totalItems = workItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const projectOptions = React.useMemo(() => [...new Set(workItems.map(i => i.project).filter(Boolean))].sort(), [workItems]);
  const hubOptions = React.useMemo(() => [...new Set(workItems.map(i => i.hubLabel).filter(Boolean))].sort(), [workItems]);
  const reportedByOptions = React.useMemo(() => [...new Set(workItems.map(i => i.reporter || i.assignee.name).filter(Boolean))].sort(), [workItems]);

  const filteredGroupedItems = React.useMemo(() => {
    const filterItem = (item: typeof workItems[0]) => {
      if (inlineFilters.project && item.project !== inlineFilters.project) return false;
      if (inlineFilters.hub && item.hubLabel !== inlineFilters.hub) return false;
      if (inlineFilters.reportedBy) {
        const reporter = item.reporter || item.assignee.name;
        if (reporter !== inlineFilters.reportedBy) return false;
      }
      return true;
    };
    return {
      YESTERDAY: groupedItems.YESTERDAY.filter(filterItem),
      THIS_WEEK: groupedItems.THIS_WEEK.filter(filterItem),
      EARLIER: groupedItems.EARLIER.filter(filterItem),
    };
  }, [groupedItems, inlineFilters]);

  const handleBulkApprove = () => { toast.success(`Approved ${selectedIds.size} items`); setSelectedIds(new Set()); };
  const handleBulkDelete = () => { toast.success(`Deleted ${selectedIds.size} items`); setSelectedIds(new Set()); };
  const handleBulkAssign = () => { toast.info('Assign owner dialog would open here'); };
  const handleClearSelection = () => { setSelectedIds(new Set()); };

  const navigate = useNavigate();

  const handleKeyClick = useCallback((key: string, type: string) => {
    setIsAIPanelOpen(false);
    switch (type) {
      case 'incident': navigate(`/release/incidents?selected=${key}`); break;
      case 'feature': navigate(`/program/features?selected=${key}`); break;
      case 'story': navigate(`/project/stories?selected=${key}`); break;
      case 'defect': navigate(`/project/defects?selected=${key}`); break;
      case 'epic': navigate(`/program/epics?selected=${key}`); break;
      case 'task': navigate(`/project/tasks?selected=${key}`); break;
      case 'business-request': navigate(`/product/business-requests?selected=${key}`); break;
      default: toast.info(`Opening ${type}: ${key}`);
    }
  }, [navigate, setIsAIPanelOpen]);

  const priorityItem: AIPriorityItem | undefined = aiData.priorityItem ? {
    id: aiData.priorityItem.itemId, key: aiData.priorityItem.key, title: aiData.priorityItem.title,
    type: aiData.priorityItem.type, aiReason: aiData.priorityItem.reason, timeLeft: aiData.priorityItem.timeLeft,
    updatedAt: '10m ago', status: 'danger',
  } : undefined;

  const nextItems: AINextItemData[] = aiData.nextItems.map(item => ({
    id: item.itemId, key: item.key, title: item.title, type: item.type, aiContext: item.context,
  }));

  const stats: AIStats = {
    closed: performanceStats.closed, percentChange: performanceStats.percentChange,
    slaRate: performanceStats.slaRate, personalBest: performanceStats.personalBest,
    ops: performanceStats.ops, del: performanceStats.del, pln: performanceStats.pln,
  };

  const suggestions: AISuggestionData[] = [
    { id: 's1', icon: <MessageSquare className="w-4 h-4" />, label: 'Write my status update', onClick: generateStatusUpdate },
    { id: 's2', icon: <AlertCircle className="w-4 h-4" />, label: 'What can I push back?', onClick: showDeprioritize },
    { id: 's3', icon: <FileText className="w-4 h-4" />, label: 'Generate impact report', onClick: generateImpactReport },
  ];

  return (
    <div className="fy-page" style={{ fontFamily: "'Inter', system-ui", minHeight: 0, flex: 1, background: 'var(--cp-bg)', color: 'var(--cp-t1)' }}>
      <main style={{ width: '100%', maxWidth: '100%', padding: '16px 24px 48px', boxSizing: 'border-box' }}>
        <ForYouHeader />

        {/* Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <ForYouSubTabs activeTab={activeTab} counts={tabCounts} onTabChange={setActiveTab} />
        </div>

        {/* Status Summary Bar — computed from filtered items */}
        <StatusSummaryBar items={[
          ...filteredGroupedItems.YESTERDAY,
          ...filteredGroupedItems.THIS_WEEK,
          ...filteredGroupedItems.EARLIER,
        ]} />

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <ForYouInlineFilters
            filters={inlineFilters}
            onFiltersChange={setInlineFilters}
            projectOptions={projectOptions}
            hubOptions={hubOptions}
            reportedByOptions={reportedByOptions}
          />
        </div>

        {/* Table */}
        {isLoading ? (
          <ForYouTableSkeleton rowCount={5} />
        ) : (
          <>
            <ForYouTable
              groupedItems={filteredGroupedItems}
              onRowClick={handleRowClick}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              onStarToggle={toggleStar}
              isInitialLoad={isInitialLoad}
            />
            <ForYouPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </main>

      {/* Bulk Actions */}
      <ForYouLightBulkBar
        selectedCount={selectedIds.size}
        onClear={handleClearSelection}
        onAssignOwner={handleBulkAssign}
        onApprove={handleBulkApprove}
        onDelete={handleBulkDelete}
      />

      {/* Detail Panel — lazy loaded */}
      {selectedItem && (
        <Suspense fallback={null}>
          <ForYouDetailPanel item={selectedItem} onClose={closeDetailPanel} />
        </Suspense>
      )}

      {/* AI Panel — lazy loaded */}
      {isAIPanelOpen && (
        <Suspense fallback={null}>
          <CatalystAIPanel
            isOpen={isAIPanelOpen}
            onClose={() => setIsAIPanelOpen(false)}
            userName={user.firstName}
            criticalCount={aiData.criticalCount}
            priorityItem={priorityItem}
            nextItems={nextItems}
            stats={stats}
            suggestions={suggestions}
            onItemClick={handleRowClick}
            onStartTask={handleStartTask}
            onKeyClick={handleKeyClick}
          />
        </Suspense>
      )}
    </div>
  );
}
