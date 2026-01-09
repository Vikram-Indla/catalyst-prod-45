/**
 * AI Search Suggestions Component
 * Dropdown with AI-powered search suggestions
 */

import { useState, useEffect, useRef } from 'react';
import { Sparkles, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AISearchSuggestionsProps {
  query: string;
  onSelect: (suggestion: string) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

// Mock AI suggestions based on context
const generateSuggestions = (query: string): string[] => {
  const lowerQuery = query.toLowerCase();
  
  const suggestionMap: Record<string, string[]> = {
    'login': [
      'Login form validation tests',
      'Login authentication error handling',
      'Login session management tests',
    ],
    'auth': [
      'Authentication token validation',
      'OAuth integration tests',
      'Multi-factor authentication tests',
    ],
    'api': [
      'API response validation tests',
      'API error handling scenarios',
      'API rate limiting tests',
    ],
    'investor': [
      'Investor portal validation',
      'Investor dashboard tests',
      'Investor notification tests',
    ],
    'email': [
      'Email delivery verification',
      'Email template rendering tests',
      'Email notification queue tests',
    ],
    'reminder': [
      'Reminder notification tests',
      'Reminder scheduling validation',
      'Reminder delivery confirmation',
    ],
    'report': [
      'Report generation tests',
      'Report export validation',
      'Report data accuracy tests',
    ],
    'compliance': [
      'Compliance rule validation',
      'Compliance report generation',
      'Compliance audit trail tests',
    ],
  };

  // Find matching suggestions
  for (const [key, suggestions] of Object.entries(suggestionMap)) {
    if (lowerQuery.includes(key) || key.includes(lowerQuery)) {
      return suggestions;
    }
  }

  // Default suggestions based on partial match
  return [
    `${query} validation tests`,
    `${query} error handling`,
    `${query} integration scenarios`,
  ];
};

export function AISearchSuggestions({
  query,
  onSelect,
  isOpen,
  onOpenChange,
}: AISearchSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length >= 2) {
      const newSuggestions = generateSuggestions(query);
      setSuggestions(newSuggestions);
      setHighlightedIndex(0);
    } else {
      setSuggestions([]);
    }
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onOpenChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        break;
      case 'Enter':
        e.preventDefault();
        onSelect(suggestions[highlightedIndex]);
        onOpenChange(false);
        break;
      case 'Escape':
        onOpenChange(false);
        break;
    }
  };

  if (!isOpen || suggestions.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border border-border rounded-lg shadow-xl overflow-hidden"
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
        <Sparkles className="h-4 w-4 text-purple-500" />
        <span className="text-sm font-medium text-muted-foreground">AI Suggestions</span>
      </div>

      {/* Suggestions */}
      <div className="py-1">
        {suggestions.map((suggestion, index) => (
          <button
            key={suggestion}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors',
              index === highlightedIndex && 'bg-accent',
              'hover:bg-accent'
            )}
            onClick={() => {
              onSelect(suggestion);
              onOpenChange(false);
            }}
            onMouseEnter={() => setHighlightedIndex(index)}
          >
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">{suggestion}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
