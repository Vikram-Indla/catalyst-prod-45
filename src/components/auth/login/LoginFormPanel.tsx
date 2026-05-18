/**
 * Login Form Card — ADS-compliant sign-in / request-access card.
 * Enterprise login: password + email-code (OTP) as co-equal options.
 * OTP delivered via send-login-otp edge function → Resend → noreply@ksa-catalyst.com
 */

import { useState, useEffect, useRef, FormEvent } from 'react';
import Textfield from '@atlaskit/textfield';
import Button from '@atlaskit/button';
import SectionMessage from '@atlaskit/section-message';
import { UserType } from './constants';
import type { Lang } from './translations';
import { t } from './translations';
import './login-styles.css';

const REMEMBERED_EMAIL_KEY = 'catalyst_remembered_email';

export interface ExternalAccessRequest {
  name: string;
  email: string;
}

interface LoginFormPanelProps {
  userType: UserType;
  onUserTypeChange: (type: UserType) => void;
  onSignIn: (email: string, password: string) => Promise<{ error?: Error | null }>;
  onSignUp: (email: string, password: string, fullName: string) => Promise<{ error?: Error | null }>;
  onExternalSubmit: (data: ExternalAccessRequest) => Promise<void>;
  onSendOtp: (email: string) => Promise<{ error?: any }>;
  onVerifyOtp: (email: string, token: string) => Promise<{ error?: any }>;
  onForgotPassword: (email: string) => Promise<{ error?: any }>;
  loading: boolean;
  error?: string | null;
  lang: Lang;
}

const EyeIcon = ({ off }: { off?: boolean }) => off ? (
  <svg width="16" height="16" fill="none" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M2 2l12 12M6.4 6.4a2 2 0 002.8 2.8M3.5 5C2.2 6.2 1.5 8 1.5 8s2.5 5 6.5 5c1.1 0 2.1-.3 3-.8M8 3c3.7 0 6.5 5 6.5 5-.5 1.1-1.3 2.1-2.2 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
) : (
  <svg width="16" height="16" fill="none" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M1.5 8s2.5-5 6.5-5 6.5 5 6.5 5-2.5 5-6.5 5-6.5-5-6.5-5z" stroke="currentColor" strokeWidth="1.3"/>
    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
  </svg>
);

const MailIcon = () => (
  <svg width="15" height="15" fill="none" viewBox="0 0 16 16" aria-hidden="true" style={{ flexShrink: 0 }}>
    <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M1.5 5.5l6.5 4 6.5-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

const ShieldIcon = () => (
  <svg width="14" height="14" fill="none" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 1.5l5 1.75V7c0 3-2 5-5 6.5C5 12 3 10 3 7V3.25z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    <path d="M5.5 8l1.75 1.75L10.5 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ── "or" divider ──────────────────────────────────────────────────────────────
function OrDivider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--ds-border, var(--cp-lozenge-grey-bg, #DFE1E6))' }} />
      <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #8993A4)', fontWeight: 500, userSelect: 'none' }}>or</span>
      <div style={{ flex: 1, height: 1, background: 'var(--ds-border, var(--cp-lozenge-grey-bg, #DFE1E6))' }} />
    </div>
  );
}

export function LoginFormPanel({
  userType,
  onUserTypeChange,
  onSignIn,
  onExternalSubmit,
  onSendOtp,
  onVerifyOtp,
  onForgotPassword,
  loading,
  error,
  lang,
}: LoginFormPanelProps) {
  const [signinEmail, setSigninEmail] = useState('');
  const [signinPassword, setSigninPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const [externalName, setExternalName] = useState('');
  const [externalEmail, setExternalEmail] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // OTP mode state
  const [otpMode, setOtpMode] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Forgot password mode
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Always pre-fill email — Jira always remembers your email
  useEffect(() => {
    const saved = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (saved) setSigninEmail(saved);
  }, []);

  useEffect(() => {
    setSubmitSuccess(false);
    setOtpMode(false); setOtpSent(false); setOtpCode(''); setOtpError(null);
    setForgotMode(false); setForgotSent(false); setForgotError(null);
  }, [userType]);

  const isSignIn = userType === 'existing';
  const isExternal = userType === 'external';
  const busy = isSubmitting || loading;

  // ── password sign-in ──────────────────────────────────────────────────────
  const handleSignInSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const result = await onSignIn(signinEmail, signinPassword);
    if (!result.error) {
      localStorage.setItem(REMEMBERED_EMAIL_KEY, signinEmail);
      setSubmitSuccess(true);
    }
    setIsSubmitting(false);
  };

  // ── forgot password ────────────────────────────────────────────────────────
  const handleForgotSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setIsSubmitting(true);
    const result = await onForgotPassword(signinEmail);
    setIsSubmitting(false);
    if (result.error) {
      setForgotError('Could not send reset link. Check your email and try again.');
    } else {
      setForgotSent(true);
    }
  };

  // ── OTP — send code ───────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!signinEmail.trim()) return;
    setOtpError(null);
    setIsSubmitting(true);
    const result = await onSendOtp(signinEmail);
    setIsSubmitting(false);
    if (result.error) {
      setOtpError('We couldn\'t send a code to that address. Check your email and try again.');
    } else {
      setOtpSent(true);
      setTimeout(() => otpInputRef.current?.focus(), 80);
    }
  };

  // ── OTP — verify code ─────────────────────────────────────────────────────
  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setOtpError(null);
    setIsSubmitting(true);
    const result = await onVerifyOtp(signinEmail, otpCode.trim());
    setIsSubmitting(false);
    if (result.error) {
      setOtpError('Incorrect or expired code — please try again.');
      setOtpCode('');
      otpInputRef.current?.focus();
    }
  };

  // ── reset OTP back to password mode ──────────────────────────────────────
  const handleBackToPassword = () => {
    setOtpMode(false);
    setOtpSent(false);
    setOtpCode('');
    setOtpError(null);
  };

  const handleExternalSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onExternalSubmit({ name: externalName, email: externalEmail });
    setSubmitSuccess(true);
  };

  const pwdToggle = (
    <button
      type="button"
      className="clmp-pwd-toggle"
      onClick={() => setShowPwd(v => !v)}
      aria-label={t(lang, showPwd ? 'form.pwd.hide' : 'form.pwd.show')}
      tabIndex={0}
    >
      <EyeIcon off={showPwd} />
    </button>
  );

  return (
    <div className="clmp-login-card" id="main-form">

      {/* ── Tab group — Sign In | Request Access ── */}
      <div className="clmp-auth-toggle" role="tablist">
        <button
          role="tab"
          aria-selected={isSignIn}
          className={`clmp-auth-tab${isSignIn ? ' active' : ''}`}
          onClick={() => onUserTypeChange('existing')}
          type="button"
        >
          {t(lang, 'form.tab.signin')}
        </button>
        <button
          role="tab"
          aria-selected={isExternal}
          className={`clmp-auth-tab${isExternal ? ' active' : ''}`}
          onClick={() => onUserTypeChange('external')}
          type="button"
        >
          {t(lang, 'form.tab.request')}
        </button>
      </div>

      {/* ── Title block ── */}
      <div className="clmp-card-header">
        <h2 className="clmp-card-title">
          {isSignIn
            ? forgotMode
              ? (forgotSent ? 'Check your email' : 'Reset your password')
              : otpMode
                ? (otpSent ? 'Check your email' : 'Sign in with a code')
                : t(lang, 'form.signin.title')
            : t(lang, 'form.external.title')}
        </h2>
        <p className="clmp-card-sub">
          {isSignIn
            ? forgotMode
              ? (forgotSent
                  ? `We sent a password reset link to ${signinEmail}`
                  : 'Enter your email and we\'ll send you a reset link')
              : otpMode
                ? (otpSent
                    ? `We sent a sign-in code to ${signinEmail}`
                    : 'Enter your work email and we\'ll send a one-time code')
                : t(lang, 'form.signin.sub')
            : t(lang, 'form.external.sub')}
        </p>
      </div>

      {/* ── Error banner ── */}
      {error && !otpMode && (
        <SectionMessage appearance="error">
          <p>{error}</p>
        </SectionMessage>
      )}

      {/* ══════════════════════════════════════════════════
          SIGN IN — PASSWORD MODE (default)
      ══════════════════════════════════════════════════ */}
      {isSignIn && !otpMode && !forgotMode && (
        <form onSubmit={handleSignInSubmit} className="clmp-form" noValidate>

          <div className="clmp-field">
            <label htmlFor="signin-email" className="clmp-label">
              {t(lang, 'form.label.email')}
            </label>
            <Textfield
              id="signin-email"
              name="email"
              type="email"
              placeholder={t(lang, 'form.placeholder.email')}
              value={signinEmail}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSigninEmail(e.currentTarget.value)}
              autoComplete="email"
              dir="ltr"
              isRequired
            />
          </div>

          <div className="clmp-field">
            <div className="clmp-password-row">
              <label htmlFor="signin-password" className="clmp-label">
                {t(lang, 'form.label.password')}
              </label>
              <button
                type="button"
                className="clmp-forgot"
                onClick={() => { setForgotMode(true); setForgotSent(false); setForgotError(null); }}
              >
                {t(lang, 'form.forgot')}
              </button>
            </div>
            <Textfield
              id="signin-password"
              name="password"
              type={showPwd ? 'text' : 'password'}
              placeholder={t(lang, 'form.placeholder.password')}
              value={signinPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSigninPassword(e.currentTarget.value)}
              autoComplete="current-password"
              dir="ltr"
              isRequired
              elemAfterInput={pwdToggle}
            />
          </div>

          <Button
            type="submit"
            appearance="primary"
            isLoading={busy}
            isDisabled={busy}
            shouldFitContainer
          >
            {t(lang, 'form.btn.signin')}
          </Button>

          <OrDivider />

          <button
            type="button"
            className="clmp-otp-alt-btn"
            onClick={() => { setOtpMode(true); }}
            disabled={busy}
          >
            <MailIcon />
            Send me a sign-in code
          </button>

        </form>
      )}

      {/* ══════════════════════════════════════════════════
          FORGOT PASSWORD
      ══════════════════════════════════════════════════ */}
      {isSignIn && forgotMode && (
        <div className="clmp-form">
          {forgotSent ? (
            <SectionMessage appearance="success" title="Reset link sent">
              <p>Check your inbox at <strong>{signinEmail}</strong> for a password reset link.</p>
            </SectionMessage>
          ) : (
            <form onSubmit={handleForgotSubmit} className="clmp-otp-verify-form" noValidate>
              <div className="clmp-field">
                <label htmlFor="forgot-email" className="clmp-label">
                  {t(lang, 'form.label.email')}
                </label>
                <Textfield
                  id="forgot-email"
                  name="email"
                  type="email"
                  placeholder={t(lang, 'form.placeholder.email')}
                  value={signinEmail}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSigninEmail(e.currentTarget.value)}
                  autoComplete="email"
                  dir="ltr"
                  isRequired
                  autoFocus
                />
              </div>
              {forgotError && (
                <SectionMessage appearance="error"><p>{forgotError}</p></SectionMessage>
              )}
              <Button
                type="submit"
                appearance="primary"
                isLoading={busy}
                isDisabled={busy || !signinEmail.trim()}
                shouldFitContainer
              >
                Send reset link
              </Button>
            </form>
          )}
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <button
              type="button"
              className="clmp-otp-text-btn"
              onClick={() => { setForgotMode(false); setForgotSent(false); setForgotError(null); }}
            >
              Back to sign in
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          SIGN IN — OTP MODE
          Sub-state A: email input + "Send code" button
          Sub-state B: OTP code input + verify
      ══════════════════════════════════════════════════ */}
      {isSignIn && otpMode && !forgotMode && (
        <div className="clmp-form">

          {/* Sub-state A — email + send */}
          {!otpSent && (
            <>
              <div className="clmp-field">
                <label htmlFor="otp-email" className="clmp-label">
                  {t(lang, 'form.label.email')}
                </label>
                <Textfield
                  id="otp-email"
                  name="email"
                  type="email"
                  placeholder={t(lang, 'form.placeholder.email')}
                  value={signinEmail}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSigninEmail(e.currentTarget.value)}
                  autoComplete="email"
                  dir="ltr"
                  isRequired
                  autoFocus
                />
              </div>

              {otpError && (
                <SectionMessage appearance="error"><p>{otpError}</p></SectionMessage>
              )}

              <Button
                type="button"
                appearance="primary"
                isLoading={busy}
                isDisabled={busy || !signinEmail.trim()}
                shouldFitContainer
                onClick={handleSendOtp}
              >
                Send sign-in code
              </Button>

              <OrDivider />

              <button
                type="button"
                className="clmp-otp-alt-btn"
                onClick={handleBackToPassword}
              >
                Sign in with password instead
              </button>
            </>
          )}

          {/* Sub-state B — code input + verify */}
          {otpSent && (
            <form onSubmit={handleVerifyOtp} className="clmp-otp-verify-form">

              <div className="clmp-field">
                <label htmlFor="otp-code" className="clmp-label">
                  Sign-in code
                </label>
                <input
                  ref={otpInputRef}
                  id="otp-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  placeholder="000000"
                  value={otpCode}
                  autoComplete="one-time-code"
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="clmp-otp-input"
                />
              </div>

              {otpError && (
                <SectionMessage appearance="error"><p>{otpError}</p></SectionMessage>
              )}

              <Button
                type="submit"
                appearance="primary"
                isLoading={busy}
                isDisabled={busy || otpCode.length < 6 || otpCode.length > 8}
                shouldFitContainer
              >
                Sign in
              </Button>

              <div className="clmp-otp-footer-row">
                <button
                  type="button"
                  className="clmp-otp-text-btn"
                  onClick={handleSendOtp}
                  disabled={busy}
                >
                  Resend code
                </button>
                <button
                  type="button"
                  className="clmp-otp-text-btn"
                  onClick={handleBackToPassword}
                >
                  Back to password
                </button>
              </div>

            </form>
          )}

        </div>
      )}

      {/* ── External request ── */}
      {isExternal && !submitSuccess && (
        <form onSubmit={handleExternalSubmit} className="clmp-form" noValidate>
          <div className="clmp-field">
            <label htmlFor="ext-name" className="clmp-label">{t(lang, 'form.label.name')}</label>
            <Textfield id="ext-name" name="name" type="text" placeholder={t(lang, 'form.placeholder.name.ext')}
              value={externalName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExternalName(e.currentTarget.value)} isRequired />
          </div>
          <div className="clmp-field">
            <label htmlFor="ext-email" className="clmp-label">{t(lang, 'form.label.email')}</label>
            <Textfield id="ext-email" name="email" type="email" placeholder={t(lang, 'form.placeholder.email.org')}
              value={externalEmail} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExternalEmail(e.currentTarget.value)} dir="ltr" isRequired />
          </div>
          <Button type="submit" appearance="primary" shouldFitContainer>{t(lang, 'form.btn.submit')}</Button>
        </form>
      )}

      {/* ── External success ── */}
      {isExternal && submitSuccess && (
        <SectionMessage appearance="success" title={t(lang, 'form.success.external.title')}>
          <p>{t(lang, 'form.success.external.desc')}</p>
        </SectionMessage>
      )}

      {/* ── Footer badges ── */}
      <div className="clmp-card-foot">
        <span className="clmp-foot-badge">
          <span className="clmp-jira-dot">J</span>
          {t(lang, 'form.jira.badge')}
        </span>
        <span className="clmp-foot-badge">
          <ShieldIcon />
          {t(lang, 'form.security.badge')}
        </span>
      </div>

    </div>
  );
}
