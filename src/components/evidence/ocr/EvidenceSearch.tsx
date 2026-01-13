// ═══════════════════════════════════════════════════════════════════════════
// EVIDENCE SEARCH COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback } from 'react';
import { Search, Loader2, FileText, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SearchResult {
  id: string;
  file_name: string;
  ocr_text: string | null;
  storage_path: string;
}

interface EvidenceSearchProps {
  projectId?: string;
  onSelect: (attachmentId: string) => void;
  className?: string;
}

export const EvidenceSearch: React.FC<EvidenceSearchProps> = ({
  projectId,
  onSelect,
  className
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setSearching(true);
    setShowResults(true);

    try {
      // Search using ilike for partial text matching
      const { data, error } = await supabase
        .from('step_result_attachments')
        .select('id, file_name, ocr_text, storage_path')
        .not('ocr_text', 'is', null)
        .ilike('ocr_text', `%${query}%`)
        .is('deleted_at', null)
        .limit(20);

      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
    if (e.key === 'Escape') {
      setShowResults(false);
    }
  };

  const handleSelect = (id: string) => {
    onSelect(id);
    setShowResults(false);
    setQuery('');
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  // Highlight matching text in results
  const highlightMatch = (text: string, searchQuery: string) => {
    if (!text) return '';
    
    const index = text.toLowerCase().indexOf(searchQuery.toLowerCase());
    if (index === -1) return text.slice(0, 100);
    
    const start = Math.max(0, index - 30);
    const end = Math.min(text.length, index + searchQuery.length + 30);
    
    const before = text.slice(start, index);
    const match = text.slice(index, index + searchQuery.length);
    const after = text.slice(index + searchQuery.length, end);
    
    return (
      <>
        {start > 0 && '...'}
        {before}
        <mark className="bg-warning/30 text-foreground px-0.5 rounded">{match}</mark>
        {after}
        {end < text.length && '...'}
      </>
    );
  };

  return (
    <div className={cn("relative", className)}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search text in screenshots..."
            className="pr-8"
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
        </div>
        <Button
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          variant="default"
          size="icon"
        >
          {searching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Search Results Dropdown */}
      {showResults && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {searching ? (
            <div className="p-4 text-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <FileText className="w-5 h-5 mx-auto mb-2 opacity-50" />
              No matching evidence found
            </div>
          ) : (
            <div className="divide-y divide-border">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result.id)}
                  className="w-full px-3 py-2 text-left hover:bg-muted transition-colors"
                >
                  <p className="text-sm font-medium text-foreground truncate">
                    {result.file_name}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {highlightMatch(result.ocr_text || '', query)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
