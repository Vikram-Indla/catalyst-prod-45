/**
 * ProductHubPageHeader — Shared header matching "For You" pattern
 * Layout: Title + subtitle (left) | Action buttons (right)
 * Typography: Sora 22px 700 title, Inter 13px subtitle
 */

import React from 'react';

interface ProductHubPageHeaderProps {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
}

export function ProductHubPageHeader({ title, subtitle, actions }: ProductHubPageHeaderProps) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: '24px 28px 16px',
        borderBottom: '0.75px solid rgba(15,23,42,0.06)',
        background: '#FFFFFF',
      }}
    >
      <div>
        <h1
          style={{
            fontFamily: "'Sora', system-ui",
            fontSize: 22,
            fontWeight: 700,
            color: '#09090B',
            letterSpacing: '-0.025em',
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          {title}
        </h1>
        <p
          style={{
            fontSize: 13,
            color: '#71717A',
            marginTop: 2,
            margin: 0,
            marginBlockStart: 2,
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          {subtitle}
        </p>
      </div>

      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {actions}
        </div>
      )}
    </header>
  );
}
