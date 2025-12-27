/**
 * Catalyst Enterprise Login Page
 * A pixel-perfect, enterprise-grade login with split-screen layout
 */

import { useNavigate } from 'react-router-dom';
import { LoginHeroPanel } from './LoginHeroPanel';
import { LoginFormPanel } from './LoginFormPanel';
import { useLoginState } from './useLoginState';

interface CatalystLoginPageProps {
  onSignIn: (email: string, password: string) => Promise<{ error?: Error | null }>;
  onSignUp: (email: string, password: string, fullName: string) => Promise<{ error?: Error | null }>;
  loading?: boolean;
  error?: string | null;
}

export function CatalystLoginPage({ 
  onSignIn, 
  onSignUp, 
  loading = false,
  error 
}: CatalystLoginPageProps) {
  const navigate = useNavigate();
  const {
    userType,
    authType,
    handleUserTypeChange,
    handleAuthTypeChange,
  } = useLoginState();

  const handleExternalSubmit = () => {
    navigate('/submit-demand-request');
  };

  return (
    <div 
      className="min-h-screen grid lg:grid-cols-[1.1fr_0.9fr]"
      style={{ fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif" }}
    >
      {/* Skip Link for Accessibility */}
      <a
        href="#login-form"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg"
      >
        Skip to login form
      </a>

      {/* Left Panel - Hero (hidden on mobile) */}
      <div className="hidden lg:block">
        <LoginHeroPanel />
      </div>

      {/* Right Panel - Form */}
      <div id="login-form">
        <LoginFormPanel
          userType={userType}
          authType={authType}
          onUserTypeChange={handleUserTypeChange}
          onAuthTypeChange={handleAuthTypeChange}
          onSignIn={onSignIn}
          onSignUp={onSignUp}
          onExternalSubmit={handleExternalSubmit}
          loading={loading}
          error={error}
        />
      </div>
    </div>
  );
}

// Export all components for flexibility
export * from './constants';
export * from './useLoginState';
export { LoginHeroPanel } from './LoginHeroPanel';
export { LoginFormPanel } from './LoginFormPanel';
