import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import { LoginButton } from './LoginButton';
import { loginColors } from './constants';

interface LoginExternalFormProps {
  onSubmit: () => void;
  delay?: number;
}

export function LoginExternalForm({ onSubmit, delay = 0.6 }: LoginExternalFormProps) {
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
      className="text-center"
    >
      {/* Icon */}
      <div 
        className="w-16 h-16 mx-auto mb-6 rounded-xl flex items-center justify-center"
        style={{
          backgroundColor: loginColors.surfaceCard,
          border: `1px solid ${loginColors.borderSubtle}`,
        }}
      >
        <FileText size={28} style={{ color: loginColors.primaryLighter }} />
      </div>

      {/* Description */}
      <p
        className="mb-6 mx-auto"
        style={{
          maxWidth: 280,
          fontSize: '0.9375rem',
          lineHeight: 1.6,
          color: loginColors.textSecondary,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        No account needed. Submit your business demand request and our team will review it promptly.
      </p>

      {/* Button */}
      <LoginButton variant="outline" onClick={onSubmit}>
        Log Demand Request
      </LoginButton>

      {/* Helper text */}
      <p
        className="mt-4"
        style={{
          fontSize: '0.8125rem',
          color: loginColors.textMuted,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        Ticket ID will be generated upon submission
      </p>
    </motion.div>
  );
}
