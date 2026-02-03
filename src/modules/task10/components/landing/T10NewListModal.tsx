// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10NewListModal
// Purpose: Create new list modal with minimal design
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useCreateT10List } from '../../hooks';
import { useToast } from '@/hooks/use-toast';

interface T10NewListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (listId: string) => void;
}

export function T10NewListModal({ isOpen, onClose, onCreated }: T10NewListModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const createList = useCreateT10List();

  // Focus input on mount
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setName('');
      setDescription('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const newList = await createList.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      console.log('[T10] List created:', newList.name);
      toast({ title: 'List created', description: `"${newList.name}" has been created.` });
      onCreated?.(newList.id);
      onClose();
    } catch (err) {
      console.error('[T10] Error creating list:', err);
      toast({ title: 'Error', description: 'Failed to create list. Please try again.', variant: 'destructive' });
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="t10-modal-overlay" onClick={onClose}>
      <div className="t10-modal" onClick={e => e.stopPropagation()}>
        <div className="t10-modal-header">
          <h2 className="t10-modal-title">Create list</h2>
          <button
            type="button"
            className="t10-modal-close"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="t10-modal-body">
            <div className="t10-form-group">
              <label className="t10-form-label">Name</label>
              <input
                ref={inputRef}
                type="text"
                className="t10-modal-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Q1 Goals"
                maxLength={100}
              />
            </div>

            <div className="t10-form-group">
              <label className="t10-form-label">Description (optional)</label>
              <textarea
                className="t10-modal-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this list for?"
                rows={2}
              />
            </div>
          </div>

          <div className="t10-modal-footer">
            <button
              type="button"
              className="t10-btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="t10-btn-new"
              disabled={!name.trim() || createList.isPending}
            >
              {createList.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default T10NewListModal;
