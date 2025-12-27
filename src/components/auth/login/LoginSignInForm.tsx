import { useState, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { LoginInput } from './LoginInput';
import { LoginCheckbox } from './LoginCheckbox';
import { LoginButton } from './LoginButton';
import { loginColors } from './constants';

interface LoginSignInFormProps {
  onSubmit: (email: string, password: string) => Promise<{ error?: Error | null }>;
  loading: boolean;
  error?: string | null;
  delay?: number;
}

export function LoginSignInForm({ onSubmit, loading, error, delay = 0.6 }: LoginSignInFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onSubmit(email, password);
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: prefersReducedMotion ? 0.01 : 0.5, 
        delay: prefersReducedMotion ? 0 : delay 
      }}
      onSubmit={handleSubmit}
      aria-labelledby="signin-heading"
    >
      <h2 id="signin-heading" className="sr-only">Sign in form</h2>
      
      {error && (
        <div 
          className="mb-4 p-3 rounded-lg text-sm"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#f87171',
          }}
          role="alert"
        >
          {error}
        </div>
      )}

      <LoginInput
        label="Email Address"
        type="email"
        placeholder="name@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
      />

      <LoginInput
        label="Password"
        isPassword
        placeholder="Enter your password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="current-password"
      />

      <div className="flex items-center justify-between mb-5">
        <LoginCheckbox
          label="Remember me"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
        />
        <button
          type="button"
          className="transition-colors hover:underline underline-offset-2"
          style={{
            fontSize: '0.8125rem',
            fontWeight: 500,
            color: loginColors.primaryLighter,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          Forgot password?
        </button>
      </div>

      <LoginButton type="submit" loading={loading}>
        Sign In
      </LoginButton>
    </motion.form>
  );
}
