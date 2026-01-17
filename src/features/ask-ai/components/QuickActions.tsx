/**
 * Quick Actions Component
 * Shows quick action chips for common queries
 */

import React from 'react';
import { BarChart2, Bug, FileText, TestTube2, Target, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { QuickAction } from '../types';

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'coverage', label: 'Coverage Analysis', icon: 'bar-chart', prompt: 'What is the current test coverage?' },
  { id: 'defects', label: 'Defect Trends', icon: 'bug', prompt: 'Show me the defect trends for this release' },
  { id: 'generate', label: 'Generate Tests', icon: 'test-tube', prompt: 'Generate test cases for the login flow' },
  { id: 'readiness', label: 'Release Readiness', icon: 'target', prompt: 'Are we ready for release?' },
  { id: 'report', label: 'Status Report', icon: 'file-text', prompt: 'Generate a test status report' },
];

const iconMap: Record<string, React.ReactNode> = {
  'bar-chart': <BarChart2 className="w-4 h-4" />,
  'bug': <Bug className="w-4 h-4" />,
  'test-tube': <TestTube2 className="w-4 h-4" />,
  'target': <Target className="w-4 h-4" />,
  'file-text': <FileText className="w-4 h-4" />,
  'zap': <Zap className="w-4 h-4" />,
};

interface QuickActionsProps {
  onAction: (prompt: string) => void;
}

export function QuickActions({ onAction }: QuickActionsProps) {
  return (
    <div className="px-6 py-4 bg-white border-b border-slate-200 flex gap-3 overflow-x-auto">
      {QUICK_ACTIONS.map(action => (
        <Button
          key={action.id}
          variant="outline"
          onClick={() => onAction(action.prompt)}
          className="flex-shrink-0 h-10 px-5 rounded-full border-slate-200 text-[13px] font-medium text-slate-600 hover:border-[#2563eb] hover:text-[#2563eb] transition-colors gap-2"
        >
          {iconMap[action.icon]}
          {action.label}
        </Button>
      ))}
    </div>
  );
}
