/**
 * Login Form Card — ADS-compliant sign-in / request-access card.
 * Enterprise login only: no self-serve signup flow.
 */

import { useState, useEffect, FormEvent } from 'react';
import Textfield from '@atlaskit/textfield';
import Textarea from '@atlaskit/textarea';
import Button from '@atlaskit/button';
import { Checkbox } from '@atlaskit/checkbox';
import SectionMessage from '@atlaskit/section-message';
import { UserType } from './constants';
import type { Lang } from './translations';
import { t } from './translations';
import './login-styles.css';

const REMEMBERED_EMAIL_KEY = 'catalyst_remembered_email';

export interface ExternalAccessRequest {
  name: string;
  email: string;
  org: string;
  desc: string;
}

interface LoginFormPanelProps {
  userType: UserType;
  onUserTypeChange: (type: UserType) => void;
  onSignIn: (email: string, password: string, rememberMe: boolean) => Promise<{ error?: Error | null }>;
  onSignUp: (email: string, password: string, fullName: string) => Promise<{ error?: Error | null }>;
  onExternalSubmit: (data: ExternalAccessRequest) => Promise<void>;
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

const ShieldIcon = () => (
  <svg width="14" height="14" fill="none" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 1.5l5 1.75V7c0 3-2 5-5 6.5C5 12 3 10 3 7V3.25z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    <path d="M5.5 8l1.75 1.75L10.5 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export function LoginFormPanel({
  userType,
  onUserTypeChange,
  onSignIn,
  onExternalSubmit,
  loading,
  error,
  lang,
}: LoginFormPanelProps) {
  const [signinEmail, setSigninEmail] = useState('');
  const [signinPassword, setSigninPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [externalName, setExternalName] = useState('');
  const [externalEmail, setExternalEmail] = useState('');
  const [externalOrg, setExternalOrg] = useState('');
  const [externalDesc, setExternalDesc] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (saved) { setSigninEmail(saved); setRememberMe(true); }
  }, []);

  useEffect(() => { setSubmitSuccess(false); }, [userType]);

  const isSignIn = userType === 'existing';
  const isExternal = userType === 'external';
  const busy = isSubmitting || loading;

  const handleSignInSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const result = await onSignIn(signinEmail, signinPassword, rememberMe);
    if (!result.error) {
      if (rememberMe) localStorage.setItem(REMEMBERED_EMAIL_KEY, signinEmail);
      else localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      setSubmitSuccess(true);
    }
    setIsSubmitting(false);
  };

  const handleExternalSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onExternalSubmit({ name: externalName, email: externalEmail, org: externalOrg, desc: externalDesc });
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

      {/* Single tab group — Sign In | Request Access */}
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

      {/* Title block */}
      <div className="clmp-card-header">
        <h2 className="clmp-card-title">
          {isSignIn ? t(lang, 'form.signin.title') : t(lang, 'form.external.title')}
        </h2>
        <p className="clmp-card-sub">
          {isSignIn ? t(lang, 'form.signin.sub') : t(lang, 'form.external.sub')}
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <SectionMessage appearance="error">
          <p>{error}</p>
        </SectionMessage>
      )}

      {/* ── Sign In ── */}
      {isSignIn && (
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
              <button type="button" className="clmp-forgot">
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

          <div className="clmp-field">
            <Checkbox
              label={t(lang, 'form.remember')}
              isChecked={rememberMe}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRememberMe(e.target.checked)}
              name="remember-me"
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
        </form>
      )}

      {/* ── External request ── */}
      {isExternal && !submitSuccess && (
        <form onSubmit={handleExternalSubmit} className="clmp-form" noValidate>
          <div className="clmp-field">
            <label htmlFor="ext-name" className="clmp-label">
              {t(lang, 'form.label.name')}
            </label>
            <Textfield
              id="ext-name"
              name="name"
              type="text"
              placeholder={t(lang, 'form.placeholder.name.ext')}
              value={externalName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExternalName(e.currentTarget.value)}
              isRequired
            />
          </div>

          <div className="clmp-field">
            <label htmlFor="ext-email" className="clmp-label">
              {t(lang, 'form.label.email')}
            </label>
            <Textfield
              id="ext-email"
              name="email"
              type="email"
              placeholder={t(lang, 'form.placeholder.email.org')}
              value={externalEmail}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExternalEmail(e.currentTarget.value)}
              dir="ltr"
              isRequired
            />
          </div>

          <div className="clmp-field">
            <label htmlFor="ext-org" className="clmp-label">
              {t(lang, 'form.label.org')}
            </label>
            <Textfield
              id="ext-org"
              name="org"
              type="text"
              placeholder={t(lang, 'form.placeholder.org')}
              value={externalOrg}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExternalOrg(e.currentTarget.value)}
            />
          </div>

          <div className="clmp-field">
            <label htmlFor="ext-desc" className="clmp-label">
              {t(lang, 'form.label.desc')}
            </label>
            <Textarea
              id="ext-desc"
              name="desc"
              placeholder={t(lang, 'form.placeholder.desc')}
              value={externalDesc}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setExternalDesc(e.target.value)}
              minimumRows={3}
            />
          </div>

          <Button
            type="submit"
            appearance="primary"
            shouldFitContainer
          >
            {t(lang, 'form.btn.submit')}
          </Button>
        </form>
      )}

      {/* ── External success ── */}
      {isExternal && submitSuccess && (
        <SectionMessage appearance="success" title={t(lang, 'form.success.external.title')}>
          <p>{t(lang, 'form.success.external.desc')}</p>
        </SectionMessage>
      )}

      {/* Footer badges — ADS-styled, muted */}
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
