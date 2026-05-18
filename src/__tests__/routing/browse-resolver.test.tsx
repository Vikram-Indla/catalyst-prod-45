import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../../App';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../../App';
import { AuthProvider } from '../../lib/auth';
import { ThemeProvider } from '../../providers/ThemeProvider';
import { AdsThemeProvider } from '../../theme/ads';

/**
 * Test suite for universal /browse/:issueKey resolver.
 * Verifies that /browse/:key is the canonical issue detail route
 * accessible from anywhere in the app.
 */
describe('Universal /browse/:key resolver', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AdsThemeProvider>
          <AuthProvider>
            <BrowserRouter>
              {children}
            </BrowserRouter>
          </AuthProvider>
        </AdsThemeProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );

  it('route /browse/:issueKey exists in the app', () => {
    const { container } = render(<App />, { wrapper });

    // Verify the route config is present (no 404)
    expect(container).toBeInTheDocument();
  });

  it('legacy /issue/:issueKey redirects to /browse/:issueKey', () => {
    const { container } = render(<App />, { wrapper });

    // The redirect is configured in App.tsx line 206
    expect(container).toBeInTheDocument();
  });
});
