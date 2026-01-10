import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HistoryDeleteModalProps {
  isOpen: boolean;
  title: string;
  isBulk?: boolean;
  count?: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function HistoryDeleteModal({
  isOpen,
  title,
  isBulk = false,
  count = 1,
  onConfirm,
  onCancel,
}: HistoryDeleteModalProps) {
  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[300] flex items-center justify-center',
        'bg-black/40 animate-in fade-in duration-200'
      )}
      onClick={onCancel}
    >
      <div
        className={cn(
          'bg-white rounded-xl w-[90%] max-w-[440px] shadow-xl',
          'animate-in zoom-in-95 duration-200'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e2e8f0]">
          <h3 className="text-[17px] font-semibold text-[#0f172a]">
            {isBulk ? 'Delete Generations' : 'Delete Generation'}
          </h3>
          <button
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center rounded-md text-[#64748b] hover:bg-[#f1f5f9] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          <p className="text-sm text-[#475569] leading-relaxed">
            {isBulk ? (
              <>
                Are you sure you want to delete <strong>{count} generations</strong>? This action
                cannot be undone.
              </>
            ) : (
              <>
                Are you sure you want to delete "<strong>{title}</strong>"? This action cannot be
                undone.
              </>
            )}
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2.5 px-5 py-4 border-t border-[#e2e8f0]">
          <Button
            variant="outline"
            onClick={onCancel}
            className="border-[#e2e8f0] text-[#0f172a] hover:bg-[#f1f5f9]"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-[#ef4444] hover:bg-[#dc2626] text-white"
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
