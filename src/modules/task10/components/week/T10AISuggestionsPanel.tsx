import React, { useState } from 'react';
import { Zap, ChevronDown, Info, Plus, Loader2, Sparkles } from 'lucide-react';
import { useT10AISuggestions, useAddSuggestionToT10, T10AISuggestion } from '../../hooks/useT10AISuggestions';
import { formatShortDate } from '../../utils';

interface T10AISuggestionsPanelProps {
  listId?: string;
  weekId?: string;
  participants?: string[];
  participantNames?: string[];
  currentTopTenCount: number;
  onSuggestionAdded?: () => void;
  disabled?: boolean;
}

export function T10AISuggestionsPanel({
  listId,
  weekId,
  participants,
  participantNames = [],
  currentTopTenCount,
  onSuggestionAdded,
  disabled = false,
}: T10AISuggestionsPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  const { data, isLoading, error } = useT10AISuggestions(listId, weekId, participants);
  const addSuggestion = useAddSuggestionToT10();

  const suggestions = data?.suggestions || [];
  const aiEnhanced = data?.ai_enhanced || false;
  const slotsAvailable = 10 - currentTopTenCount;

  const handleAddSuggestion = async (suggestion: T10AISuggestion) => {
    if (!weekId || slotsAvailable <= 0) return;
    
    setAddingId(suggestion.id);
    try {
      await addSuggestion.mutateAsync({
        weekId,
        suggestion,
        rank: currentTopTenCount + 1,
      });
      onSuggestionAdded?.();
    } finally {
      setAddingId(null);
    }
  };

  if (disabled) return null;

  return (
    <div className="t10-ai-banner">
      <div className="t10-ai-collapsed" onClick={() => setExpanded(!expanded)}>
        <div className="t10-ai-collapsed-left">
          <div className="t10-ai-icon-wrapper">
            <Zap size={20} />
          </div>
          <div>
            <div className="t10-ai-collapsed-title">
              AI Suggestions
              {aiEnhanced && (
                <span className="t10-ai-enhanced-badge">
                  <Sparkles size={12} /> Enhanced
                </span>
              )}
            </div>
            <div className="t10-ai-collapsed-subtitle">
              {participantNames.length > 0 ? (
                <>Based on participants: <strong>{participantNames.join(', ')}</strong> · </>
              ) : null}
              {slotsAvailable > 0 
                ? `${slotsAvailable} slots available`
                : 'Top 10 is full'
              }
            </div>
          </div>
        </div>
        <button className={`t10-ai-toggle ${expanded ? 'expanded' : ''}`}>
          {isLoading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Loading...
            </>
          ) : error ? (
            'Error loading'
          ) : suggestions.length > 0 ? (
            <>Review {suggestions.length} task{suggestions.length !== 1 ? 's' : ''}</>
          ) : (
            'No suggestions'
          )}
          <ChevronDown size={16} />
        </button>
      </div>

      {expanded && (
        <div className="t10-ai-expanded">
          <div className="t10-ai-info-box">
            <Info size={16} />
            Showing HIGH and CRITICAL priority tasks from TaskHub
            {participantNames.length > 0 && ' assigned to this list\'s participants'}
          </div>

          {isLoading && (
            <div className="t10-ai-loading">
              <Loader2 size={24} className="animate-spin" />
              <span>Analyzing backlog tasks...</span>
            </div>
          )}

          {error && (
            <div className="t10-ai-error">
              Failed to load suggestions. Please try again later.
            </div>
          )}

          {!isLoading && !error && suggestions.length === 0 && (
            <div className="t10-ai-empty">
              No high-priority tasks found in your backlog that aren't already in this week's list.
            </div>
          )}

          {suggestions.map((suggestion) => (
            <div key={suggestion.id} className="t10-ai-suggestion-card">
              <div 
                className={`t10-ai-priority-badge ${suggestion.priority}`}
              >
                {suggestion.priority === 'critical' ? 'Critical' : 'High'}
              </div>
              <div className="t10-ai-suggestion-content">
                <div className="t10-ai-suggestion-title">{suggestion.title}</div>
                <div className="t10-ai-suggestion-meta">
                  <span className="t10-ai-suggestion-key">{suggestion.key}</span>
                  {suggestion.assignee_name && suggestion.assignee_name !== 'Unassigned' && (
                    <>Assigned to <strong>{suggestion.assignee_name}</strong></>
                  )}
                  {suggestion.due_date && (
                    <>
                      {' · '}Due {formatShortDate(suggestion.due_date)}
                    </>
                  )}
                </div>
                {suggestion.reason && (
                  <div className="t10-ai-suggestion-reason">
                    <Sparkles size={12} />
                    {suggestion.reason}
                  </div>
                )}
              </div>
              <button 
                className="t10-ai-add-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddSuggestion(suggestion);
                }}
                disabled={slotsAvailable <= 0 || addingId === suggestion.id}
              >
                {addingId === suggestion.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <>
                    <Plus size={14} />
                    Add
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
