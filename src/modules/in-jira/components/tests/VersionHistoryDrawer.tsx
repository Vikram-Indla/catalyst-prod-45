/**
 * Version History Drawer
 * Shows version history with diff comparison for test cases
 */

import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  History,
  GitCompare,
  Clock,
  User,
  ChevronRight,
  ArrowRight,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTestCaseVersions, TestCaseVersion, VersionDiff } from '../../hooks/useTestCaseVersions';

interface VersionHistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string | null;
  caseTitle?: string;
}

export function VersionHistoryDrawer({
  open,
  onOpenChange,
  caseId,
  caseTitle,
}: VersionHistoryDrawerProps) {
  const {
    versions,
    isLoading,
    currentVersion,
    compareVersions,
    compareToCurrentVersion,
  } = useTestCaseVersions(caseId);

  const [selectedVersion, setSelectedVersion] = useState<TestCaseVersion | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareTarget, setCompareTarget] = useState<TestCaseVersion | null>(null);

  const handleSelectVersion = (version: TestCaseVersion) => {
    if (compareMode && selectedVersion) {
      setCompareTarget(version);
    } else {
      setSelectedVersion(version);
      setCompareTarget(null);
    }
  };

  const getDiffs = (): VersionDiff[] => {
    if (selectedVersion && compareTarget) {
      return compareVersions(selectedVersion, compareTarget);
    }
    if (selectedVersion && !compareTarget) {
      return compareToCurrentVersion(selectedVersion);
    }
    return [];
  };

  const diffs = getDiffs();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:max-w-[500px] p-0 bg-surface-1 border-border-default">
        <SheetHeader className="px-6 py-4 border-b border-border-default">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-lg text-text-primary flex items-center gap-2">
                <History className="h-5 w-5 text-accent-primary" />
                Version History
              </SheetTitle>
              {caseTitle && (
                <p className="text-sm text-text-tertiary mt-1 truncate max-w-[300px]">
                  {caseTitle}
                </p>
              )}
            </div>
            <Badge variant="outline" className="text-accent-primary">
              v{currentVersion}
            </Badge>
          </div>
        </SheetHeader>

        <div className="flex h-[calc(100vh-100px)]">
          {/* Version List */}
          <div className="w-1/2 border-r border-border-default">
            <div className="p-3 border-b border-border-default bg-surface-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
                  Versions ({versions.length})
                </span>
                <Button
                  size="sm"
                  variant={compareMode ? 'default' : 'outline'}
                  onClick={() => {
                    setCompareMode(!compareMode);
                    if (compareMode) {
                      setCompareTarget(null);
                    }
                  }}
                  className="h-7 text-xs"
                >
                  <GitCompare className="h-3 w-3 mr-1" />
                  Compare
                </Button>
              </div>
              {compareMode && (
                <p className="text-xs text-text-quaternary mt-2">
                  Select two versions to compare
                </p>
              )}
            </div>

            <ScrollArea className="h-[calc(100%-56px)]">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : versions.length === 0 ? (
                <div className="p-6 text-center text-text-tertiary">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No version history yet</p>
                  <p className="text-xs mt-1">
                    Changes create automatic snapshots
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {/* Current version indicator */}
                  <div
                    className={cn(
                      'p-3 rounded-lg border transition-colors cursor-pointer',
                      !selectedVersion
                        ? 'bg-accent-subtle border-accent-primary'
                        : 'bg-surface-2 border-border-default hover:border-border-hover'
                    )}
                    onClick={() => {
                      setSelectedVersion(null);
                      setCompareTarget(null);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <Badge className="bg-status-success/10 text-status-success">
                        Current (v{currentVersion})
                      </Badge>
                      <span className="text-xs text-text-quaternary">Live</span>
                    </div>
                    <p className="text-xs text-text-tertiary mt-1">
                      Latest saved version
                    </p>
                  </div>

                  {/* Historical versions */}
                  {versions.map((version) => {
                    const isSelected = selectedVersion?.id === version.id;
                    const isCompareTarget = compareTarget?.id === version.id;

                    return (
                      <div
                        key={version.id}
                        className={cn(
                          'p-3 rounded-lg border transition-colors cursor-pointer',
                          isSelected || isCompareTarget
                            ? 'bg-accent-subtle border-accent-primary'
                            : 'bg-surface-2 border-border-default hover:border-border-hover'
                        )}
                        onClick={() => handleSelectVersion(version)}
                      >
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-text-secondary">
                            v{version.version}
                          </Badge>
                          {isSelected && (
                            <Badge className="bg-accent-primary text-white text-[10px]">
                              {compareMode ? 'From' : 'Selected'}
                            </Badge>
                          )}
                          {isCompareTarget && (
                            <Badge className="bg-status-warning/80 text-white text-[10px]">
                              To
                            </Badge>
                          )}
                        </div>
                        {version.change_summary && (
                          <p className="text-xs text-text-secondary mt-1.5 line-clamp-2">
                            {version.change_summary}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-text-quaternary">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(version.created_at), 'MMM d, HH:mm')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Diff Panel */}
          <div className="w-1/2">
            <div className="p-3 border-b border-border-default bg-surface-2">
              <span className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
                {compareTarget ? 'Comparison' : selectedVersion ? 'Changes from current' : 'Details'}
              </span>
            </div>

            <ScrollArea className="h-[calc(100%-44px)]">
              {selectedVersion ? (
                <div className="p-4 space-y-4">
                  {/* Version info */}
                  <div className="p-3 bg-surface-2 rounded-lg border border-border-default">
                    <div className="flex items-center gap-2 text-sm text-text-primary font-medium">
                      {compareTarget ? (
                        <>
                          <Badge variant="outline">v{selectedVersion.version}</Badge>
                          <ArrowRight className="h-4 w-4 text-text-quaternary" />
                          <Badge variant="outline">v{compareTarget.version}</Badge>
                        </>
                      ) : (
                        <>
                          <Badge variant="outline">v{selectedVersion.version}</Badge>
                          <ArrowRight className="h-4 w-4 text-text-quaternary" />
                          <Badge className="bg-status-success/10 text-status-success">
                            Current
                          </Badge>
                        </>
                      )}
                    </div>
                    {selectedVersion.change_summary && (
                      <p className="text-xs text-text-tertiary mt-2">
                        {selectedVersion.change_summary}
                      </p>
                    )}
                  </div>

                  {/* Diffs */}
                  {diffs.length === 0 ? (
                    <div className="text-center py-8 text-text-tertiary">
                      <GitCompare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No differences found</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-text-tertiary">
                        {diffs.length} field{diffs.length !== 1 ? 's' : ''} changed
                      </p>
                      {diffs.map((diff, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg border border-border-default bg-surface-2"
                        >
                          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">
                            {diff.field.replace(/_/g, ' ')}
                          </p>
                          <div className="space-y-1.5">
                            <div className="flex items-start gap-2">
                              <span className="text-[10px] text-status-error font-medium shrink-0 w-10">
                                OLD
                              </span>
                              <p className="text-xs text-text-tertiary line-through break-words">
                                {formatValue(diff.oldValue)}
                              </p>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-[10px] text-status-success font-medium shrink-0 w-10">
                                NEW
                              </span>
                              <p className="text-xs text-text-primary break-words">
                                {formatValue(diff.newValue)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center text-text-tertiary">
                  <ChevronRight className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Select a version to view changes</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (Array.isArray(value)) return value.join(', ') || '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value) || '—';
}

export default VersionHistoryDrawer;
