/**
 * My Test Scope Header
 * Shows title, counts, and action buttons
 * Matches TestHubPageHeader style: 64px, Sora 18px/700, Inter 13px subtitle
 */

import React from 'react';
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
    <div className="h-16 px-6 bg-card border-b border-border flex items-center justify-between shrink-0">
      <div>
        <h1 className="font-['Sora'] text-lg font-bold text-foreground tracking-tight m-0 leading-tight">
          My Test Scope
        </h1>
        <p className="font-['Inter'] text-[13px] text-muted-foreground mt-0.5 leading-tight">
          {summary.totalTests} tests &bull; {summary.linkedDefectsCount} defects &bull; {summary.activeIncidentsCount} incidents
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onExport}
          className="inline-flex items-center gap-1 h-8 px-3 text-[13px] font-medium text-foreground bg-card border border-border rounded-md cursor-pointer font-['Inter'] hover:bg-muted transition-colors"
        >
          <Download size={13} /> Export
        </button>
        <button
          onClick={onExecuteAll}
          disabled={summary.notRunTests === 0}
          className="inline-flex items-center gap-1 h-8 px-3 text-[13px] font-medium text-primary-foreground bg-primary border border-primary rounded-md cursor-pointer font-['Inter'] disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          <Play size={13} /> Execute All
        </button>
      </div>
    </div>
  );
}
