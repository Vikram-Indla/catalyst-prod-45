/**
 * My Test Scope Header
 * Shows greeting, counts, and action buttons
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

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function ScopeHeader({ userName, summary, onExport, onExecuteAll }: ScopeHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-border">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          {getGreeting()}, {userName} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {summary.totalTests} tests • {summary.linkedDefectsCount} defects • {summary.activeIncidentsCount} incidents
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        <Button size="sm" onClick={onExecuteAll} disabled={summary.notRunTests === 0}>
          <Play className="h-4 w-4 mr-2" />
          Execute All
        </Button>
      </div>
    </div>
  );
}
