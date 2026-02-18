/**
 * WidgetCard — Base card component for Strategy Room dashboard widgets
 * Follows Catalyst V11 token system for surfaces, borders, and shadows.
 */

import React from 'react';
import { Maximize2, MoreHorizontal, LucideIcon } from 'lucide-react';

interface WidgetCardProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  /** aria-label for accessibility */
  ariaLabel: string;
  /** Optional CSS class name */
  className?: string;
  /** Top accent bar gradient (for snapshot widgets) */
  accentGradient?: string;
  /** Optional link text shown in header (e.g., "View Full Planner →") */
  headerLink?: { label: string; onClick: () => void };
}

export function WidgetCard({
  title,
  icon: Icon,
  children,
  ariaLabel,
  className = '',
  accentGradient,
  headerLink,
}: WidgetCardProps) {
  return (
    <div
      className={`widget-card relative overflow-hidden ${className}`}
      aria-label={ariaLabel}
      style={{
        background: 'var(--catalyst-bg-surface-0)',
        border: '1px solid var(--catalyst-border-default)',
        borderRadius: 'var(--catalyst-radius-xl)',
        boxShadow: 'var(--catalyst-shadow-card)',
        padding: 'var(--catalyst-density-padding-card)',
        transition: `box-shadow var(--catalyst-duration-normal) var(--catalyst-easing-default),
                     border-color var(--catalyst-duration-normal) var(--catalyst-easing-default)`,
        cursor: accentGradient ? 'pointer' : undefined,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = 'var(--catalyst-shadow-dropdown)';
        e.currentTarget.style.borderColor = 'var(--catalyst-border-strong)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'var(--catalyst-shadow-card)';
        e.currentTarget.style.borderColor = 'var(--catalyst-border-default)';
      }}
    >
      {/* Accent bar for snapshot-type widgets */}
      {accentGradient && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: accentGradient,
          }}
        />
      )}

      {/* Widget header */}
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: 'var(--catalyst-density-gap)' }}
      >
        <div className="flex items-center gap-2">
          <Icon
            style={{
              width: 'var(--catalyst-density-icon-size)',
              height: 'var(--catalyst-density-icon-size)',
              color: 'var(--catalyst-text-tertiary)',
              strokeWidth: 1.5,
            }}
          />
          <span
            style={{
              fontSize: 'var(--catalyst-density-widget-title)',
              fontWeight: 600,
              color: 'var(--catalyst-text-primary)',
            }}
          >
            {title}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {headerLink && (
            <button
              onClick={headerLink.onClick}
              className="focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                fontSize: '10px',
                color: 'var(--catalyst-text-link)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 'var(--catalyst-radius-sm)',
                fontWeight: 500,
              }}
            >
              {headerLink.label}
            </button>
          )}
          <button
            className="flex items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              width: '28px',
              height: '28px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--catalyst-text-tertiary)',
              transition: `background var(--catalyst-duration-fast)`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--catalyst-bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
            aria-label={`Expand ${title}`}
          >
            <Maximize2 size={14} />
          </button>
          <button
            className="flex items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              width: '28px',
              height: '28px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--catalyst-text-tertiary)',
              transition: `background var(--catalyst-duration-fast)`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--catalyst-bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
            aria-label={`More options for ${title}`}
          >
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* Widget body */}
      {children}
    </div>
  );
}
