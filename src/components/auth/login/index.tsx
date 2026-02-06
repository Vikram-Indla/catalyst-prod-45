/**
 * Catalyst Enterprise Login Page V10
 * Pixel-perfect, enterprise-grade login with split-screen layout
 * Blue hero with Islamic geometric pattern | Light form panel
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { getLastRoute, clearLastRoute } from '@/hooks/useSessionPersistence';
import { LoginHeroPanel } from './LoginHeroPanel';
import { LoginFormPanel } from './LoginFormPanel';
import { useLoginState } from './useLoginState';
import { ForcePasswordReset } from '@/components/auth/ForcePasswordReset';
import { FileText } from 'lucide-react';
import './login-styles.css';

const REMEMBERED_EMAIL_KEY = 'catalyst_remembered_email';

export function CatalystLoginPage() {
  const navigate = useNavigate();
  const { signIn, signUp, user, loading } = useAuth();
  const {
    userType,
    authType,
    handleUserTypeChange,
    handleAuthTypeChange,
  } = useLoginState();

  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showPendingMessage, setShowPendingMessage] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const checkedUserRef = useRef<string | null>(null);

  const checkMustChangePassword = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('must_change_password, approval_status')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error checking profile:', error);
        return false;
      }

      if (!profile || profile.approval_status !== 'APPROVED') {
        return false;
      }

      return profile.must_change_password === true;
    } catch (err) {
      console.error('Error in checkMustChangePassword:', err);
      return false;
    }
  }, []);

  useEffect(() => {
    if (loading || !user) {
      checkedUserRef.current = null;
      setIsTransitioning(false);
      return;
    }
    
    if (checkedUserRef.current === user.id) {
      return;
    }
    
    if (mustChangePassword) {
      return;
    }

    const handleAuthRedirect = async () => {
      checkedUserRef.current = user.id;
      setIsTransitioning(true);
      
      const needsPasswordChange = await checkMustChangePassword(user.id);
      
      if (needsPasswordChange) {
        setIsTransitioning(false);
        setMustChangePassword(true);
        setCurrentUserId(user.id);
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('approval_status')
          .eq('id', user.id)
          .maybeSingle();
        
        if (profile?.approval_status === 'APPROVED') {
          const lastRoute = getLastRoute();
          navigate(lastRoute, { replace: true });
        } else {
          setIsTransitioning(false);
        }
      }
    };

    handleAuthRedirect();
  }, [user, loading, mustChangePassword, navigate, checkMustChangePassword]);

  const handleSignIn = async (email: string, password: string, _rememberMe: boolean): Promise<{ error?: Error | null }> => {
    setIsLoading(true);
    setLoginError(null);
    
    const result = await signIn(email, password);
    
    if (result.error) {
      if ((result as any).isPending) {
        setLoginError("Your account is pending approval.");
      } else if ((result as any).isBlocked) {
        setLoginError("Unable to sign in.");
      } else {
        setLoginError("The email or password you entered is incorrect.");
      }
      setIsLoading(false);
      return { error: result.error };
    }
    
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (currentUser) {
      const needsPasswordChange = await checkMustChangePassword(currentUser.id);
      
      if (needsPasswordChange) {
        setMustChangePassword(true);
        setCurrentUserId(currentUser.id);
        setIsLoading(false);
        return {};
      }
    }
    
    const lastRoute = getLastRoute();
    clearLastRoute();
    navigate(lastRoute);
    
    setIsLoading(false);
    return {};
  };

  const handleSignUp = async (email: string, password: string, fullName: string): Promise<{ error?: Error | null }> => {
    setIsLoading(true);
    setLoginError(null);

    const result = await signUp(email, password, fullName);

    if (result.error) {
      const code = (result as any).code || result.error.code;
      let userMessage: string;
      
      switch (code) {
        case "EMAIL_EXISTS_APPROVED":
          userMessage = "This email is already registered. Please sign in.";
          break;
        case "EMAIL_EXISTS_PENDING":
          userMessage = "Your registration is pending approval.";
          break;
        case "EMAIL_EXISTS_REJECTED_COOLDOWN":
          userMessage = result.error.message || "Your request was rejected. Please try again later.";
          break;
        case "ACCOUNT_DISABLED":
          userMessage = "This account has been disabled. Please contact support.";
          break;
        case "RATE_LIMITED":
          userMessage = "Too many attempts. Please try again later.";
          break;
        default:
          userMessage = result.error.message || "Something went wrong. Please try again.";
      }
      
      setLoginError(userMessage);
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

  const handleExternalSubmit = () => {
    navigate('/submit-request');
  };

  // Loading state
  if (isTransitioning || (user && loading)) {
    return (
      <div className="login-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div className="spinner-v10" style={{ width: '40px', height: '40px', borderWidth: '3px' }} />
          <span style={{ color: 'var(--login-primary)', fontSize: '0.875rem', fontWeight: 500 }}>Signing you in...</span>
        </div>
      </div>
    );
  }

  // Pending message
  if (showPendingMessage) {
    return (
      <div className="login-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '2rem' }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            margin: '0 auto 1.5rem', 
            borderRadius: '50%', 
            background: 'rgba(37, 99, 235, 0.1)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <FileText style={{ width: '32px', height: '32px', color: 'var(--login-primary)' }} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--login-text-dark)', marginBottom: '0.75rem' }}>
            Registration Submitted
          </h2>
          <p style={{ color: 'var(--login-text-secondary)', marginBottom: '1.5rem' }}>
            Thanks for registering. Your account is pending approval.
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--login-text-muted)', marginBottom: '2rem' }}>
            You can sign in once an administrator approves your request.
          </p>
          <button
            type="button"
            onClick={() => {
              setShowPendingMessage(false);
              handleAuthTypeChange('signin');
            }}
            className="submit-btn-v10"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  // Force password reset
  if (mustChangePassword && currentUserId) {
    return (
      <div className="login-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '400px', width: '100%', padding: '2rem' }}>
          <ForcePasswordReset 
            userId={currentUserId} 
            onSuccess={handlePasswordResetSuccess} 
          />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Skip Link for Accessibility */}
      <a href="#main-form" className="login-skip-link">Skip to login form</a>

      <div className="login-container">
        {/* Left Panel - Hero */}
        <LoginHeroPanel />

        {/* Right Panel - Form */}
        <LoginFormPanel
          userType={userType}
          authType={authType}
          onUserTypeChange={handleUserTypeChange}
          onAuthTypeChange={handleAuthTypeChange}
          onSignIn={handleSignIn}
          onSignUp={handleSignUp}
          onExternalSubmit={handleExternalSubmit}
          loading={isLoading}
          error={loginError}
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
