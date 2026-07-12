// @ts-nocheck
/**
 * SectionMessage — Catalyst wrapper over @atlaskit/section-message.
 *
 * In-page banner for advisory / warning / error / success / info states.
 * Not for transient flags — use Flag for that.
 */
import AkSectionMessage, { SectionMessageAction } from '@atlaskit/section-message';
import { type ReactNode } from 'react';

export type SectionMessageAppearance =
  | 'information'
  | 'warning'
  | 'error'
  | 'success'
  | 'discovery';

export interface SectionMessageProps {
  appearance?: SectionMessageAppearance;
  title?: ReactNode;
  actions?: Array<{ key: string; text: ReactNode; onClick: () => void }>;
  testId?: string;
  children: ReactNode;
}

export function SectionMessage({
  appearance = 'information',
  title,
  actions,
  testId,
  children,
}: SectionMessageProps) {
  return (
    <AkSectionMessage
      appearance={appearance}
      title={title}
      actions={actions?.map((a) => (
        <SectionMessageAction key={a.key} onClick={a.onClick}>
          {a.text}
        </SectionMessageAction>
      ))}
      testId={testId}
    >
      {children}
    </AkSectionMessage>
  );
}