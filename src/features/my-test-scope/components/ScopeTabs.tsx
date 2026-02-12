/**
 * Scope Tabs Navigation
 * Tab navigation for My Test Scope views
 * Styled to match dashboard: white bg, consistent borders
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

const TABS: { value: TestScopeTab; label: string; icon: React.ComponentType<{ style?: React.CSSProperties }>; countKey?: keyof ScopeTabsProps['counts'] }[] = [
  { value: 'tests', label: 'My Tests', icon: FileCheck, countKey: 'tests' },
  { value: 'defects', label: 'Linked Defects', icon: Bug, countKey: 'defects' },
  { value: 'incidents', label: 'Incidents', icon: Zap, countKey: 'incidents' },
  { value: 'traceability', label: 'Traceability', icon: Network },
  { value: 'workload', label: 'Workload', icon: BarChart3 },
];

export function ScopeTabs({ activeTab, onTabChange, counts }: ScopeTabsProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 0,
      borderBottom: '1px solid #E2E8F0',
      backgroundColor: '#FFFFFF',
      padding: '0 24px',
      flexShrink: 0,
      fontFamily: 'Inter, sans-serif',
    }}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.value;
        const count = tab.countKey ? counts[tab.countKey] : undefined;
        return (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 16px',
              fontSize: 13, fontWeight: isActive ? 600 : 500,
              color: isActive ? '#2563EB' : '#64748B',
              background: 'none', border: 'none',
              borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'color 150ms, border-color 150ms',
              marginBottom: -1,
            }}
          >
            <tab.icon style={{ width: 14, height: 14 }} />
            {tab.label}
            {count !== undefined && (
              <span style={{
                fontSize: 11, fontWeight: 600,
                background: isActive ? '#EFF6FF' : '#F1F5F9',
                color: isActive ? '#2563EB' : '#64748B',
                padding: '1px 6px', borderRadius: 4,
              }}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
