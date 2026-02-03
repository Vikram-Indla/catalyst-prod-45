// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ CREATE LIST MODAL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useCreateT10List } from '../../hooks';

interface T10CreateListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (listId: string) => void;
}

export function T10CreateListModal({ isOpen, onClose, onSuccess }: T10CreateListModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  
  const createList = useCreateT10List();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const result = await createList.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      onSuccess?.(result.id);
      handleClose();
    } catch (error) {
      console.error('Failed to create list:', error);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="t10-modal-backdrop" onClick={handleClose}>
      <div className="t10-modal" onClick={(e) => e.stopPropagation()}>
        <header className="t10-modal__header">
          <h2 className="t10-modal__title">Create New List</h2>
          <button className="t10-icon-btn t10-icon-btn--ghost" onClick={handleClose}>
            <X />
          </button>
        </header>
        
        <form onSubmit={handleSubmit}>
          <div className="t10-modal__body">
            <div className="t10-form-field">
              <label className="t10-form-field__label" htmlFor="list-name">
                List Name <span className="t10-form-field__required">*</span>
              </label>
              <input
                id="list-name"
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
              <label className="t10-form-field__label" htmlFor="list-description">
                Description
              </label>
              <textarea
                id="list-description"
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
              disabled={createList.isPending}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="t10-btn t10-btn--primary"
              disabled={!name.trim() || createList.isPending}
            >
              {createList.isPending ? (
                <>
                  <Loader2 className="t10-btn__icon t10-spinner" />
                  Creating...
                </>
              ) : (
                'Create List'
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

export default T10CreateListModal;
