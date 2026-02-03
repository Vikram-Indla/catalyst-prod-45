// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10AIBanner
// Purpose: AI suggestions banner with collapsible content (Prompt 6)
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Sparkles, ArrowRight, X, ArrowUp, Clock, AlertTriangle } from 'lucide-react';

export interface AISuggestion {
  id: string;
  type: 'reorder' | 'deadline' | 'carryover';
  text: string;
  reason: string;
  action?: string;
}

interface T10AIBannerProps {
  suggestions?: AISuggestion[];
  onApplySuggestion?: (suggestion: AISuggestion) => void;
  onViewAll?: () => void;
  onDismiss?: () => void;
}

// Default suggestions for demo
const DEFAULT_SUGGESTIONS: AISuggestion[] = [
  {
    id: '1',
    type: 'reorder',
    text: 'Move "Fix critical bug" to position #1',
    reason: 'This item has been carried over twice and has a deadline tomorrow',
    action: 'Apply',
  },
  {
    id: '2',
    type: 'deadline',
    text: '"Review security audit" is due in 2 days',
    reason: 'Consider prioritizing this before other non-urgent items',
    action: 'Move up',
  },
  {
    id: '3',
    type: 'carryover',
    text: '3 items were carried over from last week',
    reason: 'Breaking these into smaller tasks might help completion',
  },
];

export function T10AIBanner({
  suggestions = DEFAULT_SUGGESTIONS,
  onApplySuggestion,
  onViewAll,
  onDismiss,
}: T10AIBannerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed || suggestions.length === 0) {
    return null;
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
    onDismiss?.();
    console.log('[T10] AI banner dismissed');
  };

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    console.log('[T10] AI banner toggled:', !isExpanded ? 'expanded' : 'collapsed');
  };

  const getIconForType = (type: AISuggestion['type']) => {
    switch (type) {
      case 'reorder':
        return <ArrowUp size={14} />;
      case 'deadline':
        return <Clock size={14} />;
      case 'carryover':
        return <AlertTriangle size={14} />;
      default:
        return <Sparkles size={14} />;
    }
  };

  return (
    <div className="t10-ai-banner-v2">
      {/* Header */}
      <div className="t10-ai-banner-v2-header" onClick={handleToggle}>
        <div className="t10-ai-banner-v2-header-left">
          <div className="t10-ai-banner-v2-icon">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="t10-ai-banner-v2-title">AI Suggestions</h3>
            <p className="t10-ai-banner-v2-subtitle">
              {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} based on your patterns
            </p>
          </div>
        </div>

        <div className="t10-ai-banner-v2-header-right">
          {onViewAll && (
            <button
              type="button"
              className="t10-ai-banner-v2-action"
              onClick={(e) => {
                e.stopPropagation();
                onViewAll();
              }}
            >
              View All
              <ArrowRight size={14} />
            </button>
          )}
          <button
            type="button"
            className="t10-ai-banner-v2-dismiss"
            onClick={handleDismiss}
            aria-label="Dismiss suggestions"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="t10-ai-banner-v2-content">
          <div className="t10-ai-banner-v2-suggestions">
            {suggestions.slice(0, 3).map((suggestion) => (
              <div key={suggestion.id} className="t10-ai-suggestion-v2">
                <div className="t10-ai-suggestion-v2-icon">
                  {getIconForType(suggestion.type)}
                </div>
                <div className="t10-ai-suggestion-v2-content">
                  <p className="t10-ai-suggestion-v2-text">{suggestion.text}</p>
                  <p className="t10-ai-suggestion-v2-reason">{suggestion.reason}</p>
                </div>
                {suggestion.action && onApplySuggestion && (
                  <button
                    type="button"
                    className="t10-ai-suggestion-v2-action"
                    onClick={() => {
                      onApplySuggestion(suggestion);
                      console.log('[T10] AI suggestion applied:', suggestion.id);
                    }}
                  >
                    {suggestion.action}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default T10AIBanner;
