import React from 'react';
import { token } from '@atlaskit/tokens';
import Spinner from '@atlaskit/spinner';
import Tooltip from '@atlaskit/tooltip';

interface CatyInsightCardProps {
  title: string;
  children: React.ReactNode;
  isLoading?: boolean;
  onDismiss?: () => void;
  onRefresh?: () => void;
}

const SPARKLE_SVG = (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" style={{ flexShrink: 0 }}>
    <defs>
      <linearGradient id="caty-insight-rainbow" gradientUnits="userSpaceOnUse" x1="1" y1="7" x2="13" y2="7">
        <stop offset="0%" stopColor="#FF3CAC" />
        <stop offset="20%" stopColor="#784BA0" />
        <stop offset="40%" stopColor="#2B86C5" />
        <stop offset="60%" stopColor="#00C9FF" />
        <stop offset="80%" stopColor="#92FE9D" />
        <stop offset="100%" stopColor="#FFD700" />
      </linearGradient>
    </defs>
    <path d="M7 0.5L8.5 5.2L13 7L8.5 8.8L7 13.5L5.5 8.8L1 7L5.5 5.2Z" fill="url(#caty-insight-rainbow)" />
  </svg>
);

export function CatyInsightCard({ title, children, isLoading, onDismiss, onRefresh }: CatyInsightCardProps) {
  return (
    <div style={{
      background: token('elevation.surface.raised', '#FFFFFF'),
      border: `1px solid ${token('color.border', '#DFE1E6')}`,
      borderRadius: 8,
      padding: 16,
      marginBlockEnd: 16,
      overflow: 'hidden',
      maxWidth: '100%',
      boxSizing: 'border-box',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBlockEnd: isLoading ? 0 : 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {SPARKLE_SVG}
          <span style={{
            font: `600 14px/20px var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif`,
            color: token('color.text', '#172B4D'),
          }}>
            {title}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {onRefresh && (
            <Tooltip content="Refresh">
              {(tooltipProps) => (
                <button
                  {...tooltipProps}
                  type="button"
                  onClick={onRefresh}
                  aria-label="Refresh"
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 28, height: 28, border: 'none', borderRadius: 4, cursor: 'pointer',
                    background: 'transparent',
                    color: token('color.text.subtle', '#44546F'),
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
                  </svg>
                </button>
              )}
            </Tooltip>
          )}
          {onDismiss && (
            <Tooltip content="Dismiss">
              {(tooltipProps) => (
                <button
                  {...tooltipProps}
                  type="button"
                  onClick={onDismiss}
                  aria-label="Dismiss"
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 28, height: 28, border: 'none', borderRadius: 4, cursor: 'pointer',
                    background: 'transparent',
                    color: token('color.text.subtle', '#44546F'),
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                  </svg>
                </button>
              )}
            </Tooltip>
          )}
        </div>
      </div>
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }} data-testid="caty-insight-spinner">
          <Spinner size="small" />
        </div>
      ) : (
        <div style={{
          font: `400 14px/20px var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif`,
          color: token('color.text.subtle', '#44546F'),
        }}>
          {children}
        </div>
      )}
    </div>
  );
}
