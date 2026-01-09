/**
 * Slide Out Panel - Drawer for Trace, Props, AI, History
 * Replaces always-visible 320px panel to reclaim horizontal space
 */

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Link2, Settings, Sparkles, History, Plus, X, PanelRightOpen, PanelRightClose } from 'lucide-react';
import { Button } from '@/components/ui/button';

type TabId = 'trace' | 'props' | 'ai' | 'history';

interface SlideOutPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  onLinkItem?: () => void;
}

export function SlideOutPanel({ isOpen, onToggle, onLinkItem }: SlideOutPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('trace');

  const tabs = [
    { id: 'trace' as TabId, icon: Link2, label: 'Trace' },
    { id: 'props' as TabId, icon: Settings, label: 'Props' },
    { id: 'ai' as TabId, icon: Sparkles, label: 'AI' },
    { id: 'history' as TabId, icon: History, label: 'History' },
  ];

  return (
    <>
      {/* Toggle button when closed */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed right-4 top-16 z-40 p-2 rounded-lg bg-[var(--bg-0)] border shadow-lg hover:bg-[var(--row-hover)] transition-colors"
          style={{ borderColor: 'var(--stroke-1)', boxShadow: '0 4px 12px hsl(0 0% 0% / 0.08)' }}
          title="Open Panel"
        >
          <PanelRightOpen className="h-5 w-5 text-[var(--text-3)]" />
        </button>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity"
          onClick={onToggle}
        />
      )}

      {/* Slide-out drawer */}
      <aside
        className={cn(
          'fixed top-0 right-0 h-full z-50 flex flex-col bg-[var(--bg-0)] border-l transition-transform duration-200',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{ width: '340px', borderColor: 'var(--stroke-1)', boxShadow: '-8px 0 24px hsl(0 0% 0% / 0.08)' }}
      >
        {/* Header with close */}
        <div
          className="flex items-center justify-between px-4 border-b shrink-0"
          style={{ height: '48px', borderColor: 'var(--stroke-1)' }}
        >
          <span className="font-semibold text-[var(--text-1)]" style={{ fontSize: '14px' }}>
            Details Panel
          </span>
          <button
            onClick={onToggle}
            className="p-1.5 rounded hover:bg-[var(--row-hover)] text-[var(--text-3)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div
          className="flex border-b shrink-0"
          style={{ borderColor: 'var(--stroke-1)' }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors border-b-2',
                  isActive
                    ? 'border-[#2563eb] text-[#2563eb]'
                    : 'border-transparent text-[var(--text-3)] hover:text-[var(--text-1)]'
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
            <div className="space-y-5">
              {/* Trace Hierarchy */}
              <div>
                <h4
                  className="font-semibold text-[var(--text-2)] uppercase tracking-wide mb-2"
                  style={{ fontSize: '11px', letterSpacing: '0.5px' }}
                >
                  TRACE HIERARCHY
                </h4>
                <div
                  className="rounded-lg border p-3 text-center"
                  style={{ borderColor: 'var(--stroke-1)' }}
                >
                  <p className="text-sm text-[var(--text-3)]">No hierarchy defined</p>
                </div>
              </div>

              {/* AC Coverage */}
              <div>
                <h4
                  className="font-semibold text-[var(--text-2)] uppercase tracking-wide mb-2"
                  style={{ fontSize: '11px', letterSpacing: '0.5px' }}
                >
                  AC COVERAGE
                </h4>
                <div
                  className="rounded-lg border p-3 text-center"
                  style={{ borderColor: 'var(--stroke-1)' }}
                >
                  <p className="text-sm text-[var(--text-3)]">No acceptance criteria linked</p>
                </div>
              </div>

              {/* Linked Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4
                    className="font-semibold text-[var(--text-2)] uppercase tracking-wide"
                    style={{ fontSize: '11px', letterSpacing: '0.5px' }}
                  >
                    LINKED ITEMS
                  </h4>
                  <button
                    onClick={onLinkItem}
                    className="text-[#2563eb] hover:text-[#1d4ed8] text-xs font-medium transition-colors"
                  >
                    + Link
                  </button>
                </div>
                <div
                  className="rounded-lg border p-3"
                  style={{ borderColor: 'var(--stroke-1)' }}
                >
                  <div className="flex items-center gap-2 text-[var(--text-3)]">
                    <Plus className="h-4 w-4" />
                    <span className="text-sm">Link to defect, story, or test case</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'props' && (
            <div className="space-y-4">
              <div className="text-sm text-[var(--text-3)]">
                Additional properties like owner, tags, and custom fields will appear here.
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div className="text-center py-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#ede9fe] mb-3">
                  <Sparkles className="h-6 w-6 text-[#7c3aed]" />
                </div>
                <p className="text-sm text-[var(--text-1)] font-medium mb-1">AI Suggestions</p>
                <p className="text-xs text-[var(--text-3)]">
                  AI-powered recommendations will appear here
                </p>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="text-sm text-[var(--text-3)]">
                Version history and change log
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export default SlideOutPanel;
