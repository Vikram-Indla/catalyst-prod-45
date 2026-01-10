/**
 * TestCasesGrid — Card grid view for test cases
 */

import { motion } from 'framer-motion';
import { 
  AlertTriangle,
  ArrowUp,
  Minus,
  ArrowDown,
  CheckCircle2,
  XCircle,
  Circle,
  ListChecks,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { TestCase } from '@/data/testCasesData';
import { cn } from '@/lib/utils';

interface TestCasesGridProps {
  testCases: TestCase[];
}

// Type badge variants
const typeStyles: Record<string, string> = {
  functional: 'bg-[#dbeafe] text-[#2563eb] border-[#93c5fd]',
  regression: 'bg-[#ede9fe] text-[#7c3aed] border-[#c4b5fd]',
  smoke: 'bg-[#ffedd5] text-[#c2410c] border-[#fdba74]',
  integration: 'bg-[#ccfbf1] text-[#0d9488] border-[#5eead4]',
  e2e: 'bg-[#e0e7ff] text-[#4338ca] border-[#a5b4fc]',
};

// Status badge variants
const statusVariants: Record<string, 'draft' | 'ready' | 'approved' | 'deprecated'> = {
  draft: 'draft',
  ready: 'ready',
  approved: 'approved',
  deprecated: 'deprecated',
};

// Avatar colors
const avatarColors: Record<string, string> = {
  blue: 'bg-[#dbeafe] text-[#2563eb]',
  green: 'bg-[#d1fae5] text-[#059669]',
  purple: 'bg-[#ede9fe] text-[#7c3aed]',
  orange: 'bg-[#ffedd5] text-[#c2410c]',
  teal: 'bg-[#ccfbf1] text-[#0d9488]',
  red: 'bg-[#fee2e2] text-[#dc2626]',
};

function PriorityIcon({ priority }: { priority: TestCase['priority'] }) {
  const iconClass = "w-4 h-4";
  switch (priority) {
    case 'critical':
      return <AlertTriangle className={cn(iconClass, "text-[#dc2626]")} />;
    case 'high':
      return <ArrowUp className={cn(iconClass, "text-[#ea580c]")} />;
    case 'medium':
      return <Minus className={cn(iconClass, "text-[#ca8a04]")} />;
    case 'low':
      return <ArrowDown className={cn(iconClass, "text-muted-foreground")} />;
  }
}

function LastRunBadge({ status, size = 'default' }: { status: TestCase['lastRun']; size?: 'sm' | 'default' }) {
  const sizeClass = size === 'sm' ? 'text-[10px] px-1.5 py-0' : '';
  switch (status) {
    case 'passed':
      return (
        <Badge variant="passed" size={size === 'sm' ? 'sm' : 'default'} className={cn("gap-0.5", sizeClass)}>
          <CheckCircle2 className="w-3 h-3" />
          Passed
        </Badge>
      );
    case 'failed':
      return (
        <Badge variant="failed" size={size === 'sm' ? 'sm' : 'default'} className={cn("gap-0.5", sizeClass)}>
          <XCircle className="w-3 h-3" />
          Failed
        </Badge>
      );
    case 'not_run':
      return (
        <Badge variant="not-run" size={size === 'sm' ? 'sm' : 'default'} className={cn("gap-0.5", sizeClass)}>
          <Circle className="w-3 h-3" />
          Not Run
        </Badge>
      );
  }
}

export function TestCasesGrid({ testCases }: TestCasesGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {testCases.map((tc, index) => (
        <motion.div
          key={tc.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="bg-background border rounded-lg p-4 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-mono text-primary font-medium group-hover:underline">
              {tc.id}
            </span>
            <div className="flex items-center gap-1.5">
              <span className={cn(
                "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border",
                typeStyles[tc.type]
              )}>
                {tc.type.charAt(0).toUpperCase() + tc.type.slice(1)}
              </span>
              <PriorityIcon priority={tc.priority} />
            </div>
          </div>
          
          {/* Title */}
          <h3 className="font-medium text-foreground mb-3 line-clamp-2 text-sm leading-snug">
            {tc.title}
          </h3>
          
          {/* Stats Row */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ListChecks className="w-3.5 h-3.5" />
              <span>{tc.steps} steps</span>
            </div>
            <LastRunBadge status={tc.lastRun} size="sm" />
            <Badge variant={statusVariants[tc.status]} size="sm">
              {tc.status.charAt(0).toUpperCase() + tc.status.slice(1)}
            </Badge>
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t">
            <span className="text-xs text-muted-foreground font-mono">{tc.release}</span>
            <div className="flex items-center gap-2">
              <Avatar className="w-5 h-5">
                <AvatarFallback className={cn("text-[10px] font-medium", avatarColors[tc.assignee.color])}>
                  {tc.assignee.avatar}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">{tc.updated}</span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
