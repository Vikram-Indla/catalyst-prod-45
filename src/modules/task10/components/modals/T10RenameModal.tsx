import React, { useState, useEffect } from 'react';

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
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`t10-modal-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div className="t10-modal" onClick={(e) => e.stopPropagation()}>
        <div className="t10-modal-header">
          <h2 className="t10-modal-title">Rename List</h2>
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
            disabled={!name.trim() || name.trim() === currentName}
          >
            Rename
          </button>
        </div>
      </div>
    </div>
  );
}
