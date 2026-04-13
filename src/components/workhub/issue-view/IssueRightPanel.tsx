/**
 * IssueRightPanel — Right panel with "All work" and "Fields" tabs
 * ════════════════════════════════════════════════════════════════════════════
 */
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { AllWorkTab } from './AllWorkTab';
import { FieldsTab } from './FieldsTab';
import type { AllWorkItem } from '@/types/allwork.types';

interface IssueRightPanelProps {
  issueKey: string | null;
  isDark: boolean;
  item?: AllWorkItem | null;
}

type RightPanelTab = 'allwork' | 'fields';

export function IssueRightPanel({
  issueKey,
  isDark,
  item,
}: IssueRightPanelProps) {
  const [activeTab, setActiveTab] = useState<RightPanelTab>('allwork');

  if (!issueKey) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className={cn('font-body text-sm', isDark ? 'text-[#878787]' : 'text-[#6B6E76]')}>
          Select an issue
        </p>
      </div>
    );
  }

  const tabs: { key: RightPanelTab; label: string }[] = [
    { key: 'allwork', label: 'All work' },
    { key: 'fields', label: 'Fields' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* ─── Tab bar ─── */}
      <div className={cn(
        'flex items-center gap-1 px-4 py-2 border-b shrink-0',
        isDark ? 'border-[#2E2E2E]' : 'border-[#DFE1E6]',
      )}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            aria-selected={activeTab === tab.key}
            className={cn(
              'px-3 py-1.5 rounded-md font-body text-sm font-medium transition-colors',
              'border',
              activeTab === tab.key
                ? isDark
                  ? 'bg-[#1A1A1A] border-[#2E2E2E] text-[#EDEDED] shadow-sm'
                  : 'bg-white border-[#DFE1E6] text-[#292A2E] shadow-sm'
                : isDark
                  ? 'bg-transparent border-transparent text-[#A1A1A1] hover:bg-[#1F1F1F]'
                  : 'bg-transparent border-transparent text-[#505258] hover:bg-[#F4F5F7]',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Tab content ─── */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'allwork' ? (
          <AllWorkTab issueKey={issueKey} isDark={isDark} item={item} />
        ) : (
          <FieldsTab issueKey={issueKey} isDark={isDark} item={item} />
        )}
      </div>
    </div>
  );
}
