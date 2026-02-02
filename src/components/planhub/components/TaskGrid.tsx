import React, { useState, Fragment } from 'react';
import { ChevronRight, ChevronDown, Flag, GripVertical } from 'lucide-react';
import type { TaskTreeNode, TaskRow } from '@/types/planhub.types';

interface Props {
  tasks: TaskTreeNode[];
  onUpdate: (taskId: string, updates: Partial<TaskRow>) => void;
}

export default function TaskGrid({ tasks, onUpdate }: Props) {
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (id: string, field: string, currentValue: string | number | null) => {
    setEditingCell({ id, field });
    setEditValue(String(currentValue ?? ''));
  };

  const commitEdit = () => {
    if (!editingCell) return;
    
    const { id, field } = editingCell;
    let value: string | number | null = editValue;
    
    if (field === 'days' || field === 'progress') {
      value = parseInt(editValue) || 0;
      if (field === 'progress') value = Math.min(100, Math.max(0, value));
    }
    
    if (field === 'start_date' || field === 'end_date') {
      value = editValue || null;
    }
    
    onUpdate(id, { [field]: value });
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') setEditingCell(null);
  };

  const toggleExpand = (id: string, currentState: boolean) => {
    onUpdate(id, { is_expanded: !currentState });
  };

  const toggleFlag = (id: string, currentState: boolean) => {
    onUpdate(id, { is_flagged: !currentState });
  };

  const renderRow = (task: TaskTreeNode): React.ReactNode => {
    const indent = task.depth * 20;
    const isEditing = (field: string) => editingCell?.id === task.id && editingCell?.field === field;

    const rowClass = `ph-task-row ${task.type === 'phase' ? 'phase' : ''} ${task.type === 'milestone' ? 'milestone' : ''}`;

    return (
      <Fragment key={task.id}>
        <div className={rowClass}>
          {/* Expand */}
          <div style={{ paddingLeft: indent, display: 'flex', alignItems: 'center' }}>
            {task.children.length > 0 ? (
              <button
                onClick={() => toggleExpand(task.id, task.is_expanded)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                {task.is_expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : (
              <span style={{ width: 22 }} />
            )}
          </div>

          {/* WBS */}
          <div className="ph-text-xs ph-text-gray-500">
            {task.wbs}
          </div>

          {/* Name */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {isEditing('name') ? (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={handleKeyDown}
                autoFocus
                className="ph-form-input"
                style={{ padding: '2px 6px', fontSize: 'var(--ph-text-sm)', height: 28, width: '100%' }}
              />
            ) : (
              <span
                onDoubleClick={() => startEdit(task.id, 'name', task.name)}
                style={{ cursor: 'text', fontWeight: task.type === 'phase' ? 600 : 400 }}
              >
                {task.name}
              </span>
            )}
          </div>

          {/* Days */}
          <div style={{ textAlign: 'center' }}>
            {task.type !== 'milestone' ? (
              isEditing('days') ? (
                <input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  min={0}
                  className="ph-form-input"
                  style={{ width: 50, padding: '2px 6px', fontSize: 'var(--ph-text-sm)', height: 28, textAlign: 'center' }}
                />
              ) : (
                <span onDoubleClick={() => startEdit(task.id, 'days', task.days)} style={{ cursor: 'text' }}>
                  {task.days}d
                </span>
              )
            ) : (
              <span className="ph-text-gray-400">—</span>
            )}
          </div>

          {/* Start Date */}
          <div>
            {isEditing('start_date') ? (
              <input
                type="date"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={handleKeyDown}
                autoFocus
                className="ph-form-input"
                style={{ padding: '2px 6px', fontSize: 'var(--ph-text-xs)', height: 28 }}
              />
            ) : (
              <span
                onDoubleClick={() => startEdit(task.id, 'start_date', task.start_date)}
                style={{ cursor: 'text', fontSize: 'var(--ph-text-xs)' }}
              >
                {task.start_date || '—'}
              </span>
            )}
          </div>

          {/* End Date */}
          <div>
            {isEditing('end_date') ? (
              <input
                type="date"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={handleKeyDown}
                autoFocus
                className="ph-form-input"
                style={{ padding: '2px 6px', fontSize: 'var(--ph-text-xs)', height: 28 }}
              />
            ) : (
              <span
                onDoubleClick={() => startEdit(task.id, 'end_date', task.end_date)}
                style={{ cursor: 'text', fontSize: 'var(--ph-text-xs)' }}
              >
                {task.end_date || '—'}
              </span>
            )}
          </div>

          {/* Progress */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {task.type !== 'milestone' ? (
              <>
                <div className="ph-task-progress-bar" style={{ flex: 1 }}>
                  <div
                    className="ph-task-progress-fill"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
                {isEditing('progress') ? (
                  <input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    min={0}
                    max={100}
                    className="ph-form-input"
                    style={{ width: 45, padding: '2px 4px', fontSize: 'var(--ph-text-xs)', height: 24, textAlign: 'center' }}
                  />
                ) : (
                  <span
                    onDoubleClick={() => startEdit(task.id, 'progress', task.progress)}
                    style={{ cursor: 'text', fontSize: 'var(--ph-text-xs)', width: 32, textAlign: 'right' }}
                  >
                    {task.progress}%
                  </span>
                )}
              </>
            ) : (
              <span className={`ph-text-xs ${task.progress === 100 ? 'ph-text-success' : 'ph-text-gray-500'}`}>
                {task.progress === 100 ? '✓ Done' : 'Pending'}
              </span>
            )}
          </div>

          {/* Flag */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={() => toggleFlag(task.id, task.is_flagged)}
              className={`ph-task-flag ${task.is_flagged ? '' : 'inactive'}`}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
            >
              <Flag size={14} />
            </button>
          </div>
        </div>

        {/* Children */}
        {task.is_expanded && task.children.map(child => renderRow(child))}
      </Fragment>
    );
  };

  return (
    <div className="ph-task-grid">
      {/* Header */}
      <div className="ph-task-grid-header">
        <div></div>
        <div>WBS</div>
        <div>Task Name</div>
        <div>Days</div>
        <div>Start</div>
        <div>End</div>
        <div>Progress</div>
        <div></div>
      </div>

      {/* Rows */}
      {tasks.length === 0 ? (
        <div className="ph-empty" style={{ padding: 'var(--ph-space-8)', textAlign: 'center' }}>
          <span className="ph-text-gray-500">No tasks yet. Add a phase or task to get started.</span>
        </div>
      ) : (
        tasks.map(task => renderRow(task))
      )}
    </div>
  );
}
