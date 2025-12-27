/**
 * Login Form Panel
 * Right panel with form, toggles, and all interactive elements
 */

import { useState, FormEvent } from 'react';
import { UserType, AuthType, welcomeContent } from './constants';
import './login-styles.css';

interface LoginFormPanelProps {
  userType: UserType;
  authType: AuthType;
  onUserTypeChange: (type: UserType) => void;
  onAuthTypeChange: (type: AuthType) => void;
  onSignIn: (email: string, password: string) => Promise<{ error?: Error | null }>;
  onSignUp: (email: string, password: string, fullName: string) => Promise<{ error?: Error | null }>;
  onExternalSubmit: () => void;
  loading: boolean;
  error?: string | null;
}

export function LoginFormPanel({
  userType,
  authType,
  onUserTypeChange,
  onAuthTypeChange,
  onSignIn,
  onSignUp,
  onExternalSubmit,
  loading,
  error,
}: LoginFormPanelProps) {
  const [signinEmail, setSigninEmail] = useState('');
  const [signinPassword, setSigninPassword] = useState('');
  const [signupFullName, setSignupFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showSigninPassword, setShowSigninPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const showAuthToggle = userType === 'existing';
  const showJiraSection = userType === 'existing';

  // Get welcome content
  const getWelcome = () => {
    if (userType === 'external') {
      return welcomeContent.external;
    }
    return welcomeContent.existing[authType];
  };
  const welcome = getWelcome();

  const handleSignInSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitSuccess(false);
    
    const result = await onSignIn(signinEmail, signinPassword);
    
    if (!result.error) {
      setSubmitSuccess(true);
    }
    setIsSubmitting(false);
  };

  const handleSignUpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (signupPassword !== signupConfirmPassword) {
      return;
    }
    setIsSubmitting(true);
    setSubmitSuccess(false);
    
    const result = await onSignUp(signupEmail, signupPassword, signupFullName);
    
    if (!result.error) {
      setSubmitSuccess(true);
    }
    setIsSubmitting(false);
  };

  const EyeIcon = ({ open }: { open: boolean }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      {open ? (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </>
      ) : (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </>
      )}
    </svg>
  );

  return (
    <main className="form-panel" id="main-form">
      <div className="form-ambient form-ambient-1" aria-hidden="true" />
      <div className="form-ambient form-ambient-2" aria-hidden="true" />

      <div className="form-wrapper">
        {/* Logo Section */}
        <div className="logo-section">
          <div className="logo">
            <span className="logo-text">Cata<span className="gold">lyst</span></span>
            <span className="logo-tm">™</span>
            <span className="beta-tag">Beta</span>
          </div>
          <div className="tagline">Enterprise Portfolio Management</div>
        </div>

        {/* User Type Toggle */}
        <div className="user-type-toggle" role="tablist" aria-label="User type selection">
          <div className={`user-type-slider ${userType === 'external' ? 'external' : ''}`} aria-hidden="true" />
          <button
            className={`user-type-btn ${userType === 'existing' ? 'active' : ''}`}
            onClick={() => onUserTypeChange('existing')}
            role="tab"
            aria-selected={userType === 'existing'}
            aria-controls="existing-panel"
          >
            Existing User
          </button>
          <button
            className={`user-type-btn ${userType === 'external' ? 'active' : ''}`}
            onClick={() => onUserTypeChange('external')}
            role="tab"
            aria-selected={userType === 'external'}
            aria-controls="external-panel"
          >
            External User
          </button>
        </div>

        {/* Auth Toggle - Only for Existing User */}
        {showAuthToggle && (
          <div className="auth-toggle" role="tablist" aria-label="Authentication type">
            <button
              className={`auth-btn ${authType === 'signin' ? 'active' : ''}`}
              onClick={() => onAuthTypeChange('signin')}
              role="tab"
              aria-selected={authType === 'signin'}
            >
              Sign In
            </button>
            <button
              className={`auth-btn ${authType === 'signup' ? 'active' : ''}`}
              onClick={() => onAuthTypeChange('signup')}
              role="tab"
              aria-selected={authType === 'signup'}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Welcome Section */}
        <div className="welcome-section">
          <h1 className="welcome-title">{welcome.title}</h1>
          <p className="welcome-subtitle">{welcome.subtitle}</p>
        </div>

        {/* Form Container */}
        <div className="form-container">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Sign In Form */}
          <form 
            className={`login-form ${userType === 'existing' && authType === 'signin' ? 'active' : ''}`}
            onSubmit={handleSignInSubmit}
            aria-labelledby="welcomeTitle"
          >
            <div className="form-group">
              <label className="form-label" htmlFor="signinEmail">Email Address</label>
              <div className="input-wrapper">
                <input
                  type="email"
                  id="signinEmail"
                  className="form-input"
                  placeholder="name@company.com"
                  autoComplete="email"
                  required
                  aria-required="true"
                  value={signinEmail}
                  onChange={(e) => setSigninEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="signinPassword">Password</label>
              <div className="input-wrapper">
                <input
                  type={showSigninPassword ? 'text' : 'password'}
                  id="signinPassword"
                  className="form-input"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  aria-required="true"
                  value={signinPassword}
                  onChange={(e) => setSigninPassword(e.target.value)}
                  style={{ paddingRight: '3rem' }}
                />
                <button
                  type="button"
                  className="input-action"
                  onClick={() => setShowSigninPassword(!showSigninPassword)}
                  aria-label="Toggle password visibility"
                >
                  <EyeIcon open={showSigninPassword} />
                </button>
              </div>
            </div>
            <div className="form-row">
              <label className="checkbox-wrapper">
                <input
                  type="checkbox"
                  className="checkbox-input"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="checkbox-label">Remember me</span>
              </label>
              <a href="#" className="forgot-link">Forgot password?</a>
            </div>
            <button 
              type="submit" 
              className={`submit-btn ${submitSuccess ? 'success' : ''}`}
              disabled={isSubmitting || loading}
              aria-busy={isSubmitting || loading}
            >
              {isSubmitting || loading ? 'Processing...' : submitSuccess ? 'Success!' : 'Sign In'}
            </button>
          </form>

          {/* Sign Up Form */}
          <form 
            className={`signup-form ${userType === 'existing' && authType === 'signup' ? 'active' : ''}`}
            onSubmit={handleSignUpSubmit}
            aria-labelledby="welcomeTitle"
          >
            <div className="form-group">
              <label className="form-label" htmlFor="fullName">Full Name</label>
              <input
                type="text"
                id="fullName"
                className="form-input"
                placeholder="John Doe"
                required
                aria-required="true"
                value={signupFullName}
                onChange={(e) => setSignupFullName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="signupEmail">Email Address</label>
              <input
                type="email"
                id="signupEmail"
                className="form-input"
                placeholder="name@company.com"
                autoComplete="email"
                required
                aria-required="true"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="signupPassword">Password</label>
              <div className="input-wrapper">
                <input
                  type={showSignupPassword ? 'text' : 'password'}
                  id="signupPassword"
                  className="form-input"
                  placeholder="Create a password"
                  required
                  aria-required="true"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  style={{ paddingRight: '3rem' }}
                />
                <button
                  type="button"
                  className="input-action"
                  onClick={() => setShowSignupPassword(!showSignupPassword)}
                  aria-label="Toggle password visibility"
                >
                  <EyeIcon open={showSignupPassword} />
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
              <div className="input-wrapper">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  className="form-input"
                  placeholder="Confirm your password"
                  required
                  aria-required="true"
                  value={signupConfirmPassword}
                  onChange={(e) => setSignupConfirmPassword(e.target.value)}
                  style={{ paddingRight: '3rem' }}
                />
                <button
                  type="button"
                  className="input-action"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label="Toggle password visibility"
                >
                  <EyeIcon open={showConfirmPassword} />
                </button>
              </div>
            </div>
            <button 
              type="submit" 
              className={`submit-btn ${submitSuccess ? 'success' : ''}`}
              disabled={isSubmitting || loading}
              aria-busy={isSubmitting || loading}
            >
              {isSubmitting || loading ? 'Processing...' : submitSuccess ? 'Success!' : 'Create Account'}
            </button>
          </form>

          {/* External User Form */}
          <div 
            className={`external-form ${userType === 'external' ? 'active' : ''}`}
            role="tabpanel"
            aria-labelledby="welcomeTitle"
          >
            <div className="external-content">
              <div className="external-icon-wrap" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="12" y1="18" x2="12" y2="12"/>
                  <line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
              </div>
              <p className="external-text">
                No account needed. Submit your business demand request and our team will review it promptly.
              </p>
              <button className="external-btn" onClick={onExternalSubmit}>
                Log Demand Request
              </button>
              <p className="external-note">Ticket ID will be generated upon submission</p>
            </div>
          </div>
        </div>

        {/* JIRA Section - Only for Existing User */}
        {showJiraSection && (
          <div className="jira-section">
            <button className="jira-btn" type="button">
              <span className="jira-icon" aria-hidden="true">J</span>
              <span>Powered with JIRA Integration</span>
            </button>
          </div>
        )}

        {/* Security Badge */}
        <div className="security-section">
          <div className="security-badge">
            <svg className="security-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
            <span className="security-text">Enterprise Secured</span>
          </div>
        </div>
      </div>
    </main>
  );
}
