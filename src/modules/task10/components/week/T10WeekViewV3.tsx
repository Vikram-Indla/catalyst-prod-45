// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10WeekViewV3
// Purpose: Main week view detail page matching the provided spec
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { 
  LayoutGrid, ChevronLeft, ChevronRight, Calendar, 
  Zap, ChevronDown, Plus, Check, Layers, Info,
  AlertCircle, GripVertical
} from 'lucide-react';
import {
  useT10ListById,
  useT10Weeks,
  useT10Items,
  useT10BufferItems,
  useT10ToggleItemStatus,
  useT10CreateItem,
  useT10ReorderItems,
} from '../../hooks';
import { useT10AISuggestions, useAddSuggestionToT10 } from '../../hooks/useT10AISuggestions';
import { T10SidePanel } from '../panel/T10SidePanel';
import { formatT10WeekRange, formatShortDate, getDueStatus } from '../../utils';
import type { T10Item } from '../../types';
import '../../styles/task10-detail.css';

export function T10WeekViewV3() {
  const { listId, weekId } = useParams<{ listId: string; weekId: string }>();
  const navigate = useNavigate();

  // UI State
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [selectedItem, setSelectedItem] = useState<T10Item | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Fetch data
  const { data: list, isLoading: listLoading, error: listError } = useT10ListById(listId || null);
  const { data: weeks, isLoading: weeksLoading } = useT10Weeks(listId || null);
  const { data: items, isLoading: itemsLoading } = useT10Items(weekId || null);
  const { data: bufferItems } = useT10BufferItems(weekId || null);
  
  // AI Suggestions
  const { data: aiData, isLoading: aiLoading } = useT10AISuggestions(listId, weekId);
  const addSuggestion = useAddSuggestionToT10();
  
  // Mutations
  const toggleStatus = useT10ToggleItemStatus();
  const createItem = useT10CreateItem();

  // Find current week and calculate index
  const currentWeek = weeks?.find(w => w.id === weekId);
  const currentWeekIndex = weeks?.findIndex(w => w.id === weekId) ?? -1;
  const hasPrevWeek = currentWeekIndex > 0;
  const hasNextWeek = currentWeekIndex < (weeks?.length ?? 0) - 1;

  // Calculate stats
  const completedCount = items?.filter(item => item.status === 'done').length || 0;
  const totalCount = items?.length || 0;
  const slotsAvailable = 10 - totalCount;

  // Loading state
  const isLoading = listLoading || weeksLoading || itemsLoading;

  // Handle week navigation
  const handlePrevWeek = () => {
    if (hasPrevWeek && weeks) {
      const prevWeek = weeks[currentWeekIndex - 1];
      navigate(`/taskhub/task10/list/${listId}/week/${prevWeek.id}`);
    }
  };

  const handleNextWeek = () => {
    if (hasNextWeek && weeks) {
      const nextWeek = weeks[currentWeekIndex + 1];
      navigate(`/taskhub/task10/list/${listId}/week/${nextWeek.id}`);
    }
  };

  // Handle add new item
  const handleAddItem = async () => {
    if (!newItemText.trim() || !weekId) return;
    
    try {
      await createItem.mutateAsync({
        week_id: weekId,
        title: newItemText.trim(),
        rank: totalCount + 1,
      });
      setNewItemText('');
    } catch (error) {
      console.error('[T10] Error adding item:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddItem();
    }
  };

  // Handle toggle status
  const handleToggleStatus = (item: T10Item) => {
    if (!weekId) return;
    // Cast to T10ItemFull for the mutation
    toggleStatus.mutate(item as any);
  };

  // Handle item click
  const handleItemClick = (item: T10Item) => {
    setSelectedItem(item);
    setIsPanelOpen(true);
  };

  // Handle panel close
  const handlePanelClose = () => {
    setIsPanelOpen(false);
    setTimeout(() => setSelectedItem(null), 200);
  };

  // Handle buffer swap
  const handleBufferSwap = (bufferItem: T10Item) => {
    console.log('[T10] Swap buffer item:', bufferItem.id);
    // TODO: Implement swap logic
  };

  // Handle AI suggestion add
  const handleAddSuggestion = async (suggestion: any) => {
    if (!weekId || slotsAvailable <= 0) return;
    
    try {
      await addSuggestion.mutateAsync({
        weekId,
        suggestion,
        rank: totalCount + 1,
      });
    } catch (error) {
      console.error('[T10] Error adding suggestion:', error);
    }
  };

  // Handle checkout
  const handleCheckout = () => {
    console.log('[T10] Checkout initiated');
    // TODO: Open checkout modal
  };

  // Error state
  if (listError || (!isLoading && !list)) {
    return (
      <div className="t10-detail-page">
        <div className="t10-detail-main">
          <div className="t10-detail-error">
            <AlertCircle size={48} className="t10-detail-error-icon" />
            <h2 className="t10-detail-error-title">List not found</h2>
            <p className="t10-detail-error-text">
              The list you're looking for doesn't exist or has been deleted.
            </p>
            <button
              type="button"
              className="t10-detail-btn-back"
              onClick={() => navigate('/taskhub/task10')}
            >
              Back to Lists
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading || !list || !currentWeek) {
    return (
      <div className="t10-detail-page">
        <div className="t10-detail-main">
          <div className="t10-detail-loading">
            <div className="t10-detail-loading-spinner" />
            <p className="t10-detail-loading-text">Loading week...</p>
          </div>
        </div>
      </div>
    );
  }

  const weekLabel = formatT10WeekRange(currentWeek.week_start, currentWeek.week_end);
  const isCurrentWeek = currentWeek.is_current ?? !currentWeek.is_checked_out;

  // Get participants for AI suggestions
  const participantNames = items?.map(i => i.assignee_name).filter(Boolean) || [];
  const uniqueParticipants = [...new Set(participantNames)].slice(0, 3);

  return (
    <div className="t10-detail-page">
      {/* HEADER */}
      <header className="t10-detail-header">
        <div className="t10-detail-header-left">
          <nav className="t10-detail-breadcrumb">
            <Link to="/taskhub/task10" className="t10-detail-breadcrumb-link">
              <LayoutGrid size={16} strokeWidth={2} />
              Task<sup>10</sup>
            </Link>
            <span className="t10-detail-breadcrumb-sep">/</span>
            <span className="t10-detail-list-key">{list.key}</span>
            <span className="t10-detail-breadcrumb-current">{list.name}</span>
          </nav>
        </div>

        <div className="t10-detail-header-center">
          <div className="t10-detail-week-nav">
            <button 
              className="t10-detail-week-btn"
              onClick={handlePrevWeek}
              disabled={!hasPrevWeek}
            >
              <ChevronLeft size={16} strokeWidth={2} />
            </button>
            <div className="t10-detail-week-display">
              <Calendar size={16} strokeWidth={2} className="t10-detail-week-icon" />
              <span className="t10-detail-week-text">{weekLabel}</span>
              <span className={`t10-detail-week-badge ${!isCurrentWeek ? 't10-detail-week-badge-past' : ''}`}>
                {isCurrentWeek ? 'Current' : 'Past'}
              </span>
            </div>
            <button 
              className="t10-detail-week-btn"
              onClick={handleNextWeek}
              disabled={!hasNextWeek}
            >
              <ChevronRight size={16} strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="t10-detail-header-right">
          <div className="t10-detail-progress">
            <Check size={18} className="t10-detail-progress-check" />
            <span className="t10-detail-progress-text">
              <strong>{completedCount}</strong> of 10 completed
            </span>
          </div>

          <button 
            className="t10-detail-btn-checkout"
            onClick={handleCheckout}
            disabled={completedCount === 0}
          >
            <Check size={16} strokeWidth={2.5} />
            Checkout Week
          </button>
        </div>
      </header>

      {/* MAIN */}
      <main className="t10-detail-main">
        {/* AI SUGGESTIONS */}
        <div className="t10-detail-ai-section">
          <div className="t10-detail-ai-card">
            <div className="t10-detail-ai-left">
              <div className="t10-detail-ai-icon">
                <Zap size={18} strokeWidth={2} />
              </div>
              <div className="t10-detail-ai-content">
                <span className="t10-detail-ai-title">AI Suggestions</span>
                <span className="t10-detail-ai-subtitle">
                  {uniqueParticipants.length > 0 
                    ? `Based on TaskHub items for ${uniqueParticipants.join(', ')}`
                    : 'Based on TaskHub backlog items'
                  }
                </span>
              </div>
            </div>
            <button 
              className={`t10-detail-ai-toggle ${aiPanelOpen ? 'expanded' : ''}`}
              onClick={() => setAiPanelOpen(!aiPanelOpen)}
            >
              <ChevronDown size={14} strokeWidth={2} />
              {aiPanelOpen ? 'Hide' : 'Show'}
            </button>
          </div>

          {aiPanelOpen && (
            <div className="t10-detail-ai-panel">
              <div className="t10-detail-ai-panel-header">
                <Info size={14} strokeWidth={2} />
                Showing HIGH and CRITICAL priority tasks assigned to participants
              </div>
              
              {aiLoading ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                  Loading suggestions...
                </div>
              ) : aiData?.suggestions && aiData.suggestions.length > 0 ? (
                aiData.suggestions.slice(0, 3).map((suggestion, i) => (
                  <div key={suggestion.id} className="t10-detail-ai-suggestion-item">
                    <div className="t10-detail-ai-suggestion-left">
                      <span className={`t10-detail-ai-priority t10-detail-ai-priority-p${i + 1}`}>
                        P{i + 1}
                      </span>
                      <div>
                        <span className="t10-detail-ai-suggestion-text">{suggestion.title}</span>
                        <div className="t10-detail-ai-suggestion-meta">
                          {suggestion.due_date && `Due ${formatShortDate(suggestion.due_date)}`}
                          {suggestion.assignee_name && ` · ${suggestion.assignee_name}`}
                        </div>
                      </div>
                    </div>
                    <span className="t10-detail-ai-suggestion-key">{suggestion.key}</span>
                    <button 
                      className="t10-detail-ai-add-btn"
                      onClick={() => handleAddSuggestion(suggestion)}
                      disabled={slotsAvailable <= 0}
                    >
                      + Add
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                  No suggestions available
                </div>
              )}
            </div>
          )}
        </div>

        {/* ADD INPUT */}
        <div className="t10-detail-add-container">
          <div className="t10-detail-add-wrapper">
            <Plus size={20} strokeWidth={2.5} className="t10-detail-add-icon" />
            <input 
              type="text"
              className="t10-detail-add-input"
              placeholder="Add list item or paste TaskHub key..."
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <div className="t10-detail-add-hint">
              <kbd>Enter</kbd> to add
            </div>
          </div>
        </div>

        {/* PRIORITY LIST */}
        <div className="t10-detail-priority-section">
          <div className="t10-detail-priority-header">
            <span className="t10-detail-priority-title">Top 10 Priorities</span>
            <span className="t10-detail-priority-count">
              {totalCount}/10 slots
            </span>
          </div>

          <div className="t10-detail-priority-list">
            {items && items.length > 0 ? (
              items.map(item => {
                const isCompleted = item.status === 'done';
                const dueStatus = item.due_date ? getDueStatus(item.due_date) : 'normal';
                
                return (
                  <div 
                    key={item.id}
                    className={`t10-detail-priority-item ${isCompleted ? 't10-detail-priority-item-completed' : ''}`}
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="t10-detail-drag-handle">
                      <GripVertical size={16} />
                    </div>
                    
                    <div className={`t10-detail-rank ${item.rank > 5 ? 't10-detail-rank-low' : ''}`}>
                      {item.rank}
                    </div>
                    
                    <div className="t10-detail-priority-content">
                      <span className="t10-detail-priority-text">{item.title}</span>
                      <div className="t10-detail-priority-meta">
                        {item.label && (
                          <span className="t10-detail-priority-label">{item.label}</span>
                        )}
                        {item.assignee_name && (
                          <span className="t10-detail-priority-assignee">
                            <span className="t10-detail-priority-assignee-avatar">
                              {item.assignee_initials || item.assignee_name.substring(0, 2).toUpperCase()}
                            </span>
                            {item.assignee_name}
                          </span>
                        )}
                        {item.due_date && (
                          <span className={`t10-detail-priority-due ${dueStatus === 'overdue' ? 't10-detail-priority-due-overdue' : ''} ${dueStatus === 'today' ? 't10-detail-priority-due-today' : ''}`}>
                            <Calendar size={12} />
                            {formatShortDate(item.due_date)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div 
                      className="t10-detail-checkbox"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStatus(item);
                      }}
                    >
                      <input 
                        type="checkbox"
                        className="t10-detail-checkbox-input"
                        checked={isCompleted}
                        onChange={() => {}}
                      />
                      <div className="t10-detail-checkbox-visual">
                        <Check size={14} strokeWidth={3} />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ 
                padding: '40px', 
                textAlign: 'center', 
                color: '#94a3b8',
                background: '#f8fafc',
                borderRadius: '12px',
                border: '1px dashed #e2e8f0'
              }}>
                No items yet. Add your first priority above.
              </div>
            )}
          </div>
        </div>

        {/* BUFFER ZONE */}
        {bufferItems && bufferItems.length > 0 && (
          <div className="t10-detail-buffer-section">
            <div className="t10-detail-buffer-header">
              <Layers size={16} strokeWidth={2} className="t10-detail-buffer-icon" />
              <span className="t10-detail-buffer-title">Buffer Zone</span>
              <span className="t10-detail-buffer-count">{bufferItems.length}</span>
            </div>
            {bufferItems.map(item => (
              <div key={item.id} className="t10-detail-buffer-item">
                <div className="t10-detail-buffer-rank">{item.rank}</div>
                <div className="t10-detail-buffer-content">
                  <span className="t10-detail-buffer-text">{item.title}</span>
                </div>
                <button 
                  className="t10-detail-buffer-swap"
                  onClick={() => handleBufferSwap(item)}
                >
                  Swap with #10
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Side Panel */}
      <T10SidePanel
        item={selectedItem}
        isOpen={isPanelOpen}
        onClose={handlePanelClose}
        onUpdate={(updates) => {
          console.log('[T10] Update item:', updates);
          // TODO: Implement update
        }}
        onDelete={() => {
          console.log('[T10] Delete item');
          // TODO: Implement delete
        }}
        isReadOnly={!isCurrentWeek}
      />
    </div>
  );
}

export default T10WeekViewV3;
