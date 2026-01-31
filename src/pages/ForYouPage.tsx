/**
 * For You Page - Personalized work items with AI Assistant
 */

import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, AlertCircle, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useForYouData } from '@/hooks/useForYouData';
import { ForYouHeader, ForYouSubTabs, ForYouToolbar, ForYouTable, ForYouTableSkeleton, ForYouPagination, TaskhubStrip } from '@/components/for-you';
import { BulkActionsBar } from '@/components/business-requests/table-view/BulkActionsBar';
import { CatalystAIPanel } from '@/components/catalyst-ai';
import { toast } from 'sonner';
import type { AIPriorityItem, AINextItemData, AIStats, AISuggestionData, AIWorkItemType } from '@/components/catalyst-ai/CatalystAIPanel';

export default function ForYouPage() {
  const {
    // State
    activeMode,
    setActiveMode,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    isAIPanelOpen,
    setIsAIPanelOpen,

    // Data
    user,
    groupedItems,
    tabCounts,
    aiData,
    performanceStats,
    isLoading,
    workItems,

    // Handlers
    handleRowClick,
    handleStartTask,
    generateStatusUpdate,
    generateImpactReport,
    showDeprioritize,
    toggleStar,
  } = useForYouData();

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  
  // Initial load animation flag
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Clear initial load flag after animation
  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => setIsInitialLoad(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeMode, activeTab, searchQuery]);

  // Calculate pagination
  const totalItems = workItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Bulk action handlers
  const handleBulkApprove = () => {
    toast.success(`Approved ${selectedIds.size} items`);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = () => {
    toast.success(`Deleted ${selectedIds.size} items`);
    setSelectedIds(new Set());
  };

  const handleBulkAssign = () => {
    toast.info('Assign owner dialog would open here');
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const navigate = useNavigate();

  // Handle clicking on work item key - navigate to appropriate detail page/drawer
  const handleKeyClick = useCallback((key: string, type: string) => {
    // Close AI panel when navigating
    setIsAIPanelOpen(false);
    
    // Navigate based on type - keys like INC-160, FTR-020, etc.
    const prefix = key.split('-')[0];
    
    switch (type) {
      case 'incident':
        navigate(`/release/incidents?selected=${key}`);
        break;
      case 'feature':
        navigate(`/program/features?selected=${key}`);
        break;
      case 'story':
        navigate(`/project/stories?selected=${key}`);
        break;
      case 'defect':
        navigate(`/project/defects?selected=${key}`);
        break;
      case 'epic':
        navigate(`/program/epics?selected=${key}`);
        break;
      case 'task':
      case 'planner_task':
        // Navigate to Taskhub with task modal open
        navigate(`/taskhub/my-tasks?taskId=${key}`);
        break;
      case 'business-request':
        navigate(`/product/business-requests?selected=${key}`);
        break;
      default:
        toast.info(`Opening ${type}: ${key}`);
    }
  }, [navigate, setIsAIPanelOpen]);

  // Transform AI data for the panel
  const priorityItem: AIPriorityItem | undefined = aiData.priorityItem ? {
    id: aiData.priorityItem.itemId,
    key: aiData.priorityItem.key,
    title: aiData.priorityItem.title,
    type: aiData.priorityItem.type,
    aiReason: aiData.priorityItem.reason,
    timeLeft: aiData.priorityItem.timeLeft,
    updatedAt: '10m ago',
    status: 'danger',
  } : undefined;

  const nextItems: AINextItemData[] = aiData.nextItems.map(item => ({
    id: item.itemId,
    key: item.key,
    title: item.title,
    type: item.type,
    aiContext: item.context,
  }));

  const stats: AIStats = {
    closed: performanceStats.closed,
    percentChange: performanceStats.percentChange,
    slaRate: performanceStats.slaRate,
    personalBest: performanceStats.personalBest,
    ops: performanceStats.ops,
    del: performanceStats.del,
    pln: performanceStats.pln,
  };

  const suggestions: AISuggestionData[] = [
    {
      id: 's1',
      icon: <MessageSquare className="w-4 h-4" />,
      label: 'Write my status update',
      onClick: generateStatusUpdate,
    },
    {
      id: 's2',
      icon: <AlertCircle className="w-4 h-4" />,
      label: 'What can I push back?',
      onClick: showDeprioritize,
    },
    {
      id: 's3',
      icon: <FileText className="w-4 h-4" />,
      label: 'Generate impact report',
      onClick: generateImpactReport,
    },
  ];

  return (
    <div className="flex min-h-screen bg-surface-0">
      {/* Main Content */}
      <main 
        className={cn(
          "flex-1 px-8 lg:px-12 py-8 transition-[margin] duration-300",
          isAIPanelOpen && "mr-[360px]"
        )}
      >
        {/* Page Header */}
        <ForYouHeader 
          activeMode={activeMode} 
          onModeChange={setActiveMode} 
        />

        {/* Taskhub Strip - My Tasks KPIs */}
        <TaskhubStrip />

        {/* Work Section */}
        <section className="bg-surface-0">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Your work</h2>

          {/* Controls Row */}
          <div className="flex items-center gap-4 mb-4">
            <ForYouSubTabs
              activeTab={activeTab}
              counts={tabCounts}
              onTabChange={setActiveTab}
            />

            <ForYouToolbar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              isAIPanelOpen={isAIPanelOpen}
              onToggleAIPanel={() => setIsAIPanelOpen(!isAIPanelOpen)}
            />
          </div>

          {/* Data Table or Skeleton */}
          {isLoading ? (
            <ForYouTableSkeleton rowCount={5} />
          ) : (
            <>
              <ForYouTable
                groupedItems={groupedItems}
                onRowClick={handleRowClick}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                onStarToggle={toggleStar}
                isInitialLoad={isInitialLoad}
              />

              {/* Pagination */}
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
        </section>
      </main>

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedIds.size}
        onClear={handleClearSelection}
        onAssignOwner={handleBulkAssign}
        onApprove={handleBulkApprove}
        onDelete={handleBulkDelete}
      />

      {/* AI Assistant Panel */}
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
    </div>
  );
}
