/**
 * Caty V4 — State Components
 * Skeleton loading, empty states, and error states
 */

import { RefreshCw } from 'lucide-react';

// ==================== SKELETON COMPONENTS ====================
export function CatySkeletonCard() {
  return (
    <div className="caty-skeleton-card">
      <div className="caty-skeleton-line w-60" />
      <div className="caty-skeleton-line w-40 mt-2" />
      
      <div className="caty-skeleton-kpis">
        <div className="caty-skeleton-kpi" />
        <div className="caty-skeleton-kpi" />
        <div className="caty-skeleton-kpi" />
      </div>
      
      <div className="caty-skeleton-line w-30 mt-3" />
      
      <div className="caty-skeleton-dept-list">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="caty-skeleton-dept" />
        ))}
      </div>
    </div>
  );
}

export function CatySkeletonMessage() {
  return (
    <div className="caty-message ai">
      <div className="caty-message-avatar caty-skeleton-avatar" />
      <div className="caty-message-content">
        <div className="caty-message-bubble caty-skeleton-bubble">
          <div className="caty-skeleton-line w-80" />
          <div className="caty-skeleton-line w-60 mt-2" />
          <div className="caty-skeleton-line w-40 mt-2" />
        </div>
      </div>
    </div>
  );
}

// ==================== EMPTY STATE ====================
type EmptyStateType = 'all-clear' | 'no-data' | 'no-results';

const EMPTY_STATE_CONTENT: Record<EmptyStateType, { icon: string; title: string; description: string }> = {
  'all-clear': {
    icon: '🎉',
    title: 'All clear!',
    description: 'Your team is in great shape. No capacity warnings detected.',
  },
  'no-data': {
    icon: '📊',
    title: 'No data yet',
    description: 'Capacity data will appear once departments are configured.',
  },
  'no-results': {
    icon: '🔍',
    title: 'No results',
    description: 'No resources match your search. Try different keywords.',
  },
};

interface CatyEmptyStateProps {
  type: EmptyStateType;
}

export function CatyEmptyState({ type }: CatyEmptyStateProps) {
  const { icon, title, description } = EMPTY_STATE_CONTENT[type];

  return (
    <div className="caty-empty-state" role="status">
      <span className="caty-empty-icon" aria-hidden="true">{icon}</span>
      <h3 className="caty-empty-title">{title}</h3>
      <p className="caty-empty-description">{description}</p>
    </div>
  );
}

// ==================== ERROR STATE ====================
type ErrorStateType = 'api-error' | 'offline' | 'timeout';

const ERROR_STATE_CONTENT: Record<ErrorStateType, { icon: string; title: string; description: string; showRetry: boolean }> = {
  'api-error': {
    icon: '⚠️',
    title: 'Unable to load data',
    description: 'Something went wrong. Please try again.',
    showRetry: true,
  },
  'offline': {
    icon: '📡',
    title: "You're offline",
    description: 'Showing cached data. Some information may be outdated.',
    showRetry: false,
  },
  'timeout': {
    icon: '⏱️',
    title: 'Request timed out',
    description: 'The server took too long to respond.',
    showRetry: true,
  },
};

interface CatyErrorStateProps {
  type: ErrorStateType;
  onRetry?: () => void;
}

export function CatyErrorState({ type, onRetry }: CatyErrorStateProps) {
  const { icon, title, description, showRetry } = ERROR_STATE_CONTENT[type];

  return (
    <div className="caty-error-state" role="alert">
      <span className="caty-error-icon" aria-hidden="true">{icon}</span>
      <h3 className="caty-error-title">{title}</h3>
      <p className="caty-error-description">{description}</p>
      {showRetry && onRetry && (
        <button className="caty-error-retry" onClick={onRetry}>
          <RefreshCw size={14} />
          Try again
        </button>
      )}
    </div>
  );
}
