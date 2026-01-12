/**
 * Test Case Execution History Component
 * Enhanced with summary card and improved visuals
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  XCircle, 
  MinusCircle, 
  ExternalLink, 
  Filter,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { ExecutionSummaryCard } from './ExecutionSummaryCard';
import type { ExecutionHistoryItem } from '@/data/testCaseDetailData';

interface TestCaseExecutionHistoryProps {
  history: ExecutionHistoryItem[];
}

const statusConfig = {
  passed: { icon: CheckCircle, className: 'text-green-600', bgClass: 'bg-green-50' },
  failed: { icon: XCircle, className: 'text-red-600', bgClass: 'bg-red-50' },
  blocked: { icon: MinusCircle, className: 'text-yellow-600', bgClass: 'bg-yellow-50' },
  not_run: { icon: MinusCircle, className: 'text-gray-400', bgClass: 'bg-gray-50' },
};

type StatusFilter = 'all' | 'passed' | 'failed' | 'blocked';

export function TestCaseExecutionHistory({ history }: TestCaseExecutionHistoryProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showSummary, setShowSummary] = useState(true);

  const filteredHistory = statusFilter === 'all' 
    ? history 
    : history.filter(h => h.status === statusFilter);

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <AnimatePresence>
        {showSummary && history.length > 0 && (
          <ExecutionSummaryCard history={history} />
        )}
      </AnimatePresence>

      {/* Header with Filters */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-foreground">Execution History</h3>
          <Badge variant="outline" className="text-xs">
            {filteredHistory.length} of {history.length}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => setShowSummary(!showSummary)}
          >
            {showSummary ? 'Hide' : 'Show'} Summary
            <ChevronDown className={cn(
              "w-3 h-3 ml-1 transition-transform",
              showSummary && "rotate-180"
            )} />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Filter className="w-3.5 h-3.5 mr-1.5" />
                {statusFilter === 'all' ? 'All Statuses' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuCheckboxItem
                checked={statusFilter === 'all'}
                onCheckedChange={() => setStatusFilter('all')}
              >
                All Statuses
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter === 'passed'}
                onCheckedChange={() => setStatusFilter('passed')}
              >
                <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                Passed
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter === 'failed'}
                onCheckedChange={() => setStatusFilter('failed')}
              >
                <XCircle className="w-4 h-4 mr-2 text-red-600" />
                Failed
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter === 'blocked'}
                onCheckedChange={() => setStatusFilter('blocked')}
              >
                <MinusCircle className="w-4 h-4 mr-2 text-yellow-600" />
                Blocked
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* History List */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {filteredHistory.map((exec, index) => {
            const status = statusConfig[exec.status];
            const StatusIcon = status.icon;

            return (
              <motion.div
                key={exec.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.03 }}
                className={cn(
                  "flex items-center gap-4 p-3 rounded-lg border border-border hover:shadow-sm transition-all",
                  status.bgClass
                )}
              >
                {/* Status Icon */}
                <StatusIcon className={cn('w-5 h-5 flex-shrink-0', status.className)} />

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/releases/execution/${exec.cycleId}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {exec.cycleId}
                    </Link>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-sm text-muted-foreground">{exec.cycleName}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Executed by <span className="font-medium">{exec.executor}</span> · {exec.duration}
                  </div>
                </div>

                {/* Timestamp */}
                <span className="text-sm text-muted-foreground flex-shrink-0">
                  {exec.timestamp}
                </span>

                {/* View Link */}
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredHistory.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8 text-muted-foreground"
        >
          {statusFilter !== 'all' 
            ? `No ${statusFilter} executions found` 
            : 'No execution history yet'}
        </motion.div>
      )}
    </div>
  );
}
