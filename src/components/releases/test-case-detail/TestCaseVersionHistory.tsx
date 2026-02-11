/**
 * Test Case Version History Component — Shows version changes from DB
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  GitCommit, 
  Clock, 
  RotateCcw,
  ChevronRight,
  Loader2,
  GitCompare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useParams } from 'react-router-dom';
import { useTestCaseVersions, useRestoreTestCaseVersion, type TestCaseVersion } from '@/hooks/test-management/useTestCaseVersions';
import { VersionDiffView } from '@/components/testhub/versioning/VersionDiffView';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';

function getInitials(name: string | null | undefined): string {
  if (!name) return 'U';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatTimestamp(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return 'Unknown';
  }
}

function getVersionChanges(version: TestCaseVersion): string[] {
  const changes: string[] = [];
  if (version.change_summary) {
    changes.push(version.change_summary);
  } else {
    changes.push(`Version ${version.version_number} snapshot`);
  }
  if (version.snapshot?.steps) {
    changes.push(`${version.snapshot.steps.length} steps`);
  }
  return changes;
}

interface TestCaseVersionHistoryProps {
  testCaseId?: string;
  currentVersion?: number;
}

export function TestCaseVersionHistory({ testCaseId: propTestCaseId, currentVersion = 1 }: TestCaseVersionHistoryProps) {
  const { id: routeId } = useParams<{ id: string }>();
  const testCaseId = propTestCaseId || routeId;
  const [showDiff, setShowDiff] = useState(false);
  
  const { data: versions = [], isLoading } = useTestCaseVersions(testCaseId);
  const restoreMutation = useRestoreTestCaseVersion();

  const handleRestoreVersion = async (versionNumber: number) => {
    if (!testCaseId) return;
    await restoreMutation.mutateAsync({
      testCaseId,
      versionNumber,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-lg bg-muted/30">
        <GitCommit className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-2">No version history yet</p>
        <p className="text-sm text-muted-foreground">Version snapshots are created automatically when changes are saved.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitCommit className="w-4 h-4 text-muted-foreground" />
          <h4 className="font-medium text-foreground">Version History</h4>
        </div>
        <Badge variant="outline" className="text-xs">
          {versions.length} version{versions.length !== 1 ? 's' : ''}
        </Badge>
        {versions.length >= 2 && (
          <Button variant="outline" size="sm" onClick={() => setShowDiff(true)} className="ml-2">
            <GitCompare className="w-3.5 h-3.5 mr-1" />
            Compare
          </Button>
        )}
      </div>

      {/* Version Timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[18px] top-6 bottom-6 w-0.5 bg-border" />

        <div className="space-y-4">
          {versions.map((version, index) => {
            const isCurrent = version.version_number === currentVersion;
            const changes = getVersionChanges(version);
            const authorName = version.changed_by_profile?.full_name || 'Unknown User';
            
            return (
              <motion.div
                key={version.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "relative flex gap-4 p-3 rounded-lg transition-colors",
                  isCurrent ? 'bg-primary/5 border border-primary/20' : 'hover:bg-muted/50'
                )}
              >
                {/* Version marker */}
                <div className={cn(
                  "relative z-10 flex items-center justify-center w-9 h-9 rounded-full border-2 flex-shrink-0",
                  isCurrent 
                    ? 'bg-primary border-primary text-primary-foreground' 
                    : 'bg-background border-border text-muted-foreground'
                )}>
                  <span className="text-xs font-semibold">v{version.version_number}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Avatar className="h-5 w-5">
                      {version.changed_by_profile?.avatar_url && (
                        <AvatarImage src={version.changed_by_profile.avatar_url} alt={authorName} />
                      )}
                      <AvatarFallback className="text-[10px] bg-blue-100 text-blue-700">
                        {getInitials(authorName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{authorName}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTimestamp(version.created_at)}
                    </span>
                    {isCurrent && (
                      <Badge className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-0">
                        Current
                      </Badge>
                    )}
                  </div>

                  <ul className="text-sm text-muted-foreground space-y-0.5">
                    {changes.map((change, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <ChevronRight className="w-3 h-3 mt-1 flex-shrink-0" />
                        {change}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Restore Action */}
                {!isCurrent && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <AlertDialog>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7"
                              disabled={restoreMutation.isPending}
                            >
                              {restoreMutation.isPending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent>Restore this version</TooltipContent>
                      </Tooltip>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Restore Version {version.version_number}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will replace the current test case content with the content from version {version.version_number}. 
                            The current state will be preserved as a new version before restoring.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleRestoreVersion(version.version_number)}>
                            Restore
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Version Diff Modal */}
      <VersionDiffView
        open={showDiff}
        onOpenChange={setShowDiff}
        versions={versions}
      />
    </div>
  );
}
