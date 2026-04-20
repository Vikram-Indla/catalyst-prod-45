/**
 * TestCasesGrid — Card grid view for test cases with selection support
 */

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ListChecks, Check } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { TestCase } from '@/types/test-cases';
import { TypeBadge, PriorityBadge, StatusBadge, LastRunBadge } from './badges';
import { cn } from '@/lib/utils';

interface TestCasesGridProps {
  testCases: TestCase[];
  selectedIds?: Set<string>;
  onSelectRow?: (id: string, checked: boolean) => void;
  onCardClick?: (testCase: TestCase) => void;
}

// Avatar colors
const avatarColors: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  purple: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  teal: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export function TestCasesGrid({ testCases, selectedIds, onSelectRow, onCardClick }: TestCasesGridProps) {
  const hasSelection = !!selectedIds && !!onSelectRow;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {testCases.map((tc, index) => {
        const isSelected = hasSelection && selectedIds.has(tc.id);
        
        return (
          <motion.div
            key={tc.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "relative bg-background border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer group",
              isSelected 
                ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
                : "hover:border-primary/30"
            )}
            onClick={() => onCardClick?.(tc)}
          >
            {/* Selection Checkbox */}
            {hasSelection && (
              <div 
                className={cn(
                  "absolute top-3 left-3 transition-opacity",
                  isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => onSelectRow(tc.id, !!checked)}
                  className="bg-background"
                />
              </div>
            )}

            {/* Header */}
            <div className={cn("flex items-center justify-between mb-2", hasSelection && "pl-7")}>
              <Link 
                to={`/releases/test-cases/${tc.id}`}
                className="text-sm font-mono text-primary font-medium group-hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {tc.id}
              </Link>
              <div className="flex items-center gap-1.5">
                <TypeBadge type={tc.type} size="sm" />
                <PriorityBadge priority={tc.priority} showLabel={false} size="sm" />
              </div>
            </div>
            
            {/* Title */}
            <Link to={`/releases/test-cases/${tc.id}`}>
              <h3 className="font-medium text-foreground mb-3 line-clamp-2 text-sm leading-snug hover:text-primary transition-colors">
                {tc.title}
              </h3>
            </Link>
            
            {/* Stats Row */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <ListChecks className="w-3.5 h-3.5" />
                <span>{tc.steps} steps</span>
              </div>
              <LastRunBadge status={tc.lastRun} size="sm" />
              <StatusBadge status={tc.status} size="sm" />
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

            {/* Selected Overlay */}
            {isSelected && (
              <div className="absolute top-3 right-3">
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
