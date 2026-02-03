import React from 'react';

export function T10LoadingSkeleton() {
  return (
    <div className="t10-loading-skeleton">
      {/* Header skeleton */}
      <div className="t10-skeleton-header">
        <div className="t10-skeleton-line" style={{ width: '120px', height: '36px' }} />
        <div className="t10-skeleton-line" style={{ width: '200px', height: '40px' }} />
        <div className="t10-skeleton-line" style={{ width: '140px', height: '36px' }} />
      </div>

      {/* Quick add skeleton */}
      <div className="t10-skeleton-quickadd">
        <div className="t10-skeleton-line" style={{ width: '100%', height: '48px' }} />
      </div>

      {/* Cards skeleton */}
      <div className="t10-skeleton-cards">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="t10-skeleton-card">
            <div className="t10-skeleton-circle" />
            <div className="t10-skeleton-card-content">
              <div className="t10-skeleton-line" style={{ width: '70%', height: '18px' }} />
              <div className="t10-skeleton-line" style={{ width: '50%', height: '14px', marginTop: '8px' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function T10ErrorState({ 
  message = 'Failed to load data', 
  onRetry 
}: { 
  message?: string; 
  onRetry?: () => void;
}) {
  return (
    <div className="t10-error-state">
      <div className="t10-error-icon">⚠️</div>
      <h3>Something went wrong</h3>
      <p>{message}</p>
      {onRetry && (
        <button className="t10-btn t10-btn-outline" onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
}

export function T10EmptyState({ 
  title = 'No items yet',
  description = 'Get started by adding your first priority.',
  actionLabel,
  onAction,
}: { 
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="t10-empty-state">
      <div className="t10-empty-icon">📋</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {actionLabel && onAction && (
        <button className="t10-btn t10-btn-primary" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
