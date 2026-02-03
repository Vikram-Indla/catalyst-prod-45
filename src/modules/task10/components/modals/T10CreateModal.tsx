import React, { useState } from 'react';

interface T10CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}

export function T10CreateModal({ isOpen, onClose, onCreate }: T10CreateModalProps) {
  const [name, setName] = useState('');

  const handleSubmit = () => {
    if (name.trim()) {
      onCreate(name.trim());
      setName('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`t10-modal-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div className="t10-modal" onClick={(e) => e.stopPropagation()}>
        <div className="t10-modal-header">
          <h2 className="t10-modal-title">Create New List</h2>
        </div>
        <div className="t10-modal-content">
          <input
            type="text"
            className="t10-input"
            placeholder="List name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />
        </div>
        <div className="t10-modal-footer">
          <button className="t10-btn t10-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="t10-btn t10-btn-primary"
            onClick={handleSubmit}
            disabled={!name.trim()}
          >
            Create List
          </button>
        </div>
      </div>
    </div>
  );
}
