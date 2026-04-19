/**
 * EmptyState — Catalyst wrapper over @atlaskit/empty-state.
 *
 * Use for first-run / no-results / zero-state views. For error states with
 * a retry, use SectionMessage appearance="error".
 */
import AkEmptyState from '@atlaskit/empty-state';
import { type ReactNode } from 'react';

export interface EmptyStateProps {
  header?: ReactNode;
  description?: ReactNode;
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  maxImageWidth?: number;
  testId?: string;
}

export function EmptyState({
  header,
  description,
  imageUrl,
  imageWidth,
  imageHeight,
  primaryAction,
  secondaryAction,
  maxImageWidth,
  testId,
}: EmptyStateProps) {
  return (
    <AkEmptyState
      header={header as string}
      description={description}
      imageUrl={imageUrl}
      imageWidth={imageWidth}
      imageHeight={imageHeight}
      maxImageWidth={maxImageWidth}
      primaryAction={primaryAction}
      secondaryAction={secondaryAction}
      testId={testId}
    />
  );
}
