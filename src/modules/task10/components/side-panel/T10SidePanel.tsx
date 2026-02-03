// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ SIDE PANEL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { T10ItemWithAssignee } from '../../types';
import { T10PanelDetailsTab } from './T10PanelDetailsTab';
import { T10PanelActivityTab } from './T10PanelActivityTab';

type TabType = 'details' | 'activity';

interface T10SidePanelProps {
  item: T10ItemWithAssignee | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (itemId: string, updates: Partial<T10ItemWithAssignee>) => void;
}

export function T10SidePanel({ item, isOpen, onClose, onUpdate }: T10SidePanelProps) {
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

  if (!isOpen || !item) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="t10-panel-backdrop" onClick={onClose} />
      
      {/* Panel */}
      <aside className="t10-side-panel">
        <header className="t10-side-panel__header">
          <div className="t10-side-panel__header-content">
            {item.taskhub_key && (
              <span className="t10-side-panel__task-key">{item.taskhub_key}</span>
            )}
            <h2 className="t10-side-panel__title">{item.title}</h2>
          </div>
          <button className="t10-icon-btn t10-icon-btn--ghost" onClick={onClose}>
            <X />
          </button>
        </header>
        
        <nav className="t10-side-panel__tabs">
          <button
            className={`t10-side-panel__tab ${activeTab === 'details' ? 't10-side-panel__tab--active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Details
          </button>
          <button
            className={`t10-side-panel__tab ${activeTab === 'activity' ? 't10-side-panel__tab--active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            Activity
          </button>
        </nav>
        
        <div className="t10-side-panel__content">
          {activeTab === 'details' && (
            <T10PanelDetailsTab 
              item={item} 
              onUpdate={onUpdate}
            />
          )}
          {activeTab === 'activity' && (
            <T10PanelActivityTab itemId={item.id} />
          )}
        </div>
      </aside>
    </>
  );
}

export default T10SidePanel;
