/**
 * For You Page - MARAM V3.1 · Enterprise landing page
 * Ring-fenced: all classes use fy- prefix
 */

import React, { useState, useEffect, useCallback, lazy, Suspense, useRef, useMemo } from 'react';
import { MessageSquare, AlertCircle, FileText, Folder, LayoutGrid, Bug as BugIcon, CheckSquare, Zap, BookOpen, AlertTriangle as AlertTriangleIcon, Layers, Search, Check } from 'lucide-react';
import { PriorityBars, normalisePriority } from '@/components/shared/PriorityIndicator';
import { StatusLozenge } from '@/components/ui/StatusLozenge';
import { JiraIssueTypeIcon } from '@/components/shared/JiraIssueTypeIcon';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useForYouData } from '@/hooks/useForYouData';
import type { WorkItem } from '@/hooks/useForYouData';
import {
  ForYouHeader, ForYouSubTabs, ForYouToolbar, ForYouTable,
  ForYouTableSkeleton, ForYouPagination,
} from '@/components/for-you';
import { StatusSummaryBar } from '@/components/for-you/StatusSummaryBar';
import { ForYouInlineFilters, type ForYouFilters } from '@/components/for-you/ForYouInlineFilters';
import { ForYouLightBulkBar } from '@/components/for-you/ForYouLightBulkBar';
import { FilterTriggerButton, JiraBasicFilter } from '@/components/shared/JiraBasicFilter';
import type { FilterCategory } from '@/components/shared/JiraBasicFilter';
import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';
import { toast } from 'sonner';
import type { AIPriorityItem, AINextItemData, AIStats, AISuggestionData } from '@/components/catalyst-ai/CatalystAIPanel';

// ─── Group By ────────────────────────────────────────────────
type ForYouGroupByKey = 'none' | 'status' | 'priority' | 'hub' | 'project' | 'reporter' | 'type';

const FY_GROUP_OPTIONS: { key: ForYouGroupByKey; label: string }[] = [
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'hub', label: 'Hub' },
  { key: 'project', label: 'Project' },
  { key: 'reporter', label: 'Reporter' },
  { key: 'type', label: 'Type' },
];

const PRIORITY_ORDER_FY = ['critical', 'highest', 'high', 'medium', 'low', 'lowest'];

function groupForYouItems(items: WorkItem[], groupBy: ForYouGroupByKey): { label: string; items: WorkItem[] }[] {
  if (groupBy === 'none') return [];

  const map = new Map<string, WorkItem[]>();
  items.forEach(item => {
    let key: string;
    switch (groupBy) {
      case 'status': key = item.status || 'No Status'; break;
      case 'priority': key = item.priority || 'No Priority'; break;
      case 'hub': key = item.hubLabel || 'Unknown'; break;
      case 'project': key = item.project || 'No Project'; break;
      case 'reporter': key = (item.reporter || item.assignee?.name || 'Unknown').trim(); break;
      case 'type': key = item.issueType || 'Unknown'; break;
      default: key = 'Other';
    }
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  });

  const entries = Array.from(map.entries());
  if (groupBy === 'priority') {
    entries.sort((a, b) => {
      const ai = PRIORITY_ORDER_FY.indexOf(a[0].toLowerCase());
      const bi = PRIORITY_ORDER_FY.indexOf(b[0].toLowerCase());
      return (ai >= 0 ? ai : 999) - (bi >= 0 ? bi : 999);
    });
  } else {
    entries.sort((a, b) => a[0].localeCompare(b[0]));
  }

  return entries.map(([label, items]) => ({ label, items }));
}

function ForYouGroupByPopover({
  value, onChange,
}: { value: ForYouGroupByKey; onChange: (v: ForYouGroupByKey) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = FY_GROUP_OPTIONS.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const isActive = value !== 'none';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          height: 32, padding: '0 10px', borderRadius: 6,
          border: isActive ? '1.5px solid #2563EB' : '1.5px solid #E2E8F0',
          background: isActive ? 'rgba(37,99,235,0.06)' : '#FFFFFF',
          color: isActive ? '#2563EB' : '#0F172A',
          fontSize: 13, fontWeight: 500, cursor: 'pointer',
          fontFamily: "'Inter', sans-serif",
          transition: 'all 150ms',
        }}
      >
        <Layers size={14} />
        Group
        {isActive && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            minWidth: 18, height: 18, borderRadius: 9,
            background: '#2563EB', color: '#FFFFFF', fontSize: 10, fontWeight: 700,
          }}>1</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100,
          width: 280, background: '#FFFFFF',
          border: '1px solid #E2E8F0', borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search grouping options"
                autoFocus
                style={{
                  width: '100%', height: 32, paddingLeft: 28, paddingRight: 8,
                  border: '1.5px solid #E2E8F0', borderRadius: 6,
                  fontSize: 13, color: '#0F172A', background: '#FFFFFF',
                  outline: 'none', fontFamily: "'Inter', sans-serif",
                }}
                onFocus={e => (e.currentTarget.style.borderColor = '#2563EB')}
                onBlur={e => (e.currentTarget.style.borderColor = '#E2E8F0')}
              />
            </div>
          </div>

          <div style={{ padding: '4px 0', maxHeight: 240, overflowY: 'auto' }}>
            <div style={{ padding: '4px 12px 2px', fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              All fields
            </div>
            {filtered.map(opt => {
              const isSelected = value === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => { onChange(isSelected ? 'none' : opt.key); setOpen(false); setSearch(''); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    height: 36, padding: '0 12px',
                    border: 'none', background: isSelected ? 'rgba(37,99,235,0.06)' : 'transparent',
                    color: isSelected ? '#2563EB' : '#0F172A',
                    fontSize: 14, fontWeight: isSelected ? 500 : 400,
                    cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                    borderLeft: isSelected ? '3px solid #2563EB' : '3px solid transparent',
                    transition: 'background 100ms',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  {opt.label}
                  {isSelected && <Check size={14} style={{ marginLeft: 'auto', color: '#2563EB' }} />}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ padding: '12px', textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>No results</div>
            )}
          </div>

          {isActive && (
            <div style={{ padding: '6px 12px', borderTop: '1px solid #F1F5F9' }}>
              <button
                onClick={() => { onChange('none'); setOpen(false); }}
                style={{
                  border: 'none', background: 'transparent', color: '#94A3B8',
                  fontSize: 13, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                  padding: '4px 0',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#2563EB')}
                onMouseLeave={e => (e.currentTarget.style.color = '#94A3B8')}
              >
                Clear selection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<Record<string, string[]>>({});
  const avatarsByName = useProfileAvatarsByName();
  const [fyGroupBy, setFyGroupBy] = useState<ForYouGroupByKey>('none');

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => setIsInitialLoad(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  useEffect(() => { setCurrentPage(1); }, [activeTab, searchQuery, inlineFilters]);

  // Shift+F global shortcut to toggle filter panel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'F') {
        e.preventDefault();
        setFilterPanelOpen(v => !v);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const totalItems = workItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const projectOptions = React.useMemo(() => [...new Set(workItems.map(i => i.project).filter(Boolean))].sort(), [workItems]);
  const hubOptions = React.useMemo(() => [...new Set(workItems.map(i => i.hubLabel).filter(Boolean))].sort(), [workItems]);
  const reportedByOptions = React.useMemo(() => [...new Set(workItems.map(i => i.reporter || i.assignee.name).filter(Boolean))].sort(), [workItems]);

  // Build filter categories for JiraBasicFilter panel
  const filterCategories = React.useMemo<FilterCategory[]>(() => {
    const getInitials = (name: string) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const PALETTE = ['#1868DB', '#E2631E', '#5E4DB2', '#1B3459', '#0D7C66', '#B34D00', '#943A79', '#0055CC'];
    const pickColor = (name: string) => { let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h); return PALETTE[Math.abs(h) % PALETTE.length]; };
    const HUB_ICONS: Record<string, React.ReactNode> = {
      Incident: <AlertTriangleIcon size={14} color="#FF5630" strokeWidth={2} />,
      Product: <LayoutGrid size={14} color="#6554C0" strokeWidth={2} />,
      Project: <Folder size={14} color="#2563EB" strokeWidth={2} />,
      Task: <CheckSquare size={14} color="#4BADE8" strokeWidth={2} />,
      Plan: <BookOpen size={14} color="#0D9488" strokeWidth={2} />,
      Strategy: <Zap size={14} color="#D97706" strokeWidth={2} />,
    };
    const PRIORITY_ICONS: Record<string, React.ReactNode> = {
      Critical: <PriorityBars priority="critical" />,
      Highest: <PriorityBars priority="critical" />,
      High: <PriorityBars priority="high" />,
      Medium: <PriorityBars priority="medium" />,
      Low: <PriorityBars priority="low" />,
      Lowest: <PriorityBars priority="low" />,
    };
    return [
      {
        id: 'project', label: 'Project', searchPlaceholder: 'Search project',
        options: projectOptions.map(p => ({
          id: p, label: p,
          iconNode: <Folder size={14} color="#6B778C" strokeWidth={1.5} />,
        })),
      },
      {
        id: 'hub', label: 'Hub', searchPlaceholder: 'Search hub',
        options: hubOptions.map(h => ({
          id: h, label: h + ' Hub',
          iconNode: HUB_ICONS[h] || <LayoutGrid size={14} color="#6B778C" strokeWidth={2} />,
        })),
      },
      {
        id: 'reporter', label: 'Reporter', searchPlaceholder: 'Search reporter',
        options: reportedByOptions.map(name => {
          const avatarUrl = avatarsByName.get(name.toLowerCase());
          return {
            id: name, label: name,
            ...(avatarUrl
              ? { avatarUrl, avatarType: 'photo' as const }
              : { avatarInitials: getInitials(name), avatarColor: pickColor(name), avatarType: 'initials' as const }),
          };
        }),
      },
      {
        id: 'status', label: 'Status', searchPlaceholder: 'Search status',
        options: [...new Set(workItems.map(i => i.status).filter(Boolean))].sort().map(s => ({
          id: s, label: s,
          iconNode: <StatusLozenge status={s} />,
          hideLabel: true,
        })),
      },
      {
        id: 'priority', label: 'Priority', searchPlaceholder: 'Search priority',
        options: (() => {
          const canonical = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];
          const seen = new Set<string>();
          workItems.forEach(i => {
            if (!i.priority) return;
            const norm = i.priority.charAt(0).toUpperCase() + i.priority.slice(1).toLowerCase();
            if (canonical.includes(norm)) seen.add(norm);
          });
          return canonical.filter(p => seen.has(p)).map(p => ({
            id: p, label: p,
            iconNode: PRIORITY_ICONS[p],
          }));
        })(),
      },
      {
        id: 'type', label: 'Type', searchPlaceholder: 'Search issue type',
        options: [...new Set(workItems.map(i => i.issueType).filter(Boolean))]
          .filter(t => t !== 'planner_task' && t !== 'Change Request')
          .sort()
          .map(t => ({ id: t, label: t, iconNode: <JiraIssueTypeIcon issueType={t} size={16} /> })),
      },
    ];
  }, [projectOptions, hubOptions, reportedByOptions, workItems, avatarsByName]);

  const advancedFilterCount = Object.values(advancedFilters).flat().length;

  const handleAdvancedFilterChange = useCallback((categoryId: string, optionIds: string[]) => {
    setAdvancedFilters(prev => ({ ...prev, [categoryId]: optionIds }));
  }, []);

  const handleClearAllFilters = useCallback(() => {
    setAdvancedFilters({});
  }, []);

  const handleCloseFilterPanel = useCallback(() => {
    setFilterPanelOpen(false);
  }, []);

  const filteredGroupedItems = React.useMemo(() => {
    const filterItem = (item: typeof workItems[0]) => {
      // Inline filters
      if (inlineFilters.project && item.project !== inlineFilters.project) return false;
      if (inlineFilters.hub && item.hubLabel !== inlineFilters.hub) return false;
      if (inlineFilters.reportedBy) {
        const reporter = item.reporter || item.assignee.name;
        if (reporter !== inlineFilters.reportedBy) return false;
      }
      // Advanced panel filters (multi-select — item must match at least one selected)
      const af = advancedFilters;
      if (af.project?.length && !af.project.includes(item.project)) return false;
      if (af.hub?.length && !af.hub.includes(item.hubLabel)) return false;
      if (af.reporter?.length) {
        const reporter = item.reporter || item.assignee.name;
        if (!af.reporter.includes(reporter)) return false;
      }
      if (af.status?.length && !af.status.includes(item.status)) return false;
      if (af.priority?.length) {
        const normPri = item.priority.charAt(0).toUpperCase() + item.priority.slice(1).toLowerCase();
        if (!af.priority.includes(item.priority) && !af.priority.includes(normPri)) return false;
      }
      if (af.type?.length && !af.type.includes(item.issueType)) return false;
      return true;
    };
    return {
      YESTERDAY: groupedItems.YESTERDAY.filter(filterItem),
      THIS_WEEK: groupedItems.THIS_WEEK.filter(filterItem),
      EARLIER: groupedItems.EARLIER.filter(filterItem),
    };
  }, [groupedItems, inlineFilters, advancedFilters]);

  // Compute custom groups when groupBy is active
  const fyCustomGroups = useMemo(() => {
    if (fyGroupBy === 'none') return undefined;
    const allItems = [
      ...filteredGroupedItems.YESTERDAY,
      ...filteredGroupedItems.THIS_WEEK,
      ...filteredGroupedItems.EARLIER,
    ];
    return groupForYouItems(allItems, fyGroupBy);
  }, [filteredGroupedItems, fyGroupBy]);

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

        {/* Status Summary + Filter — single row */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '10px 0', marginBottom: 12, borderBottom: '1px solid var(--cp-bd)', gap: 16 }}>
          <StatusSummaryBar
            items={[
              ...filteredGroupedItems.YESTERDAY,
              ...filteredGroupedItems.THIS_WEEK,
              ...filteredGroupedItems.EARLIER,
            ]}
            filterSlot={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ position: 'relative' }}>
                  <FilterTriggerButton
                    count={advancedFilterCount}
                    onClick={() => setFilterPanelOpen(v => !v)}
                    isOpen={filterPanelOpen}
                  />
                  {filterPanelOpen && (
                    <JiraBasicFilter
                      categories={filterCategories}
                      selected={advancedFilters}
                      onSelectionChange={handleAdvancedFilterChange}
                      onClearAll={handleClearAllFilters}
                      onClose={handleCloseFilterPanel}
                    />
                  )}
                </div>
                <ForYouGroupByPopover value={fyGroupBy} onChange={setFyGroupBy} />
              </div>
            }
          />
        </div>

        {/* Table */}
        {isLoading ? (
          <ForYouTableSkeleton rowCount={5} />
        ) : (
          <>
            <ForYouTable
              groupedItems={filteredGroupedItems}
              customGroups={fyCustomGroups}
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

      {/* Detail Modal — lazy loaded */}
      {selectedItem && selectedItem.phIssueId && selectedItem.projectId && (
        <Suspense fallback={null}>
          <StoryDetailModal
            isOpen={true}
            onClose={closeDetailPanel}
            itemId={selectedItem.phIssueId}
            projectId={selectedItem.projectId}
            projectKey={selectedItem.projectKey || ''}
          />
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
