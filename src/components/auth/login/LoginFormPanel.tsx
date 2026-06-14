/**
 * Sign-in card — embedded in the portal hero (no Request Access tab).
 * Co-equal auth methods: password + email-code (OTP). Forgot-password inline.
 * Auth logic unchanged — Supabase via parent handlers.
 */

import { useState, useEffect, useRef, FormEvent } from 'react';
import Textfield from '@atlaskit/textfield';
import Button from '@atlaskit/button/new';
import SectionMessage from '@atlaskit/section-message';
import { UserType } from './constants';
import type { Lang } from './translations';
import { t } from './translations';
// ads-scanner:ignore-next-line
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

function CardMark() {
  return (
    <svg width="40" height="40" viewBox="0 0 80 80" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* ads-scanner:ignore-next-line — Caty brand gradient, no ADS token equivalent */}
        <linearGradient id="cg-login" x1="40" y1="4" x2="40" y2="76" gradientUnits="userSpaceOnUse">
          {/* ads-scanner:ignore-next-line */}
          <stop stopColor="#F79357" />
          {/* ads-scanner:ignore-next-line */}
          <stop offset=".5" stopColor="#F53F68" />
          {/* ads-scanner:ignore-next-line */}
          <stop offset=".78" stopColor="#B41572" />
          {/* ads-scanner:ignore-next-line */}
          <stop offset="1" stopColor="#CC1E9A" />
        </linearGradient>
      </defs>
      {/* Ears */}
      <path d="M20 30 L25 5 L42 22 Z" fill="url(#cg-login)" />
      <path d="M60 30 L55 5 L38 22 Z" fill="url(#cg-login)" />
      <path d="M25.5 11 L28 23 L35.5 19 Z" fill="#23222B" opacity="0.30" />
      <path d="M54.5 11 L52 23 L44.5 19 Z" fill="#23222B" opacity="0.30" />
      {/* Head circle */}
      <circle cx="40" cy="44" r="30" fill="url(#cg-login)" />
      {/* Whiskers + nose */}
      <g transform="translate(40 43) scale(0.235) translate(-348 -150)">
        <g stroke="#fff" strokeWidth="10" strokeLinecap="round" fill="none">
          <path d="M300 172 Q244 168 226 178" />
          <path d="M300 182 Q240 185 222 198" />
          <path d="M398 172 Q454 168 472 178" />
          <path d="M398 182 Q458 185 476 198" />
        </g>
        <path d="M340 178 L356 178 Q348 190 340 178 Z" fill="#fff" />
        <g fill="none" stroke="#fff" strokeWidth="14" strokeLinecap="round">
          <path d="M303 150 Q322 171 341 150" />
          <path d="M355 150 Q374 171 393 150" />
        </g>
      </g>
    </svg>
  );
}

const EyeIcon = ({ off }: { off?: boolean }) => off ? (
  <svg width="16" height="16" fill="none" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M2 2l12 12M6.4 6.4a2 2 0 002.8 2.8M3.5 5C2.2 6.2 1.5 8 1.5 8s2.5 5 6.5 5c1.1 0 2.1-.3 3-.8M8 3c3.7 0 6.5 5 6.5 5-.5 1.1-1.3 2.1-2.2 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
) : (
  <svg width="16" height="16" fill="none" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M1.5 8s2.5-5 6.5-5 6.5 5 6.5 5-2.5 5-6.5 5-6.5-5-6.5-5z" stroke="currentColor" strokeWidth="1.4"/>
    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/>
  </svg>
);

const MailIcon = () => (
  <svg width="15" height="15" fill="none" viewBox="0 0 16 16" aria-hidden="true" style={{ flexShrink: 0 }}>
    <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M1.5 5.5l6.5 4 6.5-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);

const ShieldIcon = () => (
  <svg width="14" height="14" fill="none" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 1.5l5 1.75V7c0 3-2 5-5 6.5C5 12 3 10 3 7V3.25z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    <path d="M5.5 8l1.75 1.75L10.5 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export function LoginFormPanel({
  onSignIn,
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // OTP mode
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

  // Update document.title per sub-state for browser history clarity
  useEffect(() => {
    const base = 'Catalyst';
    if (forgotMode) document.title = forgotSent ? `Check email · ${base}` : `Reset password · ${base}`;
    else if (otpMode) document.title = otpSent ? `Enter sign-in code · ${base}` : `Sign in with code · ${base}`;
    else document.title = `Sign in · ${base}`;
  }, [forgotMode, forgotSent, otpMode, otpSent]);

  const busy = isSubmitting || loading;

  const handleSignInSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const result = await onSignIn(signinEmail, signinPassword);
    if (!result.error) localStorage.setItem(REMEMBERED_EMAIL_KEY, signinEmail);
    setIsSubmitting(false);
  };

  const handleForgotSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setIsSubmitting(true);
    const result = await onForgotPassword(signinEmail);
    setIsSubmitting(false);
    if (result.error) setForgotError('Could not send reset link. Check your email and try again.');
    else setForgotSent(true);
  };

  const handleSendOtp = async () => {
    if (!signinEmail.trim()) return;
    setOtpError(null);
    setIsSubmitting(true);
    const result = await onSendOtp(signinEmail);
    setIsSubmitting(false);
    if (result.error) setOtpError('We couldn\'t send a code to that address. Check your email and try again.');
    else {
      setOtpSent(true);
      setTimeout(() => otpInputRef.current?.focus(), 80);
    }
  };

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

  const handleBackToPassword = () => {
    setOtpMode(false);
    setOtpSent(false);
    setOtpCode('');
    setOtpError(null);
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

  const title = forgotMode
    ? (forgotSent ? 'Check your email' : 'Reset your password')
    : otpMode
      ? (otpSent ? 'Check your email' : 'Sign in with a code')
      : t(lang, 'form.signin.title');
  const sub = forgotMode
    ? (forgotSent ? `We sent a password reset link to ${signinEmail}` : 'Enter your email and we\'ll send you a reset link')
    : otpMode
      ? (otpSent ? `We sent a sign-in code to ${signinEmail}` : 'Enter your work email and we\'ll send a one-time code')
      : t(lang, 'form.signin.sub');

  return (
    <div className="clmp-login-card" id="main-form">
      <div className="clmp-card-mark">
        <CardMark />
        <div>
          <h2 className="clmp-card-title">{title}</h2>
          <p className="clmp-card-sub">{sub}</p>
        </div>
      </div>

      {error && !otpMode && !forgotMode && (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '11px 14px', borderRadius: 8, marginBottom: 4,
            background: 'var(--ds-background-danger, #FFECEB)',
            border: '1.5px solid var(--ds-border-danger, #FF8F73)',
            color: 'var(--ds-text-danger, #AE2A19)',
            fontSize: 13, fontWeight: 500, lineHeight: '1.45',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 5v3M8 10.5v.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
          <span style={{ flex: 1 }}>{error}</span>
        </div>
      )}

      {/* ── PASSWORD SIGN IN (default) ── */}
      {!otpMode && !forgotMode && (
        <form onSubmit={handleSignInSubmit} className="clmp-form" noValidate>
          <div className="clmp-field">
            <label htmlFor="signin-email" className="clmp-label">{t(lang, 'form.label.email')}</label>
            <Textfield
              id="signin-email" name="email" type="email"
              placeholder={t(lang, 'form.placeholder.email')}
              value={signinEmail}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSigninEmail(e.currentTarget.value)}
              autoComplete="email" dir="ltr" isRequired
            />
          </div>
          <div className="clmp-field">
            <div className="clmp-password-row">
              <label htmlFor="signin-password" className="clmp-label">{t(lang, 'form.label.password')}</label>
              <button type="button" className="clmp-forgot" onClick={() => { setForgotMode(true); setForgotSent(false); setForgotError(null); }}>
                {t(lang, 'form.forgot')}
              </button>
            </div>
            <Textfield
              id="signin-password" name="password" type={showPwd ? 'text' : 'password'}
              placeholder={t(lang, 'form.placeholder.password')}
              value={signinPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSigninPassword(e.currentTarget.value)}
              autoComplete="current-password" dir="ltr" isRequired elemAfterInput={pwdToggle}
            />
          </div>
          <Button type="submit" appearance="primary" isLoading={busy} isDisabled={busy} shouldFitContainer>
            {t(lang, 'form.btn.signin')}
          </Button>
          <div className="clmp-divider">{t(lang, 'form.or')}</div>
          <button type="button" className="clmp-otp-alt-btn" onClick={() => setOtpMode(true)} disabled={busy}>
            <MailIcon />{t(lang, 'form.otp')}
          </button>
        </form>
      )}

      {/* ── FORGOT PASSWORD ── */}
      {forgotMode && (
        <div className="clmp-form">
          {forgotSent ? (
            <SectionMessage appearance="success" title="Reset link sent">
              <p>Check your inbox at <strong>{signinEmail}</strong> for a password reset link.</p>
            </SectionMessage>
          ) : (
            <form onSubmit={handleForgotSubmit} className="clmp-otp-verify-form" noValidate>
              <div className="clmp-field">
                <label htmlFor="forgot-email" className="clmp-label">{t(lang, 'form.label.email')}</label>
                <Textfield
                  id="forgot-email" name="email" type="email"
                  placeholder={t(lang, 'form.placeholder.email')}
                  value={signinEmail}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSigninEmail(e.currentTarget.value)}
                  autoComplete="email" dir="ltr" isRequired autoFocus
                />
              </div>
              {forgotError && (<div aria-live="polite"><SectionMessage appearance="error"><p>{forgotError}</p></SectionMessage></div>)}
              <Button type="submit" appearance="primary" isLoading={busy} isDisabled={busy || !signinEmail.trim()} shouldFitContainer>
                Send reset link
              </Button>
            </form>
          )}
          <div style={{ textAlign: 'center' }}>
            <button type="button" className="clmp-back-btn" onClick={() => { setForgotMode(false); setForgotSent(false); setForgotError(null); }}>
              Back to sign in
            </button>
          </div>
        </div>
      )}

      {/* ── OTP MODE ── */}
      {otpMode && !forgotMode && (
        <div className="clmp-form">
          {!otpSent && (
            <>
              <div className="clmp-field">
                <label htmlFor="otp-email" className="clmp-label">{t(lang, 'form.label.email')}</label>
                <Textfield
                  id="otp-email" name="email" type="email"
                  placeholder={t(lang, 'form.placeholder.email')}
                  value={signinEmail}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSigninEmail(e.currentTarget.value)}
                  autoComplete="email" dir="ltr" isRequired autoFocus
                />
              </div>
              {otpError && (<div aria-live="polite"><SectionMessage appearance="error"><p>{otpError}</p></SectionMessage></div>)}
              <Button type="button" appearance="primary" isLoading={busy} isDisabled={busy || !signinEmail.trim()} shouldFitContainer onClick={handleSendOtp}>
                Send sign-in code
              </Button>
              <div className="clmp-divider">{t(lang, 'form.or')}</div>
              <button type="button" className="clmp-otp-alt-btn" onClick={handleBackToPassword}>
                Sign in with password instead
              </button>
            </>
          )}
          {otpSent && (
            <form onSubmit={handleVerifyOtp} className="clmp-otp-verify-form">
              <button type="button" className="clmp-back-btn" onClick={handleBackToPassword}>
                ← Back to sign in
              </button>
              <div className="clmp-field">
                <label htmlFor="otp-code" className="clmp-label">Sign-in code</label>
                <input
                  ref={otpInputRef} id="otp-code" type="text" inputMode="numeric" pattern="[0-9]*"
                  maxLength={8} placeholder="000000" value={otpCode} autoComplete="one-time-code"
                  aria-describedby="otp-hint" aria-invalid={!!otpError}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))} className="clmp-otp-input"
                />
                <p id="otp-hint" className="clmp-field-hint">Enter the 6-digit code from your email.</p>
              </div>
              {otpError && (<div aria-live="polite"><SectionMessage appearance="error"><p>{otpError}</p></SectionMessage></div>)}
              <Button type="submit" appearance="primary" isLoading={busy} isDisabled={busy || otpCode.length < 6 || otpCode.length > 8} shouldFitContainer>
                Sign in
              </Button>
              <div style={{ textAlign: 'center' }}>
                <button type="button" className="clmp-otp-text-btn" onClick={handleSendOtp} disabled={busy}>Resend code</button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="clmp-card-foot">
        <span className="clmp-foot-badge"><span className="clmp-jira-dot">J</span>{t(lang, 'form.jira.badge')}</span>
        <span className="clmp-foot-badge"><ShieldIcon />{t(lang, 'form.security.badge')}</span>
      </div>
    </div>
  );
}

