/**
 * For You Page - Personalized work items with AI Assistant
 */

import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { MessageSquare, AlertCircle, FileText, Sparkles, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useForYouData } from '@/hooks/useForYouData';
import { ForYouHeader, ForYouSubTabs, ForYouToolbar, ForYouTable, ForYouTableSkeleton, ForYouPagination } from '@/components/for-you';
import { BulkActionsBar } from '@/components/business-requests/table-view/BulkActionsBar';
import { CatalystAIPanel } from '@/components/catalyst-ai';
import { TooltipProvider } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import type { AIPriorityItem, AINextItemData, AIStats, AISuggestionData, AIWorkItemType } from '@/components/catalyst-ai/CatalystAIPanel';

const DepartmentIntelligenceOverlay = lazy(() => import('@/components/resource360/DepartmentIntelligenceOverlay'));

const DEPT_OPTIONS = ['Delivery', 'Product', 'Governance', 'Operations', 'Technical Support', 'Strategy & Planning'];

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
  
  // Department Intelligence state
  const [showDeptIntel, setShowDeptIntel] = useState(false);
  const [selectedDept, setSelectedDept] = useState('');
  const [showDeptPicker, setShowDeptPicker] = useState(false);
  const deptPickerRef = useRef<HTMLDivElement>(null);

  // Close dept picker on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (deptPickerRef.current && !deptPickerRef.current.contains(e.target as Node)) {
        setShowDeptPicker(false);
      }
    };
    if (showDeptPicker) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showDeptPicker]);

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
        navigate(`/project/tasks?selected=${key}`);
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

        {/* Work Section */}
        <section className="bg-surface-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] font-semibold text-[hsl(222,47%,11%)]">Your work</h2>

            {/* Intelligence Button with Department Picker */}
            <div ref={deptPickerRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowDeptPicker(v => !v)}
                style={{
                  background: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '7px 18px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 4px rgba(37,99,235,0.25)',
                  transition: 'background 150ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#1D4ED8'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#2563EB'; }}
              >
                <Sparkles size={14} strokeWidth={2.2} />
                Intelligence
                <ChevronDown size={12} style={{ opacity: 0.7 }} />
              </button>

              {/* Department Picker Dropdown */}
              {showDeptPicker && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 6,
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 10,
                    boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                    minWidth: 220,
                    padding: '6px',
                    zIndex: 50,
                  }}
                >
                  <div style={{ padding: '8px 12px 6px', fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Select Department
                  </div>
                  {DEPT_OPTIONS.map(dept => (
                    <button
                      key={dept}
                      onClick={() => {
                        setSelectedDept(dept);
                        setShowDeptPicker(false);
                        setShowDeptIntel(true);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        width: '100%',
                        padding: '9px 12px',
                        border: 'none',
                        background: 'transparent',
                        borderRadius: 7,
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 500,
                        color: '#1E293B',
                        transition: 'background 100ms',
                        textAlign: 'left',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: dept === 'Delivery' ? '#2563EB' : dept === 'Product' ? '#7C3AED' : dept === 'Governance' ? '#0D9488' : dept === 'Operations' ? '#D97706' : dept === 'Technical Support' ? '#DC2626' : '#0891B2',
                        flexShrink: 0,
                      }} />
                      {dept}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

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

      {/* Department Intelligence Overlay */}
      {showDeptIntel && selectedDept && (
        <Suspense fallback={null}>
          <TooltipProvider>
            <DepartmentIntelligenceOverlay
              departmentName={selectedDept}
              onClose={() => setShowDeptIntel(false)}
            />
          </TooltipProvider>
        </Suspense>
      )}
    </div>
  );
}
