/**
 * Requirements Coverage Component — Shows linked requirements and coverage status
 */

import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  Circle, 
  ExternalLink,
  FileText,
  Link2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Lozenge, Tooltip } from '@/components/ads';
import type { LozengeAppearance } from '@/components/ads';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface Requirement {
  id: string;
  title: string;
  status: 'covered' | 'partial' | 'not_covered';
  testCaseCount: number;
  priority: 'must' | 'should' | 'could';
}

interface RequirementsCoverageProps {
  requirements?: Requirement[];
}

const defaultRequirements: Requirement[] = [
  { 
    id: 'REQ-042', 
    title: 'User must be able to authenticate with valid credentials', 
    status: 'covered',
    testCaseCount: 3,
    priority: 'must'
  },
  { 
    id: 'REQ-043', 
    title: 'System must show appropriate error messages for invalid login', 
    status: 'covered',
    testCaseCount: 2,
    priority: 'must'
  },
  { 
    id: 'REQ-044', 
    title: 'Session should timeout after 30 minutes of inactivity', 
    status: 'partial',
    testCaseCount: 1,
    priority: 'should'
  },
  { 
    id: 'REQ-045', 
    title: 'User could save login credentials for future sessions', 
    status: 'not_covered',
    testCaseCount: 0,
    priority: 'could'
  },
];

const statusConfig = {
  covered: { 
    icon: CheckCircle2, 
    className: 'text-green-600',
    label: 'Fully Covered',
    bgClass: 'bg-green-50 border-green-200'
  },
  partial: { 
    icon: AlertCircle, 
    className: 'text-yellow-600',
    label: 'Partially Covered',
    bgClass: 'bg-yellow-50 border-yellow-200'
  },
  not_covered: { 
    icon: Circle, 
    className: 'text-gray-400',
    label: 'Not Covered',
    bgClass: 'bg-gray-50 border-gray-200'
  },
};

const priorityConfig: Record<Requirement['priority'], { appearance: LozengeAppearance }> = {
  must: { appearance: 'removed' },
  should: { appearance: 'inprogress' },
  could: { appearance: 'default' },
};

export function RequirementsCoverage({ requirements = defaultRequirements }: RequirementsCoverageProps) {
  const coveredCount = requirements.filter(r => r.status === 'covered').length;
  const partialCount = requirements.filter(r => r.status === 'partial').length;
  const coveragePercent = requirements.length > 0 
    ? Math.round(((coveredCount + partialCount * 0.5) / requirements.length) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Coverage Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <h4 className="font-medium text-foreground">Requirements Coverage</h4>
        </div>
        <Button variant="outline" size="sm" className="h-7 text-xs">
          <Link2 className="w-3 h-3 mr-1.5" />
          Link Requirement
        </Button>
      </div>

      {/* Coverage Progress */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Overall Coverage</span>
          <span className={cn(
            "text-sm font-semibold",
            coveragePercent >= 80 ? 'text-green-600' : 
            coveragePercent >= 50 ? 'text-yellow-600' : 'text-red-600'
          )}>
            {coveragePercent}%
          </span>
        </div>
        <Progress value={coveragePercent} className="h-2" />
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            {coveredCount} Covered
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            {partialCount} Partial
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-gray-300" />
            {requirements.length - coveredCount - partialCount} Not Covered
          </span>
        </div>
      </div>

      {/* Requirements List */}
      <div className="space-y-2">
        {requirements.map((req, index) => {
          const status = statusConfig[req.status];
          const StatusIcon = status.icon;
          const priority = priorityConfig[req.priority];

          return (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-colors hover:shadow-sm cursor-pointer",
                status.bgClass
              )}
            >
              <Tooltip content={status.label}>
                <StatusIcon className={cn("w-5 h-5 flex-shrink-0", status.className)} />
              </Tooltip>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-primary font-semibold">{req.id}</span>
                  <Lozenge appearance={priority.appearance}>
                    {req.priority.toUpperCase()}
                  </Lozenge>
                </div>
                <p className="text-sm text-foreground truncate mt-0.5">{req.title}</p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-muted-foreground">
                  {req.testCaseCount} test{req.testCaseCount !== 1 ? 's' : ''}
                </span>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
