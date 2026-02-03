// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ SIDE PANEL DRAWER COMPONENT
// Right-side slide-in drawer using portal and inline styles for reliability
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2 } from 'lucide-react';
import { parseISO, formatDistanceToNow } from 'date-fns';
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
}

export function T10SidePanel({ item, isOpen, onClose, onUpdate, onDelete }: T10SidePanelProps) {
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

  if (!isOpen || !item) return null;

  // Get creator info
  const creatorName = item.created_by ? 'User' : 'System';
  const createdAgo = item.created_at 
    ? formatDistanceToNow(parseISO(item.created_at), { addSuffix: true })
    : '';

  const panelContent = (
    <>
      {/* Backdrop overlay */}
      <div 
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          zIndex: 9998,
        }}
        aria-hidden="true"
      />
      
      {/* Drawer panel */}
      <aside 
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '420px',
          maxWidth: '100vw',
          backgroundColor: '#ffffff',
          boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.15)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <header 
          style={{
            flexShrink: 0,
            padding: '16px 24px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Rank badge */}
            <div 
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                background: item.rank <= 5 
                  ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' 
                  : item.rank <= 10 ? '#6b7280' : 'transparent',
                border: item.rank > 10 ? '2px dashed #d1d5db' : 'none',
                color: item.rank <= 10 ? '#ffffff' : '#9ca3af',
                fontSize: '14px',
                fontWeight: 700,
              }}
            >
              {item.rank}
            </div>
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#6b7280' }}>
              Task¹⁰ Priority
            </span>
          </div>
          <button 
            onClick={onClose}
            aria-label="Close panel"
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: 'transparent',
              borderRadius: '6px',
              color: '#9ca3af',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        </header>

        {/* Task key & title */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb' }}>
          {item.taskhub_key && (
            <span 
              style={{
                display: 'inline-flex',
                padding: '2px 8px',
                backgroundColor: '#eff6ff',
                border: '1px solid #dbeafe',
                borderRadius: '4px',
                fontFamily: 'SF Mono, Monaco, monospace',
                fontSize: '12px',
                fontWeight: 600,
                color: '#2563eb',
                marginBottom: '8px',
              }}
            >
              {item.taskhub_key}
            </span>
          )}
          <h2 
            id="drawer-title" 
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 700,
              color: '#111827',
              lineHeight: 1.4,
            }}
          >
            {item.title}
          </h2>
        </div>
        
        {/* Tabs */}
        <nav 
          role="tablist"
          style={{
            flexShrink: 0,
            display: 'flex',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <button
            role="tab"
            aria-selected={activeTab === 'details'}
            onClick={() => setActiveTab('details')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: 'transparent',
              fontSize: '14px',
              fontWeight: 500,
              color: activeTab === 'details' ? '#2563eb' : '#6b7280',
              borderBottom: activeTab === 'details' ? '2px solid #2563eb' : '2px solid transparent',
              cursor: 'pointer',
            }}
          >
            Details
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'activity'}
            onClick={() => setActiveTab('activity')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: 'transparent',
              fontSize: '14px',
              fontWeight: 500,
              color: activeTab === 'activity' ? '#2563eb' : '#6b7280',
              borderBottom: activeTab === 'activity' ? '2px solid #2563eb' : '2px solid transparent',
              cursor: 'pointer',
            }}
          >
            Activity
          </button>
        </nav>
        
        {/* Content area */}
        <div 
          role="tabpanel"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
          }}
        >
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

        {/* Footer */}
        <footer 
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderTop: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb',
          }}
        >
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>
            Created by <strong style={{ fontWeight: 600 }}>{creatorName}</strong> · {createdAgo}
          </span>
          {onDelete && (
            <button 
              onClick={() => onDelete(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: 0,
                border: 'none',
                background: 'transparent',
                fontSize: '14px',
                fontWeight: 500,
                color: '#ef4444',
                cursor: 'pointer',
              }}
            >
              <Trash2 size={16} />
              Delete
            </button>
          )}
        </footer>
      </aside>
    </>
  );

  // Use portal to render at document.body to avoid stacking context issues
  return createPortal(panelContent, document.body);
}

export default T10SidePanel;
