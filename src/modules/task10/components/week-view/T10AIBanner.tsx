// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ AI BANNER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import type { T10AISuggestionWithAssignee } from '../../types';
import { getPriorityColor, getPriorityBgColor } from '../../types';

interface T10AIBannerProps {
  suggestions: T10AISuggestionWithAssignee[];
  onAddSuggestion?: (suggestionId: string) => void;
  onDismiss?: (suggestionId: string) => void;
}

export function T10AIBanner({ suggestions, onAddSuggestion, onDismiss }: T10AIBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const pendingSuggestions = suggestions.filter(s => !s.is_added);
  
  if (pendingSuggestions.length === 0) return null;

  return (
    <div className="t10-ai-banner">
      <div className="t10-ai-banner__header">
        <div className="t10-ai-banner__icon">
          <Sparkles />
        </div>
        <div className="t10-ai-banner__content">
          <span className="t10-ai-banner__title">AI Suggestions</span>
          <span style={{ color: '#4b5563', marginLeft: '6px' }}>·</span>
          <span className="t10-ai-banner__subtitle" style={{ marginLeft: '6px' }}>
            {pendingSuggestions.length} task{pendingSuggestions.length !== 1 ? 's' : ''} recommended for your Top 10
          </span>
        </div>
        <button 
          className="t10-ai-banner__toggle"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Hide' : 'Review'}
          {isExpanded ? <ChevronUp className="t10-ai-banner__toggle-icon" /> : <ChevronDown className="t10-ai-banner__toggle-icon" />}
        </button>
      </div>
      
      {isExpanded && (
        <div className="t10-ai-banner__suggestions">
          {pendingSuggestions.map((suggestion) => (
            <div key={suggestion.id} className="t10-ai-suggestion">
              <div className="t10-ai-suggestion__left">
                <span 
                  className="t10-ai-suggestion__priority"
                  style={{ 
                    color: getPriorityColor(suggestion.priority),
                    backgroundColor: getPriorityBgColor(suggestion.priority),
                  }}
                >
                  {suggestion.priority}
                </span>
                <span className="t10-ai-suggestion__title">{suggestion.title}</span>
                {suggestion.taskhub_key && (
                  <span className="t10-ai-suggestion__key">{suggestion.taskhub_key}</span>
                )}
              </div>
              
              <div className="t10-ai-suggestion__actions">
                <button 
                  className="t10-btn t10-btn--sm t10-btn--outline"
                  onClick={() => onDismiss?.(suggestion.id)}
                >
                  Dismiss
                </button>
                <button 
                  className="t10-btn t10-btn--sm t10-btn--primary"
                  onClick={() => onAddSuggestion?.(suggestion.id)}
                >
                  <Plus className="t10-btn__icon" />
                  Add
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default T10AIBanner;
