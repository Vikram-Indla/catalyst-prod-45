// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10CheckoutModalNew
// Purpose: Modal for checking out (archiving) completed items
// Prompt 9 of 9 Complete Rebuild
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Zap, X, Check, CheckCircle } from 'lucide-react';
import { useCheckoutT10Week, useT10CreateWeek, getCurrentWeekRange } from '../../hooks';
import type { T10ItemFull } from '../../types';

interface T10CheckoutModalNewProps {
  weekId: string;
  listId: string;
  completedItems: T10ItemFull[];
  incompleteCount: number;
  onClose: () => void;
  onCheckoutComplete: () => void;
}

export function T10CheckoutModalNew({
  weekId,
  listId,
  completedItems,
  incompleteCount,
  onClose,
  onCheckoutComplete,
}: T10CheckoutModalNewProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(completedItems.map(i => i.id));
  const [carryOver, setCarryOver] = useState(false);
  const [startNextWeek, setStartNextWeek] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const checkoutWeek = useCheckoutT10Week();
  const createWeek = useT10CreateWeek();

  // Reset when modal opens
  useEffect(() => {
    setSelectedIds(completedItems.map(i => i.id));
    setCarryOver(false);
    setStartNextWeek(false);
    setIsSuccess(false);
  }, [completedItems]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const toggleItem = (itemId: string) => {
    setSelectedIds(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleCheckout = async () => {
    try {
      // Checkout the week with stats
      await checkoutWeek.mutateAsync({
        weekId,
        closedCount: selectedIds.length,
        carriedCount: carryOver ? incompleteCount : 0,
        removedCount: carryOver ? 0 : incompleteCount,
      });

      console.log('[T10] Checkout completed:', selectedIds.length, 'items');

      // Start new week if requested
      if (startNextWeek) {
        const range = getCurrentWeekRange();
        await createWeek.mutateAsync({
          list_id: listId,
          week_start: range.start,
          week_end: range.end,
          is_current: true,
        });
        console.log('[T10] New week started after checkout');
      }

      setIsSuccess(true);

      // Close after showing success
      setTimeout(() => {
        onCheckoutComplete();
      }, 1500);
    } catch (err) {
      console.error('[T10] Checkout error:', err);
    }
  };

  const modalContent = (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          zIndex: 600,
          animation: isClosing ? undefined : 't10-fadeIn 200ms ease',
        }}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100%',
          maxWidth: '520px',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          zIndex: 601,
          overflow: 'hidden',
          animation: isClosing
            ? 't10-scaleOut 200ms ease forwards'
            : 't10-scaleIn 200ms ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Success State */}
        {isSuccess ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '48px 24px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#dcfce7',
                borderRadius: '50%',
                color: '#22c55e',
                marginBottom: '16px',
              }}
            >
              <CheckCircle size={32} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>
              Checkout Complete!
            </h3>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
              {selectedIds.length} items have been checked out.
              {startNextWeek && ' A new week has been started.'}
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '20px 24px',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                }}
              >
                <Zap size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 4px' }}>
                  Check out
                </h2>
                <p style={{ fontSize: '14px', opacity: 0.9, margin: 0 }}>
                  Select items to carry over from this week
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'rgba(255, 255, 255, 0.8)',
                  cursor: 'pointer',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '24px' }}>
              <p style={{ fontSize: '15px', color: '#374151', marginBottom: '16px' }}>
                <strong style={{ color: '#2563eb' }}>{completedItems.length}</strong> items completed this week
              </p>

              {/* Items List */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  maxHeight: '240px',
                  overflowY: 'auto',
                  marginBottom: '20px',
                }}
              >
                {completedItems.map(item => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 14px',
                        backgroundColor: isSelected ? '#eff6ff' : '#f9fafb',
                        border: isSelected ? '1px solid #2563eb' : '1px solid #e5e7eb',
                        borderRadius: '8px',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          border: isSelected ? '2px solid #2563eb' : '2px solid #d1d5db',
                          borderRadius: '4px',
                          backgroundColor: isSelected ? '#2563eb' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isSelected && <Check size={12} color="#ffffff" />}
                      </div>
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#6b7280',
                          backgroundColor: '#e5e7eb',
                          borderRadius: '50%',
                        }}
                      >
                        {item.rank}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            color: '#1f2937',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.title}
                        </div>
                        {item.taskhub_key && (
                          <div
                            style={{
                              fontFamily: "'SF Mono', Monaco, monospace",
                              fontSize: '11px',
                              color: '#6b7280',
                            }}
                          >
                            {item.taskhub_key}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Options */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  paddingTop: '16px',
                  borderTop: '1px solid #f3f4f6',
                }}
              >
                {incompleteCount > 0 && (
                  <label
                    onClick={() => setCarryOver(!carryOver)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        border: carryOver ? '2px solid #2563eb' : '2px solid #d1d5db',
                        borderRadius: '4px',
                        backgroundColor: carryOver ? '#2563eb' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {carryOver && <Check size={10} color="#ffffff" />}
                    </div>
                    <span style={{ fontSize: '14px', color: '#374151' }}>
                      Carry over incomplete items to next week{' '}
                      <span style={{ color: '#6b7280' }}>({incompleteCount} items)</span>
                    </span>
                  </label>
                )}

                <label
                  onClick={() => setStartNextWeek(!startNextWeek)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      border: startNextWeek ? '2px solid #2563eb' : '2px solid #d1d5db',
                      borderRadius: '4px',
                      backgroundColor: startNextWeek ? '#2563eb' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {startNextWeek && <Check size={10} color="#ffffff" />}
                  </div>
                  <span style={{ fontSize: '14px', color: '#374151' }}>
                    Start next week after checkout
                  </span>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                padding: '16px 24px',
                backgroundColor: '#f9fafb',
                borderTop: '1px solid #e5e7eb',
              }}
            >
              <button
                type="button"
                onClick={handleClose}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#374151',
                  backgroundColor: '#ffffff',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCheckout}
                disabled={selectedIds.length === 0 || checkoutWeek.isPending}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#ffffff',
                  backgroundColor: '#2563eb',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: selectedIds.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: selectedIds.length === 0 ? 0.5 : 1,
                }}
              >
                <Zap size={16} />
                {checkoutWeek.isPending ? 'Processing...' : `Checkout ${selectedIds.length} Items`}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}

export default T10CheckoutModalNew;
