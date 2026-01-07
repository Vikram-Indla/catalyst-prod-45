import React, { useState } from 'react';
import { Link, Search, X, Plus, FileText, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useSearchBR,
  useBRLinks,
  useLinkBR,
  useUnlinkBR,
  type BusinessRequest,
  type BRLink,
} from '@/hooks/useAIAssistPublish';

interface BRLinkingProps {
  draftId: string;
  runId?: string;
}

// BR Card component
function BRCard({ link, onUnlink, isUnlinking }: { link: BRLink; onUnlink: () => void; isUnlinking: boolean }) {
  return (
    <div className="border border-[var(--border-subtle)] rounded-lg p-3 bg-[var(--bg-2)]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs px-1.5 py-0.5 bg-[hsl(var(--info))]/10 text-[hsl(var(--info))] rounded">
              {link.request_key}
            </span>
            {link.br?.process_step && (
              <span className="text-xs px-1.5 py-0.5 bg-[var(--bg-3)] rounded capitalize">
                {link.br.process_step.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          <p className="text-sm font-medium truncate">{link.br?.title || 'Unknown BR'}</p>
          {link.br?.department && (
            <p className="text-xs text-muted-foreground mt-0.5">{link.br.department}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-[hsl(var(--danger))]"
          onClick={onUnlink}
          disabled={isUnlinking}
        >
          {isUnlinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

// Search result item
function SearchResultItem({
  br,
  onSelect,
  isLinked,
}: {
  br: BusinessRequest;
  onSelect: () => void;
  isLinked: boolean;
}) {
  return (
    <button
      onClick={onSelect}
      disabled={isLinked}
      className={cn(
        "w-full text-left p-2 rounded hover:bg-[var(--row-hover)] transition-colors",
        isLinked && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs px-1.5 py-0.5 bg-[hsl(var(--info))]/10 text-[hsl(var(--info))] rounded">
          {br.request_key}
        </span>
        <span className="text-xs text-muted-foreground capitalize">
          {br.process_step?.replace(/_/g, ' ')}
        </span>
        {isLinked && <span className="text-xs text-[hsl(var(--success))]">✓ Linked</span>}
      </div>
      <p className="text-sm mt-1 truncate">{br.title}</p>
    </button>
  );
}

export function BRLinking({ draftId, runId }: BRLinkingProps) {
  const [mode, setMode] = useState<'search' | 'create'>('search');
  const { searchQuery, setSearchQuery, results, isLoading: searchLoading } = useSearchBR(draftId);
  const { data: links = [], isLoading: linksLoading } = useBRLinks(draftId);
  const linkBR = useLinkBR();
  const unlinkBR = useUnlinkBR();
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  const linkedKeys = new Set(links.map(l => l.request_key));

  const handleLink = async (requestKey: string) => {
    await linkBR.mutateAsync({ draftId, runId, requestKey });
    setSearchQuery('');
  };

  const handleUnlink = async (linkId: string) => {
    setUnlinkingId(linkId);
    try {
      await unlinkBR.mutateAsync({ draftId, linkId });
    } finally {
      setUnlinkingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[var(--bg-2)] rounded-lg p-6">
        <Link className="h-8 w-8 mb-4 text-[hsl(var(--info))]" />
        <p className="text-sm font-medium mb-2">Business Request Linking</p>
        <p className="text-xs text-muted-foreground">
          Connect this draft to existing Business Requests for traceability.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <Button
          variant={mode === 'search' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('search')}
          className="gap-2"
        >
          <Search className="h-4 w-4" />
          Link Existing
        </Button>
        <Button
          variant={mode === 'create' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('create')}
          className="gap-2"
          disabled
        >
          <Plus className="h-4 w-4" />
          Create New
        </Button>
      </div>

      {/* Search mode */}
      {mode === 'search' && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by request key or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Search results */}
          {searchQuery.length >= 2 && (
            <div className="border border-[var(--border-subtle)] rounded-lg divide-y divide-[var(--border-subtle)] max-h-48 overflow-y-auto">
              {searchLoading ? (
                <div className="p-4 text-center">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : results.length > 0 ? (
                results.map((br) => (
                  <SearchResultItem
                    key={br.id}
                    br={br}
                    onSelect={() => handleLink(br.request_key)}
                    isLinked={linkedKeys.has(br.request_key)}
                  />
                ))
              ) : (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No results found for "{searchQuery}"
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Create mode placeholder */}
      {mode === 'create' && (
        <div className="border border-dashed border-[var(--border-subtle)] rounded-lg p-6 text-center text-muted-foreground text-sm">
          Create new BR feature coming soon
        </div>
      )}

      {/* Linked BRs */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Linked Business Requests ({links.length})
        </h4>
        
        {linksLoading ? (
          <div className="space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="h-16 bg-[var(--bg-2)] rounded-lg animate-pulse" />
            ))}
          </div>
        ) : links.length > 0 ? (
          <div className="space-y-2">
            {links.map((link) => (
              <BRCard
                key={link.id}
                link={link}
                onUnlink={() => handleUnlink(link.id)}
                isUnlinking={unlinkingId === link.id}
              />
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-[var(--border-subtle)] rounded-lg p-6 text-center text-muted-foreground text-sm">
            No Business Requests linked yet. Search above to link one.
          </div>
        )}
      </div>
    </div>
  );
}
