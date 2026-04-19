/**
 * Spinner — Catalyst wrapper over @atlaskit/spinner.
 *
 * One knob: `size`. Atlaskit's `appearance` prop (inherit / invert) is
 * folded into the theme bridge so consumers don't need to think about it.
 */
import AkSpinner from '@atlaskit/spinner';

export type SpinnerSize = 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge';

export interface SpinnerProps {
  size?: SpinnerSize;
  /** Accessible label — spoken by screen readers. Default: 'Loading'. */
  'aria-label'?: string;
  testId?: string;
}

export function Spinner({ size = 'medium', testId, ...rest }: SpinnerProps) {
  return (
    <AkSpinner
      size={size}
      label={rest['aria-label'] ?? 'Loading'}
      testId={testId}
    />
  );
}
