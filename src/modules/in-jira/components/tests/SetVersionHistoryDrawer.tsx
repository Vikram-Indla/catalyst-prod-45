/**
 * Set Version History Drawer
 * Shows version history with diff comparison for test sets
 */

import React, { useState, useMemo } from 'react';
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
import { Separator } from '@/components/ui/separator';
import {
  History,
  ChevronRight,
  ArrowRight,
  Plus,
  Minus,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTestSetVersions, TestSetVersion, VersionDiff } from '../../hooks/useTestSetVersions';

interface SetVersionHistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setId: string | null;
  setName: string;
}

export function SetVersionHistoryDrawer({
  open,
  onOpenChange,
  setId,
  setName,
}: SetVersionHistoryDrawerProps) {
  const { versions, isLoading, compareVersions } = useTestSetVersions(setId);
  const [selectedVersions, setSelectedVersions] = useState<[string | null, string | null]>([null, null]);

  const v1 = useMemo(() => 
    versions.find(v => v.id === selectedVersions[0]) || null,
    [versions, selectedVersions]
  );

  const v2 = useMemo(() =>
    versions.find(v => v.id === selectedVersions[1]) || null,
    [versions, selectedVersions]
  );

  const diffs = useMemo(() => {
    if (!v1 || !v2) return [];
    return compareVersions(v1, v2);
  }, [v1, v2, compareVersions]);

  const handleSelectVersion = (versionId: string) => {
    setSelectedVersions(prev => {
      if (!prev[0]) return [versionId, null];
      if (prev[0] === versionId) return [null, null];
      if (!prev[1]) return [prev[0], versionId];
      return [versionId, null];
    });
  };

  const renderDiffValue = (diff: VersionDiff, which: 'before' | 'after') => {
    const value = which === 'before' ? diff.before : diff.after;

    if (diff.type === 'boolean') {
      return (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? 'Yes' : 'No'}
        </Badge>
      );
    }

    if (diff.type === 'array' && diff.field === 'cases') {
      const data = value as { count: number; added?: string[]; removed?: string[] };
      return (
        <div className="text-sm">
          <span className="font-medium">{data.count} cases</span>
          {data.added && data.added.length > 0 && (
            <div className="flex items-center gap-1 text-status-success mt-1">
              <Plus className="h-3 w-3" />
              <span>{data.added.length} added</span>
            </div>
          )}
          {data.removed && data.removed.length > 0 && (
            <div className="flex items-center gap-1 text-status-error mt-1">
              <Minus className="h-3 w-3" />
              <span>{data.removed.length} removed</span>
            </div>
          )}
        </div>
      );
    }

    if (diff.type === 'json') {
      return (
        <pre className="text-xs bg-surface-2 p-2 rounded overflow-auto max-h-24">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }

    return (
      <span className={cn(
        'text-sm',
        !value && 'text-text-quaternary italic'
      )}>
        {value?.toString() || 'Empty'}
      </span>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col p-0">
        <SheetHeader className="px-6 py-4 border-b border-border-default">
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-accent-primary" />
            Version History
          </SheetTitle>
          <p className="text-sm text-text-tertiary">{setName}</p>
        </SheetHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Version List */}
          <div className="px-6 py-4 border-b border-border-default">
            <p className="text-sm text-text-secondary mb-3">
              Select two versions to compare
            </p>
            <ScrollArea className="max-h-48">
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : versions.length === 0 ? (
                <div className="text-center py-8 text-text-tertiary">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No versions recorded yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {versions.map((version, idx) => {
                    const isSelected = selectedVersions.includes(version.id);
                    const selectionIndex = selectedVersions.indexOf(version.id);
                    
                    return (
                      <button
                        key={version.id}
                        onClick={() => handleSelectVersion(version.id)}
                        className={cn(
                          'w-full p-3 rounded-lg border text-left transition-colors',
                          isSelected
                            ? 'border-accent-primary bg-accent-subtle'
                            : 'border-border-default bg-surface-2 hover:border-border-hover'
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={isSelected ? 'default' : 'outline'}>
                              v{version.version}
                            </Badge>
                            {idx === 0 && (
                              <Badge variant="secondary" className="text-xs">Current</Badge>
                            )}
                            {isSelected && (
                              <Badge className="text-xs bg-accent-primary">
                                {selectionIndex === 0 ? 'From' : 'To'}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-text-quaternary">
                            {format(new Date(version.created_at), 'MMM d, yyyy HH:mm')}
                          </span>
                        </div>
                        {version.change_summary && (
                          <p className="text-sm text-text-secondary line-clamp-1">
                            {version.change_summary}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Diff View */}
          <div className="flex-1 overflow-hidden px-6 py-4">
            {v1 && v2 ? (
              <div className="h-full flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="outline">v{v1.version}</Badge>
                  <ArrowRight className="h-4 w-4 text-text-quaternary" />
                  <Badge variant="outline">v{v2.version}</Badge>
                </div>

                {diffs.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-text-tertiary">
                    <p>No differences between selected versions</p>
                  </div>
                ) : (
                  <ScrollArea className="flex-1">
                    <div className="space-y-4">
                      {diffs.map((diff, idx) => (
                        <div key={idx} className="bg-surface-2 rounded-lg border border-border-default p-4">
                          <p className="text-sm font-medium text-text-primary mb-3">
                            {diff.label}
                          </p>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-text-quaternary mb-1.5">Before</p>
                              <div className="bg-status-error/5 border border-status-error/20 rounded p-2">
                                {renderDiffValue(diff, 'before')}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-text-quaternary mb-1.5">After</p>
                              <div className="bg-status-success/5 border border-status-success/20 rounded p-2">
                                {renderDiffValue(diff, 'after')}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-text-tertiary">
                <div className="text-center">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Select two versions above to see differences</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
