// ============================================================
// CHECKLIST TAB
// Progress bar + checklist items + add input
// ============================================================

import React, { useState } from 'react';
import { Check, Edit2, Trash2, Plus } from 'lucide-react';
import type { ChecklistItem } from '../types';

interface ChecklistTabProps {
  checklist: ChecklistItem[];
  onToggleItem: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onAddItem: (text: string) => void;
}

export const ChecklistTab: React.FC<ChecklistTabProps> = ({
  checklist,
  onToggleItem,
  onDeleteItem,
  onAddItem,
}) => {
  const [newItemText, setNewItemText] = useState('');

  const completedCount = checklist.filter((item) => item.completed).length;
  const totalCount = checklist.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleAddItem = () => {
    if (!newItemText.trim()) return;
    onAddItem(newItemText);
    setNewItemText('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddItem();
  };

  return (
    <div className="checklist-tab">
      {/* PROGRESS HEADER */}
      <div className="checklist-header">
        <div className="progress-info">
          <span className="progress-text">
            {completedCount} of {totalCount} complete ({progressPercent}%)
          </span>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* CHECKLIST ITEMS */}
      <div className="checklist-items">
        {checklist.map((item) => (
          <div
            key={item.id}
            className={`checklist-item ${item.completed ? 'completed' : ''}`}
          >
            <div
              className={`checkbox ${item.completed ? 'checked' : ''}`}
              onClick={() => onToggleItem(item.id)}
            >
              {item.completed && <Check size={14} />}
            </div>
            <span className="item-label">{item.text}</span>
            <div className="item-actions">
              <button className="item-action-btn" title="Edit">
                <Edit2 size={16} />
              </button>
              <button
                className="item-action-btn"
                title="Delete"
                onClick={() => onDeleteItem(item.id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ADD ITEM INPUT */}
      <div className="add-item-input">
        <div className="add-item-icon">
          <Plus size={14} />
        </div>
        <input
          type="text"
          placeholder="Add checklist item..."
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyPress={handleKeyPress}
        />
      </div>
    </div>
  );
};
