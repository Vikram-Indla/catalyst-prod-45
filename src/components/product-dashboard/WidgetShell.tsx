import React, { useState } from 'react';
import { token } from '@atlaskit/tokens';

export function WidgetIconBtn({
  title,
  'aria-label': ariaLabel,
  onClick,
  children,
}: {
  title: string;
  'aria-label'?: string;
  onClick?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      title={title}
      aria-label={ariaLabel ?? title}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 32,
        height: 32,
        border: 'none',
        background: hover ? token('color.background.neutral.hovered', '#F1F2F4') : 'transparent',
        borderRadius: 4,
        color: token('color.text.subtle', 'var(--cp-text-secondary, #44546F)'),
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 16,
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

interface WidgetShellProps {
  title: string;
  question?: string;
  actions?: React.ReactNode;
  footerLeft?: React.ReactNode;
  footerRight?: string;
  flush?: boolean;
  'aria-label'?: string;
  children: React.ReactNode;
}

export function WidgetShell({
  title,
  question,
  actions,
  footerLeft,
  footerRight,
  flush = false,
  'aria-label': ariaLabel,
  children,
}: WidgetShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <article
      aria-label={ariaLabel ?? title}
      style={{
        background: token('elevation.surface', '#FFFFFF'),
        borderRadius: 8,
        boxShadow: '0 1px 1px rgba(9,30,66,0.25), 0 0 1px rgba(9,30,66,0.31)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 18px',
          minHeight: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: collapsed ? 'none' : `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))')}`,
          gap: 12,
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setCollapsed(c => !c)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 500,
              color: token('color.text', 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))'),
              lineHeight: '24px',
            }}
          >
            {title}
          </h2>
          {question && (
            <span
              style={{
                fontSize: 13,
                lineHeight: '18px',
                color: token('color.text.subtle', 'var(--cp-text-secondary, #44546F)'),
                marginTop: 2,
                fontStyle: 'italic',
              }}
            >
              {question}
            </span>
          )}
        </div>

        {/* Action buttons — stopPropagation so clicking them doesn't collapse */}
        <div
          onClick={e => e.stopPropagation()}
          style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}
        >
          {actions}
          <WidgetIconBtn
            title={collapsed ? 'Expand' : 'Collapse'}
            onClick={e => { e.stopPropagation(); setCollapsed(c => !c); }}
          >
            {collapsed ? '⌄' : '⌃'}
          </WidgetIconBtn>
        </div>
      </div>

      {!collapsed && (
        <>
          <div style={flush ? {} : { padding: 24 }}>{children}</div>

          {(footerLeft || footerRight) && (
            <div
              style={{
                padding: '10px 24px',
                borderTop: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))')}`,
                fontSize: 11,
                lineHeight: '16px',
                color: token('color.text.subtle', 'var(--cp-text-secondary, #44546F)'),
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>{footerLeft}</span>
              {footerRight && (
                <a
                  href="#"
                  onClick={e => e.preventDefault()}
                  style={{
                    color: token('color.link', '#0C66E4'),
                    textDecoration: 'none',
                    fontWeight: 500,
                  }}
                >
                  {footerRight}
                </a>
              )}
            </div>
          )}
        </>
      )}
    </article>
  );
}
