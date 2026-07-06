/**
 * WikiEditorBoundary — error boundary around the BlockNote editor
 * (CAT-DOCS-NOTION-20260704-001 Pass C #44).
 *
 * A schema/mount crash inside the editor subtree previously unmounted it
 * SILENTLY (the Mantine-9 incident shipped a blank canvas for days). This
 * boundary makes any editor crash loud and recoverable — content is safe in
 * the IndexedDB draft journal and the last server save.
 */
import { Component, type ReactNode } from 'react';
import Button from '@atlaskit/button/new';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class WikiEditorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[docex] editor crashed', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        role="alert"
        style={{
          padding: 20,
          borderRadius: 8,
          border: '1px solid var(--ds-border-danger)',
          background: 'var(--ds-background-danger)',
        }}
      >
        <p style={{ margin: 0, color: 'var(--ds-text)', font: 'var(--ds-font-body)', fontWeight: 600 }}>
          The editor hit a problem and stopped.
        </p>
        <p style={{ margin: '4px 0 12px', color: 'var(--ds-text-subtle)', font: 'var(--ds-font-body-small)' }}>
          Your text is safe — every keystroke is journaled on this device and the last
          autosave is on the server. Reload to continue writing.
        </p>
        <Button appearance="default" onClick={() => window.location.reload()}>
          Reload editor
        </Button>
      </div>
    );
  }
}

export default WikiEditorBoundary;
