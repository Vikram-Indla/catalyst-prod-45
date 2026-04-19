/**
 * ProgressBar — Catalyst wrapper over @atlaskit/progress-bar.
 *
 * Determinate progress only. For indeterminate loading use Spinner.
 */
import AkProgressBar from '@atlaskit/progress-bar';

export type ProgressBarAppearance = 'default' | 'success' | 'discovery';

export interface ProgressBarProps {
  /** Value 0..1. Values outside are clamped by Atlaskit. */
  value: number;
  appearance?: ProgressBarAppearance;
  /** Shows the percentage label next to the bar. */
  shouldAnimateFill?: boolean;
  'aria-label'?: string;
  testId?: string;
}

export function ProgressBar({
  value,
  appearance = 'default',
  shouldAnimateFill,
  testId,
  ...rest
}: ProgressBarProps) {
  return (
    <AkProgressBar
      value={value}
      appearance={appearance}
      shouldAnimateFill={shouldAnimateFill}
      ariaLabel={rest['aria-label']}
      testId={testId}
    />
  );
}
