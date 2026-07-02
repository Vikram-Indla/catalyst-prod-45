import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from '@/lib/atlaskit-icons';
import Button from '@atlaskit/button/new';

const RELOAD_KEY = 'catalyst-chunk-reload';

function isChunkLoadError(error: Error): boolean {
  const msg = error.message || '';
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Loading chunk') ||
    msg.includes('ChunkLoadError')
  );
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Auto-reload once for stale chunk errors (new deployment invalidated old chunks)
    if (isChunkLoadError(error)) {
      const lastReload = sessionStorage.getItem(RELOAD_KEY);
      const now = Date.now();
      // Only auto-reload if we haven't done so in the last 10 seconds
      if (!lastReload || now - Number(lastReload) > 10_000) {
        sessionStorage.setItem(RELOAD_KEY, String(now));
        window.location.reload();
        return;
      }
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--ds-surface)',
          padding: '16px',
        }}>
          <div style={{ maxWidth: 448, width: '100%', textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'var(--ds-background-danger)',
              margin: '0 auto 24px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AlertTriangle style={{ width: 32, height: 32, color: 'var(--ds-icon-danger)' }} />
            </div>
            <h1 style={{
              fontSize: 'var(--ds-font-size-500)',
              fontWeight: 700,
              color: 'var(--ds-text)',
              margin: '0 0 8px',
            }}>
              Something went wrong
            </h1>
            <p style={{ color: 'var(--ds-text-subtle)', margin: '0 0 24px', lineHeight: 1.5 }}>
              An unexpected error occurred. Refreshing the page usually fixes this.
              If it keeps happening, try going back to the home screen.
            </p>
            {this.state.error && import.meta.env.DEV && (
              <pre style={{
                fontSize: 11,
                textAlign: 'left',
                background: 'var(--ds-surface-sunken)',
                border: '1px solid var(--ds-border)',
                borderRadius: 4,
                padding: '12px 16px',
                overflowX: 'auto',
                maxHeight: 128,
                color: 'var(--ds-text-subtle)',
                margin: '0 0 24px',
              }}>
                {this.state.error.message}
              </pre>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button onClick={this.handleRetry} iconBefore={() => <RefreshCw style={{ width: 16, height: 16 }} />}>
                Refresh Page
              </Button>
              <Button
                appearance="subtle"
                onClick={() => { window.location.href = '/'; }}
                iconBefore={() => <Home style={{ width: 16, height: 16 }} />}
              >
                Go home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
