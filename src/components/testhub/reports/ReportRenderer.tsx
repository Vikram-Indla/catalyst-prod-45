/**
 * ReportRenderer — renders one registry report inside the Reports hub (S1.1).
 * Feature: CAT-REPORTS-HUB-20260703-001.
 *
 * Suspense (ReportSkeleton fallback) + error boundary (SectionMessage + Retry).
 * Demo entries get a prominent seeded-data warning banner above the body.
 */
import React, { Suspense } from 'react';
import SectionMessage, { SectionMessageAction } from '@atlaskit/section-message';
import ReportSkeleton from '@/pages/testhub/reports/lab/ReportSkeleton';
import type { ReportDefinition } from './report-registry-types';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onRetry: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ReportErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  handleRetry = () => {
    this.setState({ hasError: false });
    this.props.onRetry();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 'var(--ds-space-250)' }}>
          <SectionMessage
            appearance="error"
            title="This report failed to load"
            actions={<SectionMessageAction onClick={this.handleRetry}>Retry</SectionMessageAction>}
          >
            Something went wrong while rendering this report. Retry, or pick another report from the list.
          </SectionMessage>
        </div>
      );
    }
    return this.props.children;
  }
}

interface Props {
  definition: ReportDefinition;
}

export function ReportRenderer({ definition }: Props) {
  const [retryKey, setRetryKey] = React.useState(0);
  const Body = definition.component;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {definition.status === 'demo' && (
        <div style={{ padding: 'var(--ds-space-150) var(--ds-space-250) 0' }}>
          <SectionMessage appearance="warning" title="Demo data">
            This report shows seeded demo data — not live project data.
          </SectionMessage>
        </div>
      )}
      <ReportErrorBoundary key={`${definition.id}-${retryKey}`} onRetry={() => setRetryKey((k) => k + 1)}>
        <Suspense fallback={<ReportSkeleton />}>
          <Body />
        </Suspense>
      </ReportErrorBoundary>
    </div>
  );
}

export default ReportRenderer;
