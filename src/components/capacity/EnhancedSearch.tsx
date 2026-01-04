/**
 * Prompt 6: Enhanced Search with Fuzzy Matching
 * Uses fuse.js for intelligent search with keyboard shortcuts
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import Fuse from 'fuse.js';
import { Search, User, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ResourceMetric {
  id: string;
  name: string;
  role?: string;
  department?: string;
  allocation?: number;
  avatarUrl?: string;
}

interface EnhancedSearchProps {
  resources: ResourceMetric[];
  onSearch?: (query: string) => void;
  onSelectResource?: (resource: ResourceMetric) => void;
  placeholder?: string;
  className?: string;
}

export function EnhancedSearch({
  resources,
  onSearch,
  onSelectResource,
  placeholder = "Search resources... (Press /)",
  className
}: EnhancedSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Configure Fuse.js for fuzzy search
  const fuse = useMemo(() => new Fuse(resources, {
    keys: [
      { name: 'name', weight: 0.5 },
      { name: 'role', weight: 0.3 },
      { name: 'department', weight: 0.2 }
    ],
    threshold: 0.3,
    includeMatches: true,
    minMatchCharLength: 2,
  }), [resources]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return fuse.search(query).slice(0, 10);
  }, [fuse, query]);

  // Keyboard shortcut: "/" to focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Arrow key navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || results.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % results.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        handleSelect(results[selectedIndex].item);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, results, selectedIndex]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (resource: ResourceMetric) => {
    onSelectResource?.(resource);
    setQuery('');
    setIsOpen(false);
    setSelectedIndex(0);
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    setIsOpen(true);
    setSelectedIndex(0);
    onSearch?.(value);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-64 pl-10 pr-8 h-9 text-sm"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              onSearch?.('');
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && query && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          {/* Results count */}
          <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border bg-muted/50">
            {results.length} of {resources.length} match "{query}"
          </div>

          {/* Results list */}
          {results.length > 0 ? (
            <div className="max-h-80 overflow-y-auto">
              {results.map(({ item, matches }, index) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                    index === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                    {item.avatarUrl ? (
                      <img src={item.avatarUrl} alt={item.name} className="w-8 h-8 rounded-full" />
                    ) : (
                      getInitials(item.name)
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <HighlightedText
                      text={item.name}
                      matches={matches?.filter(m => m.key === 'name')}
                    />
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span>{item.role}</span>
                      {item.department && (
                        <>
                          <span>•</span>
                          <span>{item.department}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Allocation */}
                  <div className={cn(
                    "text-sm font-medium tabular-nums",
                    (item.allocation ?? 0) > 100 
                      ? 'text-amber-600 dark:text-amber-400' 
                      : 'text-primary'
                  )}>
                    {item.allocation ?? 0}%
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              No resources found
            </div>
          )}

          {/* Keyboard hints */}
          <div className="px-3 py-2 text-xs text-muted-foreground border-t border-border bg-muted/50 flex items-center gap-4">
            <span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↑↓</kbd> Navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Enter</kbd> Select
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Esc</kbd> Close
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Define match interface since Fuse types not exported
interface FuseMatch {
  indices: readonly [number, number][];
  key?: string;
  value?: string;
}

// Highlight matched text
function HighlightedText({ 
  text, 
  matches 
}: { 
  text: string; 
  matches?: FuseMatch[] 
}) {
  if (!matches || matches.length === 0) {
    return <div className="font-medium truncate">{text}</div>;
  }

  const indices = matches[0].indices;
  let result: JSX.Element[] = [];
  let lastIndex = 0;

  indices.forEach(([start, end], i) => {
    // Text before match
    if (start > lastIndex) {
      result.push(
        <span key={`before-${i}`}>{text.slice(lastIndex, start)}</span>
      );
    }
    // Matched text
    result.push(
      <mark key={`match-${i}`} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
        {text.slice(start, end + 1)}
      </mark>
    );
    lastIndex = end + 1;
  });

  // Text after last match
  if (lastIndex < text.length) {
    result.push(
      <span key="after">{text.slice(lastIndex)}</span>
    );
  }

  return <div className="font-medium truncate">{result}</div>;
}
