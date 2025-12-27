import { motion } from 'framer-motion';
import { AuthType, loginColors } from './constants';

interface AuthToggleProps {
  authType: AuthType;
  onChange: (type: AuthType) => void;
  delay?: number;
}

export function AuthToggle({ authType, onChange, delay = 0.5 }: AuthToggleProps) {
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: prefersReducedMotion ? 0.01 : 0.5, 
        delay: prefersReducedMotion ? 0 : delay 
      }}
      className="flex justify-center gap-1 mb-6"
    >
      <button
        type="button"
        onClick={() => onChange('signin')}
        className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
        style={{
          backgroundColor: authType === 'signin' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
          color: authType === 'signin' ? loginColors.textPrimary : loginColors.textMuted,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        Sign In
      </button>
      <button
        type="button"
        onClick={() => onChange('signup')}
        className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
        style={{
          backgroundColor: authType === 'signup' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
          color: authType === 'signup' ? loginColors.textPrimary : loginColors.textMuted,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        Sign Up
      </button>
    </motion.div>
  );
}
