// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ AI BANNER COMPONENT
// - Icon with purple BORDER (not filled)
// - Purple styled Review button
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, Plus, RefreshCw } from 'lucide-react';
import type { T10AISuggestionWithAssignee } from '../../types';
import { getPriorityColor, getPriorityBgColor } from '../../types';

interface T10AIBannerProps {
  suggestions: T10AISuggestionWithAssignee[];
  onAddSuggestion?: (suggestionId: string) => void;
  onDismiss?: (suggestionId: string) => void;
  onGenerateSuggestions?: () => void;
  isGenerating?: boolean;
}

export function T10AIBanner({ 
  suggestions, 
  onAddSuggestion, 
  onDismiss,
  onGenerateSuggestions,
  isGenerating = false,
}: T10AIBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const pendingSuggestions = suggestions.filter(s => !s.is_added);
  
  // Show "Generate" button when no suggestions exist
  if (pendingSuggestions.length === 0) {
    return (
      <div 
        className="t10-ai-banner"
        style={{
          background: '#faf5ff',
          border: '1px solid #e9d5ff',
          borderRadius: '12px',
          marginBottom: '20px',
        }}
      >
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div 
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: '2px solid #9333ea',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={18} style={{ color: '#9333ea' }} />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 700, color: '#7c3aed', fontSize: '14px' }}>
                AI Suggestions
              </span>
              <span style={{ color: '#9ca3af' }}>·</span>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>
                Find tasks from TaskHub to add to your Top 10
              </span>
            </div>
          </div>
          
          <button 
            onClick={onGenerateSuggestions}
            disabled={isGenerating}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: isGenerating ? '#d1d5db' : '#9333ea',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s ease',
            }}
            onMouseEnter={(e) => !isGenerating && (e.currentTarget.style.backgroundColor = '#7c3aed')}
            onMouseLeave={(e) => !isGenerating && (e.currentTarget.style.backgroundColor = '#9333ea')}
          >
            <RefreshCw size={14} className={isGenerating ? 'animate-spin' : ''} />
            {isGenerating ? 'Scanning TaskHub...' : 'Generate from TaskHub'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="t10-ai-banner"
      style={{
        background: '#faf5ff',
        border: '1px solid #e9d5ff',
        borderRadius: '12px',
        marginBottom: '20px',
      }}
    >
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Icon with purple BORDER, not filled */}
          <div 
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              border: '2px solid #9333ea',
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={18} style={{ color: '#9333ea' }} />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 700, color: '#7c3aed', fontSize: '14px' }}>
              AI Suggestions
            </span>
            <span style={{ color: '#9ca3af' }}>·</span>
            <span style={{ color: '#6b7280', fontSize: '14px' }}>
              {pendingSuggestions.length} task{pendingSuggestions.length !== 1 ? 's' : ''} recommended for your Top 10
            </span>
          </div>
        </div>
        
        {/* Purple styled button */}
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            backgroundColor: '#9333ea',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#9333ea'}
        >
          {isExpanded ? 'Hide' : 'Review'}
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>
      
      {isExpanded && (
        <div 
          style={{
            borderTop: '1px solid #e9d5ff',
            padding: '12px 18px',
          }}
        >
          {pendingSuggestions.map((suggestion) => (
            <div 
              key={suggestion.id} 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                marginBottom: '8px',
                border: '1px solid #f3e8ff',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span 
                  style={{ 
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    color: getPriorityColor(suggestion.priority),
                    backgroundColor: getPriorityBgColor(suggestion.priority),
                  }}
                >
                  {suggestion.priority}
                </span>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#1f2937' }}>
                  {suggestion.title}
                </span>
                {suggestion.taskhub_key && (
                  <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#9ca3af' }}>
                    {suggestion.taskhub_key}
                  </span>
                )}
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button 
                  onClick={() => onDismiss?.(suggestion.id)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'transparent',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#6b7280',
                    cursor: 'pointer',
                  }}
                >
                  Dismiss
                </button>
                <button 
                  onClick={() => onAddSuggestion?.(suggestion.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    backgroundColor: '#9333ea',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={14} />
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
