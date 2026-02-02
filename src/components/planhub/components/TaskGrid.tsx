import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Flag, Diamond } from 'lucide-react';
import type { TaskTreeNode, TaskRow } from '@/types/planhub.types';

interface Props {
  tasks: TaskTreeNode[];
  onUpdate: (id: string, updates: Partial<TaskRow>) => void;
}

export default function TaskGrid({ tasks, onUpdate }: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const flattenTasks = (nodes: TaskTreeNode[]): TaskTreeNode[] => {
    const result: TaskTreeNode[] = [];
    const traverse = (items: TaskTreeNode[]) => {
      for (const node of items) {
        result.push(node);
        if (expandedIds.has(node.id) && node.children.length > 0) {
          traverse(node.children);
        }
      }
    };
    traverse(nodes);
    return result;
  };

  const flatTasks = flattenTasks(tasks);

  const getTypeIcon = (type: string, hasChildren: boolean, isExpanded: boolean) => {
    if (type === 'milestone') {
      return <Diamond size={14} style={{ color: 'var(--ph-purple)' }} />;
    }
    if (hasChildren) {
      return isExpanded ? 
        <ChevronDown size={14} style={{ color: 'var(--ph-gray-500)' }} /> : 
        <ChevronRight size={14} style={{ color: 'var(--ph-gray-500)' }} />;
    }
    return null;
  };

  return (
    <div className="ph-task-grid">
      <div className="ph-task-grid-header">
        <div></div>
        <div>WBS</div>
        <div>Name</div>
        <div>Days</div>
        <div>Start</div>
        <div>End</div>
        <div>Progress</div>
        <div></div>
      </div>

      {flatTasks.length === 0 ? (
        <div className="ph-empty" style={{ padding: 'var(--ph-space-8)' }}>
          <p className="ph-text-gray-500">No tasks yet. Add a phase or task to get started.</p>
        </div>
      ) : (
        flatTasks.map(task => {
          const hasChildren = task.children.length > 0;
          const isExpanded = expandedIds.has(task.id);

          return (
            <div 
              key={task.id}
              className={`ph-task-row ${task.type}`}
            >
              {/* Expand/Collapse */}
              <div 
                onClick={() => hasChildren && toggleExpand(task.id)}
                style={{ cursor: hasChildren ? 'pointer' : 'default', paddingLeft: task.depth * 16 + 8 }}
              >
                {getTypeIcon(task.type, hasChildren, isExpanded)}
              </div>

              {/* WBS */}
              <div className="ph-text-xs ph-text-gray-500">
                {task.wbs}
              </div>

              {/* Name */}
              <div>
                <input
                  type="text"
                  value={task.name}
                  onChange={e => onUpdate(task.id, { name: e.target.value })}
                  className="ph-form-input"
                  style={{ 
                    border: 'none', 
                    padding: '4px 8px', 
                    background: 'transparent',
                    fontWeight: task.type === 'phase' ? 600 : 400
                  }}
                />
              </div>

              {/* Days */}
              <div>
                {task.type !== 'milestone' && (
                  <input
                    type="number"
                    value={task.days}
                    onChange={e => onUpdate(task.id, { days: parseInt(e.target.value) || 0 })}
                    className="ph-form-input"
                    style={{ border: 'none', padding: '4px', background: 'transparent', width: 48, textAlign: 'center' }}
                  />
                )}
              </div>

              {/* Start Date */}
              <div className="ph-text-sm">
                {task.start_date ? new Date(task.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
              </div>

              {/* End Date */}
              <div className="ph-text-sm">
                {task.end_date ? new Date(task.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
              </div>

              {/* Progress */}
              <div className="ph-flex ph-items-center ph-gap-2">
                <div className="ph-task-progress-bar">
                  <div 
                    className="ph-task-progress-fill" 
                    style={{ width: `${task.progress}%` }} 
                  />
                </div>
                <span className="ph-text-xs" style={{ width: 32 }}>{task.progress}%</span>
              </div>

              {/* Flag */}
              <div>
                <button
                  onClick={() => onUpdate(task.id, { is_flagged: !task.is_flagged })}
                  className={`ph-task-flag ${task.is_flagged ? '' : 'inactive'}`}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  <Flag size={14} />
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
