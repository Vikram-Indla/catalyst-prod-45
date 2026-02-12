/**
 * Scope Tabs Navigation
 * Tab navigation for My Test Scope views
 */

import React from 'react';
import { FileCheck, Bug, Zap, Network, BarChart3 } from 'lucide-react';
import type { TestScopeTab } from '../types';

interface ScopeTabsProps {
  activeTab: TestScopeTab;
  onTabChange: (tab: TestScopeTab) => void;
  counts: {
    tests: number;
    defects: number;
    incidents: number;
  };
}

const TABS: { value: TestScopeTab; label: string; icon: React.ComponentType<{ className?: string }>; countKey?: keyof ScopeTabsProps['counts'] }[] = [
  { value: 'tests', label: 'My Tests', icon: FileCheck, countKey: 'tests' },
  { value: 'defects', label: 'Linked Defects', icon: Bug, countKey: 'defects' },
  { value: 'incidents', label: 'Incidents', icon: Zap, countKey: 'incidents' },
  { value: 'traceability', label: 'Traceability', icon: Network },
  { value: 'workload', label: 'Workload', icon: BarChart3 },
];

export function ScopeTabs({ activeTab, onTabChange, counts }: ScopeTabsProps) {
  return (
    <div className="flex items-center border-b border-border bg-card px-6 shrink-0 font-['Inter']">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.value;
        const count = tab.countKey ? counts[tab.countKey] : undefined;
        return (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-[13px] bg-transparent border-none cursor-pointer transition-colors -mb-px ${
              isActive
                ? 'font-semibold text-primary border-b-2 border-primary'
                : 'font-medium text-muted-foreground border-b-2 border-transparent hover:text-foreground'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
            {count !== undefined && (
              <span className={`text-[11px] font-semibold px-1.5 py-px rounded ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
