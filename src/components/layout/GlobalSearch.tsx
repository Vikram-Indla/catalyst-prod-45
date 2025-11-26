import { useState, useEffect } from 'react';
import { Search, Command } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  path: string;
}

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    // TODO: Implement actual search API call
    // Mock results for demonstration
    const mockResults: SearchResult[] = [
      { id: 'epic-1', type: 'Epic', title: 'Platform Modernization', subtitle: 'E-101', path: '/epics/epic-1' },
      { id: 'feature-1', type: 'Feature', title: 'User Authentication', subtitle: 'F-234', path: '/features/feature-1' },
      { id: 'story-1', type: 'Story', title: 'Login page redesign', subtitle: 'S-567', path: '/stories/story-1' },
    ].filter(item => 
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(query.toLowerCase()))
    );

    setResults(mockResults);
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    // TODO: Navigate to result
    console.log('Navigate to:', result.path);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0">
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle className="sr-only">Search</DialogTitle>
        </DialogHeader>
        
        <div className="flex items-center border-b px-4 pb-4">
          <Search className="h-5 w-5 text-muted-foreground mr-2" />
          <Input
            placeholder="Search by keywords or work item IDs (e.g., E-101, F-234)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            autoFocus
          />
          <div className="flex items-center gap-1 ml-2 text-xs text-muted-foreground">
            <Command className="h-3 w-3" />
            <span>K</span>
          </div>
        </div>

        <ScrollArea className="max-h-[400px]">
          {query.trim() && results.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>No results found for "{query}"</p>
            </div>
          ) : results.length > 0 ? (
            <div className="p-2">
              {results.map((result) => (
                <Button
                  key={result.id}
                  variant="ghost"
                  className="w-full justify-start h-auto py-3 px-3"
                  onClick={() => handleSelect(result)}
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-semibold">
                      {result.type}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium">{result.title}</div>
                      {result.subtitle && (
                        <div className="text-sm text-muted-foreground">{result.subtitle}</div>
                      )}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Search for work items by keyword or ID</p>
              <p className="text-xs mt-2">Try: Epic names, Feature IDs, Story titles</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
