// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ RENAME LIST MODAL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useUpdateT10List } from '../../hooks';
import type { T10ListRow } from '../../types';

interface T10RenameListModalProps {
  isOpen: boolean;
  list: T10ListRow | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function T10RenameListModal({ isOpen, list, onClose, onSuccess }: T10RenameListModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  
  const updateList = useUpdateT10List();

  // Sync state with list prop
  useEffect(() => {
    if (list) {
      setName(list.name);
      setDescription(list.description || '');
    }
  }, [list]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!list || !name.trim()) return;

    try {
      await updateList.mutateAsync({
        listId: list.id,
        input: {
          name: name.trim(),
          description: description.trim() || undefined,
        },
      });
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to update list:', error);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    onClose();
  };

  if (!isOpen || !list) return null;

  return (
    <div className="t10-modal-backdrop" onClick={handleClose}>
      <div className="t10-modal" onClick={(e) => e.stopPropagation()}>
        <header className="t10-modal__header">
          <h2 className="t10-modal__title">Rename List</h2>
          <button className="t10-icon-btn t10-icon-btn--ghost" onClick={handleClose}>
            <X />
          </button>
        </header>
        
        <form onSubmit={handleSubmit}>
          <div className="t10-modal__body">
            <div className="t10-form-field">
              <label className="t10-form-field__label" htmlFor="rename-list-name">
                List Name <span className="t10-form-field__required">*</span>
              </label>
              <input
                id="rename-list-name"
                type="text"
                className="t10-input"
                placeholder="e.g., Q1 Product Launch"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
              />
            </div>
            
            <div className="t10-form-field">
              <label className="t10-form-field__label" htmlFor="rename-list-description">
                Description
              </label>
              <textarea
                id="rename-list-description"
                className="t10-textarea"
                placeholder="Optional description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          
          <footer className="t10-modal__footer">
            <button 
              type="button" 
              className="t10-btn t10-btn--ghost"
              onClick={handleClose}
              disabled={updateList.isPending}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="t10-btn t10-btn--primary"
              disabled={!name.trim() || updateList.isPending}
            >
              {updateList.isPending ? (
                <>
                  <Loader2 className="t10-btn__icon t10-spinner" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

export default T10RenameListModal;
