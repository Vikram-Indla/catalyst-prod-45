/**
 * Catalyst Login & Marketing Page
 * Full-page marketing layout with embedded sign-in card.
 * Auth logic: Supabase (signIn / signUp / ForcePasswordReset).
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import {
  getLastRoute,
  clearLastRoute,
  captureLastLoginForDisplay,
  storeCurrentLoginTime,
} from '@/hooks/useSessionPersistence';
import { LoginHeroPanel } from './LoginHeroPanel';
import { LoginFormPanel } from './LoginFormPanel';
import { useLoginState } from './useLoginState';
import { ForcePasswordReset } from '@/components/auth/ForcePasswordReset';
import { FileText } from '@/lib/atlaskit-icons';
import { useThemeMode } from '@/providers/ThemeProvider';
import { useLanguage } from './useLanguage';
import { t } from './translations';
import './login-styles.css';

// C-mark SVG shared by nav + footer
function CMarkSvg({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Catalyst"
    >
      <rect width="512" height="512" rx="129.62" fill="#1868DB" />
      <g transform="translate(256 256) scale(0.95) translate(-256 -256)">
        <path
          d="M421.802 200.297V93.9736H259.279L233.457 127.39L210.674 93.9736H154.474C39.037 223.992 106.375 363.833 154.474 417.501H421.802V309.659H279.025L236.495 374.972C170.878 271.686 209.155 173.97 236.495 138.022L279.025 200.297H421.802Z"
          fill="white"
        />
      </g>
    </svg>
  );
}

export function CatalystLoginPage() {
  const navigate = useNavigate();
  const { signIn, signUp, sendOtp, verifyOtp, user, loading } = useAuth();
  const { userType, authType, handleUserTypeChange, handleAuthTypeChange } = useLoginState();
  const { resolvedTheme, setTheme } = useThemeMode();
  const { lang, toggleLang } = useLanguage();

  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showPendingMessage, setShowPendingMessage] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const checkedUserRef = useRef<string | null>(null);

  const checkMustChangePassword = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const result = await Promise.race([
        supabase
          .from('profiles')
          .select('must_change_password, approval_status')
          .eq('id', userId)
          .maybeSingle(),
        new Promise<never>((_, reject) =>
          window.setTimeout(() => reject(new Error('profile lookup timeout')), 6000)
        ),
      ]);
      const { data: profile, error } = result;
      if (error) return false;
      if (!profile || profile.approval_status !== 'APPROVED') return false;
      return profile.must_change_password === true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (loading || !user) {
      checkedUserRef.current = null;
      setIsTransitioning(false);
      return;
    }
    if (checkedUserRef.current === user.id) return;
    if (mustChangePassword) return;

    const handleAuthRedirect = async () => {
      checkedUserRef.current = user.id;
      setIsTransitioning(true);

      const guard = window.setTimeout(async () => {
        console.warn('[auth] Login transition timeout');
        checkedUserRef.current = null;
        setIsTransitioning(false);
        await supabase.auth.signOut();
      }, 8000);

      try {
        const needsChange = await checkMustChangePassword(user.id);
        if (needsChange) {
          setMustChangePassword(true);
          setCurrentUserId(user.id);
          return;
        }
        const profileResult = await Promise.race([
          supabase
            .from('profiles')
            .select('approval_status')
            .eq('id', user.id)
            .maybeSingle(),
          new Promise<never>((_, reject) =>
            window.setTimeout(() => reject(new Error('approval lookup timeout')), 6000)
          ),
        ]);
        const { data: profile } = profileResult;
        if (profile?.approval_status === 'APPROVED') {
          captureLastLoginForDisplay();
          storeCurrentLoginTime();
          navigate(getLastRoute(), { replace: true });
        } else {
          checkedUserRef.current = null;
        }
      } catch {
        checkedUserRef.current = null;
        await supabase.auth.signOut();
      } finally {
        window.clearTimeout(guard);
        setIsTransitioning(false);
      }
    };

    handleAuthRedirect();
  }, [user, loading, mustChangePassword, navigate, checkMustChangePassword]);

  const handleSignIn = async (
    email: string,
    password: string,
    _rememberMe: boolean
  ): Promise<{ error?: Error | null }> => {
    setIsLoading(true);
    setLoginError(null);
    // Capture previous login time before it gets overwritten
    captureLastLoginForDisplay();
    const result = await signIn(email, password);
    if (result.error) {
      if ((result as any).isPending) setLoginError('Your account is pending approval.');
      else if ((result as any).isBlocked) setLoginError('Unable to sign in.');
      else setLoginError('The email or password you entered is incorrect.');
      setIsLoading(false);
      return { error: result.error };
    }
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      const needsChange = await checkMustChangePassword(currentUser.id);
      if (needsChange) {
        setMustChangePassword(true);
        setCurrentUserId(currentUser.id);
        setIsLoading(false);
        return {};
      }
    }
    storeCurrentLoginTime();
    const lastRoute = getLastRoute();
    clearLastRoute();
    navigate(lastRoute);
    setIsLoading(false);
    return {};
  };

  const handleSignUp = async (
    email: string,
    password: string,
    fullName: string
  ): Promise<{ error?: Error | null }> => {
    setIsLoading(true);
    setLoginError(null);
    const result = await signUp(email, password, fullName);
    if (result.error) {
      const code = (result as any).code || result.error.code;
      const messages: Record<string, string> = {
        EMAIL_EXISTS_APPROVED: 'This email is already registered. Please sign in.',
        EMAIL_EXISTS_PENDING: 'Your registration is pending approval.',
        ACCOUNT_DISABLED: 'This account has been disabled. Please contact support.',
        RATE_LIMITED: 'Too many attempts. Please try again later.',
      };
      setLoginError(
        messages[code] ||
          (code === 'EMAIL_EXISTS_REJECTED_COOLDOWN'
            ? result.error.message || 'Your request was rejected. Please try again later.'
            : result.error.message || 'Something went wrong. Please try again.')
      );
      setIsLoading(false);
      return { error: result.error };
    }
    setShowPendingMessage(true);
    setIsLoading(false);
    return {};
  };

  const handlePasswordResetSuccess = () => {
    setMustChangePassword(false);
    setCurrentUserId(null);
    const lastRoute = getLastRoute();
    clearLastRoute();
    navigate(lastRoute);
  };

  const handleSendOtp = async (email: string): Promise<{ error?: any }> => {
    setIsLoading(true);
    setLoginError(null);
    const result = await sendOtp(email);
    setIsLoading(false);
    return result;
  };

  const handleVerifyOtp = async (email: string, token: string): Promise<{ error?: any }> => {
    setIsLoading(true);
    setLoginError(null);
    const result = await verifyOtp(email, token);
    if (!result.error) {
      storeCurrentLoginTime();
      navigate(getLastRoute(), { replace: true });
    } else {
      setLoginError('The code is incorrect or has expired. Please try again.');
    }
    setIsLoading(false);
    return result;
  };

  const handleExternalSubmit = async (data: import('./LoginFormPanel').ExternalAccessRequest): Promise<void> => {
    // Store the access request in a transient localStorage queue so admins
    // can review it at /admin/access once a Supabase access_requests table
    // is provisioned. Until then this prevents data loss on form submit.
    try {
      const existing = JSON.parse(localStorage.getItem('catalyst_access_requests') || '[]');
      existing.push({ ...data, submittedAt: new Date().toISOString() });
      localStorage.setItem('catalyst_access_requests', JSON.stringify(existing));
    } catch {
      // Non-critical — success state still shows
    }
  };

  const isDark = resolvedTheme === 'dark';

  // ── Full-page auth states ──────────────────────────────────────────
  if (isTransitioning || (user && loading)) {
    return (
      <div className="clmp-fullstate">
        <div className="clmp-fullstate-inner">
          <div className="clmp-fullstate-spinner" />
          <span style={{ color: 'var(--clmp-p60)', fontSize: '0.875rem', fontWeight: 500 }}>
            Signing you in…
          </span>
        </div>
      </div>
    );
  }

  if (showPendingMessage) {
    return (
      <div className="clmp-fullstate">
        <div className="clmp-fullstate-inner">
          <div className="clmp-fullstate-icon">
            <FileText style={{ width: '32px', height: '32px', color: 'var(--clmp-p60)' }} />
          </div>
          <h2>Registration Submitted</h2>
          <p>Thanks for registering. Your account is pending approval.</p>
          <p className="small">You can sign in once an administrator approves your request.</p>
          <button
            type="button"
            className="clmp-back-btn"
            onClick={() => { setShowPendingMessage(false); handleAuthTypeChange('signin'); }}
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  if (mustChangePassword && currentUserId) {
    return (
      <div className="clmp-fullstate">
        <div className="clmp-fullstate-inner" style={{ maxWidth: '420px', width: '100%' }}>
          <ForcePasswordReset userId={currentUserId} onSuccess={handlePasswordResetSuccess} />
        </div>
      </div>
    );
  }

  // ── Full marketing page ───────────────────────────────────────────
  return (
    <div className="clmp-root">
      <a href="#main-form" className="clmp-skip-link">Skip to login form</a>

      {/* NAV */}
      <nav className="clmp-nav" aria-label="Site navigation">
        <div className="clmp-container clmp-nav-inner">
          <a href="#top" className="clmp-brand" aria-label="Catalyst — home">
            <CMarkSvg size={40} className="clmp-brand-mark" />
            <span className="clmp-brand-word">Catalyst</span>
            <span className="clmp-brand-tagline">{t(lang, 'nav.tagline')}</span>
          </a>
          <div className="clmp-nav-right">
            <button
              type="button"
              className="clmp-nav-btn"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
              <span>{isDark ? t(lang, 'nav.light') : t(lang, 'nav.dark')}</span>
            </button>
            <button
              type="button"
              className="clmp-nav-btn clmp-lang-btn"
              onClick={toggleLang}
              aria-label={lang === 'en' ? 'Switch to Arabic' : 'Switch to English'}
            >
              {lang === 'en' ? t(lang, 'nav.ar') : t(lang, 'nav.en')}
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="clmp-hero" id="top">
        <div className="clmp-container">
          <div className="clmp-hero-grid">
            <LoginHeroPanel lang={lang} />
            <LoginFormPanel
              userType={userType}
              authType={authType}
              onUserTypeChange={handleUserTypeChange}
              onAuthTypeChange={handleAuthTypeChange}
              onSignIn={handleSignIn}
              onSignUp={handleSignUp}
              onExternalSubmit={handleExternalSubmit}
              onSendOtp={handleSendOtp}
              onVerifyOtp={handleVerifyOtp}
              loading={isLoading}
              error={loginError}
              lang={lang}
            />
            {/* authType / onAuthTypeChange kept in props signature for useLoginState compatibility */}
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <div className="clmp-trust">
        <div className="clmp-container">
          <span><strong>{t(lang, 'trust.jira')}</strong></span>
          <span className="clmp-trust-dot">·</span>
          <span><strong>{t(lang, 'trust.servicenow')}</strong></span>
          <span className="clmp-trust-dot">·</span>
          <span><strong>{t(lang, 'trust.rls')}</strong></span>
          <span className="clmp-trust-dot">·</span>
          <span><strong>{t(lang, 'trust.residency')}</strong></span>
          <span className="clmp-trust-dot">·</span>
          <span><strong>{t(lang, 'trust.currency')}</strong></span>
        </div>
      </div>

      {/* ARCHITECTURE */}
      <section className="clmp-arch-band">
        <div className="clmp-container">
          <div className="clmp-section-head center">
            <div className="clmp-section-eyebrow">{t(lang, 'arch.eyebrow')}</div>
            <h2>{t(lang, 'arch.title')}</h2>
            <p>{t(lang, 'arch.desc')}</p>
          </div>

          <div className="clmp-arch-v2">

            {/* LEFT — Source integrations */}
            <div>
              <div className="clmp-arch-v2-col-label">{t(lang, 'arch.col1')}</div>
              <div className="clmp-arch-integ-col">

                {/* Jira */}
                <div className="clmp-arch-integ-card">
                  <div className="clmp-arch-integ-mark" style={{ background: '#1868DB' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 2C7.03 2 3 6.03 3 11c0 3.1 1.5 5.86 3.83 7.61L12 22l5.17-3.39A9.965 9.965 0 0 0 21 11c0-4.97-4.03-9-9-9zm0 16-3.58-2.34A7.975 7.975 0 0 1 4 11c0-4.41 3.59-8 8-8s8 3.59 8 8a7.975 7.975 0 0 1-4.42 7.66L12 18z" fill="white"/>
                    </svg>
                  </div>
                  <div className="clmp-arch-integ-info">
                    <div className="clmp-arch-integ-name">Jira</div>
                    <div className="clmp-arch-integ-cat">{t(lang, 'arch.jira.cat')}</div>
                  </div>
                  <div className="clmp-arch-integ-dot" />
                </div>

                {/* ServiceNow */}
                <div className="clmp-arch-integ-card">
                  <div className="clmp-arch-integ-mark" style={{ background: '#62B229' }}>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: '11px', letterSpacing: '-0.5px', fontFamily: 'var(--ds-font-family-body, sans-serif)' }}>SN</span>
                  </div>
                  <div className="clmp-arch-integ-info">
                    <div className="clmp-arch-integ-name">ServiceNow</div>
                    <div className="clmp-arch-integ-cat">{t(lang, 'arch.sn.cat')}</div>
                  </div>
                  <div className="clmp-arch-integ-dot" />
                </div>

                {/* Active Directory */}
                <div className="clmp-arch-integ-card">
                  <div className="clmp-arch-integ-mark" style={{ background: '#0078D4' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <rect x="2" y="2" width="9" height="9" rx="1" fill="rgba(255,255,255,0.95)"/>
                      <rect x="13" y="2" width="9" height="9" rx="1" fill="rgba(255,255,255,0.6)"/>
                      <rect x="2" y="13" width="9" height="9" rx="1" fill="rgba(255,255,255,0.6)"/>
                      <rect x="13" y="13" width="9" height="9" rx="1" fill="rgba(255,255,255,0.3)"/>
                    </svg>
                  </div>
                  <div className="clmp-arch-integ-info">
                    <div className="clmp-arch-integ-name">Active Directory</div>
                    <div className="clmp-arch-integ-cat">{t(lang, 'arch.ad.cat')}</div>
                  </div>
                  <div className="clmp-arch-integ-dot" />
                </div>

                {/* Notion */}
                <div className="clmp-arch-integ-card">
                  <div className="clmp-arch-integ-mark" style={{ background: '#191919' }}>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px', fontFamily: 'Georgia, serif', lineHeight: 1 }}>N</span>
                  </div>
                  <div className="clmp-arch-integ-info">
                    <div className="clmp-arch-integ-name">Notion</div>
                    <div className="clmp-arch-integ-cat">{t(lang, 'arch.notion.cat')}</div>
                  </div>
                  <div className="clmp-arch-integ-dot" />
                </div>

                {/* Slack */}
                <div className="clmp-arch-integ-card">
                  <div className="clmp-arch-integ-mark" style={{ background: '#4A154B' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <rect x="5" y="9" width="14" height="2.5" rx="1.25" fill="white"/>
                      <rect x="5" y="12.5" width="14" height="2.5" rx="1.25" fill="white"/>
                      <rect x="8.75" y="5" width="2.5" height="14" rx="1.25" fill="white"/>
                      <rect x="12.75" y="5" width="2.5" height="14" rx="1.25" fill="white"/>
                    </svg>
                  </div>
                  <div className="clmp-arch-integ-info">
                    <div className="clmp-arch-integ-name">Slack</div>
                    <div className="clmp-arch-integ-cat">{t(lang, 'arch.slack.cat')}</div>
                  </div>
                  <div className="clmp-arch-integ-dot" />
                </div>

              </div>
            </div>

            {/* Flow → sync */}
            <div className="clmp-arch-v2-flow" aria-hidden="true">
              <svg width="48" height="20" viewBox="0 0 48 20" fill="none">
                <defs>
                  <marker id="archArrowL" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                    <path d="M0 0L6 3L0 6z" fill="var(--ds-border-information,#0055CC)"/>
                  </marker>
                </defs>
                <line x1="2" y1="10" x2="40" y2="10" stroke="var(--ds-border-information,#0055CC)" strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#archArrowL)"/>
              </svg>
              <span className="clmp-arch-v2-flow-label">{t(lang, 'arch.sync')}</span>
            </div>

            {/* CENTER — Catalyst Core */}
            <div className="clmp-arch-core-v2">
              <div className="clmp-arch-core-v2-title">{t(lang, 'arch.core')}</div>
              <div className="clmp-arch-core-v2-sub">{t(lang, 'arch.core.name')}</div>
              <div className="clmp-arch-mod-grid-v2">
                {(['01','02','03','04','05','06','07','08','09'] as const).map(n => (
                  <div key={n} className="clmp-arch-mod-v2">{t(lang, `hub.${n}`)}</div>
                ))}
              </div>
            </div>

            {/* Flow → insights */}
            <div className="clmp-arch-v2-flow" aria-hidden="true">
              <svg width="48" height="20" viewBox="0 0 48 20" fill="none">
                <defs>
                  <marker id="archArrowR" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                    <path d="M0 0L6 3L0 6z" fill="var(--ds-border-information,#0055CC)"/>
                  </marker>
                </defs>
                <line x1="2" y1="10" x2="40" y2="10" stroke="var(--ds-border-information,#0055CC)" strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#archArrowR)"/>
              </svg>
              <span className="clmp-arch-v2-flow-label">{t(lang, 'arch.insights.label')}</span>
            </div>

            {/* RIGHT — Stakeholder outputs */}
            <div>
              <div className="clmp-arch-v2-col-label">{t(lang, 'arch.col3')}</div>
              <div className="clmp-arch-output-col">

                {/* Executive Insights */}
                <div className="clmp-arch-output-card">
                  <div className="clmp-arch-output-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                      <rect x="3" y="12" width="4" height="9"/>
                      <rect x="10" y="7" width="4" height="14"/>
                      <rect x="17" y="3" width="4" height="18"/>
                    </svg>
                  </div>
                  <div className="clmp-arch-output-body">
                    <div className="clmp-arch-output-title">{t(lang, 'arch.s1')}</div>
                    <div className="clmp-arch-output-desc">{t(lang, 'arch.s1.desc')}</div>
                  </div>
                </div>

                {/* Portfolio Visibility */}
                <div className="clmp-arch-output-card">
                  <div className="clmp-arch-output-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="3" width="7" height="7" rx="1"/>
                      <rect x="14" y="3" width="7" height="7" rx="1"/>
                      <rect x="3" y="14" width="7" height="7" rx="1"/>
                      <rect x="14" y="14" width="7" height="7" rx="1"/>
                    </svg>
                  </div>
                  <div className="clmp-arch-output-body">
                    <div className="clmp-arch-output-title">{t(lang, 'arch.s2')}</div>
                    <div className="clmp-arch-output-desc">{t(lang, 'arch.s2.desc')}</div>
                  </div>
                </div>

                {/* Delivery Intelligence */}
                <div className="clmp-arch-output-card">
                  <div className="clmp-arch-output-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                    </svg>
                  </div>
                  <div className="clmp-arch-output-body">
                    <div className="clmp-arch-output-title">{t(lang, 'arch.s3')}</div>
                    <div className="clmp-arch-output-desc">{t(lang, 'arch.s3.desc')}</div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 9 MODULES */}
      <section className="clmp-section-band">
        <div className="clmp-container">
          <div className="clmp-section-head">
            <div className="clmp-section-eyebrow">{t(lang, 'hubs.eyebrow')}</div>
            <h2>{t(lang, 'hubs.title')}</h2>
            <p>{t(lang, 'hubs.desc')}</p>
          </div>
          <div className="clmp-hub-grid">
            {(['01','02','03','04','05','06','07','08','09'] as const).map(n => (
              <div key={n} className="clmp-hub-card">
                <span className="clmp-hub-num">{n}</span>
                <span className="clmp-hub-name">{t(lang, `hub.${n}`)}</span>
                <div className="clmp-hub-desc">{t(lang, `hub.${n}.desc`)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RESOURCE 360° */}
      <section className="clmp-section">
        <div className="clmp-container">
          <div className="clmp-r360-block">
            <div className="clmp-section-eyebrow">{t(lang, 'r360.eyebrow')}</div>
            <h2>{t(lang, 'r360.title')}</h2>
            <p className="clmp-r360-lede">{t(lang, 'r360.desc')}</p>
            <div className="clmp-r360-grid">
              {(['f1','f2','f3','f4','f5','f6'] as const).map(f => (
                <div key={f} className="clmp-r360-card">
                  <div className="clmp-r360-icon" aria-hidden="true" />
                  <div className="clmp-r360-feat-name">{t(lang, `r360.${f}.t`)}</div>
                  <div className="clmp-r360-feat-desc">{t(lang, `r360.${f}.b`)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* WHY CATALYST */}
      <section className="clmp-section-band">
        <div className="clmp-container">
          <div className="clmp-section-head">
            <div className="clmp-section-eyebrow">{t(lang, 'why.eyebrow')}</div>
            <h2>{t(lang, 'why.title')}</h2>
            <p>{t(lang, 'why.desc')}</p>
          </div>
          <div className="clmp-why-grid">
            {(['1','2','3','4','5','6'] as const).map(n => (
              <div key={n} className="clmp-why-card">
                <div className="clmp-why-num">0{n}</div>
                <div className="clmp-why-title">{t(lang, `why.${n}.t`)}</div>
                <div className="clmp-why-body">{t(lang, `why.${n}.b`)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="clmp-section">
        <div className="clmp-container">
          <div className="clmp-section-head">
            <div className="clmp-section-eyebrow">{t(lang, 'compare.eyebrow')}</div>
            <h2>{t(lang, 'compare.title')}</h2>
            <p>{t(lang, 'compare.desc')}</p>
          </div>
          <div className="clmp-compare-wrap">
            <table className="clmp-compare-table">
              <thead>
                <tr>
                  <th>{t(lang, 'compare.h.capability')}</th>
                  <th className="catalyst-col">
                    {t(lang, 'compare.h.catalyst')}
                    <span className="recommended">{t(lang, 'compare.recommended')}</span>
                  </th>
                  <th className="opt">{t(lang, 'compare.h.jira-align')}</th>
                  <th className="opt">{t(lang, 'compare.h.planview')}</th>
                </tr>
              </thead>
              <tbody>
                {(['r1','r2','r3','r4','r5','r6','r7'] as const).map(r => (
                  <tr key={r}>
                    <td className="label">{t(lang, `compare.${r}.l`)}</td>
                    <td className="catalyst-col"><span className="clmp-check">{t(lang, `compare.${r}.c`)}</span></td>
                    <td className="other opt">{t(lang, `compare.${r}.j`)}</td>
                    <td className="other opt">{t(lang, `compare.${r}.p`)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="clmp-footer">
        <div className="clmp-container">
          <div className="clmp-foot-brand">
            <CMarkSvg size={24} className="clmp-foot-brand-mark" />
            <span>{t(lang, 'foot.copy')}</span>
          </div>
          <div className="clmp-foot-legal">
            <span>{t(lang, 'foot.conf')}</span>
            <a href="#privacy">{t(lang, 'foot.privacy')}</a>
            <a href="#terms">{t(lang, 'foot.terms')}</a>
            <a href="#security">{t(lang, 'foot.security')}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export * from './constants';
export * from './useLoginState';
export { LoginHeroPanel } from './LoginHeroPanel';
export { LoginFormPanel } from './LoginFormPanel';
