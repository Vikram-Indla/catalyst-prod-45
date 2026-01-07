import React, { useState, useMemo } from 'react';
import { Send, Calendar, CheckCircle, AlertTriangle, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  usePublishedEpics,
  usePublishEpics,
  useBRLinks,
  AVAILABLE_QUARTERS,
  type EpicToPublish,
  type PublishedEpic,
} from '@/hooks/useAIAssistPublish';
import type { AIAssistArtifact } from '@/hooks/useAIAssistArtifacts';

interface EpicPublishingProps {
  draftId: string;
  runId: string | undefined;
  artifacts: AIAssistArtifact[];
}

// Epic preview card
function EpicPreviewCard({ epic, index }: { epic: EpicToPublish; index: number }) {
  return (
    <div className="border border-[var(--border-subtle)] rounded-lg p-3 bg-[var(--bg-2)]">
      <div className="flex items-start gap-2">
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[hsl(var(--info))]/10 text-[hsl(var(--info))] text-xs font-medium flex items-center justify-center">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{epic.name}</p>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{epic.description}</p>
        </div>
      </div>
    </div>
  );
}

// Published epic card
function PublishedEpicCard({ epic }: { epic: PublishedEpic }) {
  const data = epic.published_data;
  return (
    <div className="border border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/5 rounded-lg p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="h-4 w-4 text-[hsl(var(--success))]" />
            {data.epic_key && (
              <span className="font-mono text-xs px-1.5 py-0.5 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] rounded">
                {data.epic_key}
              </span>
            )}
            <span className="text-xs text-muted-foreground">{data.quarter}</span>
          </div>
          <p className="text-sm font-medium">{data.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Published {new Date(epic.published_at).toLocaleDateString()}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
          <a href={`/program-board?epicId=${epic.epic_id}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  );
}

export function EpicPublishing({ draftId, runId, artifacts }: EpicPublishingProps) {
  const [selectedQuarter, setSelectedQuarter] = useState<string>('');
  const { data: publishedEpics = [], isLoading: publishedLoading } = usePublishedEpics(draftId);
  const { data: links = [] } = useBRLinks(draftId);
  const publishEpics = usePublishEpics();

  // Extract epics from artifact
  const epicsToPublish = useMemo((): EpicToPublish[] => {
    const epicsArtifact = artifacts.find(a => a.artifact_type === 'epics');
    if (!epicsArtifact?.content_json) return [];

    const content = epicsArtifact.content_json as { epics?: EpicToPublish[] };
    return content.epics || [];
  }, [artifacts]);

  // Check if all epics are already published
  const publishedSourceIds = new Set(publishedEpics.map(p => p.published_data.source_id));
  const unpublishedEpics = epicsToPublish.filter(e => !publishedSourceIds.has(e.id));
  const allPublished = unpublishedEpics.length === 0 && epicsToPublish.length > 0;

  // Get first linked BR for association
  const linkedBrId = links[0]?.br?.id;

  const canPublish = runId && unpublishedEpics.length > 0 && selectedQuarter;

  const handlePublish = async () => {
    if (!runId || !selectedQuarter) return;

    await publishEpics.mutateAsync({
      draftId,
      runId,
      epics: unpublishedEpics,
      quarter: selectedQuarter,
      linkedBrId,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[var(--bg-2)] rounded-lg p-6">
        <Send className="h-8 w-8 mb-4 text-[hsl(var(--info))]" />
        <p className="text-sm font-medium mb-2">Epic Publishing</p>
        <p className="text-xs text-muted-foreground">
          Publish generated epics to the Program Board backlog.
        </p>
      </div>

      {/* No epics state */}
      {epicsToPublish.length === 0 && (
        <div className="border border-dashed border-[var(--border-subtle)] rounded-lg p-6 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-[hsl(var(--warning))]" />
          <p className="text-sm font-medium">No Epics Generated</p>
          <p className="text-xs text-muted-foreground mt-1">
            Run AI analysis to generate epics from your requirements document.
          </p>
        </div>
      )}

      {/* Epics to publish */}
      {unpublishedEpics.length > 0 && (
        <>
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Epics to Publish ({unpublishedEpics.length})</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {unpublishedEpics.map((epic, idx) => (
                <EpicPreviewCard key={epic.id} epic={epic} index={idx} />
              ))}
            </div>
          </div>

          {/* Quarter selection */}
          <div className="space-y-2">
            <Label htmlFor="quarter" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Target Quarter *
            </Label>
            <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
              <SelectTrigger id="quarter">
                <SelectValue placeholder="Select quarter" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_QUARTERS.map(q => (
                  <SelectItem key={q} value={q}>{q}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!selectedQuarter && (
              <p className="text-xs text-[hsl(var(--danger))]">
                Quarter selection is required to publish epics.
              </p>
            )}
          </div>

          {/* Linked BR info */}
          {links.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Epics will be linked to: <span className="font-mono">{links[0].request_key}</span>
            </div>
          )}

          {/* Publish button */}
          <Button
            onClick={handlePublish}
            disabled={!canPublish || publishEpics.isPending}
            className="w-full gap-2"
          >
            {publishEpics.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Publish {unpublishedEpics.length} Epic{unpublishedEpics.length !== 1 ? 's' : ''} to Backlog
              </>
            )}
          </Button>
        </>
      )}

      {/* All published state */}
      {allPublished && (
        <div className="bg-[hsl(var(--success))]/5 border border-[hsl(var(--success))]/20 rounded-lg p-4 text-center">
          <CheckCircle className="h-8 w-8 mx-auto mb-2 text-[hsl(var(--success))]" />
          <p className="text-sm font-medium text-[hsl(var(--success))]">All Epics Published</p>
          <p className="text-xs text-muted-foreground mt-1">
            All {epicsToPublish.length} epics have been published to the Program Board.
          </p>
        </div>
      )}

      {/* Published epics */}
      {publishedEpics.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-[hsl(var(--success))]" />
            Published Epics ({publishedEpics.length})
          </h4>
          {publishedLoading ? (
            <div className="space-y-2">
              {[1, 2].map(i => (
                <div key={i} className="h-16 bg-[var(--bg-2)] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {publishedEpics.map((epic) => (
                <PublishedEpicCard key={epic.id} epic={epic} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
