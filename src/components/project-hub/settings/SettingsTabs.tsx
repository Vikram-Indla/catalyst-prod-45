import { useRef, useEffect } from 'react';

const TABS = [
  'General', 'Members', 'Workflow', 'Types', 'Labels', 'Components', 'Integration', 'Notifications',
] as const;

export type SettingsTab = typeof TABS[number];

interface SettingsTabsProps {
  active: SettingsTab;
  onChange: (tab: SettingsTab) => void;
}

export function SettingsTabs({ active, onChange }: SettingsTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll active tab into view
  useEffect(() => {
    const el = containerRef.current?.querySelector('[data-active="true"]') as HTMLElement | null;
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [active]);

  return (
    <div
      ref={containerRef}
      className="flex overflow-x-auto"
      style={{ borderBottom: '1px solid #E2E8F0', gap: 0 }}
    >
      {TABS.map(tab => {
        const isActive = tab === active;
        return (
          <button
            key={tab}
            data-active={isActive}
            onClick={() => onChange(tab)}
            className="flex-shrink-0 transition-colors"
            style={{
              height: 40,
              padding: '0 16px',
              fontSize: 13,
              fontWeight: isActive ? 600 : 500,
              color: isActive ? '#2563EB' : '#64748B',
              borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
              background: 'transparent',
              border: 'none',
              borderBottomWidth: 2,
              borderBottomStyle: 'solid',
              borderBottomColor: isActive ? '#2563EB' : 'transparent',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              whiteSpace: 'nowrap',
            }}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}
