/**
 * TestHubPageHeader — Shared header component for all /testhub/* pages.
 * Matches the Test Repository header style: 64px height, Sora 18px/700 title, Inter 13px subtitle.
 */

import React from 'react';

interface TestHubPageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode; // Right-side actions
}

export function TestHubPageHeader({ title, subtitle, children }: TestHubPageHeaderProps) {
  return (
    <div
      style={{
        height: 64,
        padding: '0 24px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        boxSizing: 'border-box',
      }}
    >
      <div>
        <h1
          style={{
            fontFamily: 'Sora, sans-serif',
            fontSize: 18,
            fontWeight: 700,
            color: '#0F172A',
            letterSpacing: '-0.01em',
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 13,
              color: '#64748B',
              margin: '2px 0 0 0',
              lineHeight: 1.3,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {children && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {children}
        </div>
      )}
    </div>
  );
}

export default TestHubPageHeader;
