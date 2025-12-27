import { motion, AnimatePresence } from 'framer-motion';
import { LoginLogo } from './LoginLogo';
import { UserTypeToggle } from './UserTypeToggle';
import { AuthToggle } from './AuthToggle';
import { WelcomeSection } from './WelcomeSection';
import { LoginSignInForm } from './LoginSignInForm';
import { LoginSignUpForm } from './LoginSignUpForm';
import { LoginExternalForm } from './LoginExternalForm';
import { JiraBadge } from './JiraBadge';
import { SecurityBadge } from './SecurityBadge';
import { loginColors, UserType, AuthType } from './constants';

interface LoginFormPanelProps {
  userType: UserType;
  authType: AuthType;
  onUserTypeChange: (type: UserType) => void;
  onAuthTypeChange: (type: AuthType) => void;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string, fullName: string) => Promise<void>;
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
  const showAuthToggle = userType === 'existing';
  const showJiraSection = userType === 'existing';

  return (
    <div 
      className="relative flex items-center justify-center min-h-screen"
      style={{
        backgroundColor: loginColors.surfaceDark,
        padding: '2rem 3rem',
      }}
    >
      {/* Ambient Light Effects */}
      <div 
        className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(198, 156, 109, 0.05) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
        aria-hidden="true"
      />
      <div 
        className="absolute bottom-0 left-0 w-72 h-72 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.04) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
        aria-hidden="true"
      />

      {/* Form Container */}
      <main className="relative z-10 w-full max-w-md">
        <LoginLogo />
        
        <UserTypeToggle 
          userType={userType} 
          onChange={onUserTypeChange} 
        />

        <AnimatePresence mode="wait">
          {showAuthToggle && (
            <AuthToggle 
              key="auth-toggle"
              authType={authType} 
              onChange={onAuthTypeChange} 
            />
          )}
        </AnimatePresence>

        <WelcomeSection 
          userType={userType} 
          authType={authType} 
        />

        <AnimatePresence mode="wait">
          {userType === 'existing' && authType === 'signin' && (
            <LoginSignInForm 
              key="signin"
              onSubmit={onSignIn}
              loading={loading}
              error={error}
            />
          )}
          {userType === 'existing' && authType === 'signup' && (
            <LoginSignUpForm 
              key="signup"
              onSubmit={onSignUp}
              loading={loading}
              error={error}
            />
          )}
          {userType === 'external' && (
            <LoginExternalForm 
              key="external"
              onSubmit={onExternalSubmit}
            />
          )}
        </AnimatePresence>

        {showJiraSection && <JiraBadge />}
        
        <SecurityBadge />
      </main>
    </div>
  );
}
