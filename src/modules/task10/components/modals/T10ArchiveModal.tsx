import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Archive, X } from 'lucide-react';

interface T10ArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  listName: string;
  onArchive: () => void;
}

export function T10ArchiveModal({ isOpen, onClose, listName, onArchive }: T10ArchiveModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100001] flex items-center justify-center" style={{ isolation: 'isolate' }}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-border bg-background text-foreground shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-foreground">
              <Archive size={18} />
            </span>
            <h2 className="text-base font-semibold">Archive list</h2>
          </div>
          <button
            type="button"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-2">
          <p className="text-sm">
            Archive <strong className="font-semibold">“{listName}”</strong>?
          </p>
          <p className="text-sm text-muted-foreground">
            You can restore it later from the Archived tab.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-border bg-muted/40">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-input bg-background px-4 text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onArchive}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-95"
          >
            Archive
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default T10ArchiveModal;
