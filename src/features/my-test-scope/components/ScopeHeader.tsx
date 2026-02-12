/**
 * My Test Scope Header
 * Shows title, counts, and action buttons
 * Matches TestHubPageHeader style: 64px, Sora 18px/700, Inter 13px subtitle
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Play } from 'lucide-react';
import type { TestScopeSummary } from '../types';

interface ScopeHeaderProps {
  userName: string;
  summary: TestScopeSummary;
  onExport: () => void;
  onExecuteAll: () => void;
}

export function ScopeHeader({ userName, summary, onExport, onExecuteAll }: ScopeHeaderProps) {
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
          My Scope
        </h1>
        <p
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 13,
            color: '#64748B',
            margin: '2px 0 0 0',
            lineHeight: 1.3,
          }}
        >
          {summary.totalTests} tests &bull; {summary.linkedDefectsCount} defects &bull; {summary.activeIncidentsCount} incidents
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={onExport}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            height: 32, padding: '0 12px', fontSize: 13, fontWeight: 500,
            color: '#0F172A', background: '#FFFFFF', border: '1px solid #E2E8F0',
            borderRadius: 6, cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <Download size={13} /> Export
        </button>
        <button
          onClick={onExecuteAll}
          disabled={summary.notRunTests === 0}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            height: 32, padding: '0 12px', fontSize: 13, fontWeight: 500,
            color: '#FFFFFF', background: '#2563EB', border: '1px solid #2563EB',
            borderRadius: 6, cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
            opacity: summary.notRunTests === 0 ? 0.5 : 1,
          }}
        >
          <Play size={13} /> Execute All
        </button>
      </div>
    </div>
  );
}
