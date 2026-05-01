// ============================================================
// TASK CONTEXT MENU
// Right-click menu with status, reassign, priority, delete
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Edit3, 
  Copy, 
  Layers, 
  User, 
  Flag, 
  Calendar, 
  CopyPlus, 
  Trash2,
  ChevronRight,
  Check,
} from 'lucide-react';
import type { PlannerTask } from '../../types';
import '../../styles/planner-calendar.css';

interface TaskContextMenuProps {
  task: PlannerTask;
  position: { x: number; y: number };
  onClose: () => void;
  onAction: (action: string, payload?: any) => void;
  statuses?: { id: string; name: string; color: string }[];
  users?: { id: string; name: string; initials: string }[];
}

const PRIORITIES = [
  { value: 'critical', label: 'Critical', shape: '◆', color: 'var(--ds-text-danger, #dc2626)' },
  { value: 'high', label: 'High', shape: '▲', color: '#ea580c' },
  { value: 'medium', label: 'Medium', shape: '●', color: '#ca8a04' },
  { value: 'low', label: 'Low', shape: '○', color: 'var(--ds-text-subtlest, #64748b)' },
];

export function TaskContextMenu({ 
  task, 
  position, 
  onClose, 
  onAction,
  statuses = [],
  users = [],
}: TaskContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  // Adjust position to stay in viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      let { x, y } = position;
      
      if (x + rect.width > window.innerWidth) {
        x = window.innerWidth - rect.width - 8;
      }
      if (y + rect.height > window.innerHeight) {
        y = window.innerHeight - rect.height - 8;
      }
      
      setAdjustedPosition({ x, y });
    }
  }, [position]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/taskhub/task/${task.id}`;
    navigator.clipboard.writeText(url);
    onAction('copy-link');
    onClose();
  };

  const menuContent = (
    <div
      ref={menuRef}
      className="cal-context-menu planner-calendar-content"
      style={{ top: adjustedPosition.y, left: adjustedPosition.x }}
    >
      {/* Edit */}
      <div 
        className="cal-context-menu-item"
        onClick={() => { onAction('edit'); onClose(); }}
      >
        <span className="cal-context-menu-icon"><Edit3 className="w-4 h-4" /></span>
        Edit Task
      </div>

      {/* Copy Link */}
      <div 
        className="cal-context-menu-item"
        onClick={handleCopyLink}
      >
        <span className="cal-context-menu-icon"><Copy className="w-4 h-4" /></span>
        Copy Link
      </div>

      <div className="cal-context-menu-divider" />

      {/* Change Status */}
      <div 
        className="cal-context-menu-item"
        onMouseEnter={() => setActiveSubmenu('status')}
        onMouseLeave={() => setActiveSubmenu(null)}
      >
        <span className="cal-context-menu-icon"><Layers className="w-4 h-4" /></span>
        Change Status
        <ChevronRight className="w-4 h-4 ml-auto" />
        
        {activeSubmenu === 'status' && statuses.length > 0 && (
          <div className="cal-context-menu" style={{ top: -4, left: '100%', marginLeft: 4 }}>
            {statuses.map(status => (
              <div 
                key={status.id}
                className="cal-context-menu-item"
                onClick={(e) => {
                  e.stopPropagation();
                  onAction('change-status', status.id);
                  onClose();
                }}
              >
                <span 
                  className="w-2 h-2 rounded-full"
                  style={{ background: status.color }}
                />
                {status.name}
                {task.status === status.id && <Check className="w-4 h-4 ml-auto text-blue-600" />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reassign */}
      <div 
        className="cal-context-menu-item"
        onMouseEnter={() => setActiveSubmenu('reassign')}
        onMouseLeave={() => setActiveSubmenu(null)}
      >
        <span className="cal-context-menu-icon"><User className="w-4 h-4" /></span>
        Reassign
        <ChevronRight className="w-4 h-4 ml-auto" />
        
        {activeSubmenu === 'reassign' && users.length > 0 && (
          <div className="cal-context-menu" style={{ top: -4, left: '100%', marginLeft: 4, maxHeight: 200, overflowY: 'auto' }}>
            <div 
              className="cal-context-menu-item"
              onClick={(e) => {
                e.stopPropagation();
                onAction('reassign', null);
                onClose();
              }}
            >
              <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-500">?</span>
              Unassigned
              {!task.assigneeId && <Check className="w-4 h-4 ml-auto text-blue-600" />}
            </div>
            {users.map(user => (
              <div 
                key={user.id}
                className="cal-context-menu-item"
                onClick={(e) => {
                  e.stopPropagation();
                  onAction('reassign', user.id);
                  onClose();
                }}
              >
                <span className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[10px] text-white font-medium">
                  {user.initials}
                </span>
                {user.name}
                {task.assigneeId === user.id && <Check className="w-4 h-4 ml-auto text-blue-600" />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Change Priority */}
      <div 
        className="cal-context-menu-item"
        onMouseEnter={() => setActiveSubmenu('priority')}
        onMouseLeave={() => setActiveSubmenu(null)}
      >
        <span className="cal-context-menu-icon"><Flag className="w-4 h-4" /></span>
        Change Priority
        <ChevronRight className="w-4 h-4 ml-auto" />
        
        {activeSubmenu === 'priority' && (
          <div className="cal-context-menu" style={{ top: -4, left: '100%', marginLeft: 4 }}>
            {PRIORITIES.map(priority => (
              <div 
                key={priority.value}
                className="cal-context-menu-item"
                onClick={(e) => {
                  e.stopPropagation();
                  onAction('change-priority', priority.value);
                  onClose();
                }}
              >
                <span style={{ color: priority.color }}>{priority.shape}</span>
                {priority.label}
                {task.priority === priority.value && <Check className="w-4 h-4 ml-auto text-blue-600" />}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="cal-context-menu-divider" />

      {/* Reschedule */}
      <div 
        className="cal-context-menu-item"
        onClick={() => { onAction('reschedule'); onClose(); }}
      >
        <span className="cal-context-menu-icon"><Calendar className="w-4 h-4" /></span>
        Reschedule
      </div>

      {/* Duplicate */}
      <div 
        className="cal-context-menu-item"
        onClick={() => { onAction('duplicate'); onClose(); }}
      >
        <span className="cal-context-menu-icon"><CopyPlus className="w-4 h-4" /></span>
        Duplicate
      </div>

      <div className="cal-context-menu-divider" />

      {/* Delete */}
      <div 
        className="cal-context-menu-item danger"
        onClick={() => { onAction('delete'); onClose(); }}
      >
        <span className="cal-context-menu-icon"><Trash2 className="w-4 h-4" /></span>
        Delete Task
      </div>
    </div>
  );

  return createPortal(menuContent, document.body);
}
