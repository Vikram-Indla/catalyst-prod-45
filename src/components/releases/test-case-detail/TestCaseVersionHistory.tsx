/**
 * Test Case Version History Component — Shows version changes
 */

import { motion } from 'framer-motion';
import { 
  GitCommit, 
  Clock, 
  User, 
  Eye, 
  RotateCcw,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface VersionEntry {
  version: number;
  timestamp: string;
  author: {
    name: string;
    avatar: string;
    color: string;
  };
  changes: string[];
  isCurrent?: boolean;
}

interface TestCaseVersionHistoryProps {
  versions?: VersionEntry[];
}

const defaultVersions: VersionEntry[] = [
  {
    version: 3,
    timestamp: '2 hours ago',
    author: { name: 'Vikram S.', avatar: 'VS', color: 'blue' },
    changes: ['Updated expected result for step 4', 'Added loading spinner verification'],
    isCurrent: true,
  },
  {
    version: 2,
    timestamp: '1 day ago',
    author: { name: 'Ahmed A.', avatar: 'AA', color: 'green' },
    changes: ['Added step 8 for console error check', 'Updated preconditions'],
  },
  {
    version: 1,
    timestamp: '1 week ago',
    author: { name: 'Vikram S.', avatar: 'VS', color: 'blue' },
    changes: ['Initial version created'],
  },
];

const avatarColors: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  purple: 'bg-purple-100 text-purple-700',
  orange: 'bg-orange-100 text-orange-700',
};

export function TestCaseVersionHistory({ versions = defaultVersions }: TestCaseVersionHistoryProps) {
  const handleViewVersion = (version: number) => {
    toast.info(`Viewing version ${version}...`);
  };

  const handleRestoreVersion = (version: number) => {
    toast.success(`Restored to version ${version}`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitCommit className="w-4 h-4 text-muted-foreground" />
          <h4 className="font-medium text-foreground">Version History</h4>
        </div>
        <Badge variant="outline" className="text-xs">
          {versions.length} versions
        </Badge>
      </div>

      {/* Version Timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[18px] top-6 bottom-6 w-0.5 bg-border" />

        <div className="space-y-4">
          {versions.map((entry, index) => (
            <motion.div
              key={entry.version}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "relative flex gap-4 p-3 rounded-lg transition-colors",
                entry.isCurrent ? 'bg-primary/5 border border-primary/20' : 'hover:bg-muted/50'
              )}
            >
              {/* Version marker */}
              <div className={cn(
                "relative z-10 flex items-center justify-center w-9 h-9 rounded-full border-2 flex-shrink-0",
                entry.isCurrent 
                  ? 'bg-primary border-primary text-primary-foreground' 
                  : 'bg-background border-border text-muted-foreground'
              )}>
                <span className="text-xs font-semibold">v{entry.version}</span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className={cn('text-[10px]', avatarColors[entry.author.color])}>
                      {entry.author.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{entry.author.name}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {entry.timestamp}
                  </span>
                  {entry.isCurrent && (
                    <Badge className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-0">
                      Current
                    </Badge>
                  )}
                </div>

                <ul className="text-sm text-muted-foreground space-y-0.5">
                  {entry.changes.map((change, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <ChevronRight className="w-3 h-3 mt-1 flex-shrink-0" />
                      {change}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Actions */}
              {!entry.isCurrent && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={() => handleViewVersion(entry.version)}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>View this version</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={() => handleRestoreVersion(entry.version)}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Restore this version</TooltipContent>
                  </Tooltip>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
