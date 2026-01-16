/**
 * CompleteView - Summary screen after all steps are done
 */

import { motion } from 'framer-motion';
import { Check, X, AlertTriangle, Bug, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CompleteViewProps {
  testCaseId: string;
  testCaseTitle: string;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  onLogDefect: () => void;
  onNextTest: () => void;
  hasNextTest: boolean;
}

export function CompleteView({
  testCaseId,
  testCaseTitle,
  passed,
  failed,
  blocked,
  skipped,
  onLogDefect,
  onNextTest,
  hasNextTest,
}: CompleteViewProps) {
  // Determine overall result
  const getOverallResult = () => {
    if (failed > 0) return 'failed';
    if (blocked > 0) return 'blocked';
    return 'passed';
  };
  
  const result = getOverallResult();
  
  const resultConfig = {
    passed: {
      icon: Check,
      title: 'Test Passed',
      bgColor: 'bg-green-100 dark:bg-green-950/50',
      iconColor: 'text-green-600',
      borderColor: 'border-green-200 dark:border-green-800',
    },
    failed: {
      icon: X,
      title: 'Test Failed',
      bgColor: 'bg-red-100 dark:bg-red-950/50',
      iconColor: 'text-red-600',
      borderColor: 'border-red-200 dark:border-red-800',
    },
    blocked: {
      icon: AlertTriangle,
      title: 'Test Blocked',
      bgColor: 'bg-amber-100 dark:bg-amber-950/50',
      iconColor: 'text-amber-600',
      borderColor: 'border-amber-200 dark:border-amber-800',
    },
  };
  
  const config = resultConfig[result];
  const Icon = config.icon;
  
  return (
    <div className="flex-1 flex items-center justify-center py-8 px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          'w-full max-w-[500px] rounded-2xl border-2 p-8 text-center',
          config.bgColor,
          config.borderColor
        )}
      >
        {/* Result Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 400, damping: 20 }}
          className={cn(
            'w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center',
            result === 'passed' && 'bg-green-200 dark:bg-green-900',
            result === 'failed' && 'bg-red-200 dark:bg-red-900',
            result === 'blocked' && 'bg-amber-200 dark:bg-amber-900'
          )}
        >
          <Icon className={cn('w-10 h-10', config.iconColor)} />
        </motion.div>
        
        {/* Title */}
        <h2 className="text-2xl font-bold text-foreground mb-2">{config.title}</h2>
        
        {/* Test Case Info */}
        <p className="text-muted-foreground mb-6">
          {testCaseId}: {testCaseTitle}
        </p>
        
        {/* Stats */}
        <div className="flex items-center justify-center gap-6 mb-8">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm font-medium">{passed} Passed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-sm font-medium">{failed} Failed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-sm font-medium">{blocked} Blocked</span>
          </div>
          {skipped > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-slate-400" />
              <span className="text-sm font-medium">{skipped} Skipped</span>
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex items-center justify-center gap-4">
          {failed > 0 && (
            <Button variant="outline" onClick={onLogDefect}>
              <Bug className="w-4 h-4 mr-2" />
              Log Defect
            </Button>
          )}
          
          {hasNextTest && (
            <Button onClick={onNextTest} className="bg-primary hover:bg-primary/90">
              Next Test
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
