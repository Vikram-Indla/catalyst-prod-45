import React from 'react';
import { token } from '@atlaskit/tokens';
import { useActiveDemandProcessSteps } from '@/hooks/useDemandProcessSteps';
import { getBrandColorHex } from '@/components/admin/BrandColorPicker';

export function DashboardWorkflowPath() {
  const { data: steps = [], isLoading } = useActiveDemandProcessSteps();

  if (isLoading) {
    return (
      <div
        data-testid="workflow-path-skeleton"
        style={{
          height: 32,
          borderRadius: 4,
          background: token('color.background.neutral', '#F4F5F7'),
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      />
    );
  }

  if (steps.length === 0) return null;

  const sorted = [...steps].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: token('space.100', '8px'),
        padding: `${token('space.075', '6px')} ${token('space.150', '12px')}`,
        background: token('color.background.neutral.subtle', '#FAFBFC'),
        borderRadius: 4,
        border: `1px solid ${token('color.border', '#DFE1E6')}`,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: token('color.text.subtlest', '#8993A4'),
          whiteSpace: 'nowrap',
          marginRight: token('space.100', '8px'),
        }}
      >
        {sorted.length} stages
      </span>

      <ol
        role="list"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          margin: 0,
          padding: 0,
          listStyle: 'none',
          flex: 1,
          overflow: 'hidden',
        }}
      >
        {sorted.map((step, idx) => {
          const color = getBrandColorHex(step.color);
          const isLast = idx === sorted.length - 1;
          return (
            <li
              key={step.id}
              role="listitem"
              style={{
                display: 'flex',
                alignItems: 'center',
                flex: 1,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: token('space.050', '4px'),
                  overflow: 'hidden',
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: color,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: token('color.text.subtle', '#505258'),
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {step.label}
                </span>
              </div>

              {!isLast && (
                <div
                  aria-hidden="true"
                  style={{
                    flex: 1,
                    height: 1,
                    background: token('color.border', '#DFE1E6'),
                    margin: `0 ${token('space.075', '6px')}`,
                    minWidth: 8,
                  }}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
