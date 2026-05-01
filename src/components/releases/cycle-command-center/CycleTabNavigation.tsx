/**
 * Tab Navigation for Cycle Command Center
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CATALYST_V5 } from '@/lib/catalyst-colors';
import type { CycleViewTab } from '@/pages/releases/CycleCommandCenter';

interface Tab {
  id: CycleViewTab;
  label: string;
  icon: LucideIcon;
}

interface CycleTabNavigationProps {
  tabs: Tab[];
  activeTab: CycleViewTab;
  onTabChange: (tab: CycleViewTab) => void;
}

export function CycleTabNavigation({ tabs, activeTab, onTabChange }: CycleTabNavigationProps) {
  return (
    <div className="border-b bg-background">
      <div className="px-6">
        <nav className="flex gap-1 -mb-px" role="tablist">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
                  'border-b-2 -mb-px',
                  isActive
                    ? 'border-b-2 text-[var(--ds-text-brand,#2563eb)]'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
                style={isActive ? { 
                  borderBottomColor: CATALYST_V5.primary,
                  backgroundColor: CATALYST_V5.primaryLighter,
                } : undefined}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
