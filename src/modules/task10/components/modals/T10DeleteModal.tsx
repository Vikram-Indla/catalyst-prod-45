import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';

interface T10DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  listName: string;
  onDelete: () => void;
}

export function T10DeleteModal({ isOpen, onClose, listName, onDelete }: T10DeleteModalProps) {
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    if (!isOpen) setConfirmText('');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const canDelete = confirmText === listName;

  const handleDelete = () => {
    if (canDelete) {
      onDelete();
      setConfirmText('');
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100001] flex items-center justify-center" style={{ isolation: 'isolate' }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-border bg-background text-foreground shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <AlertTriangle size={18} />
            </span>
            <h2 className="text-base font-semibold">Delete list</h2>
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

        {/* Content */}
        <div className="px-6 py-5 space-y-3">
          <p className="text-sm text-muted-foreground">
            This action cannot be undone. All items and history will be permanently deleted.
          </p>
          <p className="text-sm">
            Type <strong className="font-semibold">“{listName}”</strong> to confirm.
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleDelete()}
            autoFocus
            placeholder="Type list name…"
            className="w-full rounded-lg border border-input bg-transparent px-3.5 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          />
          {confirmText && confirmText !== listName && (
            <p className="text-xs text-destructive">Name does not match.</p>
          )}
        </div>

        {/* Footer */}
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
            onClick={handleDelete}
            disabled={!canDelete}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-destructive px-4 text-sm font-semibold text-destructive-foreground hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
