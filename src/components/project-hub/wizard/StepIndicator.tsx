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
                  background: isDone ? '#16A34A' : isActive ? '#2563EB' : 'transparent',
                  border: isUpcoming ? '2px solid #CBD5E1' : 'none',
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {isDone ? (
                  <Check size={14} strokeWidth={2.5} />
                ) : (
                  <span style={{ color: isActive ? '#FFFFFF' : '#94A3B8' }}>{i + 1}</span>
                )}
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#0F172A' : isDone ? '#16A34A' : '#94A3B8',
                  marginTop: 4,
                  whiteSpace: 'nowrap',
                  fontFamily: "'Inter', sans-serif",
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
                  background: i < current ? '#16A34A' : '#E2E8F0',
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
