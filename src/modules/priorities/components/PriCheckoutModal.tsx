// ============================================================
// File: src/modules/priorities/components/PriCheckoutModal.tsx
// ============================================================

import { useState } from 'react';
import { X } from 'lucide-react';
import type { PriItemFull, PriWeekFull, PriCheckoutDecision, PriCheckoutDecisionItem } from '../types';
import { PriStatusToggle } from './PriStatusToggle';
import styles from '../styles/priorities.module.css';

interface PriCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  week: PriWeekFull | null;
  items: PriItemFull[];
  onCheckout: (decisions: PriCheckoutDecisionItem[]) => void;
}

export function PriCheckoutModal({
  isOpen, onClose, week, items, onCheckout,
}: PriCheckoutModalProps) {
  const [decisions, setDecisions] = useState<Record<string, PriCheckoutDecision>>({});

  const handleDecisionChange = (itemId: string, decision: PriCheckoutDecision) => {
    setDecisions((prev) => ({ ...prev, [itemId]: decision }));
  };

  const handleSubmit = () => {
    const list: PriCheckoutDecisionItem[] = items.map((item) => ({
      item_id: item.id,
      decision: item.status === 'completed'
        ? 'resolved'
        : decisions[item.id] ?? 'leave',
    }));
    onCheckout(list);
    onClose();
  };

  const incompleteItems = items.filter((i) => i.status !== 'completed');
  const completedItems = items.filter((i) => i.status === 'completed');

  return (
    <div className={`${styles['pri-modal-overlay']} ${isOpen ? styles['pri-modal-overlay-open'] : ''}`}>
      <div className={styles['pri-modal']}>
        <div className={styles['pri-modal-header']}>
          <span className={styles['pri-modal-title']}>
            Checkout Week
          </span>
          <button className={styles['pri-btn-icon']} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles['pri-modal-body']}>
          {/* Completed items — auto-resolved */}
          {completedItems.length > 0 && (
            <>
              <div className={styles['pri-section-divider']}>
                <span className={styles['pri-section-divider-line']} />
                <span className={styles['pri-section-divider-text']}>
                  Completed ({completedItems.length})
                </span>
                <span className={styles['pri-section-divider-line']} />
              </div>
              {completedItems.map((item) => (
                <div key={item.id} className={styles['pri-checkout-item']}>
                  <PriStatusToggle status="completed" onToggle={() => {}} size="sm" />
                  <span className={styles['pri-checkout-item-title']}>
                    {item.title}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--pri-success-dark)', fontWeight: 500 }}>
                    Resolved
                  </span>
                </div>
              ))}
            </>
          )}

          {/* Incomplete items — need decisions */}
          {incompleteItems.length > 0 && (
            <>
              <div className={styles['pri-section-divider']}>
                <span className={styles['pri-section-divider-line']} />
                <span className={styles['pri-section-divider-text']}>
                  Needs Decision ({incompleteItems.length})
                </span>
                <span className={styles['pri-section-divider-line']} />
              </div>
              {incompleteItems.map((item) => (
                <div key={item.id} className={styles['pri-checkout-item']}>
                  <PriStatusToggle status={item.status} onToggle={() => {}} size="sm" />
                  <span className={styles['pri-checkout-item-title']}>
                    {item.title}
                  </span>
                  <select
                    className={styles['pri-checkout-select']}
                    value={decisions[item.id] ?? 'leave'}
                    onChange={(e) =>
                      handleDecisionChange(item.id, e.target.value as PriCheckoutDecision)
                    }
                  >
                    <option value="carry">Carry Over</option>
                    <option value="resolved">Mark Resolved</option>
                    <option value="leave">Leave</option>
                  </select>
                </div>
              ))}
            </>
          )}
        </div>

        <div className={styles['pri-modal-footer']}>
          <button className={`${styles['pri-btn']} ${styles['pri-btn-ghost']}`} onClick={onClose}>
            Cancel
          </button>
          <button className={`${styles['pri-btn']} ${styles['pri-btn-checkout']}`} onClick={handleSubmit}>
            Checkout Week
          </button>
        </div>
      </div>
    </div>
  );
}
