// ============================================================
// WORKSTREAMS PAGE
// Main page for viewing all workstreams with health and stats
// ============================================================

import { useNavigate } from 'react-router-dom';
import { Layers, RefreshCw, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useWorkstreamsSummary } from './useWorkstreamsSummary';
import { WorkstreamsSummaryBar } from './WorkstreamsSummaryBar';
import { WorkstreamCard } from './WorkstreamCard';
import { motion } from 'framer-motion';

export function WorkstreamsPage() {
  const navigate = useNavigate();
  const { data, isLoading, refetch, isRefetching } = useWorkstreamsSummary();

  const handleWorkstreamClick = (workstreamId: string, workstreamName: string) => {
    // Navigate to task list filtered by this workstream
    navigate(`/planner/task-list?workstream=${encodeURIComponent(workstreamId)}`);
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
                Track-level overview and health
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

            {/* Workstream Grid */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-4">
                All Workstreams
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {data.workstreams.map((ws, index) => (
                  <WorkstreamCard
                    key={ws.id}
                    workstream={ws}
                    index={index}
                    onClick={() => handleWorkstreamClick(ws.id, ws.name)}
                  />
                ))}
              </div>
            </motion.div>

            {data.workstreams.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                  <Layers className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  No Workstreams Yet
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                  Workstreams help you organize tasks by team or track. Create your first workstream to get started.
                </p>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
