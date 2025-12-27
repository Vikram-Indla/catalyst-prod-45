import { useState, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { LoginInput } from './LoginInput';
import { LoginButton } from './LoginButton';

interface LoginSignUpFormProps {
  onSubmit: (email: string, password: string, fullName: string) => Promise<void>;
  loading: boolean;
  error?: string | null;
  delay?: number;
}

export function LoginSignUpForm({ onSubmit, loading, error, delay = 0.6 }: LoginSignUpFormProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setValidationError('Password must be at least 8 characters');
      return;
    }

    await onSubmit(email, password, fullName);
  };

  const displayError = validationError || error;

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: prefersReducedMotion ? 0.01 : 0.5, 
        delay: prefersReducedMotion ? 0 : delay 
      }}
      onSubmit={handleSubmit}
      aria-labelledby="signup-heading"
    >
      <h2 id="signup-heading" className="sr-only">Sign up form</h2>
      
      {displayError && (
        <div 
          className="mb-4 p-3 rounded-lg text-sm"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#f87171',
          }}
          role="alert"
        >
          {displayError}
        </div>
      )}

      <LoginInput
        label="Full Name"
        type="text"
        placeholder="John Doe"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        required
        autoComplete="name"
      />

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
        placeholder="Create a password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="new-password"
      />

      <LoginInput
        label="Confirm Password"
        isPassword
        placeholder="Confirm your password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
        autoComplete="new-password"
      />

      <LoginButton type="submit" loading={loading}>
        Create Account
      </LoginButton>
    </motion.form>
  );
}
