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
    <div className="t10-detail-ai-section">
      {/* Collapsed header */}
      <div className="t10-detail-ai-card" onClick={() => setExpanded(!expanded)} style={{ cursor: 'pointer' }}>
        <div className="t10-detail-ai-left">
          <div className="t10-detail-ai-icon">
            <Zap size={20} />
          </div>
          <div className="t10-detail-ai-content">
            <div className="t10-detail-ai-title">
              AI Suggestions
              {aiEnhanced && (
                <span style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: 4, 
                  marginLeft: 8,
                  padding: '2px 8px',
                  fontSize: 11,
                  fontWeight: 600,
                  background: '#f3e8ff',
                  color: '#7c3aed',
                  borderRadius: 4
                }}>
                  <Sparkles size={12} /> Enhanced
                </span>
              )}
            </div>
            <div className="t10-detail-ai-subtitle">
              {slotsAvailable > 0 
                ? `${slotsAvailable} slots available`
                : 'Top 10 is full'
              }
            </div>
          </div>
        </div>
        <button 
          className={`t10-detail-ai-toggle ${expanded ? 'expanded' : ''}`}
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        >
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

      {/* Expanded panel */}
      {expanded && (
        <div className="t10-detail-ai-panel">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            marginBottom: 12,
            fontSize: 13,
            color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748b))',
            background: 'var(--ds-surface-sunken, var(--ds-surface-sunken, #f1f5f9))',
            borderRadius: 8
          }}>
            <Info size={16} />
            Showing HIGH and CRITICAL priority tasks from TaskHub
            {participantNames.length > 0 && ' assigned to this list\'s participants'}
          </div>

          {isLoading && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: 12, 
              padding: 32,
              color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748b))'
            }}>
              <Loader2 size={24} className="animate-spin" />
              <span>Analyzing backlog tasks...</span>
            </div>
          )}

          {error && (
            <div style={{ padding: '20px 16px', color: 'var(--ds-text-danger, var(--ds-text-danger, #dc2626))', textAlign: 'center' }}>
              Failed to load suggestions. Please try again later.
            </div>
          )}

          {!isLoading && !error && suggestions.length === 0 && (
            <div style={{ padding: '20px 16px', color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748b))', textAlign: 'center' }}>
              No high-priority tasks found in your backlog that aren't already in this week's list.
            </div>
          )}

          {suggestions.map((suggestion) => (
            <div key={suggestion.id} className="t10-detail-ai-suggestion-item">
              <div className="t10-detail-ai-suggestion-left">
                <div className={`t10-detail-ai-priority t10-detail-ai-priority-${suggestion.priority === 'critical' ? 'p1' : 'p2'}`}>
                  {suggestion.priority === 'critical' ? 'P1' : 'P2'}
                </div>
                <div style={{ minWidth: 0 }}>
                  <span className="t10-detail-ai-suggestion-text">{suggestion.title}</span>
                  <div className="t10-detail-ai-suggestion-meta">
                    <span className="t10-detail-ai-suggestion-key">{suggestion.key}</span>
                    {suggestion.assignee_name && suggestion.assignee_name !== 'Unassigned' && (
                      <> · Assigned to <strong>{suggestion.assignee_name}</strong></>
                    )}
                    {suggestion.due_date && (
                      <> · Due {formatShortDate(suggestion.due_date)}</>
                    )}
                  </div>
                  {suggestion.reason && (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 6, 
                      marginTop: 6,
                      fontSize: 12,
                      color: '#7c3aed'
                    }}>
                      <Sparkles size={12} />
                      {suggestion.reason}
                    </div>
                  )}
                </div>
              </div>
              <button 
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--ds-text-brand, var(--ds-text-brand, #2563eb))',
                  background: 'var(--ds-background-selected, var(--ds-background-selected, #eff6ff))',
                  border: '1px solid #bfdbfe',
                  borderRadius: 6,
                  cursor: slotsAvailable <= 0 ? 'not-allowed' : 'pointer',
                  opacity: slotsAvailable <= 0 ? 0.5 : 1,
                  transition: 'all 0.15s ease'
                }}
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
