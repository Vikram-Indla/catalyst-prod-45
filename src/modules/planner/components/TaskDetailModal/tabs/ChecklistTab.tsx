/**
 * Checklist Tab Component
 * Progress bar + checklist items with add/toggle/delete
 */

import React, { useState } from 'react';
import { Check, Trash2, Plus } from 'lucide-react';
import { 
  useTaskChecklist, 
  useToggleChecklistItem, 
  useAddChecklistItem, 
  useDeleteChecklistItem 
} from '../../../hooks/useTaskDetails';

interface ChecklistTabProps {
  taskId: string;
}

export function ChecklistTab({ taskId }: ChecklistTabProps) {
  const [newItemText, setNewItemText] = useState('');
  const { data: checklist = [], isLoading } = useTaskChecklist(taskId);
  const toggleItem = useToggleChecklistItem();
  const addItem = useAddChecklistItem();
  const deleteItem = useDeleteChecklistItem();

  const completedCount = checklist.filter(item => item.is_completed).length;
  const totalCount = checklist.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleAddItem = () => {
    if (!newItemText.trim()) return;
    addItem.mutate({ taskId, text: newItemText.trim() }, {
      onSuccess: () => setNewItemText(''),
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddItem();
  };

  if (isLoading) {
    return (
      <div className="empty-state">
        <div className="loading-spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

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
            className={`checklist-item ${item.is_completed ? 'completed' : ''}`}
          >
            <div
              className={`checkbox ${item.is_completed ? 'checked' : ''}`}
              onClick={() => toggleItem.mutate({ id: item.id, is_completed: !item.is_completed })}
            >
              <Check size={14} />
            </div>
            <span className="item-label">{item.text}</span>
            <div className="item-actions">
              <button
                className="item-action-btn"
                title="Delete"
                onClick={() => deleteItem.mutate(item.id)}
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
}
