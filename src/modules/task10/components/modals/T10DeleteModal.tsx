import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface T10DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  listName: string;
  onDelete: () => void;
}

export function T10DeleteModal({ isOpen, onClose, listName, onDelete }: T10DeleteModalProps) {
  const [confirmText, setConfirmText] = useState('');

  const canDelete = confirmText === listName;

  const handleDelete = () => {
    if (canDelete) {
      onDelete();
      setConfirmText('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`t10-modal-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div className="t10-modal" onClick={(e) => e.stopPropagation()}>
        <div className="t10-modal-header">
          <h2 className="t10-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={20} style={{ color: '#ef4444' }} />
            Delete List
          </h2>
        </div>
        <div className="t10-modal-content">
          <p style={{ marginBottom: '16px', color: '#4b5563' }}>
            This action cannot be undone. All items and history will be permanently deleted.
          </p>
          <p style={{ marginBottom: '12px', color: '#374151', fontWeight: 500 }}>
            Type <strong>"{listName}"</strong> to confirm:
          </p>
          <input
            type="text"
            className={`t10-input ${confirmText && confirmText !== listName ? 't10-input-danger' : ''}`}
            placeholder="Type list name to confirm..."
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleDelete()}
            autoFocus
          />
        </div>
        <div className="t10-modal-footer">
          <button className="t10-btn t10-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="t10-btn t10-btn-danger"
            onClick={handleDelete}
            disabled={!canDelete}
          >
            Delete List
          </button>
        </div>
      </div>
    </div>
  );
}
