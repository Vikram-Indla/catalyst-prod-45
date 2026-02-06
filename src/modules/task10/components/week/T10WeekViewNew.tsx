// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10WeekViewNew (V2 Design Tokens)
// Purpose: Complete week view with modals, side panel, and past week read-only
// Refactored: Using task10-v2.css design tokens
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, Lock, Plus } from 'lucide-react';
import { T10WeekHeader } from './T10WeekHeader';
import { T10AIBanner } from './T10AIBanner';
import { T10SidePanelNew } from '../panel/T10SidePanelNew';
import { T10CheckoutModalNew } from '../modals/T10CheckoutModalNew';
import { T10AddItemModal } from '../modals/T10AddItemModal';
import {
  useT10ListById,
  useT10Weeks,
  useT10Items,
  useT10BufferItems,
} from '../../hooks';
import type { T10ItemFull } from '../../types';
import '../../styles/task10-v2.css';

export function T10WeekViewNew() {
  const { listId, weekId } = useParams<{ listId: string; weekId: string }>();
  const navigate = useNavigate();

  // Modal states
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalRank, setAddModalRank] = useState(1);

  // Side panel state
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showSidePanel, setShowSidePanel] = useState(false);

  // Fetch data
  const { data: list, isLoading: listLoading, error: listError } = useT10ListById(listId || null);
  const { data: weeks, isLoading: weeksLoading, refetch: refetchWeeks } = useT10Weeks(listId || null);
  const { data: items, isLoading: itemsLoading, refetch: refetchItems } = useT10Items(weekId || null);
  const { data: bufferItems, refetch: refetchBuffer } = useT10BufferItems(weekId || null);

  // Find current week
  const currentWeek = weeks?.find(w => w.id === weekId);
  const isCurrentWeek = currentWeek?.is_current ?? false;

  // Calculate counts
  const allItems = [...(items || []), ...(bufferItems || [])] as T10ItemFull[];
  const completedItems = allItems.filter(item => item.status === 'done');
  const incompleteItems = allItems.filter(item => item.status !== 'done');
  const completedCount = completedItems.length;
  const totalCount = allItems.length;

  // Loading state
  const isLoading = listLoading || weeksLoading || itemsLoading;

  // Handlers
  const handleWeekChange = (newWeekId: string) => {
    navigate(`/priorities/list/${listId}/week/${newWeekId}`, { replace: true });
    console.log('[T10] Week changed to:', newWeekId);
  };

  const handleCheckout = () => {
    if (completedCount > 0) {
      setShowCheckoutModal(true);
      console.log('[T10] Checkout modal opened');
    }
  };

  const handleAddItem = (rank?: number) => {
    setAddModalRank(rank || (items?.length || 0) + 1);
    setShowAddModal(true);
    console.log('[T10] Add item modal opened');
  };

  const handleItemClick = (item: T10ItemFull) => {
    setSelectedItemId(item.id);
    setShowSidePanel(true);
    console.log('[T10] Item selected:', item.title);
  };

  const handleRefresh = () => {
    refetchItems();
    refetchBuffer();
    refetchWeeks();
  };

  // Error state
  if (listError || (!isLoading && !list)) {
    return (
      <div className="t10-module-v2 t10-week-container">
        <div className="t10-week-content">
          <div className="t10-error-center">
            <AlertCircle size={48} className="t10-error-icon" />
            <h2 className="t10-error-title">List not found</h2>
            <p className="t10-error-text">
              The list you're looking for doesn't exist or has been deleted.
            </p>
            <button
              type="button"
              className="t10-btn-new"
              onClick={() => navigate('/priorities')}
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
      <div className="t10-module-v2 t10-week-container">
        <div className="t10-week-content">
          <div className="t10-loading-center">
            <div className="t10-week-loading-spinner" />
            <p className="t10-loading-text">Loading week...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="t10-module-v2 t10-week-container">
      {/* Header */}
      <T10WeekHeader
        list={list}
        week={currentWeek}
        allWeeks={weeks || []}
        completedCount={completedCount}
        onWeekChange={handleWeekChange}
        onCheckout={handleCheckout}
        onAddItem={() => handleAddItem()}
      />

      {/* Content */}
      <div className="t10-week-content">
        {/* Past Week Banner */}
        {!isCurrentWeek && (
          <div className="t10-past-week-banner">
            <div className="t10-past-week-icon">
              <Lock size={16} />
            </div>
            <p className="t10-past-week-text">
              <strong>Past week (read-only)</strong> — You can view items but cannot edit this week.
            </p>
          </div>
        )}

        {/* AI Banner - only on current week */}
        {isCurrentWeek && <T10AIBanner />}

        {/* Priority Section */}
        <div className="t10-week-section">
          <div className="t10-week-section-header">
            <h2 className="t10-week-section-title">This Week's Priorities</h2>
            <span className="t10-week-section-meta">
              <strong>{totalCount}</strong>/10 slots filled · <strong>{completedCount}</strong> completed
            </span>
          </div>

          {/* Priority Cards */}
          {items && items.length > 0 ? (
            <div className="t10-priority-list">
              {(items as T10ItemFull[]).map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`t10-priority-card ${item.status === 'done' ? 't10-priority-card-done' : ''}`}
                >
                  {/* Rank Badge */}
                  <div className={`t10-priority-rank ${item.rank <= 5 ? 't10-priority-rank-high' : 't10-priority-rank-low'}`}>
                    {item.rank}
                  </div>

                  {/* Content */}
                  <div className="t10-priority-content">
                    <div className={`t10-priority-title ${item.status === 'done' ? 't10-priority-title-done' : ''}`}>
                      {item.title}
                    </div>
                    {item.taskhub_key && (
                      <span className="t10-priority-key">{item.taskhub_key}</span>
                    )}
                  </div>

                  {/* Status */}
                  {item.status === 'done' && (
                    <span className="t10-badge t10-badge-done">Done</span>
                  )}

                  {/* Carryover indicator */}
                  {item.carryover_count > 0 && (
                    <span className="t10-badge t10-badge-carryover">
                      →×{item.carryover_count + 1}
                    </span>
                  )}
                </div>
              ))}

              {/* Add Item Button */}
              {isCurrentWeek && items.length < 10 && (
                <button
                  type="button"
                  onClick={() => handleAddItem(items.length + 1)}
                  className="t10-add-item-btn"
                >
                  <Plus size={16} />
                  Add priority item
                </button>
              )}
            </div>
          ) : (
            <div className="t10-week-empty">
              <p className="t10-week-empty-text">
                {isCurrentWeek ? 'No priorities yet. Add your first item!' : 'No items were added to this week.'}
              </p>
              {isCurrentWeek && (
                <button
                  type="button"
                  onClick={() => handleAddItem(1)}
                  className="t10-btn-new"
                >
                  <Plus size={16} />
                  Add First Priority
                </button>
              )}
            </div>
          )}
        </div>

        {/* Buffer Zone */}
        {bufferItems && bufferItems.length > 0 && (
          <div className="t10-week-section">
            <div className="t10-week-section-header">
              <h2 className="t10-week-section-title t10-week-section-title-muted">Buffer Zone</h2>
              <span className="t10-week-section-meta">
                <strong>{bufferItems.length}</strong> items waiting
              </span>
            </div>

            <div className="t10-priority-list">
              {bufferItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className="t10-buffer-card"
                >
                  <div className="t10-buffer-rank">{item.rank}</div>
                  <div className="t10-priority-content">
                    <div className="t10-buffer-title">{item.title}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Side Panel */}
      {showSidePanel && selectedItemId && (
        <T10SidePanelNew
          itemId={selectedItemId}
          onClose={() => {
            setShowSidePanel(false);
            setSelectedItemId(null);
          }}
          onUpdated={handleRefresh}
          onDeleted={() => {
            handleRefresh();
            setShowSidePanel(false);
            setSelectedItemId(null);
          }}
        />
      )}

      {/* Checkout Modal */}
      {showCheckoutModal && completedItems.length > 0 && (
        <T10CheckoutModalNew
          weekId={weekId || ''}
          listId={listId || ''}
          completedItems={completedItems}
          incompleteCount={incompleteItems.length}
          onClose={() => setShowCheckoutModal(false)}
          onCheckoutComplete={() => {
            setShowCheckoutModal(false);
            handleRefresh();
          }}
        />
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <T10AddItemModal
          weekId={weekId || ''}
          defaultRank={addModalRank}
          existingRanks={items?.map(i => i.rank) || []}
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            setShowAddModal(false);
            handleRefresh();
          }}
        />
      )}
    </div>
  );
}

export default T10WeekViewNew;
