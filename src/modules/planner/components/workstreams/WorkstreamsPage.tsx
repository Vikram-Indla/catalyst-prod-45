// ============================================================
// WORKSTREAMS PAGE
// Main page for viewing all workstreams with health and stats
// V9 GOD-TIER: Enhanced with toolbar, detail panel, improved layout
// ============================================================

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, RefreshCw, Plus, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useWorkstreamsSummary } from './useWorkstreamsSummary';
import { WorkstreamsSummaryBar } from './WorkstreamsSummaryBar';
import { WorkstreamsToolbar } from './WorkstreamsToolbar';
import { WorkstreamCard } from './WorkstreamCard';
import { WorkstreamDetailPanel } from './WorkstreamDetailPanel';
import { CreateTaskModal } from '../kanban';
import { motion } from 'framer-motion';
import type { WorkstreamData } from './types';

type HealthFilter = 'all' | 'healthy' | 'at-risk' | 'critical';

export function WorkstreamsPage() {
  const navigate = useNavigate();
  const { data, isLoading, refetch, isRefetching } = useWorkstreamsSummary();
  
  // State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('all');
  const [selectedWorkstream, setSelectedWorkstream] = useState<WorkstreamData | null>(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);

  // Filter workstreams
  const filteredWorkstreams = useMemo(() => {
    if (!data?.workstreams) return [];
    
    return data.workstreams.filter(ws => {
      const matchesSearch = searchQuery === '' ||
        ws.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ws.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesHealth = healthFilter === 'all' || ws.health === healthFilter;
      return matchesSearch && matchesHealth;
    });
  }, [data?.workstreams, searchQuery, healthFilter]);

  const handleWorkstreamClick = (workstream: WorkstreamData) => {
    setSelectedWorkstream(workstream);
    setIsDetailPanelOpen(true);
  };

  const handleViewTasks = (workstreamId: string) => {
    navigate(`/planner/task-list?workstream=${encodeURIComponent(workstreamId)}`);
  };

  const handleCloseDetailPanel = () => {
    setIsDetailPanelOpen(false);
    // Delay clearing workstream to allow animation
    setTimeout(() => setSelectedWorkstream(null), 300);
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Header */}
      <div
        className="shrink-0 px-6 py-4 border-b border-slate-200 dark:border-slate-700"
        style={{ backgroundColor: 'var(--planner-bg, #f8fafc)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Workstreams
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Track-level overview and health monitoring
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="gap-2"
            >
              <RefreshCw className={cn('w-4 h-4', isRefetching && 'animate-spin')} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25"
            >
              <Plus className="w-4 h-4" />
              Add Task
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div
        className="flex-1 overflow-y-auto p-6"
        style={{ backgroundColor: 'var(--planner-bg, #f8fafc)' }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-slate-500">Loading workstreams...</span>
            </div>
          </div>
        ) : data ? (
          <>
            {/* Summary Bar */}
            <WorkstreamsSummaryBar summary={data.summary} />

            {/* Toolbar */}
            <WorkstreamsToolbar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              healthFilter={healthFilter}
              onHealthFilterChange={setHealthFilter}
              totalCount={filteredWorkstreams.length}
            />

            {/* Workstream Grid */}
            {filteredWorkstreams.length > 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-4">
                  {healthFilter === 'all' ? 'All Workstreams' : `${healthFilter.replace('-', ' ')} Workstreams`}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredWorkstreams.map((ws, index) => (
                    <WorkstreamCard
                      key={ws.id}
                      workstream={ws}
                      index={index}
                      onClick={() => handleWorkstreamClick(ws)}
                      onViewTasks={() => handleViewTasks(ws.id)}
                    />
                  ))}
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                  <Layers className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  {searchQuery || healthFilter !== 'all' ? 'No Matching Workstreams' : 'No Workstreams Yet'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-4">
                  {searchQuery || healthFilter !== 'all'
                    ? 'Try adjusting your search or filters to find workstreams.'
                    : 'Workstreams help you organize tasks by team or track. Create your first workstream to get started.'}
                </p>
                {(searchQuery || healthFilter !== 'all') && (
                  <Button
                    variant="outline"
                    onClick={() => { setSearchQuery(''); setHealthFilter('all'); }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            )}

            {/* Total Count */}
            {data.workstreams.length > 0 && filteredWorkstreams.length > 0 && (
              <div className="mt-6 text-center text-sm text-slate-500">
                Showing {filteredWorkstreams.length} of {data.workstreams.length} workstreams
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Detail Panel */}
      <WorkstreamDetailPanel
        workstream={selectedWorkstream}
        open={isDetailPanelOpen}
        onClose={handleCloseDetailPanel}
      />

      {/* Create Task Modal */}
      <CreateTaskModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />
    </div>
  );
}
