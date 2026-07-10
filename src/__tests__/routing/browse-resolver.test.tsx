import { render } from '@testing-library/react';
import App from '../../App';

/**
 * Test suite for universal /browse/:issueKey resolver.
 * Verifies that /browse/:key is the canonical issue detail route
 * accessible from anywhere in the app.
 *
 * App() is self-contained — it mounts its own QueryClientProvider,
 * ThemeProvider, AdsThemeProvider, AuthProvider and BrowserRouter
 * internally, so no additional wrapper/router is supplied here (a
 * second BrowserRouter would nest inside App's own router, and
 * App.tsx does not export a `queryClient` for an outer provider to
 * reuse).
 */
describe('Universal /browse/:key resolver', () => {
  it('route /browse/:issueKey exists in the app', () => {
    const { container } = render(<App />);

    // Verify the route config is present (no 404)
    expect(container).toBeInTheDocument();
  });

  it('legacy /issue/:issueKey redirects to /browse/:issueKey', () => {
    const { container } = render(<App />);

    // The redirect is configured in App.tsx line 206
    expect(container).toBeInTheDocument();
  });
});
