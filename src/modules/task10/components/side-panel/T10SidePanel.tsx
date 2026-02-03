// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ SIDE PANEL DRAWER COMPONENT
// Right-side slide-in drawer matching reference design
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import type { T10ItemWithAssignee } from '../../types';
import { T10PanelDetailsTab } from './T10PanelDetailsTab';
import { T10PanelActivityTab } from './T10PanelActivityTab';

type TabType = 'details' | 'activity';

interface T10SidePanelProps {
  item: T10ItemWithAssignee | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (itemId: string, updates: Partial<T10ItemWithAssignee>) => void;
  onDelete?: (itemId: string) => void;
  isSaving?: boolean;
}

export function T10SidePanel({ item, isOpen, onClose, onUpdate, onDelete, isSaving = false }: T10SidePanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('details');

  // Reset to details tab when a new item is selected
  useEffect(() => {
    if (item) {
      setActiveTab('details');
    }
  }, [item?.id]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!item) return null;

  // Get creator info
  const creatorName = item.created_by ? 'User' : 'System';
  const createdAgo = item.created_at 
    ? formatDistanceToNow(parseISO(item.created_at), { addSuffix: true })
    : '';

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className={`t10-drawer-backdrop ${isOpen ? 't10-drawer-backdrop--visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Drawer panel */}
      <aside 
        className={`t10-drawer ${isOpen ? 't10-drawer--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        {/* Header */}
        <header className="t10-drawer__header">
          <div className="t10-drawer__header-left">
            {/* Rank badge */}
            <div className="t10-drawer__rank-badge">
              {item.rank}
            </div>
            <span className="t10-drawer__header-title">Task¹⁰ Priority</span>
          </div>
          <button 
            className="t10-drawer__close-btn"
            onClick={onClose}
            aria-label="Close panel"
          >
            <X size={20} />
          </button>
        </header>

        {/* Task key & title */}
        <div className="t10-drawer__task-info">
          {item.taskhub_key && (
            <span className="t10-drawer__task-key">{item.taskhub_key}</span>
          )}
          <h2 id="drawer-title" className="t10-drawer__task-title">
            {item.title}
          </h2>
        </div>
        
        {/* Tabs */}
        <nav className="t10-drawer__tabs" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'details'}
            className={`t10-drawer__tab ${activeTab === 'details' ? 't10-drawer__tab--active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Details
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'activity'}
            className={`t10-drawer__tab ${activeTab === 'activity' ? 't10-drawer__tab--active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            Activity
          </button>
        </nav>
        
        {/* Content area */}
        <div className="t10-drawer__content" role="tabpanel">
          {activeTab === 'details' && (
            <T10PanelDetailsTab 
              item={item} 
              onUpdate={onUpdate}
              isSaving={isSaving}
            />
          )}
          {activeTab === 'activity' && (
            <T10PanelActivityTab itemId={item.id} />
          )}
        </div>

        {/* Footer */}
        <footer className="t10-drawer__footer">
          <span className="t10-drawer__footer-meta">
            Created by <strong>{creatorName}</strong> · {createdAgo}
          </span>
          {onDelete && (
            <button 
              className="t10-drawer__delete-btn"
              onClick={() => onDelete(item.id)}
            >
              <Trash2 size={16} />
              Delete
            </button>
          )}
        </footer>
      </aside>
    </>
  );
}

export default T10SidePanel;
