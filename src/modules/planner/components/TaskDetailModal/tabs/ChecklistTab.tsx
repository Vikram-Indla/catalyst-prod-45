/**
 * CHECKLIST TAB
 * Progress bar + checklist items + add new item input
 */

import React, { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import {
  useTaskChecklist,
  useToggleChecklistItem,
  useAddChecklistItem,
  useDeleteChecklistItem,
} from '../../../hooks/useTaskDetails';

interface ChecklistTabProps {
  taskId: string;
}

export const ChecklistTab: React.FC<ChecklistTabProps> = ({ taskId }) => {
  const [newItemText, setNewItemText] = useState('');
  const { data: checklist = [], isLoading } = useTaskChecklist(taskId);
  const toggleMutation = useToggleChecklistItem();
  const addMutation = useAddChecklistItem();
  const deleteMutation = useDeleteChecklistItem();

  const completedCount = checklist.filter((item) => item.is_completed).length;
  const totalCount = checklist.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleToggle = (id: string, currentStatus: boolean) => {
    toggleMutation.mutate({ id, is_completed: !currentStatus });
  };

  const handleAddItem = () => {
    if (!newItemText.trim()) return;
    addMutation.mutate(
      { taskId, text: newItemText },
      {
        onSuccess: () => setNewItemText(''),
      }
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddItem();
    }
  };

  if (isLoading) {
    return <div className="checklist-tab">Loading checklist...</div>;
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
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </div>

      {/* CHECKLIST ITEMS */}
      <div className="checklist-items">
        {checklist.map((item) => (
          <div key={item.id} className={`checklist-item ${item.is_completed ? 'completed' : ''}`}>
            <div
              className={`checkbox ${item.is_completed ? 'checked' : ''}`}
              onClick={() => handleToggle(item.id, item.is_completed)}
            >
              <Check size={14} />
            </div>
            <span className="item-label">{item.text}</span>
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
