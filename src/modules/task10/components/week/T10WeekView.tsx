// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10WeekView
// Purpose: Main container for the week view page (Prompt 6)
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { T10WeekHeader } from './T10WeekHeader';
import { T10AIBanner } from './T10AIBanner';
import {
  useT10ListById,
  useT10Weeks,
  useT10Items,
  useT10BufferItems,
} from '../../hooks';
import '../../styles/task10.css';

export function T10WeekView() {
  const { listId, weekId } = useParams<{ listId: string; weekId: string }>();
  const navigate = useNavigate();

  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Fetch data
  const { data: list, isLoading: listLoading, error: listError } = useT10ListById(listId || null);
  const { data: weeks, isLoading: weeksLoading } = useT10Weeks(listId || null);
  const { data: items, isLoading: itemsLoading } = useT10Items(weekId || null);
  const { data: bufferItems } = useT10BufferItems(weekId || null);

  // Find current week
  const currentWeek = weeks?.find(w => w.id === weekId);

  // Calculate completed count
  const completedCount = items?.filter(item => item.status === 'done').length || 0;
  const totalCount = items?.length || 0;

  // Loading state
  const isLoading = listLoading || weeksLoading || itemsLoading;

  // Handle week change
  const handleWeekChange = (newWeekId: string) => {
    console.log('[T10] Week changed to:', newWeekId);
  };

  // Handle checkout
  const handleCheckout = () => {
    setShowCheckoutModal(true);
    console.log('[T10] Checkout modal opened');
  };

  // Handle add item
  const handleAddItem = () => {
    setShowAddModal(true);
    console.log('[T10] Add item modal opened');
  };

  // Error state
  if (listError || (!isLoading && !list)) {
    return (
      <div className="t10-module t10-week-view-container">
        <div className="t10-week-view-content">
          <div className="t10-week-error">
            <AlertCircle className="t10-week-error-icon" />
            <h2 className="t10-week-error-title">List not found</h2>
            <p className="t10-week-error-text">
              The list you're looking for doesn't exist or has been deleted.
            </p>
            <button
              type="button"
              className="t10-btn t10-btn-primary"
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
      <div className="t10-module t10-week-view-container">
        <div className="t10-week-view-content">
          <div className="t10-week-loading">
            <div className="t10-week-loading-spinner" />
            <p className="t10-week-loading-text">Loading week...</p>
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
        onAddItem={handleAddItem}
      />

      {/* Content */}
      <div className="t10-week-view-content">
        {/* AI Banner */}
        <T10AIBanner />

        {/* Priority Section Header */}
        <div className="t10-week-section">
          <div className="t10-week-section-header">
            <h2 className="t10-week-section-title">
              This Week's Priorities
            </h2>
            <span className="t10-week-section-stats">
              <strong>{totalCount}</strong>/10 slots filled ·{' '}
              <strong>{completedCount}</strong> completed
            </span>
          </div>

          {/* Priority Cards will be added in Prompt 7 */}
          <div style={{ 
            padding: '32px', 
            backgroundColor: '#ffffff', 
            borderRadius: '12px', 
            border: '1px solid #e2e8f0',
            textAlign: 'center',
            color: '#64748b'
          }}>
            <p style={{ margin: 0 }}>Priority cards will be implemented in Prompt 7</p>
            <p style={{ margin: '8px 0 0', fontSize: '13px' }}>
              {items?.length || 0} items loaded from database
            </p>
          </div>
        </div>

        {/* Buffer Zone placeholder */}
        {bufferItems && bufferItems.length > 0 && (
          <div className="t10-week-section" style={{ marginTop: '24px' }}>
            <div className="t10-week-section-header">
              <h2 className="t10-week-section-title">
                Buffer Zone
              </h2>
              <span className="t10-week-section-stats">
                <strong>{bufferItems.length}</strong> items waiting
              </span>
            </div>
            <div style={{ 
              padding: '24px', 
              backgroundColor: '#ffffff', 
              borderRadius: '12px', 
              border: '2px dashed #e2e8f0',
              textAlign: 'center',
              color: '#94a3b8'
            }}>
              Buffer zone items (rank 11+) will be shown here
            </div>
          </div>
        )}
      </div>

      {/* Modals will be added later */}
      {/* {showCheckoutModal && <T10CheckoutModal ... />} */}
      {/* {showAddModal && <T10AddItemModal ... />} */}
    </div>
  );
}

export default T10WeekView;
