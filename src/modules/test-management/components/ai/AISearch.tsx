/**
 * AI Search Component
 * Natural language search with AI mode toggle
 */

import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toggle } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';
import {
  Search,
  Sparkles,
  Loader2,
  FileText,
  Play,
  Bug,
  ChevronRight,
  X,
  Lightbulb,
} from 'lucide-react';

interface SearchResult {
  id: string;
  type: 'case' | 'run' | 'defect';
  key: string;
  title: string;
  status: string;
  relevance: number;
  snippet?: string;
}

interface QueryInterpretation {
  original: string;
  interpreted: string;
  filters: Array<{ field: string; value: string }>;
  suggestions?: string[];
}

interface AISearchProps {
  projectId: string;
  onResultClick?: (result: SearchResult) => void;
  className?: string;
}

export function AISearch({
  projectId,
  onResultClick,
  className,
}: AISearchProps) {
  const [query, setQuery] = useState('');
  const [isAIMode, setIsAIMode] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [interpretation, setInterpretation] = useState<QueryInterpretation | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      // Simulate AI search - in real implementation, call the API
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // Mock query interpretation
      if (isAIMode) {
        setInterpretation({
          original: query,
          interpreted: `Searching for items related to "${query}" with high priority or recent failures`,
          filters: [
            { field: 'priority', value: 'high, critical' },
            { field: 'status', value: 'failed, blocked' },
          ],
          suggestions: [
            'Try adding "last week" for time-based filtering',
            'Use "by @username" to filter by assignee',
          ],
        });
      } else {
        setInterpretation(null);
      }

      // Mock results
      const mockResults: SearchResult[] = [
        {
          id: '1',
          type: 'case',
          key: 'TC-001',
          title: 'Login functionality with valid credentials',
          status: 'ready',
          relevance: 0.95,
          snippet: 'Verify user can login with valid username and password...',
        },
        {
          id: '2',
          type: 'run',
          key: 'RUN-123',
          title: 'Smoke Test - Sprint 24',
          status: 'failed',
          relevance: 0.88,
          snippet: 'Last execution failed on step 3...',
        },
        {
          id: '3',
          type: 'defect',
          key: 'DEF-045',
          title: 'Login button unresponsive on mobile',
          status: 'open',
          relevance: 0.82,
          snippet: 'Critical severity, assigned to John Doe...',
        },
        {
          id: '4',
          type: 'case',
          key: 'TC-002',
          title: 'Password reset flow',
          status: 'approved',
          relevance: 0.75,
        },
        {
          id: '5',
          type: 'defect',
          key: 'DEF-012',
          title: 'Session timeout not working',
          status: 'resolved',
          relevance: 0.68,
        },
      ];

      setResults(mockResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [query, isAIMode]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setInterpretation(null);
  };

  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'case':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'run':
        return <Play className="h-4 w-4 text-green-500" />;
      case 'defect':
        return <Bug className="h-4 w-4 text-red-500" />;
    }
  };

  const filteredResults = activeTab === 'all'
    ? results
    : results.filter((r) => r.type === activeTab);

  const resultCounts = {
    all: results.length,
    case: results.filter((r) => r.type === 'case').length,
    run: results.filter((r) => r.type === 'run').length,
    defect: results.filter((r) => r.type === 'defect').length,
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isAIMode ? 'Ask anything... e.g., "failed tests in login module last week"' : 'Search...'}
            className="pl-9 pr-20"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-12 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={clearSearch}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          <Toggle
            pressed={isAIMode}
            onPressedChange={setIsAIMode}
            className={cn(
              'absolute right-2 top-1/2 -translate-y-1/2 h-7 px-2',
              isAIMode && 'bg-purple-100 text-purple-700'
            )}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            AI
          </Toggle>
        </div>
        <Button onClick={handleSearch} disabled={isSearching || !query.trim()}>
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Search'
          )}
        </Button>
      </div>

      {/* Query Interpretation */}
      {interpretation && (
        <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-purple-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-purple-800 dark:text-purple-200">
                  {interpretation.interpreted}
                </p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {interpretation.filters.map((filter, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {filter.field}: {filter.value}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            {interpretation.suggestions && interpretation.suggestions.length > 0 && (
              <div className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                <span className="font-medium">Tips: </span>
                {interpretation.suggestions.join(' • ')}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results.length > 0 && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">
              All ({resultCounts.all})
            </TabsTrigger>
            <TabsTrigger value="case">
              Cases ({resultCounts.case})
            </TabsTrigger>
            <TabsTrigger value="run">
              Runs ({resultCounts.run})
            </TabsTrigger>
            <TabsTrigger value="defect">
              Defects ({resultCounts.defect})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {filteredResults.map((result) => (
                  <Card
                    key={result.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onResultClick?.(result)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        {getTypeIcon(result.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs text-muted-foreground">
                              {result.key}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {result.status}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className="text-xs ml-auto"
                            >
                              {Math.round(result.relevance * 100)}% match
                            </Badge>
                          </div>
                          <p className="text-sm font-medium truncate">
                            {result.title}
                          </p>
                          {result.snippet && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                              {result.snippet}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      )}

      {/* Empty State */}
      {!isSearching && query && results.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No results found for "{query}"</p>
          {isAIMode && (
            <p className="text-xs mt-1">Try rephrasing your query or switch to regular search</p>
          )}
        </div>
      )}
    </div>
  );
}
