/**
 * Test Case Execution History Component
 */

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, MinusCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ExecutionHistoryItem } from '@/data/testCaseDetailData';

interface TestCaseExecutionHistoryProps {
  history: ExecutionHistoryItem[];
}

const statusConfig = {
  passed: { icon: CheckCircle, className: 'text-green-600' },
  failed: { icon: XCircle, className: 'text-red-600' },
  blocked: { icon: MinusCircle, className: 'text-yellow-600' },
  not_run: { icon: MinusCircle, className: 'text-gray-400' },
};

export function TestCaseExecutionHistory({ history }: TestCaseExecutionHistoryProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Execution History</h3>
        <span className="text-sm text-muted-foreground">{history.length} executions</span>
      </div>

      <div className="space-y-2">
        {history.map((exec, index) => {
          const status = statusConfig[exec.status];
          const StatusIcon = status.icon;

          return (
            <motion.div
              key={exec.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
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
                  Executed by {exec.executor} · {exec.duration}
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
      </div>

      {history.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No execution history yet
        </div>
      )}
    </div>
  );
}
