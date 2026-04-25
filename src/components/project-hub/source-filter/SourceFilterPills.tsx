/**
 * SourceFilterPills — All / Catalyst / Jira filter pills
 * C5: Inside toolbar, left section. 150ms ease transition.
 */
import React from 'react';

type WorkItemSource = 'catalyst' | 'jira';
type SourceFilterValue = WorkItemSource | 'all';

interface SourceFilterPillsProps {
  value: SourceFilterValue;
  onChange: (v: SourceFilterValue) => void;
  catalystCount: number;
  jiraCount: number;
}

const JIRA_DIAMOND_SVG_SMALL = `<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24"><path fill="currentColor" d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.96 4.34 4.34 4.35V2.84a.84.84 0 0 0-.84-.84zM6.77 6.8a4.362 4.362 0 0 0 4.34 4.34h1.78v1.71a4.362 4.362 0 0 0 4.35 4.35V7.63a.839.839 0 0 0-.84-.83zM2 11.6c0 2.4 1.96 4.34 4.35 4.34h1.78v1.72c.01 2.39 1.97 4.34 4.35 4.34v-9.57a.84.84 0 0 0-.84-.83z"/></svg>`;

interface PillConfig {
  key: SourceFilterValue;
  label: string;
  count: number;
  activeBg: string;
  activeText: string;
  activeBorder: string;
  icon?: 'catalyst' | 'jira';
}

export function SourceFilterPills({ value, onChange, catalystCount, jiraCount }: SourceFilterPillsProps) {
  const total = catalystCount + jiraCount;

  const pills: PillConfig[] = [
    { key: 'all', label: 'All', count: total, activeBg: 'var(--fg-1)', activeText: '#FFFFFF', activeBorder: 'var(--fg-1)' },
    { key: 'catalyst', label: 'Catalyst', count: catalystCount, activeBg: 'var(--src-catalyst-bg, #EFF6FF)', activeText: 'var(--src-catalyst-text, #2563EB)', activeBorder: 'var(--src-catalyst-border, #BFDBFE)', icon: 'catalyst' },
    { key: 'jira', label: 'Jira', count: jiraCount, activeBg: 'var(--src-jira-bg, #FFF7ED)', activeText: 'var(--src-jira-text, #9A3412)', activeBorder: 'var(--src-jira-border, #FED7AA)', icon: 'jira' },
  ];

  return (
    <div className="inline-flex items-center gap-[6px]">
      <span style={{
        fontSize: 11.5,
        fontWeight: 500,
        color: 'var(--cp-text-tertiary, var(--fg-4))',
        fontFamily: 'var(--ds-font-family-body)',
      }}>
        Source:
      </span>
      {pills.map(pill => {
        const isActive = value === pill.key;
        return (
          <button
            key={pill.key}
            onClick={() => onChange(pill.key)}
            className="inline-flex items-center gap-[4px]"
            style={{
              height: 26,
              padding: '0 10px',
              borderRadius: 13,
              fontSize: 11.5,
              fontWeight: 500,
              fontFamily: 'var(--ds-font-family-body)',
              border: `0.75px solid ${isActive ? pill.activeBorder : 'var(--cp-border-default, rgba(15,23,42,0.12))'}`,
              backgroundColor: isActive ? pill.activeBg : 'var(--cp-float)',
              color: isActive ? pill.activeText : 'var(--cp-text-secondary, var(--fg-2))',
              cursor: 'pointer',
              transition: 'background 150ms ease, color 150ms ease, border-color 150ms ease',
            }}
          >
            {pill.icon === 'catalyst' && (
              <span
                className="flex items-center justify-center shrink-0"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 1.5,
                  backgroundColor: isActive ? 'var(--cp-blue)' : 'var(--fg-4)',
                  color: '#FFFFFF',
                  fontSize: 6,
                  fontWeight: 700,
                  lineHeight: '8px',
                }}
              >
                C
              </span>
            )}
            {pill.icon === 'jira' && (
              <span
                className="flex items-center"
                style={{ color: isActive ? 'var(--src-jira-text)' : 'var(--fg-4)' }}
                dangerouslySetInnerHTML={{ __html: JIRA_DIAMOND_SVG_SMALL }}
              />
            )}
            {pill.label}
            <span style={{
              fontFamily: 'var(--ds-font-family-monospaced)',
              fontSize: 10.5,
              opacity: 0.8,
            }}>
              {pill.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
