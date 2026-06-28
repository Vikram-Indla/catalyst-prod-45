// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10AIBanner
// Purpose: AI suggestions banner with collapsible content (Prompt 6)
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Sparkles, ArrowRight, X, ArrowUp, Clock, AlertTriangle } from '@/lib/atlaskit-icons';

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
      {/* Header - Compact single line */}
      <div 
        className="t10-ai-banner-v2-header" 
        onClick={handleToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
          <div 
            style={{
              width: '36px',
              height: '50px',
              borderRadius: '12px',
              border: '1.5px solid var(--ds-background-discovery-bold, #6E5DC6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Sparkles size={16} color="var(--ds-background-discovery-bold, #6E5DC6)" />
          </div>
          <span style={{ fontWeight: 600, fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text, #172B4D)', whiteSpace: 'nowrap' }}>
            AI Suggestions
          </span>
          <span style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtlest, #64748b)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} based on your patterns
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            fontSize: 'var(--ds-font-size-300)',
            fontWeight: 500,
            color: 'var(--ds-background-discovery-bold, #6E5DC6)',
            background: 'transparent',
            border: '1px solid var(--ds-border, #DFE1E6)',
            borderRadius: '6px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {isExpanded ? <X size={14} /> : <ArrowRight size={14} style={{ transform: 'rotate(90deg)' }} />}
          {isExpanded ? 'Hide' : 'Show'}
        </button>
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
