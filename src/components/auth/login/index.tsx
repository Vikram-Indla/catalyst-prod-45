/**
 * Catalyst Portal — marketing page with embedded sign-in (no CTA gate).
 * Auth logic: Supabase (signIn / OTP / forgot / ForcePasswordReset). Unchanged.
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
import { LoginFormPanel } from './LoginFormPanel';
import { CatyPulseIcon } from '@/components/ui/CatyPulseIcon';
import { useLoginState } from './useLoginState';
import { ForcePasswordReset } from '@/components/auth/ForcePasswordReset';
import { FileText } from '@/lib/atlaskit-icons';
import { useThemeMode } from '@/providers/ThemeProvider';
import { useLanguage } from './useLanguage';
import { t } from './translations';
// ads-scanner:ignore-next-line
import './login-styles.css';

// C-mark (full logo) — nav + footer
function CMarkSvg({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Catalyst">
      <rect width="512" height="512" rx="129.62" fill="var(--ds-background-brand-bold)" />
      <path d="M421.802 200.297V93.9736H259.279L233.457 127.39L210.674 93.9736H154.474C39.037 223.992 106.375 363.833 154.474 417.501H421.802V309.659H279.025L236.495 374.972C170.878 271.686 209.155 173.97 236.495 138.022L279.025 200.297H421.802Z" fill="white" />
    </svg>
  );
}

// Bare C-path — oversized brand watermark (uses currentColor)
function CPathSvg({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="100%" height="100%">
      <path d="M421.802 200.297V93.9736H259.279L233.457 127.39L210.674 93.9736H154.474C39.037 223.992 106.375 363.833 154.474 417.501H421.802V309.659H279.025L236.495 374.972C170.878 271.686 209.155 173.97 236.495 138.022L279.025 200.297H421.802Z" fill="currentColor" />
    </svg>
  );
}

const MODULES = [
  { no: '01', key: 'hub.01', desc: 'hub.01.desc', tag: 'ai.tag.align' },
  { no: '02', key: 'hub.02', desc: 'hub.02.desc', tag: 'ai.tag.req' },
  { no: '03', key: 'hub.03', desc: 'hub.03.desc', tag: 'ai.tag.search' },
  { no: '04', key: 'hub.04', desc: 'hub.04.desc', tag: 'ai.tag.esc' },
  { no: '05', key: 'hub.05', desc: 'hub.05.desc', tag: 'ai.tag.caty' },
  { no: '06', key: 'hub.06', desc: 'hub.06.desc', tag: 'ai.tag.pm' },
  { no: '07', key: 'hub.r360', desc: 'hub.r360.desc', tag: 'ai.tag.beh' },
] as const;

const AGENTS = ['ag.1', 'ag.2', 'ag.3', 'ag.4', 'ag.5', 'ag.6'] as const;

export function CatalystLoginPage() {
  const navigate = useNavigate();
  const { signIn, signUp, sendOtp, verifyOtp, user, loading } = useAuth();
  const { userType, handleUserTypeChange, handleAuthTypeChange } = useLoginState();
  const { resolvedTheme, setTheme } = useThemeMode();
  const { lang, toggleLang } = useLanguage();

  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    if (!loginError) return;
    const t = window.setTimeout(() => setLoginError(null), 6000);
    return () => window.clearTimeout(t);
  }, [loginError]);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showPendingMessage, setShowPendingMessage] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const checkedUserRef = useRef<string | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const menu = mobileMenuRef.current;
    if (!menu) return;
    const focusables = Array.from(menu.querySelectorAll<HTMLElement>('a, button, [tabindex]:not([tabindex="-1"])'));
    focusables[0]?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); setMobileMenuOpen(false); return; }
      if (e.key !== 'Tab') return;
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [mobileMenuOpen]);

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
  ): Promise<{ error?: Error | null }> => {
    setIsLoading(true);
    setLoginError(null);
    captureLastLoginForDisplay();
    const result = await signIn(email, password);
    if (result.error) {
      if ((result as any).isPending) setLoginError('Your account is pending approval.');
      else if ((result as any).isBlocked) setLoginError('Unable to sign in.');
      else setLoginError('The email or password you entered is incorrect.');
      setIsLoading(false);
      return { error: result.error };
    }
    // Always remember email — Jira-like, no "Remember me" checkbox
    localStorage.setItem('catalyst_remembered_email', email.toLowerCase().trim());
    storeCurrentLoginTime();
    const lastRoute = getLastRoute();
    clearLastRoute();

    // Sync redirect — execute immediately, bypass setTimeout queue
    window.location.href = lastRoute || '/project-hub';
    // Never reached; page unloads
    return {};
  };

  const handleForgotPassword = async (email: string): Promise<{ error?: any }> => {
    // Route through the branded Resend pipeline (send-password-reset edge function)
    // instead of Supabase's default unbranded reset email (CAT-DEF-005).
    const { data, error } = await supabase.functions.invoke('send-password-reset', {
      body: {
        email: email.toLowerCase().trim(),
        redirectTo: `${window.location.origin}/reset-password`,
      },
    });
    // The function is anti-enumeration: it returns ok:true even for unknown emails.
    // Surface only a genuine transport/server failure.
    if (error) return { error };
    if (data && data.ok === false) return { error: new Error(data.error || 'Failed to send reset email') };
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
      localStorage.setItem('catalyst_remembered_email', email.toLowerCase().trim());
      storeCurrentLoginTime();
      navigate(getLastRoute(), { replace: true });
    } else {
      setLoginError('The code is incorrect or has expired. Please try again.');
    }
    setIsLoading(false);
    return result;
  };

  const handleExternalSubmit = async (data: import('./LoginFormPanel').ExternalAccessRequest): Promise<void> => {
    try {
      const existing = JSON.parse(localStorage.getItem('catalyst_access_requests') || '[]');
      existing.push({ ...data, submittedAt: new Date().toISOString() });
      localStorage.setItem('catalyst_access_requests', JSON.stringify(existing));
    } catch {
      // Non-critical
    }
  };

  const isDark = resolvedTheme === 'dark';

  // Scroll-reveal for marketing sections
  useEffect(() => {
    if (isTransitioning || showPendingMessage || mustChangePassword) return;
    const els = Array.from(document.querySelectorAll('.clmp-rv'));
    if (!('IntersectionObserver' in window) || els.length === 0) {
      els.forEach(el => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }),
      { threshold: 0.12 }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [isTransitioning, showPendingMessage, mustChangePassword, lang]);

  // ── Full-page auth states ──────────────────────────────────────────
  if (isTransitioning || (user && loading)) {
    return (
      <div className="clmp-root">
        <div className="clmp-fullstate">
          <div className="clmp-fullstate-inner">
            <div className="clmp-fullstate-spinner" />
            <span style={{ color: 'var(--clmp-text-subtle)', fontSize: '0.875rem', fontWeight: 600 }}>
              Signing you in…
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (showPendingMessage) {
    return (
      <div className="clmp-root">
        <div className="clmp-fullstate">
          <div className="clmp-fullstate-inner">
            <div className="clmp-fullstate-icon">
              <FileText style={{ width: '32px', height: '32px', color: 'var(--clmp-brand-text)' }} />
            </div>
            <h2>Registration Submitted</h2>
            <p>Thanks for registering. Your account is pending approval.</p>
            <p className="small">You can sign in once an administrator approves your request.</p>
            <button type="button" className="clmp-btn clmp-btn-primary" onClick={() => { setShowPendingMessage(false); handleAuthTypeChange('signin'); }}>
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mustChangePassword && currentUserId) {
    return (
      <div className="clmp-root">
        <div className="clmp-fullstate">
          <div className="clmp-fullstate-inner" style={{ maxWidth: '420px', width: '100%' }}>
            <ForcePasswordReset userId={currentUserId} email={user?.email ?? ''} onSuccess={handlePasswordResetSuccess} />
          </div>
        </div>
      </div>
    );
  }

  // ── Portal page ───────────────────────────────────────────────────
  return (
    <div className="clmp-root">
      <a href="#main-form" className="clmp-skip-link">Skip to sign in</a>

      {/* NAV */}
      <nav className="clmp-nav" aria-label="Site navigation">
        <div className="clmp-nav-inner">
          <a href="#top" className="clmp-brand" aria-label="Catalyst — home">
            <CMarkSvg size={32} className="clmp-brand-mark" />
            <span className="clmp-brand-word">Catalyst</span>
            <span className="clmp-brand-tagline">{t(lang, 'nav.tagline')}</span>
          </a>
          <div className="clmp-nav-links">
            <a href="#ai">{t(lang, 'nav.ai')}</a>
            <a href="#mods">{t(lang, 'hubs.eyebrow')}</a>
            <a href="#why">{t(lang, 'why.eyebrow')}</a>
          </div>
          <div className="clmp-nav-right">
            <button type="button" className="clmp-nav-btn" onClick={() => setTheme(isDark ? 'light' : 'dark')} aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
              {isDark ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
              <span>{isDark ? t(lang, 'nav.light') : t(lang, 'nav.dark')}</span>
            </button>
            <button type="button" className="clmp-nav-btn" onClick={toggleLang} aria-label={lang === 'en' ? 'Switch to Arabic' : 'Switch to English'}>
              {lang === 'en' ? t(lang, 'nav.ar') : t(lang, 'nav.en')}
            </button>
            <a className="clmp-btn clmp-btn-quiet" style={{ height: 34, fontSize: 'var(--ds-font-size-300)' }} href="#main-form">{t(lang, 'form.tab.signin')}</a>
            <button
              type="button"
              className="clmp-ham"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="clmp-mobile-menu"
              onClick={() => setMobileMenuOpen(v => !v)}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                {mobileMenuOpen ? (
                  <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                ) : (
                  <>
                    <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div id="clmp-mobile-menu" className="clmp-mobile-menu" role="dialog" aria-label="Navigation menu" aria-modal="true" ref={mobileMenuRef}>
            <a href="#ai" onClick={() => setMobileMenuOpen(false)}>{t(lang, 'nav.ai')}</a>
            <a href="#mods" onClick={() => setMobileMenuOpen(false)}>{t(lang, 'hubs.eyebrow')}</a>
            <a href="#why" onClick={() => setMobileMenuOpen(false)}>{t(lang, 'why.eyebrow')}</a>
            <a className="clmp-btn clmp-btn-primary" style={{ marginBlockStart: 8 }} href="#main-form" onClick={() => setMobileMenuOpen(false)}>{t(lang, 'form.tab.signin')}</a>
          </div>
        )}
      </nav>

      {/* HERO with embedded sign-in */}
      <header className="clmp-hero" id="top">
        <span className="clmp-hero-watermark"><CPathSvg /></span>
        <div className="clmp-container clmp-hero-grid">
          <div>
            <span className="clmp-eyebrow"><span className="clmp-pulse" />{t(lang, 'hero.eyebrow')}</span>
            <h1 className="clmp-tagline">
              {t(lang, 'hero.tagline1')}<br />
              <span className="clmp-tagline-accent">{t(lang, 'hero.tagline2')}</span>
            </h1>
            <p className="clmp-lede">{t(lang, 'hero.lede')}</p>
            <div className="clmp-stat-row" role="list">
              <div className="clmp-stat" role="listitem"><div className="clmp-stat-value">8</div><div className="clmp-stat-label">{t(lang, 'stat.modules')}</div></div>
              <div className="clmp-stat" role="listitem"><div className="clmp-stat-value">8+</div><div className="clmp-stat-label">{t(lang, 'stat.agents')}</div></div>
              <div className="clmp-stat" role="listitem"><div className="clmp-stat-value">∞</div><div className="clmp-stat-label">{t(lang, 'stat.jira')}</div></div>
              <div className="clmp-stat" role="listitem"><div className="clmp-stat-value">360°</div><div className="clmp-stat-label">{t(lang, 'stat.resource')}</div></div>
            </div>
            <div className="clmp-hero-foot">
              <span>{t(lang, 'trust.jira')}</span><span className="clmp-dot" />
              <span>{t(lang, 'trust.rls')}</span><span className="clmp-dot" />
              <span>{t(lang, 'trust.residency')}</span><span className="clmp-dot" />
              <span>{t(lang, 'trust.ar')}</span>
            </div>
          </div>

          <LoginFormPanel
            userType={userType}
            onUserTypeChange={handleUserTypeChange}
            onSignIn={handleSignIn}
            onSignUp={handleSignUp}
            onExternalSubmit={handleExternalSubmit}
            onSendOtp={handleSendOtp}
            onVerifyOtp={handleVerifyOtp}
            onForgotPassword={handleForgotPassword}
            error={loginError}
            loading={isLoading}
            lang={lang}
          />
        </div>
      </header>

      {/* AI BAND — Ask CATY */}
      <section className="clmp-ai-band" id="ai">
        <span className="clmp-ai-watermark"><CPathSvg /></span>
        <div className="clmp-container clmp-ai-grid">
          <div className="clmp-rv">
            <span className="clmp-ai-kicker"><CatyPulseIcon size={16} />{t(lang, 'ai.kicker')}</span>
            <h2>{t(lang, 'ai.title1')} <span className="clmp-ai-hl">{t(lang, 'ai.title2')}</span><br />{t(lang, 'ai.title3')}</h2>
            <p className="clmp-ai-sub">{t(lang, 'ai.sub')}</p>
            <div className="clmp-agent-list">
              {AGENTS.map(a => (
                <div className="clmp-agent" key={a}>
                  <span className="clmp-agent-mk">✦</span>
                  <span><b>{t(lang, `${a}.t`)}</b><small>{t(lang, `${a}.b`)}</small></span>
                </div>
              ))}
            </div>
          </div>
          <div className="clmp-chat clmp-rv" aria-hidden="true">
            <div className="clmp-chat-top">
              <span className="clmp-chat-av"><CatyPulseIcon size={18} /></span>
              <span className="clmp-chat-ttl">Assistant</span>
              <span className="clmp-chat-on"><span className="clmp-pulse clmp-pulse-mint" />{t(lang, 'chat.online')}</span>
            </div>
            <div className="clmp-chat-body">
              <div className="clmp-msg clmp-msg-user">{t(lang, 'chat.q')}</div>
              <div className="clmp-msg clmp-msg-caty">
                <span className="clmp-msg-who"><CatyPulseIcon size={12} />ASSISTANT</span>
                {t(lang, 'chat.a')}
                <span className="clmp-msg-act">
                  <span>{t(lang, 'chat.c1')}</span><span>{t(lang, 'chat.c2')}</span><span>{t(lang, 'chat.c3')}</span>
                </span>
              </div>
              <div className="clmp-msg clmp-msg-caty" style={{ paddingBlock: 12 }}>
                <span className="clmp-typing"><i /><i /><i /></span>
              </div>
            </div>
            <div className="clmp-chat-in">{t(lang, 'chat.ph')}<span className="clmp-chat-send">➤</span></div>
          </div>
        </div>
      </section>

      {/* AI CAPABILITIES */}
      <section className="clmp-section">
        <div className="clmp-container">
          <div className="clmp-section-head center clmp-rv">
            <div className="clmp-section-eyebrow">{t(lang, 'caps.kicker')}</div>
            <h2>{t(lang, 'caps.title')}</h2>
            <p>{t(lang, 'caps.sub')}</p>
          </div>
          <div className="clmp-caps clmp-rv">
            <div className="clmp-cap">
              <div className="clmp-cap-ic caty"><CatyPulseIcon size={20} /></div>
              <div className="clmp-cap-t">{t(lang, 'cap.1.t')}</div><div className="clmp-cap-b">{t(lang, 'cap.1.b')}</div>
            </div>
            <div className="clmp-cap">
              <div className="clmp-cap-ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16M4 10h16M4 15h10M4 20h7"/></svg></div>
              <div className="clmp-cap-t">{t(lang, 'cap.2.t')}</div><div className="clmp-cap-b">{t(lang, 'cap.2.b')}</div>
            </div>
            <div className="clmp-cap">
              <div className="clmp-cap-ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></div>
              <div className="clmp-cap-t">{t(lang, 'cap.3.t')}</div><div className="clmp-cap-b">{t(lang, 'cap.3.b')}</div>
            </div>
            <div className="clmp-cap">
              <div className="clmp-cap-ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><path d="M3 16.5h7M6.5 13v7"/></svg></div>
              <div className="clmp-cap-t">{t(lang, 'cap.4.t')}</div><div className="clmp-cap-b">{t(lang, 'cap.4.b')}</div>
            </div>
            <div className="clmp-cap">
              <div className="clmp-cap-ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg></div>
              <div className="clmp-cap-t">{t(lang, 'cap.5.t')}</div><div className="clmp-cap-b">{t(lang, 'cap.5.b')}</div>
            </div>
            <div className="clmp-cap">
              <div className="clmp-cap-ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg></div>
              <div className="clmp-cap-t">{t(lang, 'cap.6.t')}</div><div className="clmp-cap-b">{t(lang, 'cap.6.b')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* MODULES */}
      <section className="clmp-section-band" id="mods">
        <div className="clmp-container">
          <div className="clmp-section-head center clmp-rv">
            <div className="clmp-section-eyebrow">{t(lang, 'hubs.eyebrow')}</div>
            <h2>{t(lang, 'hubs.title')}</h2>
            <p>{t(lang, 'hubs.desc')}</p>
          </div>
          <div className="clmp-mod-grid">
            {MODULES.map(m => (
              <div className="clmp-mod clmp-rv" key={m.no}>
                <span className="clmp-mod-num">{m.no}</span>
                <div className="clmp-mod-name">{t(lang, m.key)}</div>
                <div className="clmp-mod-desc">{t(lang, m.desc)}</div>
                <span className="clmp-mod-tag">✦ {t(lang, m.tag)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST */}
      <div className="clmp-trust">
        <div className="clmp-container">
          {(['trust.jira', 'trust.servicenow', 'trust.rls', 'trust.residency', 'trust.currency'] as const).map(k => (
            <span key={k}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
              {t(lang, k)}
            </span>
          ))}
        </div>
      </div>

      {/* WHY */}
      <section className="clmp-section" id="why">
        <div className="clmp-container">
          <div className="clmp-section-head clmp-rv">
            <div className="clmp-section-eyebrow">{t(lang, 'why.eyebrow')}</div>
            <h2>{t(lang, 'why.title')}</h2>
            <p>{t(lang, 'why.desc')}</p>
          </div>
          <div className="clmp-why-grid">
            {(['1', '2', '3', '4', '5', '6'] as const).map(n => (
              <div className="clmp-why-card clmp-rv" key={n}>
                <span className="clmp-why-num">0{n}</span>
                <span>
                  <div className="clmp-why-title">{t(lang, `why.${n}.t`)}</div>
                  <div className="clmp-why-body">{t(lang, `why.${n}.b`)}</div>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL */}
      <div className="clmp-final">
        <span className="clmp-final-watermark"><CPathSvg /></span>
        <div className="clmp-container clmp-rv">
          <h2>{t(lang, 'final.title')}</h2>
          <p>{t(lang, 'final.sub')}</p>
          <a className="clmp-btn clmp-btn-primary" style={{ height: 46, paddingInline: 32, fontSize: 'var(--ds-font-size-400)' }} href="#main-form">{t(lang, 'form.tab.signin')}</a>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="clmp-footer">
        <div className="clmp-container">
          <div className="clmp-foot-brand">
            <CMarkSvg size={24} />
            <span>{t(lang, 'foot.copy')}</span>
          </div>
          <div className="clmp-foot-legal">
            <span>{t(lang, 'foot.conf')}</span>
            <span className="clmp-foot-link-coming">{t(lang, 'foot.privacy')}</span>
            <span className="clmp-foot-link-coming">{t(lang, 'foot.terms')}</span>
            <span className="clmp-foot-link-coming">{t(lang, 'foot.security')}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export * from './constants';
export * from './useLoginState';
export { LoginFormPanel } from './LoginFormPanel';

