import React from 'react';
import { Clock, Cpu, Hash, RefreshCw, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { AIAssistRun } from '@/hooks/useAIAssistRuns';
import type { AIAssistDocument } from '@/hooks/useAIAssistDocuments';

// Configuration - would come from env/admin config in production
const CONFIG = {
  prompt_pack_version: 'dga-v2.1',
  sources_pack_version: 'nca-2025',
  model_id: 'claude-opus-4-5',
  temperature: 0,
  top_p: 1,
};

interface DeterminismPanelProps {
  latestRun: AIAssistRun | null | undefined;
  latestDocument: AIAssistDocument | null | undefined;
  isLoading?: boolean;
}

export function DeterminismPanel({ latestRun, latestDocument, isLoading }: DeterminismPanelProps) {
  // Use canonical_text_hash for replay eligibility (not file_sha256)
  const canonicalHash = latestDocument?.canonical_text_hash || null;
  const documentVersion = latestDocument?.document_version || null;
  const lastSuccessfulRun = latestRun?.status === 'completed' ? latestRun : null;
  
  // Replay eligible ONLY if:
  // 1. canonical_text_hash exists
  // 2. prompt_pack_version & sources_pack_version match a prior successful run
  // 3. document_version unchanged since that run
  const isReplayEligible = !!(
    canonicalHash &&
    lastSuccessfulRun &&
    lastSuccessfulRun.canonical_text_hash === canonicalHash &&
    lastSuccessfulRun.prompt_pack_version === CONFIG.prompt_pack_version &&
    lastSuccessfulRun.sources_pack_version === CONFIG.sources_pack_version
  );

  // Determine why not eligible
  const getIneligibilityReason = () => {
    if (!canonicalHash) return 'No document processed yet';
    if (!lastSuccessfulRun) return 'No prior successful run';
    if (lastSuccessfulRun.canonical_text_hash !== canonicalHash) return 'Document content changed';
    if (lastSuccessfulRun.prompt_pack_version !== CONFIG.prompt_pack_version) return 'Prompt pack version changed';
    if (lastSuccessfulRun.sources_pack_version !== CONFIG.sources_pack_version) return 'Sources pack version changed';
    return 'Configuration mismatch';
  };

  const shortHash = (hash: string | null) => {
    if (!hash) return null;
    return hash.length > 16 ? `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}` : hash;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-28" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Replay Status Banner */}
      <div className={cn(
        "p-3 rounded-lg border flex items-center gap-3",
        isReplayEligible 
          ? "bg-[hsl(var(--success))]/10 border-[hsl(var(--success))]/20" 
          : "bg-[hsl(var(--warning))]/10 border-[hsl(var(--warning))]/20"
      )}>
        {isReplayEligible ? (
          <CheckCircle className="h-5 w-5 text-[hsl(var(--success))] flex-shrink-0" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-[hsl(var(--warning))] flex-shrink-0" />
        )}
        <div>
          <p className={cn(
            "text-sm font-medium",
            isReplayEligible ? "text-[hsl(var(--success))]" : "text-[hsl(var(--warning))]"
          )}>
            {isReplayEligible ? 'Replay Eligible' : 'Requires New Run'}
          </p>
          <p className="text-xs text-muted-foreground">
            {isReplayEligible 
              ? 'Content & config match last successful run' 
              : getIneligibilityReason()
            }
          </p>
        </div>
      </div>

      {/* Model Info */}
      <div>
        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
          <Cpu className="h-3 w-3" />
          Model
        </p>
        <p className="text-xs font-mono bg-[var(--bg-2)] p-2 rounded">{CONFIG.model_id}</p>
      </div>

      {/* Pack Versions */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Prompt Pack</p>
          <p className="text-xs font-mono bg-[var(--bg-2)] p-2 rounded">{CONFIG.prompt_pack_version}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Sources Pack</p>
          <p className="text-xs font-mono bg-[var(--bg-2)] p-2 rounded">{CONFIG.sources_pack_version}</p>
        </div>
      </div>

      {/* Parameters */}
      <div>
        <p className="text-xs text-muted-foreground mb-1">Parameters</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="text-xs bg-[var(--bg-2)] p-2 rounded">
            <span className="text-muted-foreground">temp=</span>
            <span className="font-mono">{CONFIG.temperature}</span>
          </div>
          <div className="text-xs bg-[var(--bg-2)] p-2 rounded">
            <span className="text-muted-foreground">top_p=</span>
            <span className="font-mono">{CONFIG.top_p}</span>
          </div>
        </div>
      </div>

      {/* Canonical Text Hash */}
      <div>
        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
          <Hash className="h-3 w-3" />
          Canonical Text Hash
        </p>
        <p className="text-xs font-mono break-all bg-[var(--bg-2)] p-2 rounded">
          {canonicalHash ? (
            <span title={canonicalHash}>{shortHash(canonicalHash)}</span>
          ) : (
            <span className="text-muted-foreground italic">Pending extraction</span>
          )}
        </p>
      </div>

      {/* Document Version */}
      {documentVersion && (
        <div>
          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <FileText className="h-3 w-3" />
            Document Version
          </p>
          <p className="text-xs font-mono bg-[var(--bg-2)] p-2 rounded">v{documentVersion}</p>
        </div>
      )}

      {/* Last Run Info */}
      {latestRun && (
        <div className="pt-3 border-t border-[var(--border-subtle)]">
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <RefreshCw className="h-3 w-3" />
            Last Run
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Run #</span>
              <span className="font-mono">{latestRun.run_number}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Status</span>
              <span className={cn(
                "px-2 py-0.5 rounded",
                latestRun.status === 'completed' && "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
                latestRun.status === 'running' && "bg-[hsl(var(--info))]/10 text-[hsl(var(--info))]",
                latestRun.status === 'failed' && "bg-[hsl(var(--danger))]/10 text-[hsl(var(--danger))]",
                latestRun.status === 'pending' && "bg-muted text-muted-foreground"
              )}>
                {latestRun.status}
              </span>
            </div>
            {latestRun.started_at && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Started</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(latestRun.started_at).toLocaleString()}
                </span>
              </div>
            )}
            {latestRun.canonical_text_hash && (
              <div className="text-xs">
                <span className="text-muted-foreground">Run Hash:</span>
                <p className="font-mono text-[10px] break-all mt-1 bg-[var(--bg-2)] p-1 rounded" title={latestRun.canonical_text_hash}>
                  {shortHash(latestRun.canonical_text_hash)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
