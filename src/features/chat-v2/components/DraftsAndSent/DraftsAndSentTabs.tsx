import React from 'react';
import type { DraftsTab } from '@/features/chat/hooks/useShellState';

interface DraftsAndSentTabsProps {
  activeTab: DraftsTab;
  draftsCount: number;
  scheduledCount: number;
  onSelect: (tab: DraftsTab) => void;
}

interface TabDef {
  id: DraftsTab;
  label: string;
  count: number | null;
}

export function DraftsAndSentTabs({
  activeTab,
  draftsCount,
  scheduledCount,
  onSelect,
}: DraftsAndSentTabsProps) {
  const tabs: TabDef[] = [
    { id: 'drafts', label: 'Drafts', count: draftsCount > 0 ? draftsCount : null },
    { id: 'scheduled', label: 'Scheduled', count: scheduledCount > 0 ? scheduledCount : null },
    { id: 'sent', label: 'Sent', count: null },
  ];

  return (
    <div
      role="tablist"
      aria-label="Drafts and sent tabs"
      style={{
        display: 'flex',
        gap: 4,
        padding: '0 16px',
        borderBottom: '1px solid var(--cv2-border)',
        marginBottom: 4,
      }}
    >
      {tabs.map(t => {
        const isActive = activeTab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(t.id)}
            style={{
              position: 'relative',
              padding: '8px 12px',
              background: 'transparent',
              border: 'none',
              borderBottom: isActive
                ? '2px solid var(--cv2-text)'
                : '2px solid transparent',
              marginBottom: -1,
              color: isActive ? 'var(--cv2-text)' : 'var(--cv2-text-subtle)',
              fontFamily: 'var(--cv2-font)',
              font: 'var(--ds-font-body)',
              fontWeight: isActive ? 700 : 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {t.label}
            {t.count !== null && (
              <span
                style={{
                  font: 'var(--ds-font-body-small)',
                  fontWeight: 500,
                  color: isActive ? 'var(--cv2-text-subtle)' : 'var(--cv2-text-muted)',
                }}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
