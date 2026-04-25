import { Check } from 'lucide-react';

const STEPS = ['Project Details', 'Workflow', 'Team Members'];

interface StepIndicatorProps {
  current: number; // 0-indexed
}

export function StepIndicator({ current }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-0 py-6">
      {STEPS.map((label, i) => {
        const isDone = i < current;
        const isActive = i === current;
        const isUpcoming = i > current;

        return (
          <div key={label} className="flex items-center">
            {/* Circle */}
            <div className="flex flex-col items-center">
              <div
                className="flex items-center justify-center rounded-full"
                style={{
                  width: 28,
                  height: 28,
                  backgroundColor: isDone ? 'var(--sem-success)' : isActive ? 'var(--cp-blue)' : 'transparent',
                  border: isUpcoming ? '2px solid var(--divider)' : 'none',
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: 'var(--ds-font-family-body)',
                }}
              >
                {isDone ? (
                  <Check size={14} strokeWidth={2.5} />
                ) : (
                  <span style={{ color: isActive ? 'var(--bg-app)' : 'var(--fg-4)' }}>{i + 1}</span>
                )}
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--fg-1)' : isDone ? 'var(--sem-success)' : 'var(--fg-4)',
                  marginTop: 4,
                  whiteSpace: 'nowrap',
                  fontFamily: 'var(--ds-font-family-body)',
                }}
              >
                {label}
              </span>
            </div>

            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div
                style={{
                  width: 60,
                  height: 2,
                  backgroundColor: i < current ? 'var(--sem-success)' : 'var(--divider)',
                  marginLeft: 8,
                  marginRight: 8,
                  marginBottom: 18,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
