/**
 * Caty V4 — Suggestions Component
 * Contextual quick-action chips
 */

import { cn } from '@/lib/utils';

export interface CatySuggestionsProps {
  suggestions: string[];
  onSelect: (text: string) => void;
  highlightFirst?: boolean;
  disabled?: boolean;
}

export function CatySuggestions({ 
  suggestions, 
  onSelect,
  highlightFirst = true,
  disabled = false
}: CatySuggestionsProps) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="caty-suggestions" role="group" aria-label="Suggested questions">
      {suggestions.map((suggestion, index) => (
        <button
          key={suggestion}
          className={cn(
            "caty-suggestion-chip",
            highlightFirst && index === 0 && "highlighted",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onClick={() => !disabled && onSelect(suggestion)}
          tabIndex={disabled ? -1 : 0}
          disabled={disabled}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
