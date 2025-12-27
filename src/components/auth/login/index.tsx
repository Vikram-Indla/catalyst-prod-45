/**
 * Catalyst Enterprise Login Page
 * A pixel-perfect, enterprise-grade login with split-screen layout
 */

import { useNavigate } from 'react-router-dom';
import { LoginHeroPanel } from './LoginHeroPanel';
import { LoginFormPanel } from './LoginFormPanel';
import { useLoginState } from './useLoginState';
import './login-styles.css';

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
    <>
      {/* Skip Link for Accessibility */}
      <a href="#main-form" className="login-skip-link">Skip to login form</a>

      <div className="login-container">
        {/* Left Panel - Hero (hidden on mobile via CSS) */}
        <LoginHeroPanel />

        {/* Right Panel - Form */}
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
    </>
  );
}

// Export all components for flexibility
export * from './constants';
export * from './useLoginState';
export { LoginHeroPanel } from './LoginHeroPanel';
export { LoginFormPanel } from './LoginFormPanel';
