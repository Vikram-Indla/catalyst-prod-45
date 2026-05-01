/**
 * Login Form Panel V10 - Institutional
 * Light form panel with toggles, forms, and JIRA integration badge
 */

import { useState, useEffect, FormEvent } from 'react';
import { UserType, AuthType, welcomeContent } from './constants';
import './login-styles.css';

const REMEMBERED_EMAIL_KEY = 'catalyst_remembered_email';

interface LoginFormPanelProps {
  userType: UserType;
  authType: AuthType;
  onUserTypeChange: (type: UserType) => void;
  onAuthTypeChange: (type: AuthType) => void;
  onSignIn: (email: string, password: string, rememberMe: boolean) => Promise<{ error?: Error | null }>;
  onSignUp: (email: string, password: string, fullName: string) => Promise<{ error?: Error | null }>;
  onExternalSubmit: () => void;
  loading: boolean;
  error?: string | null;
}

// Icon components
const Icons = {
  mail: (
    <svg width="17" height="17" fill="none" viewBox="0 0 17 17" aria-hidden="true">
      <rect x="1.5" y="3" width="14" height="10.5" rx="2" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M1.5 5l7 4.5 7-4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  lock: (
    <svg width="17" height="17" fill="none" viewBox="0 0 17 17" aria-hidden="true">
      <rect x="3" y="7.5" width="11" height="7.5" rx="2" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M5 7.5V5a3.5 3.5 0 017 0v2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  user: (
    <svg width="17" height="17" fill="none" viewBox="0 0 17 17" aria-hidden="true">
      <circle cx="8.5" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M2.5 15.5c0-2.76 2.69-5 6-5s6 2.24 6 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  layers: (
    <svg width="17" height="17" fill="none" viewBox="0 0 17 17" aria-hidden="true">
      <path d="M8.5 2l7 3.5-7 3.5-7-3.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      <path d="M1.5 9l7 3.5L15.5 9M1.5 12.5l7 3.5 7-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  eye: (
    <svg width="17" height="17" fill="none" viewBox="0 0 17 17" aria-hidden="true">
      <path d="M1.5 8.5s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="8.5" cy="8.5" r="2.25" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  ),
  eyeOff: (
    <svg width="17" height="17" fill="none" viewBox="0 0 17 17" aria-hidden="true">
      <path d="M2 2l13 13M6.7 6.7a2.25 2.25 0 003.1 3.1M3.5 5.2C2.2 6.5 1.5 8.5 1.5 8.5s2.5 5 7 5c1.2 0 2.3-.35 3.3-.9M8.5 3.5c4.5 0 7 5 7 5s-.6 1.2-1.7 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  shield: (
    <svg width="15" height="15" fill="none" viewBox="0 0 15 15" aria-hidden="true">
      <path d="M7.5 1.25l5 1.75v3.75c0 3.25-2.25 5.25-5 6.5-2.75-1.25-5-3.25-5-6.5V3z" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M5 7.5l1.75 1.75L10 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

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
  // Sign In state
  const [signinEmail, setSigninEmail] = useState('');
  const [signinPassword, setSigninPassword] = useState('');
  const [showSigninPassword, setShowSigninPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // Sign Up state
  const [signupFullName, setSignupFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // External request state
  const [externalName, setExternalName] = useState('');
  const [externalEmail, setExternalEmail] = useState('');
  const [externalOrg, setExternalOrg] = useState('');
  const [externalDesc, setExternalDesc] = useState('');
  
  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Load remembered email on mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (rememberedEmail) {
      setSigninEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  // Reset submit success when changing forms
  useEffect(() => {
    setSubmitSuccess(false);
  }, [userType, authType]);

  // Visibility rules
  const showAuthToggle = userType === 'existing';
  const showJiraSection = userType === 'existing';
  const showSignIn = userType === 'existing' && authType === 'signin';
  const showSignUp = userType === 'existing' && authType === 'signup';
  const showExternal = userType === 'external';

  // Get welcome content
  const welcome = userType === 'external' 
    ? welcomeContent.external 
    : welcomeContent.existing[authType];

  const handleSignInSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitSuccess(false);
    
    const result = await onSignIn(signinEmail, signinPassword, rememberMe);
    
    if (!result.error) {
      if (rememberMe) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, signinEmail);
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }
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

  const handleExternalSubmit = (e: FormEvent) => {
    e.preventDefault();
    onExternalSubmit();
  };

  return (
    <main className="form-panel-v10" id="main-form">
      <div className="form-wrapper-v10">
        {/* Welcome Section */}
        <div className="welcome-section-v10" key={`${userType}-${authType}`}>
          <h2 className="welcome-title-v10">{welcome.title}</h2>
          <p className="welcome-subtitle-v10">{welcome.subtitle}</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message-v10" role="alert">
            {error}
          </div>
        )}

        {/* Sign In Form */}
        {showSignIn && (
          <form onSubmit={handleSignInSubmit} className="form-v10">
            <div className="input-group-v10">
              <label htmlFor="signin-email" className="input-label-v10">Email Address</label>
              <div className="input-wrapper-v10">
                <span className="input-icon-v10">{Icons.mail}</span>
                <input
                  type="email"
                  id="signin-email"
                  className="input-field-v10"
                  placeholder="name@company.com"
                  value={signinEmail}
                  onChange={(e) => setSigninEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="input-group-v10">
              <label htmlFor="signin-password" className="input-label-v10">Password</label>
              <div className="input-wrapper-v10">
                <span className="input-icon-v10">{Icons.lock}</span>
                <input
                  type={showSigninPassword ? 'text' : 'password'}
                  id="signin-password"
                  className="input-field-v10 input-with-action"
                  placeholder="Enter your password"
                  value={signinPassword}
                  onChange={(e) => setSigninPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="input-action-v10"
                  onClick={() => setShowSigninPassword(!showSigninPassword)}
                  aria-label={showSigninPassword ? 'Hide password' : 'Show password'}
                >
                  {showSigninPassword ? Icons.eyeOff : Icons.eye}
                </button>
              </div>
            </div>

            <div className="form-row-v10">
              <label className="checkbox-wrapper-v10">
                <div className={`checkbox-box-v10 ${rememberMe ? 'checked' : ''}`}>
                  {rememberMe && (
                    <svg width="10" height="10" fill="none" viewBox="0 0 10 10" aria-hidden="true">
                      <path d="M2 5l2 2 4-4" stroke="var(--ds-surface, #fff)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="sr-only"
                />
                <span className="checkbox-label-v10">Remember me</span>
              </label>
              <button type="button" className="forgot-link-v10">
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              className="submit-btn-v10"
              disabled={isSubmitting || loading}
            >
              {isSubmitting || loading ? (
                <span className="btn-loading">
                  <span className="spinner-v10" />
                  Processing...
                </span>
              ) : 'Sign In'}
            </button>
          </form>
        )}

        {/* Sign Up Form */}
        {showSignUp && !submitSuccess && (
          <form onSubmit={handleSignUpSubmit} className="form-v10">
            <div className="input-group-v10">
              <label htmlFor="signup-name" className="input-label-v10">Full Name</label>
              <div className="input-wrapper-v10">
                <span className="input-icon-v10">{Icons.user}</span>
                <input
                  type="text"
                  id="signup-name"
                  className="input-field-v10"
                  placeholder="Enter your full name"
                  value={signupFullName}
                  onChange={(e) => setSignupFullName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
            </div>

            <div className="input-group-v10">
              <label htmlFor="signup-email" className="input-label-v10">Email Address</label>
              <div className="input-wrapper-v10">
                <span className="input-icon-v10">{Icons.mail}</span>
                <input
                  type="email"
                  id="signup-email"
                  className="input-field-v10"
                  placeholder="name@company.com"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="input-group-v10">
              <label htmlFor="signup-password" className="input-label-v10">Password</label>
              <div className="input-wrapper-v10">
                <span className="input-icon-v10">{Icons.lock}</span>
                <input
                  type={showSignupPassword ? 'text' : 'password'}
                  id="signup-password"
                  className="input-field-v10 input-with-action"
                  placeholder="Create a password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="input-action-v10"
                  onClick={() => setShowSignupPassword(!showSignupPassword)}
                  aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                >
                  {showSignupPassword ? Icons.eyeOff : Icons.eye}
                </button>
              </div>
            </div>

            <div className="input-group-v10">
              <label htmlFor="signup-confirm" className="input-label-v10">Confirm Password</label>
              <div className="input-wrapper-v10">
                <span className="input-icon-v10">{Icons.lock}</span>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="signup-confirm"
                  className="input-field-v10 input-with-action"
                  placeholder="Confirm your password"
                  value={signupConfirmPassword}
                  onChange={(e) => setSignupConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="input-action-v10"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? Icons.eyeOff : Icons.eye}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="submit-btn-v10"
              disabled={isSubmitting || loading}
            >
              {isSubmitting || loading ? (
                <span className="btn-loading">
                  <span className="spinner-v10" />
                  Processing...
                </span>
              ) : 'Create Account'}
            </button>
          </form>
        )}

        {/* Sign Up Success */}
        {showSignUp && submitSuccess && (
          <div className="success-card-v10">
            <div className="success-icon-wrap">
              {Icons.shield}
            </div>
            <h4 className="success-title">Registration Submitted</h4>
            <p className="success-desc">Your account is pending admin approval. You'll receive an email once approved.</p>
          </div>
        )}

        {/* External Form */}
        {showExternal && !submitSuccess && (
          <form onSubmit={handleExternalSubmit} className="form-v10">
            <div className="input-group-v10">
              <label htmlFor="external-name" className="input-label-v10">Full Name</label>
              <div className="input-wrapper-v10">
                <span className="input-icon-v10">{Icons.user}</span>
                <input
                  type="text"
                  id="external-name"
                  className="input-field-v10"
                  placeholder="Your full name"
                  value={externalName}
                  onChange={(e) => setExternalName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="input-group-v10">
              <label htmlFor="external-email" className="input-label-v10">Email Address</label>
              <div className="input-wrapper-v10">
                <span className="input-icon-v10">{Icons.mail}</span>
                <input
                  type="email"
                  id="external-email"
                  className="input-field-v10"
                  placeholder="name@organization.com"
                  value={externalEmail}
                  onChange={(e) => setExternalEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="input-group-v10">
              <label htmlFor="external-org" className="input-label-v10">Organization</label>
              <div className="input-wrapper-v10">
                <span className="input-icon-v10">{Icons.layers}</span>
                <input
                  type="text"
                  id="external-org"
                  className="input-field-v10"
                  placeholder="Your organization name"
                  value={externalOrg}
                  onChange={(e) => setExternalOrg(e.target.value)}
                />
              </div>
            </div>

            <div className="input-group-v10">
              <label htmlFor="external-desc" className="input-label-v10">Description</label>
              <textarea
                id="external-desc"
                className="textarea-field-v10"
                placeholder="Briefly describe your request..."
                value={externalDesc}
                onChange={(e) => setExternalDesc(e.target.value)}
                rows={3}
              />
            </div>

            <button type="submit" className="submit-btn-v10">
              Submit Request
            </button>
          </form>
        )}

        {/* External Success */}
        {showExternal && submitSuccess && (
          <div className="success-card-v10">
            <div className="success-icon-wrap">
              {Icons.shield}
            </div>
            <h4 className="success-title">Request Submitted</h4>
            <p className="success-desc">Your demand request has been logged. We'll respond within 2 business days.</p>
          </div>
        )}

        {/* Footer Section */}
        <div className="footer-section-v10">
          {/* JIRA Section - Only for Existing User */}
          {showJiraSection && (
            <div className="jira-badge-v10">
              <span className="jira-icon-v10">J</span>
              <span className="jira-text-v10">Powered with JIRA Integration</span>
            </div>
          )}

          {/* Security Badge */}
          <div className="security-badge-v10">
            {Icons.shield}
            <span className="security-text-v10">Enterprise Secured</span>
          </div>
        </div>
      </div>
    </main>
  );
}
