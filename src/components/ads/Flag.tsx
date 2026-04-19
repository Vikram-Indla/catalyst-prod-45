/**
 * Flag — Catalyst wrapper over @atlaskit/flag.
 *
 * Transient toast-style notifications. FlagGroup is used once at app root
 * (see App.tsx) to host an imperative queue; individual flags are pushed
 * via the `useFlags()` hook (not provided here — integrate with sonner/
 * react-hot-toast when we consolidate toast providers).
 */
import AkFlag, { FlagGroup as AkFlagGroup } from '@atlaskit/flag';
import { type ReactNode } from 'react';

export type FlagAppearance =
  | 'normal'
  | 'info'
  | 'warning'
  | 'error'
  | 'success';

export interface FlagProps {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  appearance?: FlagAppearance;
  icon?: ReactNode;
  actions?: Array<{ content: ReactNode; onClick: () => void }>;
  testId?: string;
}

export function Flag({
  id,
  title,
  description,
  appearance = 'normal',
  icon,
  actions,
  testId,
}: FlagProps) {
  return (
    <AkFlag
      id={id}
      title={title}
      description={description}
      appearance={appearance}
      icon={icon as React.ReactElement}
      actions={actions?.map((a) => ({ content: a.content as string, onClick: a.onClick }))}
      testId={testId}
    />
  );
}

export interface FlagGroupProps {
  children: ReactNode;
  onDismissed?: (id: string) => void;
  label?: string;
  testId?: string;
}

export function FlagGroup({ children, onDismissed, label, testId }: FlagGroupProps) {
  return (
    <AkFlagGroup onDismissed={onDismissed as never} label={label} testId={testId}>
      {children}
    </AkFlagGroup>
  );
}
