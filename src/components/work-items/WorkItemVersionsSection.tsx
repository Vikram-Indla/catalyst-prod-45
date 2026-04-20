import { useState } from 'react';
import { Plus, X, Wrench, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Lozenge } from '@/components/ads';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWorkItemVersions, useReleases, WorkItemVersion } from '@/hooks/useWorkItemVersions';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface WorkItemVersionsSectionProps {
  workItemId: string;
  workItemType: 'epic' | 'feature' | 'story' | 'defect' | 'task' | 'subtask';
  readOnly?: boolean;
}

export function WorkItemVersionsSection({
  workItemId,
  workItemType,
  readOnly = false,
}: WorkItemVersionsSectionProps) {
  const { fixVersions, affectsVersions, isLoading, addVersion, removeVersion } = useWorkItemVersions(workItemId, workItemType);
  const { data: releases = [], isLoading: releasesLoading } = useReleases();
  const [addingFix, setAddingFix] = useState(false);
  const [addingAffects, setAddingAffects] = useState(false);

  const handleAddVersion = async (releaseId: string, linkType: 'fix' | 'affects') => {
    try {
      await addVersion.mutateAsync({ releaseId, linkType });
      toast.success(`${linkType === 'fix' ? 'Fix' : 'Affects'} version added`);
      if (linkType === 'fix') setAddingFix(false);
      else setAddingAffects(false);
    } catch (error: any) {
      if (error.message?.includes('duplicate')) {
        toast.error('Version already linked');
      } else {
        toast.error('Failed to add version');
      }
    }
  };

  const handleRemoveVersion = async (version: WorkItemVersion) => {
    try {
      await removeVersion.mutateAsync(version.id);
      toast.success('Version removed');
    } catch {
      toast.error('Failed to remove version');
    }
  };

  const getAvailableReleases = (linkType: 'fix' | 'affects') => {
    const linkedIds = (linkType === 'fix' ? fixVersions : affectsVersions).map(v => v.release_id);
    return releases.filter(r => !linkedIds.includes(r.id));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Fix Versions */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Wrench className="h-4 w-4 text-brand-primary" />
            Fix Version(s)
          </div>
          {!readOnly && !addingFix && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setAddingFix(true)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {fixVersions.map((version) => (
            <span key={version.id} className="inline-flex items-center gap-1">
              <Lozenge appearance="success">
                {version.release?.name || 'Unknown'}
              </Lozenge>
              {!readOnly && (
                <button
                  onClick={() => handleRemoveVersion(version)}
                  className="hover:text-destructive"
                  aria-label="Remove fix version"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
          {fixVersions.length === 0 && !addingFix && (
            <span className="text-sm text-muted-foreground">None</span>
          )}
          {addingFix && (
            <Select
              onValueChange={(value) => handleAddVersion(value, 'fix')}
              disabled={releasesLoading || addVersion.isPending}
            >
              <SelectTrigger className="w-[180px] h-8">
                <SelectValue placeholder="Select version..." />
              </SelectTrigger>
              <SelectContent>
                {getAvailableReleases('fix').map((release) => (
                  <SelectItem key={release.id} value={release.id}>
                    {release.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Affects Versions */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Affects Version(s)
          </div>
          {!readOnly && !addingAffects && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setAddingAffects(true)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {affectsVersions.map((version) => (
            <span key={version.id} className="inline-flex items-center gap-1">
              <Lozenge appearance="moved">
                {version.release?.name || 'Unknown'}
              </Lozenge>
              {!readOnly && (
                <button
                  onClick={() => handleRemoveVersion(version)}
                  className="hover:text-destructive"
                  aria-label="Remove affects version"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
          {affectsVersions.length === 0 && !addingAffects && (
            <span className="text-sm text-muted-foreground">None</span>
          )}
          {addingAffects && (
            <Select
              onValueChange={(value) => handleAddVersion(value, 'affects')}
              disabled={releasesLoading || addVersion.isPending}
            >
              <SelectTrigger className="w-[180px] h-8">
                <SelectValue placeholder="Select version..." />
              </SelectTrigger>
              <SelectContent>
                {getAvailableReleases('affects').map((release) => (
                  <SelectItem key={release.id} value={release.id}>
                    {release.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
    </div>
  );
}
