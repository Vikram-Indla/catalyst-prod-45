// ============================================================
// File: src/modules/priorities/components/PriSidePanel.tsx
// ============================================================

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { PriItemFull, PriUpdateItemInput, PriAssigneeOption, PriLabel } from '../types';
import { PriLabelBadge } from './PriLabelBadge';
import styles from '../styles/priorities.module.css';

interface PriSidePanelProps {
  item: PriItemFull | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: PriUpdateItemInput) => void;
  onDelete: (item: PriItemFull) => void;
  assignees?: PriAssigneeOption[];
  labels?: PriLabel[];
  onLabelsChange?: (itemId: string, labelIds: string[]) => void;
}

export function PriSidePanel({
  item, isOpen, onClose, onSave, onDelete,
  assignees = [], labels = [], onLabelsChange,
}: PriSidePanelProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [taskKey, setTaskKey] = useState('');

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setDescription(item.description ?? '');
      setAssigneeId(item.assignee_id);
      setTaskKey(item.task_key ?? '');
    }
  }, [item]);

  const handleSave = () => {
    if (!item) return;
    onSave({
      id: item.id,
      title: title.trim() || item.title,
      description: description.trim() || null,
      assignee_id: assigneeId,
      task_key: taskKey.trim() || null,
    });
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`${styles['pri-panel-overlay']} ${isOpen ? styles['pri-panel-overlay-open'] : ''}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div className={`${styles['pri-panel']} ${isOpen ? styles['pri-panel-open'] : ''}`}>
        <div className={styles['pri-panel-header']}>
          <span className={styles['pri-panel-header-title']}>
            Edit Priority
          </span>
          <button className={styles['pri-btn-icon']} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles['pri-panel-body']}>
          {/* Title */}
          <div className={styles['pri-field']}>
            <label className={styles['pri-field-label']}>Title</label>
            <input
              className={styles['pri-field-input']}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className={styles['pri-field']}>
            <label className={styles['pri-field-label']}>Description</label>
            <textarea
              className={`${styles['pri-field-input']} ${styles['pri-field-textarea']}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Assignee */}
          <div className={styles['pri-field']}>
            <label className={styles['pri-field-label']}>Assignee</label>
            <select
              className={`${styles['pri-field-input']} ${styles['pri-field-select']}`}
              value={assigneeId ?? ''}
              onChange={(e) => setAssigneeId(e.target.value || null)}
            >
              <option value="">Unassigned</option>
              {assignees.map((a) => (
                <option key={a.id} value={a.id}>{a.full_name}</option>
              ))}
            </select>
          </div>

          {/* Task Key */}
          <div className={styles['pri-field']}>
            <label className={styles['pri-field-label']}>TaskHub Key</label>
            <input
              className={styles['pri-field-input']}
              value={taskKey}
              onChange={(e) => setTaskKey(e.target.value)}
              placeholder="e.g. TASK-1234"
            />
          </div>

          {/* Labels */}
          <div className={styles['pri-field']}>
            <label className={styles['pri-field-label']}>Labels</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
              {item?.labels.map((l) => (
                <PriLabelBadge
                  key={l.id}
                  label={l}
                  onRemove={() => {
                    if (onLabelsChange && item) {
                      const remaining = item.labels
                        .filter((x) => x.id !== l.id)
                        .map((x) => x.id);
                      onLabelsChange(item.id, remaining);
                    }
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className={styles['pri-panel-footer']}>
          {item && (
            <button
              className={`${styles['pri-btn']} ${styles['pri-btn-danger']} ${styles['pri-btn-sm']}`}
              onClick={() => { onDelete(item); onClose(); }}
              style={{ marginRight: 'auto' }}
            >
              Delete
            </button>
          )}
          <button
            className={`${styles['pri-btn']} ${styles['pri-btn-ghost']}`}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className={`${styles['pri-btn']} ${styles['pri-btn-primary']}`}
            onClick={handleSave}
          >
            Save Changes
          </button>
        </div>
      </div>
    </>
  );
}
