import React, { useEffect, useCallback } from 'react';
import type { Resource360Item } from '@/types/resource360';
import { useResource360Siblings } from './hooks/useResource360Siblings';
import { Resource360ContextLeft } from './Resource360ContextLeft';
import { Resource360ContextRight } from './Resource360ContextRight';

interface Props {
  item: Resource360Item | null;
  allItems: Resource360Item[];
  onClose: () => void;
  onNavigate: (item: Resource360Item) => void;
}

export function Resource360ContextModal({ item, allItems, onClose, onNavigate }: Props) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const { data: siblings = [] } = useResource360Siblings(item?.work_item_id ?? null);

  if (!item) return null;

  const parentItem = item.parent_key
    ? allItems.find((t) => t.item_key === item.parent_key) ?? null
    : null;

  const children = allItems.filter((t) => t.parent_key === item.item_key);

  const handleSiblingClick = (key: string) => {
    const target = allItems.find((t) => t.item_key === key);
    if (target) onNavigate(target);
  };

  const handleParentClick = () => {
    if (parentItem) onNavigate(parentItem);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(4px)' }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          style={{
            width: '90%', maxWidth: 960, maxHeight: '85vh',
            background: '#FFFFFF', borderRadius: 14,
            boxShadow: '0 24px 80px rgba(0,0,0,.18)',
            animation: 'r360ModalIn 200ms ease-out',
            overflow: 'hidden',
          }}
        >
          <div className="flex" style={{ height: '85vh', maxHeight: '85vh' }}>
            <Resource360ContextLeft item={item} onClose={onClose} />
            <Resource360ContextRight
              item={item}
              parentItem={parentItem}
              siblings={siblings}
              childItems={children}
              onSiblingClick={handleSiblingClick}
              onParentClick={handleParentClick}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes r360ModalIn {
          from { transform: scale(.97); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );
}
