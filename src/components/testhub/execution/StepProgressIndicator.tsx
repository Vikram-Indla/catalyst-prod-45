/**
 * G19: Step Progress Indicator
 * Clickable dot navigation for steps
 */

interface StepInfo {
  step_number: number;
  status: 'not_run' | 'passed' | 'failed' | 'blocked' | 'skipped';
}

interface StepProgressIndicatorProps {
  steps: StepInfo[];
  currentIndex: number;
  onStepClick: (index: number) => void;
}

const statusColors: Record<string, string> = {
  not_run: 'hsl(var(--muted-foreground))',
  passed: '#059669',
  failed: '#DC2626',
  blocked: '#D97706',
  skipped: '#94A3B8',
};

export function StepProgressIndicator({ steps, currentIndex, onStepClick }: StepProgressIndicatorProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
      {steps.map((step, i) => {
        const isCurrent = i === currentIndex;
        const color = statusColors[step.status] || statusColors.not_run;
        return (
          <button
            key={i}
            onClick={() => onStepClick(i)}
            title={`Step ${step.step_number} - ${step.status.replace('_', ' ')}`}
            style={{
              width: isCurrent ? 28 : 20,
              height: isCurrent ? 28 : 20,
              borderRadius: '50%',
              border: isCurrent ? `2px solid ${color}` : 'none',
              backgroundColor: step.status === 'not_run' && !isCurrent
                ? 'hsl(var(--muted))'
                : step.status === 'not_run' && isCurrent
                  ? 'hsl(var(--background))'
                  : color,
              color: step.status !== 'not_run' ? '#FFFFFF' : 'hsl(var(--muted-foreground))',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
              boxShadow: isCurrent ? `0 0 0 3px ${color}30` : 'none',
              padding: 0,
            }}
          >
            {step.step_number}
          </button>
        );
      })}
    </div>
  );
}
