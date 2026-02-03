// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ SIDE PANEL DRAWER COMPONENT
// Right-side slide-in drawer with proper Tailwind styling
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
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

  if (!item || !isOpen) return null;

  // Get creator info
  const creatorName = item.created_by ? 'User' : 'System';
  const createdAgo = item.created_at 
    ? formatDistanceToNow(parseISO(item.created_at), { addSuffix: true })
    : '';

  const getRankLabel = (rank: number) => {
    if (rank <= 5) return 'Top 5';
    if (rank <= 10) return 'Top 10';
    return 'Buffer';
  };

  const getRankColor = (rank: number) => {
    if (rank <= 5) return 'bg-blue-600 text-white';
    if (rank <= 10) return 'bg-gray-500 text-white';
    return 'bg-gray-300 text-gray-700';
  };

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════
          BACKDROP - Semi-transparent overlay
      ══════════════════════════════════════════════════════════════ */}
      <div 
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* ══════════════════════════════════════════════════════════════
          PANEL - Fixed position, slides from right
      ══════════════════════════════════════════════════════════════ */}
      <aside 
        className="fixed top-0 right-0 bottom-0 w-[420px] bg-white shadow-2xl z-50 flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        {/* ══════════════════════════════════════════════════════════════
            HEADER
        ══════════════════════════════════════════════════════════════ */}
        <header className="flex-shrink-0 px-6 py-4 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-4">
              {item.taskhub_key && (
                <span className="inline-block px-2 py-0.5 text-xs font-medium text-blue-600 bg-blue-50 rounded mb-2">
                  {item.taskhub_key}
                </span>
              )}
              <h2 id="drawer-title" className="text-lg font-semibold text-gray-900 leading-tight">
                {item.title}
              </h2>
            </div>
            <button 
              onClick={onClose}
              className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close panel"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* ══════════════════════════════════════════════════════════════
            TABS
        ══════════════════════════════════════════════════════════════ */}
        <nav className="flex-shrink-0 flex border-b border-gray-200" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'details'}
            onClick={() => setActiveTab('details')}
            className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            Details
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'activity'}
            onClick={() => setActiveTab('activity')}
            className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
              activeTab === 'activity'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            Activity
          </button>
        </nav>
        
        {/* ══════════════════════════════════════════════════════════════
            CONTENT - Scrollable
        ══════════════════════════════════════════════════════════════ */}
        <div className="flex-1 overflow-y-auto" role="tabpanel">
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

        {/* ══════════════════════════════════════════════════════════════
            FOOTER
        ══════════════════════════════════════════════════════════════ */}
        <footer className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Created by <span className="font-medium">{creatorName}</span> · {createdAgo}
            </span>
            {onDelete && (
              <button 
                onClick={() => onDelete(item.id)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
                Delete
              </button>
            )}
          </div>
        </footer>
      </aside>
    </>
  );
}

export default T10SidePanel;
