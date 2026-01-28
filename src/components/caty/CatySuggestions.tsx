/**
 * Caty V4 — Suggestions Component
 * Contextual quick-action chips
 */

import { cn } from '@/lib/utils';

interface CatySuggestionsProps {
  suggestions: string[];
  onSelect: (text: string) => void;
  highlightFirst?: boolean;
}

export function CatySuggestions({ 
  suggestions, 
  onSelect,
  highlightFirst = true
}: CatySuggestionsProps) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="caty-suggestions" role="group" aria-label="Suggested questions">
      {suggestions.map((suggestion, index) => (
        <button
          key={suggestion}
          className={cn(
            "caty-suggestion-chip",
            highlightFirst && index === 0 && "highlighted"
          )}
          onClick={() => onSelect(suggestion)}
          tabIndex={0}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
