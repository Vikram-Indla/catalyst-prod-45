/**
 * Side Panel with Tabs - Matches design exactly
 */

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Link2, Settings, Sparkles, History, Plus } from 'lucide-react';

type TabId = 'trace' | 'props' | 'ai' | 'history';

interface SidePanelProps {
  onLinkItem?: () => void;
}

export function SidePanel({ onLinkItem }: SidePanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('trace');

  const tabs = [
    { id: 'trace' as TabId, icon: Link2, label: 'Trace' },
    { id: 'props' as TabId, icon: Settings, label: 'Props' },
    { id: 'ai' as TabId, icon: Sparkles, label: 'AI' },
    { id: 'history' as TabId, icon: History, label: 'History' },
  ];

  return (
    <aside
      className="flex flex-col border-l bg-white h-full"
      style={{ width: '320px', minWidth: '320px', borderColor: '#e5e5e5' }}
    >
      {/* Tabs */}
      <div
        className="flex border-b"
        style={{ borderColor: '#e5e5e5' }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors border-b-2',
                isActive
                  ? 'border-[#2563eb] text-[#2563eb]'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'trace' && (
          <div className="space-y-6">
            {/* Trace Hierarchy */}
            <div>
              <h4
                className="font-semibold text-neutral-700 uppercase tracking-wide mb-3"
                style={{ fontSize: '11px', letterSpacing: '0.5px' }}
              >
                TRACE HIERARCHY
              </h4>
              <div
                className="rounded-lg border p-4 text-center"
                style={{ borderColor: '#e5e5e5' }}
              >
                <p className="text-sm text-neutral-500">No hierarchy defined</p>
              </div>
            </div>

            {/* AC Coverage */}
            <div>
              <h4
                className="font-semibold text-neutral-700 uppercase tracking-wide mb-3"
                style={{ fontSize: '11px', letterSpacing: '0.5px' }}
              >
                AC COVERAGE
              </h4>
              <div
                className="rounded-lg border p-4 text-center"
                style={{ borderColor: '#e5e5e5' }}
              >
                <p className="text-sm text-neutral-500">No acceptance criteria linked</p>
              </div>
            </div>

            {/* Linked Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4
                  className="font-semibold text-neutral-700 uppercase tracking-wide"
                  style={{ fontSize: '11px', letterSpacing: '0.5px' }}
                >
                  LINKED ITEMS
                </h4>
                <button
                  onClick={onLinkItem}
                  className="text-[#2563eb] hover:text-[#1d4ed8] text-sm font-medium"
                >
                  + Link
                </button>
              </div>
              <div
                className="rounded-lg border p-4"
                style={{ borderColor: '#e5e5e5' }}
              >
                <div className="flex items-center gap-2 text-neutral-500">
                  <Plus className="h-4 w-4" />
                  <span className="text-sm">Link to defect, story, or test case</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'props' && (
          <div className="text-center py-8 text-neutral-500 text-sm">
            Properties panel
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="text-center py-8 text-neutral-500 text-sm">
            AI suggestions will appear here
          </div>
        )}

        {activeTab === 'history' && (
          <div className="text-center py-8 text-neutral-500 text-sm">
            Version history
          </div>
        )}
      </div>
    </aside>
  );
}

export default SidePanel;
