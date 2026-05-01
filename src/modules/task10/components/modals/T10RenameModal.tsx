import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface T10RenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  onRename: (newName: string) => void;
}

export function T10RenameModal({ isOpen, onClose, currentName, onRename }: T10RenameModalProps) {
  const [name, setName] = useState(currentName);

  useEffect(() => {
    setName(currentName);
  }, [currentName]);

  const handleSubmit = () => {
    if (name.trim() && name.trim() !== currentName) {
      onRename(name.trim());
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ isolation: 'isolate' }}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div 
        className="relative z-10 w-full max-w-md mx-4 bg-white dark:bg-[var(--ds-surface-raised,#1A1A1A)] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[var(--ds-border,#2E2E2E)]">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-[var(--ds-text,#EDEDED)]">Rename List</h2>
          <button
            type="button"
            className="p-1.5 rounded-lg text-slate-400 dark:text-[var(--ds-text-subtlest,#878787)] hover:text-slate-600 hover:bg-slate-100 transition-colors"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-[var(--ds-text-subtlest,#A1A1A1)]">
              List Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="List name..."
              autoFocus
              className="w-full px-4 py-2.5 text-[15px] text-slate-900 dark:text-[var(--ds-text,#EDEDED)] placeholder:text-slate-400 dark:placeholder:text-[var(--ds-text-subtlest,#878787)] bg-white dark:bg-[var(--ds-surface-raised,#1A1A1A)] border border-slate-300 dark:border-[var(--ds-border-bold,#454545)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-[var(--ds-border,#2E2E2E)] bg-slate-50 dark:bg-[#111111]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-[var(--ds-text-subtlest,#A1A1A1)] bg-white dark:bg-[var(--ds-surface-raised,#1A1A1A)] border border-slate-300 dark:border-[var(--ds-border-bold,#454545)] rounded-lg hover:bg-slate-50 dark:hover:bg-[var(--ds-surface-overlay,#1F1F1F)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!name.trim() || name.trim() === currentName}
            className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            Rename
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default T10RenameModal;
