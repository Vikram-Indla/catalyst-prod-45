// ============================================================
// File: src/modules/priorities/pages/PriWeekPage.tsx
// ============================================================

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  usePriList,
  usePriCurrentWeek,
  usePriItemsSplit,
  usePriLabels,
  useCreatePriItem,
  useCyclePriItemStatus,
  useUpdatePriItem,
  useDeletePriItem,
  useConfirmCarryover,
  useCheckoutPriWeek,
  useUpdatePriItemLabels,
  usePriToast,
} from '../hooks';
import {
  PriWeekHeader,
  PriQuickAdd,
  PriPriorityCard,
  PriSidePanel,
  PriCheckoutModal,
  PriCarryoverBanner,
  PriEmptyState,
  PriToastContainer,
} from '../components';
import type { PriItemFull, PriUpdateItemInput, PriCheckoutDecisionItem } from '../types';
import styles from '../styles/priorities.module.css';

interface PriWeekPageProps {
  listId?: string;
}

export function PriWeekPage({ listId: propListId }: PriWeekPageProps) {
  const params = useParams<{ listId: string }>();
  const listId = propListId || params.listId || '';
  const [selectedItem, setSelectedItem] = useState<PriItemFull | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Data hooks
  const { data: list, isLoading: listLoading } = usePriList(listId);
  const { data: week, isLoading: weekLoading } = usePriCurrentWeek(listId);
  const { split, data: items } = usePriItemsSplit(week?.id);
  const { data: labels } = usePriLabels(listId);

  // Mutation hooks
  const createItem = useCreatePriItem();
  const cycleStatus = useCyclePriItemStatus();
  const updateItem = useUpdatePriItem();
  const deleteItem = useDeletePriItem();
  const confirmCarryover = useConfirmCarryover();
  const checkoutWeek = useCheckoutPriWeek();
  const updateItemLabels = useUpdatePriItemLabels();

  // Toast
  const toast = usePriToast();

  // Loading state
  if (listLoading || weekLoading) {
    return (
      <div className={styles['pri-root']}>
        <div className={styles['pri-loading']}>
          <span className={styles['pri-spinner']} />
          Loading priorities...
        </div>
      </div>
    );
  }

  if (!list || !week) {
    return (
      <div className={styles['pri-root']}>
        <div className={styles['pri-loading']}>
          Priority list not found.
        </div>
      </div>
    );
  }

  // Carryover items
  const carryoverItems = items?.filter((i) => i.is_carryover) ?? [];

  // Handlers
  const handleCreateItem = (title: string) => {
    createItem.mutate(
      { list_id: listId, week_id: week.id, title },
      {
        onSuccess: () => toast.success('Priority added'),
        onError: () => toast.error('Failed to add priority'),
      }
    );
  };

  const handleStatusChange = (item: PriItemFull) => {
    cycleStatus.mutate(
      { itemId: item.id, weekId: week.id },
      {
        onSuccess: (result) => toast.success(`Status: ${result.newStatus.replace('_', ' ')}`),
        onError: () => toast.error('Failed to update status'),
      }
    );
  };

  const handleEdit = (item: PriItemFull) => {
    setSelectedItem(item);
    setIsPanelOpen(true);
  };

  const handleSave = (input: PriUpdateItemInput) => {
    updateItem.mutate(input, {
      onSuccess: () => toast.success('Priority updated'),
      onError: () => toast.error('Failed to update priority'),
    });
  };

  const handleDelete = (item: PriItemFull) => {
    deleteItem.mutate(
      { itemId: item.id, weekId: week.id },
      {
        onSuccess: () => toast.success('Priority deleted'),
        onError: () => toast.error('Failed to delete priority'),
      }
    );
  };

  const handleTitleChange = (item: PriItemFull, newTitle: string) => {
    updateItem.mutate({ id: item.id, title: newTitle });
  };

  const handleConfirmCarryover = () => {
    const ids = carryoverItems.map((i) => i.id);
    confirmCarryover.mutate(
      { weekId: week.id, itemIds: ids },
      {
        onSuccess: () => toast.success('Carryover items confirmed'),
      }
    );
  };

  const handleCheckout = (decisions: PriCheckoutDecisionItem[]) => {
    checkoutWeek.mutate(
      { week_id: week.id, decisions },
      {
        onSuccess: () => toast.success('Week checked out successfully'),
        onError: () => toast.error('Failed to checkout week'),
      }
    );
  };

  const handleLabelsChange = (itemId: string, labelIds: string[]) => {
    updateItemLabels.mutate({ itemId, labelIds, weekId: week.id });
  };

  return (
    <div className={styles['pri-root']}>
      <div className={styles['pri-shell']}>
        <div className={styles['pri-main']}>
          {/* Week Header */}
          <PriWeekHeader
            list={list}
            week={week}
            onCheckout={() => setIsCheckoutOpen(true)}
            isCurrentWeek={week.status === 'active'}
          />

          {/* Carryover Banner */}
          <PriCarryoverBanner
            count={carryoverItems.length}
            onConfirm={handleConfirmCarryover}
          />

          {/* Quick Add */}
          <PriQuickAdd onAdd={handleCreateItem} />

          {/* Top 10 */}
          {split.top.length > 0 ? (
            <section>
              <div className={styles['pri-section-header']}>
                <span className={styles['pri-section-label']}>Top 10</span>
                <span className={styles['pri-section-count']}>
                  {split.top.length} / 10
                </span>
              </div>
              {split.top.map((item) => (
                <PriPriorityCard
                  key={item.id}
                  item={item}
                  onStatusChange={handleStatusChange}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onTitleChange={handleTitleChange}
                />
              ))}
            </section>
          ) : (
            <PriEmptyState type="items" onAction={() => {}} />
          )}

          {/* Overflow */}
          {split.overflow.length > 0 && (
            <section>
              <div className={styles['pri-section-divider']}>
                <span className={styles['pri-section-divider-line']} />
                <span className={styles['pri-section-divider-text']}>
                  Overflow ({split.overflow.length})
                </span>
                <span className={styles['pri-section-divider-line']} />
              </div>
              {split.overflow.map((item) => (
                <PriPriorityCard
                  key={item.id}
                  item={item}
                  onStatusChange={handleStatusChange}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onTitleChange={handleTitleChange}
                />
              ))}
            </section>
          )}
        </div>

        {/* Side Panel */}
        <PriSidePanel
          item={selectedItem}
          isOpen={isPanelOpen}
          onClose={() => { setIsPanelOpen(false); setSelectedItem(null); }}
          onSave={handleSave}
          onDelete={handleDelete}
          labels={labels ?? []}
          onLabelsChange={handleLabelsChange}
        />

        {/* Checkout Modal */}
        <PriCheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          week={week}
          items={items ?? []}
          onCheckout={handleCheckout}
        />

        {/* Toasts */}
        <PriToastContainer
          toasts={toast.toasts}
          onDismiss={toast.dismissToast}
        />
      </div>
    </div>
  );
}
