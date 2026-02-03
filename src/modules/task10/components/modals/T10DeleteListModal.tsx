// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ DELETE LIST MODAL COMPONENT
// GitHub-style confirmation with name match
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { X, Loader2, AlertTriangle } from 'lucide-react';
import { useDeleteT10List } from '../../hooks';
import type { T10ListRow } from '../../types';

interface T10DeleteListModalProps {
  isOpen: boolean;
  list: T10ListRow | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function T10DeleteListModal({ isOpen, list, onClose, onSuccess }: T10DeleteListModalProps) {
  const [confirmText, setConfirmText] = useState('');
  
  const deleteList = useDeleteT10List();

  // Reset on open/close
  useEffect(() => {
    if (!isOpen) {
      setConfirmText('');
    }
  }, [isOpen]);

  const isConfirmValid = confirmText === list?.name;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!list || !isConfirmValid) return;

    try {
      await deleteList.mutateAsync(list.id);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to delete list:', error);
    }
  };

  if (!isOpen || !list) return null;

  return (
    <div className="t10-modal-backdrop" onClick={onClose}>
      <div className="t10-modal t10-modal--danger" onClick={(e) => e.stopPropagation()}>
        <header className="t10-modal__header">
          <div className="t10-modal__header-icon t10-modal__header-icon--danger">
            <AlertTriangle />
          </div>
          <div>
            <h2 className="t10-modal__title">Delete List</h2>
            <p className="t10-modal__subtitle">This action cannot be undone</p>
          </div>
          <button className="t10-icon-btn t10-icon-btn--ghost" onClick={onClose}>
            <X />
          </button>
        </header>
        
        <form onSubmit={handleSubmit}>
          <div className="t10-modal__body">
            <div className="t10-delete-warning">
              <p>
                This will permanently delete the list <strong>"{list.name}"</strong> ({list.list_key}), 
                including all weeks and items associated with it.
              </p>
            </div>
            
            <div className="t10-form-field">
              <label className="t10-form-field__label" htmlFor="delete-confirm">
                Please type <strong>{list.name}</strong> to confirm
              </label>
              <input
                id="delete-confirm"
                type="text"
                className="t10-input t10-input--danger"
                placeholder="Enter list name to confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoFocus
                autoComplete="off"
              />
            </div>
          </div>
          
          <footer className="t10-modal__footer">
            <button 
              type="button" 
              className="t10-btn t10-btn--ghost"
              onClick={onClose}
              disabled={deleteList.isPending}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="t10-btn t10-btn--danger"
              disabled={!isConfirmValid || deleteList.isPending}
            >
              {deleteList.isPending ? (
                <>
                  <Loader2 className="t10-btn__icon t10-spinner" />
                  Deleting...
                </>
              ) : (
                'Delete List'
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

export default T10DeleteListModal;
