// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10WeekViewNew (FINAL VERSION)
// Purpose: Complete week view with modals, side panel, and past week read-only
// Prompt 9 of 9 Complete Rebuild
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
    navigate(`/taskhub/task10/list/${listId}/week/${newWeekId}`, { replace: true });
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
      <div className="t10-module t10-week-view-container">
        <div className="t10-week-view-content">
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '64px 24px',
              textAlign: 'center',
            }}
          >
            <AlertCircle size={48} style={{ color: '#ef4444', marginBottom: '16px' }} />
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>
              List not found
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
              The list you're looking for doesn't exist or has been deleted.
            </p>
            <button
              type="button"
              className="t10-btn t10-btn-primary"
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
      <div className="t10-module t10-week-view-container">
        <div className="t10-week-view-content">
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '64px 24px',
            }}
          >
            <div className="t10-week-loading-spinner" />
            <p style={{ fontSize: '14px', color: '#64748b', marginTop: '16px' }}>
              Loading week...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="t10-module t10-week-view-container">
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
      <div className="t10-week-view-content">
        {/* Past Week Banner */}
        {!isCurrentWeek && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                backgroundColor: '#e5e7eb',
                borderRadius: '6px',
                color: '#6b7280',
              }}
            >
              <Lock size={16} />
            </div>
            <p style={{ fontSize: '14px', color: '#4b5563', margin: 0 }}>
              <strong style={{ color: '#374151' }}>Past week (read-only)</strong> — You can view items but cannot edit this week.
            </p>
          </div>
        )}

        {/* AI Banner - only on current week */}
        {isCurrentWeek && <T10AIBanner />}

        {/* Priority Section */}
        <div className="t10-week-section" style={{ marginTop: '24px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>
              This Week's Priorities
            </h2>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>
              <strong>{totalCount}</strong>/10 slots filled ·{' '}
              <strong>{completedCount}</strong> completed
            </span>
          </div>

          {/* Priority Cards */}
          {items && items.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(items as T10ItemFull[]).map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '14px 16px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    opacity: item.status === 'done' ? 0.7 : 1,
                  }}
                >
                  {/* Rank Badge */}
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: item.rank <= 5 ? '#ffffff' : '#6b7280',
                      background:
                        item.rank <= 5
                          ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
                          : '#f3f4f6',
                      borderRadius: '8px',
                      boxShadow: item.rank <= 5 ? '0 2px 8px rgba(37, 99, 235, 0.3)' : 'none',
                    }}
                  >
                    {item.rank}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        color: '#111827',
                        textDecoration: item.status === 'done' ? 'line-through' : 'none',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.title}
                    </div>
                    {item.taskhub_key && (
                      <span
                        style={{
                          fontFamily: "'SF Mono', Monaco, monospace",
                          fontSize: '11px',
                          color: '#6b7280',
                        }}
                      >
                        {item.taskhub_key}
                      </span>
                    )}
                  </div>

                  {/* Status */}
                  {item.status === 'done' && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        color: '#10b981',
                        padding: '4px 8px',
                        backgroundColor: '#ecfdf5',
                        borderRadius: '9999px',
                      }}
                    >
                      Done
                    </span>
                  )}

                  {/* Carryover indicator */}
                  {item.carryover_count > 0 && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        color: '#f59e0b',
                        padding: '4px 8px',
                        backgroundColor: '#fffbeb',
                        borderRadius: '9999px',
                      }}
                    >
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
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '14px 16px',
                    backgroundColor: 'transparent',
                    border: '2px dashed #d1d5db',
                    borderRadius: '10px',
                    color: '#9ca3af',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={16} />
                  Add priority item
                </button>
              )}
            </div>
          ) : (
            <div
              style={{
                padding: '48px 24px',
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 16px' }}>
                {isCurrentWeek ? 'No priorities yet. Add your first item!' : 'No items were added to this week.'}
              </p>
              {isCurrentWeek && (
                <button
                  type="button"
                  onClick={() => handleAddItem(1)}
                  className="t10-btn t10-btn-primary"
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
          <div className="t10-week-section" style={{ marginTop: '24px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#6b7280', margin: 0 }}>
                Buffer Zone
              </h2>
              <span style={{ fontSize: '13px', color: '#9ca3af' }}>
                <strong>{bufferItems.length}</strong> items waiting
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {bufferItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '12px 16px',
                    backgroundColor: '#ffffff',
                    border: '2px dashed #e5e7eb',
                    borderRadius: '10px',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#9ca3af',
                      backgroundColor: 'transparent',
                      border: '2px dashed #d1d5db',
                      borderRadius: '6px',
                    }}
                  >
                    {item.rank}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        color: '#6b7280',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.title}
                    </div>
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
