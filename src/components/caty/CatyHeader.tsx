/**
 * Caty V4 — Header Component
 * Blue header with Catalyst logo, status, and action buttons
 */

import { X, RotateCw, Minus } from 'lucide-react';
import catalystLogoWhite from '@/assets/catalyst-ai-logo-white.svg';

interface CatyHeaderProps {
  onClose: () => void;
  onMinimize: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  lastUpdated?: string;
}

export function CatyHeader({ 
  onClose, 
  onMinimize, 
  onRefresh, 
  isRefreshing,
  lastUpdated = 'Just now'
}: CatyHeaderProps) {
  return (
    <div className="caty-header">
      <div className="caty-header-content">
        <div className="caty-header-brand">
          <img 
            src={catalystLogoWhite} 
            alt="Catalyst AI" 
            className="w-8 h-8"
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
          />
          <div>
            <div className="caty-header-title">Caty</div>
            <div className="caty-header-status">
              <span className="caty-status-dot" aria-hidden="true" />
              <span>Live · Updated {lastUpdated}</span>
            </div>
          </div>
        </div>
        
        <div className="caty-header-actions">
          <button 
            className="caty-header-btn"
            onClick={onRefresh}
            aria-label="Refresh data"
            disabled={isRefreshing}
          >
            <RotateCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          <button 
            className="caty-header-btn"
            onClick={onMinimize}
            aria-label="Minimize panel"
          >
            <Minus size={16} />
          </button>
          <button 
            className="caty-header-btn"
            onClick={onClose}
            aria-label="Close panel"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
