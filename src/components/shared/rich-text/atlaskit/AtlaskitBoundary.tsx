/**
 * AtlaskitBoundary — Error boundary for the lazily-loaded Atlaskit pilot.
 *
 * The Atlaskit editor stack is heavy and can fail at runtime for reasons
 * outside the data layer (chunk load failure, react-intl-next mismatch,
 * prosemirror schema rejection of a malformed ADF doc). When that happens,
 * we surface a clear console error and fall back to a caller-supplied
 * renderer so the description never appears broken in production.
 */
import React from 'react';

interface Props {
  /** Rendered when the Atlaskit subtree throws. */
  fallback: React.ReactNode;
  /** Identifier logged with the error (e.g. issue_key). */
  diagnosticTag?: string;
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export class AtlaskitBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(
      `[AtlaskitBoundary] Atlaskit pilot threw — falling back. tag=${this.props.diagnosticTag ?? 'n/a'}`,
      error,
      info,
    );
  }

  render() {
    if (this.state.error) return this.props.fallback;
    return this.props.children;
  }
}
